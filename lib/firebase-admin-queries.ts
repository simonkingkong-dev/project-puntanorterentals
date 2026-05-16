import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { Property, Reservation, Service, GlobalAmenity, Testimonial, ContactInfo, SearchParams, SiteContent } from "@/lib/types";
import { checkHostfullyAvailability } from "@/lib/hostfully/client";

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

// --- PROPIEDADES ---
export const getPropertyByIdAdmin = async (propertyId: string): Promise<Property | null> => {
  try {
    const snap = await adminDb.collection('properties').doc(propertyId).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    return {
      ...data,
      id: snap.id,
      createdAt: safeTimestampToDate(data.createdAt),
      updatedAt: safeTimestampToDate(data.updatedAt),
    } as Property;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching property by ID', error);
    return null;
  }
};

export const getAdminProperties = async (): Promise<Property[]> => {
  try {
    const snapshot = await adminDb.collection('properties').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return { ...d, id: doc.id, createdAt: safeTimestampToDate(d.createdAt), updatedAt: safeTimestampToDate(d.updatedAt) } as Property;
    });
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
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: safeTimestampToDate(data.createdAt),
      updatedAt: safeTimestampToDate(data.updatedAt),
    } as Property;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching property by slug', error);
    return null;
  }
};

/** Propiedades destacadas (para homepage pública, usa Admin SDK en servidor). */
export const getFeaturedPropertiesAdmin = async (): Promise<Property[]> => {
  try {
    const snapshot = await adminDb
      .collection('properties')
      .where('featured', '==', true)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return { ...d, id: doc.id, createdAt: safeTimestampToDate(d.createdAt), updatedAt: safeTimestampToDate(d.updatedAt) } as Property;
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching featured properties', error);
    return [];
  }
};

/** Busca propiedades con filtros (usa Admin SDK en servidor). */
export const searchPropertiesAdmin = async (params: SearchParams): Promise<Property[]> => {
  try {
    let properties = await getAdminProperties();
    if (params.guests) {
      properties = properties.filter(p => p.maxGuests >= params.guests!);
    }
    if (params.location) {
      properties = properties.filter(p =>
        p.location.toLowerCase().includes(params.location!.toLowerCase())
      );
    }
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
        const filteredByLocalAvailability = properties.filter((p) => {
          let current = new Date(checkIn);
          while (current < checkOut) {
            const dateStr = current.toISOString().split("T")[0];
            if (p.availability?.[dateStr] === false) return false;
            current.setDate(current.getDate() + 1);
          }
          return true;
        });

        const availabilityResults = await Promise.all(
          filteredByLocalAvailability.map(async (property) => {
            if (!property.hostfullyPropertyId) {
              return { property, available: true };
            }
            const result = await checkHostfullyAvailability(
              property.hostfullyPropertyId,
              checkIn,
              checkOut
            );
            return { property, available: result.available };
          })
        );

        properties = availabilityResults
          .filter((item) => item.available)
          .map((item) => item.property);
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
  const dateStrings = generateDateRange(checkIn, checkOut);
  await updatePropertyAvailabilityAdmin(propertyId, dateStrings, true);
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