import { RowReader, loadLedgerState } from '@/data/local/ledgerState';
import type { LocalDb, SqlReader } from '@/data/local/db';
import type { CategoryRecord } from '@/data/types';
import { planCategoryDeletion } from '@/domain/categories/categories';
import { err, ok, type Result } from '@/lib/result';
import { categoryInput, parseOrError, type CategoryInput } from '@/validation/inputs';
import { nameKey, resolveDeps, type RepoDeps } from './shared';

type Row = Record<string, unknown>;

function recordFromRow(row: Row): CategoryRecord {
  const r = new RowReader('categories', row);
  const systemKey = r.textOrNull('system_key') === null ? null : r.oneOf<'other' | 'loan'>('system_key', ['other', 'loan']);
  return {
    id: r.text('id'),
    kind: r.oneOf<'expense' | 'income'>('kind', ['expense', 'income']),
    systemKey,
    name: r.text('name'),
    color: r.text('color'),
    icon: r.text('icon'),
    sortOrder: r.int('sort_order'),
  };
}

const COLUMNS = 'id, kind, system_key, name, color, icon, sort_order';

async function findById(reader: SqlReader, id: string): Promise<CategoryRecord | null> {
  const row = await reader.getOptional<Row>(`SELECT ${COLUMNS} FROM categories WHERE id = ?`, [id]);
  return row ? recordFromRow(row) : null;
}

async function nameTaken(reader: SqlReader, kind: string, name: string, exceptId?: string): Promise<boolean> {
  const rows = await reader.getAll<Row>('SELECT id, name FROM categories WHERE kind = ?', [kind]);
  return rows.some((r) => r.id !== exceptId && nameKey(String(r.name)) === nameKey(name));
}

const duplicate = (name: string) => err<never>('CATEGORY_DUPLICATE', `Ya existe una categoría llamada "${name}".`);
const notFound = () => err<never>('CATEGORY_NOT_FOUND', 'La categoría no existe.');

const updateInput = categoryInput.omit({ kind: true }).partial();

export function createCategoryRepository(db: LocalDb, depsIn?: RepoDeps) {
  const { newId, now } = resolveDeps(depsIn);

  return {
    async list(): Promise<CategoryRecord[]> {
      const rows = await db.getAll<Row>(`SELECT ${COLUMNS} FROM categories ORDER BY sort_order, name`);
      return rows.map(recordFromRow);
    },

    async create(input: CategoryInput): Promise<Result<CategoryRecord>> {
      const parsed = parseOrError(categoryInput, input);
      if (!parsed.ok) return parsed;
      const value = parsed.value;
      return db.writeTransaction(async (tx) => {
        if (await nameTaken(tx, value.kind, value.name)) return duplicate(value.name);
        const max = await tx.getOptional<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM categories WHERE kind = ?', [value.kind]);
        const id = newId();
        const stamp = now();
        await tx.execute(
          `INSERT INTO categories (id, user_id, kind, name, color, icon, system_key, sort_order, created_at, updated_at)
           VALUES (?, NULL, ?, ?, ?, ?, NULL, ?, ?, ?)`,
          [id, value.kind, value.name, value.color, value.icon, (max?.m ?? -1) + 1, stamp, stamp],
        );
        return ok((await findById(tx, id))!);
      });
    },

    /** Las categorías de sistema solo admiten cambiar color e ícono (no el nombre). */
    async update(id: string, patch: { name?: string; color?: string; icon?: string }): Promise<Result<CategoryRecord>> {
      const parsed = parseOrError(updateInput, patch);
      if (!parsed.ok) return parsed;
      const value = parsed.value;
      return db.writeTransaction(async (tx) => {
        const current = await findById(tx, id);
        if (!current) return notFound();
        if (value.name !== undefined && value.name !== current.name) {
          if (current.systemKey !== null) {
            return err<never>('CATEGORY_PROTECTED', 'Las categorías "Otros" y "Préstamo" no se pueden renombrar.');
          }
          if (await nameTaken(tx, current.kind, value.name, id)) return duplicate(value.name);
        }
        await tx.execute('UPDATE categories SET name = ?, color = ?, icon = ?, updated_at = ? WHERE id = ?', [
          value.name ?? current.name,
          value.color ?? current.color,
          value.icon ?? current.icon,
          now(),
          id,
        ]);
        return ok((await findById(tx, id))!);
      });
    },

    /** Reasigna los movimientos a "Otros" del mismo tipo y borra la categoría, todo en una transacción. */
    async remove(id: string): Promise<Result<{ reassigned: number }>> {
      return db.writeTransaction(async (tx) => {
        const plan = planCategoryDeletion(id, await loadLedgerState(tx));
        if (!plan.ok) return plan;
        const { reassignToCategoryId, movementIds } = plan.value;
        await tx.execute('UPDATE movements SET category_id = ?, updated_at = ? WHERE category_id = ?', [
          reassignToCategoryId,
          now(),
          id,
        ]);
        await tx.execute('DELETE FROM categories WHERE id = ?', [id]);
        return ok({ reassigned: movementIds.length });
      });
    },
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;
