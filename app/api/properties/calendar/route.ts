import { NextRequest, NextResponse } from "next/server";
import { getPropertyByIdAdmin } from "@/lib/firebase-admin-queries";
import { ensurePropertyAvailabilityFresh } from "@/lib/hostfully-availability-sync";

/** Tras sync Hostfully (~20 min), respuesta cacheable unos minutos. */
const CALENDAR_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=60",
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * GET /api/properties/calendar?propertyId=...&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * 1. Si la caché tiene >20 min (o está vacía), pull Hostfully → Firestore.
 * 2. Devuelve disponibilidad desde Firestore (caché reciente).
 */
export async function GET(request: NextRequest) {
  try {
    const propertyId = request.nextUrl.searchParams.get("propertyId")?.trim();
    const startDate = request.nextUrl.searchParams.get("startDate")?.trim();
    const endDate = request.nextUrl.searchParams.get("endDate")?.trim();

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId requerido" }, { status: 400 });
    }

    let refreshSource: "hostfully" | "cache" = "cache";
    try {
      refreshSource = await ensurePropertyAvailabilityFresh(propertyId);
    } catch (syncError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[calendar] Hostfully refresh failed, using cache", syncError);
      }
    }

    const property = await getPropertyByIdAdmin(propertyId);
    if (!property) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }

    const now = new Date();
    const start = startDate || toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    const endDt = new Date(now.getFullYear(), now.getMonth() + 12, 0);
    const end = endDate || toDateStr(endDt);

    return NextResponse.json(
      {
        source: property.hostfullyPropertyId ? "hostfully_cache" : "firestore",
        refreshSource,
        availability: property.availability ?? {},
        dailyRates: property.dailyRates ?? {},
        availabilitySyncedAt: property.availabilitySyncedAt ?? null,
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
