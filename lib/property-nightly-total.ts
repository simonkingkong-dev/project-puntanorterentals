import { calculateNights } from "@/lib/utils/date";

export type NightlyRateLine = { date: string; amountUsd: number };

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Suma tarifas por noche en USD (Hostfully / Firestore `dailyRates`).
 * El fallback siempre es `fallbackUsdPerNight` en USD — nunca un importe ya convertido a MXN.
 */
export function sumNightlyRatesUsd(
  checkIn: Date,
  checkOut: Date,
  dailyRates: Record<string, number>,
  fallbackUsdPerNight: number
): { totalUsd: number; breakdown: NightlyRateLine[] } {
  const nights = calculateNights(checkIn, checkOut);
  if (nights <= 0) {
    return { totalUsd: 0, breakdown: [] };
  }

  const fallback = Number.isFinite(fallbackUsdPerNight) && fallbackUsdPerNight > 0
    ? fallbackUsdPerNight
    : 0;

  const cursor = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  const end = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
  const breakdown: NightlyRateLine[] = [];
  let total = 0;

  while (cursor < end) {
    const key = toDateKey(cursor);
    const dynamic = dailyRates[key];
    const amountUsd =
      typeof dynamic === "number" && Number.isFinite(dynamic) && dynamic > 0
        ? dynamic
        : fallback;
    total += amountUsd;
    breakdown.push({ date: key, amountUsd });
    cursor.setDate(cursor.getDate() + 1);
  }

  return { totalUsd: Math.round(total), breakdown };
}
