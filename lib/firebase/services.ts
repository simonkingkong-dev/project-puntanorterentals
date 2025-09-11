import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Service } from '../types';

const SERVICES_COLLECTION = 'services';

/**
 * Fetches and returns a list of services from the Firebase database, ordered by creation date.
 * @example
 * sync().then(services => console.log(services));
 * // [{ id: '1', name: 'Service 1', createdAt: Date }, {...}]
 * @returns {Promise<Service[]>} A promise that resolves to an array of services with their data and creation date.
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
 * Fetch and return an array of featured services from the database.
 * @example
 * sync().then(services => console.log(services));
 * // Returns a promise that resolves to an array of featured services.
 * @returns {Promise<Service[]>} A promise that resolves to an array of services which are featured, ordered by their creation date in descending order.
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