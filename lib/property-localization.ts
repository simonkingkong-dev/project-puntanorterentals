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
