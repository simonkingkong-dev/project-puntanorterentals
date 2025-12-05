import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { sendConfirmationEmail } from '@/lib/mail';
import { Reservation } from '@/lib/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // CORREGIDO: Actualizamos la versión a la que exige tu librería instalada
  apiVersion: '2025-08-27.basil' as any, 
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Manejar el evento
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const reservationId = paymentIntent.metadata.reservationId;

    if (reservationId) {
      try {
        console.log(`Procesando reserva: ${reservationId}`);

        // 1. Actualizar estado a 'confirmed' usando Admin SDK
        const reservationRef = adminDb.collection('reservations').doc(reservationId);
        
        await reservationRef.update({
          status: 'confirmed',
          stripePaymentId: paymentIntent.id,
          updatedAt: new Date(),
        });

        // 2. Obtener datos para el email
        const reservationSnap = await reservationRef.get();
        
        if (reservationSnap.exists) {
          const reservationData = {
             id: reservationSnap.id,
             ...reservationSnap.data(),
             checkIn: reservationSnap.data()?.checkIn.toDate(),
             checkOut: reservationSnap.data()?.checkOut.toDate(),
             createdAt: reservationSnap.data()?.createdAt.toDate(),
          } as Reservation;

          // 3. Enviar correo
          await sendConfirmationEmail(reservationData);
        }

        console.log(`Reserva ${reservationId} confirmada y correo enviado.`);
      } catch (error) {
        console.error('Error actualizando reserva:', error);
        return NextResponse.json({ error: 'Error updating reservation' }, { status: 500 });
      }
    }
  } else if (event.type === 'payment_intent.payment_failed') {
     const paymentIntent = event.data.object as Stripe.PaymentIntent;
     const reservationId = paymentIntent.metadata.reservationId;
     if (reservationId) {
        await adminDb.collection('reservations').doc(reservationId).update({
            status: 'cancelled',
            updatedAt: new Date(),
        });
     }
  }

  return NextResponse.json({ received: true });
}