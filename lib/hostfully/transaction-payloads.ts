/**
 * Variantes de payload para POST /transactions.
 * Primero SALE con amount explícito (Stripe); fullPayment al final.
 * En todos los intentos se envía transactionId = PaymentIntent id de Stripe
 * cuando está disponible, además de ir en notes.
 */
export function buildHostfullyTransactionPayloads(
  orderUid: string,
  params: { amount: number; externalPaymentId?: string; note?: string }
): Array<Record<string, unknown>> {
  const amount = Number(params.amount);
  const notes =
    params.note ??
    (params.externalPaymentId ? `Pago Stripe ${params.externalPaymentId}` : undefined);

  const stripeId = params.externalPaymentId?.trim() || undefined;

  return [
    {
      orderUid,
      type: 'SALE',
      status: 'SUCCESS',
      amount,
      manual: true,
      ...(stripeId ? { transactionId: stripeId } : {}),
      notes,
    },
    {
      orderUid,
      type: 'SALE',
      status: 'SUCCESS',
      amount,
      manual: false,
      ...(stripeId ? { transactionId: stripeId } : {}),
      notes,
    },
    {
      orderUid,
      type: 'SALE',
      status: 'SUCCESS',
      fullPayment: true,
      manual: true,
      ...(stripeId ? { transactionId: stripeId } : {}),
      notes,
    },
  ];
}
