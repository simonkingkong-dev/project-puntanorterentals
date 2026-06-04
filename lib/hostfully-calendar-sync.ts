import {
  extractCalendarDaysFromHostfullyCalendar,
  type HostfullyPropertyCalendarDay,
} from "@/lib/hostfully/client";

export type ParsedHostfullyCalendar = {
  availability: Record<string, boolean>;
  dailyRates: Record<string, number>;
};

const CALENDAR_DAY_ARRAY_KEYS = [
  "dates",
  "calendar",
  "days",
  "availability",
  "items",
  "results",
] as const;

function extractRawCalendarDays(
  calendar: Record<string, unknown>
): HostfullyPropertyCalendarDay[] {
  for (const key of CALENDAR_DAY_ARRAY_KEYS) {
    const value = calendar[key];
    if (Array.isArray(value) && value.length > 0) {
      return value as HostfullyPropertyCalendarDay[];
    }
  }
  return [];
}

function extractDailyRatesFromDays(days: HostfullyPropertyCalendarDay[]): Record<string, number> {
  const dailyRates: Record<string, number> = {};
  for (const d of days) {
    const dateStr = d.date;
    if (!dateStr || d.available === false) continue;
    const rate = d.rate ?? d.price ?? d.dailyRate;
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      dailyRates[dateStr] = rate;
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
  const rawDays = extractRawCalendarDays(calendar);
  const dailyRates = extractDailyRatesFromDays(rawDays);
  return { availability, dailyRates };
}

/** Parsea un arreglo de días (retrocompatibilidad). */
export function parseHostfullyCalendarDays(
  dates: HostfullyPropertyCalendarDay[]
): ParsedHostfullyCalendar {
  return parseHostfullyCalendarResponse({ dates });
}
