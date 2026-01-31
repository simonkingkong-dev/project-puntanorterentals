import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * POST /api/reservations/[id]/request-modification
 * Body: { token: string, newCheckIn?: string, newCheckOut?: string, newGuests?: number, reason?: string }
 * Crea una solicitud de modificación para revisión del personal (después de 2h).
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
      return NextResponse.json({ error: 'Solo se puede solicitar modificación de una reserva confirmada' }, { status: 400 });
    }
    if ((data.modifyToken as string) !== token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
    }

    await adminDb.collection('modificationRequests').add({
      reservationId: id,
      type: 'modification',
      requestedBy: data.guestEmail,
      requestedAt: new Date(),
      status: 'pending',
      newCheckIn: body.newCheckIn ?? null,
      newCheckOut: body.newCheckOut ?? null,
      newGuests: body.newGuests ?? null,
      reason: body.reason ?? '',
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creando solicitud de modificación:', error);
    return NextResponse.json({ error: 'Error al enviar la solicitud' }, { status: 500 });
  }
}
