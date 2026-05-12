"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Map as MapIcon, X } from "lucide-react";
import { Property } from "@/lib/types";
import PropertyCard from "@/components/ui/property-card";
import GoogleMap, { GoogleMapMarker } from "@/components/ui/google-map";
import { listingSearchQueryFromURLSearchParams } from "@/lib/listing-search-params";
import { Button } from "@/components/ui/button";

interface PropertiesMapLayoutProps {
  properties: Property[];
}

export default function PropertiesMapLayout({ properties }: PropertiesMapLayoutProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingQs = listingSearchQueryFromURLSearchParams(searchParams);

  const markers = useMemo<GoogleMapMarker[]>(() => {
    return properties
      .filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number")
      .map((p) => ({
        id: p.id,
        lat: p.latitude as number,
        lng: p.longitude as number,
        title: p.title,
        url: listingQs ? `/properties/${p.slug}?${listingQs}` : `/properties/${p.slug}`,
      }));
  }, [properties, listingQs]);

  const initialCenter = useMemo(() => {
    if (markers.length > 0) {
      return { lat: markers[0].lat, lng: markers[0].lng };
    }
    // Fallback genérico (aprox. Isla Mujeres) en caso de que ninguna propiedad tenga coordenadas
    return { lat: 21.2579, lng: -86.7481 };
  }, [markers]);

  const handleMarkerClick = (marker: GoogleMapMarker) => {
    if (selectedId === marker.id && marker.url) {
      router.push(marker.url);
      return;
    }
    setSelectedId(marker.id);
  };

  const selectedProperty = useMemo(() => {
    if (!selectedId) return null;
    return properties.find((p) => p.id === selectedId) ?? null;
  }, [properties, selectedId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
      {/* Lista de propiedades (scroll) */}
      <div className="h-[70vh] overflow-y-auto pr-1 space-y-6">
        <div className="lg:hidden sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm pb-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setIsMobileMapOpen(true)}
          >
            <MapIcon className="h-4 w-4 mr-2" />
            Ver mapa
          </Button>
        </div>
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
      <div className="hidden lg:block h-[70vh] rounded-lg overflow-hidden border bg-gray-100">
        <GoogleMap
          center={initialCenter}
          markers={markers}
          selectedId={selectedId}
          onMarkerClick={handleMarkerClick}
          className="h-full w-full"
        />
      </div>

      {/* Mapa móvil: pantalla completa */}
      {isMobileMapOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background">
          <div className="absolute top-4 right-4 z-20">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="rounded-full shadow-md"
              onClick={() => setIsMobileMapOpen(false)}
              aria-label="Cerrar mapa"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <GoogleMap
            center={initialCenter}
            markers={markers}
            selectedId={selectedId}
            onMarkerClick={handleMarkerClick}
            className="h-full w-full rounded-none"
          />

          {selectedProperty && (
            <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-black/55 via-black/25 to-transparent">
              <div className="max-h-[42vh] overflow-y-auto rounded-xl">
                <PropertyCard property={selectedProperty} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

