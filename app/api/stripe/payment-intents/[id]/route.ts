import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { paymentDisplayFromIntent } from '@/lib/stripe-payment-display';

/**
 * GET /api/stripe/payment-intents/[id]
 * Resumen del cobro (moneda + importe) para la página de éxito. Requiere id de PaymentIntent.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: 'payment_intent requerido' }, { status: 400 });
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(id.trim());
    if (pi.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'El pago aún no está confirmado' },
        { status: 400 }
      );
    }
    return NextResponse.json(paymentDisplayFromIntent(pi));
  } catch (e) {
    console.error('[api/stripe/payment-intents] retrieve:', e);
    return NextResponse.json({ error: 'No se pudo obtener el pago' }, { status: 404 });
  }
}
