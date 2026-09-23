import {
  extractCalendarDaysFromHostfullyCalendar,
  findRawCalendarDayObjects,
  isHostfullyDayAvailable,
  type HostfullyPropertyCalendarDay,
} from "@/lib/hostfully/client";
import { HOSTFULLY_PRICE_MARKUP_MULTIPLIER } from "@/lib/hostfully-price-markup";

export type ParsedHostfullyCalendar = {
  availability: Record<string, boolean>;
  dailyRates: Record<string, number>;
};

/**
 * Precio por noche crudo de un día de calendario Hostfully. Cubre tanto formatos planos
 * (`rate`/`price`/`dailyRate` en el nivel superior) como el formato v3.2, donde el precio
 * viene anidado en `pricing.value` (ver `findRawCalendarDayObjects`).
 */
function extractRawNightlyRate(day: Record<string, unknown>): number | undefined {
  const flat = day.rate ?? day.price ?? day.dailyRate;
  if (typeof flat === "number" && Number.isFinite(flat) && flat > 0) return flat;

  const pricing = day.pricing;
  if (pricing && typeof pricing === "object") {
    const value = (pricing as Record<string, unknown>).value;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

function extractDailyRatesFromDays(days: Array<Record<string, unknown>>): Record<string, number> {
  const dailyRates: Record<string, number> = {};
  for (const d of days) {
    const dateStr = typeof d.date === "string" ? d.date : undefined;
    if (!dateStr || !isHostfullyDayAvailable(d)) continue;
    const rate = extractRawNightlyRate(d);
    if (rate != null) {
      dailyRates[dateStr] = Math.round(rate * HOSTFULLY_PRICE_MARKUP_MULTIPLIER * 100) / 100;
    }
  }
  return dailyRates;
}

/** Parsea la respuesta completa de calendario Hostfully (misma lógica que checkHostfullyAvailability). */
export function parseHostfullyCalendarResponse(
  calendar: Record<string, unknown>
): ParsedHostfullyCalendar {
  const parsedDays = extractCalendarDaysFromHostfullyCalendar(calendar);
  const availability: Record<string, boolean> = {};
  for (const day of parsedDays) {
    availability[day.date] = day.available;
  }
  const rawDays = findRawCalendarDayObjects(calendar);
  const dailyRates = extractDailyRatesFromDays(rawDays);
  return { availability, dailyRates };
}

/** Parsea un arreglo de días (retrocompatibilidad). */
export function parseHostfullyCalendarDays(
  dates: HostfullyPropertyCalendarDay[]
): ParsedHostfullyCalendar {
  return parseHostfullyCalendarResponse({ dates });
}
