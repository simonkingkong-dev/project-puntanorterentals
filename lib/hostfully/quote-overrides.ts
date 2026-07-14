import { resolveLodgingPricingFromTotalUsd } from '@/lib/lodging-taxes';

export type HostfullyOtherFee = {
  name: string;
  amountType: 'AMOUNT';
  netPrice: number;
};

export type HostfullyQuoteOverrides = {
  rent: {
    rentNetPrice: number;
    extraGuestsNetPrice: number;
  };
  fees: {
    otherFees: HostfullyOtherFee[];
  };
  securityDeposit: number;
};

/**
 * Construye quoteOverrides para POST /leads.
 * @see https://dev.hostfully.com/reference/createlead
 * Shape documentado por integraciones (rent.rentNetPrice + fees.otherFees).
 *
 * Descompone el total cobrado en la web (subtotal + IVA + ISH) para que el
 * order de Hostfully refleje el monto real, no solo una nota.
 */
export function buildHostfullyQuoteOverrides(
  totalAmountUsd: number
): HostfullyQuoteOverrides | undefined {
  const total = Number(totalAmountUsd);
  if (!Number.isFinite(total) || total <= 0) return undefined;

  const { subtotalUsd, ivaUsd, ishUsd } = resolveLodgingPricingFromTotalUsd(total);
  const otherFees: HostfullyOtherFee[] = [];
  if (ivaUsd > 0) {
    otherFees.push({ name: 'IVA (16%)', amountType: 'AMOUNT', netPrice: ivaUsd });
  }
  if (ishUsd > 0) {
    otherFees.push({ name: 'ISH (6%)', amountType: 'AMOUNT', netPrice: ishUsd });
  }

  return {
    rent: {
      rentNetPrice: subtotalUsd,
      extraGuestsNetPrice: 0,
    },
    fees: { otherFees },
    securityDeposit: 0,
  };
}
