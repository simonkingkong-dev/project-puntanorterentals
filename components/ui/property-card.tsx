 "use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Users, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Property } from '@/lib/types';

interface PropertyCardProps {
  property: Property;
}

/**
 * Renders a card component displaying property details, including images, title, location, capacity, description,
 * price per night, and amenities.
 * @example
 * PropertyCard({ property: sampleProperty })
 * <Link href="/properties/sample-slug">
 *   ...card content...
 * </Link>
 * @param {Object} {property} - Object containing property details such as title, location, maxGuests, description,
 * pricePerNight, amenities, images, and slug. The property title is displayed, the first image is shown (or a default
 * image if not available), and a redirect link is generated using the property slug.
 * @returns {JSX.Element} A JSX.Element rendering a styled property card with dynamically loaded content.
 */
export default function PropertyCard({ property }: PropertyCardProps) {
  const images = property.images && property.images.length > 0
    ? property.images
    : ['https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg'];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const showPrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const showNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Link href={`/properties/${property.slug}`}>
      <Card className="overflow-hidden group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer border-0 bg-white">
        <div className="relative h-64 overflow-hidden">
          <Image
            src={images[currentImageIndex]}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            unoptimized
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={showPrevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
                aria-label="Imagen anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={showNextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
                aria-label="Imagen siguiente"
              >
                ›
              </button>
            </>
          )}
          {property.featured && (
            <Badge className="absolute top-4 left-4 bg-orange-500 hover:bg-orange-600 text-white border-0">
              <Star className="w-3 h-3 mr-1" />
              Destacado
            </Badge>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        
        <CardContent className="p-6">
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
              {property.title}
            </h3>
            
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{property.location}</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span className="text-sm">Hasta {property.maxGuests} huéspedes</span>
            </div>
            
            <p className="text-gray-600 text-sm line-clamp-2">
              {property.description}
            </p>
            
            <div className="flex items-center justify-end pt-2 border-t">
              <div className="flex flex-wrap gap-1">
                {(property.amenities ?? []).slice(0, 2).map((amenity, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
                {(property.amenities?.length ?? 0) > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{(property.amenities?.length ?? 0) - 2}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}