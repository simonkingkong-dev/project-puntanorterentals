export interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  maxGuests: number;
  amenities: string[];
  images: string[];
  pricePerNight: number;
  availability: {
    [date: string]: boolean; // YYYY-MM-DD format
  };
  slug: string;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  propertyId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  stripePaymentId?: string;
  createdAt: Date;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  image: string;
  externalLink: string;
  featured: boolean;
  createdAt: Date;
}

export interface Testimonial {
  id: string;
  name: string;
  text: string;
  image?: string;
  rating: number;
  location?: string;
  featured: boolean;
  createdAt: Date;
}

export interface GlobalAmenity {
  id: string;
  title: string;
  description: string;
  icon: string;
  featured: boolean;
  order: number;
  createdAt: Date;
}

export interface SiteContent {
  id: string;
  section: string;
  key: string;
  value: string;
  type: 'text' | 'textarea' | 'image' | 'url';
  updatedAt: Date;
}

export interface ContactInfo {
  id: string;
  email: string;
  phone: string;
  address: string;
  companyName: string;
  copyright: string;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  updatedAt: Date;
}

export interface SearchParams {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  location?: string;
}