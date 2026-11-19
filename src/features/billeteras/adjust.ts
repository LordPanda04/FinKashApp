/** Diferencia entre el saldo calculado y el saldo real declarado en un arreglo de billetera. */
export function adjustPreview(
  currentMinor: number,
  declaredMinor: number,
): { differenceMinor: number; direction: 'up' | 'down' | 'none' } {
  const differenceMinor = declaredMinor - currentMinor;
  return { differenceMinor, direction: differenceMinor > 0 ? 'up' : differenceMinor < 0 ? 'down' : 'none' };
}
