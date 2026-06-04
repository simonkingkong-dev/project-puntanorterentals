import type { Currency } from "@/components/ui/currency-select";
import { getUsdDisplayMultiplier } from "@/lib/display-exchange-rate";
import { roundForDisplay } from "@/lib/round-display-money";

export function formatDisplayMoney(amount: number, currency: Currency): string {
  if (currency === "MXN") {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  if (currency === "EUR") {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function convertUsdToDisplay(
  amountUsd: number,
  currency: Currency,
  usdMxnRate: number | null,
  usdEurRate: number | null
): number {
  const rate = getUsdDisplayMultiplier(currency, usdMxnRate, usdEurRate);
  return roundForDisplay(amountUsd * rate, currency);
}
