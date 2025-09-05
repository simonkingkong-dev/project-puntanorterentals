import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Users, Wifi, Car, Utensils, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import PropertyGallery from '@/components/ui/property-gallery';
import AvailabilityCalendar from '@/components/ui/availability-calendar';
import ReservationForm from '@/components/ui/reservation-form';
import { getPropertyBySlug } from '@/lib/firebase/properties';

// Mock data for development
const mockProperty = {
  id: 'casa-alkimia-suite-ocean-view',
  title: 'Casa Alkimia Suite Ocean View',
  description: `Una suite espectacular con vista panorámica al océano Caribe. Esta propiedad excepcional combina elegancia moderna con comodidades tropicales, creando el ambiente perfecto para una escapada romántica o unas vacaciones relajantes.

La suite cuenta con amplios espacios interiores y exteriores, incluyendo una terraza privada con vista al mar donde podrás disfrutar de espectaculares amaneceres y atardeceres. La decoración cuidadosamente seleccionada refleja la belleza natural del entorno mientras proporciona todas las comodidades modernas que necesitas.

Ubicada en una de las zonas más exclusivas de Playa del Carmen, tendrás acceso directo a playas de arena blanca y aguas turquesas, así como a los mejores restaurantes, bares y atracciones de la Riviera Maya.`,
  location: 'Playa del Carmen, Riviera Maya',
  maxGuests: 4,
  amenities: [
    'WiFi de alta velocidad',
    'Aire acondicionado',
    'Piscina comunitaria',
    'Vista al mar',
    'Cocina equipada',
    'Terraza privada',
    'Estacionamiento',
    'Servicio de limpieza',
    'Seguridad 24/7',
    'Acceso a playa'
  ],
  images: [
    'https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg',
    'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg',
    'https://images.pexels.com/photos/2089698/pexels-photo-2089698.jpeg',
    'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg',
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg',
    'https://images.pexels.com/photos/1643384/pexels-photo-1643384.jpeg',
  ],
  pricePerNight: 150,
  availability: {
    '2024-12-25': false,
    '2024-12-26': false,
    '2024-12-31': false,
    '2025-01-01': false,
  },
  slug: 'casa-alkimia-suite-ocean-view',
  featured: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const amenityIcons: { [key: string]: any } = {
  'WiFi de alta velocidad': Wifi,
  'Aire acondicionado': Home,
  'Cocina equipada': Utensils,
  'Estacionamiento': Car,
  default: Home,
};

interface PropertyPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  // In production, fetch actual property data
  const property = mockProperty;

  if (!property) {
    return {
      title: 'Propiedad no encontrada',
    };
  }

  return {
    title: property.title,
    description: property.description.slice(0, 160) + '...',
    openGraph: {
      title: property.title + ' | Casa Alkimia',
      description: property.description.slice(0, 160) + '...',
      images: [
        {
          url: property.images[0],
          width: 1200,
          height: 630,
          alt: property.title,
        },
      ],
    },
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  // In production, fetch from Firebase
  const property = params.slug === mockProperty.slug ? mockProperty : null;

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
                  {property.description.split('\n\n').map((paragraph, index) => (
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
                    // Handle date selection
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
                    // Handle reservation completion
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