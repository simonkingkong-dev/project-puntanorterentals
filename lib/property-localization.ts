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
  property: Pick<
    Property,
    | "description"
    | "descriptionEs"
    | "descriptionEn"
    | "summary"
    | "summaryEs"
    | "summaryEn"
    | "shortDescription"
    | "shortDescriptionEs"
    | "shortDescriptionEn"
  >,
  locale: string
): string {
  return (
    pickLocalizedText(property.shortDescription, property.shortDescriptionEs, property.shortDescriptionEn, locale) ||
    pickLocalizedText(property.summary, property.summaryEs, property.summaryEn, locale) ||
    pickLocalizedText(property.description, property.descriptionEs, property.descriptionEn, locale)
  );
}

export function getLocalizedPropertyAmenities(
  property: Pick<Property, "amenities" | "amenitiesEs" | "amenitiesEn">,
  locale: string
): string[] {
  const localized = locale === "en" ? property.amenitiesEn : property.amenitiesEs;
  return localized && localized.length > 0 ? localized : property.amenities ?? [];
}
