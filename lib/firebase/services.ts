import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  // CORREGIDO: Añadimos las importaciones necesarias
  addDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Service } from '../types';

const SERVICES_COLLECTION = 'services';

/**
 * Fetches and returns a list of services from the Firebase database...
 * (Tu función getServices existente va aquí)
 */
export const getServices = async (): Promise<Service[]> => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, SERVICES_COLLECTION), orderBy('createdAt', 'desc'))
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Service[];
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
};

/**
 * Fetch and return an array of featured services...
 * (Tu función getFeaturedServices existente va aquí)
 */
export const getFeaturedServices = async (): Promise<Service[]> => {
  try {
    const q = query(
      collection(db, SERVICES_COLLECTION),
      where('featured', '==', true),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Service[];
  } catch (error) {
    console.error('Error fetching featured services:', error);
    return [];
  }
};

// --- CORREGIDO: AÑADE ESTA NUEVA FUNCIÓN ---

/**
* Adds a new service to the database.
* @param {Omit<Service, 'id' | 'createdAt'>} serviceData - The service data excluding ID and creation date.
* @returns {Promise<string>} A promise that resolves to the service document ID.
*/
export const createService = async (serviceData: Omit<Service, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, SERVICES_COLLECTION), {
      ...serviceData,
      createdAt: Timestamp.now(), // Añade la fecha de creación
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating service:', error);
    throw error;
  }
};