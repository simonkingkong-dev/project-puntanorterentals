import type { Property } from "@/lib/types";

export type PropertyStayVariant = "default" | "shared_room" | "no_full_kitchen";

export type PropertyContentLocale = "es" | "en";

/** Variante según tipo de alojamiento (detalles extra solo cuando aplica). */
export function getPropertyStayVariant(
  property: Pick<Property, "propertyType" | "slug">
): PropertyStayVariant {
  if (property.slug === "07-estudio") return "no_full_kitchen";
  if (property.propertyType === "ROOM") return "shared_room";
  return "default";
}

const INCLUDED_ES: Record<PropertyStayVariant, string[]> = {
  default: [
    "Agua caliente",
    "Wi‑Fi de buena velocidad",
    "TV",
    "Refrigerador",
    "Aire acondicionado",
    "Cocina equipada de uso exclusivo",
  ],
  shared_room: [
    "Agua caliente",
    "Wi‑Fi de buena velocidad",
    "TV en la habitación",
    "Minibar en la habitación",
    "Aire acondicionado",
    "Cocina, comedor y sala compartidos con otros huéspedes",
  ],
  no_full_kitchen: [
    "Agua caliente",
    "Wi‑Fi de buena velocidad",
    "TV inteligente",
    "Aire acondicionado",
    "Rincón de café con microondas y cafetera (sin cocina completa)",
  ],
};

const INCLUDED_EN: Record<PropertyStayVariant, string[]> = {
  default: [
    "Hot water",
    "Reliable high-speed Wi‑Fi",
    "TV",
    "Refrigerator",
    "Air conditioning",
    "Fully equipped kitchen for your exclusive use",
  ],
  shared_room: [
    "Hot water",
    "Reliable high-speed Wi‑Fi",
    "In-room TV",
    "In-room minibar",
    "Air conditioning",
    "Shared kitchen, dining area, and living room with other guests",
  ],
  no_full_kitchen: [
    "Hot water",
    "Reliable high-speed Wi‑Fi",
    "Smart TV",
    "Air conditioning",
    "Coffee station with microwave and coffee maker (no full kitchen)",
  ],
};

const LOCATION_ES = [
  "En el corazón de Isla Mujeres (Punta Norte), a una cuadra de la peatonal Hidalgo.",
  "Restaurantes, tiendas y servicios esenciales a distancia caminable.",
  "Las playas más populares (Playa Centro, Playa Norte, Media Luna) a 3 cuadras o menos.",
  "Menos de 10 minutos caminando al muelle del ferry.",
];

const LOCATION_EN = [
  "In the heart of Isla Mujeres (Punta Norte), one block from Hidalgo pedestrian street.",
  "Restaurants, shops, and essentials within easy walking distance.",
  "Popular beaches (Playa Centro, Playa Norte, Media Luna) are three blocks away or less.",
  "Less than a 10-minute walk to the ferry dock.",
];

const STAY_INFO_ES = [
  "Check-in autónomo desde las 15:00 h · check-out hasta las 11:00 h.",
  "Asistencia por WhatsApp o email; personal en sitio de 11:00 a 16:00 h.",
  "No se permiten mascotas, fiestas ni visitas no registradas.",
];

const STAY_INFO_EN = [
  "Self check-in from 3:00 PM · check-out by 11:00 AM.",
  "Help via WhatsApp or email; on-site staff from 11:00 AM to 4:00 PM.",
  "No pets, parties, or unregistered guests.",
];

export function getPropertyStayHighlights(
  property: Pick<Property, "propertyType" | "slug">,
  locale: PropertyContentLocale
): {
  included: string[];
  location: string[];
  stayInfo: string[];
  variant: PropertyStayVariant;
} {
  const variant = getPropertyStayVariant(property);
  const isEn = locale === "en";
  return {
    variant,
    included: isEn ? INCLUDED_EN[variant] : INCLUDED_ES[variant],
    location: isEn ? LOCATION_EN : LOCATION_ES,
    stayInfo: isEn ? STAY_INFO_EN : STAY_INFO_ES,
  };
}
