import { Suspense } from 'react';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import SearchForm from '@/components/ui/search-form';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getAdminProperties,
  getSiteContentBySectionAdmin,
  searchPropertiesAdmin,
} from '@/lib/firebase-admin-queries';
import { Property, SearchParams } from '@/lib/types';
import PropertiesMapLayout from '@/components/ui/properties-map-layout';
import { tServer } from '@/lib/i18n/server';

function contentMap(items: { key: string; value: string }[]) {
  return Object.fromEntries(items.map((i) => [i.key, i.value]));
}

export const dynamic = "force-dynamic";

const getCachedProperties = unstable_cache(
  async () => getAdminProperties(),
  ['public-properties'],
  { revalidate: 300, tags: ['properties'] }
);

const getCachedPropertiesPageContent = unstable_cache(
  async () => getSiteContentBySectionAdmin('properties_page'),
  ['properties-page-content'],
  { revalidate: 300, tags: ['site-content'] }
);

export const metadata: Metadata = {
  title: 'Propiedades Vacacionales',
  description: 'Explora nuestra colección completa de propiedades vacacionales excepcionales en destinos únicos.',
  openGraph: {
    title: 'Propiedades Vacacionales | Punta Norte Rentals',
    description: 'Explora nuestra colección completa de propiedades vacacionales excepcionales en destinos únicos.',
  },
};

interface PropertiesPageProps {
  searchParams: Promise<SearchParams>;
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
  const params = searchParams ?? {};
  let properties: Property[];
  const hasSearchParams = Object.keys(params).length > 0;

  try {
    if (hasSearchParams) {
      const paramsForSearch: SearchParams = {
        ...params,
        guests: params.guests ? Number(params.guests) : undefined,
      };
      properties = await searchPropertiesAdmin(paramsForSearch);
    } else {
      properties = await getCachedProperties();
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("[Properties]", error);
    }
    properties = [];
  }

  if (!Array.isArray(properties) || properties.length === 0) {
    const emptyTitle = await tServer(
      hasSearchParams ? 'properties_empty_search_title' : 'properties_empty_title',
      hasSearchParams ? 'No properties found' : 'No properties yet'
    );
    const emptySubtitle = await tServer(
      hasSearchParams ? 'properties_empty_search_subtitle' : 'properties_empty_subtitle',
      hasSearchParams
        ? 'Try adjusting your search filters.'
        : 'Come back soon or load properties from the admin panel.'
    );
    return (
      <div className="text-center py-12 col-span-1 md:col-span-2 lg:col-span-3">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {emptyTitle}
        </h3>
        <p className="text-gray-600">
          {emptySubtitle}
        </p>
      </div>
    );
  }

  return <PropertiesMapLayout properties={properties} />;
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const params = (await searchParams) ?? {};
  const pageContent = await getCachedPropertiesPageContent();
  const c = contentMap(pageContent);
  const hasFilters = Object.keys(params).length > 0;
  const numericSearchParams: SearchParams = {
    ...params,
    guests: params.guests ? Number(params.guests) : undefined,
  };

  const pageTitle = await tServer(
    hasFilters ? 'properties_title_results' : 'properties_title_all',
    hasFilters ? 'Search Results' : 'All Properties'
  );
  const pageSubtitle = await tServer(
    hasFilters ? 'properties_subtitle_results' : 'properties_subtitle_all',
    hasFilters ? 'Properties matching your search' : 'Browse our curated collection of premium vacation stays.'
  );
  const finalTitle = hasFilters
    ? c.properties_title_results?.trim() || pageTitle
    : c.properties_title_all?.trim() || pageTitle;
  const finalSubtitle = hasFilters
    ? c.properties_subtitle_results?.trim() || pageSubtitle
    : c.properties_subtitle_all?.trim() || pageSubtitle;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {finalTitle}
            </h1>
            <p className="text-lg text-gray-600">
              {finalSubtitle}
            </p>
          </div>
          <Suspense fallback={<Skeleton className="h-56 w-full max-w-4xl mx-auto rounded-xl" />}>
            <SearchForm />
          </Suspense>
        </div>
      </div>

      {/* Properties + Map */}
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
          <PropertiesList searchParams={numericSearchParams} />
        </Suspense>
      </div>
    </div>
  );
}