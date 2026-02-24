"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { listProperties } from "@/lib/hostfully/client";
import { Property } from "@/lib/types";

type HostfullyRaw = Record<string, unknown>;

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

/** Prefiere nombre público o de canal (ej. Airbnb) si existe en la respuesta Hostfully. */
function extractDisplayName(h: HostfullyRaw): string {
  const fallback = (h.name ?? h.title ?? "Propiedad sin nombre") as string;
  const publicName = h.publicName ?? h.listingName ?? h.public_name ?? h.listing_name;
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

function extractImages(p: HostfullyRaw): string[] {
  // Hostfully usa pictureLink (una sola URL) para la imagen principal
  const pictureLink = p.pictureLink;
  if (typeof pictureLink === "string" && pictureLink.startsWith("http")) {
    return [pictureLink];
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
    if (Array.isArray(val)) {
      const urls = val.map(getUrlFromItem).filter((u): u is string => !!u);
      if (urls.length > 0) return urls;
    }
  }
  return [];
}

function mapHostfullyToProperty(h: HostfullyRaw): Omit<Property, "id" | "createdAt" | "updatedAt"> {
  const name = extractDisplayName(h);
  const addr = h.address;
  const location = extractLocation(addr) || (name as string);
  const avail = (h.availability ?? {}) as Record<string, unknown>;
  const pricing = (h.pricing ?? {}) as Record<string, unknown>;
  const maxGuests = Number(avail.maxGuests ?? avail.baseGuests ?? h.maxGuests ?? 4) || 4;
  const dailyRate = Number(pricing.dailyRate ?? pricing.rate ?? h.pricePerNight ?? 0) || 0;
  const description = (h.description ?? h.summary ?? `${name}. Ubicada en ${location}.`) as string;
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
  const amenities: string[] = Array.isArray(h.amenities)
    ? h.amenities.filter((x): x is string => typeof x === "string")
    : [];
  const bedrooms = typeof h.bedrooms === "number" ? h.bedrooms : undefined;
  const bathrooms = typeof h.bathrooms === "number" ? h.bathrooms : undefined;
  const summary = typeof h.summary === "string" ? h.summary : undefined;
  const interaction = typeof h.interaction === "string" ? h.interaction : undefined;
  const neighborhood = typeof h.neighborhood === "string" ? h.neighborhood : undefined;
  const lat = h.latitude ?? h.lat;
  const lng = h.longitude ?? h.lng ?? h.lon;
  const latitude = typeof lat === "number" ? lat : undefined;
  const longitude = typeof lng === "number" ? lng : undefined;
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
    location,
    maxGuests,
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
    interaction,
    neighborhood,
    latitude,
    longitude,
    reviews,
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

    for (const hp of hostfullyProps) {
      const raw = hp as unknown as HostfullyRaw;
      const uid = (raw.uid ?? raw.id) as string;
      if (!uid) continue;

      const propData = mapHostfullyToProperty(raw);

      const dataToSave = {
        ...propData,
        hostfullyPropertyId: uid,
        updatedAt: now,
      };

      await adminDb.runTransaction(async (transaction) => {
        const q = adminDb
          .collection("properties")
          .where("hostfullyPropertyId", "==", uid)
          .limit(1);
        const snapshot = await transaction.get(q);

        if (snapshot.empty) {
          const ref = adminDb.collection("properties").doc();
          transaction.set(ref, { ...dataToSave, createdAt: now });
          created++;
        } else {
          transaction.update(snapshot.docs[0].ref, dataToSave);
          updated++;
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
