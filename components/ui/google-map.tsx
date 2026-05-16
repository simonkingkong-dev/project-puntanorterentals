"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
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
  children?: ReactNode;
  /** Sin esperar a IntersectionObserver (útil en overlays fixed recién montados en móvil). */
  eager?: boolean;
  /** Etiqueta del botón para salir del modo pantalla completa nativo del mapa. */
  fullscreenExitLabel?: string;
}

function getDocumentFullscreenElement(): Element | null {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };
  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

async function exitDocumentFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
    mozCancelFullScreen?: () => Promise<void> | void;
    msExitFullscreen?: () => Promise<void> | void;
  };
  try {
    if (typeof doc.exitFullscreen === "function") await doc.exitFullscreen();
    else if (typeof doc.webkitExitFullscreen === "function") await doc.webkitExitFullscreen();
    else if (typeof doc.mozCancelFullScreen === "function") await doc.mozCancelFullScreen();
    else if (typeof doc.msExitFullscreen === "function") await doc.msExitFullscreen();
  } catch {
    /* algunos navegadores rechazan si ya no hay fullscreen */
  }
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
    )}&loading=async&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onload = () => resolve((window as any).google);
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function createClassicMarkerIcon(
  googleNs: GoogleNamespace,
  isSelected: boolean,
  hasSelectedMarker: boolean
) {
  const width = isSelected ? 34 : hasSelectedMarker ? 22 : 26;
  const height = Math.round(width * 1.35);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 32 44">
      <path d="M16 42s14-16.1 14-27A14 14 0 1 0 2 15c0 10.9 14 27 14 27Z" fill="#dc2626" stroke="#ffffff" stroke-width="3"/>
      <circle cx="16" cy="15" r="5" fill="#ffffff"/>
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new googleNs.maps.Size(width, height),
    anchor: new googleNs.maps.Point(width / 2, height),
  };
}

export function GoogleMap({
  center,
  zoom = 14,
  markers = [],
  selectedId,
  onMarkerClick,
  className,
  children,
  eager = false,
  fullscreenExitLabel,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const cameraRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [hasEnteredViewport, setHasEnteredViewport] = useState(eager);
  const [fullscreenElement, setFullscreenElement] = useState<Element | null>(null);
  const centerLat = center.lat;
  const centerLng = center.lng;

  const isMapFullscreen = Boolean(
    fullscreenElement &&
      mapRef.current &&
      (fullscreenElement === mapRef.current ||
        fullscreenElement.contains(mapRef.current) ||
        mapRef.current.contains(fullscreenElement))
  );

  useEffect(() => {
    const syncFullscreen = () => setFullscreenElement(getDocumentFullscreenElement());

    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen as EventListener);
    document.addEventListener("mozfullscreenchange", syncFullscreen as EventListener);
    document.addEventListener("MSFullscreenChange", syncFullscreen as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen as EventListener);
      document.removeEventListener("mozfullscreenchange", syncFullscreen as EventListener);
      document.removeEventListener("MSFullscreenChange", syncFullscreen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (eager || hasEnteredViewport || !mapRef.current) return;
    if (!("IntersectionObserver" in window)) {
      setHasEnteredViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          setHasEnteredViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px", threshold: [0, 0.01, 1] }
    );

    observer.observe(mapRef.current);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        const el = mapRef.current;
        if (!el) return;
        const cr = el.getBoundingClientRect();
        if (cr.width >= 32 && cr.height >= 32) {
          setHasEnteredViewport(true);
        }
      });
      ro.observe(mapRef.current);
    }

    const id = window.requestAnimationFrame(() => {
      const el = mapRef.current;
      if (!el) return;
      const cr = el.getBoundingClientRect();
      if (cr.width >= 32 && cr.height >= 32) {
        setHasEnteredViewport(true);
      }
    });

    return () => {
      observer.disconnect();
      ro?.disconnect();
      window.cancelAnimationFrame(id);
    };
  }, [eager, hasEnteredViewport]);

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
        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim();
        let MapCtor: any = googleNs.maps?.Map;
        let AdvancedMarkerElement: any = null;
        let PinElement: any = null;
        if (typeof googleNs.maps.importLibrary === "function") {
          const mapsLib = await googleNs.maps.importLibrary("maps");
          MapCtor = mapsLib.Map || googleNs.maps.Map;

          if (mapId) {
            const markerLibrary = await googleNs.maps.importLibrary("marker");
            AdvancedMarkerElement = markerLibrary.AdvancedMarkerElement;
            PinElement = markerLibrary.PinElement;
          }
        }

        if (isCancelled || !mapRef.current || !MapCtor) return;

        const mapCenter = { lat: centerLat, lng: centerLng };
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new MapCtor(mapRef.current, {
            center: mapCenter,
            zoom,
            ...(mapId ? { mapId } : {}),
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
          if (typeof m.setMap === "function") {
            m.setMap(null);
          } else {
            m.map = null;
          }
        });
        markersRef.current = {};

        const hasSelectedMarker = Boolean(selectedId);
        const useAdvancedMarkers = Boolean(mapId && AdvancedMarkerElement && PinElement);

        markers.forEach((marker) => {
          const isSelected = selectedId === marker.id;
          let gMarker: any;

          if (useAdvancedMarkers) {
            const markerScale = isSelected ? 1.45 : hasSelectedMarker ? 0.8 : 1;
            const pin = new PinElement({
              background: "#dc2626",
              borderColor: "#ffffff",
              glyphColor: "#ffffff",
              scale: markerScale,
            });
            gMarker = new AdvancedMarkerElement({
              position: { lat: marker.lat, lng: marker.lng },
              map: mapInstanceRef.current!,
              title: marker.title,
              content: pin,
              gmpClickable: true,
              zIndex: isSelected ? 1000 : 1,
            });
          } else {
            gMarker = new googleNs.maps.Marker({
              position: { lat: marker.lat, lng: marker.lng },
              map: mapInstanceRef.current!,
              title: marker.title,
              icon: createClassicMarkerIcon(googleNs, isSelected, hasSelectedMarker),
              zIndex: isSelected ? 1000 : 1,
            });
          }

          if (onMarkerClick) {
            if (typeof gMarker.addEventListener === "function") {
              gMarker.addEventListener("gmp-click", () => onMarkerClick(marker));
            } else {
              gMarker.addListener("click", () => onMarkerClick(marker));
            }
          }

          markersRef.current[marker.id] = gMarker;
        });

        const triggerResize = () => {
          if (!mapInstanceRef.current || !googleNs.maps?.event) return;
          googleNs.maps.event.trigger(mapInstanceRef.current, "resize");
        };
        requestAnimationFrame(() => {
          requestAnimationFrame(triggerResize);
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
        "relative w-full h-full min-h-[320px] bg-gray-100 rounded-lg overflow-hidden",
        className
      )}
    >
      {!isMapFullscreen && children}
      {isMapFullscreen && fullscreenElement
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-[2147483647]">
              {fullscreenExitLabel ? (
                <div className="pointer-events-auto absolute left-0 right-0 top-0 z-[2147483647] flex justify-end px-3 pt-[max(12px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))]">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-full shadow-md"
                    onClick={() => void exitDocumentFullscreen()}
                  >
                    {fullscreenExitLabel}
                  </Button>
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-0">
                <div className="pointer-events-auto relative h-full w-full">{children}</div>
              </div>
            </div>,
            fullscreenElement
          )
        : null}
    </div>
  );
}

export default GoogleMap;

