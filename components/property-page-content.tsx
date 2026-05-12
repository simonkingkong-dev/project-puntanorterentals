"use client";

import { useEffect, useState } from "react";
import { Property } from "@/lib/types";
import { Users, BedDouble, Bath } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PropertyGallery from "@/components/ui/property-gallery";
import PropertyBody from "@/components/ui/property-body";
import { roundForDisplay } from "@/lib/round-display-money";
import { getUsdDisplayMultiplier } from "@/lib/display-exchange-rate";
import { useLocale } from "@/components/providers/locale-provider";
import { getLocalizedPropertyTitle } from "@/lib/property-localization";
import type { ListingSearchSelection } from "@/lib/listing-search-params";

interface PropertyPageContentProps {
  property: Property;
  initialSearch?: ListingSearchSelection;
}

export default function PropertyPageContent({ property, initialSearch }: PropertyPageContentProps) {
  const { t, locale } = useLocale();
  const propertyTitle = getLocalizedPropertyTitle(property, locale);
  const [currency, setCurrency] = useState<"USD" | "MXN" | "EUR">("USD");
  const [usdMxnRate, setUsdMxnRate] = useState<number | null>(null);
  const [usdEurRate, setUsdEurRate] = useState<number | null>(null);

  useEffect(() => {
    if (currency === "MXN") {
      fetch("/api/exchange-rate?from=USD&to=MXN")
        .then((r) => r.json())
        .then((data) => setUsdMxnRate(data.rate))
        .catch(() => setUsdMxnRate(17.2));
      setUsdEurRate(null);
    } else if (currency === "EUR") {
      fetch("/api/exchange-rate?from=USD&to=EUR")
        .then((r) => r.json())
        .then((data) => setUsdEurRate(data.rate))
        .catch(() => setUsdEurRate(0.92));
      setUsdMxnRate(null);
    } else {
      setUsdMxnRate(null);
      setUsdEurRate(null);
    }
  }, [currency]);

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
        </div>
      </div>

      <PropertyBody
        property={property}
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
