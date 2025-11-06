// Archivo: lib/firebase/content.ts (Versión Completa y Definitiva)

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
import { Testimonial, GlobalAmenity, SiteContent, ContactInfo } from '../types';

// --- COLECCIONES ---
const TESTIMONIALS_COLLECTION = 'testimonials';
const GLOBAL_AMENITIES_COLLECTION = 'globalAmenities';
const SITE_CONTENT_COLLECTION = 'siteContent';
const CONTACT_INFO_COLLECTION = 'contactInfo';

// --- TESTIMONIOS ---

/**
 * Fetches and returns a list of testimonials.
 */
export const getTestimonials = async (): Promise<Testimonial[]> => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, TESTIMONIALS_COLLECTION), orderBy('createdAt', 'desc'))
    );
    
    return querySnapshot.docs.map(doc => ({
       id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Testimonial[];
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return [];
  }
};

/**
 * Fetches and returns a list of featured testimonials.
 */
export const getFeaturedTestimonials = async (): Promise<Testimonial[]> => {
  try {
    const q = query(
      collection(db, TESTIMONIALS_COLLECTION),
      where('featured', '==', true),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
       createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Testimonial[];
  } catch (error) {
    console.error('Error fetching featured testimonials:', error);
    return [];
  }
};

/**
* Adds a testimonial to the database.
*/
export const createTestimonial = async (testimonialData: Omit<Testimonial, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, TESTIMONIALS_COLLECTION), {
      ...testimonialData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating testimonial:', error);
    throw error;
  }
};

/**
 * Updates an existing testimonial.
 */
export const updateTestimonial = async (id: string, testimonialData: Partial<Testimonial>): Promise<void> => {
  try {
     const testimonialRef = doc(db, TESTIMONIALS_COLLECTION, id);
    await updateDoc(testimonialRef, {
      ...testimonialData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    throw error;
  }
};

/**
 * Deletes a testimonial from the database.
 */
export const deleteTestimonial = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, TESTIMONIALS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    throw error;
  }
};

// --- AMENIDADES GLOBALES ---

/**
 * Fetches and returns a list of global amenities.
 */
export const getGlobalAmenities = async (): Promise<GlobalAmenity[]> => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, GLOBAL_AMENITIES_COLLECTION), orderBy('order', 'asc'))
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
       createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as GlobalAmenity[];
  } catch (error) {
    console.error('Error fetching global amenities:', error);
    return [];
  }
};

/**
 * Fetches a single global amenity by its ID.
 */
export const getGlobalAmenityById = async (id: string): Promise<GlobalAmenity | null> => {
  try {
    const docRef = doc(db, GLOBAL_AMENITIES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    } as GlobalAmenity;
  } catch (error) {
    console.error('Error fetching global amenity by ID:', error);
    return null;
  }
};

/**
* Creates a new global amenity.
*/
export const createGlobalAmenity = async (amenityData: Omit<GlobalAmenity, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, GLOBAL_AMENITIES_COLLECTION), {
      ...amenityData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating global amenity:', error);
    throw error;
  }
};

/**
 * Updates an existing global amenity.
 */
export const updateGlobalAmenity = async (id: string, amenityData: Partial<Omit<GlobalAmenity, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const amenityRef = doc(db, GLOBAL_AMENITIES_COLLECTION, id);
    await updateDoc(amenityRef, {
      ...amenityData,
      updatedAt: Timestamp.now() 
    });
  } catch (error) {
    console.error('Error updating global amenity:', error);
    throw error;
  }
};

/**
 * Deletes a global amenity.
 */
export const deleteGlobalAmenity = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, GLOBAL_AMENITIES_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting global amenity:', error);
    throw error;
  }
};

// --- CONTENIDO DEL SITIO ---

/**
* Fetches and synchronizes the site content from the database.
*/
export const getSiteContent = async (): Promise<SiteContent[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, SITE_CONTENT_COLLECTION));
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
       ...doc.data(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as SiteContent[];
  } catch (error) {
    console.error('Error fetching site content:', error);
    return [];
  }
};

/**
 * Synchronizes and retrieves site content for a specified section.
 */
export const getSiteContentBySection = async (section: string): Promise<SiteContent[]> => {
  try {
    const q = query(
      collection(db, SITE_CONTENT_COLLECTION),
      where('section', '==', section)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
       ...doc.data(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as SiteContent[];
  } catch (error) {
    console.error('Error fetching site content by section:', error);
    return [];
  }
};

/**
 * Synchronizes site content by either adding new content or updating existing content.
 */
export const updateSiteContent = async (section: string, key: string, value: string, type: SiteContent['type'] = 'text'): Promise<void> => {
  try {
    const q = query(
      collection(db, SITE_CONTENT_COLLECTION),
      where('section', '==', section),
      where('key', '==', key)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      await addDoc(collection(db, SITE_CONTENT_COLLECTION), {
         section,
        key,
        value,
        type,
        updatedAt: Timestamp.now(),
      });
    } else {
      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        value,
         type,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Error updating site content:', error);
    throw error;
  }
};

// --- INFO DE CONTACTO ---

/**
 * Synchronizes and fetches the contact information from the database.
 */
export const getContactInfo = async (): Promise<ContactInfo | null> => {
  try {
    const querySnapshot = await getDocs(collection(db, CONTACT_INFO_COLLECTION));
    
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as ContactInfo;
  } catch (error) {
     console.error('Error fetching contact info:', error);
    return null;
  }
};

/**
* Synchronizes contact information.
*/
export const updateContactInfo = async (contactData: Omit<ContactInfo, 'id' | 'updatedAt'>): Promise<void> => {
  try {
    const querySnapshot = await getDocs(collection(db, CONTACT_INFO_COLLECTION));
    
    if (querySnapshot.empty) {
      await addDoc(collection(db, CONTACT_INFO_COLLECTION), {
        ...contactData,
        updatedAt: Timestamp.now(),
      });
    } else {
       const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        ...contactData,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Error updating contact info:', error);
    throw error;
  }
}; // <--- ESTA ES LA LLAVE QUE FALTABA