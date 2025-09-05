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

// Collections
const TESTIMONIALS_COLLECTION = 'testimonials';
const GLOBAL_AMENITIES_COLLECTION = 'globalAmenities';
const SITE_CONTENT_COLLECTION = 'siteContent';
const CONTACT_INFO_COLLECTION = 'contactInfo';

// Testimonials
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

export const updateTestimonial = async (id: string, testimonialData: Partial<Testimonial>): Promise<void> => {
  try {
    const testimonialRef = doc(db, TESTIMONIALS_COLLECTION, id);
    await updateDoc(testimonialRef, testimonialData);
  } catch (error) {
    console.error('Error updating testimonial:', error);
    throw error;
  }
};

export const deleteTestimonial = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, TESTIMONIALS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    throw error;
  }
};

// Global Amenities
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

export const updateGlobalAmenity = async (id: string, amenityData: Partial<GlobalAmenity>): Promise<void> => {
  try {
    const amenityRef = doc(db, GLOBAL_AMENITIES_COLLECTION, id);
    await updateDoc(amenityRef, amenityData);
  } catch (error) {
    console.error('Error updating global amenity:', error);
    throw error;
  }
};

export const deleteGlobalAmenity = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, GLOBAL_AMENITIES_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting global amenity:', error);
    throw error;
  }
};

// Site Content
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

export const updateSiteContent = async (section: string, key: string, value: string, type: SiteContent['type'] = 'text'): Promise<void> => {
  try {
    const q = query(
      collection(db, SITE_CONTENT_COLLECTION),
      where('section', '==', section),
      where('key', '==', key)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Create new content
      await addDoc(collection(db, SITE_CONTENT_COLLECTION), {
        section,
        key,
        value,
        type,
        updatedAt: Timestamp.now(),
      });
    } else {
      // Update existing content
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

// Contact Info
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

export const updateContactInfo = async (contactData: Omit<ContactInfo, 'id' | 'updatedAt'>): Promise<void> => {
  try {
    const querySnapshot = await getDocs(collection(db, CONTACT_INFO_COLLECTION));
    
    if (querySnapshot.empty) {
      // Create new contact info
      await addDoc(collection(db, CONTACT_INFO_COLLECTION), {
        ...contactData,
        updatedAt: Timestamp.now(),
      });
    } else {
      // Update existing contact info
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
};