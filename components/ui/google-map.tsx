"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Usamos any para evitar depender del tipo global `google` en build/TypeScript
type GoogleNamespace = any;

export interface GoogleMapMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  url?: string;
}

interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: GoogleMapMarker[];
  selectedId?: string | null;
  onMarkerClick?: (marker: GoogleMapMarker) => void;
  className?: string;
}

let googleMapsPromise: Promise<GoogleNamespace> | null = null;

function loadGoogleMaps(apiKey: string): Promise<GoogleNamespace> {
  if (typeof window === "undefined") return Promise.resolve(undefined);

  if ((window as any).google?.maps) {
    return Promise.resolve((window as any).google);
  }

  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve((window as any).google));
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onload = () => resolve((window as any).google);
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export function GoogleMap({
  center,
  zoom = 14,
  markers = [],
  selectedId,
  onMarkerClick,
  className,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.warn(
          "[GoogleMap] Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. El mapa no se mostrará."
        );
      }
      return;
    }

    let isCancelled = false;

    loadGoogleMaps(apiKey)
      .then((googleNs) => {
        if (isCancelled || !googleNs || !mapRef.current) return;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new googleNs.maps.Map(mapRef.current, {
            center,
            zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
        } else {
          mapInstanceRef.current.setCenter(center);
          mapInstanceRef.current.setZoom(zoom);
        }

        // Limpiar marcadores anteriores
        Object.values(markersRef.current).forEach((m) => m.setMap(null));
        markersRef.current = {};

        markers.forEach((marker) => {
          const gMarker = new googleNs.maps.Marker({
            position: { lat: marker.lat, lng: marker.lng },
            map: mapInstanceRef.current!,
            title: marker.title,
          });

          if (onMarkerClick) {
            gMarker.addListener("click", () => onMarkerClick(marker));
          }

          markersRef.current[marker.id] = gMarker;
        });

        if (selectedId && markersRef.current[selectedId]) {
          const selectedMarker = markersRef.current[selectedId];
          const selPos = selectedMarker.getPosition();
          if (selPos) {
            mapInstanceRef.current!.panTo(selPos);
          }
        }
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("[GoogleMap] Error loading Google Maps", err);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [center.lat, center.lng, zoom, markers, selectedId, onMarkerClick]);

  return (
    <div
      ref={mapRef}
      className={cn(
        "w-full h-full min-h-[320px] bg-gray-100 rounded-lg overflow-hidden",
        className
      )}
    />
  );
}

export default GoogleMap;

