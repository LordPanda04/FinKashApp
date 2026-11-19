import type { CategoryRecord } from '@/data/types';
import { colors } from '@/ui/tokens';

export function describeCategory(c: CategoryRecord): {
  title: string;
  kindLabel: 'Gasto' | 'Ingreso';
  kindColor: string;
  canDelete: boolean;
} {
  return {
    title: c.name,
    kindLabel: c.kind === 'expense' ? 'Gasto' : 'Ingreso',
    kindColor: c.kind === 'expense' ? colors.danger : colors.primary,
    // Las categorías de sistema ("Otros", "Préstamo") no se eliminan.
    canDelete: c.systemKey === null,
  };
}

/** Texto de confirmación al eliminar: cuántos movimientos pasan a "Otros". */
export function deleteMessage(name: string, movementCount: number): string {
  if (movementCount === 0) return `«${name}» no tiene movimientos. Solo se elimina la categoría.`;
  if (movementCount === 1) return '1 movimiento pasará a «Otros».';
  return `${movementCount} movimientos pasarán a «Otros».`;
}
