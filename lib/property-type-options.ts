export type PropertyContentLocale = "es" | "en";

const PROPERTY_TYPE_LABELS: Record<string, Record<PropertyContentLocale, string>> = {
  APARTMENT: { es: "Apartamento", en: "Apartment" },
  ROOM: { es: "Habitación privada", en: "Private room" },
  GUESTHOUSE: { es: "Casa de huéspedes", en: "Guesthouse" },
  HOUSE: { es: "Casa", en: "House" },
  STUDIO: { es: "Estudio", en: "Studio" },
};

const ROOM_TYPE_LABELS: Record<string, Record<PropertyContentLocale, string>> = {
  APARTMENT: { es: "Departamento completo", en: "Entire apartment" },
  FAMILY: { es: "Ideal para familias", en: "Family-friendly" },
  ENTIRE: { es: "Espacio completo", en: "Entire place" },
};

export const PROPERTY_TYPE_ADMIN_OPTIONS = [
  { value: "APARTMENT", label: "Apartamento" },
  { value: "ROOM", label: "Habitación privada" },
  { value: "GUESTHOUSE", label: "Casa de huéspedes" },
  { value: "STUDIO", label: "Estudio" },
  { value: "HOUSE", label: "Casa completa" },
] as const;

export const ROOM_TYPE_ADMIN_OPTIONS = [
  { value: "Apartment", label: "Departamento completo" },
  { value: "Family", label: "Ideal para familias / grupos" },
  { value: "Entire place", label: "Espacio completo" },
  { value: "Private room", label: "Habitación privada" },
] as const;

function labelFor(
  map: Record<string, Record<PropertyContentLocale, string>>,
  value: string,
  locale: PropertyContentLocale
): string | null {
  const key = value.trim().toUpperCase();
  const entry = map[key];
  return entry?.[locale] ?? null;
}

/** Texto legible para la ficha pública (mapea códigos Hostfully o muestra texto personalizado). */
export function formatPropertyTypeDisplay(
  propertyType: string | undefined,
  roomType: string | undefined,
  locale: PropertyContentLocale = "es"
): string | null {
  const parts: string[] = [];
  const pt = propertyType?.trim();
  const rt = roomType?.trim();

  if (pt) {
    parts.push(labelFor(PROPERTY_TYPE_LABELS, pt, locale) ?? pt);
  }
  if (rt) {
    const rtLabel = labelFor(ROOM_TYPE_LABELS, rt, locale) ?? rt;
    const normalized = rtLabel.toLowerCase();
    if (!parts.some((p) => p.toLowerCase() === normalized)) {
      parts.push(rtLabel);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
