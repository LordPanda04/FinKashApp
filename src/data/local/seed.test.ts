/** @jest-environment node */
import { createTestDb, type TestDb } from './testDb';
import { seedDatabase } from './seed';
import { viewTableSpecs } from './schema';

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb(viewTableSpecs());
});
afterEach(async () => {
  await db.close();
});

const deps = () => {
  let n = 0;
  return { newId: () => `id-${++n}`, clock: () => new Date('2026-11-20T15:00:00Z') };
};

async function insertCategory(id: string, name: string, systemKey: string | null, sortOrder: number, createdAt = '2026-11-01T00:00:00.000Z') {
  await db.execute(
    'INSERT INTO categories (id, name, color, icon, system_key, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, '#000000', 'star', systemKey, sortOrder, createdAt, createdAt],
  );
}
async function insertMovement(id: string, categoryId: string) {
  await db.execute(
    "INSERT INTO movements (id, type, occurred_on, category_id, source_account_id, amount_minor, currency, created_at, updated_at) VALUES (?, 'expense', '2026-11-10', ?, 'acc', 1000, 'PEN', '2026-11-10T00:00:00.000Z', '2026-11-10T00:00:00.000Z')",
    [id, categoryId],
  );
}
const categoryOfMovement = async (id: string) => (await db.getOptional<{ category_id: string }>('SELECT category_id FROM movements WHERE id = ?', [id]))!.category_id;

describe('seedDatabase', () => {
  it('crea 3 categorías únicas (sin tipo) y los ajustes del dispositivo', async () => {
    await seedDatabase(db, deps());
    const cats = await db.getAll<{ name: string; system_key: string | null }>('SELECT name, system_key FROM categories ORDER BY sort_order');
    expect(cats).toEqual([
      { name: 'Otros', system_key: 'other' },
      { name: 'Préstamo', system_key: 'loan' },
      { name: 'Devolución / Reembolso', system_key: null },
    ]);
    expect(await db.getAll('SELECT hide_amounts, show_projection, home_scope FROM device_settings')).toEqual([
      { hide_amounts: 0, show_projection: 0, home_scope: 'general' },
    ]);
  });

  it('ejecutarla dos veces no duplica nada (la app se abre varias veces)', async () => {
    await seedDatabase(db, deps());
    await seedDatabase(db, deps());
    expect(await db.getAll('SELECT id FROM categories')).toHaveLength(3);
    expect(await db.getAll('SELECT id FROM device_settings')).toHaveLength(1);
  });

  it('completa solo lo que falta y respeta lo existente', async () => {
    await insertCategory('x', 'Otros', 'other', 0);
    await seedDatabase(db, deps());
    expect(await db.getAll<{ id: string; icon: string }>("SELECT id, icon FROM categories WHERE system_key = 'other'")).toEqual([{ id: 'x', icon: 'star' }]);
    expect(await db.getAll('SELECT id FROM categories')).toHaveLength(3);
  });

  it('las filas sembradas no tienen user_id y llevan marcas de tiempo del reloj', async () => {
    await seedDatabase(db, deps());
    const row = await db.getOptional<{ user_id: string | null; created_at: string; updated_at: string }>('SELECT user_id, created_at, updated_at FROM categories LIMIT 1');
    expect(row).toEqual({ user_id: null, created_at: '2026-11-20T15:00:00.000Z', updated_at: '2026-11-20T15:00:00.000Z' });
  });
});

describe('fusión de categorías duplicadas de versiones anteriores (gasto/ingreso)', () => {
  async function legacyState() {
    // Como las dejaba la versión anterior: cada categoría de sistema en dos versiones.
    await insertCategory('otros-g', 'Otros', 'other', 0);
    await insertCategory('prest-g', 'Préstamo', 'loan', 1);
    await insertCategory('dev-g', 'Devolución / Reembolso', null, 2);
    await insertCategory('otros-i', 'Otros', 'other', 0, '2026-11-01T00:00:01.000Z');
    await insertCategory('prest-i', 'Préstamo', 'loan', 1, '2026-11-01T00:00:01.000Z');
    await insertCategory('dev-i', 'Devolución / Reembolso', null, 2, '2026-11-01T00:00:01.000Z');
    await insertMovement('m1', 'otros-g');
    await insertMovement('m2', 'otros-i');
    await insertMovement('m3', 'prest-i');
    await insertMovement('m4', 'dev-i');
  }

  it('deja una sola de cada una y reasigna los movimientos de las repetidas', async () => {
    await legacyState();
    await seedDatabase(db, deps());
    const ids = (await db.getAll<{ id: string }>('SELECT id FROM categories ORDER BY sort_order, id')).map((r) => r.id);
    expect(ids).toEqual(['otros-g', 'prest-g', 'dev-g']);
    expect(await categoryOfMovement('m1')).toBe('otros-g');
    expect(await categoryOfMovement('m2')).toBe('otros-g');
    expect(await categoryOfMovement('m3')).toBe('prest-g');
    expect(await categoryOfMovement('m4')).toBe('dev-g');
  });

  it('conserva la categoría más antigua (menor orden, luego creación, luego id)', async () => {
    await insertCategory('b', 'Otros', 'other', 0, '2026-11-01T00:00:00.000Z');
    await insertCategory('a', 'Otros', 'other', 0, '2026-11-01T00:00:00.000Z');
    await seedDatabase(db, deps());
    expect((await db.getAll<{ id: string }>("SELECT id FROM categories WHERE system_key = 'other'")).map((r) => r.id)).toEqual(['a']);
  });

  it('fusiona también las categorías de usuario con el mismo nombre (sin distinguir mayúsculas)', async () => {
    await insertCategory('c1', 'Comida', null, 5);
    await insertCategory('c2', ' comida ', null, 6);
    await insertCategory('t1', 'Transporte', null, 7);
    await insertMovement('m1', 'c2');
    await seedDatabase(db, deps());
    const names = (await db.getAll<{ id: string }>("SELECT id FROM categories WHERE system_key IS NULL AND name != 'Devolución / Reembolso' ORDER BY sort_order")).map((r) => r.id);
    expect(names).toEqual(['c1', 't1']);
    expect(await categoryOfMovement('m1')).toBe('c1');
  });

  it('no toca categorías distintas ni movimientos de la que se conserva', async () => {
    await insertCategory('c1', 'Comida', null, 5);
    await insertCategory('t1', 'Transporte', null, 6);
    await insertMovement('m1', 'c1');
    await insertMovement('m2', 't1');
    await seedDatabase(db, deps());
    expect(await categoryOfMovement('m1')).toBe('c1');
    expect(await categoryOfMovement('m2')).toBe('t1');
  });

  it('es idempotente: una segunda ejecución no cambia nada', async () => {
    await legacyState();
    await seedDatabase(db, deps());
    const before = await db.getAll('SELECT id, updated_at FROM categories ORDER BY id');
    const movesBefore = await db.getAll('SELECT id, category_id, updated_at FROM movements ORDER BY id');
    await seedDatabase(db, deps());
    expect(await db.getAll('SELECT id, updated_at FROM categories ORDER BY id')).toEqual(before);
    expect(await db.getAll('SELECT id, category_id, updated_at FROM movements ORDER BY id')).toEqual(movesBefore);
  });

  it('marca updated_at de los movimientos reasignados con el reloj', async () => {
    await legacyState();
    await seedDatabase(db, deps());
    const moved = await db.getOptional<{ updated_at: string }>("SELECT updated_at FROM movements WHERE id = 'm2'");
    expect(moved!.updated_at).toBe('2026-11-20T15:00:00.000Z');
    const untouched = await db.getOptional<{ updated_at: string }>("SELECT updated_at FROM movements WHERE id = 'm1'");
    expect(untouched!.updated_at).toBe('2026-11-10T00:00:00.000Z');
  });
});
