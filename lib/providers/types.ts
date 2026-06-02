import type { Service } from "@/lib/types";

export interface ProviderCalendarPayload {
  availability: Record<string, boolean>;
  dailyRates: Record<string, number>;
  source: "firestore" | "ical" | "api";
}

export interface ServiceProviderAdapter {
  type: Service["providerType"];
  getCalendar(service: Service, startDate: string, endDate: string): Promise<ProviderCalendarPayload>;
}
