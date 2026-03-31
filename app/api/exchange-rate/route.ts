import { NextResponse } from "next/server";

const MXN_MARGIN = 0.2; // 20 centavos sobre el tipo oficial (cuando destino es MXN)

/**
 * GET /api/exchange-rate?from=USD|EUR&to=MXN|EUR
 * - Si destino es MXN: aplica margen +0.20 sobre tipo oficial.
 * - Para otras conversiones soportadas: tipo oficial.
 * Cache: 1 hora.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.toUpperCase() || "USD";
  const to = searchParams.get("to")?.toUpperCase() || "MXN";

  const allowed = (
    (from === "USD" && (to === "MXN" || to === "EUR")) ||
    (from === "EUR" && to === "MXN")
  );
  if (!allowed) {
    return NextResponse.json({ error: "Conversión no soportada" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("Exchange API error");
    const data = (await res.json()) as { rates?: Record<string, number> };
    const officialRate = data.rates?.[to];
    if (typeof officialRate !== "number") throw new Error("Invalid rate");
    const rate = to === "MXN" ? officialRate + MXN_MARGIN : officialRate;
    return NextResponse.json({ rate, officialRate });
  } catch {
    if (from === "USD" && to === "MXN") {
      const fallback = Number(process.env.USD_MXN_RATE) || 17.2;
      return NextResponse.json({ rate: fallback + MXN_MARGIN, officialRate: fallback });
    }
    if (from === "EUR" && to === "MXN") {
      const fallback = Number(process.env.EUR_MXN_RATE) || 20.0;
      return NextResponse.json({ rate: fallback + MXN_MARGIN, officialRate: fallback });
    }
    if (from === "USD" && to === "EUR") {
      const fallback = Number(process.env.USD_EUR_RATE) || 0.92;
      return NextResponse.json({ rate: fallback, officialRate: fallback });
    }
    return NextResponse.json({ error: "No se pudo obtener tipo de cambio" }, { status: 500 });
  }
}
