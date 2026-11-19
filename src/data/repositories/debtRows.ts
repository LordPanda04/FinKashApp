import type { LocalTx } from '@/data/local/db';
import type { DebtInput } from '@/validation/inputs';

/** INSERT de una deuda (compartido por `debts.create` y por `movements.createWithNewDebt`). */
export async function insertDebtRow(tx: LocalTx, id: string, v: DebtInput, stamp: string): Promise<void> {
  await tx.execute(
    `INSERT INTO debts (id, user_id, direction, counterparty_name, counterparty_type, currency, initial_pending_minor,
       due_on, installment_amount_minor, installments_remaining, next_due_on, notes, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, v.direction, v.counterpartyName, v.counterpartyType, v.currency, v.initialPendingMinor,
      v.dueOn ?? null, v.installmentAmountMinor ?? null, v.installmentsRemaining ?? null,
      v.nextDueOn ?? null, v.notes ?? null, stamp, stamp,
    ],
  );
}
