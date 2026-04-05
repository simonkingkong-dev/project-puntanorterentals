import type { Currency } from "@/components/ui/currency-select";

/** Fallbacks si aún no cargó GET /api/exchange-rate (mismo orden de magnitud que Frankfurter). */
const FALLBACK_USD_EUR = 0.92;
const FALLBACK_USD_MXN = 17.2;

/**
 * Multiplicador para pasar importes en USD a la moneda mostrada (MXN/EUR) o 1 en USD.
 * EUR &lt; 1 USD→EUR implica menos euros que dólares para el mismo total en USD.
 */
export function getUsdDisplayMultiplier(
  currency: Currency,
  usdMxnRate: number | null | undefined,
  usdEurRate: number | null | undefined
): number {
  if (currency === "USD") return 1;
  if (currency === "MXN") return usdMxnRate ?? FALLBACK_USD_MXN;
  if (currency === "EUR") return usdEurRate ?? FALLBACK_USD_EUR;
  return 1;
}
