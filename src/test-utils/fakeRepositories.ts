import { createChangeNotifier } from '@/data/changes';
import type { Repositories } from '@/data/index';
import type { CategoryRecord } from '@/data/types';
import type { Movement } from '@/domain/ledger/types';
import { err, ok } from '@/lib/result';

/**
 * Repositorios en memoria para probar pantallas (la capa de datos real se prueba con SQLite en
 * `src/data`). Imitan mensajes y códigos de error de los repositorios reales y notifican cambios.
 */
export function createFakeRepositories(seed: { categories?: CategoryRecord[]; movements?: Movement[] } = {}) {
  const changes = createChangeNotifier();
  let categories: CategoryRecord[] = seed.categories ?? seededCategories();
  const movements: Movement[] = seed.movements ?? [];
  let nextId = 100;

  const calls = { create: jest.fn(), update: jest.fn(), remove: jest.fn() };

  const repos = {
    changes,
    categories: {
      list: async () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
      create: async (input: { kind: 'expense' | 'income'; name: string; color: string; icon: string }) => {
        calls.create(input);
        const name = input.name.trim();
        if (!name) return err('INPUT_INVALID', 'El nombre es obligatorio.');
        if (categories.some((c) => c.kind === input.kind && c.name.toLowerCase() === name.toLowerCase())) {
          return err('CATEGORY_DUPLICATE', `Ya existe una categoría llamada "${name}".`);
        }
        const record: CategoryRecord = { id: `c${nextId++}`, kind: input.kind, name, color: input.color, icon: input.icon, systemKey: null, sortOrder: nextId };
        categories = [...categories, record];
        changes.notify();
        return ok(record);
      },
      update: async (id: string, patch: { name?: string; color?: string; icon?: string }) => {
        calls.update(id, patch);
        const current = categories.find((c) => c.id === id);
        if (!current) return err('CATEGORY_NOT_FOUND', 'La categoría no existe.');
        if (patch.name !== undefined && patch.name !== current.name) {
          if (current.systemKey) return err('CATEGORY_PROTECTED', 'Las categorías "Otros" y "Préstamo" no se pueden renombrar.');
          if (categories.some((c) => c.id !== id && c.kind === current.kind && c.name.toLowerCase() === patch.name!.trim().toLowerCase())) {
            return err('CATEGORY_DUPLICATE', `Ya existe una categoría llamada "${patch.name.trim()}".`);
          }
        }
        const next = { ...current, ...patch, name: patch.name?.trim() ?? current.name };
        categories = categories.map((c) => (c.id === id ? next : c));
        changes.notify();
        return ok(next);
      },
      remove: async (id: string) => {
        calls.remove(id);
        const current = categories.find((c) => c.id === id);
        if (!current) return err('CATEGORY_NOT_FOUND', 'La categoría no existe.');
        if (current.systemKey) return err('CATEGORY_PROTECTED', 'Las categorías "Otros" y "Préstamo" no se pueden eliminar.');
        const reassigned = movements.filter((m) => m.categoryId === id).length;
        categories = categories.filter((c) => c.id !== id);
        changes.notify();
        return ok({ reassigned });
      },
    },
    movements: {
      list: async (filter: { categoryId?: string } = {}) =>
        movements.filter((m) => !filter.categoryId || m.categoryId === filter.categoryId),
    },
  };

  return { repos: repos as unknown as Repositories, calls, changes };
}

export function seededCategories(): CategoryRecord[] {
  const base = [
    { name: 'Otros', systemKey: 'other', color: '#6B7280', icon: 'category' },
    { name: 'Préstamo', systemKey: 'loan', color: '#F59E0B', icon: 'handshake' },
    { name: 'Devolución / Reembolso', systemKey: null, color: '#10B981', icon: 'savings' },
  ] as const;
  return (['expense', 'income'] as const).flatMap((kind, k) =>
    base.map((b, i) => ({ id: `${kind}-${i}`, kind, systemKey: b.systemKey, name: b.name, color: b.color, icon: b.icon, sortOrder: k * 10 + i })),
  ) as CategoryRecord[];
}

export function movementOf(partial: Partial<Movement> & { id: string }): Movement {
  return {
    type: 'expense', occurredOn: '2026-11-10', description: null, categoryId: null, sourceAccountId: 'acc',
    destAccountId: null, amountMinor: 1000, currency: 'PEN', debtId: null, declaredBalanceMinor: null, ...partial,
  };
}
