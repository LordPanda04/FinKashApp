import type { IsoDate } from '@/lib/dates';
import type { Debt, Movement } from '@/domain/ledger/types';

/**
 * Efecto de un movimiento "Préstamo" sobre el pendiente de una deuda.
 * - Por cobrar: gasto = +monto (se presta), ingreso = −monto (devuelven).
 * - Por pagar: ingreso = +monto (te prestan), gasto = −monto (pagas).
 */
export function debtDelta(debt: Debt, movement: Movement): number {
  if (movement.debtId !== debt.id) return 0;
  if (movement.type !== 'expense' && movement.type !== 'income') return 0;
  const increases = debt.direction === 'receivable' ? 'expense' : 'income';
  return movement.type === increases ? movement.amountMinor : -movement.amountMinor;
}

/** Pendiente = saldo inicial + Σ efectos de los movimientos con `occurredOn <= upTo`. */
export function debtPending(debt: Debt, movements: Movement[], upTo?: IsoDate): number {
  let pending = debt.initialPendingMinor;
  for (const m of movements) {
    if (upTo !== undefined && m.occurredOn > upTo) continue;
    pending += debtDelta(debt, m);
  }
  return pending;
}

export function debtStatus(debt: Debt, movements: Movement[]): 'pending' | 'paid' {
  return debtPending(debt, movements) === 0 ? 'paid' : 'pending';
}
