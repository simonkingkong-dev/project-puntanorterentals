import { NextRequest, NextResponse } from 'next/server';
import { getReservationByIdForConfirmationAdmin } from '@/lib/firebase-admin-queries';

/**
 * GET /api/reservations/[id]/confirmation
 * Devuelve una reserva por ID para la página de éxito (pending o confirmed).
 * Usado cuando el polling por payment_intent falla pero tenemos reservationId en la URL.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });
  }

  try {
    const reservation = await getReservationByIdForConfirmationAdmin(id);

    if (!reservation) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Error fetching reservation for confirmation:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
