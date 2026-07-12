/**
 * Configuración pública del embed de reservas Rezdy (afiliado).
 *
 * URL de afiliado Mexico Divers con código de comisión CASANARANJA.
 * Sobrescribe con NEXT_PUBLIC_REZDY_AFFILIATE_URL si cambia el proveedor o el agent code.
 */
export const DEFAULT_REZDY_AFFILIATE_BOOKING_URL =
  'https://mexicodivers.rezdy.com/?agentCode=CASANARANJA';

export function getRezdyAffiliateBookingUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_REZDY_AFFILIATE_URL?.trim();
  return fromEnv || DEFAULT_REZDY_AFFILIATE_BOOKING_URL;
}
