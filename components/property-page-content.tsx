"use client";

import { useEffect, useState } from "react";
import { Property, BedType } from "@/lib/types";
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

function BedIcon({ type }: { type: BedType }) {
  switch (type) {
    case "bunk":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <rect x="3" y="4" width="18" height="8" rx="1" /><line x1="3" y1="8" x2="21" y2="8" />
          <rect x="3" y="12" width="18" height="8" rx="1" /><line x1="3" y1="16" x2="21" y2="16" />
        </svg>
      );
    case "single":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <rect x="5" y="10" width="14" height="10" rx="1" /><path d="M7 10V8a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" /><line x1="5" y1="15" x2="19" y2="15" />
        </svg>
      );
    case "double":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <rect x="3" y="10" width="18" height="10" rx="1" /><path d="M5 10V8a1 1 0 0 1 1-1h5v3" /><path d="M19 10V8a1 1 0 0 0-1-1h-5v3" /><line x1="3" y1="15" x2="21" y2="15" />
        </svg>
      );
    case "queen":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <rect x="2" y="10" width="20" height="10" rx="1" /><path d="M4 10V8a1 1 0 0 1 1-1h6v3" /><path d="M20 10V8a1 1 0 0 0-1-1h-6v3" /><line x1="2" y1="15" x2="22" y2="15" /><circle cx="12" cy="5" r="1.5" />
        </svg>
      );
    case "king":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <rect x="1" y="10" width="22" height="10" rx="1" /><path d="M3 10V8a1 1 0 0 1 1-1h7v3" /><path d="M21 10V8a1 1 0 0 0-1-1h-7v3" /><line x1="1" y1="15" x2="23" y2="15" /><path d="M12 3l-2 4h4l-2-4z" />
        </svg>
      );
    default:
      return <BedDouble className="w-4 h-4" />;
  }
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
          {property.beds && property.beds.length > 0 && (
            <span className="flex items-center gap-1.5">
              <BedDouble className="w-4 h-4" />
              {property.beds.length}{" "}
              {property.beds.length === 1
                ? t("bed_count_one", "bed")
                : t("bed_count_other", "beds")}
            </span>
          )}
        </div>
        {property.beds && property.beds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {property.beds.map((bed, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
              >
                <BedIcon type={bed} />
                {t(`bed_${bed}`, bed)}
              </span>
            ))}
          </div>
        )}
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
