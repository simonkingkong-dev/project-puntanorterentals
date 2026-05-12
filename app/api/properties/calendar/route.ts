import { NextRequest, NextResponse } from "next/server";
import { getPropertyByIdAdmin } from "@/lib/firebase-admin-queries";
import { getPropertyCalendar } from "@/lib/hostfully/client";

const CALENDAR_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
};

function toDateStr(d: Date): string {
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
  return toDateStr(parsed);
}

function isHostfullyDayAvailable(day: Record<string, unknown>): boolean {
  if (typeof day.available === "boolean") return day.available;
  if (typeof day.isAvailable === "boolean") return day.isAvailable;
  if (typeof day.bookable === "boolean") return day.bookable;
  if (day.availability && typeof day.availability === "object") {
    const nestedAvailability = day.availability as Record<string, unknown>;
    if (typeof nestedAvailability.unavailable === "boolean") {
      return !nestedAvailability.unavailable;
    }
  }
  const status = typeof day.status === "string" ? day.status.toLowerCase().trim() : "";
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
  // Estado desconocido: ser conservador para no sobre-vender.
  return false;
}

function extractCalendarDays(calendar: Record<string, unknown>): Record<string, unknown>[] {
  const directArrayKeys = ["dates", "calendar", "days", "availability", "items", "results"] as const;
  for (const key of directArrayKeys) {
    const v = calendar[key];
    if (Array.isArray(v)) {
      return v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object");
    }
  }

  // Algunas respuestas vienen como mapa: { "YYYY-MM-DD": { ... } } o { "YYYY-MM-DD": true }
  const mappedDays: Record<string, unknown>[] = [];
  for (const [k, v] of Object.entries(calendar)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    if (typeof v === "boolean") {
      mappedDays.push({ date: k, available: v });
      continue;
    }
    if (v && typeof v === "object") {
      mappedDays.push({ date: k, ...(v as Record<string, unknown>) });
    }
  }
  if (mappedDays.length > 0) return mappedDays;

  // Fallback robusto: búsqueda profunda del primer array con objetos "día".
  const queue: unknown[] = Object.values(calendar);
  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      const asDays = current.filter((x): x is Record<string, unknown> => {
        if (!x || typeof x !== "object") return false;
        const d = x as Record<string, unknown>;
        const hasDateLike =
          normalizeDateKey(d.date) != null ||
          normalizeDateKey(d.from) != null ||
          normalizeDateKey(d.day) != null ||
          normalizeDateKey(d.startDate) != null;
        const hasAvailabilityLike =
          typeof d.available === "boolean" ||
          typeof d.isAvailable === "boolean" ||
          typeof d.bookable === "boolean" ||
          (d.availability != null && typeof d.availability === "object");
        return hasDateLike || hasAvailabilityLike;
      });
      if (asDays.length > 0) return asDays;
      continue;
    }

    for (const v of Object.values(current as Record<string, unknown>)) {
      queue.push(v);
    }
  }

  return [];
}

/**
 * GET /api/properties/calendar?propertyId=...&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Devuelve disponibilidad por fecha para alimentar el calendario custom.
 */
export async function GET(request: NextRequest) {
  try {
    const propertyId = request.nextUrl.searchParams.get("propertyId")?.trim();
    const startDate = request.nextUrl.searchParams.get("startDate")?.trim();
    const endDate = request.nextUrl.searchParams.get("endDate")?.trim();

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId requerido" }, { status: 400 });
    }

    const property = await getPropertyByIdAdmin(propertyId);
    if (!property) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }

    const now = new Date();
    const start = startDate || toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    const endDt = new Date(now.getFullYear(), now.getMonth() + 12, 0);
    const end = endDate || toDateStr(endDt);

    // Hostfully en tiempo real cuando hay mapping.
    if (property.hostfullyPropertyId) {
      try {
        const calendar = await getPropertyCalendar(
          property.hostfullyPropertyId,
          start,
          end
        );
        const availability: Record<string, boolean> = {};
        const dailyRates: Record<string, number> = {};

        const rawDates = extractCalendarDays(calendar as Record<string, unknown>);

        for (const rawDay of rawDates) {
          if (!rawDay || typeof rawDay !== "object") continue;
          const day = rawDay as Record<string, unknown>;
          const key =
            normalizeDateKey(day.date) ??
            normalizeDateKey(day.from) ??
            normalizeDateKey(day.day) ??
            normalizeDateKey(day.startDate);
          if (!key) continue;
          const available = isHostfullyDayAvailable(day);
          availability[key] = available;
          if (available) {
            const nestedPricing =
              day.pricing && typeof day.pricing === "object"
                ? (day.pricing as Record<string, unknown>)
                : undefined;
            const rate =
              day.rate ??
              day.price ??
              day.dailyRate ??
              nestedPricing?.value;
            if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
              dailyRates[key] = rate;
            } else if (typeof rate === "string" && rate.trim() !== "") {
              const parsedRate = Number(rate);
              if (Number.isFinite(parsedRate) && parsedRate > 0) {
                dailyRates[key] = parsedRate;
              }
            }
          }
        }

        if (Object.keys(availability).length === 0) {
          throw new Error("Hostfully calendar response had no usable days");
        }

        return NextResponse.json(
          {
            source: "hostfully",
            availability,
            dailyRates,
            startDate: start,
            endDate: end,
          },
          { headers: CALENDAR_CACHE_HEADERS }
        );
      } catch (hostfullyErr) {
        console.error(
          "[api/properties/calendar] Hostfully falló, usando Firestore:",
          hostfullyErr
        );
        return NextResponse.json(
          {
            source: "firestore_fallback",
            availability: property.availability ?? {},
            dailyRates: property.dailyRates ?? {},
            startDate: start,
            endDate: end,
            warning:
              hostfullyErr instanceof Error
                ? hostfullyErr.message
                : "Error al consultar Hostfully",
          },
          { headers: CALENDAR_CACHE_HEADERS }
        );
      }
    }

    // Fallback local para propiedades no vinculadas a Hostfully.
    return NextResponse.json(
      {
        source: "firestore",
        availability: property.availability ?? {},
        dailyRates: property.dailyRates ?? {},
        startDate: start,
        endDate: end,
      },
      { headers: CALENDAR_CACHE_HEADERS }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al obtener calendario";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

