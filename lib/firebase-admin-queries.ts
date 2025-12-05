import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { Property, Reservation, Service, GlobalAmenity } from "@/lib/types";

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