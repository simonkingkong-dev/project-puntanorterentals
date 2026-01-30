import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { Property, Reservation, Service, GlobalAmenity, Testimonial } from "@/lib/types";

// --- PROPIEDADES ---
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

// --- RESERVAS (ESTA ES LA QUE TE FALLABA) ---
export const getAdminReservations = async (): Promise<Reservation[]> => {
  try {
    const snapshot = await adminDb.collection('reservations').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      checkIn: doc.data().checkIn?.toDate() || new Date(),
      checkOut: doc.data().checkOut?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Reservation[];
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