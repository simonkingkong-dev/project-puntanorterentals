import { describePaymentFailure } from '@/lib/payment-errors';

describe('describePaymentFailure', () => {
  it('moneda no admitida: pide cambiar la moneda y ofrece las otras', () => {
    const r = describePaymentFailure(
      { code: 'card_declined', decline_code: 'currency_not_supported' },
      'MXN'
    );
    expect(r.action).toBe('change_currency');
    expect(r.alternativeCurrencies).toEqual(['USD', 'EUR']);
    expect(r.message).toContain('MXN');
    expect(r.message).toContain('selector');
  });

  it('acepta declineCode en camelCase (lo que devuelve nuestro API)', () => {
    const r = describePaymentFailure({ declineCode: 'currency_not_supported' }, 'USD', 'en');
    expect(r.action).toBe('change_currency');
    expect(r.alternativeCurrencies).toEqual(['MXN', 'EUR']);
    expect(r.message).toMatch(/currency/i);
  });

  it('rechazo del banco: indica hablar con el banco o reintentar', () => {
    for (const decline_code of ['generic_decline', 'do_not_honor', 'call_issuer']) {
      const r = describePaymentFailure({ code: 'card_declined', decline_code }, 'USD');
      expect(r.action).toBe('contact_bank');
      expect(r.message).toMatch(/banco/);
    }
  });

  it('card_declined sin decline_code también cuenta como rechazo del banco', () => {
    expect(describePaymentFailure({ code: 'card_declined' }, 'USD').action).toBe('contact_bank');
  });

  it('fondos insuficientes y tarjeta caducada sugieren otro método', () => {
    expect(
      describePaymentFailure({ code: 'card_declined', decline_code: 'insufficient_funds' }, 'USD').action
    ).toBe('other_method');
    expect(describePaymentFailure({ code: 'expired_card' }, 'USD').action).toBe('other_method');
  });

  it('CVC incorrecto es reintentar', () => {
    expect(describePaymentFailure({ code: 'incorrect_cvc' }, 'USD').action).toBe('retry');
  });

  it('error desconocido usa texto propio en español y el de Stripe en inglés', () => {
    expect(describePaymentFailure({ message: 'Something odd' }, 'USD', 'es').message).not.toContain('odd');
    expect(describePaymentFailure({ message: 'Something odd' }, 'USD', 'en').message).toBe('Something odd');
  });
});
