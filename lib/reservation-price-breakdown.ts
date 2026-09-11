import type { Property, Reservation } from "@/lib/types";
import { calculateNights } from "@/lib/utils/date";
import { computeExtraGuestFeesUsd } from "@/lib/pricing-guests";
import { resolveLodgingPricingFromTotalUsd } from "@/lib/lodging-taxes";
import { sumNightlyRatesUsd } from "@/lib/property-nightly-total";

export type ReservationPriceBreakdown = {
  nights: number;
  /** Alojamiento (sin fees de huéspedes extra ni impuestos), reconstruido a partir del total cobrado. */
  nightlySubtotalUsd: number;
  /** Promedio por noche (USD), a partir de `nightlySubtotalUsd`. */
  avgNightlyRateUsd: number;
  /** Fees de huéspedes extra (USD), según la configuración vigente de la propiedad. */
  extraGuestFeesUsd: number;
  ivaUsd: number;
  ishUsd: number;
  taxesUsd: number;
  /** Total mostrado al huésped y efectivamente cobrado (USD). */
  totalUsd: number;
  /** Tarifa de alojamiento vigente hoy en Hostfully para esas fechas (referencia; puede diferir de lo cobrado si el precio cambió desde la reserva). */
  currentHostfullyNightlyTotalUsd: number | null;
};

/**
 * Reconstruye el desglose de precio de una reserva a partir de su `totalAmount` (USD) y la
 * configuración actual de la propiedad. No depende de datos guardados en el momento de la
 * reserva (no existen), así que funciona igual para reservas antiguas y nuevas; el único
 * costo es que si la tarifa por huésped extra o las tarifas de Hostfully cambiaron desde la
 * reserva, el reparto entre "alojamiento" y "huéspedes extra" es una aproximación (el total
 * siempre es exacto, es el mismo que se cobró).
 */
export function computeReservationPriceBreakdown(
  reservation: Pick<Reservation, "checkIn" | "checkOut" | "guests" | "totalAmount">,
  property: Pick<Property, "dailyRates" | "pricePerNight" | "includedGuests" | "extraGuestFeePerNight"> | null
): ReservationPriceBreakdown {
  const nights = calculateNights(reservation.checkIn, reservation.checkOut);
  const totalUsd = Number(reservation.totalAmount) || 0;
  const { subtotalUsd, ivaUsd, ishUsd } = resolveLodgingPricingFromTotalUsd(totalUsd);
  const extraGuestFeesUsd = property
    ? computeExtraGuestFeesUsd(reservation.guests, nights, property)
    : 0;
  const nightlySubtotalUsd = Math.max(0, subtotalUsd - extraGuestFeesUsd);
  const avgNightlyRateUsd = nights > 0 ? Math.round((nightlySubtotalUsd / nights) * 100) / 100 : 0;

  let currentHostfullyNightlyTotalUsd: number | null = null;
  if (property && nights > 0) {
    const { totalUsd: hostfullyTotal } = sumNightlyRatesUsd(
      reservation.checkIn,
      reservation.checkOut,
      property.dailyRates ?? {},
      property.pricePerNight
    );
    currentHostfullyNightlyTotalUsd = hostfullyTotal;
  }

  return {
    nights,
    nightlySubtotalUsd,
    avgNightlyRateUsd,
    extraGuestFeesUsd,
    ivaUsd,
    ishUsd,
    taxesUsd: ivaUsd + ishUsd,
    totalUsd,
    currentHostfullyNightlyTotalUsd,
  };
}
