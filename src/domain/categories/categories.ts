import type { LedgerState } from '@/domain/ledger/types';
import { err, ok, type Result } from '@/lib/result';

/**
 * Plan para eliminar una categoría de usuario: todos sus movimientos (gastos e ingresos) pasan a la
 * única "Otros". Las categorías de sistema ("Otros", "Préstamo") no se pueden eliminar.
 */
export function planCategoryDeletion(
  categoryId: string,
  state: LedgerState,
): Result<{ reassignToCategoryId: string; movementIds: string[] }> {
  const category = state.categories.find((c) => c.id === categoryId);
  if (!category) return err('CATEGORY_NOT_FOUND', 'La categoría no existe.');
  if (category.systemKey !== null) {
    return err('CATEGORY_PROTECTED', 'Las categorías "Otros" y "Préstamo" no se pueden eliminar.');
  }

  const other = state.categories.find((c) => c.systemKey === 'other');
  if (!other) {
    return err('SYSTEM_CATEGORY_MISSING', 'No existe la categoría «Otros» para reasignar los movimientos.');
  }

  const movementIds = state.movements.filter((m) => m.categoryId === categoryId).map((m) => m.id);
  return ok({ reassignToCategoryId: other.id, movementIds });
}
