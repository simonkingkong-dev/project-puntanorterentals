import { NextResponse } from "next/server";

const MXN_MARGIN = 0.2; // 20 centavos sobre el tipo oficial

/**
 * GET /api/exchange-rate?from=USD&to=MXN
 * Devuelve el tipo de cambio oficial + 0.20 pesos para conversión USD → MXN.
 * Cache: 1 hora.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.toUpperCase() || "USD";
  const to = searchParams.get("to")?.toUpperCase() || "MXN";

  if (from !== "USD" || to !== "MXN") {
    return NextResponse.json({ error: "Solo se soporta USD → MXN" }, { status: 400 });
  }

  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=MXN",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("Exchange API error");
    const data = (await res.json()) as { rates?: { MXN?: number } };
    const officialRate = data.rates?.MXN;
    if (typeof officialRate !== "number") throw new Error("Invalid rate");
    const rate = officialRate + MXN_MARGIN;
    return NextResponse.json({ rate, officialRate });
  } catch {
    const fallback = Number(process.env.USD_MXN_RATE) || 17.2;
    return NextResponse.json({ rate: fallback + MXN_MARGIN, officialRate: fallback });
  }
}
