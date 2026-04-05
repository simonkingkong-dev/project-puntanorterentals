/** Redondeo para UI: MXN y EUR con centavos; USD en unidades enteras. */
export function roundForDisplay(
  amount: number,
  currency: 'USD' | 'MXN' | 'EUR'
): number {
  if (currency === 'MXN' || currency === 'EUR') return Math.round(amount * 100) / 100;
  return Math.round(amount);
}
