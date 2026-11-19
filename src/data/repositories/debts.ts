import { z } from 'zod';
import type { LocalDb, SqlReader } from '@/data/local/db';
import { RowReader, loadLedgerState } from '@/data/local/ledgerState';
import type { DebtRecord } from '@/data/types';
import { debtPending, debtStatus } from '@/domain/debts/debts';
import { err, ok, type Result } from '@/lib/result';
import { debtInput, parseOrError, type DebtInput } from '@/validation/inputs';
import { resolveDeps, transact, type RepoDeps } from './shared';

type Row = Record<string, unknown>;

function debtRecordFromRow(row: Row): DebtRecord {
  const r = new RowReader('debts', row);
  return {
    id: r.text('id'),
    direction: r.oneOf<DebtRecord['direction']>('direction', ['receivable', 'payable']),
    counterpartyName: r.text('counterparty_name'),
    counterpartyType: r.oneOf<DebtRecord['counterpartyType']>('counterparty_type', ['person', 'institution']),
    currency: r.currency('currency'),
    initialPendingMinor: r.int('initial_pending_minor'),
    dueOn: r.textOrNull('due_on'),
    installmentAmountMinor: r.intOrNull('installment_amount_minor'),
    installmentsRemaining: r.intOrNull('installments_remaining'),
    nextDueOn: r.textOrNull('next_due_on'),
    notes: r.textOrNull('notes'),
  };
}

async function findDebt(reader: SqlReader, id: string): Promise<DebtRecord | null> {
  const row = await reader.getOptional<Row>('SELECT * FROM debts WHERE id = ?', [id]);
  return row ? debtRecordFromRow(row) : null;
}

/** Campo opcional que además admite `null` para borrar el valor. */
const clearable = <T extends z.ZodType>(field: z.ZodOptional<T>) => field.unwrap().nullable().optional();

const updateInput = z
  .object({
    counterpartyName: debtInput.shape.counterpartyName,
    installmentAmountMinor: clearable(debtInput.shape.installmentAmountMinor),
    installmentsRemaining: clearable(debtInput.shape.installmentsRemaining),
    nextDueOn: clearable(debtInput.shape.nextDueOn),
    dueOn: clearable(debtInput.shape.dueOn),
    notes: clearable(debtInput.shape.notes),
  })
  .partial();
export type DebtUpdate = z.infer<typeof updateInput>;

const COLUMN_OF: Record<keyof DebtUpdate, string> = {
  counterpartyName: 'counterparty_name',
  installmentAmountMinor: 'installment_amount_minor',
  installmentsRemaining: 'installments_remaining',
  nextDueOn: 'next_due_on',
  dueOn: 'due_on',
  notes: 'notes',
};

export function createDebtRepository(db: LocalDb, depsIn?: RepoDeps) {
  const { newId, now } = resolveDeps(depsIn);

  return {
    /** Deudas con su pendiente y estado, derivados de los movimientos vinculados. */
    async list(): Promise<(DebtRecord & { pendingMinor: number; status: 'pending' | 'paid' })[]> {
      const [rows, state] = await Promise.all([
        db.getAll<Row>('SELECT * FROM debts ORDER BY created_at, id'),
        loadLedgerState(db),
      ]);
      return rows.map(debtRecordFromRow).map((debt) => ({
        ...debt,
        pendingMinor: debtPending(debt, state.movements),
        status: debtStatus(debt, state.movements),
      }));
    },

    /** Una deuda que ya existía se crea con su saldo pendiente inicial y sin mover ninguna billetera. */
    async create(input: DebtInput): Promise<Result<DebtRecord>> {
      const parsed = parseOrError(debtInput, input);
      if (!parsed.ok) return parsed;
      const v = parsed.value;
      return transact(db, async (tx) => {
        const id = newId();
        const stamp = now();
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
        return (await findDebt(tx, id))!;
      });
    },

    async update(id: string, patch: DebtUpdate): Promise<Result<DebtRecord>> {
      const parsed = parseOrError(updateInput, patch);
      if (!parsed.ok) return parsed;
      return db.writeTransaction(async (tx) => {
        const current = await findDebt(tx, id);
        if (!current) return err<DebtRecord>('DEBT_NOT_FOUND', 'La deuda no existe.');
        const entries = Object.entries(parsed.value) as [keyof DebtUpdate, unknown][];
        if (entries.length > 0) {
          const sets = entries.map(([key]) => `${COLUMN_OF[key]} = ?`).join(', ');
          await tx.execute(`UPDATE debts SET ${sets}, updated_at = ? WHERE id = ?`, [
            ...entries.map(([, value]) => value ?? null),
            now(),
            id,
          ]);
        }
        return ok((await findDebt(tx, id))!);
      });
    },
  };
}

export type DebtRepository = ReturnType<typeof createDebtRepository>;
