import { 
  Timestamp, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  orderBy, 
  query, 
  updateDoc, 
  where,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Property, SearchParams } from '../types';

const PROPERTIES_COLLECTION = 'properties';

/**
 * Fetches and returns a list of properties from the database, ordered by creation date.
 */
export const getProperties = async (): Promise<Property[]> => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, PROPERTIES_COLLECTION), orderBy('createdAt', 'desc')),
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Property[];
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
};

/**
 * Fetches a property from the Firestore database using a specified slug.
 */
export const getPropertyBySlug = async (slug: string): Promise<Property | null> => {
  try {
    const q = query(collection(db, PROPERTIES_COLLECTION), where('slug', '==', slug));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as Property;
  } catch (error) {
    console.error('Error fetching property by slug:', error);
    return null;
  }
};

/**
 * Fetches a property document by ID from the Firestore database and returns it.
 */
export const getPropertyById = async (id: string): Promise<Property | null> => {
  try {
    const docRef = doc(db, PROPERTIES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
    } as Property;
  } catch (error) {
    console.error('Error fetching property by ID:', error);
    return null;
  }
};

/**
* Filters properties based on search parameters.
*/
export const searchProperties = async (params: SearchParams): Promise<Property[]> => {
  try {
    let properties = await getProperties();
    
    if (params.guests) {
      properties = properties.filter(property => property.maxGuests >= params.guests!);
    }
    
    if (params.location) {
      properties = properties.filter(property => 
         property.location.toLowerCase().includes(params.location!.toLowerCase()),
      );
    }
    
    if (params.checkIn && params.checkOut) {
      properties = properties.filter(property => {
        const checkIn = new Date(params.checkIn!);
        const checkOut = new Date(params.checkOut!);
        const currentDate = new Date(checkIn);
        
        while (currentDate < checkOut) {
          const dateString = currentDate.toISOString().split('T')[0];
          if (property.availability[dateString] === false) {
            return false;
          }
           currentDate.setDate(currentDate.getDate() + 1);
        }
        return true;
      });
    }
    
    return properties;
  } catch (error) {
    console.error('Error searching properties:', error);
    return [];
  }
};

/**
 * Retrieves a list of featured properties from the Firestore database.
 */
export const getFeaturedProperties = async (): Promise<Property[]> => {
  try {
    const q = query(
      collection(db, PROPERTIES_COLLECTION),
      where('featured', '==', true),
      orderBy('createdAt', 'desc'),
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Property[];
  } catch (error) {
    console.error('Error fetching featured properties:', error);
    return [];
  }
};

/**
 * Updates availability for specified dates.
 */
export const updatePropertyAvailability = async (
  propertyId: string, 
  dates: string[], 
  available: boolean,
): Promise<void> => {
  try {
    const propertyRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const property = await getDoc(propertyRef);
    
    if (!property.exists()) {
      throw new Error('Property not found');
    }
    
    const currentAvailability = property.data().availability || {};
    const updatedAvailability = { ...currentAvailability };
    
    dates.forEach(date => {
      updatedAvailability[date] = available;
    });
    
    await updateDoc(propertyRef, {
      availability: updatedAvailability,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating property availability:', error);
    throw error;
  }
};

/**
 * Creates a new property in the Firestore database.
 */
export const createProperty = async (propertyData: Omit<Property, 'id'>): Promise<string> => {
  try {
    const dataToSave = {
      ...propertyData,
      createdAt: Timestamp.fromDate(propertyData.createdAt as Date),
      updatedAt: Timestamp.fromDate(propertyData.updatedAt as Date),
    };

    const docRef = await addDoc(collection(db, PROPERTIES_COLLECTION), dataToSave);
    return docRef.id;
  } catch (error) {
    console.error('Error creating property:', error);
    throw error;
  }
};

/**
 * Updates an existing property.
 * @param {string} id - The document ID of the property to update.
 * @param {Partial<Omit<Property, 'id' | 'createdAt' | 'updatedAt'>>} propertyData - The data to update.
 */
export const updateProperty = async (id: string, propertyData: Partial<Omit<Property, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const propertyRef = doc(db, PROPERTIES_COLLECTION, id);
    await updateDoc(propertyRef, {
      ...propertyData,
      updatedAt: Timestamp.now() // Actualizar la fecha de modificación
    });
  } catch (error) {
    console.error('Error updating property:', error);
    throw error;
  }
};

/**
 * Deletes a property from the database by its ID.
 */
export const deleteProperty = async (id: string): Promise<void> => {
  try {
    const propertyRef = doc(db, PROPERTIES_COLLECTION, id);
    await deleteDoc(propertyRef);
  } catch (error) {
    console.error('Error deleting property:', error);
    throw error;
  }
};