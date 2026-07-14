/**
 * Variantes de payload para POST /transactions.
 * Primero se intenta SALE con amount explícito (Stripe); fullPayment al final
 * (cobra el balance residual del order — útil tras quoteOverrides correctos).
 */
export function buildHostfullyTransactionPayloads(
  orderUid: string,
  params: { amount: number; externalPaymentId?: string; note?: string }
): Array<Record<string, unknown>> {
  const amount = Number(params.amount);
  const notes =
    params.note ??
    (params.externalPaymentId ? `Pago Stripe ${params.externalPaymentId}` : undefined);

  return [
    {
      orderUid,
      type: 'SALE',
      status: 'SUCCESS',
      amount,
      manual: true,
      notes,
    },
    {
      orderUid,
      type: 'SALE',
      status: 'SUCCESS',
      amount,
      manual: false,
      transactionId: params.externalPaymentId,
      notes,
    },
    {
      orderUid,
      type: 'SALE',
      status: 'SUCCESS',
      fullPayment: true,
      manual: true,
      notes,
    },
  ];
}
