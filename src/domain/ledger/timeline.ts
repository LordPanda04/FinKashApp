import { debtDelta } from '@/domain/debts/debts';
import { formatMoney, type Currency } from '@/domain/money/money';
import { eachDay, type IsoDate } from '@/lib/dates';
import { err, ok, type Result } from '@/lib/result';
import { dailyClosingBalances } from './balances';
import type { Account, Debt, LedgerState, Movement } from './types';
import { validateMovement } from './validateMovement';

export type LedgerChange =
  | { kind: 'create'; movement: Movement }
  | { kind: 'update'; movement: Movement } // mismo id, nueva versión
  | { kind: 'delete'; movementId: string };

export type ViolationCode = 'WALLET_NEGATIVE' | 'CARD_OVER_LIMIT' | 'CARD_OVERPAID' | 'DEBT_NEGATIVE';

export interface Violation {
  code: ViolationCode;
  entityId: string;
  date: IsoDate;
  shortfallMinor: number;
}

/**
 * Valida un cambio (crear, editar o eliminar un movimiento) contra toda la línea de tiempo.
 *
 * Revisa los saldos al **cierre de cada día** de las cuentas y deudas afectadas (las de la versión
 * anterior y las de la nueva), desde su primer movimiento hasta `max(today, última fecha)`.
 * Si todo es válido devuelve la lista resultante de movimientos; si no, `TIMELINE_VIOLATION`
 * con la primera violación de cada entidad en `error.details.violations`.
 */
export function checkChange(change: LedgerChange, state: LedgerState, today: IsoDate): Result<Movement[]> {
  const previous =
    change.kind === 'create'
      ? undefined
      : state.movements.find((m) => m.id === (change.kind === 'delete' ? change.movementId : change.movement.id));

  if (change.kind === 'create') {
    if (state.movements.some((m) => m.id === change.movement.id)) {
      return err('MOVEMENT_ID_DUPLICATE', 'Ya existe un movimiento con ese identificador.');
    }
  } else if (!previous) {
    return err('MOVEMENT_NOT_FOUND', 'El movimiento indicado no existe.');
  }

  if (change.kind !== 'delete') {
    const shape = validateMovement(change.movement, state);
    if (!shape.ok) return shape;
  }

  const movements = applyChange(change, state.movements);
  const next = change.kind === 'delete' ? undefined : change.movement;

  const accountIds = unique(
    [previous, next].flatMap((m) => (m ? [m.sourceAccountId, m.destAccountId] : [])),
  );
  const debtIds = unique([previous?.debtId, next?.debtId]);

  const violations: Violation[] = [];
  for (const accountId of accountIds) {
    const account = state.accounts.find((a) => a.id === accountId);
    const violation = account && firstAccountViolation(account, movements, today);
    if (violation) violations.push(violation);
  }
  for (const debtId of debtIds) {
    const debt = state.debts.find((d) => d.id === debtId);
    const violation = debt && firstDebtViolation(debt, movements, today);
    if (violation) violations.push(violation);
  }

  if (violations.length > 0) {
    const currencies = new Map<string, Currency>([
      ...state.accounts.map((a): [string, Currency] => [a.id, a.currency]),
      ...state.debts.map((d): [string, Currency] => [d.id, d.currency]),
    ]);
    const message = violations.map((v) => describe(v, currencies.get(v.entityId) ?? 'PEN')).join(' ');
    return err('TIMELINE_VIOLATION', message, { violations });
  }
  return ok(movements);
}

function applyChange(change: LedgerChange, movements: Movement[]): Movement[] {
  switch (change.kind) {
    case 'create':
      return [...movements, change.movement];
    case 'update':
      return movements.map((m) => (m.id === change.movement.id ? change.movement : m));
    case 'delete':
      return movements.filter((m) => m.id !== change.movementId);
  }
}

function unique(ids: (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((id): id is string => id != null))];
}

/** Último día a revisar: hoy, o la última fecha de movimiento si es futura. */
function lastDay(dates: IsoDate[], today: IsoDate): IsoDate {
  return dates.reduce((max, d) => (d > max ? d : max), today);
}

function firstAccountViolation(account: Account, movements: Movement[], today: IsoDate): Violation | null {
  const own = movements.filter((m) => m.sourceAccountId === account.id || m.destAccountId === account.id);
  if (own.length === 0) return null;
  const dates = own.map((m) => m.occurredOn);
  const from = dates.reduce((min, d) => (d < min ? d : min));
  const days = dailyClosingBalances(account.id, movements, from, lastDay(dates, today));

  for (const { date, balanceMinor } of days) {
    if (account.kind === 'wallet') {
      if (balanceMinor < 0) {
        return { code: 'WALLET_NEGATIVE', entityId: account.id, date, shortfallMinor: -balanceMinor };
      }
      continue;
    }
    const consumed = -balanceMinor;
    const limit = account.creditLimitMinor ?? 0;
    if (consumed > limit) {
      return { code: 'CARD_OVER_LIMIT', entityId: account.id, date, shortfallMinor: consumed - limit };
    }
    if (consumed < 0) {
      return { code: 'CARD_OVERPAID', entityId: account.id, date, shortfallMinor: -consumed };
    }
  }
  return null;
}

function firstDebtViolation(debt: Debt, movements: Movement[], today: IsoDate): Violation | null {
  const own = movements.filter((m) => m.debtId === debt.id);
  if (own.length === 0) return null;
  const deltaByDay = new Map<IsoDate, number>();
  for (const m of own) {
    deltaByDay.set(m.occurredOn, (deltaByDay.get(m.occurredOn) ?? 0) + debtDelta(debt, m));
  }
  const dates = own.map((m) => m.occurredOn);
  const from = dates.reduce((min, d) => (d < min ? d : min));

  let pending = debt.initialPendingMinor;
  for (const date of eachDay(from, lastDay(dates, today))) {
    pending += deltaByDay.get(date) ?? 0;
    if (pending < 0) {
      return { code: 'DEBT_NEGATIVE', entityId: debt.id, date, shortfallMinor: -pending };
    }
  }
  return null;
}

function describe(v: Violation, currency: Currency): string {
  const amount = formatMoney(v.shortfallMinor, currency);
  switch (v.code) {
    case 'WALLET_NEGATIVE':
      return `La billetera quedaría con saldo negativo el ${v.date}: faltan ${amount}.`;
    case 'CARD_OVER_LIMIT':
      return `La tarjeta superaría su línea de crédito el ${v.date} por ${amount}.`;
    case 'CARD_OVERPAID':
      return `El pago superaría lo consumido de la tarjeta el ${v.date} por ${amount}.`;
    case 'DEBT_NEGATIVE':
      return `La deuda quedaría con pendiente negativo el ${v.date}: sobran ${amount}.`;
  }
}
