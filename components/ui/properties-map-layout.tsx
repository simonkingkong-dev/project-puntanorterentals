"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Map as MapIcon, X } from "lucide-react";
import { Property } from "@/lib/types";
import PropertyCard from "@/components/ui/property-card";
import GoogleMap, { GoogleMapMarker } from "@/components/ui/google-map";
import { listingSearchQueryFromURLSearchParams } from "@/lib/listing-search-params";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";

interface PropertiesMapLayoutProps {
  properties: Property[];
}

export default function PropertiesMapLayout({ properties }: PropertiesMapLayoutProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [openPropertyId, setOpenPropertyId] = useState<string | null>(null);
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
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

  const handleMarkerClick = useCallback(
    (marker: GoogleMapMarker) => {
      setHighlightedId(marker.id);
      setOpenPropertyId(marker.id);
      if (openPropertyId === marker.id && marker.url) {
        router.push(marker.url);
        return;
      }
    },
    [openPropertyId, router]
  );

  const selectedProperty = useMemo(() => {
    if (!openPropertyId) return null;
    return properties.find((p) => p.id === openPropertyId) ?? null;
  }, [properties, openPropertyId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
      {/* Lista de propiedades (scroll) */}
      <div className="h-[calc(100dvh-4rem)] min-h-[calc(100vh-4rem)] overflow-y-auto pr-1 space-y-6">
        <div className="lg:hidden sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm pb-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setIsMobileMapOpen(true)}
          >
            <MapIcon className="h-4 w-4 mr-2" />
            {t("map_view", "View map")}
          </Button>
        </div>
        {properties.map((property) => (
          <div
            key={property.id}
            onMouseEnter={() => setHighlightedId(property.id)}
            onMouseLeave={() => setHighlightedId(null)}
            className="cursor-pointer"
          >
            <PropertyCard property={property} />
          </div>
        ))}
      </div>

      {/* Mapa */}
      <div className="hidden lg:block h-[calc(100dvh-4rem)] min-h-[calc(100vh-4rem)] lg:sticky lg:top-16 rounded-lg overflow-hidden border bg-gray-100">
        <GoogleMap
          center={initialCenter}
          markers={markers}
          selectedId={highlightedId}
          onMarkerClick={handleMarkerClick}
          fullscreenExitLabel={t("map_exit_fullscreen", "Exit fullscreen")}
          className="h-full w-full"
        >
          {selectedProperty && (
            <div className="pointer-events-auto absolute bottom-4 left-4 z-10 w-[340px] max-w-[calc(100%-2rem)]">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-2 z-20 h-8 w-8 rounded-full bg-white/95 shadow-md"
                onClick={() => {
                  setOpenPropertyId(null);
                  setHighlightedId(null);
                }}
                aria-label={t("map_close_property_card", "Close property card")}
              >
                <X className="h-4 w-4" />
              </Button>
              <PropertyCard property={selectedProperty} />
            </div>
          )}
        </GoogleMap>
      </div>

      {/* Mapa móvil: pantalla completa */}
      {isMobileMapOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex min-h-0 flex-col bg-background">
          <div className="absolute left-0 right-0 top-0 z-20 flex justify-end px-3 pt-[max(16px,env(safe-area-inset-top))] pr-[max(16px,env(safe-area-inset-right))]">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="rounded-full shadow-md"
              onClick={() => setIsMobileMapOpen(false)}
              aria-label={t("map_close", "Close map")}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <GoogleMap
            eager
            center={initialCenter}
            markers={markers}
            selectedId={highlightedId}
            onMarkerClick={handleMarkerClick}
            fullscreenExitLabel={t("map_exit_fullscreen", "Exit fullscreen")}
            className="min-h-0 flex-1 w-full rounded-none"
          >
            {selectedProperty && (
              <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-black/55 via-black/25 to-transparent">
                <div className="max-h-[42vh] overflow-y-auto rounded-xl">
                  <PropertyCard property={selectedProperty} />
                </div>
              </div>
            )}
          </GoogleMap>
        </div>
      )}
    </div>
  );
}

