import type { LocalTx } from '@/data/local/db';
import type { Movement } from '@/domain/ledger/types';

const COLUMNS =
  'type, occurred_on, description, category_id, source_account_id, dest_account_id, amount_minor, currency, debt_id, declared_balance_minor';

function values(m: Movement): unknown[] {
  return [
    m.type, m.occurredOn, m.description, m.categoryId, m.sourceAccountId, m.destAccountId,
    m.amountMinor, m.currency, m.debtId, m.declaredBalanceMinor,
  ];
}

export async function insertMovementRow(tx: LocalTx, m: Movement, stamp: string): Promise<void> {
  await tx.execute(
    `INSERT INTO movements (id, user_id, ${COLUMNS}, created_at, updated_at) VALUES (?, NULL, ${COLUMNS.split(', ').map(() => '?').join(', ')}, ?, ?)`,
    [m.id, ...values(m), stamp, stamp],
  );
}

export async function updateMovementRow(tx: LocalTx, m: Movement, stamp: string): Promise<void> {
  const sets = COLUMNS.split(', ').map((c) => `${c} = ?`).join(', ');
  await tx.execute(`UPDATE movements SET ${sets}, updated_at = ? WHERE id = ?`, [...values(m), stamp, m.id]);
}

export async function deleteMovementRow(tx: LocalTx, id: string): Promise<void> {
  await tx.execute('DELETE FROM movements WHERE id = ?', [id]);
}
