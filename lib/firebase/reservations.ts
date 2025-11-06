// Archivo: lib/firebase/reservations.ts (Completo)

import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Reservation } from '../types';

const RESERVATIONS_COLLECTION = 'reservations';

/**
 * Fetches ALL reservations from the database, ordered by creation date.
 * (Para el panel de admin)
 */
export const getReservations = async (): Promise<Reservation[]> => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, RESERVATIONS_COLLECTION), orderBy('createdAt', 'desc'))
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      checkIn: doc.data().checkIn?.toDate() || new Date(),
      checkOut: doc.data().checkOut?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Reservation[];
  } catch (error) {
    console.error('Error fetching all reservations:', error);
    return [];
  }
};

/**
 * Creates a new reservation and returns its document ID.
 */
export const createReservation = async (reservationData: Omit<Reservation, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, RESERVATIONS_COLLECTION), {
      ...reservationData,
      checkIn: Timestamp.fromDate(reservationData.checkIn),
      checkOut: Timestamp.fromDate(reservationData.checkOut),
      createdAt: Timestamp.now(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating reservation:', error);
    throw error;
  }
};

/**
 * Fetches confirmed reservations for a given property.
 */
export const getReservationsByProperty = async (propertyId: string): Promise<Reservation[]> => {
  try {
    const q = query(
      collection(db, RESERVATIONS_COLLECTION),
      where('propertyId', '==', propertyId),
      where('status', '==', 'confirmed'),
      orderBy('checkIn', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      checkIn: doc.data().checkIn?.toDate() || new Date(),
      checkOut: doc.data().checkOut?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Reservation[];
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return [];
  }
};

/**
 * Updates the status of a reservation (usado por el webhook de Stripe).
 */
export const updateReservationStatus = async (
  reservationId: string, 
  status: Reservation['status'],
  stripePaymentId?: string
): Promise<void> => {
  try {
    const reservationRef = doc(db, RESERVATIONS_COLLECTION, reservationId);
    const updateData: any = { status };
    
    if (stripePaymentId) {
      updateData.stripePaymentId = stripePaymentId;
    }
    
    await updateDoc(reservationRef, updateData);
  } catch (error) {
    console.error('Error updating reservation status:', error);
    throw error;
  }
};

// --- NUEVA FUNCIÓN AÑADIDA ---
/**
 * Fetches a reservation by its Stripe Payment Intent ID.
 * @param {string} paymentIntentId - The ID of the Stripe payment_intent.
 * @returns {Promise<Reservation | null>}
 */
export const getReservationByPaymentIntentId = async (paymentIntentId: string): Promise<Reservation | null> => {
  try {
    const q = query(
      collection(db, RESERVATIONS_COLLECTION),
      where('stripePaymentId', '==', paymentIntentId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.warn(`No reservation found for paymentIntentId: ${paymentIntentId}`);
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      checkIn: doc.data().checkIn?.toDate() || new Date(),
      checkOut: doc.data().checkOut?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Reservation;
  } catch (error) {
    console.error('Error fetching reservation by payment intent ID:', error);
    return null;
  }
};