"use client";

import { useState } from "react";
import { Property, PropertyReview, PropertyReviewPlatformStat, Testimonial } from "@/lib/types";
import { Users, BedDouble, Bath } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PropertyGallery from "@/components/ui/property-gallery";
import PropertyBody from "@/components/ui/property-body";
import PropertyBedsList from "@/components/ui/property-beds-list";
import { normalizeBeds } from "@/lib/property-beds";
import { roundForDisplay } from "@/lib/round-display-money";
import { getUsdDisplayMultiplier } from "@/lib/display-exchange-rate";
import { useLocale } from "@/components/providers/locale-provider";
import { getLocalizedPropertyTitle } from "@/lib/property-localization";
import type { ListingSearchSelection } from "@/lib/listing-search-params";
import { parseCurrency } from "@/lib/parse-currency";
import type { Currency } from "@/components/ui/currency-select";
import { useExchangeRates } from "@/hooks/use-exchange-rates";

interface PropertyPageContentProps {
  property: Property;
  curatedReviews: PropertyReview[];
  platformStats?: PropertyReviewPlatformStat[];
  globalReviewAggregate?: { averageRating: number; reviewCount: number } | null;
  propertyTestimonials?: Testimonial[];
  initialSearch?: ListingSearchSelection;
}

export default function PropertyPageContent({
  property,
  curatedReviews,
  platformStats = [],
  globalReviewAggregate = null,
  propertyTestimonials = [],
  initialSearch,
}: PropertyPageContentProps) {
  const { t, locale } = useLocale();
  const propertyTitle = getLocalizedPropertyTitle(property, locale);
  const configuredBeds = normalizeBeds(property.beds) ?? [];
  const [currency, setCurrency] = useState<Currency>(() =>
    parseCurrency(initialSearch?.currency)
  );
  const { usdMxnRate, usdEurRate } = useExchangeRates(currency);

  const baseNightlyUsd = property.pricePerNight;
  const displayMult = getUsdDisplayMultiplier(currency, usdMxnRate, usdEurRate);
  const pricePerNight =
    currency === "USD"
      ? baseNightlyUsd
      : roundForDisplay(baseNightlyUsd * displayMult, currency);

  return (
    <div className="space-y-8">
      <PropertyGallery images={property.images} title={propertyTitle} />

      {/* Título y datos bajo la galería */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {property.featured && (
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
              {t("property_featured", "Featured")}
            </Badge>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {propertyTitle}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm md:text-base">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {property.maxGuests}{" "}
            {property.maxGuests === 1
              ? t("property_guest_singular", "guest")
              : t("property_guests", "guests")}
          </span>
          {property.bedrooms != null && (
            <span className="flex items-center gap-1.5">
              <BedDouble className="w-4 h-4" />
              {property.bedrooms}{" "}
              {property.bedrooms === 1
                ? t("property_bedroom_one", "bedroom")
                : t("property_bedroom_other", "bedrooms")}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1.5">
              <Bath className="w-4 h-4" />
              {property.bathrooms}{" "}
              {property.bathrooms === 1
                ? t("property_bath_one", "bath")
                : t("property_bath_other", "baths")}
            </span>
          )}
          {configuredBeds.length > 0 && (
            <span className="flex items-center gap-1.5">
              <BedDouble className="w-4 h-4" />
              {configuredBeds.length}{" "}
              {configuredBeds.length === 1
                ? t("bed_count_one", "bed")
                : t("bed_count_other", "beds")}
            </span>
          )}
        </div>
        <PropertyBedsList beds={configuredBeds} className="mt-3" />
      </div>

      <PropertyBody
        property={property}
        curatedReviews={curatedReviews}
        platformStats={platformStats}
        globalReviewAggregate={globalReviewAggregate}
        propertyTestimonials={propertyTestimonials}
        initialSearch={initialSearch}
        currency={currency}
        onCurrencyChange={setCurrency}
        pricePerNightDisplay={pricePerNight}
        usdMxnRate={usdMxnRate}
        usdEurRate={usdEurRate}
      />
    </div>
  );
}
