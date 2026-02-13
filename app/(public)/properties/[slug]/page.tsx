import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PropertyPageContent from '@/components/property-page-content';
import { getPropertyBySlugAdmin } from '@/lib/firebase-admin-queries';

interface PropertyPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlugAdmin(slug);

  if (!property) {
    return { title: 'Propiedad no encontrada' };
  }

  return {
    title: property.title,
    description: property.description.slice(0, 160) + '...',
    openGraph: {
      title: property.title + ' | Punta Norte Rentals',
      description: property.description.slice(0, 160) + '...',
      images: [
        {
          url: property.images[0] || '',
          width: 1200,
          height: 630,
          alt: property.title,
        },
      ],
    },
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const property = await getPropertyBySlugAdmin(slug);

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
        <PropertyPageContent property={property} />
      </div>
    </div>
  );
}