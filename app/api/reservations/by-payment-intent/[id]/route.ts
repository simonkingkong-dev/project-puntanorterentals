import { NextRequest, NextResponse } from 'next/server';
import { getReservationByPaymentIntentIdAdmin } from '@/lib/firebase-admin-queries';
import { stripe } from '@/lib/stripe';
import { paymentDisplayFromIntent } from '@/lib/stripe-payment-display';

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

    try {
      const pi = await stripe.paymentIntents.retrieve(id);
      return NextResponse.json({ ...reservation, ...paymentDisplayFromIntent(pi) });
    } catch {
      return NextResponse.json(reservation);
    }
    
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}