import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { sendConfirmationEmail } from '@/lib/mail';
import { Reservation } from '@/lib/types';
import { updatePropertyAvailabilityAdmin } from '@/lib/firebase-admin-queries';
import { generateDateRange } from '@/lib/utils/date';
import { trySyncBookingToHostfully } from '@/lib/hostfully/sync-booking-lead';
import { registerHostfullyLeadPayment } from '@/lib/hostfully/client';
import { checkPropertyAvailability } from '@/app/(public)/properties/actions';
import { paymentDisplayFromIntent } from '@/lib/stripe-payment-display';

function toDateSafe(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in v) {
    const t = v as { toDate: () => Date };
    if (typeof t.toDate === 'function') return t.toDate();
  }
  return new Date(v as string | number);
}

function parseReservationDate(v: unknown): Date | null {
  if (v == null) return null;
  const d = toDateSafe(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * POST /api/reservations/confirm-by-payment-intent
 * Verifica con Stripe que el pago fue exitoso y confirma la reserva al instante
 * (no depende del webhook para que el usuario vea la confirmación).
 * Si metadata.modification === '1', aplica pendingModification a la reserva confirmada.
 */
export async function POST(request: NextRequest) {
  try {
    const { payment_intent_id } = await request.json();
    if (!payment_intent_id || typeof payment_intent_id !== 'string') {
      return NextResponse.json({ error: 'payment_intent_id requerido' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'El pago aún no ha sido confirmado' }, { status: 400 });
    }

    const reservationId = paymentIntent.metadata?.reservationId;
    if (!reservationId) {
      return NextResponse.json({ error: 'Reserva no asociada al pago' }, { status: 400 });
    }

    const isModification = paymentIntent.metadata?.modification === '1';

    const reservationRef = adminDb.collection('reservations').doc(reservationId);
    const reservationSnap = await reservationRef.get();
    if (!reservationSnap.exists) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const data = reservationSnap.data()!;

    if (isModification && data.status === 'confirmed') {
      const pending = data.pendingModification as {
        newCheckIn: { toDate?: () => Date } | Date;
        newCheckOut: { toDate?: () => Date } | Date;
        newGuests?: number;
        newTotal?: number;
      } | undefined;
      if (!pending?.newCheckIn || !pending?.newCheckOut) {
        return NextResponse.json({ error: 'Modificación pendiente no encontrada' }, { status: 400 });
      }
      const oldCheckIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
      const oldCheckOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
      const newCheckIn = toDateSafe(pending.newCheckIn);
      const newCheckOut = toDateSafe(pending.newCheckOut);
      const newGuests = pending.newGuests ?? data.guests ?? 1;
      const newTotal = Number(pending.newTotal) ?? data.totalAmount;
      const propertyId = data.propertyId as string;

      const oldDateStrings = generateDateRange(oldCheckIn, oldCheckOut);
      const newDateStrings = generateDateRange(newCheckIn, newCheckOut);
      await updatePropertyAvailabilityAdmin(propertyId, oldDateStrings, true);
      await updatePropertyAvailabilityAdmin(propertyId, newDateStrings, false);

      await reservationRef.update({
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        guests: newGuests,
        totalAmount: newTotal,
        pendingModification: null,
        updatedAt: new Date(),
      });

      const updatedSnap = await reservationRef.get();
      const updated = updatedSnap.data()!;
      const checkIn = updated.checkIn?.toDate?.() ?? new Date(updated.checkIn);
      const checkOut = updated.checkOut?.toDate?.() ?? new Date(updated.checkOut);
      let propertyTitle: string | undefined;
      if (propertyId) {
        const propSnap = await adminDb.collection('properties').doc(propertyId).get();
        propertyTitle = propSnap.exists ? (propSnap.data()?.title as string) : undefined;
      }
      return NextResponse.json({
        id: reservationSnap.id,
        ...updated,
        checkIn,
        checkOut,
        createdAt: updated.createdAt?.toDate?.() ?? new Date(updated.createdAt),
        propertyTitle,
        ...paymentDisplayFromIntent(paymentIntent),
      });
    }

    if (data.status === 'confirmed') {
      const checkIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
      const checkOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
      let propertyTitle: string | undefined;
      if (data.propertyId) {
        const propSnap = await adminDb.collection('properties').doc(data.propertyId as string).get();
        propertyTitle = propSnap.exists ? (propSnap.data()?.title as string) : undefined;
      }
      return NextResponse.json({
        id: reservationSnap.id,
        ...data,
        checkIn,
        checkOut,
        createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
        propertyTitle,
        ...paymentDisplayFromIntent(paymentIntent),
      });
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

    const updatedSnap = await reservationRef.get();
    const updated = updatedSnap.data()!;
    const checkIn = parseReservationDate(updated.checkIn?.toDate?.() ?? updated.checkIn);
    const checkOut = parseReservationDate(updated.checkOut?.toDate?.() ?? updated.checkOut);
    if (checkIn == null || checkOut == null || checkIn >= checkOut) {
      return NextResponse.json(
        { error: 'Datos de reserva inválidos: fechas faltantes o inválidas' },
        { status: 400 }
      );
    }
    const propertyId = updated.propertyId as string;

    const reservationData = {
      id: reservationSnap.id,
      ...updated,
      checkIn,
      checkOut,
      createdAt: updated.createdAt?.toDate?.() ?? new Date(updated.createdAt),
    } as Reservation;

    const availability = await checkPropertyAvailability(propertyId, checkIn, checkOut);
    if (!availability.available) {
      return NextResponse.json(
        { error: availability.error || 'Las fechas ya no están disponibles' },
        { status: 409 }
      );
    }

    const propSnap = propertyId
      ? await adminDb.collection('properties').doc(propertyId).get()
      : null;
    const isHostfullyProperty = Boolean(propSnap?.exists && propSnap.data()?.hostfullyPropertyId);

    const dateStrings = generateDateRange(checkIn, checkOut);
    if (!isHostfullyProperty) {
      await updatePropertyAvailabilityAdmin(propertyId, dateStrings, false);
    }
    const syncResult = await trySyncBookingToHostfully(propertyId, {
      reservationId: reservationSnap.id,
      checkIn,
      checkOut,
      guestName: updated.guestName,
      guestFirstName: updated.guestFirstName,
      guestLastName: updated.guestLastName,
      guestEmail: updated.guestEmail,
    });
    if (!syncResult.synced) {
      console.error('[Hostfully] Sync falló tras confirmar reserva:', syncResult.error);
    } else if (syncResult.leadUid) {
      await reservationRef.update({
        hostfullyLeadUid: syncResult.leadUid,
        hostfullySyncedAt: new Date(),
      });
    }
    const leadUidForPayment =
      syncResult.synced && syncResult.leadUid
        ? syncResult.leadUid
        : ((updated.hostfullyLeadUid as string | undefined) ?? '').trim() || undefined;
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
        console.error('[Hostfully] No se pudo registrar pago del lead:', paymentSync.error);
      }
    }
    await sendConfirmationEmail(reservationData);

    let propertyTitle: string | undefined;
    propertyTitle = propSnap?.exists ? (propSnap.data()?.title as string) : undefined;

    return NextResponse.json({
      id: reservationSnap.id,
      ...updated,
      checkIn,
      checkOut,
      createdAt: updated.createdAt?.toDate?.() ?? new Date(updated.createdAt),
      propertyTitle,
      ...paymentDisplayFromIntent(paymentIntent),
    });
  } catch (error) {
    console.error('Error confirmando reserva por payment intent:', error);
    return NextResponse.json({ error: 'Error al confirmar la reserva' }, { status: 500 });
  }
}
