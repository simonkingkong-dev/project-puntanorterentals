import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { updatePropertyAvailabilityAdmin } from '@/lib/firebase-admin-queries';
import { generateDateRange } from '@/lib/utils/date';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * POST /api/reservations/[id]/refund-difference
 * Body: { token, newCheckIn, newCheckOut, newGuests, newTotal }
 * Aplica modificación con reducción de precio: reembolso parcial en Stripe, actualiza reserva y disponibilidad.
 * Solo si confirmedAt fue hace menos de 2 horas.
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
      return NextResponse.json({ error: 'Solo se puede modificar una reserva confirmada' }, { status: 400 });
    }
    if ((data.modifyToken as string) !== token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
    }

    const confirmedAt = data.confirmedAt?.toDate?.() ?? new Date(data.confirmedAt);
    if (Date.now() - confirmedAt.getTime() > TWO_HOURS_MS) {
      return NextResponse.json(
        { error: 'El reembolso por diferencia solo aplica dentro de las 2 horas posteriores a la confirmación' },
        { status: 400 }
      );
    }

    const previousTotal = Number(data.totalAmount) ?? 0;
    const newTotal = Number(body.newTotal) ?? 0;
    if (newTotal >= previousTotal) {
      return NextResponse.json({ error: 'El nuevo total debe ser menor para reembolso' }, { status: 400 });
    }

    const refundAmountCents = Math.round((previousTotal - newTotal) * 100);
    if (refundAmountCents < 50) {
      return NextResponse.json({ error: 'La diferencia a reembolsar debe ser al menos $0.50' }, { status: 400 });
    }

    const stripePaymentId = data.stripePaymentId as string | undefined;
    let refundId: string | undefined;
    let refundStatus = 'skipped';

    if (stripePaymentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentId);
        const chargeId = paymentIntent.latest_charge;
        const chargeIdStr = typeof chargeId === 'string' ? chargeId : chargeId?.id;
        if (chargeIdStr) {
          const refund = await stripe.refunds.create({
            charge: chargeIdStr,
            amount: refundAmountCents,
            reason: 'requested_by_customer',
          });
          refundId = refund.id;
          refundStatus = refund.status ?? 'succeeded';
        }
      } catch (err) {
        console.error('Error creating partial refund:', err);
        return NextResponse.json(
          { error: 'No se pudo procesar el reembolso. Intenta más tarde.' },
          { status: 500 }
        );
      }
    }

    const oldCheckIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
    const oldCheckOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
    const propertyId = data.propertyId as string;
    const newCheckIn = body.newCheckIn ? new Date(body.newCheckIn) : oldCheckIn;
    const newCheckOut = body.newCheckOut ? new Date(body.newCheckOut) : oldCheckOut;
    const newGuests = body.newGuests ?? data.guests ?? 1;

    const oldDateStrings = generateDateRange(oldCheckIn, oldCheckOut);
    const newDateStrings = generateDateRange(newCheckIn, newCheckOut);

    await updatePropertyAvailabilityAdmin(propertyId, oldDateStrings, true);
    await updatePropertyAvailabilityAdmin(propertyId, newDateStrings, false);

    await ref.update({
      checkIn: newCheckIn,
      checkOut: newCheckOut,
      guests: newGuests,
      totalAmount: newTotal,
      updatedAt: new Date(),
    });

    await adminDb.collection('refundRequests').add({
      reservationId: id,
      requestedBy: data.guestEmail,
      amountRefunded: previousTotal - newTotal,
      stripeRefundId: refundId ?? null,
      status: refundStatus,
      requestedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, refundId });
  } catch (error) {
    console.error('Error en reembolso por diferencia:', error);
    return NextResponse.json({ error: 'Error al procesar la modificación' }, { status: 500 });
  }
}
