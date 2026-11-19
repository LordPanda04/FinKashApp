import type { Clock, IdGen } from '@/data/types';
import { newId as defaultNewId } from '@/lib/id';

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
