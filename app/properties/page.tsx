import { Suspense } from 'react';
import { Metadata } from 'next';
import PropertyCard from '@/components/ui/property-card';
import SearchForm from '@/components/ui/search-form';
import { Skeleton } from '@/components/ui/skeleton';
import { getProperties, searchProperties } from '@/lib/firebase/properties';
import { SearchParams } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Propiedades Vacacionales',
  description: 'Explora nuestra colección completa de propiedades vacacionales excepcionales en destinos únicos.',
  openGraph: {
    title: 'Propiedades Vacacionales | Casa Alkimia',
    description: 'Explora nuestra colección completa de propiedades vacacionales excepcionales en destinos únicos.',
  },
};

// Mock data for development
const mockProperties = Array.from({ length: 16 }, (_, i) => ({
  id: `property-${i + 1}`,
  title: `Casa Alkimia ${i + 1}`,
  description: `Una propiedad excepcional que ofrece comodidad y lujo en un entorno único. Perfecta para ${2 + (i % 6)} huéspedes que buscan una experiencia inolvidable.`,
  location: ['Playa del Carmen', 'Tulum', 'Cancún', 'Cozumel'][i % 4] + ', Riviera Maya',
  maxGuests: 2 + (i % 6),
  amenities: ['WiFi', 'A/C', 'Piscina', 'Cocina', 'Estacionamiento'].slice(0, 3 + (i % 3)),
  images: [
    'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg',
    'https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg',
    'https://images.pexels.com/photos/2089698/pexels-photo-2089698.jpeg',
  ],
  pricePerNight: 100 + (i * 25),
  availability: {},
  slug: `casa-alkimia-${i + 1}`,
  featured: i < 3,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

interface PropertiesPageProps {
  searchParams: {
    checkIn?: string;
    checkOut?: string;
    guests?: string;
    location?: string;
  };
}

function PropertySkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}

async function PropertiesList({ searchParams }: { searchParams: SearchParams }) {
  // In production, use actual Firebase data
  let properties = mockProperties;

  // Apply filters based on search params
  if (Object.keys(searchParams).length > 0) {
    properties = await searchProperties(searchParams);
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No se encontraron propiedades
        </h3>
        <p className="text-gray-600">
          Intenta ajustar tus filtros de búsqueda para encontrar más opciones.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}

export default function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const hasFilters = Object.keys(searchParams).length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {hasFilters ? 'Resultados de Búsqueda' : 'Todas las Propiedades'}
            </h1>
            <p className="text-lg text-gray-600">
              {hasFilters 
                ? 'Propiedades que coinciden con tu búsqueda'
                : 'Descubre nuestra colección completa de 16 propiedades excepcionales'
              }
            </p>
          </div>

          <SearchForm />
        </div>
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Suspense 
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }, (_, i) => (
                <PropertySkeleton key={i} />
              ))}
            </div>
          }
        >
          <PropertiesList searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}