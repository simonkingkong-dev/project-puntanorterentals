import { Suspense } from 'react';
import type { Metadata } from 'next'; // CORREGIDO: Importación de tipo
import PropertyCard from '@/components/ui/property-card';
import SearchForm from '@/components/ui/search-form';
import { Skeleton } from '@/components/ui/skeleton';
// CORREGIDO: Importamos ambas funciones de Firebase
import { getProperties, searchProperties } from '@/lib/firebase/properties';
import { Property, SearchParams } from '@/lib/types'; // CORREGIDO: Importar tipo Property

export const metadata: Metadata = {
  title: 'Propiedades Vacacionales',
  description: 'Explora nuestra colección completa de propiedades vacacionales excepcionales en destinos únicos.',
  openGraph: {
    title: 'Propiedades Vacacionales | Punta Norte Rentals', // CORREGIDO: Nombre del proyecto
    description: 'Explora nuestra colección completa de propiedades vacacionales excepcionales en destinos únicos.',
  },
};

// CORREGIDO: Eliminamos el array 'mockProperties'

interface PropertiesPageProps {
  // CORREGIDO: Usamos el tipo SearchParams para mayor claridad
  searchParams: SearchParams; 
}

/**
 * Renders a skeleton screen for a property listing page.
 */
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

/**
 * Renders a list of properties based on the provided search parameters.
 */
async function PropertiesList({ searchParams }: { searchParams: SearchParams }) {
  
  let properties: Property[]; // CORREGIDO: Tipamos el array
  const hasSearchParams = Object.keys(searchParams).length > 0;

  try {
    // CORREGIDO: Llamamos a Firebase basado en si hay filtros o no
    if (hasSearchParams) {
      // Convertimos 'guests' a número si existe
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
    properties = []; // Si hay error, mostramos lista vacía
  }


  // CORREGIDO: Aseguramos que 'properties' sea un array antes de verificar 'length'
  if (!Array.isArray(properties) || properties.length === 0) {
    return (
      <div className="text-center py-12 col-span-1 md:col-span-2 lg:col-span-3"> {/* Ocupa todo el ancho */}
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

  // El renderizado de la cuadrícula permanece igual
  return (
    <> {/* Usamos Fragment para poder retornar múltiples PropertyCard */}
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </>
  );
}

/**
 * Renders the properties page, displaying a list of properties with optional filters.
 */
export default function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const hasFilters = Object.keys(searchParams).length > 0;
  // Convertimos guests a número para pasarlo a PropertiesList
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
            {/* CORREGIDO: Mensaje más dinámico */}
            <p className="text-lg text-gray-600">
              {hasFilters 
                ? 'Propiedades que coinciden con tu búsqueda'
                // Podríamos obtener el número total de props aquí si fuera necesario
                : 'Descubre nuestra colección completa de propiedades excepcionales' 
              }
            </p>
          </div>

           {/* El SearchForm ya estaba bien */}
           <SearchForm />
        </div>
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Suspense 
            fallback={
              <> {/* Usamos Fragment */}
                {Array.from({ length: 6 }, (_, i) => (
                  <PropertySkeleton key={i} />
                ))}
              </>
            }
          >
            {/* CORREGIDO: Pasamos los searchParams numéricos */}
            <PropertiesList searchParams={numericSearchParams} /> 
          </Suspense>
        </div>
      </div>
    </div>
  );
}