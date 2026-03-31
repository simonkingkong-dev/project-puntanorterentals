import type Stripe from 'stripe';

/** Importe y moneda reales del cobro (Stripe), para mostrar en confirmación. */
export function paymentDisplayFromIntent(pi: Stripe.PaymentIntent): {
  paidCurrency: string;
  paidAmount: number;
} {
  const currency = (pi.currency || 'usd').toUpperCase();
  const minor = pi.amount_received ?? pi.amount ?? 0;
  return {
    paidCurrency: currency,
    paidAmount: minor / 100,
  };
}
