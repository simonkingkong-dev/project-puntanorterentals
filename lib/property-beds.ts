import type { BedType } from "@/lib/types";

export const BED_TYPES: BedType[] = ["bunk", "single", "double", "queen", "king"];

export const BED_TYPE_LABELS: Record<BedType, string> = {
  bunk: "Litera",
  single: "Individual",
  double: "Matrimonial",
  queen: "Queen",
  king: "King",
};

const BED_ALIASES: Record<string, BedType> = {
  bunk: "bunk",
  litera: "bunk",
  single: "single",
  individual: "single",
  twin: "single",
  double: "double",
  matrimonial: "double",
  full: "double",
  queen: "queen",
  king: "king",
};

export function normalizeBedType(value: unknown): BedType | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  if ((BED_TYPES as string[]).includes(key)) return key as BedType;
  return BED_ALIASES[key] ?? null;
}

/** Normaliza el array de camas desde Firestore u otras fuentes. */
export function normalizeBeds(value: unknown): BedType[] | undefined {
  let list: unknown[] | undefined;

  if (Array.isArray(value)) {
    list = value;
  } else if (value && typeof value === "object") {
    list = Object.values(value as Record<string, unknown>);
  }

  if (!list) return undefined;

  const normalized = list
    .map(normalizeBedType)
    .filter((bed): bed is BedType => bed != null);

  return normalized.length > 0 ? normalized : undefined;
}

export type BedCounts = Record<BedType, number>;

export function emptyBedCounts(): BedCounts {
  return { bunk: 0, single: 0, double: 0, queen: 0, king: 0 };
}

/** Agrupa un array de camas en conteos por tipo (orden fijo). */
export function bedsArrayToCounts(beds: BedType[]): BedCounts {
  const counts = emptyBedCounts();
  for (const bed of beds) {
    if (bed in counts) counts[bed] += 1;
  }
  return counts;
}

/** Expande conteos a array plano para persistir en Firestore. */
export function bedCountsToArray(counts: Partial<BedCounts>): BedType[] {
  const result: BedType[] = [];
  for (const type of BED_TYPES) {
    const n = Math.max(0, Math.floor(Number(counts[type]) || 0));
    for (let i = 0; i < n; i++) result.push(type);
  }
  return result;
}

export function totalBedCount(counts: BedCounts): number {
  return BED_TYPES.reduce((sum, type) => sum + counts[type], 0);
}

/** Para mostrar en la ficha pública: solo tipos con count > 0. */
export function groupBedsByType(beds: BedType[]): Array<{ type: BedType; count: number }> {
  const counts = bedsArrayToCounts(beds);
  return BED_TYPES.filter((type) => counts[type] > 0).map((type) => ({
    type,
    count: counts[type],
  }));
}
