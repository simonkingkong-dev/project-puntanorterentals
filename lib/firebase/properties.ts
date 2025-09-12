import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Property, SearchParams } from '../types';

const PROPERTIES_COLLECTION = 'properties';

/**
 * Fetches and returns a list of properties from the database, ordered by creation date.
 * @example
 * sync().then(properties => console.log(properties));
 * // Returns a list of properties with their details including id, createdAt, and updatedAt.
 * @returns {Promise<Property[]>} A promise that resolves to an array of Property objects.
 */
export const getProperties = async (): Promise<Property[]> => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, PROPERTIES_COLLECTION), orderBy('createdAt', 'desc'))
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
 * @example
 * sync('example-slug')
 * // Returns a Property object or null if not found
 * @param {string} slug - The unique slug identifier of the property.
 * @returns {Promise<Property | null>} A promise that resolves to a Property object if found, otherwise null.
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
 * @example
 * sync('property-id')
 * // Returns a property object or null if not found
 * @param {string} id - The ID of the property to fetch.
 * @returns {Promise<Property|null>} A promise that resolves to the property object if found, otherwise null.
 */
export const getPropertyById = async (id: string): Promise<Property | null> => {
  try {
    const docRef = doc(db, PROPERTIES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
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
* Filters properties based on search parameters such as guests, location, and availability dates.
* @example
* sync({guests: 4, location: 'New York', checkIn: '2023-12-01', checkOut: '2023-12-10'})
* returns a list of properties that accommodate at least 4 guests, are located in New York and are available between December 1, 2023, and December 10, 2023.
* @param {SearchParams} params - The search parameters including guests, location, check-in, and check-out dates.
* @returns {Promise<Property[]>} A promise that resolves to an array of properties matching the search criteria or an empty array if an error occurs.
**/
export const searchProperties = async (params: SearchParams): Promise<Property[]> => {
  try {
    let properties = await getProperties();
    
    // Filter by guests
    if (params.guests) {
      properties = properties.filter(property => property.maxGuests >= params.guests!);
    }
    
    // Filter by location
    if (params.location) {
      properties = properties.filter(property => 
        property.location.toLowerCase().includes(params.location!.toLowerCase())
      );
    }
    
    // Filter by availability (if dates are provided)
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
 * @example
 * sync()
 * Promise.resolve([...]) // Returns a promise with the list of featured properties
 * @returns {Promise<Property[]>} A promise that resolves to an array of featured properties.
 */
export const getFeaturedProperties = async (): Promise<Property[]> => {
  try {
    const q = query(
      collection(db, PROPERTIES_COLLECTION),
      where('featured', '==', true),
      orderBy('createdAt', 'desc')
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
 * Synchronize property availability for specified dates.
 * @example
 * sync('property123', ['2023-10-20', '2023-10-21'], true)
 * // No return value, but the property availability is updated in the database.
 * @param {string} propertyId - The ID of the property to update.
 * @param {string[]} dates - An array of dates for which to set availability.
 * @param {boolean} available - The availability status to set for the specified dates.
 * @returns {Promise<void>} Resolves when the property availability is updated successfully.
 */
export const updatePropertyAvailability = async (
  propertyId: string, 
  dates: string[], 
  available: boolean
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