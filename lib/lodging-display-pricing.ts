import type { Currency } from "@/components/ui/currency-select";
import { getUsdDisplayMultiplier } from "@/lib/display-exchange-rate";
import { computeLodgingTaxesUsd } from "@/lib/lodging-taxes";
import { roundForDisplay } from "@/lib/round-display-money";

export type LodgingDisplayPricing = {
  accommodationDisplay: number;
  extraGuestDisplay: number;
  subtotalDisplay: number;
  ivaDisplay: number;
  ishDisplay: number;
  totalDisplay: number;
};

/**
 * Importes mostrados en la UI (calendario / formulario).
 * En MXN/EUR los impuestos se calculan sobre el subtotal mostrado para que coincidan con 16 % / 6 %.
 * El cobro en servidor sigue usando USD vía `computeLodgingTaxesUsd`.
 */
export function computeLodgingDisplayPricing(
  nightlySumUsd: number,
  extraGuestFeesUsd: number,
  currency: Currency,
  usdMxnRate: number | null | undefined,
  usdEurRate: number | null | undefined
): LodgingDisplayPricing {
  const displayRate = getUsdDisplayMultiplier(currency, usdMxnRate, usdEurRate);
  const subtotalUsd = nightlySumUsd + extraGuestFeesUsd;

  const accommodationDisplay = roundForDisplay(nightlySumUsd * displayRate, currency);
  const extraGuestDisplay = roundForDisplay(extraGuestFeesUsd * displayRate, currency);
  const subtotalDisplay = roundForDisplay(subtotalUsd * displayRate, currency);

  if (currency === "USD") {
    const { ivaUsd, ishUsd, taxesUsd } = computeLodgingTaxesUsd(subtotalUsd);
    return {
      accommodationDisplay,
      extraGuestDisplay,
      subtotalDisplay,
      ivaDisplay: ivaUsd,
      ishDisplay: ishUsd,
      totalDisplay: subtotalUsd + taxesUsd,
    };
  }

  const ivaDisplay = roundForDisplay(subtotalDisplay * 0.16, currency);
  const ishDisplay = roundForDisplay(subtotalDisplay * 0.06, currency);
  const totalDisplay = roundForDisplay(subtotalDisplay + ivaDisplay + ishDisplay, currency);

  return {
    accommodationDisplay,
    extraGuestDisplay,
    subtotalDisplay,
    ivaDisplay,
    ishDisplay,
    totalDisplay,
  };
}
