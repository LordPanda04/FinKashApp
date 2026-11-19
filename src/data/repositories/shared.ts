import type { Clock, IdGen } from '@/data/types';
import type { LocalDb, LocalTx } from '@/data/local/db';
import { newId as defaultNewId } from '@/lib/id';
import type { DomainError, Result } from '@/lib/result';

export interface RepoDeps {
  newId?: IdGen;
  clock?: Clock;
}

/** Resuelve las dependencias inyectables; `now()` da la marca de tiempo ISO (UTC) del reloj. */
export function resolveDeps(deps: RepoDeps = {}): { newId: IdGen; clock: Clock; now: () => string } {
  const clock = deps.clock ?? (() => new Date());
  return { newId: deps.newId ?? defaultNewId, clock, now: () => clock().toISOString() };
}

/** Clave de comparación de nombres: sin espacios sobrantes y sin distinguir mayúsculas. */
export function nameKey(name: string): string {
  return name.trim().toLocaleLowerCase('es-PE');
}

/** Señal interna para abortar (y revertir) una transacción devolviendo un `DomainError`. */
class Abort extends Error {
  constructor(readonly domainError: DomainError) {
    super(domainError.message);
  }
}

/** Dentro de `transact`: devuelve el valor o aborta la transacción con el error. */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Abort(result.error);
  return result.value;
}

/** Aborta la transacción actual con un error de dominio. */
export function abort(code: string, message: string, details?: Record<string, unknown>): never {
  throw new Abort(details ? { code, message, details } : { code, message });
}

/**
 * Ejecuta `fn` en una transacción de escritura. Si `fn` llama a `unwrap`/`abort` con un error, se
 * revierte todo y se devuelve ese error; cualquier otra excepción se propaga (también revierte).
 */
export async function transact<T>(db: LocalDb, fn: (tx: LocalTx) => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await db.writeTransaction(fn) };
  } catch (error) {
    if (error instanceof Abort) return { ok: false, error: error.domainError };
    throw error;
  }
}
