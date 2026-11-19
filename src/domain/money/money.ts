import { err, ok, type Result } from '@/lib/result';

export type Currency = 'PEN' | 'USD';

export const CURRENCY_SYMBOL: Record<Currency, string> = { PEN: 'S/', USD: '$' };

/** Dígitos sin comas, o con comas solo como separador de miles (grupos de 3). El decimal es el punto. */
const AMOUNT_PATTERN = /^(\d+|\d{1,3}(,\d{3})+)(\.\d{1,2})?$/;

function amountInvalid(): Result<number> {
  return err('AMOUNT_INVALID', 'Ingresa un monto válido mayor a 0, con hasta 2 decimales.');
}

/** Convierte texto del usuario ("1,840.50") a unidades mínimas enteras (184050), sin punto flotante. */
export function parseAmountInput(text: string): Result<number> {
  const trimmed = text.trim();
  if (!AMOUNT_PATTERN.test(trimmed)) return amountInvalid();
  const clean = trimmed.replace(/,/g, '');
  const [whole = '0', fraction = ''] = clean.split('.');
  const minor = Number(whole + fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0) return amountInvalid();
  return ok(minor);
}

/** Formatea unidades mínimas: `S/ 1,840.00`, `- S/ 24.50`, `+ $ 500.00`. */
export function formatMoney(
  amountMinor: number,
  currency: Currency,
  opts?: { sign?: 'plus' | 'minus' },
): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error(`Monto inválido para formatear: ${amountMinor}`);
  }
  const whole = Math.floor(amountMinor / 100);
  const cents = String(amountMinor % 100).padStart(2, '0');
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const prefix = opts?.sign === 'plus' ? '+ ' : opts?.sign === 'minus' ? '- ' : '';
  return `${prefix}${CURRENCY_SYMBOL[currency]} ${grouped}.${cents}`;
}
