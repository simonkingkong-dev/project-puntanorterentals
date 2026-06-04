import type { BedType } from "@/lib/types";

const BED_TYPES: BedType[] = ["bunk", "single", "double", "queen", "king"];

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
