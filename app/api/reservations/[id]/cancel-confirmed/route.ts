import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { updatePropertyAvailabilityAdmin } from '@/lib/firebase-admin-queries';
import { generateDateRange } from '@/lib/utils/date';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * POST /api/reservations/[id]/cancel-confirmed
 * Body: { token: string }
 * Cancela una reserva confirmada y crea reembolso en Stripe.
 * Solo si confirmedAt fue hace menos de 2 horas y el token coincide.
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
      return NextResponse.json({ error: 'Solo se puede cancelar una reserva confirmada' }, { status: 400 });
    }
    if ((data.modifyToken as string) !== token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
    }

    const confirmedAt = data.confirmedAt?.toDate?.() ?? new Date(data.confirmedAt);
    if (Date.now() - confirmedAt.getTime() > TWO_HOURS_MS) {
      return NextResponse.json(
        { error: 'Solo se puede cancelar sin costo dentro de las 2 horas posteriores a la confirmación' },
        { status: 400 }
      );
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
            reason: 'requested_by_customer',
          });
          refundId = refund.id;
          refundStatus = refund.status ?? 'succeeded';
        }
      } catch (err) {
        console.error('Error creating Stripe refund:', err);
        return NextResponse.json(
          { error: 'No se pudo procesar el reembolso. Intenta más tarde.' },
          { status: 500 }
        );
      }
    }

    const checkIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
    const checkOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
    const propertyId = data.propertyId as string;
    const totalAmount = data.totalAmount as number;

    await ref.update({ status: 'cancelled', updatedAt: new Date() });
    const dateStrings = generateDateRange(checkIn, checkOut);
    await updatePropertyAvailabilityAdmin(propertyId, dateStrings, true);

    await adminDb.collection('refundRequests').add({
      reservationId: id,
      requestedBy: data.guestEmail,
      amountRefunded: totalAmount,
      stripeRefundId: refundId ?? null,
      status: refundStatus,
      requestedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, refundId });
  } catch (error) {
    console.error('Error cancelando reserva confirmada:', error);
    return NextResponse.json({ error: 'Error al cancelar la reserva' }, { status: 500 });
  }
}
