import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getPropertyCalendar } from "@/lib/hostfully/client";
import type { HostfullyPropertyCalendarDay } from "@/lib/hostfully/client";

const MONTHS_AHEAD = 24;

/**
 * POST /api/cron/sync-hostfully-availability
 * Sincroniza disponibilidad y precios por noche desde Hostfully a Firestore.
 * Debe ser llamado por un cron (ej. cada 5–15 min). Protegido por CRON_SECRET.
 * Si `HOSTFULLY_PERSIST_AVAILABILITY` no está en `true`, el route hace `no-op`
 * (útil para el modo Hostfully-only evitando escrituras en Firestore).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Hostfully-only: no persistimos disponibilidad diaria en Firestore.
  // Por defecto está deshabilitado para evitar escrituras y desyncs.
  const persist = process.env.HOSTFULLY_PERSIST_AVAILABILITY === "true";
  if (!persist) {
    // Recomendación: si tu cron/scheduler externo sigue llamando este endpoint,
    // apágalo para evitar requests innecesarias (en modo Hostfully-only).
    return NextResponse.json({
      success: true,
      skipped: true,
      updated: 0,
      total: 0,
      reason: "HOSTFULLY_PERSIST_AVAILABILITY=false",
    });
  }

  try {
    const today = new Date();
    const end = new Date(today);
    end.setMonth(end.getMonth() + MONTHS_AHEAD);
    const startStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    const endStr = end.getFullYear() + "-" + String(end.getMonth() + 1).padStart(2, "0") + "-" + String(end.getDate()).padStart(2, "0");

    const snapshot = await adminDb.collection("properties").get();
    const docs = snapshot.docs.filter(
      (d) => d.data().hostfullyPropertyId != null && String(d.data().hostfullyPropertyId).trim() !== ""
    );

    let updated = 0;
    const errors: string[] = [];

    for (const doc of docs) {
      const uid = doc.data().hostfullyPropertyId as string;
      if (!uid) continue;
      try {
        const calendar = await getPropertyCalendar(uid, startStr, endStr);
        const dates = (calendar.dates ?? []) as HostfullyPropertyCalendarDay[];
        const availability: Record<string, boolean> = {};
        const dailyRates: Record<string, number> = {};
        for (const d of dates) {
          const dateStr = d.date;
          if (!dateStr) continue;
          availability[dateStr] = d.available !== false;
          if (d.available !== false) {
            const rate = d.rate ?? d.price ?? d.dailyRate;
            if (typeof rate === "number" && rate > 0) {
              dailyRates[dateStr] = rate;
            }
          }
        }
        await doc.ref.update({
          availability,
          dailyRates,
          updatedAt: new Date(),
        });
        updated++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${doc.id}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      total: docs.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
