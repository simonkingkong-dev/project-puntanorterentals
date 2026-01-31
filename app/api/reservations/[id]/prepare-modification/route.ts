import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getNightsBetween, getFirstBlockedNight } from '@/lib/utils/date';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * POST /api/reservations/[id]/prepare-modification
 * Body: { token, newCheckIn, newCheckOut, newGuests, newTotal }
 * Guarda la modificación pendiente en la reserva para aplicarla tras el pago de la diferencia.
 * Después de 2h: solo permite cambios aditivos y noches extra contiguas disponibles.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const token = body?.token?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const ref = adminDb.collection('reservations').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const data = snap.data()!;
    if (data.status !== 'confirmed') {
      return NextResponse.json({ error: 'Solo se puede modificar una reserva confirmada' }, { status: 400 });
    }
    if ((data.modifyToken as string) !== token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
    }

    const newCheckIn = body.newCheckIn ? new Date(body.newCheckIn) : null;
    const newCheckOut = body.newCheckOut ? new Date(body.newCheckOut) : null;
    const newGuests = body.newGuests ?? null;
    const newTotal = Number(body.newTotal);
    if (!newCheckIn || !newCheckOut || newTotal <= 0) {
      return NextResponse.json({ error: 'Datos de modificación incompletos' }, { status: 400 });
    }

    const oldCheckIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
    const oldCheckOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
    const oldGuests = Number(data.guests) ?? 1;
    const propertyId = data.propertyId as string;
    const confirmedAt = data.confirmedAt?.toDate?.() ?? new Date(data.confirmedAt);
    const isWithinTwoHours = Date.now() - confirmedAt.getTime() <= TWO_HOURS_MS;

    if (!isWithinTwoHours) {
      if (newCheckIn.getTime() < oldCheckIn.getTime()) {
        return NextResponse.json(
          { error: 'Después de 2 horas no se puede adelantar el check-in. Solicita una modificación.' },
          { status: 400 }
        );
      }
      if (newCheckOut.getTime() < oldCheckOut.getTime()) {
        return NextResponse.json(
          { error: 'Después de 2 horas no se puede acortar la estancia. Solicita una modificación.' },
          { status: 400 }
        );
      }
      if (Number(newGuests ?? oldGuests) < oldGuests) {
        return NextResponse.json(
          { error: 'Después de 2 horas no se puede reducir el número de huéspedes. Solicita una modificación.' },
          { status: 400 }
        );
      }
      if (newCheckOut.getTime() > oldCheckOut.getTime()) {
        const extraNights = getNightsBetween(oldCheckOut, newCheckOut);
        const propSnap = await adminDb.collection('properties').doc(propertyId).get();
        const availability = (propSnap.exists ? (propSnap.data()?.availability as Record<string, boolean>) : {}) ?? {};
        const firstBlocked = getFirstBlockedNight(extraNights, availability);
        if (firstBlocked) {
          return NextResponse.json(
            { error: `La noche del ${firstBlocked} no está disponible. Solo se pueden añadir noches contiguas.` },
            { status: 400 }
          );
        }
      }
    }

    await ref.update({
      pendingModification: {
        newCheckIn,
        newCheckOut,
        newGuests: newGuests ?? data.guests ?? 1,
        newTotal,
      },
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error preparando modificación:', error);
    return NextResponse.json({ error: 'Error al preparar la modificación' }, { status: 500 });
  }
}
