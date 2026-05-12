"use client";

import { useEffect, useRef, useState } from "react";
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
  const cameraRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const centerLat = center.lat;
  const centerLng = center.lng;

  useEffect(() => {
    if (hasEnteredViewport || !mapRef.current) return;
    if (!("IntersectionObserver" in window)) {
      setHasEnteredViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEnteredViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [hasEnteredViewport]);

  useEffect(() => {
    if (!hasEnteredViewport) return;

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
      .then(async (googleNs) => {
        if (isCancelled || !googleNs || !mapRef.current) return;
        const { AdvancedMarkerElement, PinElement } = await googleNs.maps.importLibrary(
          "marker"
        );
        if (isCancelled || !mapRef.current) return;

        const mapCenter = { lat: centerLat, lng: centerLng };
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new googleNs.maps.Map(mapRef.current, {
            center: mapCenter,
            zoom,
            mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
          cameraRef.current = { lat: centerLat, lng: centerLng, zoom };
        } else {
          const lastCamera = cameraRef.current;
          if (
            !lastCamera ||
            lastCamera.lat !== centerLat ||
            lastCamera.lng !== centerLng ||
            lastCamera.zoom !== zoom
          ) {
            mapInstanceRef.current.setCenter(mapCenter);
            mapInstanceRef.current.setZoom(zoom);
            cameraRef.current = { lat: centerLat, lng: centerLng, zoom };
          }
        }

        // Limpiar marcadores anteriores
        Object.values(markersRef.current).forEach((m) => {
          m.map = null;
        });
        markersRef.current = {};

        const hasSelectedMarker = Boolean(selectedId);

        markers.forEach((marker) => {
          const isSelected = selectedId === marker.id;
          const markerScale = isSelected ? 1.45 : hasSelectedMarker ? 0.8 : 1;
          const pin = new PinElement({
            background: "#dc2626",
            borderColor: "#ffffff",
            glyphColor: "#ffffff",
            scale: markerScale,
          });
          const content = pin.element ?? pin;
          const gMarker = new AdvancedMarkerElement({
            position: { lat: marker.lat, lng: marker.lng },
            map: mapInstanceRef.current!,
            title: marker.title,
            content,
            gmpClickable: true,
            zIndex: isSelected ? 1000 : 1,
          });

          if (onMarkerClick) {
            gMarker.addListener("click", () => onMarkerClick(marker));
          }

          markersRef.current[marker.id] = gMarker;
        });

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
  }, [hasEnteredViewport, centerLat, centerLng, zoom, markers, selectedId, onMarkerClick]);

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

