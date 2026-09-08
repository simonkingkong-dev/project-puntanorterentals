import type { Property } from "@/lib/types";

/** Lightweight property shape for listing cards and map markers (smaller RSC payload). */
export interface PropertyListItem {
  id: string;
  slug: string;
  title: string;
  titleEs?: string;
  titleEn?: string;
  description: string;
  descriptionEs?: string;
  descriptionEn?: string;
  amenities: string[];
  amenitiesEs?: string[];
  amenitiesEn?: string[];
  images: string[];
  pricePerNight: number;
  /** Precomputed from dailyRates/availability for cards (avoids shipping full calendars). */
  displayNightlyRate: number | null;
  maxGuests: number;
  location: string;
  featured: boolean;
  latitude?: number;
  longitude?: number;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type DisplayRateInput = Pick<Property, "pricePerNight" | "dailyRates" | "availability"> & {
  lowestAvailableNightlyRate?: number | null;
};

export interface DisplayDateRange {
  checkIn: Date;
  checkOut: Date;
}

/**
 * Precio "Desde" en tarjetas: el **mínimo** entre noches disponibles en Hostfully.
 * Sin `dateRange`: mínimo entre todas las noches futuras (usa `lowestAvailableNightlyRate`,
 * el cron diario, como atajo). Con `dateRange`: mínimo estrictamente dentro de esas fechas
 * (ignora el atajo del cron, que no es específico del rango elegido por el huésped).
 * Si no hay tarifas por fecha aplicables, usa `pricePerNight`.
 */
export function computeDisplayNightlyRate(
  property: DisplayRateInput,
  dateRange?: DisplayDateRange
): number | null {
  const baseRate =
    typeof property.pricePerNight === "number" &&
    Number.isFinite(property.pricePerNight) &&
    property.pricePerNight > 0
      ? property.pricePerNight
      : null;

  const rates = property.dailyRates ?? {};

  if (dateRange) {
    const startKey = toDateKey(dateRange.checkIn);
    const endKey = toDateKey(dateRange.checkOut);
    let minRate: number | null = null;
    for (const [dateKey, rate] of Object.entries(rates)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
      if (dateKey < startKey || dateKey >= endKey) continue;
      if (property.availability?.[dateKey] === false) continue;
      if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) continue;
      if (minRate == null || rate < minRate) minRate = rate;
    }
    return minRate ?? baseRate;
  }

  if (
    typeof property.lowestAvailableNightlyRate === "number" &&
    Number.isFinite(property.lowestAvailableNightlyRate) &&
    property.lowestAvailableNightlyRate > 0
  ) {
    return property.lowestAvailableNightlyRate;
  }

  const todayKey = toDateKey(new Date());
  let minRate: number | null = null;

  for (const [dateKey, rate] of Object.entries(rates)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || dateKey < todayKey) continue;
    if (property.availability?.[dateKey] === false) continue;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) continue;
    if (minRate == null || rate < minRate) minRate = rate;
  }

  return minRate ?? baseRate;
}

export function toPropertyListItem(property: Property, dateRange?: DisplayDateRange): PropertyListItem {
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    titleEs: property.titleEs,
    titleEn: property.titleEn,
    description: property.description,
    descriptionEs: property.descriptionEs,
    descriptionEn: property.descriptionEn,
    amenities: property.amenities ?? [],
    amenitiesEs: property.amenitiesEs,
    amenitiesEn: property.amenitiesEn,
    images: property.images?.length ? property.images : [],
    pricePerNight: property.pricePerNight,
    displayNightlyRate: computeDisplayNightlyRate(property, dateRange),
    maxGuests: property.maxGuests,
    location: property.location,
    featured: property.featured,
    latitude: property.latitude,
    longitude: property.longitude,
  };
}

export function toPropertyListItems(properties: Property[], dateRange?: DisplayDateRange): PropertyListItem[] {
  return properties.map((property) => toPropertyListItem(property, dateRange));
}
