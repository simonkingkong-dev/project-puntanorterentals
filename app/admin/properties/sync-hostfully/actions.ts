"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import {
  listProperties,
  getPropertyDetails,
  getPropertyDescriptions,
  getPropertyPhotos,
  getPropertyAmenities,
} from "@/lib/hostfully/client";
import { Property } from "@/lib/types";

type HostfullyRaw = Record<string, unknown>;
const HOSTFULLY_DEBUG_PROPERTY_UID = "8dbf9762-f3b9-46a7-9fb7-1659e1102e7d";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractLocation(addr: unknown): string {
  if (!addr || typeof addr !== "object") return "";
  const a = addr as Record<string, unknown>;
  const parts = [
    a.address,
    a.address2,
    a.city,
    a.state,
    a.zipCode,
    a.countryCode,
  ].filter(Boolean);
  return parts.map(String).join(", ");
}

/** Prefiere nombre público (API: publicName) sobre nombre interno; luego canal/listing. */
function extractDisplayName(h: HostfullyRaw): string {
  const fallback = (h.name ?? h.title ?? "Propiedad sin nombre") as string;
  const publicName =
    h.publicName ??
    h.publicListingName ??
    h.listingPublicName ??
    h.displayName ??
    h.listingName ??
    h.public_name ??
    h.listing_name ??
    h.publicListingTitle;
  if (typeof publicName === "string" && publicName.trim()) return publicName.trim();
  const listings = h.listings ?? h.channels;
  if (listings && typeof listings === "object") {
    const list = Array.isArray(listings) ? listings : Object.values(listings);
    for (const item of list) {
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const n = obj.name ?? obj.title ?? obj.publicName ?? obj.listingName;
        if (typeof n === "string" && n.trim()) return n.trim();
      }
    }
  }
  return fallback;
}

const IMAGE_URL_KEYS = ["url", "link", "src", "fileUrl", "imageUrl", "photoUrl", "href"];

function getUrlFromItem(item: unknown): string | null {
  if (typeof item === "string" && item.startsWith("http")) return item;
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    for (const k of IMAGE_URL_KEYS) {
      const v = obj[k];
      if (typeof v === "string" && v.startsWith("http")) return v;
    }
  }
  return null;
}

/** Imagen principal primero, luego el resto sin duplicar (pictureLink + arrays). */
function extractImages(p: HostfullyRaw): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const push = (url: string | null | undefined) => {
    if (!url || !url.startsWith("http")) return;
    if (seen.has(url)) return;
    seen.add(url);
    ordered.push(url);
  };

  if (typeof p.pictureLink === "string") {
    push(p.pictureLink);
  }

  const keysToTry: (keyof HostfullyRaw)[] = [
    "photos",
    "media",
    "mediaLinks",
    "images",
    "photoUrls",
    "propertyPhotos",
    "mediaItems",
    "pictures",
  ];
  for (const key of keysToTry) {
    const val = p[key];
    if (!Array.isArray(val)) continue;
    for (const item of val) {
      push(getUrlFromItem(item));
    }
  }

  for (const val of Object.values(p)) {
    if (!Array.isArray(val)) continue;
    for (const item of val) {
      push(getUrlFromItem(item));
    }
  }

  return ordered;
}

function codeToAmenityLabel(code: string): string {
  const c = code.trim().toUpperCase();
  const direct: Record<string, string> = {
    HAS_INTERNET_WIFI: "WiFi",
    HAS_AIR_CONDITIONING: "Air Conditioning",
    HAS_KITCHEN: "Kitchen",
    HAS_KITCHENETTE: "Kitchenette",
    HAS_POOL: "Pool",
    HAS_FREE_PARKING: "Free Parking",
    HAS_PARKING: "Parking",
    HAS_BEACH_ACCESS: "Beach Access",
    IS_DOWNTOWN: "Downtown",
    HAS_HOT_WATER: "Hot Water",
    HAS_TOWELS: "Towels",
    HAS_COOKING_BASICS: "Cooking Basics",
    HAS_POTS_PANS: "Pots and Pans",
    HAS_DESK: "Desk",
    HAS_LOCK_ON_BEDROOM: "Lock on Bedroom Door",
    HAS_TV: "TV",
    HAS_SMART_TV: "Smart TV",
    HAS_CABLE_TV: "Cable TV",
    HAS_HEATING: "Heating",
    HAS_WASHER: "Washer",
    HAS_DRYER: "Dryer",
    HAS_HAIR_DRYER: "Hair Dryer",
    HAS_REFRIGERATOR: "Refrigerator",
    HAS_MICROWAVE: "Microwave",
    HAS_COFFEE_MAKER: "Coffee Maker",
    HAS_BBQ_GRILL: "BBQ Grill",
    HAS_PATIO_BALCONY: "Patio / Balcony",
    HAS_PRIVATE_ENTRANCE: "Private Entrance",
    HAS_SMOKE_DETECTOR: "Smoke Detector",
    HAS_CARBON_MONOXIDE_DETECTOR: "Carbon Monoxide Detector",
    HAS_FIRST_AID_KIT: "First Aid Kit",
    HAS_FIRE_EXTINGUISHER: "Fire Extinguisher",
    ALLOWS_PETS: "Pets Allowed",
    ALLOWS_SMOKING: "Smoking Allowed",
    ALLOWS_EVENTS: "Events Allowed",
  };
  if (direct[c]) return direct[c];

  return c
    .replace(/^(HAS_|IS_|CAN_|ALLOWS_)/, "")
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/** Amenidades como strings o como objetos { name, label, ... } (API Hostfully). */
function extractAmenities(h: HostfullyRaw): string[] {
  const raw =
    h.amenities ??
    h.amenityList ??
    h.features ??
    h.amenityIds ??
    h.propertyAmenities;
  if (!Array.isArray(raw)) return [];

  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) {
      out.push(x.trim());
      continue;
    }
    if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      const label =
        o.name ??
        o.label ??
        o.title ??
        o.amenityName ??
        (typeof o.amenity === "string" ? codeToAmenityLabel(o.amenity) : undefined) ??
        o.description ??
        o.text;
      if (typeof label === "string" && label.trim()) out.push(label.trim());
    }
  }
  return Array.from(new Set(out));
}

/** Si en Firestore hay texto con contenido, se respeta; `""` no cuenta y se usa Hostfully. */
function coalesceText(existing: unknown, incoming: string | undefined): string | undefined {
  if (typeof existing === "string" && existing.trim()) return existing.trim();
  return incoming;
}

function pickDescriptionByLocale(
  descriptions: Array<Record<string, unknown>>
): Record<string, unknown> {
  const preferredLocale = (process.env.HOSTFULLY_DESCRIPTION_LOCALE || "en").toLowerCase();
  const preferred = descriptions.find(
    (d) => typeof d.locale === "string" && d.locale.toLowerCase() === preferredLocale
  );
  return preferred ?? descriptions[0] ?? {};
}

function findDescriptionLocale(
  descriptions: Array<Record<string, unknown>>,
  localePrefix: "es" | "en"
): Record<string, unknown> | undefined {
  return descriptions.find(
    (d) => typeof d.locale === "string" && d.locale.toLowerCase().startsWith(localePrefix)
  );
}

function firstNumeric(...vals: unknown[]): number | undefined {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function mapHostfullyToProperty(h: HostfullyRaw): Omit<Property, "id" | "createdAt" | "updatedAt"> {
  const name = extractDisplayName(h);
  const addr = h.address;
  const location = extractLocation(addr) || (name as string);
  const avail = (h.availability ?? {}) as Record<string, unknown>;
  const pricing = (h.pricing ?? {}) as Record<string, unknown>;
  const maxGuests = Number(avail.maxGuests ?? avail.baseGuests ?? h.maxGuests ?? 4) || 4;
  const dailyRate = Number(pricing.dailyRate ?? pricing.rate ?? h.pricePerNight ?? 0) || 0;

  const includedRaw = firstNumeric(
    pricing.includedGuests,
    pricing.baseGuests,
    pricing.baseOccupancy,
    avail.includedGuests,
    h.includedGuests,
    h.baseGuests
  );
  const includedGuests =
    includedRaw !== undefined && includedRaw >= 1 ? Math.floor(includedRaw) : 2;

  const extraFeeRaw = firstNumeric(
    pricing.extraGuestFeePerNight,
    pricing.extraGuestFee,
    pricing.additionalGuestFeePerNight,
    pricing.extraPersonFeePerNight,
    pricing.extraPersonFee,
    h.extraGuestFeePerNight
  );
  const extraGuestFeePerNight =
    extraFeeRaw !== undefined && extraFeeRaw >= 0 ? extraFeeRaw : 10;

  // Descripción: priorizar campos largos/públicos si existen
  const descriptionCandidate =
    (typeof h.longDescription === "string" && h.longDescription.trim()) ? h.longDescription :
    (typeof h.fullDescription === "string" && h.fullDescription.trim()) ? h.fullDescription :
    (typeof h.description === "string" && h.description.trim()) ? h.description :
    (typeof h.summary === "string" && h.summary.trim()) ? h.summary :
    (typeof (h as HostfullyRaw).overview === "string" && (h as HostfullyRaw).overview!.toString().trim()) ? (h as HostfullyRaw).overview :
    undefined;
  const description = (descriptionCandidate ?? `${name}. Ubicada en ${location}.`) as string;

  // Campos de texto adicionales estilo Hostfully
  const shortDescription =
    typeof (h as HostfullyRaw).shortDescription === "string" && (h as HostfullyRaw).shortDescription!.toString().trim()
      ? (h as HostfullyRaw).shortDescription!.toString()
      : (typeof h.summary === "string" ? h.summary : undefined);
  const longDescription =
    typeof (h as HostfullyRaw).longDescription === "string" && (h as HostfullyRaw).longDescription!.toString().trim()
      ? (h as HostfullyRaw).longDescription!.toString()
      : (typeof descriptionCandidate === "string" ? descriptionCandidate : undefined);
  const notes =
    typeof (h as HostfullyRaw).notes === "string" && (h as HostfullyRaw).notes!.toString().trim()
      ? (h as HostfullyRaw).notes!.toString()
      : typeof (h as HostfullyRaw).bookingNotes === "string" && (h as HostfullyRaw).bookingNotes!.toString().trim()
        ? (h as HostfullyRaw).bookingNotes!.toString()
        : typeof (h as HostfullyRaw).extraNotes === "string" && (h as HostfullyRaw).extraNotes!.toString().trim()
          ? (h as HostfullyRaw).extraNotes!.toString()
          : undefined;
  const images = extractImages(h);
  if (images.length === 0 && process.env.NODE_ENV === "development") {
    const imgKeys = ["photos", "media", "mediaLinks", "images", "photoUrls", "propertyPhotos"].filter(
      (k) => h[k] !== undefined
    );
    if (imgKeys.length > 0) {
      console.log(`[syncHostfully] Propiedad "${name}" tiene claves de imagen (${imgKeys.join(", ")}) pero no se extrajeron URLs.`);
    }
  }
  const uid = (h.uid ?? h.id) as string;

  const slug = slugify(name);
  const amenities = extractAmenities(h);
  const bedrooms = typeof h.bedrooms === "number" ? h.bedrooms : undefined;
  const bathrooms = typeof h.bathrooms === "number" ? h.bathrooms : undefined;
  const summary = typeof h.summary === "string" ? h.summary : undefined;
  const interaction = typeof h.interaction === "string" ? h.interaction : undefined;
  const neighborhood = typeof h.neighborhood === "string" ? h.neighborhood : undefined;
  const access = typeof (h as HostfullyRaw).access === "string" ? (h as HostfullyRaw).access!.toString() : undefined;
  const space = typeof (h as HostfullyRaw).space === "string" ? (h as HostfullyRaw).space!.toString() : undefined;
  const transit = typeof (h as HostfullyRaw).transit === "string" ? (h as HostfullyRaw).transit!.toString() : undefined;
  const houseManual =
    typeof (h as HostfullyRaw).houseManual === "string"
      ? (h as HostfullyRaw).houseManual!.toString()
      : typeof (h as HostfullyRaw).houseManualNotes === "string"
        ? (h as HostfullyRaw).houseManualNotes!.toString()
        : undefined;
  const addressObj = (h.address && typeof h.address === "object")
    ? (h.address as Record<string, unknown>)
    : undefined;
  const latRaw = h.latitude ?? h.lat ?? addressObj?.latitude ?? addressObj?.lat;
  const lngRaw =
    h.longitude ?? h.lng ?? h.lon ?? addressObj?.longitude ?? addressObj?.lng ?? addressObj?.lon;
  const toFiniteNumber = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };
  const latitude = toFiniteNumber(latRaw);
  const longitude = toFiniteNumber(lngRaw);
  const propertyType =
    typeof (h as HostfullyRaw).propertyType === "string"
      ? (h as HostfullyRaw).propertyType!.toString()
      : typeof (h as HostfullyRaw).type === "string"
        ? (h as HostfullyRaw).type!.toString()
        : undefined;
  const roomType =
    typeof (h as HostfullyRaw).roomType === "string"
      ? (h as HostfullyRaw).roomType!.toString()
      : undefined;
  const cancellationPolicy =
    typeof (h as HostfullyRaw).cancellationPolicy === "string"
      ? (h as HostfullyRaw).cancellationPolicy!.toString()
      : typeof (h as HostfullyRaw).bookingPolicy === "string"
        ? (h as HostfullyRaw).bookingPolicy!.toString()
        : undefined;
  const checkInTime =
    typeof (h as HostfullyRaw).checkInTime === "string"
      ? (h as HostfullyRaw).checkInTime!.toString()
      : undefined;
  const checkOutTime =
    typeof (h as HostfullyRaw).checkOutTime === "string"
      ? (h as HostfullyRaw).checkOutTime!.toString()
      : undefined;
  const houseRules =
    typeof (h as HostfullyRaw).houseRules === "string"
      ? (h as HostfullyRaw).houseRules!.toString()
      : undefined;
  let reviews: Property["reviews"];
  if (Array.isArray(h.reviews)) {
    reviews = h.reviews.map((r: unknown) => {
      const o = r && typeof r === "object" ? (r as Record<string, unknown>) : {};
      return {
        author: typeof o.author === "string" ? o.author : undefined,
        text: typeof o.text === "string" ? o.text : typeof o.comment === "string" ? o.comment : undefined,
        rating: typeof o.rating === "number" ? o.rating : undefined,
        date: typeof o.date === "string" ? o.date : undefined,
      };
    });
  }

  return {
    title: name,
    description,
    descriptionEs: typeof (h as HostfullyRaw).descriptionEs === "string" ? (h as HostfullyRaw).descriptionEs as string : undefined,
    descriptionEn: typeof (h as HostfullyRaw).descriptionEn === "string" ? (h as HostfullyRaw).descriptionEn as string : undefined,
    location,
    maxGuests,
    includedGuests,
    extraGuestFeePerNight,
    amenities,
    images: images.length > 0 ? images : ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"],
    pricePerNight: dailyRate,
    availability: {},
    slug,
    featured: false,
    hostfullyPropertyId: uid,
    bedrooms,
    bathrooms,
    summary,
    summaryEs: typeof (h as HostfullyRaw).summaryEs === "string" ? (h as HostfullyRaw).summaryEs as string : undefined,
    summaryEn: typeof (h as HostfullyRaw).summaryEn === "string" ? (h as HostfullyRaw).summaryEn as string : undefined,
    shortDescription,
    shortDescriptionEs: typeof (h as HostfullyRaw).shortDescriptionEs === "string" ? (h as HostfullyRaw).shortDescriptionEs as string : undefined,
    shortDescriptionEn: typeof (h as HostfullyRaw).shortDescriptionEn === "string" ? (h as HostfullyRaw).shortDescriptionEn as string : undefined,
    longDescription,
    longDescriptionEs: typeof (h as HostfullyRaw).longDescriptionEs === "string" ? (h as HostfullyRaw).longDescriptionEs as string : undefined,
    longDescriptionEn: typeof (h as HostfullyRaw).longDescriptionEn === "string" ? (h as HostfullyRaw).longDescriptionEn as string : undefined,
    notes,
    notesEs: typeof (h as HostfullyRaw).notesEs === "string" ? (h as HostfullyRaw).notesEs as string : undefined,
    notesEn: typeof (h as HostfullyRaw).notesEn === "string" ? (h as HostfullyRaw).notesEn as string : undefined,
    interaction,
    interactionEs: typeof (h as HostfullyRaw).interactionEs === "string" ? (h as HostfullyRaw).interactionEs as string : undefined,
    interactionEn: typeof (h as HostfullyRaw).interactionEn === "string" ? (h as HostfullyRaw).interactionEn as string : undefined,
    neighborhood,
    neighborhoodEs: typeof (h as HostfullyRaw).neighborhoodEs === "string" ? (h as HostfullyRaw).neighborhoodEs as string : undefined,
    neighborhoodEn: typeof (h as HostfullyRaw).neighborhoodEn === "string" ? (h as HostfullyRaw).neighborhoodEn as string : undefined,
    access,
    accessEs: typeof (h as HostfullyRaw).accessEs === "string" ? (h as HostfullyRaw).accessEs as string : undefined,
    accessEn: typeof (h as HostfullyRaw).accessEn === "string" ? (h as HostfullyRaw).accessEn as string : undefined,
    space,
    spaceEs: typeof (h as HostfullyRaw).spaceEs === "string" ? (h as HostfullyRaw).spaceEs as string : undefined,
    spaceEn: typeof (h as HostfullyRaw).spaceEn === "string" ? (h as HostfullyRaw).spaceEn as string : undefined,
    transit,
    transitEs: typeof (h as HostfullyRaw).transitEs === "string" ? (h as HostfullyRaw).transitEs as string : undefined,
    transitEn: typeof (h as HostfullyRaw).transitEn === "string" ? (h as HostfullyRaw).transitEn as string : undefined,
    houseManual,
    houseManualEs: typeof (h as HostfullyRaw).houseManualEs === "string" ? (h as HostfullyRaw).houseManualEs as string : undefined,
    houseManualEn: typeof (h as HostfullyRaw).houseManualEn === "string" ? (h as HostfullyRaw).houseManualEn as string : undefined,
    latitude,
    longitude,
    reviews,
    propertyType,
    roomType,
    cancellationPolicy,
    checkInTime,
    checkOutTime,
    houseRules,
  };
}

export async function syncHostfullyProperties(): Promise<{
  success: boolean;
  created: number;
  updated: number;
  error?: string;
}> {
  try {
    const hostfullyProps = await listProperties();
    console.log("[syncHostfully] Propiedades recibidas de Hostfully:", hostfullyProps.length);
    if (hostfullyProps.length === 0) {
      return { success: true, created: 0, updated: 0 };
    }

    let created = 0;
    let updated = 0;
    const now = new Date();

    for (let index = 0; index < hostfullyProps.length; index++) {
      const hp = hostfullyProps[index];
      const base = hp as unknown as HostfullyRaw;
      const uid = (base.uid ?? base.id) as string;
      if (!uid) continue;
      const shouldDebugThisProperty =
        process.env.NODE_ENV === "development" &&
        uid === HOSTFULLY_DEBUG_PROPERTY_UID;

      if (shouldDebugThisProperty) {
        console.log(`[syncHostfully][debug:${uid}] base payload:`);
        console.log(JSON.stringify(base, null, 2));
      }

      // Enriquecer con detalles completos de la propiedad (Access, Space, etc.) si la API los expone
      let raw: HostfullyRaw = base;
      try {
        const details = await getPropertyDetails(uid);
        if (shouldDebugThisProperty) {
          console.log(`[syncHostfully][debug:${uid}] details payload:`);
          console.log(JSON.stringify(details, null, 2));
        }
        if (details && typeof details === "object") {
          // La API v3 devuelve un objeto { property: { ...datos } }, usamos el hijo si existe
          const inner =
            (details as HostfullyRaw).property &&
            typeof (details as HostfullyRaw).property === "object"
              ? ((details as HostfullyRaw).property as HostfullyRaw)
              : (details as HostfullyRaw);
          // El listado suele traer menos campos que GET /properties/:uid (p. ej. publicName).
          // Los detalles deben ganar para no perder nombre público ni metadata.
          raw = { ...base, ...inner } as HostfullyRaw;
          if (shouldDebugThisProperty) {
            console.log(`[syncHostfully][debug:${uid}] merged raw payload (inner + base):`);
            console.log(JSON.stringify(raw, null, 2));
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[syncHostfully] No se pudieron obtener detalles para UID", uid, e);
        }
      }

      // Enriquecer con endpoints especializados (v3.2): descriptions/photos/amenities.
      try {
        const [descriptions, photos, amenities] = await Promise.all([
          getPropertyDescriptions(uid).catch(() => []),
          getPropertyPhotos(uid).catch(() => []),
          getPropertyAmenities(uid).catch(() => []),
        ]);

        if (descriptions.length > 0) {
          const primary = pickDescriptionByLocale(descriptions);
          const esDesc = findDescriptionLocale(descriptions, "es");
          const enDesc = findDescriptionLocale(descriptions, "en");
          raw = {
            ...raw,
            propertyDescriptions: descriptions,
            shortDescription:
              (typeof primary.shortSummary === "string" && primary.shortSummary.trim())
                ? primary.shortSummary
                : raw.shortDescription,
            longDescription:
              (typeof primary.summary === "string" && primary.summary.trim())
                ? primary.summary
                : raw.longDescription,
            description:
              (typeof primary.summary === "string" && primary.summary.trim())
                ? primary.summary
                : raw.description,
            summary:
              (typeof primary.shortSummary === "string" && primary.shortSummary.trim())
                ? primary.shortSummary
                : raw.summary,
            notes:
              (typeof primary.notes === "string" && primary.notes.trim())
                ? primary.notes
                : raw.notes,
            access:
              (typeof primary.access === "string" && primary.access.trim())
                ? primary.access
                : raw.access,
            transit:
              (typeof primary.transit === "string" && primary.transit.trim())
                ? primary.transit
                : raw.transit,
            interaction:
              (typeof primary.interaction === "string" && primary.interaction.trim())
                ? primary.interaction
                : raw.interaction,
            neighborhood:
              (typeof primary.neighbourhood === "string" && primary.neighbourhood.trim())
                ? primary.neighbourhood
                : (typeof primary.neighborhood === "string" && primary.neighborhood.trim())
                  ? primary.neighborhood
                  : raw.neighborhood,
            space:
              (typeof primary.space === "string" && primary.space.trim())
                ? primary.space
                : raw.space,
            houseManual:
              (typeof primary.houseManual === "string" && primary.houseManual.trim())
                ? primary.houseManual
                : raw.houseManual,
            descriptionEs:
              (typeof esDesc?.summary === "string" && esDesc.summary.trim())
                ? esDesc.summary
                : raw.descriptionEs,
            descriptionEn:
              (typeof enDesc?.summary === "string" && enDesc.summary.trim())
                ? enDesc.summary
                : raw.descriptionEn,
            summaryEs:
              (typeof esDesc?.shortSummary === "string" && esDesc.shortSummary.trim())
                ? esDesc.shortSummary
                : raw.summaryEs,
            summaryEn:
              (typeof enDesc?.shortSummary === "string" && enDesc.shortSummary.trim())
                ? enDesc.shortSummary
                : raw.summaryEn,
            shortDescriptionEs:
              (typeof esDesc?.shortSummary === "string" && esDesc.shortSummary.trim())
                ? esDesc.shortSummary
                : raw.shortDescriptionEs,
            shortDescriptionEn:
              (typeof enDesc?.shortSummary === "string" && enDesc.shortSummary.trim())
                ? enDesc.shortSummary
                : raw.shortDescriptionEn,
            longDescriptionEs:
              (typeof esDesc?.summary === "string" && esDesc.summary.trim())
                ? esDesc.summary
                : raw.longDescriptionEs,
            longDescriptionEn:
              (typeof enDesc?.summary === "string" && enDesc.summary.trim())
                ? enDesc.summary
                : raw.longDescriptionEn,
            notesEs:
              (typeof esDesc?.notes === "string" && esDesc.notes.trim())
                ? esDesc.notes
                : raw.notesEs,
            notesEn:
              (typeof enDesc?.notes === "string" && enDesc.notes.trim())
                ? enDesc.notes
                : raw.notesEn,
            accessEs:
              (typeof esDesc?.access === "string" && esDesc.access.trim())
                ? esDesc.access
                : raw.accessEs,
            accessEn:
              (typeof enDesc?.access === "string" && enDesc.access.trim())
                ? enDesc.access
                : raw.accessEn,
            transitEs:
              (typeof esDesc?.transit === "string" && esDesc.transit.trim())
                ? esDesc.transit
                : raw.transitEs,
            transitEn:
              (typeof enDesc?.transit === "string" && enDesc.transit.trim())
                ? enDesc.transit
                : raw.transitEn,
            interactionEs:
              (typeof esDesc?.interaction === "string" && esDesc.interaction.trim())
                ? esDesc.interaction
                : raw.interactionEs,
            interactionEn:
              (typeof enDesc?.interaction === "string" && enDesc.interaction.trim())
                ? enDesc.interaction
                : raw.interactionEn,
            neighborhoodEs:
              (typeof esDesc?.neighbourhood === "string" && esDesc.neighbourhood.trim())
                ? esDesc.neighbourhood
                : (typeof esDesc?.neighborhood === "string" && esDesc.neighborhood.trim())
                  ? esDesc.neighborhood
                  : raw.neighborhoodEs,
            neighborhoodEn:
              (typeof enDesc?.neighbourhood === "string" && enDesc.neighbourhood.trim())
                ? enDesc.neighbourhood
                : (typeof enDesc?.neighborhood === "string" && enDesc.neighborhood.trim())
                  ? enDesc.neighborhood
                  : raw.neighborhoodEn,
            spaceEs:
              (typeof esDesc?.space === "string" && esDesc.space.trim())
                ? esDesc.space
                : raw.spaceEs,
            spaceEn:
              (typeof enDesc?.space === "string" && enDesc.space.trim())
                ? enDesc.space
                : raw.spaceEn,
            houseManualEs:
              (typeof esDesc?.houseManual === "string" && esDesc.houseManual.trim())
                ? esDesc.houseManual
                : raw.houseManualEs,
            houseManualEn:
              (typeof enDesc?.houseManual === "string" && enDesc.houseManual.trim())
                ? enDesc.houseManual
                : raw.houseManualEn,
          };
        }

        if (photos.length > 0) {
          raw = {
            ...raw,
            photos,
            images: photos.map((p) =>
              (typeof p.originalImageUrl === "string" && p.originalImageUrl) ||
              (typeof p.largeScaleImageUrl === "string" && p.largeScaleImageUrl) ||
              (typeof p.mediumScaleImageUrl === "string" && p.mediumScaleImageUrl) ||
              (typeof p.largeThumbnailScaleImageUrl === "string" && p.largeThumbnailScaleImageUrl) ||
              (typeof p.mediumThumbnailScaleImageUrl === "string" && p.mediumThumbnailScaleImageUrl) ||
              ""
            ).filter((u) => typeof u === "string" && u.startsWith("http")),
          };
        }

        if (amenities.length > 0) {
          raw = {
            ...raw,
            amenities: amenities
              .map((a) =>
                (typeof a.name === "string" && a.name) ||
                (typeof a.label === "string" && a.label) ||
                (typeof a.amenity === "string" && codeToAmenityLabel(a.amenity)) ||
                (typeof a.amenityName === "string" && a.amenityName) ||
                (typeof a.description === "string" && a.description) ||
                ""
              )
              .filter((v) => typeof v === "string" && v.trim().length > 0),
            amenitiesRaw: amenities,
          };
        }

        if (shouldDebugThisProperty) {
          console.log(`[syncHostfully][debug:${uid}] enriched payload (details + descriptions + photos + amenities):`);
          console.log(JSON.stringify(raw, null, 2));
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[syncHostfully] No se pudo enriquecer metadata extendida para UID", uid, e);
        }
      }

      const propData = mapHostfullyToProperty(raw);

      await adminDb.runTransaction(async (transaction) => {
        const q = adminDb
          .collection("properties")
          .where("hostfullyPropertyId", "==", uid)
          .limit(1);
        const snapshot = await transaction.get(q);

        if (snapshot.empty) {
          // Propiedad nueva: usamos directamente los datos provenientes de Hostfully
          const dataToSaveNew = {
            ...propData,
            hostfullyPropertyId: uid,
            updatedAt: now,
          };
          const cleanDataToSaveNew = Object.fromEntries(
            Object.entries(dataToSaveNew).filter(([, value]) => value !== undefined)
          ) as typeof dataToSaveNew;

          const ref = adminDb.collection("properties").doc();
          transaction.set(ref, { ...cleanDataToSaveNew, createdAt: now });
          created++;
        } else {
          // Propiedad existente: respetamos texto editado en admin (fallback-only)
          const existing = snapshot.docs[0].data() as Partial<Property>;

          const mergedText = {
            // Título = nombre público Hostfully (publicName); se actualiza en cada sync.
            title: propData.title,
            description: coalesceText(existing.description, propData.description) ?? propData.description,
            shortDescription: coalesceText(existing.shortDescription, propData.shortDescription),
            longDescription: coalesceText(existing.longDescription, propData.longDescription),
            summary: coalesceText(existing.summary, propData.summary),
            summaryEs: coalesceText(existing.summaryEs, propData.summaryEs),
            summaryEn: coalesceText(existing.summaryEn, propData.summaryEn),
            notes: coalesceText(existing.notes, propData.notes),
            notesEs: coalesceText(existing.notesEs, propData.notesEs),
            notesEn: coalesceText(existing.notesEn, propData.notesEn),
            interaction: coalesceText(existing.interaction, propData.interaction),
            interactionEs: coalesceText(existing.interactionEs, propData.interactionEs),
            interactionEn: coalesceText(existing.interactionEn, propData.interactionEn),
            neighborhood: coalesceText(existing.neighborhood, propData.neighborhood),
            neighborhoodEs: coalesceText(existing.neighborhoodEs, propData.neighborhoodEs),
            neighborhoodEn: coalesceText(existing.neighborhoodEn, propData.neighborhoodEn),
            access: coalesceText(existing.access, propData.access),
            accessEs: coalesceText(existing.accessEs, propData.accessEs),
            accessEn: coalesceText(existing.accessEn, propData.accessEn),
            space: coalesceText(existing.space, propData.space),
            spaceEs: coalesceText(existing.spaceEs, propData.spaceEs),
            spaceEn: coalesceText(existing.spaceEn, propData.spaceEn),
            transit: coalesceText(existing.transit, propData.transit),
            transitEs: coalesceText(existing.transitEs, propData.transitEs),
            transitEn: coalesceText(existing.transitEn, propData.transitEn),
            houseManual: coalesceText(existing.houseManual, propData.houseManual),
            houseManualEs: coalesceText(existing.houseManualEs, propData.houseManualEs),
            houseManualEn: coalesceText(existing.houseManualEn, propData.houseManualEn),
            descriptionEs: coalesceText(existing.descriptionEs, propData.descriptionEs),
            descriptionEn: coalesceText(existing.descriptionEn, propData.descriptionEn),
            shortDescriptionEs: coalesceText(existing.shortDescriptionEs, propData.shortDescriptionEs),
            shortDescriptionEn: coalesceText(existing.shortDescriptionEn, propData.shortDescriptionEn),
            longDescriptionEs: coalesceText(existing.longDescriptionEs, propData.longDescriptionEs),
            longDescriptionEn: coalesceText(existing.longDescriptionEn, propData.longDescriptionEn),
            amenities: Array.from(
              new Set([
                ...(Array.isArray(propData.amenities) ? propData.amenities : []),
                ...(Array.isArray(existing.amenities)
                  ? existing.amenities.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
                  : []),
              ])
            ),
          };

          const dataToSaveExisting = {
            ...propData,
            ...mergedText,
            hostfullyPropertyId: uid,
            updatedAt: now,
          };

          const cleanDataToSaveExisting = Object.fromEntries(
            Object.entries(dataToSaveExisting).filter(([, value]) => value !== undefined)
          ) as typeof dataToSaveExisting;

          // Detectar si realmente hay cambios (ignorando createdAt/updatedAt) para no contar todo como "actualizado"
          const existingData = snapshot.docs[0].data() as Record<string, unknown>;
          const hasRealChanges = Object.entries(cleanDataToSaveExisting).some(([key, value]) => {
            if (key === "updatedAt" || key === "createdAt") return false;
            const prev = existingData[key];
            const normalize = (v: unknown) => {
              // Firestore Timestamp → Date
              if (v && typeof v === "object" && "toDate" in (v as any) && typeof (v as any).toDate === "function") {
                return (v as any).toDate();
              }
              return v;
            };
            const prevNorm = normalize(prev);
            const valueNorm = normalize(value);
            return JSON.stringify(prevNorm) !== JSON.stringify(valueNorm);
          });

          if (hasRealChanges) {
            transaction.update(snapshot.docs[0].ref, cleanDataToSaveExisting);
            updated++;
          }
        }
      });
    }

    revalidatePath("/admin/properties");
    revalidatePath("/admin/properties/sync-hostfully");
    return { success: true, created, updated };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return { success: false, created: 0, updated: 0, error: msg };
  }
}
