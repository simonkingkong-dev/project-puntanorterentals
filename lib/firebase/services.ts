import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  addDoc, 
  Timestamp,
  doc,
  deleteDoc,
  getDoc,
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Service } from '../types';

const SERVICES_COLLECTION = 'services';

/**
 * Fetches and returns a list of services from the Firebase database.
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

/**
* Adds a new service to the database.
* @param {Omit<Service, 'id' | 'createdAt'>} serviceData - The service data.
* @returns {Promise<string>} The new document ID.
*/
export const createService = async (serviceData: Omit<Service, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, SERVICES_COLLECTION), {
      ...serviceData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating service:', error);
    throw error;
  }
};

/**
 * Fetches a single service by its ID.
 * @param {string} id - The document ID of the service.
 * @returns {Promise<Service | null>}
 */
export const getServiceById = async (id: string): Promise<Service | null> => {
  try {
    const docRef = doc(db, SERVICES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    } as Service;
  } catch (error) {
    console.error('Error fetching service by ID:', error);
    return null;
  }
};

/**
 * Updates an existing service.
 * @param {string} id - The document ID of the service to update.
 * @param {Partial<Omit<Service, 'id' | 'createdAt'>>} serviceData - The data to update.
 */
export const updateService = async (id: string, serviceData: Partial<Omit<Service, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const serviceRef = doc(db, SERVICES_COLLECTION, id);
    await updateDoc(serviceRef, {
      ...serviceData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating service:', error);
    throw error;
  }
};

/**
* Deletes a service from the database by its ID.
* @param {string} id - The document ID of the service to delete.
* @returns {Promise<void>}
*/
export const deleteService = async (id: string): Promise<void> => {
  try {
    const serviceRef = doc(db, SERVICES_COLLECTION, id);
    await deleteDoc(serviceRef);
  } catch (error) {
    console.error('Error deleting service:', error);
    throw error;
  }
};