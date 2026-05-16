"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  loadGoogleMaps,
  resetGoogleMapsLoader,
  type GoogleNamespace,
} from "@/lib/google-maps-loader";
import { useLocale } from "@/components/providers/locale-provider";

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
  /** Sin esperar a IntersectionObserver (overlay móvil, mapa ya visible). */
  eager?: boolean;
  /** Etiqueta del botón para salir del modo pantalla completa nativo del mapa. */
  fullscreenExitLabel?: string;
  /** Oculta el control de pantalla completa de Google (p. ej. overlay móvil propio). */
  disableNativeFullscreen?: boolean;
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

function createClassicMarkerIcon(
  googleNs: GoogleNamespace,
  isSelected: boolean,
  hasSelectedMarker: boolean
) {
  const maps = googleNs.maps as {
    Size: new (w: number, h: number) => unknown;
    Point: new (x: number, y: number) => unknown;
  };
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
    scaledSize: new maps.Size(width, height),
    anchor: new maps.Point(width / 2, height),
  };
}

type LoadStatus = "idle" | "loading" | "ready" | "error";

/** z-index por encima del header del sitio (z-[100]) */
const MAP_OVERLAY_Z = 250;

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
  disableNativeFullscreen = false,
}: GoogleMapProps) {
  const { t } = useLocale();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const cameraRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const markersRef = useRef<Record<string, unknown>>({});
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;

  const [hasEnteredViewport, setHasEnteredViewport] = useState(eager);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [fullscreenElement, setFullscreenElement] = useState<Element | null>(null);
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
  }, []);

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
      { rootMargin: "400px", threshold: [0, 0.01, 1] }
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

  const syncMarkers = useCallback(
    (googleNs: GoogleNamespace, mapInstance: unknown) => {
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim();
      const hasSelectedMarker = Boolean(selectedId);

      Object.values(markersRef.current).forEach((m) => {
        const marker = m as { setMap?: (map: null) => void; map?: unknown };
        if (typeof marker.setMap === "function") {
          marker.setMap(null);
        } else {
          marker.map = null;
        }
      });
      markersRef.current = {};

      markers.forEach((marker) => {
        const isSelected = selectedId === marker.id;
        let gMarker: {
          setMap?: (map: null) => void;
          map?: unknown;
          addEventListener?: (type: string, fn: () => void) => void;
          addListener?: (type: string, fn: () => void) => void;
        };

        const AdvancedMarkerElement = (
          googleNs as { __advancedMarker?: new (...args: unknown[]) => unknown }
        ).__advancedMarker;
        const PinElement = (googleNs as { __pinElement?: new (...args: unknown[]) => unknown })
          .__pinElement;

        if (mapId && AdvancedMarkerElement && PinElement) {
          const markerScale = isSelected ? 1.45 : hasSelectedMarker ? 0.8 : 1;
          const pin = new PinElement({
            background: "#dc2626",
            borderColor: "#ffffff",
            glyphColor: "#ffffff",
            scale: markerScale,
          });
          gMarker = new AdvancedMarkerElement({
            position: { lat: marker.lat, lng: marker.lng },
            map: mapInstance,
            title: marker.title,
            content: pin,
            gmpClickable: true,
            zIndex: isSelected ? 1000 : 1,
          }) as typeof gMarker;
        } else {
          const MarkerCtor = googleNs.maps.Marker;
          if (!MarkerCtor) return;
          gMarker = new MarkerCtor({
            position: { lat: marker.lat, lng: marker.lng },
            map: mapInstance,
            title: marker.title,
            icon: createClassicMarkerIcon(googleNs, isSelected, hasSelectedMarker),
            zIndex: isSelected ? 1000 : 1,
          }) as typeof gMarker;
        }

        const clickHandler = () => onMarkerClickRef.current?.(marker);
        if (clickHandler) {
          if (typeof gMarker.addEventListener === "function") {
            gMarker.addEventListener("gmp-click", clickHandler);
          } else if (typeof gMarker.addListener === "function") {
            gMarker.addListener("click", clickHandler);
          }
        }

        markersRef.current[marker.id] = gMarker;
      });
    },
    [markers, selectedId]
  );

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
      setLoadStatus("error");
      return;
    }

    let isCancelled = false;
    setLoadStatus((s) => (s === "ready" ? "ready" : "loading"));

    loadGoogleMaps(apiKey)
      .then(async (googleNs) => {
        if (isCancelled || !googleNs || !mapRef.current) return;

        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim();
        let MapCtor = googleNs.maps.Map;
        let AdvancedMarkerElement: (new (...args: unknown[]) => unknown) | null = null;
        let PinElement: (new (...args: unknown[]) => unknown) | null = null;

        if (typeof googleNs.maps.importLibrary === "function") {
          const mapsLib = (await googleNs.maps.importLibrary("maps")) as {
            Map?: typeof googleNs.maps.Map;
          };
          MapCtor = mapsLib.Map ?? googleNs.maps.Map;

          if (mapId) {
            const markerLibrary = (await googleNs.maps.importLibrary("marker")) as {
              AdvancedMarkerElement: new (...args: unknown[]) => unknown;
              PinElement: new (...args: unknown[]) => unknown;
            };
            AdvancedMarkerElement = markerLibrary.AdvancedMarkerElement;
            PinElement = markerLibrary.PinElement;
          }
        }

        if (isCancelled || !mapRef.current || !MapCtor) return;

        if (AdvancedMarkerElement) {
          (googleNs as { __advancedMarker?: typeof AdvancedMarkerElement }).__advancedMarker =
            AdvancedMarkerElement;
        }
        if (PinElement) {
          (googleNs as { __pinElement?: typeof PinElement }).__pinElement = PinElement;
        }

        const mapCenter = { lat: centerLat, lng: centerLng };
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new MapCtor(mapRef.current, {
            center: mapCenter,
            zoom,
            ...(mapId ? { mapId } : {}),
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: !disableNativeFullscreen,
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
            const map = mapInstanceRef.current as {
              setCenter: (c: { lat: number; lng: number }) => void;
              setZoom: (z: number) => void;
            };
            map.setCenter(mapCenter);
            map.setZoom(zoom);
            cameraRef.current = { lat: centerLat, lng: centerLng, zoom };
          }
        }

        syncMarkers(googleNs, mapInstanceRef.current);

        const triggerResize = () => {
          if (!mapInstanceRef.current || !googleNs.maps?.event) return;
          googleNs.maps.event.trigger(mapInstanceRef.current, "resize");
        };
        requestAnimationFrame(() => {
          requestAnimationFrame(triggerResize);
        });

        if (!isCancelled) setLoadStatus("ready");
      })
      .catch((err) => {
        if (isCancelled) return;
        setLoadStatus("error");
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("[GoogleMap] Error loading Google Maps", err);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [
    hasEnteredViewport,
    loadAttempt,
    centerLat,
    centerLng,
    zoom,
    syncMarkers,
    disableNativeFullscreen,
  ]);

  const handleRetry = () => {
    resetGoogleMapsLoader();
    setLoadStatus("idle");
    setLoadAttempt((n) => n + 1);
    if (eager) setHasEnteredViewport(true);
  };

  return (
    <div
      ref={mapRef}
      className={cn(
        "relative w-full h-full min-h-[320px] bg-gray-100 rounded-lg overflow-hidden",
        className
      )}
    >
      {loadStatus === "loading" && (
        <MapLoadingOverlay message={t("map_loading", "Loading map…")} />
      )}
      {loadStatus === "error" && <MapErrorOverlay onRetry={handleRetry} />}
      {!isMapFullscreen && children}
      {mounted &&
        isMapFullscreen &&
        fullscreenExitLabel &&
        createPortal(
          <MapFullscreenExitButton
            label={fullscreenExitLabel}
            onExit={() => void exitDocumentFullscreen()}
          />,
          document.body
        )}
      {isMapFullscreen && fullscreenElement && children
        ? createPortal(
            <div className="pointer-events-none absolute inset-0">
              <MapChildrenWrap>{children}</MapChildrenWrap>
            </div>,
            fullscreenElement
          )
        : null}
    </div>
  );
}

function MapLoadingOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 bg-gray-100 text-sm text-gray-600">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

function MapErrorOverlay({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale();
  return (
    <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 bg-gray-100 px-4 text-center">
      <p className="text-sm text-gray-600">{t("map_load_error", "Could not load the map")}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {t("map_retry", "Retry")}
      </Button>
    </div>
  );
}

function MapFullscreenExitButton({
  label,
  onExit,
}: {
  label: string;
  onExit: () => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 flex justify-end px-3 pt-[max(12px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))]"
      style={{ zIndex: MAP_OVERLAY_Z }}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="pointer-events-auto rounded-full shadow-md"
        onClick={onExit}
      >
        {label}
      </Button>
    </div>
  );
}

function MapChildrenWrap({ children }: { children: ReactNode }) {
  return <div className="pointer-events-auto relative h-full w-full">{children}</div>;
}

export default GoogleMap;
