import { eachDay, type IsoDate } from '@/lib/dates';
import type { Account, Movement } from './types';

/** Efecto neto de un movimiento sobre una cuenta: entradas − salidas. */
function deltaFor(accountId: string, movement: Movement): number {
  let delta = 0;
  if (movement.destAccountId === accountId) delta += movement.amountMinor;
  if (movement.sourceAccountId === accountId) delta -= movement.amountMinor;
  return delta;
}

/** Saldo derivado de una cuenta: Σ entradas − Σ salidas con `occurredOn <= upTo` (todo, si no hay `upTo`). */
export function accountBalance(accountId: string, movements: Movement[], upTo?: IsoDate): number {
  let balance = 0;
  for (const m of movements) {
    if (upTo !== undefined && m.occurredOn > upTo) continue;
    balance += deltaFor(accountId, m);
  }
  return balance;
}

/** Saldo al cierre de cada día entre `from` y `to` (inclusive); incluye todo lo anterior a `from`. */
export function dailyClosingBalances(
  accountId: string,
  movements: Movement[],
  from: IsoDate,
  to: IsoDate,
): { date: IsoDate; balanceMinor: number }[] {
  let running = 0;
  const deltaByDay = new Map<IsoDate, number>();
  for (const m of movements) {
    const delta = deltaFor(accountId, m);
    if (delta === 0 || m.occurredOn > to) continue;
    if (m.occurredOn < from) running += delta;
    else deltaByDay.set(m.occurredOn, (deltaByDay.get(m.occurredOn) ?? 0) + delta);
  }
  return eachDay(from, to).map((date) => {
    running += deltaByDay.get(date) ?? 0;
    return { date, balanceMinor: running };
  });
}

/** Consumo de una tarjeta: gastos − pagos (+ consumo previo de la apertura). */
export function cardConsumed(account: Account, movements: Movement[]): number {
  return -accountBalance(account.id, movements);
}

/** Crédito disponible = línea de crédito − consumido. */
export function cardAvailable(account: Account, movements: Movement[]): number {
  if (account.creditLimitMinor === null) {
    throw new Error(`La cuenta ${account.id} no tiene línea de crédito`);
  }
  return account.creditLimitMinor - cardConsumed(account, movements);
}
