import type { Service } from "@/lib/types";
import type { ProviderCalendarPayload, ServiceProviderAdapter } from "./types";

export const manualAdapter: ServiceProviderAdapter = {
  type: "manual",
  async getCalendar(service): Promise<ProviderCalendarPayload> {
    return {
      availability: service.availability ?? {},
      dailyRates: service.dailyRates ?? {},
      source: "firestore",
    };
  },
};
