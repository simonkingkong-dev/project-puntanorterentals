import { buildHostfullyQuoteOverrides } from '@/lib/hostfully/quote-overrides';
import { resolveLodgingPricingFromTotalUsd } from '@/lib/lodging-taxes';

describe('buildHostfullyQuoteOverrides', () => {
  it('returns undefined for invalid totals', () => {
    expect(buildHostfullyQuoteOverrides(0)).toBeUndefined();
    expect(buildHostfullyQuoteOverrides(-10)).toBeUndefined();
    expect(buildHostfullyQuoteOverrides(Number.NaN)).toBeUndefined();
  });

  it('puts lodging subtotal in rent and IVA/ISH in otherFees', () => {
    const totalUsd = 122; // 100 + 16 IVA + 6 ISH
    const { subtotalUsd, ivaUsd, ishUsd } = resolveLodgingPricingFromTotalUsd(totalUsd);

    const overrides = buildHostfullyQuoteOverrides(totalUsd);

    expect(overrides).toEqual({
      rent: {
        rentNetPrice: subtotalUsd,
        extraGuestsNetPrice: 0,
      },
      fees: {
        otherFees: [
          { name: 'IVA (16%)', amountType: 'AMOUNT', netPrice: ivaUsd },
          { name: 'ISH (6%)', amountType: 'AMOUNT', netPrice: ishUsd },
        ],
      },
      securityDeposit: 0,
    });

    const feeSum = overrides!.fees.otherFees.reduce(
      (s, f) => s + f.netPrice,
      0
    );
    expect(overrides!.rent.rentNetPrice + feeSum).toBe(totalUsd);
  });

  it('keeps rent when taxes round to zero on tiny totals', () => {
    const overrides = buildHostfullyQuoteOverrides(1);
    expect(overrides).toBeDefined();
    expect(overrides!.rent.rentNetPrice + overrides!.fees.otherFees.reduce((s, f) => s + f.netPrice, 0)).toBe(1);
  });
});
