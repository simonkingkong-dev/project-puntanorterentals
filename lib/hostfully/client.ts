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

function isHostfullyDebugEnabled(): boolean {
  return process.env.HOSTFULLY_DEBUG === "true";
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

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeDateKey(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const direct = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return toLocalDateStr(parsed);
}

function isHostfullyDayAvailable(day: Record<string, unknown>): boolean {
  if (typeof day.available === "boolean") return day.available;
  if (typeof day.isAvailable === "boolean") return day.isAvailable;
  if (typeof day.bookable === "boolean") return day.bookable;
  if (day.availability && typeof day.availability === "object") {
    const nested = day.availability as Record<string, unknown>;
    if (typeof nested.unavailable === "boolean") return !nested.unavailable;
  }

  const status =
    typeof day.status === "string" ? day.status.toLowerCase().trim() : "";
  if (!status) return true;
  if (["available", "open", "free"].includes(status)) return true;
  if (
    [
      "booked",
      "reserved",
      "unavailable",
      "blocked",
      "hold",
      "onhold",
      "not_available",
      "not-available",
    ].includes(status)
  ) {
    return false;
  }
  return false;
}

function extractCalendarDays(
  calendar: Record<string, unknown>
): Array<{ date: string; available: boolean }> {
  const directArrayKeys = [
    "dates",
    "calendar",
    "days",
    "availability",
    "items",
    "results",
  ] as const;

  const tryMapArray = (arr: unknown[]): Array<{ date: string; available: boolean }> => {
    const mapped: Array<{ date: string; available: boolean }> = [];
    for (const raw of arr) {
      if (!raw || typeof raw !== "object") continue;
      const day = raw as Record<string, unknown>;
      const date =
        normalizeDateKey(day.date) ??
        normalizeDateKey(day.from) ??
        normalizeDateKey(day.day) ??
        normalizeDateKey(day.startDate);
      if (!date) continue;
      mapped.push({ date, available: isHostfullyDayAvailable(day) });
    }
    return mapped;
  };

  for (const key of directArrayKeys) {
    const v = calendar[key];
    if (Array.isArray(v)) {
      const mapped = tryMapArray(v);
      if (mapped.length > 0) return mapped;
    }
  }

  const mappedDays: Array<{ date: string; available: boolean }> = [];
  for (const [k, v] of Object.entries(calendar)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    if (typeof v === "boolean") {
      mappedDays.push({ date: k, available: v });
      continue;
    }
    if (v && typeof v === "object") {
      mappedDays.push({
        date: k,
        available: isHostfullyDayAvailable(v as Record<string, unknown>),
      });
    }
  }
  if (mappedDays.length > 0) return mappedDays;

  const queue: unknown[] = Object.values(calendar);
  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      const mapped = tryMapArray(current);
      if (mapped.length > 0) return mapped;
      continue;
    }

    for (const v of Object.values(current as Record<string, unknown>)) {
      queue.push(v);
    }
  }

  return [];
}

export interface HostfullyProperty {
  uid: string;
  name: string;
  address?: { city?: string; countryCode?: string; [key: string]: unknown };
  bedrooms?: number;
  bathrooms?: number;
  [key: string]: unknown;
}

export interface HostfullyLeadPaymentParams {
  leadUid: string;
  amount: number;
  currency?: string;
  paidAt?: Date;
  externalPaymentId?: string;
  note?: string;
}

// --- Funciones de la API ---

/**
 * Obtiene el calendario de disponibilidad de una propiedad Hostfully.
 * @param propertyUid - UID de la propiedad en Hostfully
 * @param startDate - Inicio del rango (YYYY-MM-DD)
 * @param endDate - Fin del rango (YYYY-MM-DD)
 * @see https://dev.hostfully.com/reference/findbypropertyuid_1 — query: `from`, `to`
 */
export async function getPropertyCalendar(
  propertyUid: string,
  startDate: string,
  endDate: string
): Promise<HostfullyPropertyCalendar> {
  const params = new URLSearchParams({ from: startDate, to: endDate });
  return hostfullyFetch<HostfullyPropertyCalendar>(
    `/property-calendar/${encodeURIComponent(propertyUid)}?${params}`
  );
}

/**
 * Verifica si las fechas están disponibles según Hostfully.
 * Devuelve true solo si todas las noches del rango están disponibles.
 * Usa fecha local (servidor) para evitar desfases por UTC al generar YYYY-MM-DD.
 */
export async function checkHostfullyAvailability(
  hostfullyPropertyUid: string,
  checkIn: Date,
  checkOut: Date
): Promise<{ available: boolean; error?: string }> {
  try {
    const start = toLocalDateStr(new Date(checkIn));
    const end = toLocalDateStr(new Date(checkOut));

    const calendar = await getPropertyCalendar(
      hostfullyPropertyUid,
      start,
      end
    );

    const dates = extractCalendarDays(calendar as Record<string, unknown>);
    if (process.env.NODE_ENV === "development" && isHostfullyDebugEnabled()) {
      const unavailableCount = dates.filter((d) => d.available === false).length;
      console.log("[Hostfully checkAvailability]", {
        propertyUid: hostfullyPropertyUid,
        start,
        end,
        daysReturned: dates.length,
        unavailableCount,
        sampleDates: dates.slice(0, 3).map((d) => ({ date: d.date, available: d.available })),
      });
    }

    // Iterar noche a noche (check-in inclusive, check-out exclusive) en hora local
    const current = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
    const endDateLocal = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());

    while (current < endDateLocal) {
      const dateStr = toLocalDateStr(current);
      const day = dates.find((d) => d.date === dateStr);
      if (!day) {
        if (process.env.NODE_ENV === "development" && isHostfullyDebugEnabled()) {
          console.warn("[Hostfully checkAvailability] Fecha sin dato en respuesta:", dateStr);
        }
        return { available: false };
      }
      if (day.available === false) {
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
 * Registra un pago/abono sobre un lead en Hostfully.
 * La API varía entre cuentas/versiones; intentamos rutas/payloads comunes.
 */
export async function registerHostfullyLeadPayment(
  params: HostfullyLeadPaymentParams
): Promise<{ synced: boolean; path?: string; error?: string }> {
  const leadUid = params.leadUid?.trim();
  if (!leadUid) return { synced: false, error: "leadUid requerido" };
  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { synced: false, error: "amount inválido" };
  }

  const paidAtIso = (params.paidAt ?? new Date()).toISOString();
  const currency = (params.currency ?? "USD").toUpperCase();

  const payloadVariants: Array<Record<string, unknown>> = [
    {
      amount,
      currency,
      paidAt: paidAtIso,
      externalPaymentId: params.externalPaymentId,
      note: params.note,
    },
    {
      payment: {
        amount,
        currency,
        paidAt: paidAtIso,
        externalPaymentId: params.externalPaymentId,
        note: params.note,
      },
    },
    {
      transaction: {
        amount,
        currency,
        date: paidAtIso,
        reference: params.externalPaymentId,
        note: params.note,
      },
    },
  ];

  const pathVariants = [
    `/leads/${encodeURIComponent(leadUid)}/payments`,
    `/leads/${encodeURIComponent(leadUid)}/payment`,
    `/leads/${encodeURIComponent(leadUid)}/transactions`,
  ];

  let lastErr = "Hostfully payment sync failed";
  for (const path of pathVariants) {
    for (const body of payloadVariants) {
      try {
        await hostfullyFetch<Record<string, unknown>>(path, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return { synced: true, path };
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
        if (process.env.NODE_ENV === "development" && isHostfullyDebugEnabled()) {
          console.warn("[Hostfully payment sync] Variante rechazada", { path, error: lastErr });
        }
      }
    }
  }
  return { synced: false, error: lastErr };
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

  const list = (data?.content ?? data?.data ?? data?.properties ?? []) as HostfullyProperty[];
  return Array.isArray(list) ? list : [];
}

/**
 * Obtiene el detalle completo de una propiedad por UID.
 * Nota: la ruta exacta puede variar según la versión de la API; si dev.hostfully.com
 * documenta otro path, actualiza aquí.
 */
export async function getPropertyDetails(
  propertyUid: string
): Promise<Record<string, unknown>> {
  return hostfullyFetch<Record<string, unknown>>(
    `/properties/${encodeURIComponent(propertyUid)}`
  );
}

/** Devuelve descripciones por idioma para una propiedad. */
export async function getPropertyDescriptions(
  propertyUid: string
): Promise<Array<Record<string, unknown>>> {
  const data = await hostfullyFetch<Record<string, unknown>>(
    `/property-descriptions?propertyUid=${encodeURIComponent(propertyUid)}`
  );
  const list = (data?.propertyDescriptions ?? data?.content ?? data?.data ?? []) as unknown;
  return Array.isArray(list) ? (list as Array<Record<string, unknown>>) : [];
}

/** Devuelve fotos de la propiedad (varios tamaños de URL). */
export async function getPropertyPhotos(
  propertyUid: string
): Promise<Array<Record<string, unknown>>> {
  const data = await hostfullyFetch<Record<string, unknown>>(
    `/photos?propertyUid=${encodeURIComponent(propertyUid)}`
  );
  const list = (data?.photos ?? data?.content ?? data?.data ?? []) as unknown;
  return Array.isArray(list) ? (list as Array<Record<string, unknown>>) : [];
}

/** Devuelve amenidades activas de la propiedad. */
export async function getPropertyAmenities(
  propertyUid: string
): Promise<Array<Record<string, unknown>>> {
  const data = await hostfullyFetch<Record<string, unknown>>(
    `/amenities?propertyUid=${encodeURIComponent(propertyUid)}`
  );
  const list = (data?.amenities ?? data?.content ?? data?.data ?? []) as unknown;
  return Array.isArray(list) ? (list as Array<Record<string, unknown>>) : [];
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
  if (!calendar || typeof calendar !== "object") return [];
  return extractCalendarDays(calendar as Record<string, unknown>);
}
/**
 * Crea un lead de tipo BOOKING en Hostfully para bloquear calendario.
 * IMPORTANTE: revisa la documentación oficial de Hostfully v3.2 para ajustar el payload
 * exacto según tu cuenta (campos de huésped, moneda, etc.).
 *
 * Si el payload no incluye agencyUid o viene vacío, se rellena automáticamente
 * usando HOSTFULLY_AGENCY_UID. Si esa variable no está configurada, se lanza
 * un error explícito.
 */
export async function createHostfullyBookingLead(
  payload: Record<string, unknown>,
  options: { includeAgencyUid?: boolean } = {}
): Promise<Record<string, unknown>> {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('createHostfullyBookingLead: payload must be a non-null object');
  }
  getApiKey(); // Fail fast if API key is not configured
  const body: Record<string, unknown> = { ...payload };

  const includeAgencyUid = options.includeAgencyUid ?? true;
  if (includeAgencyUid) {
    const hasAgencyField = Object.prototype.hasOwnProperty.call(body, "agencyUid");
    const currentAgency = hasAgencyField ? String(body["agencyUid"] ?? "").trim() : "";

    if (!currentAgency) {
      const agencyUid = getAgencyUid()?.trim();
      if (!agencyUid) {
        throw new Error(
          "HOSTFULLY_AGENCY_UID no está configurada. Obténla en Hostfully Agency Settings."
        );
      }
      body["agencyUid"] = agencyUid;
    }
  }

  let bodyString: string;
  try {
    bodyString = JSON.stringify(body);
  } catch (e) {
    throw new Error('createHostfullyBookingLead: payload contains circular references and cannot be serialized to JSON');
  }

  return hostfullyFetch<Record<string, unknown>>("/leads", {
    method: "POST",
    body: bodyString,
  });
}

export interface HostfullyLead {
  uid?: string;
  leadUid?: string;
  propertyUid?: string;
  agencyUid?: string;
  type?: string;
  leadType?: string;
  status?: string;
  bookingStatus?: string;
  eventCategory?: string;
  createdAt?: string;
  updatedAt?: string;
  checkIn?: string;
  checkOut?: string;
  guestEmail?: string;
  guestName?: string;
  [key: string]: unknown;
}

function toOptionalString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  const s = String(v);
  return s.trim() ? s : undefined;
}

/**
 * Consulta leads via Hostfully (polling).
 * Nota: los nombres exactos de query params pueden variar por versión de API; aquí
 * intentamos los más comunes para soportar tu polling sin romper ejecución.
 */
export async function searchHostfullyLeads(filters: {
  agencyUid?: string;
  createdFrom?: string | Date;
  createdTo?: string | Date;
}): Promise<HostfullyLead[]> {
  const params = new URLSearchParams();

  const agencyUid = toOptionalString(filters.agencyUid);
  if (agencyUid) params.set("agencyUid", agencyUid);

  const createdFrom =
    filters.createdFrom instanceof Date
      ? filters.createdFrom.toISOString()
      : filters.createdFrom;
  const createdTo =
    filters.createdTo instanceof Date ? filters.createdTo.toISOString() : filters.createdTo;

  const createdFromS = toOptionalString(createdFrom);
  const createdToS = toOptionalString(createdTo);

  if (createdFromS) params.set("createdFrom", createdFromS);
  if (createdToS) params.set("createdTo", createdToS);

  const qs = params.toString();
  const path = `/leads${qs ? `?${qs}` : ""}`;

  const data = await hostfullyFetch<Record<string, unknown>>(path);
  const list =
    (data?.content ??
      data?.data ??
      (data as Record<string, unknown>)?.leads ??
      (data as Record<string, unknown>)?.items ??
      (data as Record<string, unknown>)?.results ??
      []) as unknown;

  if (!Array.isArray(list)) return [];
  return list as HostfullyLead[];
}
