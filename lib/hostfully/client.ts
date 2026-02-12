/**
 * Cliente para la API de Hostfully (PMS).
 * Documentación: https://dev.hostfully.com
 *
 * Requiere:
 * - HOSTFULLY_API_KEY en .env.local
 * - HOSTFULLY_AGENCY_UID (obtener desde Hostfully Agency Settings)
 * - HOSTFULLY_BASE_URL opcional (default: sandbox para desarrollo)
 */

const DEFAULT_BASE_URL = "https://sandbox.hostfully.com/api/v3.2";

function getBaseUrl(): string {
  return process.env.HOSTFULLY_BASE_URL || DEFAULT_BASE_URL;
}

function getApiKey(): string {
  const key = process.env.HOSTFULLY_API_KEY;
  if (!key) {
    throw new Error(
      "HOSTFULLY_API_KEY no está configurada. Añádela a .env.local"
    );
  }
  return key;
}

function getAgencyUid(): string | undefined {
  return process.env.HOSTFULLY_AGENCY_UID;
}

async function hostfullyFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-HOSTFULLY-APIKEY": apiKey,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Hostfully API error ${res.status}: ${text || res.statusText}`
    );
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as T;
}

// --- Tipos de Hostfully ---

export interface HostfullyPropertyCalendarDay {
  date: string; // YYYY-MM-DD
  available?: boolean;
  status?: string;
  [key: string]: unknown;
}

export interface HostfullyPropertyCalendar {
  propertyUid: string;
  dates?: HostfullyPropertyCalendarDay[];
  [key: string]: unknown;
}

export interface HostfullyProperty {
  uid: string;
  name: string;
  address?: { city?: string; countryCode?: string; [key: string]: unknown };
  bedrooms?: number;
  bathrooms?: number;
  [key: string]: unknown;
}

// --- Funciones de la API ---

/**
 * Obtiene el calendario de disponibilidad de una propiedad Hostfully.
 * @param propertyUid - UID de la propiedad en Hostfully
 * @param startDate - Inicio del rango (YYYY-MM-DD)
 * @param endDate - Fin del rango (YYYY-MM-DD)
 */
export async function getPropertyCalendar(
  propertyUid: string,
  startDate: string,
  endDate: string
): Promise<HostfullyPropertyCalendar> {
  const params = new URLSearchParams({ startDate, endDate });
  return hostfullyFetch<HostfullyPropertyCalendar>(
    `/property-calendar/${encodeURIComponent(propertyUid)}?${params}`
  );
}

/**
 * Verifica si las fechas están disponibles según Hostfully.
 * Devuelve true solo si todas las noches del rango están disponibles.
 */
export async function checkHostfullyAvailability(
  hostfullyPropertyUid: string,
  checkIn: Date,
  checkOut: Date
): Promise<{ available: boolean; error?: string }> {
  try {
    const start = checkIn.toISOString().slice(0, 10);
    const end = checkOut.toISOString().slice(0, 10);

    const calendar = await getPropertyCalendar(
      hostfullyPropertyUid,
      start,
      end
    );

    const dates = calendar.dates ?? [];
    const dateSet = new Set(dates.map((d) => d.date));

    const current = new Date(checkIn);
    const endDate = new Date(checkOut);

    while (current < endDate) {
      const dateStr = current.toISOString().slice(0, 10);
      const day = dates.find((d) => d.date === dateStr);
      if (!day || day.available === false) {
        return { available: false };
      }
      current.setDate(current.getDate() + 1);
    }

    return { available: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error Hostfully";
    return { available: false, error: msg };
  }
}

/**
 * Lista propiedades de la agencia (requiere HOSTFULLY_AGENCY_UID).
 */
export async function listProperties(): Promise<HostfullyProperty[]> {
  const agencyUid = getAgencyUid();
  if (!agencyUid) {
    throw new Error(
      "HOSTFULLY_AGENCY_UID no está configurada. Obténla en Hostfully Agency Settings."
    );
  }
  const data = await hostfullyFetch<Record<string, unknown>>(
    `/properties?agencyUid=${encodeURIComponent(agencyUid)}`
  );
  // Log para debug: ver estructura real de la respuesta Hostfully
  console.log("[Hostfully listProperties] Raw response keys:", Object.keys(data ?? {}));
  console.log("[Hostfully listProperties] Raw response:", JSON.stringify(data, null, 2).slice(0, 2000));

  const list = (data?.content ?? data?.data ?? data?.properties ?? []) as HostfullyProperty[];
  return Array.isArray(list) ? list : [];
}

/**
 * Obtiene los días bloqueados/ocupados de una propiedad para generar iCal.
 */
export async function getBlockedDates(
  hostfullyPropertyUid: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; available: boolean }>> {
  const calendar = await getPropertyCalendar(
    hostfullyPropertyUid,
    startDate,
    endDate
  );
  return (calendar.dates ?? []).map((d) => ({
    date: d.date,
    available: d.available ?? true,
  }));
}
