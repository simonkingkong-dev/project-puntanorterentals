/** Redondeo para UI: MXN con centavos; USD/EUR se mantienen en unidades enteras para mostrar. */
export function roundForDisplay(
  amount: number,
  currency: 'USD' | 'MXN' | 'EUR'
): number {
  if (currency === 'MXN') return Math.round(amount * 100) / 100;
  return Math.round(amount);
}
