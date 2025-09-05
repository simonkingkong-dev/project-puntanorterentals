import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Property, SearchParams } from '../types';

const PROPERTIES_COLLECTION = 'properties';

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