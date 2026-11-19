/** Definición declarativa de una tabla (sin `id`: PowerSync lo agrega a toda tabla). */
export interface TableSpec {
  name: string;
  columns: Record<string, 'text' | 'integer'>;
}

/**
 * Interfaz mínima de base de datos que usan los repositorios. `PowerSyncDatabase` la cumple
 * de forma estructural; en las pruebas se usa una base real en Node (`testDb.ts`).
 */
export interface SqlReader {
  getAll<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getOptional<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

export interface LocalTx extends SqlReader {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface LocalDb extends LocalTx {
  /** Todo o nada: si `fn` lanza, se revierte lo escrito. Las transacciones se serializan. */
  writeTransaction<T>(fn: (tx: LocalTx) => Promise<T>): Promise<T>;
}
