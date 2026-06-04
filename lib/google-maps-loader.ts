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

function isGoogleMapsReady(g: GoogleNamespace | undefined): g is GoogleNamespace {
  return typeof g?.maps?.importLibrary === "function";
}

function waitForGoogleMapsReady(
  settle: (fn: () => void) => void,
  resolve: (g: GoogleNamespace) => void,
  reject: (err: Error) => void,
  deadlineMs: number
): void {
  const tick = () => {
    const g = getGoogle();
    if (isGoogleMapsReady(g)) {
      void (async () => {
        try {
          await g.maps.importLibrary!("maps");
          await g.maps.importLibrary!("marker");
          settle(() => resolve(g));
        } catch (e) {
          googleMapsPromise = null;
          settle(() =>
            reject(e instanceof Error ? e : new Error("Google Maps libraries failed to load"))
          );
        }
      })();
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
  return "&loading=async";
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
  if (isGoogleMapsReady(ready)) {
    return Promise.resolve(ready).then(async (g) => {
      await g.maps.importLibrary!("maps");
      await g.maps.importLibrary!("marker");
      return g;
    });
  }

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

    const attachListeners = (script: HTMLScriptElement) => {
      script.addEventListener(
        "load",
        () => waitForGoogleMapsReady(settle, resolve, reject, deadlineMs),
        { once: true }
      );
      script.addEventListener(
        "error",
        () => {
          googleMapsPromise = null;
          settle(() => reject(new Error("Google Maps failed to load")));
        },
        { once: true }
      );
    };

    if (existingScript) {
      const g = getGoogle();
      if (isGoogleMapsReady(g)) {
        void (async () => {
          try {
            await g.maps.importLibrary!("maps");
            await g.maps.importLibrary!("marker");
            settle(() => resolve(g));
          } catch (e) {
            googleMapsPromise = null;
            settle(() =>
              reject(e instanceof Error ? e : new Error("Google Maps libraries failed"))
            );
          }
        })();
        return;
      }
      attachListeners(existingScript);
      waitForGoogleMapsReady(settle, resolve, reject, deadlineMs);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}${scriptLibrariesParam()}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    attachListeners(script);
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
