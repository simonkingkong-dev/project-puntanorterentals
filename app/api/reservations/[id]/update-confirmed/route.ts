import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { updatePropertyAvailabilityAdmin } from '@/lib/firebase-admin-queries';
import { generateDateRange, getNightsBetween, getFirstBlockedNight } from '@/lib/utils/date';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * POST /api/reservations/[id]/update-confirmed
 * Body: { token, newCheckIn, newCheckOut, newGuests, newTotal }
 * Actualiza una reserva confirmada (fechas/huéspedes/total) sin pago ni reembolso.
 * Dentro de 2h: cualquier cambio permitido.
 * Después de 2h: solo cambios aditivos (mismo o mayor check-in, check-out, huéspedes) y noches extra contiguas disponibles.
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

    const oldCheckIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
    const oldCheckOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
    const oldGuests = Number(data.guests) ?? 1;
    const propertyId = data.propertyId as string;

    const newCheckIn = body.newCheckIn ? new Date(body.newCheckIn) : oldCheckIn;
    const newCheckOut = body.newCheckOut ? new Date(body.newCheckOut) : oldCheckOut;
    const newGuests = body.newGuests ?? data.guests ?? 1;
    const newTotal = Number(body.newTotal) ?? data.totalAmount;

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
      if (Number(newGuests) < oldGuests) {
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

    const oldDateStrings = generateDateRange(oldCheckIn, oldCheckOut);
    const newDateStrings = generateDateRange(newCheckIn, newCheckOut);

    await updatePropertyAvailabilityAdmin(propertyId, oldDateStrings, true);
    await updatePropertyAvailabilityAdmin(propertyId, newDateStrings, false);

    await ref.update({
      checkIn: newCheckIn,
      checkOut: newCheckOut,
      guests: newGuests,
      totalAmount: newTotal,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error actualizando reserva confirmada:', error);
    return NextResponse.json({ error: 'Error al actualizar la reserva' }, { status: 500 });
  }
}
