import { NextResponse } from "next/server";
import { syncAllPropertiesAvailabilityFromHostfully } from "@/lib/hostfully-availability-sync";

/**
 * POST /api/cron/sync-hostfully-availability
 * Pull Hostfully → Firestore (recomendado cada ~20 min vía Cloud Scheduler).
 * La app también refresca sola si la caché tiene más de 20 min al abrir calendario/búsqueda.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllPropertiesAvailabilityFromHostfully();
    if (result.errors?.includes("HOSTFULLY_PERSIST_AVAILABILITY=false")) {
      return NextResponse.json({
        success: true,
        skipped: true,
        updated: 0,
        total: 0,
        reason: "HOSTFULLY_PERSIST_AVAILABILITY=false",
      });
    }

    return NextResponse.json({
      success: true,
      scope: "availability",
      ...result,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
