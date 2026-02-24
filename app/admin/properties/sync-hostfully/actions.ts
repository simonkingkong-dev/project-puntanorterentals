"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { listProperties, getPropertyDetails } from "@/lib/hostfully/client";
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

  // Fallback genérico: buscar arrays en cualquier propiedad que contengan URLs
  for (const val of Object.values(p)) {
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
  const amenities: string[] = Array.isArray(h.amenities)
    ? h.amenities.filter((x): x is string => typeof x === "string")
    : [];
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
    shortDescription,
    longDescription,
    notes,
    interaction,
    neighborhood,
    access,
    space,
    transit,
    houseManual,
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

    for (let index = 0; index < hostfullyProps.length; index++) {
      const hp = hostfullyProps[index];
      const base = hp as unknown as HostfullyRaw;
      const uid = (base.uid ?? base.id) as string;
      if (!uid) continue;

      // Enriquecer con detalles completos de la propiedad (Access, Space, etc.) si la API los expone
      let raw: HostfullyRaw = base;
      try {
        const details = await getPropertyDetails(uid);
        if (details && typeof details === "object") {
          // La API v3 devuelve un objeto { property: { ...datos } }, usamos el hijo si existe
          const inner =
            (details as HostfullyRaw).property &&
            typeof (details as HostfullyRaw).property === "object"
              ? ((details as HostfullyRaw).property as HostfullyRaw)
              : (details as HostfullyRaw);
          raw = { ...inner, ...base } as HostfullyRaw;
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[syncHostfully] No se pudieron obtener detalles para UID", uid, e);
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
            shortDescription: existing.shortDescription ?? propData.shortDescription,
            longDescription: existing.longDescription ?? propData.longDescription,
            notes: existing.notes ?? propData.notes,
            interaction: existing.interaction ?? propData.interaction,
            neighborhood: existing.neighborhood ?? propData.neighborhood,
            access: existing.access ?? propData.access,
            space: existing.space ?? propData.space,
            transit: existing.transit ?? propData.transit,
            houseManual: existing.houseManual ?? propData.houseManual,
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
