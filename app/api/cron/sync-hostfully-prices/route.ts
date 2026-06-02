import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getPropertyCalendar } from "@/lib/hostfully/client";
import { parseHostfullyCalendarDays } from "@/lib/hostfully-calendar-sync";
import { computeDisplayNightlyRate } from "@/lib/property-list-item";

const MONTHS_AHEAD = 24;

/**
 * POST /api/cron/sync-hostfully-prices
 * Sincroniza **precios por noche** desde Hostfully (recomendado 1×/día).
 * Calcula el precio "Desde" como el mínimo entre fechas disponibles futuras.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const persist = process.env.HOSTFULLY_PERSIST_AVAILABILITY !== "false";
  if (!persist) {
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
    const startStr =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");
    const endStr =
      end.getFullYear() +
      "-" +
      String(end.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(end.getDate()).padStart(2, "0");

    const snapshot = await adminDb.collection("properties").get();
    const docs = snapshot.docs.filter(
      (d) =>
        d.data().hostfullyPropertyId != null &&
        String(d.data().hostfullyPropertyId).trim() !== ""
    );

    let updated = 0;
    const errors: string[] = [];

    for (const doc of docs) {
      const uid = doc.data().hostfullyPropertyId as string;
      if (!uid) continue;
      try {
        const data = doc.data();
        const calendar = await getPropertyCalendar(uid, startStr, endStr);
        const { dailyRates } = parseHostfullyCalendarDays(calendar.dates ?? []);
        const availability =
          (data.availability as Record<string, boolean> | undefined) ?? {};

        const lowestAvailableNightlyRate = computeDisplayNightlyRate({
          pricePerNight: Number(data.pricePerNight) || 0,
          dailyRates,
          availability,
        });

        await doc.ref.update({
          dailyRates,
          lowestAvailableNightlyRate: lowestAvailableNightlyRate ?? null,
          pricesSyncedAt: new Date(),
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
      scope: "prices",
      updated,
      total: docs.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
