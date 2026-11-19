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

describe('seedDatabase', () => {
  it('crea 3 categorías por tipo y los ajustes del dispositivo', async () => {
    await seedDatabase(db, deps());
    const cats = await db.getAll<{ kind: string; name: string; system_key: string | null }>(
      'SELECT kind, name, system_key FROM categories ORDER BY kind, sort_order',
    );
    expect(cats).toEqual([
      { kind: 'expense', name: 'Otros', system_key: 'other' },
      { kind: 'expense', name: 'Préstamo', system_key: 'loan' },
      { kind: 'expense', name: 'Devolución / Reembolso', system_key: null },
      { kind: 'income', name: 'Otros', system_key: 'other' },
      { kind: 'income', name: 'Préstamo', system_key: 'loan' },
      { kind: 'income', name: 'Devolución / Reembolso', system_key: null },
    ]);
    expect(await db.getAll('SELECT hide_amounts, show_projection, home_scope FROM device_settings')).toEqual([
      { hide_amounts: 0, show_projection: 0, home_scope: 'general' },
    ]);
  });

  it('ejecutarla dos veces no duplica nada (la app se abre varias veces)', async () => {
    await seedDatabase(db, deps());
    await seedDatabase(db, deps());
    expect(await db.getAll('SELECT id FROM categories')).toHaveLength(6);
    expect(await db.getAll('SELECT id FROM device_settings')).toHaveLength(1);
  });

  it('completa solo lo que falta y respeta lo existente', async () => {
    await db.execute(
      "INSERT INTO categories (id, kind, name, color, icon, system_key, sort_order) VALUES ('x', 'expense', 'Otros', '#000000', 'star', 'other', 0)",
    );
    await seedDatabase(db, deps());
    const others = await db.getAll<{ id: string; icon: string }>(
      "SELECT id, icon FROM categories WHERE kind = 'expense' AND system_key = 'other'",
    );
    expect(others).toEqual([{ id: 'x', icon: 'star' }]);
    expect(await db.getAll('SELECT id FROM categories')).toHaveLength(6);
  });

  it('las filas sembradas no tienen user_id y llevan marcas de tiempo del reloj', async () => {
    await seedDatabase(db, deps());
    const row = await db.getOptional<{ user_id: string | null; created_at: string; updated_at: string }>(
      'SELECT user_id, created_at, updated_at FROM categories LIMIT 1',
    );
    expect(row).toEqual({
      user_id: null,
      created_at: '2026-11-20T15:00:00.000Z',
      updated_at: '2026-11-20T15:00:00.000Z',
    });
  });
});
