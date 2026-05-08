import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PropertyPageContent from '@/components/property-page-content';
import { getPropertyBySlugAdmin } from '@/lib/firebase-admin-queries';
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';
import { getLocalizedPropertyTitle } from '@/lib/property-localization';
import { listingSearchQueryFromServerSearchParams } from '@/lib/listing-search-params';

export const dynamic = "force-dynamic";

interface PropertyPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlugAdmin(slug);
  const locale = await getServerLocale();
  const m = messages[locale];

  if (!property) {
    return { title: m.property_not_found_title };
  }

  const description = property.description.length > 157
    ? property.description.slice(0, 157) + '...'
    : property.description;
  const propertyTitle = getLocalizedPropertyTitle(property, locale);

  return {
    title: propertyTitle,
    description,
    openGraph: {
      title: propertyTitle + ' | Punta Norte Rentals',
      description,
      images: [
        {
          url: property.images[0] || '',
          width: 1200,
          height: 630,
          alt: propertyTitle,
        },
      ],
    },
  };
}

export default async function PropertyPage({
  params,
  searchParams,
}: PropertyPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const listQs = listingSearchQueryFromServerSearchParams(sp);
  const backHref = listQs ? `/properties?${listQs}` : '/properties';
  const property = await getPropertyBySlugAdmin(slug);
  const locale = await getServerLocale();
  const m = messages[locale];

  if (!property) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
        <PropertyPageContent property={property} />
      </div>
    </div>
  );
}