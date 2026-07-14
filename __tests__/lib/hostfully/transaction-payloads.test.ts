import { buildHostfullyTransactionPayloads } from '@/lib/hostfully/transaction-payloads';

describe('buildHostfullyTransactionPayloads', () => {
  it('tries explicit amount before fullPayment', () => {
    const payloads = buildHostfullyTransactionPayloads('order-1', {
      amount: 122,
      externalPaymentId: 'pi_abc',
      note: 'Pago Stripe pi_abc — 122 USD',
    });

    expect(payloads[0]).toMatchObject({
      orderUid: 'order-1',
      type: 'SALE',
      status: 'SUCCESS',
      amount: 122,
      manual: true,
    });
    expect(payloads[0]).not.toHaveProperty('fullPayment');

    const fullPaymentIdx = payloads.findIndex((p) => p.fullPayment === true);
    expect(fullPaymentIdx).toBeGreaterThan(0);
    expect(payloads[fullPaymentIdx]).not.toHaveProperty('amount');
  });
});
