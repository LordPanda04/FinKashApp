import type { Movement } from '@/domain/ledger/types';
import type { IsoDate } from '@/lib/dates';
import type { FormValues, MovementKind } from './presenter';

/** Monto en unidades mínimas → texto "24.50" con aritmética entera (nunca punto flotante). */
function amountToText(amountMinor: number): string {
  return `${Math.floor(amountMinor / 100)}.${String(amountMinor % 100).padStart(2, '0')}`;
}

/** Inversa de `buildMovementDraft`: valores del formulario para editar un gasto, ingreso o transferencia. */
export function toFormValues(m: Movement, today: IsoDate): FormValues {
  if (m.type !== 'expense' && m.type !== 'income' && m.type !== 'transfer') {
    throw new Error(`Un movimiento de tipo ${m.type} no se edita con el formulario`);
  }
  const kind: MovementKind = m.type;
  return {
    kind,
    amountText: amountToText(m.amountMinor),
    accountId: kind === 'income' ? m.destAccountId : m.sourceAccountId,
    destAccountId: kind === 'transfer' ? m.destAccountId : null,
    categoryId: m.categoryId,
    debtId: m.debtId,
    newDebt: null,
    description: m.description ?? '',
    isToday: m.occurredOn === today,
    date: m.occurredOn,
  };
}
