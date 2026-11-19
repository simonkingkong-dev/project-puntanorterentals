import { resolveLodgingPricingFromTotalUsd } from '@/lib/lodging-taxes';

/**
 * Precio del lead en Hostfully = lo que el huésped realmente pagó.
 *
 * Verificado en producción sobre un order real (36 → 53 USD):
 *  - `totalPrice` suelto: Hostfully lo IGNORA y calcula con su tarifa base.
 *  - `fees.otherFees[].amount`: ignorado (creaba las líneas VAT / City Tax en $0).
 *  - `rent.rentNetPrice` + `fees.otherFees[].netPrice`: SÍ se aplica. El order queda con la
 *    renta neta (subtotal) y dos líneas: VAT (IVA) y City Tax (ISH), sumando el total cobrado.
 *  - `rent.taxAmount` también funciona pero lo muestra como "Taxes (0%)": se evita.
 * `totalPrice` se manda igual, consistente con la suma. El desglose sale del mismo cálculo
 * que usa la página de pago. Cada reserva guarda `hostfullyPaymentSync.totalsMatch` para
 * detectar si Hostfully dejara de respetarlo.
 */
export function buildHostfullyQuoteOverrides(totalUsd: number): Record<string, unknown> {
  const total = Math.round(totalUsd * 100) / 100;
  const { subtotalUsd, ivaUsd, ishUsd } = resolveLodgingPricingFromTotalUsd(total);
  const taxFee = (name: string, netPrice: number) => ({
    name,
    type: 'TAX',
    amountType: 'AMOUNT',
    scope: 'PER_STAY',
    netPrice,
    enabled: true,
  });
  return {
    totalPrice: total,
    rent: {
      rentBaseNetPrice: subtotalUsd,
      rentNetPrice: subtotalUsd,
      // El subtotal cobrado ya incluye a los huéspedes extra; si no se pone en 0, Hostfully
      // conserva su propio cargo por huésped extra y el total del lead sale más alto.
      extraGuestsNetPrice: 0,
      extraGuestsBaseNetPrice: 0,
      taxAmount: 0,
    },
    fees: {
      // Mismos nombres que los impuestos de Hostfully (VAT / City Tax).
      otherFees: [taxFee('VAT', ivaUsd), taxFee('City Tax', ishUsd)],
    },
  };
}
