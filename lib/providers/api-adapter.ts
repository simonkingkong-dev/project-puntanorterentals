import type { Service } from "@/lib/types";
import { manualAdapter } from "./manual-adapter";
import type { ProviderCalendarPayload, ServiceProviderAdapter } from "./types";

/**
 * Placeholder for future REST provider integrations.
 * Until configured, falls back to Firestore manual calendar data.
 */
export const apiAdapter: ServiceProviderAdapter = {
  type: "api",
  async getCalendar(service, startDate, endDate): Promise<ProviderCalendarPayload> {
    const apiUrl = service.providerConfig?.calendarApiUrl?.trim();
    if (!apiUrl) {
      return manualAdapter.getCalendar(service, startDate, endDate);
    }

    try {
      const url = new URL(apiUrl);
      url.searchParams.set("startDate", startDate);
      url.searchParams.set("endDate", endDate);
      if (service.providerConfig?.productId) {
        url.searchParams.set("productId", service.providerConfig.productId);
      }
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(25_000),
        headers: service.providerConfig?.apiKey
          ? { Authorization: `Bearer ${service.providerConfig.apiKey}` }
          : undefined,
      });
      if (!res.ok) throw new Error("Provider API error");
      const data = (await res.json()) as {
        availability?: Record<string, boolean>;
        dailyRates?: Record<string, number>;
      };
      return {
        availability: data.availability ?? service.availability ?? {},
        dailyRates: data.dailyRates ?? service.dailyRates ?? {},
        source: "api",
      };
    } catch {
      return manualAdapter.getCalendar(service, startDate, endDate);
    }
  },
};
