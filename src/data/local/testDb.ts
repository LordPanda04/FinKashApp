/**
 * Base SQLite real para pruebas (solo Node; nunca se importa desde la app).
 * Usa `node:sqlite` y crea tablas planas con el nombre de vista de cada tabla del esquema.
 */
import { DatabaseSync } from 'node:sqlite';
import type { LocalDb, LocalTx, TableSpec } from './db';

export interface TestDb extends LocalDb {
  close(): Promise<void>;
}

type SqlParam = null | number | bigint | string;

export async function createTestDb(tables: TableSpec[]): Promise<TestDb> {
  const sqlite = new DatabaseSync(':memory:');
  for (const table of tables) {
    const columns = Object.entries(table.columns).map(([name, type]) => `${name} ${type.toUpperCase()}`);
    sqlite.exec(`CREATE TABLE ${table.name} (id TEXT PRIMARY KEY, ${columns.join(', ')})`);
  }

  const getAll = async <T>(sql: string, params: unknown[] = []): Promise<T[]> =>
    sqlite.prepare(sql).all(...(params as SqlParam[])).map((row) => ({ ...row }) as T);
  const getOptional = async <T>(sql: string, params: unknown[] = []): Promise<T | null> => {
    const row = sqlite.prepare(sql).get(...(params as SqlParam[]));
    return row ? ({ ...row } as T) : null;
  };
  const execute = async (sql: string, params: unknown[] = []): Promise<unknown> =>
    sqlite.prepare(sql).run(...(params as SqlParam[]));
  const tx: LocalTx = { getAll, getOptional, execute };

  // Cola de promesas: las transacciones se ejecutan de una en una.
  let queue: Promise<unknown> = Promise.resolve();
  const writeTransaction = <T>(fn: (tx: LocalTx) => Promise<T>): Promise<T> => {
    const run = async (): Promise<T> => {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const value = await fn(tx);
        sqlite.exec('COMMIT');
        return value;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    };
    const result = queue.then(run, run);
    queue = result.catch(() => undefined);
    return result;
  };

  return { ...tx, writeTransaction, close: async () => sqlite.close() };
}
