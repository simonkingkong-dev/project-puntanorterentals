"use client";

import { useState, useEffect } from "react";
import { Property } from "@/lib/types";
import { MapPin, Users, BedDouble, Bath } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PropertyGallery from "@/components/ui/property-gallery";
import PropertyBody from "@/components/ui/property-body";

interface PropertyPageContentProps {
  property: Property;
}

function formatPrice(amount: number, currency: "USD" | "MXN"): string {
  if (currency === "MXN") {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function PropertyPageContent({ property }: PropertyPageContentProps) {
  const [currency, setCurrency] = useState<"USD" | "MXN">("USD");
  const [usdMxnRate, setUsdMxnRate] = useState<number | null>(null);

  useEffect(() => {
    if (currency === "MXN") {
      fetch("/api/exchange-rate?from=USD&to=MXN")
        .then((r) => r.json())
        .then((data) => setUsdMxnRate(data.rate))
        .catch(() => setUsdMxnRate(17.2));
    } else {
      setUsdMxnRate(null);
    }
  }, [currency]);

  const pricePerNight =
    currency === "MXN" && usdMxnRate != null
      ? Math.round(property.pricePerNight * usdMxnRate)
      : property.pricePerNight;
  const displayCurrency = currency === "MXN" && usdMxnRate != null ? "MXN" : "USD";

  return (
    <div className="space-y-8">
      <PropertyGallery images={property.images} title={property.title} />

      {/* Título y datos bajo la galería */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {property.featured && (
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
              Destacado
            </Badge>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {property.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm md:text-base">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {property.maxGuests} huéspedes
          </span>
          {property.bedrooms != null && (
            <span className="flex items-center gap-1.5">
              <BedDouble className="w-4 h-4" />
              {property.bedrooms} {property.bedrooms === 1 ? "habitación" : "habitaciones"}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1.5">
              <Bath className="w-4 h-4" />
              {property.bathrooms} {property.bathrooms === 1 ? "baño" : "baños"}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {property.location}
          </span>
          <span className="text-xl font-bold text-gray-900 ml-auto">
            {formatPrice(pricePerNight, displayCurrency)} / noche
          </span>
        </div>
      </div>

      <PropertyBody
        property={property}
        currency={currency}
        onCurrencyChange={setCurrency}
        pricePerNightDisplay={pricePerNight}
        usdMxnRate={usdMxnRate}
      />
    </div>
  );
}
