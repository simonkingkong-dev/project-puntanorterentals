import type { HostfullyPropertyCalendarDay } from "@/lib/hostfully/client";

export type ParsedHostfullyCalendar = {
  availability: Record<string, boolean>;
  dailyRates: Record<string, number>;
};

/** Parsea la respuesta de calendario Hostfully en mapas por fecha (YYYY-MM-DD). */
export function parseHostfullyCalendarDays(
  dates: HostfullyPropertyCalendarDay[]
): ParsedHostfullyCalendar {
  const availability: Record<string, boolean> = {};
  const dailyRates: Record<string, number> = {};

  for (const d of dates) {
    const dateStr = d.date;
    if (!dateStr) continue;
    const available = d.available !== false;
    availability[dateStr] = available;
    if (available) {
      const rate = d.rate ?? d.price ?? d.dailyRate;
      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
        dailyRates[dateStr] = rate;
      }
    }
  }

  return { availability, dailyRates };
}
