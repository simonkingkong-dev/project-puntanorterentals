"use client";

import { useMemo, useState } from "react";
import { Property } from "@/lib/types";
import PropertyCard from "@/components/ui/property-card";
import GoogleMap, { GoogleMapMarker } from "@/components/ui/google-map";

interface PropertiesMapLayoutProps {
  properties: Property[];
}

export default function PropertiesMapLayout({ properties }: PropertiesMapLayoutProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const markers = useMemo<GoogleMapMarker[]>(() => {
    return properties
      .filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number")
      .map((p) => ({
        id: p.id,
        lat: p.latitude as number,
        lng: p.longitude as number,
        title: p.title,
        url: `/properties/${p.slug}`,
      }));
  }, [properties]);

  const initialCenter = useMemo(() => {
    if (markers.length > 0) {
      return { lat: markers[0].lat, lng: markers[0].lng };
    }
    // Fallback genérico (aprox. Isla Mujeres) en caso de que ninguna propiedad tenga coordenadas
    return { lat: 21.2579, lng: -86.7481 };
  }, [markers]);

  const handleMarkerClick = (marker: GoogleMapMarker) => {
    setSelectedId(marker.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
      {/* Lista de propiedades (scroll) */}
      <div className="h-[70vh] overflow-y-auto pr-1 space-y-6">
        {properties.map((property) => (
          <div
            key={property.id}
            onMouseEnter={() => setSelectedId(property.id)}
            className="cursor-pointer"
          >
            <PropertyCard property={property} />
          </div>
        ))}
      </div>

      {/* Mapa */}
      <div className="h-[70vh] rounded-lg overflow-hidden border bg-gray-100">
        <GoogleMap
          center={initialCenter}
          markers={markers}
          selectedId={selectedId}
          onMarkerClick={handleMarkerClick}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

