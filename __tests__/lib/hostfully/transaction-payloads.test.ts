import { buildHostfullyTransactionPayloads } from '@/lib/hostfully/transaction-payloads';

describe('buildHostfullyTransactionPayloads', () => {
  it('tries explicit amount before fullPayment and includes Stripe id on every attempt', () => {
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
      transactionId: 'pi_abc',
    });
    expect(payloads[0]).not.toHaveProperty('fullPayment');

    expect(payloads[1]).toMatchObject({
      amount: 122,
      manual: false,
      transactionId: 'pi_abc',
    });

    const fullPaymentIdx = payloads.findIndex((p) => p.fullPayment === true);
    expect(fullPaymentIdx).toBeGreaterThan(0);
    expect(payloads[fullPaymentIdx]).toMatchObject({ transactionId: 'pi_abc' });
    expect(payloads[fullPaymentIdx]).not.toHaveProperty('amount');
  });

  it('omits transactionId when Stripe id is missing', () => {
    const payloads = buildHostfullyTransactionPayloads('order-1', { amount: 50 });
    for (const p of payloads) {
      expect(p).not.toHaveProperty('transactionId');
    }
  });
});
