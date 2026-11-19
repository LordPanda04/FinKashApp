import type { LocalDb } from '@/data/local/db';
import { loadLedgerState, movementFromRow } from '@/data/local/ledgerState';
import { buildAdjustment } from '@/domain/ledger/builders';
import { checkChange } from '@/domain/ledger/timeline';
import type { Movement } from '@/domain/ledger/types';
import { todayInLima, type IsoDate } from '@/lib/dates';
import { insertDebtRow } from './debtRows';
import { deleteMovementRow, insertMovementRow, updateMovementRow } from './movementRows';
import { abort, resolveDeps, transact, unwrap, type RepoDeps } from './shared';
import { debtInput, parseOrError, type DebtInput } from '@/validation/inputs';

export type MovementDraft = Omit<Movement, 'id'>;

export interface MovementFilter {
  from?: IsoDate;
  to?: IsoDate;
  accountId?: string;
  categoryId?: string;
}

/**
 * Cada operación abre UNA transacción de escritura: lee el libro dentro de ella, valida con
 * `checkChange` (forma + saldos al cierre de cada día) y solo entonces escribe. Como las
 * transacciones se serializan, dos escrituras simultáneas no pueden validar contra el mismo
 * estado viejo.
 */
export function createMovementRepository(db: LocalDb, depsIn?: RepoDeps) {
  const { newId, clock, now } = resolveDeps(depsIn);
  const today = () => todayInLima(clock());

  return {
    /** Más recientes primero (fecha, luego creación). */
    async list(filter: MovementFilter = {}): Promise<Movement[]> {
      const where: string[] = [];
      const params: unknown[] = [];
      if (filter.from) {
        where.push('occurred_on >= ?');
        params.push(filter.from);
      }
      if (filter.to) {
        where.push('occurred_on <= ?');
        params.push(filter.to);
      }
      if (filter.accountId) {
        where.push('(source_account_id = ? OR dest_account_id = ?)');
        params.push(filter.accountId, filter.accountId);
      }
      if (filter.categoryId) {
        where.push('category_id = ?');
        params.push(filter.categoryId);
      }
      const sql = `SELECT * FROM movements ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
                   ORDER BY occurred_on DESC, created_at DESC, id DESC`;
      return (await db.getAll<Record<string, unknown>>(sql, params)).map(movementFromRow);
    },

    async get(id: string): Promise<Movement | null> {
      const row = await db.getOptional<Record<string, unknown>>('SELECT * FROM movements WHERE id = ?', [id]);
      return row ? movementFromRow(row) : null;
    },

    /**
     * Gasto o ingreso "Préstamo" con una deuda nueva: crea la deuda y el movimiento en UNA transacción.
     * Gasto → "Me deben" (receivable); ingreso → "Debo" (payable). Si el movimiento se rechaza no queda la deuda.
     */
    createWithNewDebt(
      draft: MovementDraft,
      debt: Omit<DebtInput, 'direction' | 'currency' | 'initialPendingMinor'>,
    ) {
      return transact(db, async (tx) => {
        if (draft.type !== 'expense' && draft.type !== 'income') {
          abort('DEBT_NOT_ALLOWED', 'Solo un gasto o un ingreso con categoría "Préstamo" puede crear una deuda.');
        }
        const parsed = unwrap(
          parseOrError(debtInput, {
            ...debt,
            direction: draft.type === 'expense' ? 'receivable' : 'payable',
            currency: draft.currency,
            initialPendingMinor: 0,
          }),
        );
        const stamp = now();
        const debtId = newId();
        await insertDebtRow(tx, debtId, parsed, stamp);
        const movement: Movement = { id: newId(), ...draft, debtId };
        unwrap(checkChange({ kind: 'create', movement }, await loadLedgerState(tx), today()));
        await insertMovementRow(tx, movement, stamp);
        return { movement, debtId };
      });
    },

    create(draft: MovementDraft) {
      return transact(db, async (tx) => {
        const movement: Movement = { id: newId(), ...draft };
        unwrap(checkChange({ kind: 'create', movement }, await loadLedgerState(tx), today()));
        await insertMovementRow(tx, movement, now());
        return movement;
      });
    },

    update(id: string, draft: MovementDraft) {
      return transact(db, async (tx) => {
        const movement: Movement = { id, ...draft };
        unwrap(checkChange({ kind: 'update', movement }, await loadLedgerState(tx), today()));
        await updateMovementRow(tx, movement, now());
        return movement;
      });
    },

    remove(id: string) {
      return transact(db, async (tx) => {
        unwrap(checkChange({ kind: 'delete', movementId: id }, await loadLedgerState(tx), today()));
        await deleteMovementRow(tx, id);
      });
    },

    /** "Arreglo de billetera": lleva el saldo al cierre de la fecha al valor declarado. `null` si ya coincide. */
    adjustWallet(input: { accountId: string; declaredMinor: number; occurredOn?: IsoDate }) {
      return transact(db, async (tx) => {
        const state = await loadLedgerState(tx);
        const account = state.accounts.find((a) => a.id === input.accountId);
        if (!account) abort('ACCOUNT_NOT_FOUND', 'La cuenta indicada no existe.');
        const adjustment = unwrap(
          buildAdjustment({
            id: newId(),
            account,
            declaredMinor: input.declaredMinor,
            occurredOn: input.occurredOn ?? today(),
            movements: state.movements,
          }),
        );
        if (adjustment === null) return null;
        unwrap(checkChange({ kind: 'create', movement: adjustment }, state, today()));
        await insertMovementRow(tx, adjustment, now());
        return adjustment;
      });
    },
  };
}

export type MovementRepository = ReturnType<typeof createMovementRepository>;
