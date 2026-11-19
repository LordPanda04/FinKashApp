import type { CategoryRecord } from '@/data/types';

export function describeCategory(c: CategoryRecord): { title: string; canDelete: boolean } {
  // Las categorías no tienen tipo (gasto/ingreso). Las de sistema ("Otros", "Préstamo") no se eliminan.
  return { title: c.name, canDelete: c.systemKey === null };
}

/** Texto de confirmación al eliminar: cuántos movimientos pasan a "Otros". */
export function deleteMessage(name: string, movementCount: number): string {
  if (movementCount === 0) return `«${name}» no tiene movimientos. Solo se elimina la categoría.`;
  if (movementCount === 1) return '1 movimiento pasará a «Otros».';
  return `${movementCount} movimientos pasarán a «Otros».`;
}
