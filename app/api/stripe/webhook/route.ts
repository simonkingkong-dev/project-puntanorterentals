import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { sendConfirmationEmail } from '@/lib/mail';
import { Reservation } from '@/lib/types';
import { updatePropertyAvailabilityAdmin } from '@/lib/firebase-admin-queries';
import { generateDateRange } from '@/lib/utils/date';
import { trySyncBookingToHostfully } from '@/lib/hostfully/sync-booking-lead';
import { registerHostfullyLeadPayment } from '@/lib/hostfully/client';
import { checkPropertyAvailability } from '@/app/(public)/properties/actions';

export async function POST(request: Request) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

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
        const reservationRef = adminDb.collection('reservations').doc(reservationId);
        const reservationSnap = await reservationRef.get();
        if (!reservationSnap.exists) return NextResponse.json({ received: true });

        const data = reservationSnap.data()!;
        if (data.status === 'confirmed') {
          return NextResponse.json({ received: true });
        }

        const confirmedAt = new Date();
        const modifyToken = crypto.randomUUID();
        await reservationRef.update({
          status: 'confirmed',
          stripePaymentId: paymentIntent.id,
          confirmedAt,
          modifyToken,
          updatedAt: new Date(),
        });

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

        if (propertyId) {
          const availability = await checkPropertyAvailability(propertyId, checkIn, checkOut);
          if (!availability.available) {
            await reservationRef.update({
              status: 'cancelled',
              updatedAt: new Date(),
            });
            return NextResponse.json({ received: true });
          }

          const propSnap = await adminDb.collection('properties').doc(propertyId).get();
          const isHostfullyProperty = Boolean(
            propSnap.exists && propSnap.data()?.hostfullyPropertyId
          );
          const dateStrings = generateDateRange(checkIn, checkOut);
          if (!isHostfullyProperty) {
            await updatePropertyAvailabilityAdmin(propertyId, dateStrings, false);
          }
          const syncResult = await trySyncBookingToHostfully(propertyId, {
            reservationId,
            checkIn,
            checkOut,
            guestName: data.guestName,
            guestFirstName: data.guestFirstName,
            guestLastName: data.guestLastName,
            guestEmail: data.guestEmail,
          });
          if (!syncResult.synced) {
            console.error('[Hostfully] Sync falló en webhook:', syncResult.error);
          } else if (syncResult.leadUid) {
            await reservationRef.update({
              hostfullyLeadUid: syncResult.leadUid,
              hostfullySyncedAt: new Date(),
            });
          }
          const leadUidForPayment =
            syncResult.synced && syncResult.leadUid
              ? syncResult.leadUid
              : ((data.hostfullyLeadUid as string | undefined) ?? '').trim() || undefined;
          if (leadUidForPayment) {
            const paymentSync = await registerHostfullyLeadPayment({
              leadUid: leadUidForPayment,
              amount: (paymentIntent.amount_received ?? paymentIntent.amount ?? 0) / 100,
              currency: paymentIntent.currency?.toUpperCase() || 'USD',
              paidAt: paymentIntent.created ? new Date(paymentIntent.created * 1000) : new Date(),
              externalPaymentId: paymentIntent.id,
              note: `Pago Stripe ${paymentIntent.id}`,
            });
            if (!paymentSync.synced) {
              console.error('[Hostfully] No se pudo registrar pago del lead (webhook):', paymentSync.error);
            }
          }
        }

        await sendConfirmationEmail(reservationData);
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