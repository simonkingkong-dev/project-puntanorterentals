import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { sendConfirmationEmail } from '@/lib/mail';
import { Reservation } from '@/lib/types';
import { updatePropertyAvailabilityAdmin } from '@/lib/firebase-admin-queries';
import { generateDateRange } from '@/lib/utils/date';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    if (process.env.NODE_ENV === 'development') {
      console.error('[Stripe Webhook]', err);
    }
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  // Manejar el evento
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const reservationId = paymentIntent.metadata.reservationId;

    if (reservationId) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Webhook] Procesando reserva: ${reservationId}`);
        }

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
          const data = reservationSnap.data()!;
          const checkIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
          const checkOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
          const propertyId = data.propertyId as string;

          const reservationData = {
             id: reservationSnap.id,
             ...data,
             checkIn,
             checkOut,
             createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
          } as Reservation;

          // 3. Bloquear fechas en la propiedad
          if (propertyId) {
            const dateStrings = generateDateRange(checkIn, checkOut);
            await updatePropertyAvailabilityAdmin(propertyId, dateStrings, false);
          }

          // 4. Enviar correo
          await sendConfirmationEmail(reservationData);
        }

        if (process.env.NODE_ENV === 'development') {
          console.log(`[Webhook] Reserva ${reservationId} confirmada.`);
        }
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