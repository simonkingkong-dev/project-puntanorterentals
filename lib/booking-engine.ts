/**
 * Motor de reservas en la UI pública.
 *
 * - `custom`: calendario + formulario + Stripe propio (default)
 * - `hostfully`: widgets de Hostfully (fallback rápido)
 */
export type BookingEngine = "custom" | "hostfully";

export function getBookingEngine(): BookingEngine {
  const v = process.env.NEXT_PUBLIC_BOOKING_ENGINE?.toLowerCase().trim();
  if (v === "hostfully") return "hostfully";
  return "custom";
}

export function isHostfullyBookingEngine(): boolean {
  return getBookingEngine() === "hostfully";
}
