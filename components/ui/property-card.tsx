"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Users, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PropertyListItem } from '@/lib/property-list-item';
import { remoteImageShouldBypassOptimization } from '@/lib/remote-image';
import { useLocale } from '@/components/providers/locale-provider';
import {
  getLocalizedPropertyAmenities,
  getLocalizedPropertyDescription,
  getLocalizedPropertyTitle,
} from '@/lib/property-localization';
import { listingSearchQueryFromURLSearchParams } from '@/lib/listing-search-params';

interface PropertyCardProps {
  property: PropertyListItem;
  /** Primera imagen above-the-fold (LCP): carga prioritaria. */
  imagePriority?: boolean;
}

/**
 * Renders a card component displaying property details, including images, title, location, capacity, description,
 * price per night, and amenities.
 * @example
 * PropertyCard({ property: sampleProperty })
 * <PropertyCard property={sampleProperty} />
 * @param {Object} {property} - Object containing property details such as title, location, maxGuests, description,
 * pricePerNight, amenities, images, and slug. The property title is displayed, the first image is shown (or a default
 * image if not available), and a redirect link is generated using the property slug.
 * @returns {JSX.Element} A JSX.Element rendering a styled property card with dynamically loaded content.
 */
export default function PropertyCard({ property, imagePriority = false }: PropertyCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingQs = listingSearchQueryFromURLSearchParams(searchParams);
  const detailHref = listingQs
    ? `/properties/${property.slug}?${listingQs}`
    : `/properties/${property.slug}`;
  const { locale, t } = useLocale();
  const images = property.images && property.images.length > 0
    ? property.images
    : ['https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg'];
  const propertyTitle = getLocalizedPropertyTitle(property, locale);
  const propertyDescription = getLocalizedPropertyDescription(property, locale);
  const amenities = getLocalizedPropertyAmenities(property, locale);
  const nightlyRate = property.displayNightlyRate;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const openPropertyDetail = () => {
    router.push(detailHref);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.currentTarget !== e.target) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPropertyDetail();
    }
  };

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
    <Card
      role="link"
      tabIndex={0}
      onClick={openPropertyDetail}
      onKeyDown={handleCardKeyDown}
      className="overflow-hidden group md:hover:shadow-xl md:transition-shadow md:duration-300 md:hover:-translate-y-1 cursor-pointer border-0 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
        <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
          <Image
            src={images[currentImageIndex]}
            alt={propertyTitle}
            fill
            className="object-cover md:group-hover:scale-105 md:transition-transform md:duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            quality={70}
            priority={imagePriority}
            unoptimized={remoteImageShouldBypassOptimization(images[currentImageIndex])}
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={showPrevImage}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
                aria-label={t('property_card_prev_image', 'Previous image')}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={showNextImage}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
                aria-label={t('property_card_next_image', 'Next image')}
              >
                ›
              </button>
            </>
          )}
          {property.featured && (
            <Badge className="absolute top-4 left-4 z-10 bg-orange-500 hover:bg-orange-600 text-white border-0">
              <Star className="w-3 h-3 mr-1" />
              {t('property_featured', 'Featured')}
            </Badge>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
              {propertyTitle}
            </h3>
            
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span className="text-sm">
                {t('property_card_up_to_guests', 'Up to {n} guests').replace('{n}', String(property.maxGuests))}
              </span>
            </div>
            
            <p className="text-gray-600 text-sm line-clamp-2">
              {propertyDescription}
            </p>
            
            <div className="flex items-start justify-between gap-3 pt-2 border-t">
              {nightlyRate != null && (
                <div className="shrink-0">
                  <p className="text-xs text-gray-500">
                    {t('property_card_from', 'Desde')}
                  </p>
                  <p className="text-base font-bold text-gray-900 leading-tight">
                    ${Math.round(nightlyRate).toLocaleString('en-US')}
                    <span className="text-xs font-medium text-gray-500"> {t('property_card_per_night', 'USD/night')}</span>
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {amenities.slice(0, 2).map((amenity, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
                {amenities.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{amenities.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
    </Card>
  );
}