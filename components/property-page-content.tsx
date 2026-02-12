"use client";

import { useState, useEffect } from "react";
import { Property } from "@/lib/types";
import { MapPin, Users } from "lucide-react";
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

  return (
    <div className="space-y-8">
      {/* Header */}
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
            {formatPrice(pricePerNight, currency)} / noche
          </div>
        </div>
      </div>

      <PropertyGallery images={property.images} title={property.title} />

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
