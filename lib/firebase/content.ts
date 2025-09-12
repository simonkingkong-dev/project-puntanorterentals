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
/**
 * Fetches and returns a list of testimonials from the Firestore database.
 * @example
 * sync().then(testimonials => console.log(testimonials));
 * // Example output: [{ id: "1", ... }, { id: "2", ... }]
 * @returns {Promise<Testimonial[]>} A promise that resolves to an array of testimonial objects, sorted by creation date in descending order.
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
 * Fetches and returns a list of featured testimonials from the database.
 * @example
 * sync()
 * // Returns: Promise<Testimonial[]>
 * @returns {Promise<Testimonial[]>} A promise that resolves to an array of featured testimonial objects, each including an ID, data, and a creation date.
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
* Adds a testimonial to the database and returns the generated document ID.
* @example
* sync({ name: "John Doe", message: "Great service!" })
* "abc123"
* @param {Omit<Testimonial, 'id' | 'createdAt'>} testimonialData - The testimonial data excluding 'id' and 'createdAt'.
* @returns {Promise<string>} A promise that resolves to the document ID of the newly created testimonial.
**/
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
/**
 * Synchronizes and retrieves a list of global amenities from the database.
 * @example
 * sync().then(globalAmenities => console.log(globalAmenities));
 * [{ id: '1', name: 'Pool', createdAt: '2023-10-08T00:00:00Z' }, ...]
 * @returns {Promise<GlobalAmenity[]>} A promise that resolves to an array of global amenity objects.
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
* Syncs provided amenity data to the global amenities collection and returns the document ID.
* @example
* sync({ name: "Swimming Pool", description: "A large pool for communal use" })
* "newDocumentId123"
* @param {Omit<GlobalAmenity, 'id' | 'createdAt'>} amenityData - Amenity data excluding id and createdAt fields.
* @returns {Promise<string>} A promise that resolves to the ID of the newly created document.
**/
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
/**
* Fetches and synchronizes the site content from the database.
* @example
* sync().then(contents => console.log(contents))
* // Outputs an array of site content objects
* @returns {Promise<SiteContent[]>} A promise that resolves to an array of site content objects, with each object containing an id and data fields, or an empty array if an error occurs.
**/
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
 * Synchronizes and retrieves site content for a specified section from the database.
 * @example
 * sync('home').then(data => console.log(data));
 * // Expected output: [{ id: 'docId', section: 'home', updatedAt: Date, ... }]
 * @param {string} section - The section of the site content to retrieve.
 * @returns {Promise<SiteContent[]>} A promise that resolves to an array of site content objects.
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
 * Synchronizes site content by either adding new content or updating existing content in the database.
 * @example
 * sync('homepage', 'welcomeMessage', 'Welcome to our site', 'text')
 * // Adds or updates the welcome message on the homepage with the specified value and type
 * @param {string} section - The section of the site content to synchronize.
 * @param {string} key - The key within the section for the content.
 * @param {string} value - The value of the content to be added or updated.
 * @param {string} [type='text'] - The type of the site content, defaults to 'text' if not specified.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
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
/**
 * Synchronizes and fetches the contact information from the database.
 * @example
 * sync().then(contactInfo => console.log(contactInfo));
 * // Output: { id: 'documentId', name: 'John Doe', updatedAt: Date ... }
 * @returns {Promise<ContactInfo | null>} A promise that resolves to the contact information object or null if no data is found.
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
* Synchronizes contact information with a Firestore database collection by either adding new data or updating existing data.
* @example
* sync({ name: 'John Doe', email: 'john@example.com' })
* // Returns undefined
* @param {Omit<ContactInfo, 'id' | 'updatedAt'>} contactData - The contact information to sync, excluding 'id' and 'updatedAt'.
* @returns {Promise<void>} A Promise that resolves when the contact information is successfully synchronized.
**/
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