/** @jest-environment node */
import type { TableSpec } from './db';
import { createTestDb } from './testDb';

const tables: TableSpec[] = [{ name: 'items', columns: { name: 'text', qty: 'integer' } }];

describe('createTestDb', () => {
  it('inserta y lee filas con SQLite real', async () => {
    const db = await createTestDb(tables);
    await db.execute('INSERT INTO items (id, name, qty) VALUES (?, ?, ?)', ['a', 'pan', 9007199254740991]);
    expect(await db.getAll('SELECT id, name, qty FROM items')).toEqual([
      { id: 'a', name: 'pan', qty: 9007199254740991 },
    ]);
    expect(await db.getOptional('SELECT id FROM items WHERE id = ?', ['zzz'])).toBeNull();
    await db.close();
  });

  it('writeTransaction revierte todo si la función lanza', async () => {
    const db = await createTestDb(tables);
    await expect(
      db.writeTransaction(async (tx) => {
        await tx.execute('INSERT INTO items (id, name, qty) VALUES (?, ?, ?)', ['a', 'pan', 1]);
        throw new Error('falla a mitad');
      }),
    ).rejects.toThrow('falla a mitad');
    expect(await db.getAll('SELECT id FROM items')).toEqual([]);
    await db.close();
  });

  it('writeTransaction confirma lo escrito si no hay error y devuelve el valor', async () => {
    const db = await createTestDb(tables);
    const out = await db.writeTransaction(async (tx) => {
      await tx.execute('INSERT INTO items (id, name, qty) VALUES (?, ?, ?)', ['a', 'pan', 1]);
      return 'listo';
    });
    expect(out).toBe('listo');
    expect(await db.getAll('SELECT id FROM items')).toHaveLength(1);
    await db.close();
  });

  it('serializa las transacciones concurrentes', async () => {
    const db = await createTestDb(tables);
    const order: string[] = [];
    const run = (tag: string) =>
      db.writeTransaction(async (tx) => {
        order.push(`${tag}:inicio`);
        await new Promise((r) => setTimeout(r, 10));
        await tx.execute('INSERT INTO items (id, name, qty) VALUES (?, ?, ?)', [tag, tag, 1]);
        order.push(`${tag}:fin`);
      });
    await Promise.all([run('a'), run('b')]);
    expect(order).toEqual(['a:inicio', 'a:fin', 'b:inicio', 'b:fin']);
    await db.close();
  });
});
