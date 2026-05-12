import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PropertyPageContent from '@/components/property-page-content';
import { getPropertyBySlugAdmin } from '@/lib/firebase-admin-queries';
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';
import {
  getLocalizedPropertyAmenities,
  getLocalizedPropertyDescription,
  getLocalizedPropertyTitle,
} from '@/lib/property-localization';
import {
  listingSearchQueryFromServerSearchParams,
  listingSearchSelectionFromServerSearchParams,
} from '@/lib/listing-search-params';

export const dynamic = "force-dynamic";

const getCachedPropertyBySlug = unstable_cache(
  async (slug: string) => getPropertyBySlugAdmin(slug),
  ['public-property-by-slug'],
  { revalidate: 300, tags: ['properties'] }
);

interface PropertyPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getCachedPropertyBySlug(slug);
  const locale = await getServerLocale();
  const m = messages[locale];

  if (!property) {
    return { title: m.property_not_found_title };
  }

  const propertyTitle = getLocalizedPropertyTitle(property, locale);
  const rawDesc = getLocalizedPropertyDescription(property, locale);
  const description = rawDesc.length > 157 ? rawDesc.slice(0, 157) + '…' : rawDesc;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const canonicalUrl = `${siteUrl}/properties/${property.slug}`;

  return {
    title: `${propertyTitle} — Punta Norte Rentals`,
    description,
    keywords: [propertyTitle, 'renta vacacional', 'Punta Norte', 'México', `hasta ${property.maxGuests} huéspedes`],
    robots: { index: true, follow: true },
    openGraph: {
      title: `${propertyTitle} | Punta Norte Rentals`,
      description,
      url: canonicalUrl,
      type: 'website',
      images: property.images[0]
        ? [{ url: property.images[0], width: 1200, height: 630, alt: propertyTitle }]
        : [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: propertyTitle }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: `${propertyTitle} | Punta Norte Rentals`,
      description,
      images: [property.images[0] || `${siteUrl}/og-image.png`],
    },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function PropertyPage({
  params,
  searchParams,
}: PropertyPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const listQs = listingSearchQueryFromServerSearchParams(sp);
  const listingSearchSelection = listingSearchSelectionFromServerSearchParams(sp);
  const backHref = listQs ? `/properties?${listQs}` : '/properties';
  const property = await getCachedPropertyBySlug(slug);
  const locale = await getServerLocale();
  const m = messages[locale];

  if (!property) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const propertyTitle = getLocalizedPropertyTitle(property, locale);
  const amenities = getLocalizedPropertyAmenities(property, locale);
  const propertyJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    name: propertyTitle,
    description: getLocalizedPropertyDescription(property, locale),
    url: `${siteUrl}/properties/${property.slug}`,
    image: property.images.slice(0, 5),
    numberOfRooms: property.bedrooms ?? undefined,
    occupancy: { '@type': 'QuantitativeValue', maxValue: property.maxGuests },
    amenityFeature: amenities.map((a) => ({
      '@type': 'LocationFeatureSpecification',
      name: a,
      value: true,
    })),
    priceRange: property.pricePerNight ? `Desde $${property.pricePerNight} USD/noche` : undefined,
    address: { '@type': 'PostalAddress', addressCountry: 'MX', addressRegion: 'Punta Norte' },
    containedInPlace: { '@type': 'LodgingBusiness', name: 'Punta Norte Rentals', url: siteUrl },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(propertyJsonLd) }}
      />
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button asChild variant="ghost" className="mb-4">
            <Link href={backHref}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {m.property_breadcrumb_back}
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PropertyPageContent property={property} initialSearch={listingSearchSelection} />
      </div>
    </div>
  );
}