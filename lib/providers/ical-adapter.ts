import type { Service } from "@/lib/types";
import type { ProviderCalendarPayload, ServiceProviderAdapter } from "./types";

function parseIcalBusyDates(icsText: string): Record<string, boolean> {
  const availability: Record<string, boolean> = {};
  const dtstartMatches = Array.from(icsText.matchAll(/DTSTART(?:;VALUE=DATE)?:(\d{8})/g));
  for (const match of dtstartMatches) {
    const raw = match[1];
    const key = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    availability[key] = false;
  }
  return availability;
}

export const icalAdapter: ServiceProviderAdapter = {
  type: "ical",
  async getCalendar(service): Promise<ProviderCalendarPayload> {
    const icalUrl = service.providerConfig?.icalUrl?.trim();
    const baseAvailability = { ...(service.availability ?? {}) };
    const dailyRates = { ...(service.dailyRates ?? {}) };

    if (!icalUrl) {
      return { availability: baseAvailability, dailyRates, source: "firestore" };
    }

    try {
      const res = await fetch(icalUrl, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error("iCal fetch failed");
      const text = await res.text();
      const busy = parseIcalBusyDates(text);
      return {
        availability: { ...baseAvailability, ...busy },
        dailyRates,
        source: "ical",
      };
    } catch {
      return { availability: baseAvailability, dailyRates, source: "firestore" };
    }
  },
};
