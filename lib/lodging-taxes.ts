/** IVA sobre hospedaje — aplicado al subtotal (alojamiento + extras de huéspedes). */
export const LODGING_IVA_RATE = 0.16;

/** ISH / impuesto municipal (City tax) — mismo subtotal. */
export const LODGING_ISH_RATE = 0.06;

export function computeLodgingTaxesUsd(subtotalUsd: number): {
  ivaUsd: number;
  ishUsd: number;
  taxesUsd: number;
} {
  const ivaUsd = Math.round(subtotalUsd * LODGING_IVA_RATE);
  const ishUsd = Math.round(subtotalUsd * LODGING_ISH_RATE);
  return { ivaUsd, ishUsd, taxesUsd: ivaUsd + ishUsd };
}

export function computeTotalWithLodgingTaxesUsd(subtotalUsd: number): number {
  const { taxesUsd } = computeLodgingTaxesUsd(subtotalUsd);
  return subtotalUsd + taxesUsd;
}

/** Total cuando el subtotal imponible es un entero USD (útil para búsqueda inversa). */
export function lodgingTotalFromRoundedSubtotalUsd(subtotalInt: number): number {
  const s = Math.max(0, Math.round(subtotalInt));
  return s + Math.round(s * LODGING_IVA_RATE) + Math.round(s * LODGING_ISH_RATE);
}

/**
 * Descompone un total cobrado en subtotal + IVA + ISH.
 * Si el total no cuadra con la fórmula actual (p. ej. reservas antiguas con 10 %), devuelve un reparto aproximado que suma al total.
 */
export function resolveLodgingPricingFromTotalUsd(totalUsd: number): {
  subtotalUsd: number;
  ivaUsd: number;
  ishUsd: number;
} {
  const T = Math.round(totalUsd);
  if (T <= 0) return { subtotalUsd: 0, ivaUsd: 0, ishUsd: 0 };

  let lo = 0;
  let hi = T;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const f = lodgingTotalFromRoundedSubtotalUsd(mid);
    if (f === T) {
      const { ivaUsd, ishUsd } = computeLodgingTaxesUsd(mid);
      return { subtotalUsd: mid, ivaUsd, ishUsd };
    }
    if (f < T) lo = mid + 1;
    else hi = mid - 1;
  }

  const subApprox = T / (1 + LODGING_IVA_RATE + LODGING_ISH_RATE);
  const ivaUsd = Math.round(subApprox * LODGING_IVA_RATE);
  const ishUsd = Math.round(subApprox * LODGING_ISH_RATE);
  const subtotalUsd = Math.max(0, T - ivaUsd - ishUsd);
  return { subtotalUsd, ivaUsd, ishUsd };
}
