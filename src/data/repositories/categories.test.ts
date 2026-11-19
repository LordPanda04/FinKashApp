/** @jest-environment node */
import { viewTableSpecs } from '@/data/local/schema';
import { seedDatabase } from '@/data/local/seed';
import { createTestDb, type TestDb } from '@/data/local/testDb';
import { createCategoryRepository } from './categories';

let db: TestDb;
let n: number;
const deps = () => ({ newId: () => `id-${++n}`, clock: () => new Date('2026-11-20T15:00:00Z') });

beforeEach(async () => {
  n = 0;
  db = await createTestDb(viewTableSpecs());
  await seedDatabase(db, deps());
});
afterEach(async () => {
  await db.close();
});

const repo = () => createCategoryRepository(db, deps());
const food = { kind: 'expense', name: 'Comida', color: '#FF0000', icon: 'restaurant' } as const;

async function idOf(kind: string, systemKey: string): Promise<string> {
  const row = await db.getOptional<{ id: string }>('SELECT id FROM categories WHERE kind = ? AND system_key = ?', [kind, systemKey]);
  return row!.id;
}
async function addMovement(id: string, categoryId: string): Promise<void> {
  await db.execute(
    "INSERT INTO movements (id, type, occurred_on, category_id, source_account_id, amount_minor, currency) VALUES (?, 'expense', '2026-11-10', ?, 'acc', 1000, 'PEN')",
    [id, categoryId],
  );
}

describe('list y create', () => {
  it('la lista inicial son las 6 categorías sembradas', async () => {
    const list = await repo().list();
    expect(list).toHaveLength(6);
    expect(list.find((c) => c.systemKey === 'loan' && c.kind === 'expense')).toMatchObject({
      name: 'Préstamo',
      color: '#F59E0B',
    });
  });

  it('create agrega "Comida" sin systemKey y al final del orden', async () => {
    const r = await repo().create(food);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ kind: 'expense', name: 'Comida', systemKey: null, color: '#FF0000' });
    const list = await repo().list();
    expect(list).toHaveLength(7);
    expect(list[list.length - 1]!.name).toBe('Comida');
  });

  it('un nombre repetido en el mismo tipo (sin importar mayúsculas) da CATEGORY_DUPLICATE', async () => {
    await repo().create(food);
    const dup = await repo().create({ ...food, name: ' comida ' });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error.code).toBe('CATEGORY_DUPLICATE');
    expect((await repo().create({ ...food, kind: 'income' })).ok).toBe(true);
  });

  it('una entrada inválida da INPUT_INVALID y no escribe', async () => {
    const r = await repo().create({ ...food, color: 'rojo' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INPUT_INVALID');
    expect(await repo().list()).toHaveLength(6);
  });
});

describe('update', () => {
  it('"Otros" no se puede renombrar (CATEGORY_PROTECTED) pero sí cambiar de color', async () => {
    const id = await idOf('expense', 'other');
    const renamed = await repo().update(id, { name: 'Varios' });
    expect(renamed.ok).toBe(false);
    if (!renamed.ok) expect(renamed.error.code).toBe('CATEGORY_PROTECTED');
    const recolored = await repo().update(id, { color: '#123456', icon: 'star' });
    expect(recolored.ok).toBe(true);
    if (recolored.ok) expect(recolored.value).toMatchObject({ name: 'Otros', color: '#123456', icon: 'star' });
  });

  it('una categoría personalizada se puede renombrar y no admite un nombre ya usado', async () => {
    const a = await repo().create(food);
    const b = await repo().create({ ...food, name: 'Transporte' });
    if (!a.ok || !b.ok) throw new Error('setup');
    const ok = await repo().update(a.value.id, { name: 'Alimentos' });
    expect(ok.ok && ok.value.name).toBe('Alimentos');
    const dup = await repo().update(b.value.id, { name: 'alimentos' });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error.code).toBe('CATEGORY_DUPLICATE');
  });

  it('un id inexistente da CATEGORY_NOT_FOUND', async () => {
    const r = await repo().update('nope', { color: '#000000' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('un color inválido da INPUT_INVALID', async () => {
    const id = await idOf('expense', 'other');
    const r = await repo().update(id, { color: 'x' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INPUT_INVALID');
  });
});

describe('remove', () => {
  it('reasigna los movimientos a "Otros" del mismo tipo y borra la categoría', async () => {
    const c = await repo().create(food);
    if (!c.ok) throw new Error('setup');
    await addMovement('m1', c.value.id);
    await addMovement('m2', c.value.id);
    const r = await repo().remove(c.value.id);
    expect(r).toEqual({ ok: true, value: { reassigned: 2 } });
    const otros = await idOf('expense', 'other');
    expect(await db.getAll('SELECT id, category_id FROM movements ORDER BY id')).toEqual([
      { id: 'm1', category_id: otros },
      { id: 'm2', category_id: otros },
    ]);
    expect(await db.getOptional('SELECT id FROM categories WHERE id = ?', [c.value.id])).toBeNull();
  });

  it('una categoría sin movimientos se borra con reassigned 0', async () => {
    const c = await repo().create(food);
    if (!c.ok) throw new Error('setup');
    expect(await repo().remove(c.value.id)).toEqual({ ok: true, value: { reassigned: 0 } });
  });

  it('"Préstamo" y "Otros" dan CATEGORY_PROTECTED y no se tocan', async () => {
    for (const key of ['loan', 'other']) {
      const r = await repo().remove(await idOf('expense', key));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('CATEGORY_PROTECTED');
    }
    expect(await repo().list()).toHaveLength(6);
  });

  it('un id inexistente da CATEGORY_NOT_FOUND', async () => {
    const r = await repo().remove('nope');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('si falla el borrado, la reasignación se revierte (todo o nada)', async () => {
    const c = await repo().create(food);
    if (!c.ok) throw new Error('setup');
    await addMovement('m1', c.value.id);
    await db.execute(
      "CREATE TRIGGER bloquear_borrado BEFORE DELETE ON categories BEGIN SELECT RAISE(ABORT, 'borrado bloqueado'); END",
    );
    await expect(repo().remove(c.value.id)).rejects.toThrow('borrado bloqueado');
    expect(await db.getOptional('SELECT id FROM categories WHERE id = ?', [c.value.id])).not.toBeNull();
    expect(await db.getOptional<{ category_id: string }>("SELECT category_id FROM movements WHERE id = 'm1'")).toEqual({
      category_id: c.value.id,
    });
  });
});
