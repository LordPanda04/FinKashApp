import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';

const currency = z.enum(['PEN', 'USD'], { error: 'Elige una moneda válida (PEN o USD).' });
const hexColor = z.string({ error: 'Elige un color.' }).regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe tener el formato #RRGGBB.');
const icon = z.string({ error: 'Elige un ícono.' }).trim().min(1, 'Elige un ícono.');
const positiveMinor = (label: string) =>
  z.number({ error: `${label} debe ser un monto válido.` }).int(`${label} no admite fracciones de céntimo.`).safe().positive(`${label} debe ser mayor a 0.`);
const day = (label: string) =>
  z.number().int(`${label} debe ser un día del mes.`).min(1, `${label} debe estar entre 1 y 31.`).max(31, `${label} debe estar entre 1 y 31.`);

/** Fecha `YYYY-MM-DD` que existe en el calendario (rechaza 2026-02-30, 2026-13-01, 2026-2-3…). */
export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
const isoDate = (label: string) => z.string().refine(isValidIsoDate, `${label} no es una fecha válida (AAAA-MM-DD).`);

const name = (label: string, max: number) =>
  z
    .string({ error: `${label} es obligatorio.` })
    .trim()
    .min(1, `${label} es obligatorio.`)
    .max(max, `${label} puede tener hasta ${max} caracteres.`);

export const categoryInput = z.object({
  kind: z.enum(['expense', 'income'], { error: 'El tipo debe ser gasto o ingreso.' }),
  name: name('El nombre', 40),
  color: hexColor,
  icon,
});
export type CategoryInput = z.infer<typeof categoryInput>;

export const walletInput = z.object({
  name: name('El nombre', 40),
  walletType: z.enum(['cash', 'bank', 'digital', 'other'], { error: 'Elige un tipo de billetera válido.' }),
  icon,
  color: hexColor,
  currencies: z
    .array(currency)
    .min(1, 'Elige al menos una moneda.')
    .max(2, 'Una billetera admite como máximo PEN y USD.')
    .refine((list) => new Set(list).size === list.length, 'No repitas monedas.'),
});
export type WalletInput = z.infer<typeof walletInput>;

export const cardInput = z.object({
  name: name('El nombre', 40),
  issuer: z.string().trim().min(1).max(40).optional(),
  icon,
  color: hexColor,
  currency,
  creditLimitMinor: positiveMinor('La línea de crédito'),
  closingDay: day('El día de cierre').optional(),
  dueDay: day('El día de pago').optional(),
});
export type CardInput = z.infer<typeof cardInput>;

export const debtInput = z.object({
  direction: z.enum(['receivable', 'payable'], { error: 'Indica si te deben o debes.' }),
  counterpartyName: name('La persona o institución', 60),
  counterpartyType: z.enum(['person', 'institution'], { error: 'Indica si es persona o institución.' }),
  currency,
  initialPendingMinor: z
    .number({ error: 'El saldo pendiente debe ser un monto válido.' })
    .int('El saldo pendiente no admite fracciones de céntimo.')
    .safe()
    .min(0, 'El saldo pendiente no puede ser negativo.'),
  installmentAmountMinor: positiveMinor('La cuota').optional(),
  installmentsRemaining: z.number().int().min(0).max(1200).optional(),
  nextDueOn: isoDate('El próximo pago').optional(),
  dueOn: isoDate('El vencimiento').optional(),
  notes: z.string().trim().max(500).optional(),
});
export type DebtInput = z.infer<typeof debtInput>;

export const thresholdInput = z.object({
  currency,
  amountMinor: positiveMinor('El umbral'),
  walletId: z.string().min(1).optional(),
});
export type ThresholdInput = z.infer<typeof thresholdInput>;

/** Valida con Zod y convierte el error en `DomainError` (`INPUT_INVALID`) con `details.fields`. */
export function parseOrError<T>(schema: z.ZodType<T>, value: unknown): Result<T> {
  const parsed = schema.safeParse(value);
  if (parsed.success) return ok(parsed.data);
  const fields: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join('.') : '_';
    fields[key] ??= issue.message;
  }
  return err('INPUT_INVALID', Object.values(fields).join(' '), { fields });
}
