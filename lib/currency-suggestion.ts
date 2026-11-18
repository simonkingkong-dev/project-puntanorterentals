import type { Currency } from "@/components/ui/currency-select";

/**
 * Sugerencia de moneda según la ubicación aproximada del visitante:
 * México → MXN · Europa → EUR · Estados Unidos y el resto del mundo → USD.
 *
 * Se deduce en el navegador (zona horaria del dispositivo y región del idioma): no
 * depende de servicios externos ni envía datos de ubicación a ningún lado. Es solo una
 * sugerencia: el visitante siempre puede cambiarla en el selector.
 */

const MEXICO_TIME_ZONES = new Set([
  "America/Mexico_City",
  "America/Cancun",
  "America/Merida",
  "America/Monterrey",
  "America/Matamoros",
  "America/Chihuahua",
  "America/Ciudad_Juarez",
  "America/Ojinaga",
  "America/Mazatlan",
  "America/Hermosillo",
  "America/Tijuana",
  "America/Bahia_Banderas",
]);

/** Territorios europeos fuera de `Europe/*` que cobran en euros. */
const EURO_ATLANTIC_TIME_ZONES = new Set([
  "Atlantic/Canary",
  "Atlantic/Madeira",
  "Atlantic/Azores",
]);

/** Códigos de país europeos (ISO 3166-1) para el caso en que solo haya idioma. */
const EUROPE_REGIONS = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "GB",
  "CH", "NO", "IS", "LI", "MC", "SM", "VA", "AD", "AL", "BA", "ME", "MK", "RS", "XK",
]);

export function currencyForTimeZone(timeZone: string | null | undefined): Currency | null {
  if (!timeZone) return null;
  if (MEXICO_TIME_ZONES.has(timeZone)) return "MXN";
  if (timeZone.startsWith("Europe/") || EURO_ATLANTIC_TIME_ZONES.has(timeZone)) return "EUR";
  // Cualquier otra zona conocida (EE. UU., resto del mundo) → USD.
  return "USD";
}

export function currencyForLanguageRegion(languages: readonly string[]): Currency | null {
  for (const lang of languages) {
    const region = lang.split(/[-_]/)[1]?.toUpperCase();
    if (!region) continue;
    if (region === "MX") return "MXN";
    if (EUROPE_REGIONS.has(region)) return "EUR";
    return "USD";
  }
  return null;
}

/** Pura y testeable: la zona horaria manda; el idioma solo desempata si no hay zona. */
export function suggestCurrency(input: {
  timeZone?: string | null;
  languages?: readonly string[];
}): Currency {
  return (
    currencyForTimeZone(input.timeZone) ??
    currencyForLanguageRegion(input.languages ?? []) ??
    "USD"
  );
}

/** Lee la zona horaria e idiomas del navegador. En servidor devuelve USD. */
export function suggestCurrencyFromBrowser(): Currency {
  if (typeof window === "undefined") return "USD";
  let timeZone: string | null = null;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    /* sin Intl: se usa el idioma */
  }
  const languages =
    typeof navigator !== "undefined"
      ? navigator.languages?.length
        ? navigator.languages
        : [navigator.language].filter(Boolean)
      : [];
  return suggestCurrency({ timeZone, languages });
}
