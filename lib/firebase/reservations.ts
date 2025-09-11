import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Reservation } from '../types';

const RESERVATIONS_COLLECTION = 'reservations';

/**
 * Creates a new reservation and returns its document ID.
 * @example
 * sync({ guestName: 'John Doe', checkIn: new Date(), checkOut: new Date(), roomNumber: 101 })
 * // Returns: 'randomDocumentId123'
 * @param {Omit<Reservation, 'id' | 'createdAt'>} reservationData - The reservation details excluding ID and creation date.
 * @returns {Promise<string>} A promise that resolves to the reservation document ID.
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
 * Fetches and returns a list of confirmed reservations for a given property, ordered by check-in date.
 * @example
 * sync('propertyId123').then(reservations => console.log(reservations));
 * // Expected output: Array of reservation objects with converted dates.
 * @param {string} propertyId - The ID of the property to fetch reservations for.
 * @returns {Promise<Reservation[]>} A promise that resolves to an array of Reservations.
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
 * Updates the status of a reservation in the Firestore database.
 * @example
 * sync('reservation123', 'confirmed', 'stripe123')
 * // Returns: Promise resolves with no value upon successful update
 * @param {string} reservationId - The unique identifier of the reservation to update.
 * @param {Reservation['status']} status - The new status for the reservation.
 * @param {string} [stripePaymentId] - The Stripe payment ID associated with the reservation, if applicable.
 * @returns {Promise<void>} Resolves when the update is successful, rejects with an error if the update fails.
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