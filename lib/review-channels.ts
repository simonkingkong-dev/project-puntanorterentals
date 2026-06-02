import type { PropertyReviewChannel } from "@/lib/types";

export const PROPERTY_REVIEW_CHANNELS: {
  id: PropertyReviewChannel;
  labelEs: string;
  labelEn: string;
}[] = [
  { id: "airbnb", labelEs: "Airbnb", labelEn: "Airbnb" },
  { id: "booking", labelEs: "Booking.com", labelEn: "Booking.com" },
  { id: "google", labelEs: "Google", labelEn: "Google" },
  { id: "vrbo", labelEs: "Vrbo", labelEn: "Vrbo" },
  { id: "tripadvisor", labelEs: "Tripadvisor", labelEn: "Tripadvisor" },
  { id: "other", labelEs: "Otro", labelEn: "Other" },
];

export function getReviewChannelLabel(
  channel: PropertyReviewChannel,
  locale: "es" | "en"
): string {
  const row = PROPERTY_REVIEW_CHANNELS.find((c) => c.id === channel);
  if (!row) return channel;
  return locale === "en" ? row.labelEn : row.labelEs;
}
