import type { Currency } from "@/components/ui/currency-select";

export function parseCurrency(value: string | null | undefined): Currency {
  const v = value?.trim().toUpperCase();
  if (v === "USD" || v === "MXN" || v === "EUR") return v;
  return "USD";
}

export const LISTING_CURRENCY_STORAGE_KEY = "pnr_listing_currency";

export function readStoredListingCurrency(): Currency | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LISTING_CURRENCY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseCurrency(raw);
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredListingCurrency(currency: Currency): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LISTING_CURRENCY_STORAGE_KEY, currency);
  } catch {
    /* ignore quota / private mode */
  }
}
