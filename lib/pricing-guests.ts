import type { Property } from "@/lib/types";

/** Huéspedes incluidos en la tarifa por noche (Hostfully / defecto). */
export const DEFAULT_INCLUDED_GUESTS = 2;

/** USD por huésped extra por noche cuando Hostfully no envía valor. */
export const DEFAULT_EXTRA_GUEST_FEE_USD_PER_NIGHT = 10;

export function getIncludedGuests(property: Pick<Property, "includedGuests">): number {
  const n = property.includedGuests;
  if (typeof n === "number" && Number.isFinite(n) && n >= 1) return Math.min(50, Math.floor(n));
  return DEFAULT_INCLUDED_GUESTS;
}

export function getExtraGuestFeePerNightUsd(
  property: Pick<Property, "extraGuestFeePerNight">
): number {
  const n = property.extraGuestFeePerNight;
  if (typeof n === "number" && Number.isFinite(n) && n >= 0) return n;
  return DEFAULT_EXTRA_GUEST_FEE_USD_PER_NIGHT;
}

/** Huéspedes que pagan extra (por encima del cupo incluido). */
export function countBillableExtraGuests(totalGuests: number, includedGuests: number): number {
  return Math.max(0, Math.floor(totalGuests) - Math.floor(includedGuests));
}

/**
 * Total USD por huéspedes extra: (huéspedes extra) × noches × tarifa/noche.
 */
export function computeExtraGuestFeesUsd(
  totalGuests: number,
  nights: number,
  property: Pick<Property, "includedGuests" | "extraGuestFeePerNight">
): number {
  if (nights <= 0 || totalGuests <= 0) return 0;
  const included = getIncludedGuests(property);
  const extra = countBillableExtraGuests(totalGuests, included);
  if (extra <= 0) return 0;
  const fee = getExtraGuestFeePerNightUsd(property);
  return Math.round(extra * nights * fee);
}
