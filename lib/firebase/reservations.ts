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