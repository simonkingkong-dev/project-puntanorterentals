import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Users, Wifi, Car, Utensils, Home, Waves, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import PropertyGallery from '@/components/ui/property-gallery';
import AvailabilityCalendar from '@/components/ui/availability-calendar';
import ReservationForm from '@/components/ui/reservation-form';
import { getPropertyBySlug } from '@/lib/firebase/properties';

// Mapeo de íconos (ajustado para coincidir con tu mock)
const amenityIcons: { [key: string]: any } = {
  'WiFi de alta velocidad': Wifi,
  'Aire acondicionado': Home,
  'Cocina equipada': Utensils,
  'Estacionamiento': Car,
  'Piscina comunitaria': Waves,
  'Vista al mar': Waves,
  'Terraza privada': Home,
  'Servicio de limpieza': Home,
  'Seguridad 24/7': Shield,
  'Acceso a playa': Waves,
  default: Home, // Icono por defecto
};

interface PropertyPageProps {
  params: {
    slug: string;
  };
}

/**
 * Genera Metadata dinámica para SEO
 */
export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const property = await getPropertyBySlug(params.slug);

  if (!property) {
    return {
      title: 'Propiedad no encontrada',
    };
  }

  return {
    title: property.title,
    description: property.description.slice(0, 160) + '...',
    openGraph: {
      title: property.title + ' | Punta Norte Rentals',
      description: property.description.slice(0, 160) + '...',
      images: [
        {
          url: property.images[0] || '', // Usa la primera imagen
          width: 1200,
          height: 630,
          alt: property.title,
        },
      ],
    },
  };
}

/**
 * La página ahora es 'async' y obtiene datos reales
 */
export default async function PropertyPage({ params }: PropertyPageProps) {
  // Obtenemos la propiedad real de Firebase usando el slug de la URL
  const property = await getPropertyBySlug(params.slug);

  // Si no se encuentra la propiedad, mostramos la página 404
  if (!property) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/properties">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Propiedades
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Property Header */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {property.featured && (
                <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                  Destacado
                </Badge>
              )}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {property.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{property.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Hasta {property.maxGuests} huéspedes</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${property.pricePerNight} / noche
              </div>
            </div>
          </div>

          {/* Gallery */}
          <PropertyGallery images={property.images} title={property.title} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Property Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Descripción</h2>
                <div className="prose prose-gray max-w-none">
                  {property.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="text-gray-600 leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Amenities */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Amenidades</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {property.amenities.map((amenity, index) => {
                     const IconComponent = amenityIcons[amenity] || amenityIcons.default;
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <IconComponent className="w-5 h-5 text-orange-600" />
                        <span className="text-gray-900">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Calendar */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Disponibilidad</h2>
                <AvailabilityCalendar
                  property={property}
                  onDateSelect={(dates) => {
                    console.log('Selected dates:', dates);
                  }}
                />
              </div>
            </div>

            {/* Reservation Form */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <ReservationForm
                  property={property}
                  onReservationComplete={() => {
                    console.log('Reservation completed');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}