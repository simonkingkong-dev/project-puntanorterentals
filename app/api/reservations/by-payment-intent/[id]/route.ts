import { NextRequest, NextResponse } from 'next/server';
import { getReservationByPaymentIntentIdAdmin } from '@/lib/firebase-admin-queries';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'Payment Intent ID es requerido' }, { status: 400 });
  }

  try {
    const reservation = await getReservationByPaymentIntentIdAdmin(id);

    if (!reservation) {
      return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 });
    }

    // Devolvemos la reservación completa
    return NextResponse.json(reservation);
    
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}