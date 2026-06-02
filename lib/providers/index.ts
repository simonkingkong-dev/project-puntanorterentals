import type { Service } from "@/lib/types";
import { apiAdapter } from "./api-adapter";
import { icalAdapter } from "./ical-adapter";
import { manualAdapter } from "./manual-adapter";
import type { ProviderCalendarPayload } from "./types";

export async function getServiceProviderCalendar(
  service: Service,
  startDate: string,
  endDate: string
): Promise<ProviderCalendarPayload> {
  const type = service.providerType ?? "manual";
  switch (type) {
    case "ical":
      return icalAdapter.getCalendar(service, startDate, endDate);
    case "api":
      return apiAdapter.getCalendar(service, startDate, endDate);
    case "manual":
    default:
      return manualAdapter.getCalendar(service, startDate, endDate);
  }
}
