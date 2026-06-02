import { NextRequest, NextResponse } from "next/server";
import { getPropertyByIdAdmin } from "@/lib/firebase-admin-queries";

/** Alineado con cron Hostfully cada 10 min — no consultar Hostfully en cada vista. */
const CALENDAR_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=120",
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * GET /api/properties/calendar?propertyId=...&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Devuelve disponibilidad desde Firestore (sincronizada por cron Hostfully cada ~10 min).
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

    return NextResponse.json(
      {
        source: property.hostfullyPropertyId ? "firestore_sync" : "firestore",
        availability: property.availability ?? {},
        dailyRates: property.dailyRates ?? {},
        startDate: start,
        endDate: end,
        syncedVia: "cron",
      },
      { headers: CALENDAR_CACHE_HEADERS }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al obtener calendario";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
