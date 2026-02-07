import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { Property, Reservation, Service, GlobalAmenity, Testimonial } from "@/lib/types";

// --- PROPIEDADES ---
export const getPropertyByIdAdmin = async (propertyId: string): Promise<Property | null> => {
  try {
    const snap = await adminDb.collection('properties').doc(propertyId).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    return {
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt),
    } as Property;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching property by ID', error);
    return null;
  }
};

export const getAdminProperties = async (): Promise<Property[]> => {
  try {
    const snapshot = await adminDb.collection('properties').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Property[];
  } catch (error) {
    console.error('Admin: Error fetching properties', error);
    return [];
  }
};

// --- RESERVAS ---
// Solo confirmadas y canceladas (no pending, no incomplete)
export const getAdminReservations = async (): Promise<Reservation[]> => {
  try {
    const snapshot = await adminDb.collection('reservations').orderBy('createdAt', 'desc').get();
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        checkIn: doc.data().checkIn?.toDate() || new Date(),
        checkOut: doc.data().checkOut?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Reservation[]
      .filter(r => r.status === 'confirmed' || r.status === 'cancelled');
  } catch (error) {
    console.error('Admin: Error fetching reservations', error);
    return [];
  }
};

// --- SERVICIOS ---
export const getAdminServices = async (): Promise<Service[]> => {
  try {
    const snapshot = await adminDb.collection('services').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Service[];
  } catch (error) {
    console.error('Admin: Error fetching services', error);
    return [];
  }
};

// --- AMENIDADES ---
export const getAdminGlobalAmenities = async (): Promise<GlobalAmenity[]> => {
  try {
    const snapshot = await adminDb.collection('globalAmenities').orderBy('order', 'asc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as GlobalAmenity[];
  } catch (error) {
    console.error('Admin: Error fetching amenities', error);
    return [];
  }
};

// --- TESTIMONIOS (AÑADIR ESTO AL FINAL) ---
export const getAdminTestimonials = async (): Promise<Testimonial[]> => {
  try {
    const snapshot = await adminDb.collection('testimonials').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Testimonial[];
  } catch (error) {
    console.error('Admin: Error fetching testimonials', error);
    return [];
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
      id: doc.id,
      ...data,
      checkIn: data.checkIn?.toDate?.() ?? new Date(data.checkIn),
      checkOut: data.checkOut?.toDate?.() ?? new Date(data.checkOut),
      createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
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
      id: doc.id,
      ...data,
      checkIn: data.checkIn?.toDate?.() ?? new Date(data.checkIn),
      checkOut: data.checkOut?.toDate?.() ?? new Date(data.checkOut),
      createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
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
 */
export const updatePropertyAvailabilityAdmin = async (
  propertyId: string,
  dates: string[],
  available: boolean
): Promise<void> => {
  const propertyRef = adminDb.collection('properties').doc(propertyId);
  const snap = await propertyRef.get();
  if (!snap.exists) {
    throw new Error(`Property ${propertyId} not found`);
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
  const checkIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
  const checkOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
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
        requestedAt: d.requestedAt?.toDate?.() ?? new Date(d.requestedAt),
        status: d.status ?? 'pending',
        newCheckIn: d.newCheckIn ?? null,
        newCheckOut: d.newCheckOut ?? null,
        newGuests: d.newGuests ?? null,
        reason: d.reason ?? '',
        updatedAt: d.updatedAt?.toDate?.() ?? new Date(d.updatedAt),
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
        requestedAt: d.requestedAt?.toDate?.() ?? new Date(d.requestedAt),
        updatedAt: d.updatedAt?.toDate?.() ?? new Date(d.updatedAt),
      };
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Admin: Error fetching refund requests', error);
    return [];
  }
};