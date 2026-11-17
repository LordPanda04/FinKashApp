import { debtPending } from '@/domain/debts/debts';
import { accountBalance, dailyClosingBalances } from '@/domain/ledger/balances';
import type { Account, LedgerState, Movement } from '@/domain/ledger/types';
import type { Currency } from '@/domain/money/money';
import { addDays, endOfMonth, type IsoDate } from '@/lib/dates';

/** Rango de fechas inclusivo en ambos extremos. */
export interface DateRange {
  start: IsoDate;
  end: IsoDate;
}

export interface CurrencySummary {
  /** Restante + gastado. */
  availableMinor: number;
  /** Gastos pagados desde las cuentas del alcance dentro del periodo. */
  spentMinor: number;
  /** Saldo actual (al cierre de `period.end`) de las cuentas del alcance. */
  remainingMinor: number;
}

const inRange = (m: Movement, range: DateRange): boolean => m.occurredOn >= range.start && m.occurredOn <= range.end;

function accountsIn(state: LedgerState, ids: string[], currency?: Currency): Account[] {
  const wanted = new Set(ids);
  return state.accounts.filter((a) => wanted.has(a.id) && (currency === undefined || a.currency === currency));
}

function totalBalance(accounts: Account[], movements: Movement[], upTo: IsoDate): number {
  return accounts.reduce((sum, a) => sum + accountBalance(a.id, movements, upTo), 0);
}

/**
 * Resumen por moneda del alcance elegido (Saldo general o una billetera). Solo aparecen las
 * monedas que tienen cuentas en el alcance. El "gastado" cuenta únicamente gastos pagados desde
 * las cuentas del alcance (las compras con tarjeta no salieron de una billetera).
 */
export function homeSummary(
  state: LedgerState,
  walletAccountIds: string[],
  period: DateRange,
): Partial<Record<Currency, CurrencySummary>> {
  const summary: Partial<Record<Currency, CurrencySummary>> = {};
  const scope = accountsIn(state, walletAccountIds);

  for (const currency of new Set(scope.map((a) => a.currency))) {
    const accounts = scope.filter((a) => a.currency === currency);
    const ids = new Set(accounts.map((a) => a.id));
    const remainingMinor = totalBalance(accounts, state.movements, period.end);
    const spentMinor = state.movements
      .filter((m) => m.type === 'expense' && m.sourceAccountId !== null && ids.has(m.sourceAccountId) && inRange(m, period))
      .reduce((sum, m) => sum + m.amountMinor, 0);
    summary[currency] = { availableMinor: remainingMinor + spentMinor, spentMinor, remainingMinor };
  }
  return summary;
}

/** Gastos del periodo por categoría, de mayor a menor (a igual monto, por id de categoría). */
export function expensesByCategory(
  state: LedgerState,
  accountIds: string[],
  period: DateRange,
  currency: Currency,
): { categoryId: string; totalMinor: number }[] {
  const ids = new Set(accountIds);
  const totals = new Map<string, number>();
  for (const m of state.movements) {
    if (m.type !== 'expense' || m.currency !== currency || !inRange(m, period)) continue;
    if (m.sourceAccountId === null || !ids.has(m.sourceAccountId) || m.categoryId === null) continue;
    totals.set(m.categoryId, (totals.get(m.categoryId) ?? 0) + m.amountMinor);
  }
  return [...totals]
    .map(([categoryId, totalMinor]) => ({ categoryId, totalMinor }))
    .sort((a, b) => b.totalMinor - a.totalMinor || a.categoryId.localeCompare(b.categoryId));
}

/** Saldo conjunto de las billeteras del alcance al cierre de cada día del periodo. */
export function dailyBalanceSeries(
  state: LedgerState,
  walletAccountIds: string[],
  currency: Currency,
  period: DateRange,
): { date: IsoDate; balanceMinor: number }[] {
  const perAccount = accountsIn(state, walletAccountIds, currency).map((a) =>
    dailyClosingBalances(a.id, state.movements, period.start, period.end),
  );
  const first = perAccount[0];
  if (!first) return [];
  return first.map(({ date }, i) => ({
    date,
    balanceMinor: perAccount.reduce((sum, series) => sum + (series[i]?.balanceMinor ?? 0), 0),
  }));
}

/** "Flujo del mes": saldo al cierre de `period.end` − saldo al cierre del día anterior a `period.start`. */
export function netChange(
  state: LedgerState,
  walletAccountIds: string[],
  currency: Currency,
  period: DateRange,
): number {
  const accounts = accountsIn(state, walletAccountIds, currency);
  return (
    totalBalance(accounts, state.movements, period.end) -
    totalBalance(accounts, state.movements, addDays(period.start, -1))
  );
}

/**
 * Restante proyectado a fin de mes = saldo de las billeteras − consumo de las tarjetas −
 * cuotas de deudas "Debo" que vencen hasta fin de mes (como máximo el pendiente). Las deudas sin
 * monto de cuota no se pueden proyectar y no se restan.
 */
export function projectedRemaining(
  state: LedgerState,
  walletAccountIds: string[],
  cardAccountIds: string[],
  currency: Currency,
  today: IsoDate,
): number {
  const remaining = totalBalance(accountsIn(state, walletAccountIds, currency), state.movements, today);
  const cardsConsumed = -totalBalance(accountsIn(state, cardAccountIds, currency), state.movements, today);
  const monthEnd = endOfMonth(today);

  const installments = state.debts
    .filter(
      (d) =>
        d.direction === 'payable' &&
        d.currency === currency &&
        d.installmentAmountMinor !== null &&
        d.nextDueOn !== null &&
        d.nextDueOn <= monthEnd,
    )
    .reduce((sum, d) => {
      const pending = debtPending(d, state.movements, today);
      return pending > 0 ? sum + Math.min(d.installmentAmountMinor ?? 0, pending) : sum;
    }, 0);

  return remaining - cardsConsumed - installments;
}

/** ¿El saldo cayó por debajo del umbral de aviso? Sin umbral nunca avisa. */
export function isBelowThreshold(balanceMinor: number, thresholdMinor: number | null): boolean {
  return thresholdMinor !== null && balanceMinor < thresholdMinor;
}
