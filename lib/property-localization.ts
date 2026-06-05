import type { Property } from "@/lib/types";

export function getLocalizedPropertyTitle(
  property: Pick<Property, "title" | "titleEs" | "titleEn">,
  locale: string
): string {
  if (locale === "en") {
    return property.titleEn?.trim() || property.title || property.titleEs || "";
  }
  return property.titleEs?.trim() || property.title || property.titleEn || "";
}

export function pickLocalizedText(
  base: string | undefined,
  es: string | undefined,
  en: string | undefined,
  locale: string
): string {
  return (locale === "en" ? en : es)?.trim() || base?.trim() || "";
}

export function getLocalizedPropertyDescription(
  property: Pick<Property, "description" | "descriptionEs" | "descriptionEn">,
  locale: string
): string {
  return pickLocalizedText(
    property.description,
    property.descriptionEs,
    property.descriptionEn,
    locale
  );
}

export function getLocalizedPropertyAmenities(
  property: Pick<Property, "amenities" | "amenitiesEs" | "amenitiesEn">,
  locale: string
): string[] {
  const localized = locale === "en" ? property.amenitiesEn : property.amenitiesEs;
  return localized && localized.length > 0 ? localized : property.amenities ?? [];
}

const HOSTFULLY_CANCELLATION_30D_EN =
  "Guests must cancel at least 30 days before check-in to receive a full refund. No refunds will be issued for cancellations made within 30 days of the check-in date.";

function isHostfully30DayCancellationPolicy(text: string): boolean {
  return (
    text === HOSTFULLY_CANCELLATION_30D_EN ||
    /must cancel at least 30 days before check-in/i.test(text)
  );
}

/** Hostfully stores cancellation text in English; map the standard 30-day policy per locale. */
export function getLocalizedCancellationPolicy(
  raw: string | undefined,
  locale: string,
  translate: (key: string, fallback: string) => string
): string {
  const text = raw?.trim() || "";
  if (!text) return "";
  if (locale === "en") return text;
  if (isHostfully30DayCancellationPolicy(text)) {
    return translate(
      "property_cancellation_policy_30d",
      HOSTFULLY_CANCELLATION_30D_EN
    );
  }
  return text;
}
