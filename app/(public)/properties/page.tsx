import { Suspense } from 'react';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import SearchForm from '@/components/ui/search-form';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getAdminPropertiesForList,
  getSiteContentBySectionAdmin,
  searchPropertiesForList,
} from '@/lib/firebase-admin-queries';
import { SearchParams } from '@/lib/types';
import type { PropertyListItem } from '@/lib/property-list-item';
import PropertiesMapLayout from '@/components/ui/properties-map-layout';
import { getServerLocale, tServer } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';
import type { Locale } from '@/lib/i18n/messages';
import { contentMap, pickSiteContent } from '@/lib/site-content-localization';
import { listingSearchHasAnyActiveFilters } from '@/lib/listing-search-params';

export const revalidate = 300;

const getCachedProperties = unstable_cache(
  async () => getAdminPropertiesForList(),
  ['public-properties'],
  { revalidate: 300, tags: ['properties'] }
);

const getCachedPropertiesPageContent = unstable_cache(
  async () => getSiteContentBySectionAdmin('properties_page'),
  ['properties-page-content'],
  { revalidate: 300, tags: ['site-content'] }
);

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const title =
    locale === 'en'
      ? 'All Vacation Rentals in Isla Mujeres'
      : 'Todas las Rentas Vacacionales en Isla Mujeres';
  const description =
    locale === 'en'
      ? 'Browse studios, apartments, and vacation homes in Isla Mujeres. Near Playa Norte, Punta Norte, and Hidalgo street. Groups, couples, and families welcome. From $44 USD/night.'
      : 'Explora estudios, apartamentos y casas vacacionales en Isla Mujeres. Cerca de Playa Norte, Punta Norte y la peatonal Hidalgo. Para grupos, parejas y familias. Desde $44 USD/noche.';
  const keywords =
    locale === 'en'
      ? ['vacation rentals Isla Mujeres', 'studios Isla Mujeres', 'family apartments Isla Mujeres', 'near Playa Norte', 'Punta Norte rentals', 'Quintana Roo vacation']
      : ['rentas vacacionales Isla Mujeres', 'estudios Isla Mujeres', 'apartamentos familiares Isla Mujeres', 'cerca de Playa Norte', 'rentas Punta Norte', 'renta zona céntrica Isla Mujeres'];

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: `${title} | Punta Norte Rentals`,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
    alternates: { canonical: '/properties' },
  };
}

interface PropertiesPageProps {
  searchParams: Promise<SearchParams>;
}

async function loadPropertiesForPage(
  params: SearchParams,
  hasFilters: boolean
): Promise<PropertyListItem[]> {
  try {
    if (hasFilters) {
      return await searchPropertiesForList(params);
    }
    return await getCachedProperties();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Properties]', error);
    }
    return [];
  }
}

function buildResultsMessage(
  locale: Locale,
  hasFilters: boolean,
  count: number,
  emptyTitle: string,
  emptySubtitle: string
): string | null {
  if (!hasFilters) return null;
  if (count === 0) return `${emptyTitle}. ${emptySubtitle}`;
  const L = messages[locale];
  if (count === 1) return L.properties_results_found_one;
  return L.properties_results_found.replace('{count}', String(count));
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const locale = await getServerLocale();
  const params = (await searchParams) ?? {};
  const pageContent = await getCachedPropertiesPageContent();
  const c = contentMap(pageContent);
  const hasFilters = listingSearchHasAnyActiveFilters(params);
  const numericSearchParams: SearchParams = {
    ...params,
    guests: params.guests ? Number(params.guests) : undefined,
  };

  const properties = await loadPropertiesForPage(numericSearchParams, hasFilters);

  const pageTitle = await tServer(
    hasFilters ? 'properties_title_results' : 'properties_title_all',
    hasFilters ? 'Search Results' : 'All Properties'
  );
  const pageSubtitle = await tServer(
    hasFilters ? 'properties_subtitle_results' : 'properties_subtitle_all',
    hasFilters ? 'Properties matching your search' : 'Browse our curated collection of premium vacation stays.'
  );
  const emptyTitle = await tServer(
    'properties_empty_search_title',
    'No properties found'
  );
  const emptySubtitle = await tServer(
    'properties_empty_search_subtitle',
    'Try adjusting your search filters.'
  );
  const titleKey = hasFilters ? 'properties_title_results' : 'properties_title_all';
  const subtitleKey = hasFilters ? 'properties_subtitle_results' : 'properties_subtitle_all';
  const finalTitle = pickSiteContent(c, titleKey, locale, pageTitle);
  const finalSubtitle = pickSiteContent(c, subtitleKey, locale, pageSubtitle);
  const resultsMessage = buildResultsMessage(
    locale,
    hasFilters,
    properties.length,
    emptyTitle,
    emptySubtitle
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {finalTitle}
            </h1>
            <p className="text-lg text-gray-600">{finalSubtitle}</p>
          </div>
          <Suspense fallback={<Skeleton className="h-56 w-full max-w-4xl mx-auto rounded-xl" />}>
            <SearchForm
              defaultCollapsed={hasFilters}
              resultsMessage={resultsMessage}
            />
          </Suspense>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-1">
        {properties.length === 0 ? (
          hasFilters ? null : (
            <div className="text-center py-12 col-span-1 md:col-span-2 lg:col-span-3">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {await tServer('properties_empty_title', 'No properties yet')}
              </h3>
              <p className="text-gray-600">
                {await tServer(
                  'properties_empty_subtitle',
                  'Come back soon or load properties from the admin panel.'
                )}
              </p>
            </div>
          )
        ) : (
          <PropertiesMapLayout properties={properties} />
        )}
      </div>
    </div>
  );
}
