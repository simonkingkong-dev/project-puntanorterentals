// Archivo: app/(public)/properties/page.tsx (El código público)

import { Suspense } from 'react';
import type { Metadata } from 'next';
import PropertyCard from '@/components/ui/property-card';
import SearchForm from '@/components/ui/search-form';
import { Skeleton } from '@/components/ui/skeleton';
import { getProperties, searchProperties } from '@/lib/firebase/properties';
import { Property, SearchParams } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Propiedades Vacacionales',
  description: 'Explora nuestra colección completa de propiedades vacacionales excepcionales en destinos únicos.',
  openGraph: {
    title: 'Propiedades Vacacionales | Punta Norte Rentals',
    description: 'Explora nuestra colección completa de propiedades vacacionales excepcionales en destinos únicos.',
  },
};

interface PropertiesPageProps {
  searchParams: SearchParams; 
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
  
  let properties: Property[];
  const hasSearchParams = Object.keys(searchParams).length > 0;

  try {
    if (hasSearchParams) {
      const paramsForSearch: SearchParams = {
        ...searchParams,
        guests: searchParams.guests ? Number(searchParams.guests) : undefined,
      };
      properties = await searchProperties(paramsForSearch);
    } else {
      properties = await getProperties();
    }
  } catch (error) {
    console.error("Error fetching properties:", error);
    properties = [];
  }

  if (!Array.isArray(properties) || properties.length === 0) {
    return (
      <div className="text-center py-12 col-span-1 md:col-span-2 lg:col-span-3">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {hasSearchParams ? 'No se encontraron propiedades' : 'Aún no hay propiedades cargadas'}
        </h3>
        <p className="text-gray-600">
          {hasSearchParams 
            ? 'Intenta ajustar tus filtros de búsqueda.' 
            : 'Vuelve pronto o carga propiedades desde el panel de administración.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </>
  );
}

export default function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const hasFilters = Object.keys(searchParams).length > 0;
  const numericSearchParams: SearchParams = {
    ...searchParams,
    guests: searchParams.guests ? Number(searchParams.guests) : undefined,
  };

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
                : 'Descubre nuestra colección completa de propiedades excepcionales' 
              }
            </p>
          </div>
           <SearchForm />
        </div>
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Suspense 
            fallback={
              <>
                {Array.from({ length: 6 }, (_, i) => (
                  <PropertySkeleton key={i} />
                ))}
              </>
            }
          >
            <PropertiesList searchParams={numericSearchParams} /> 
          </Suspense>
        </div>
      </div>
    </div>
  );
}