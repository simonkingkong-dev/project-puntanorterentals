/**
 * Márgenes aplicados sobre el precio base importado de Hostfully, en la fuente
 * (sync de calendario/precios y sync manual de propiedades), para que se propaguen
 * a todo lo que se deriva de `dailyRates`/`pricePerNight`: tarjetas "desde $X",
 * ficha de propiedad, carrito, desglose de pago y el monto cobrado por Stripe.
 */

/** Margen de negocio sobre la tarifa de Hostfully. */
export const HOSTFULLY_BASE_MARKUP_MULTIPLIER = 1.1;

/** Margen adicional para absorber la comisión de Stripe sobre el monto cobrado. */
export const STRIPE_FEE_MARKUP_MULTIPLIER = 1.0861;

/** Multiplicador combinado a aplicar sobre la tarifa cruda de Hostfully. */
export const HOSTFULLY_PRICE_MARKUP_MULTIPLIER =
  HOSTFULLY_BASE_MARKUP_MULTIPLIER * STRIPE_FEE_MARKUP_MULTIPLIER;
