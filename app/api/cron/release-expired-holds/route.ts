import { NextResponse } from "next/server";
import { sweepHostfullyHolds } from "@/lib/hostfully/holds";

/**
 * POST /api/cron/release-expired-holds
 * Libera los holds vencidos (reserva → incomplete) y borra sus bloqueos en Hostfully.
 * Hostfully no expira los bloqueos por sí solo, así que esto es lo que sincroniza el
 * vencimiento: recomendado cada 1 minuto vía Cloud Scheduler.
 * Header: `Authorization: Bearer <CRON_SECRET>`.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sweepHostfullyHolds();
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sweep failed";
    console.error("[cron release-expired-holds]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
