import { buildHostfullyQuoteOverrides } from '@/lib/hostfully/quote-overrides';

type Q = {
  totalPrice: number;
  rent: { rentNetPrice: number; rentBaseNetPrice: number; taxAmount: number };
  fees: { otherFees: Array<{ name: string; netPrice: number }> };
};

describe('buildHostfullyQuoteOverrides', () => {
  it('53 USD → renta 43 + VAT 7 + City Tax 3 (caso real verificado en Hostfully)', () => {
    const q = buildHostfullyQuoteOverrides(53) as Q;
    expect(q.totalPrice).toBe(53);
    expect(q.rent.rentNetPrice).toBe(43);
    expect(q.rent.rentBaseNetPrice).toBe(43);
    expect(q.rent.taxAmount).toBe(0);
    expect(q.fees.otherFees).toEqual([
      expect.objectContaining({ name: 'VAT', netPrice: 7 }),
      expect.objectContaining({ name: 'City Tax', netPrice: 3 }),
    ]);
  });

  it('renta + VAT + City Tax siempre suman el total', () => {
    for (const total of [53, 120, 249, 1000]) {
      const q = buildHostfullyQuoteOverrides(total) as Q;
      const sum = q.rent.rentNetPrice + q.fees.otherFees.reduce((a, f) => a + f.netPrice, 0);
      expect(sum).toBe(Math.round(total));
    }
  });

  it('el valor va en netPrice, no en amount (Hostfully ignora amount)', () => {
    const q = buildHostfullyQuoteOverrides(53) as Q;
    for (const f of q.fees.otherFees) expect(f).not.toHaveProperty('amount');
  });
});
