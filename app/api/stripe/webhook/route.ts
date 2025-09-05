import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateReservationStatus } from '@/lib/firebase/reservations';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const reservationId = paymentIntent.metadata.reservationId;

      if (reservationId) {
        try {
          await updateReservationStatus(
            reservationId,
            'confirmed',
            paymentIntent.id
          );
          console.log(`Reservation ${reservationId} confirmed with payment ${paymentIntent.id}`);
        } catch (error) {
          console.error('Error updating reservation status:', error);
        }
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      const failedReservationId = failedPayment.metadata.reservationId;

      if (failedReservationId) {
        try {
          await updateReservationStatus(failedReservationId, 'cancelled');
          console.log(`Reservation ${failedReservationId} cancelled due to payment failure`);
        } catch (error) {
          console.error('Error updating reservation status:', error);
        }
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}