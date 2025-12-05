import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PropertyGallery from '@/components/ui/property-gallery';
import PropertyBody from '@/components/ui/property-body'; // <--- Importamos el nuevo componente
import { getPropertyBySlug } from '@/lib/firebase/properties';

interface PropertyPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

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
  const property = await getPropertyBySlug(slug);

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
          {/* Property Header (Server Side Rendered para SEO) */}
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

          {/* Body Interactivo (Client Side) */}
          <PropertyBody property={property} />
        </div>
      </div>
    </div>
  );
}