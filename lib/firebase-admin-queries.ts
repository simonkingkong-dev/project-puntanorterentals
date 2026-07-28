import "server-only";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
  Property,
  PropertyReview,
  PropertyReviewPlatformStat,
  Reservation,
  Service,
  GlobalAmenity,
  Testimonial,
  ContactInfo,
  SearchParams,
  SiteContent,
  RevyoosReview,
} from "@/lib/types";
import { toPropertyListItems, type PropertyListItem } from "@/lib/property-list-item";
import { normalizeBeds } from "@/lib/property-beds";
import {
  isMissingFirestoreIndexError,
  sortByCreatedAtDesc,
  sortBySortOrder,
} from "@/lib/firestore-query-utils";
import { ensureAllPropertiesAvailabilityFresh } from "@/lib/hostfully-availability-sync";
import { isBlockedInGroup } from "@/lib/property-hierarchy";
import {
  BUSINESS_REVIEW_PLATFORM_STATS_DOC,
  businessStatToPlatformStat,
  mergePropertyAndBusinessPlatformStats,
  type BusinessReviewPlatformStatsDoc,
  type GlobalReviewAggregateOverride,
} from "@/lib/business-review-platform-stats";

/** Converts Firestore Timestamp, Date, or ISO string to Date. Returns epoch for missing/invalid to avoid Invalid Date. */
function safeTimestampToDate(value: unknown): Date {
  if (value == null) return new Date(0);
  const v = value as { toDate?: () => Date };
  if (typeof v.toDate === "function") return v.toDate();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date(0) : d;
  }
  return new Date(0);
}

/** Normaliza documento Firestore → Property (serializable hacia Client Components). */
function mapPropertyFromFirestore(id: string, data: Record<string, unknown>): Property {
  const beds = normalizeBeds(data.beds ?? data.bedTypes);
  const { beds: _rawBeds, bedTypes: _rawBedTypes, ...rest } = data;
  return {
    ...rest,
    id,
    ...(beds ? { beds } : {}),
    createdAt: safeTimestampToDate(data.createdAt),
    updatedAt: safeTimestampToDate(data.updatedAt),
    availabilitySyncedAt:
      data.availabilitySyncedAt != null
        ? safeTimestampToDate(data.availabilitySyncedAt)
        : undefined,
    pricesSyncedAt:
      data.pricesSyncedAt != null ? safeTimestampToDate(data.pricesSyncedAt) : undefined,
  } as Property;
}

// --- PROPIEDADES ---
export const getPropertyByIdAdmin = async (propertyId: string): Promise<Property | null> => {
  try {
    const snap = await adminDb.collection('properties').doc(propertyId).get();
    if (!snap.exists) return null;
    return mapPropertyFromFirestore(snap.id, snap.data()!);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching property by ID', error);
    return null;
  }
};

export const getAdminProperties = async (): Promise<Property[]> => {
  try {
    const snapshot = await adminDb.collection('properties').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => mapPropertyFromFirestore(doc.id, doc.data()));
  } catch (error) {
    console.error('Admin: Error fetching properties', error);
    return [];
  }
};

/** Obtiene propiedad por slug (para página pública de detalle, usa Admin SDK en servidor). */
export const getPropertyBySlugAdmin = async (slug: string): Promise<Property | null> => {
  try {
    const snapshot = await adminDb.collection('properties').where('slug', '==', slug).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return mapPropertyFromFirestore(doc.id, doc.data());
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching property by slug', error);
    return null;
  }
};

export const getAdminPropertiesForList = async (): Promise<PropertyListItem[]> => {
  const properties = await getAdminProperties();
  return toPropertyListItems(properties);
};

export const getFeaturedPropertiesForList = async (): Promise<PropertyListItem[]> => {
  const properties = await getFeaturedPropertiesAdmin();
  return toPropertyListItems(properties);
};

/** Propiedades destacadas (para homepage pública, usa Admin SDK en servidor). */
export const getFeaturedPropertiesAdmin = async (): Promise<Property[]> => {
  try {
    const snapshot = await adminDb
      .collection('properties')
      .where('featured', '==', true)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => mapPropertyFromFirestore(doc.id, doc.data()));
  } catch (error) {
    if (isMissingFirestoreIndexError(error)) {
      const all = await getAdminProperties();
      return sortByCreatedAtDesc(all.filter((p) => p.featured));
    }
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching featured properties', error);
    return [];
  }
};

/** Busca propiedades con filtros; devuelve DTO liviano para listados. */
export const searchPropertiesForList = async (params: SearchParams): Promise<PropertyListItem[]> => {
  const properties = await searchPropertiesAdmin(params);
  return toPropertyListItems(properties);
};

/** Busca propiedades con filtros (usa Admin SDK en servidor). */
export const searchPropertiesAdmin = async (params: SearchParams): Promise<Property[]> => {
  try {
    const applyGuestAndLocation = (list: Property[]) => {
      let result = list;
      if (params.guests) {
        result = result.filter((p) => p.maxGuests >= params.guests!);
      }
      if (params.location) {
        result = result.filter((p) =>
          p.location.toLowerCase().includes(params.location!.toLowerCase())
        );
      }
      return result;
    };

    let properties = applyGuestAndLocation(await getAdminProperties());
    const checkInTrim = params.checkIn?.trim();
    const checkOutTrim = params.checkOut?.trim();
    // Checkout without check-in cannot define a window; ignore date filtering in that case.
    if (checkInTrim) {
      const checkIn = new Date(checkInTrim);
      let checkOut: Date;
      if (checkOutTrim) {
        checkOut = new Date(checkOutTrim);
      } else {
        checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + 1);
      }

      if (checkOut > checkIn) {
        // Hostfully cada ~20 min → Firestore caché. Verificación en vivo solo al pagar.
        await ensureAllPropertiesAvailabilityFresh();
        // La lista completa sirve para resolver la jerarquía en memoria: una unidad
        // reservada bloquea la casa completa aunque su propio mapa la muestre libre.
        const allProperties = await getAdminProperties();
        properties = applyGuestAndLocation(allProperties);

        const nightKeys: string[] = [];
        const cursor = new Date(checkIn);
        while (cursor < checkOut) {
          nightKeys.push(
            `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
              cursor.getDate()
            ).padStart(2, "0")}`
          );
          cursor.setDate(cursor.getDate() + 1);
        }

        properties = properties.filter(
          (p) => !isBlockedInGroup(p.id, nightKeys, allProperties)
        );
      }
    }
    return properties;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error searching properties', error);
    return [];
  }
};

// --- RESERVAS ---

/** Reservas confirmadas de una propiedad (para feed iCal público) */
export const getConfirmedReservationsByPropertyAdmin = async (
  propertyId: string
): Promise<Reservation[]> => {
  try {
    const snapshot = await adminDb
      .collection('reservations')
      .where('propertyId', '==', propertyId)
      .where('status', '==', 'confirmed')
      .get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        checkIn: safeTimestampToDate(data.checkIn),
        checkOut: safeTimestampToDate(data.checkOut),
        createdAt: safeTimestampToDate(data.createdAt),
      } as Reservation;
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching reservations by property', error);
    return [];
  }
};

// Solo confirmadas y canceladas (no pending, no incomplete)
export const getAdminReservations = async (): Promise<Reservation[]> => {
  try {
    const snapshot = await adminDb.collection('reservations').orderBy('createdAt', 'desc').get();
    return (snapshot.docs
      .map(doc => {
        const d = doc.data();
        return { ...d, id: doc.id, checkIn: safeTimestampToDate(d.checkIn), checkOut: safeTimestampToDate(d.checkOut), createdAt: safeTimestampToDate(d.createdAt) } as Reservation;
      })
      .filter(r => r.status === 'confirmed' || r.status === 'cancelled'));
  } catch (error) {
    console.error('Admin: Error fetching reservations', error);
    return [];
  }
};

// --- SERVICIOS ---
export const getAdminServices = async (): Promise<Service[]> => {
  try {
    const snapshot = await adminDb.collection('services').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return { ...d, id: doc.id, createdAt: safeTimestampToDate(d.createdAt) } as Service;
    });
  } catch (error) {
    console.error('Admin: Error fetching services', error);
    return [];
  }
};

export const getServiceByIdAdmin = async (id: string): Promise<Service | null> => {
  try {
    const snap = await adminDb.collection('services').doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    return {
      ...data,
      id: snap.id,
      createdAt: safeTimestampToDate(data.createdAt),
    } as Service;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching service by ID', error);
    return null;
  }
};

export const getServiceBySlugAdmin = async (slug: string): Promise<Service | null> => {
  try {
    const snapshot = await adminDb.collection('services').where('slug', '==', slug).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: safeTimestampToDate(data.createdAt),
    } as Service;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching service by slug', error);
    return null;
  }
};

// --- RESEÑAS CURADAS (property_reviews) ---
function mapPropertyReviewDoc(doc: QueryDocumentSnapshot): PropertyReview {
  const d = doc.data()!;
  return {
    ...d,
    id: doc.id,
    createdAt: safeTimestampToDate(d.createdAt),
  } as PropertyReview;
}

export const getPublishedPropertyReviewsAdmin = async (
  propertyId: string
): Promise<PropertyReview[]> => {
  try {
    const snapshot = await adminDb
      .collection('property_reviews')
      .where('propertyId', '==', propertyId)
      .get();
    return sortBySortOrder(
      snapshot.docs
        .map(mapPropertyReviewDoc)
        .filter((review) => review.status === 'published')
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching published reviews', error);
    return [];
  }
};

export const getPropertyReviewsForAdmin = async (propertyId: string): Promise<PropertyReview[]> => {
  try {
    const snapshot = await adminDb
      .collection('property_reviews')
      .where('propertyId', '==', propertyId)
      .get();
    return sortBySortOrder(snapshot.docs.map(mapPropertyReviewDoc));
  } catch (error) {
    console.error('Admin: Error fetching property reviews', error);
    return [];
  }
};

function mapPropertyReviewPlatformStatDoc(doc: QueryDocumentSnapshot): PropertyReviewPlatformStat {
  const d = doc.data()!;
  return {
    ...d,
    id: doc.id,
    createdAt: safeTimestampToDate(d.createdAt),
  } as PropertyReviewPlatformStat;
}

function mapGlobalReviewAggregateOverride(
  raw: GlobalReviewAggregateOverride | undefined
): GlobalReviewAggregateOverride | null {
  if (!raw) return null;
  return {
    averageRating: raw.averageRating,
    reviewCount: raw.reviewCount,
    status: raw.status,
    updatedAt: safeTimestampToDate(raw.updatedAt),
  };
}

export const getGlobalReviewAggregateForAdmin =
  async (): Promise<GlobalReviewAggregateOverride | null> => {
    try {
      const snap = await adminDb
        .collection("site_settings")
        .doc(BUSINESS_REVIEW_PLATFORM_STATS_DOC)
        .get();
      if (!snap.exists) return null;
      const data = snap.data() as BusinessReviewPlatformStatsDoc;
      return mapGlobalReviewAggregateOverride(data.aggregateOverride);
    } catch (error) {
      console.error("Admin: Error fetching global review aggregate", error);
      return null;
    }
  };

export const getPublishedGlobalReviewAggregateAdmin = async (): Promise<{
  averageRating: number;
  reviewCount: number;
} | null> => {
  const aggregate = await getGlobalReviewAggregateForAdmin();
  if (
    !aggregate ||
    aggregate.status !== "published" ||
    aggregate.reviewCount <= 0 ||
    aggregate.averageRating <= 0
  ) {
    return null;
  }
  return {
    averageRating: aggregate.averageRating,
    reviewCount: aggregate.reviewCount,
  };
};

export const getPublishedBusinessReviewPlatformStatsAdmin =
  async (): Promise<PropertyReviewPlatformStat[]> => {
    try {
      const snap = await adminDb
        .collection("site_settings")
        .doc(BUSINESS_REVIEW_PLATFORM_STATS_DOC)
        .get();
      if (!snap.exists) return [];
      const data = snap.data() as BusinessReviewPlatformStatsDoc;
      const stats = data.stats ?? {};
      return Object.entries(stats)
        .map(([channel, record]) => {
          if (!record || record.status !== "published") return null;
          return businessStatToPlatformStat(
            channel as PropertyReviewPlatformStat["channel"],
            {
              ...record,
              updatedAt: safeTimestampToDate(record.updatedAt),
            }
          );
        })
        .filter((s): s is PropertyReviewPlatformStat => s !== null)
        .sort((a, b) => a.channel.localeCompare(b.channel));
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Admin: Error fetching business review stats", error);
      }
      return [];
    }
  };

export const getBusinessReviewPlatformStatsForAdmin =
  async (): Promise<PropertyReviewPlatformStat[]> => {
    try {
      const snap = await adminDb
        .collection("site_settings")
        .doc(BUSINESS_REVIEW_PLATFORM_STATS_DOC)
        .get();
      if (!snap.exists) return [];
      const data = snap.data() as BusinessReviewPlatformStatsDoc;
      const stats = data.stats ?? {};
      return Object.entries(stats)
        .map(([channel, record]) => {
          if (!record) return null;
          return businessStatToPlatformStat(
            channel as PropertyReviewPlatformStat["channel"],
            {
              ...record,
              updatedAt: safeTimestampToDate(record.updatedAt),
            }
          );
        })
        .filter((s): s is PropertyReviewPlatformStat => s !== null)
        .sort((a, b) => a.channel.localeCompare(b.channel));
    } catch (error) {
      console.error("Admin: Error fetching business review stats", error);
      return [];
    }
  };

// --- RESEÑAS IMPORTADAS DE REVYOOS (revyoos_reviews) ---
function mapRevyoosReviewDoc(doc: QueryDocumentSnapshot): RevyoosReview {
  const d = doc.data()!;
  return {
    ...d,
    id: doc.id,
    reviewDate: safeTimestampToDate(d.reviewDate),
    // Defensivo: reseñas sincronizadas antes de que existiera curación manual no tienen estos campos.
    status: d.status === "published" ? "published" : "draft",
    featuredOnHome: d.featuredOnHome === true,
  } as RevyoosReview;
}

/** Todas las reseñas (con texto) de una propiedad, sin filtrar por curación. Usado tanto por
 * las estadísticas por plataforma (que deben ser reales) como por la pantalla de gestión. */
export async function getAllRevyoosReviewsForPropertyAdmin(propertyId: string): Promise<RevyoosReview[]> {
  try {
    const snapshot = await adminDb
      .collection("revyoos_reviews")
      .where("propertyId", "==", propertyId)
      .get();
    return snapshot.docs
      .map(mapRevyoosReviewDoc)
      .filter((r) => r.text.trim().length > 0)
      .sort((a, b) => b.reviewDate.getTime() - a.reviewDate.getTime());
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Admin: Error fetching revyoos reviews", error);
    }
    return [];
  }
}

/** Todas las reseñas (con texto) de todas las propiedades, sin filtrar por curación. */
export async function getAllRevyoosReviewsAdmin(): Promise<RevyoosReview[]> {
  try {
    const snapshot = await adminDb.collection("revyoos_reviews").get();
    return snapshot.docs
      .map(mapRevyoosReviewDoc)
      .filter((r) => r.text.trim().length > 0)
      .sort((a, b) => b.reviewDate.getTime() - a.reviewDate.getTime());
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Admin: Error fetching all revyoos reviews", error);
    }
    return [];
  }
}

function resolveDisplayText(r: RevyoosReview): RevyoosReview {
  const override = r.displayText?.trim();
  return override ? { ...r, text: override } : r;
}

/** Tope de sanidad para el carrusel de inicio (por si el admin destaca de más). */
const REVYOOS_HOME_SAFETY_CAP = 100;

/** Página de reseñas Revyoos de una propiedad: sólo las que el admin publicó
 * manualmente (`/admin/testimonials/revyoos`), con el texto editado si lo hay.
 * Ordenadas de más reciente a más antigua. */
export const getRevyoosReviewsForPropertyAdmin = async (
  propertyId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ reviews: RevyoosReview[]; total: number }> => {
  const all = await getAllRevyoosReviewsForPropertyAdmin(propertyId);
  const published = all.filter((r) => r.status === "published").map(resolveDisplayText);
  const offset = Math.max(0, options?.offset ?? 0);
  const limit = options?.limit ?? published.length;
  return { reviews: published.slice(offset, offset + limit), total: published.length };
};

/** Reseñas destacadas manualmente para el carrusel del inicio (`/admin/testimonials/revyoos`),
 * con el texto editado si lo hay. Cruza todas las propiedades. */
export const getRevyoosReviewsForHomepageAdmin = async (): Promise<RevyoosReview[]> => {
  const all = await getAllRevyoosReviewsAdmin();
  return all
    .filter((r) => r.featuredOnHome)
    .slice(0, REVYOOS_HOME_SAFETY_CAP)
    .map(resolveDisplayText);
};

/** Promedio y conteo por plataforma, calculados directamente de las reseñas importadas (no requiere captura manual). */
export const getRevyoosPlatformStatsForPropertyAdmin = async (
  propertyId: string
): Promise<Array<{ channel: PropertyReviewPlatformStat["channel"]; averageRating: number; reviewCount: number }>> => {
  const all = await getAllRevyoosReviewsForPropertyAdmin(propertyId);
  const byChannel = new Map<string, { sum: number; count: number }>();
  for (const r of all) {
    const entry = byChannel.get(r.platform) ?? { sum: 0, count: 0 };
    entry.sum += r.rating;
    entry.count += 1;
    byChannel.set(r.platform, entry);
  }
  return Array.from(byChannel.entries())
    .map(([channel, { sum, count }]) => ({
      channel: channel as PropertyReviewPlatformStat["channel"],
      averageRating: Math.round((sum / count) * 10) / 10,
      reviewCount: count,
    }))
    .sort((a, b) => a.channel.localeCompare(b.channel));
};

export const getPublishedPropertyReviewStatsAdmin = async (
  propertyId: string
): Promise<PropertyReviewPlatformStat[]> => {
  try {
    const [propertySnap, businessStats] = await Promise.all([
      adminDb
        .collection("property_review_stats")
        .where("propertyId", "==", propertyId)
        .get(),
      getPublishedBusinessReviewPlatformStatsAdmin(),
    ]);
    const propertyStats = propertySnap.docs
      .map(mapPropertyReviewPlatformStatDoc)
      .filter((stat) => stat.status === "published");
    return mergePropertyAndBusinessPlatformStats(
      propertyId,
      propertyStats,
      businessStats
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Admin: Error fetching published review stats", error);
    }
    return [];
  }
};

export const getPropertyReviewStatsForAdmin = async (
  propertyId: string
): Promise<PropertyReviewPlatformStat[]> => {
  try {
    const snapshot = await adminDb
      .collection('property_review_stats')
      .where('propertyId', '==', propertyId)
      .get();
    return snapshot.docs
      .map(mapPropertyReviewPlatformStatDoc)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Admin: Error fetching property review stats', error);
    return [];
  }
};

/** Servicios destacados (para homepage pública, usa Admin SDK en servidor). */
export const getFeaturedServicesAdmin = async (): Promise<Service[]> => {
  try {
    const snapshot = await adminDb
      .collection('services')
      .where('featured', '==', true)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return { ...d, id: doc.id, createdAt: safeTimestampToDate(d.createdAt) } as Service;
    });
  } catch (error) {
    if (isMissingFirestoreIndexError(error)) {
      const all = await getAdminServices();
      return sortByCreatedAtDesc(all.filter((s) => s.featured));
    }
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching featured services', error);
    return [];
  }
};

// --- AMENIDADES ---
export const getAdminGlobalAmenities = async (): Promise<GlobalAmenity[]> => {
  try {
    const snapshot = await adminDb.collection('globalAmenities').orderBy('order', 'asc').get();
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return { ...d, id: doc.id, createdAt: safeTimestampToDate(d.createdAt) } as GlobalAmenity;
    });
  } catch (error) {
    console.error('Admin: Error fetching amenities', error);
    return [];
  }
};

export const getGlobalAmenityByIdAdmin = async (id: string): Promise<GlobalAmenity | null> => {
  try {
    const snap = await adminDb.collection('globalAmenities').doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    return {
      ...data,
      id: snap.id,
      createdAt: safeTimestampToDate(data.createdAt),
    } as GlobalAmenity;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching amenity by ID', error);
    return null;
  }
};

// --- TESTIMONIOS ---
export const getAdminTestimonials = async (): Promise<Testimonial[]> => {
  try {
    const snapshot = await adminDb.collection('testimonials').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return { ...d, id: doc.id, createdAt: safeTimestampToDate(d.createdAt) } as Testimonial;
    });
  } catch (error) {
    console.error('Admin: Error fetching testimonials', error);
    return [];
  }
};

export const getTestimonialsByPropertyIdAdmin = async (
  propertyId: string
): Promise<Testimonial[]> => {
  try {
    const snapshot = await adminDb
      .collection('testimonials')
      .where('propertyId', '==', propertyId)
      .get();
    return snapshot.docs
      .map((doc) => {
        const d = doc.data();
        return {
          ...d,
          id: doc.id,
          createdAt: safeTimestampToDate(d.createdAt),
        } as Testimonial;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Admin: Error fetching testimonials by property', error);
    }
    return [];
  }
};

export const getTestimonialByIdAdmin = async (id: string): Promise<Testimonial | null> => {
  try {
    const snap = await adminDb.collection('testimonials').doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    return {
      ...data,
      id: snap.id,
      createdAt: safeTimestampToDate(data.createdAt),
    } as Testimonial;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching testimonial by ID', error);
    return null;
  }
};

// --- RESERVA POR PAYMENT INTENT (para API pública) ---
export type ReservationWithPropertyTitle = Reservation & { propertyTitle?: string };

export const getReservationByPaymentIntentIdAdmin = async (
  paymentIntentId: string
): Promise<ReservationWithPropertyTitle | null> => {
  try {
    const snapshot = await adminDb
      .collection('reservations')
      .where('stripePaymentId', '==', paymentIntentId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    const propertyId = data.propertyId as string | undefined;
    let propertyTitle: string | undefined;
    if (propertyId) {
      const propSnap = await adminDb.collection('properties').doc(propertyId).get();
      propertyTitle = propSnap.exists ? (propSnap.data()?.title as string) : undefined;
    }
    return {
      ...data,
      id: doc.id,
      checkIn: safeTimestampToDate(data.checkIn),
      checkOut: safeTimestampToDate(data.checkOut),
      createdAt: safeTimestampToDate(data.createdAt),
      propertyTitle,
    } as ReservationWithPropertyTitle;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Admin: Error fetching reservation by payment intent', error);
    }
    return null;
  }
};

/** Reserva por ID para la página de confirmación (cualquier estado: pending o confirmed). Incluye propertyTitle. */
export const getReservationByIdForConfirmationAdmin = async (
  reservationId: string
): Promise<ReservationWithPropertyTitle | null> => {
  try {
    const doc = await adminDb.collection('reservations').doc(reservationId).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    const propertyId = data.propertyId as string | undefined;
    let propertyTitle: string | undefined;
    if (propertyId) {
      const propSnap = await adminDb.collection('properties').doc(propertyId).get();
      propertyTitle = propSnap.exists ? (propSnap.data()?.title as string) : undefined;
    }
    return {
      ...data,
      id: doc.id,
      checkIn: safeTimestampToDate(data.checkIn),
      checkOut: safeTimestampToDate(data.checkOut),
      createdAt: safeTimestampToDate(data.createdAt),
      propertyTitle,
    } as ReservationWithPropertyTitle;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Admin: Error fetching reservation by ID for confirmation', error);
    }
    return null;
  }
};

// --- DISPONIBILIDAD DE PROPIEDAD (para webhook Stripe) ---
/**
 * Marca un rango de fechas como disponibles o no en una propiedad.
 * Usado por el webhook cuando se confirma un pago para bloquear fechas.
 * Si la propiedad no existe (ej. fue eliminada), no hace nada y no lanza error.
 */
export const updatePropertyAvailabilityAdmin = async (
  propertyId: string,
  dates: string[],
  available: boolean
): Promise<void> => {
  const propertyRef = adminDb.collection('properties').doc(propertyId);
  const snap = await propertyRef.get();
  if (!snap.exists) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`updatePropertyAvailabilityAdmin: Property ${propertyId} not found, skipping availability update`);
    }
    return;
  }
  const current = (snap.data()?.availability as Record<string, boolean>) || {};
  const updated = { ...current };
  dates.forEach((d) => (updated[d] = available));
  await propertyRef.update({
    availability: updated,
    updatedAt: new Date(),
  });
};

/**
 * Libera una reserva pendiente: la cancela y vuelve a dejar sus fechas disponibles.
 * Usado por la API release y por checkPropertyAvailability al limpiar reservas expiradas.
 */
export const releasePendingReservationAdmin = async (reservationId: string): Promise<boolean> => {
  const { generateDateRange } = await import('@/lib/utils/date');
  const ref = adminDb.collection('reservations').doc(reservationId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const data = snap.data()!;
  if (data.status !== 'pending') return false;
  const checkIn = safeTimestampToDate(data.checkIn);
  const checkOut = safeTimestampToDate(data.checkOut);
  const propertyId = data.propertyId as string;
  await ref.update({ status: 'cancelled', updatedAt: new Date() });
  // No modificamos property.availability: el cron Hostfully es la fuente para listados/calendario.
  return true;
};

export type ModificationRequestRow = {
  id: string;
  reservationId: string;
  type: string;
  requestedBy: string;
  requestedAt: Date;
  status: string;
  newCheckIn?: string | null;
  newCheckOut?: string | null;
  newGuests?: number | null;
  reason?: string;
  updatedAt: Date;
};

export const getAdminModificationRequests = async (): Promise<ModificationRequestRow[]> => {
  try {
    const snapshot = await adminDb.collection('modificationRequests').orderBy('requestedAt', 'desc').get();
    return snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        reservationId: d.reservationId ?? '',
        type: d.type ?? 'modification',
        requestedBy: d.requestedBy ?? '',
        requestedAt: safeTimestampToDate(d.requestedAt),
        status: d.status ?? 'pending',
        newCheckIn: d.newCheckIn ?? null,
        newCheckOut: d.newCheckOut ?? null,
        newGuests: d.newGuests ?? null,
        reason: d.reason ?? '',
        updatedAt: safeTimestampToDate(d.updatedAt),
      };
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching modification requests', error);
    return [];
  }
};

export type RefundRequestRow = {
  id: string;
  reservationId: string;
  requestedBy: string;
  amountRefunded: number;
  stripeRefundId: string | null;
  status: string;
  requestedAt: Date;
  updatedAt: Date;
};

export const getAdminRefundRequests = async (): Promise<RefundRequestRow[]> => {
  try {
    const snapshot = await adminDb.collection('refundRequests').orderBy('requestedAt', 'desc').get();
    return snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        reservationId: d.reservationId ?? '',
        requestedBy: d.requestedBy ?? '',
        amountRefunded: d.amountRefunded ?? 0,
        stripeRefundId: d.stripeRefundId ?? null,
        status: d.status ?? 'unknown',
        requestedAt: safeTimestampToDate(d.requestedAt),
        updatedAt: safeTimestampToDate(d.updatedAt),
      };
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching refund requests', error);
    return [];
  }
};

// --- CONTENIDO DEL SITIO ---
export const getSiteContentBySectionAdmin = async (section: string): Promise<SiteContent[]> => {
  try {
    const snapshot = await adminDb
      .collection('siteContent')
      .where('section', '==', section)
      .get();
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return { ...d, id: doc.id, updatedAt: safeTimestampToDate(d.updatedAt) } as SiteContent;
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching site content by section', error);
    return [];
  }
};

/** Returns all site content (for admin UI). Avoids client Firestore and permission errors. */
export const getSiteContentAdmin = async (): Promise<SiteContent[]> => {
  try {
    const snapshot = await adminDb.collection('siteContent').get();
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return { ...d, id: doc.id, updatedAt: safeTimestampToDate(d.updatedAt) } as SiteContent;
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching site content', error);
    return [];
  }
};

// --- INFO DE CONTACTO ---
export const getContactInfoAdmin = async (): Promise<ContactInfo | null> => {
  // Durante build (p.ej. Firebase App Hosting) las env vars pueden no estar aún; evita fallar
  if (!process.env.FIREBASE_PRIVATE_KEY) return null;
  try {
    const snapshot = await adminDb.collection('contactInfo').limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      updatedAt: safeTimestampToDate(data.updatedAt),
    } as ContactInfo;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching contact info', error);
    return null;
  }
};