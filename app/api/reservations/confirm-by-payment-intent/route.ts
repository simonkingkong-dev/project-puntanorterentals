import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { sendConfirmationEmail } from '@/lib/mail';
import { Reservation } from '@/lib/types';
import { updatePropertyAvailabilityAdmin } from '@/lib/firebase-admin-queries';
import { generateDateRange } from '@/lib/utils/date';
import { trySyncBookingToHostfully } from '@/lib/hostfully/sync-booking-lead';

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

    const dateStrings = generateDateRange(checkIn, checkOut);
    await updatePropertyAvailabilityAdmin(propertyId, dateStrings, false);
    await trySyncBookingToHostfully(propertyId, {
      checkIn,
      checkOut,
      guestName: updated.guestName,
      guestEmail: updated.guestEmail,
    });
    await sendConfirmationEmail(reservationData);

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
    });
  } catch (error) {
    console.error('Error confirmando reserva por payment intent:', error);
    return NextResponse.json({ error: 'Error al confirmar la reserva' }, { status: 500 });
  }
}
