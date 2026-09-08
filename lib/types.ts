export type BedType = 'bunk' | 'single' | 'double' | 'queen' | 'king';

export interface Property {
  id: string;
  /** Nombre interno para operación/admin. No se muestra a clientes. */
  internalName?: string;
  /** Título público en español. */
  titleEs?: string;
  /** Título público en inglés. */
  titleEn?: string;
  title: string;
  description: string;
  location: string;
  maxGuests: number;
  /** Huéspedes incluidos en el precio por noche (Hostfully). Si falta, el sitio usa 2. */
  includedGuests?: number;
  /** USD por cada huésped extra por noche (Hostfully). Si falta, el sitio usa 10. */
  extraGuestFeePerNight?: number;
  amenities: string[];
  /** Amenidades localizadas para render público por idioma. */
  amenitiesEs?: string[];
  amenitiesEn?: string[];
  images: string[];
  pricePerNight: number;
  availability: {
    [date: string]: boolean; // YYYY-MM-DD format
  };
  slug: string;
  featured: boolean;
  /** Habitaciones (Hostfully). */
  bedrooms?: number;
  /** Baños (Hostfully). */
  bathrooms?: number;
  /** Tipos de cama por habitación. */
  beds?: BedType[];
  /** Resumen corto (Hostfully). */
  summary?: string;
  /** Descripción corta local/Hostfully (Short Description). */
  shortDescription?: string;
  shortDescriptionEs?: string;
  shortDescriptionEn?: string;
  /** Descripción larga local/Hostfully (Long Description). */
  longDescription?: string;
  longDescriptionEs?: string;
  longDescriptionEn?: string;
  /** Notas para el huésped (Notes/booking notes). */
  notes?: string;
  notesEs?: string;
  notesEn?: string;
  /** Interacción con huéspedes (Hostfully). */
  interaction?: string;
  interactionEs?: string;
  interactionEn?: string;
  /** Descripción del barrio (Hostfully). */
  neighborhood?: string;
  neighborhoodEs?: string;
  neighborhoodEn?: string;
  /** Cómo acceder a la propiedad (Access). */
  access?: string;
  accessEs?: string;
  accessEn?: string;
  /** Descripción del espacio (Space). */
  space?: string;
  spaceEs?: string;
  spaceEn?: string;
  /** Información de transporte (Transit). */
  transit?: string;
  transitEs?: string;
  transitEn?: string;
  /** Manual de la casa / instrucciones (House Manual). */
  houseManual?: string;
  houseManualEs?: string;
  houseManualEn?: string;
  /** Campos base localizados para render público por idioma. */
  descriptionEs?: string;
  descriptionEn?: string;
  summaryEs?: string;
  summaryEn?: string;
  /** Latitud para mapa (Hostfully). */
  latitude?: number;
  /** Longitud para mapa (Hostfully). */
  longitude?: number;
  /** Reseñas si Hostfully las expone. */
  reviews?: Array<{ author?: string; text?: string; rating?: number; date?: string }>;
  /** Tipo de propiedad (casa/depto/etc.). */
  propertyType?: string;
  /** Tipo de habitación/unidad si Hostfully la expone. */
  roomType?: string;
  /** Política de cancelación/reserva. */
  cancellationPolicy?: string;
  /** Hora sugerida de check-in. */
  checkInTime?: string;
  /** Hora sugerida de check-out. */
  checkOutTime?: string;
  /** Reglas de la casa. */
  houseRules?: string;
  createdAt: Date;
  updatedAt: Date;
  /** UID de la propiedad en Hostfully (PMS). Si existe, la disponibilidad se consulta al PMS. */
  hostfullyPropertyId?: string;
  /** Id del "holding" en Revyoos (agregador de reseñas Airbnb/Booking/Google). Vincula esta propiedad con sus reseñas importadas. */
  revyoosHoldingId?: string;
  /** UUID del widget Lead (2º argumento de `new Widget` en el snippet Hostfully). */
  hostfullyLeadWidgetUuid?: string;
  /** JSON del objeto de opciones del widget Lead (3º argumento de `new Widget`). */
  hostfullyLeadWidgetOptionsJson?: string;
  /** Id numérico del widget de calendario Orbi (`id` en `new orbiwidget`). */
  hostfullyCalendarWidgetId?: number;
  /** Nombre para el calendario Orbi (opcional; por defecto `title`). */
  hostfullyCalendarWidgetName?: string;
  /** Opciones del snippet `orbiwidget` (0/1 según Hostfully). */
  hostfullyCalendarShowTentative?: number;
  hostfullyCalendarMonthsToDisplay?: number;
  /** Precio por noche por fecha (YYYY-MM-DD). Rellenado por sync desde Hostfully. */
  dailyRates?: Record<string, number>;
  /** Mínimo entre noches disponibles futuras (cron de precios 1×/día). Para "Desde" en tarjetas. */
  lowestAvailableNightlyRate?: number | null;
  /** Última sync de disponibilidad desde Hostfully (~20 min). */
  availabilitySyncedAt?: Date;
  /** Última sync de precios (cron 1×/día). */
  pricesSyncedAt?: Date;
  /** Noches mínimas por reserva. Si falta, el sitio usa 1. */
  minNights?: number;
  /**
   * Id de la propiedad padre (la casa completa) si esta es una unidad suya.
   * Reservar el padre bloquea sus hijas y reservar cualquier hija bloquea al padre;
   * las hijas entre sí no se bloquean. `null` desvincula (Firestore ignora `undefined`).
   */
  parentPropertyId?: string | null;
}

export type { PropertyListItem } from "@/lib/property-list-item";

export type PropertyReviewChannel =
  | "airbnb"
  | "booking"
  | "google"
  | "vrbo"
  | "tripadvisor"
  | "other";

export interface PropertyReview {
  id: string;
  propertyId: string;
  channel: PropertyReviewChannel;
  author: string;
  rating: number;
  text: string;
  reviewDate?: string;
  locale?: "es" | "en";
  screenshotUrl: string;
  sourceUrl?: string;
  status: "draft" | "published";
  sortOrder: number;
  createdAt: Date;
  extractedBy?: "ai" | "manual";
}

/** Promedio y cantidad de opiniones de una plataforma (captura del resumen, p. ej. Google). */
export interface PropertyReviewPlatformStat {
  id: string;
  propertyId: string;
  channel: PropertyReviewChannel;
  averageRating: number;
  reviewCount: number;
  screenshotUrl: string;
  status: "draft" | "published";
  createdAt: Date;
  extractedBy?: "ai" | "manual";
}

/** Reseña importada desde Revyoos (agregador conectado a Airbnb/Booking/Google). */
export interface RevyoosReview {
  id: string;
  /** Id de la reseña en Revyoos (`_id`); clave de deduplicación en cada sync. */
  externalId: string;
  propertyId: string;
  platform: PropertyReviewChannel;
  author: string;
  avatarUrl?: string;
  /** Ya normalizado por Revyoos a escala 0-5. */
  rating: number;
  title?: string;
  text: string;
  ownerResponse?: string;
  lang?: string;
  reviewDate: Date;
  sourceUrl?: string;
  /** Controla si aparece en la pestaña de reseñas de su propiedad. Default en reseñas nuevas: 'draft'. */
  status: "draft" | "published";
  /** Controla si aparece en el carrusel del inicio. Independiente de `status`. */
  featuredOnHome: boolean;
  /** Texto editado por el admin; si existe, se muestra en vez de `text`. `text` (original de la plataforma) nunca se toca. */
  displayText?: string;
}

export interface Reservation {
  id: string;
  propertyId: string;
  guestName: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalAmount: number;
  /** Moneda e importe cobrado por Stripe (puede diferir de totalAmount en USD). Opcional en documentos antiguos. */
  paidCurrency?: string;
  paidAmount?: number;
  /** Idioma del huésped al reservar (se exporta a Hostfully para que sus mensajes lleguen en este idioma). */
  locale?: 'es' | 'en';
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
  /** Vínculo de trazabilidad con el lead creado en Hostfully. */
  hostfullyLeadUid?: string;
  hostfullySyncedAt?: Date;
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

export type ServiceProviderType = "manual" | "ical" | "api";

export interface Service {
  id: string;
  title: string;
  description: string;
  image: string;
  externalLink: string;
  featured: boolean;
  slug?: string;
  providerType?: ServiceProviderType;
  providerConfig?: Record<string, string>;
  availability?: Record<string, boolean>;
  dailyRates?: Record<string, number>;
  capacityPerSlot?: number;
  durationMinutes?: number;
  priceFrom?: number;
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
  /** Si se define, el testimonio también aparece en la ficha de esa propiedad. */
  propertyId?: string;
  /** Plataforma donde el huésped dejó la reseña original. */
  platform?: PropertyReviewChannel;
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
  type: 'text' | 'textarea' | 'image' | 'url' | 'imageGallery';
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