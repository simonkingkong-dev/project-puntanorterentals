/** Shared Google Maps JS API loader (single script tag, safe concurrent callers). */

export type GoogleNamespace = {
  maps: {
    Map: new (...args: unknown[]) => unknown;
    Marker?: new (...args: unknown[]) => unknown;
    importLibrary?: (name: string) => Promise<Record<string, unknown>>;
    event?: { trigger: (map: unknown, event: string) => void };
    Size?: new (w: number, h: number) => unknown;
    Point?: new (x: number, y: number) => unknown;
  };
};

const LOAD_TIMEOUT_MS = 25_000;

let googleMapsPromise: Promise<GoogleNamespace> | null = null;

/** Permite reintentar tras un fallo o timeout (p. ej. botón «Reintentar» del mapa). */
export function resetGoogleMapsLoader(): void {
  googleMapsPromise = null;
}

function getGoogle(): GoogleNamespace | undefined {
  return (window as Window & { google?: GoogleNamespace }).google;
}

function waitForGoogleNamespace(
  settle: (fn: () => void) => void,
  resolve: (g: GoogleNamespace) => void,
  reject: (err: Error) => void,
  deadlineMs: number
): void {
  const tick = () => {
    const g = getGoogle();
    if (g?.maps) {
      settle(() => resolve(g));
      return;
    }
    if (Date.now() >= deadlineMs) {
      googleMapsPromise = null;
      settle(() => reject(new Error("Google Maps load timeout")));
      return;
    }
    window.setTimeout(tick, 50);
  };
  tick();
}

function scriptLibrariesParam(): string {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim();
  return mapId ? "&libraries=marker" : "";
}

/** Warm the Maps script (e.g. on /properties before the user opens the map). */
export function preloadGoogleMaps(): void {
  if (typeof window === "undefined") return;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return;
  void loadGoogleMaps(apiKey).catch(() => {
    /* ignore — UI shows retry */
  });
}

export function loadGoogleMaps(apiKey: string): Promise<GoogleNamespace> {
  if (typeof window === "undefined") {
    return Promise.resolve(undefined as unknown as GoogleNamespace);
  }

  const ready = getGoogle();
  if (ready?.maps) return Promise.resolve(ready);

  if (googleMapsPromise) return googleMapsPromise;

  const deadlineMs = Date.now() + LOAD_TIMEOUT_MS;

  googleMapsPromise = new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps="true"]'
    );

    if (existingScript) {
      const g = getGoogle();
      if (g?.maps) {
        settle(() => resolve(g));
        return;
      }
      existingScript.addEventListener(
        "load",
        () => waitForGoogleNamespace(settle, resolve, reject, deadlineMs),
        { once: true }
      );
      existingScript.addEventListener(
        "error",
        () => {
          googleMapsPromise = null;
          settle(() => reject(new Error("Google Maps failed to load")));
        },
        { once: true }
      );
      waitForGoogleNamespace(settle, resolve, reject, deadlineMs);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&loading=async&v=weekly${scriptLibrariesParam()}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onload = () => {
      waitForGoogleNamespace(settle, resolve, reject, deadlineMs);
    };
    script.onerror = () => {
      googleMapsPromise = null;
      settle(() => reject(new Error("Google Maps failed to load")));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
