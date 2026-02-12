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
  /** UID de la propiedad en Hostfully (PMS). Si existe, la disponibilidad se consulta al PMS. */
  hostfullyPropertyId?: string;
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
  /** Solo para pending: fecha límite para completar el pago; después se liberan las fechas */
  expiresAt?: Date;
  /** Token para verificar que es el mismo cliente en la página de pago (cookie) */
  clientToken?: string;
  /** Si las fechas ya fueron bloqueadas al entrar a la página de pago */
  datesHeld?: boolean;
  /** Si ya se usó la prórroga de 5 minutos (solo una vez por reserva) */
  extendedOnce?: boolean;
  /** Fecha en que se confirmó el pago (Stripe). Para regla de 2h. */
  confirmedAt?: Date;
  /** Token para acceder a la página de modificación de reserva confirmada. */
  modifyToken?: string;
}

/** Solicitud de modificación/reembolso creada por el huésped (después de 2h o reembolso). */
export interface ModificationRequest {
  id: string;
  reservationId: string;
  type: 'modification' | 'cancellation_refund';
  requestedAt: Date;
  requestedBy: string; // guestEmail
  status: 'pending' | 'approved' | 'rejected';
  /** Para reembolsos: ID del reembolso en Stripe. */
  stripeRefundId?: string;
  amountRefunded?: number;
  /** Notas del personal. */
  adminNotes?: string;
  updatedAt: Date;
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