import type { Category, LedgerState, Movement } from '@/domain/ledger/types';
import { planCategoryDeletion } from './categories';

const baseCategories: Category[] = [
  { id: 'food', systemKey: null },
  { id: 'salary', systemKey: null },
  { id: 'other', systemKey: 'other' },
  { id: 'loan', systemKey: 'loan' },
];

function mv(id: string, categoryId: string | null, type: Movement['type'] = 'expense'): Movement {
  return {
    id,
    type,
    occurredOn: '2026-11-10',
    description: null,
    categoryId,
    sourceAccountId: type === 'expense' ? 'yape' : null,
    destAccountId: type === 'income' ? 'yape' : null,
    amountMinor: 1000,
    currency: 'PEN',
    debtId: null,
    declaredBalanceMinor: null,
  };
}

function stateOf(movements: Movement[], categories: Category[] = baseCategories): LedgerState {
  return { accounts: [], debts: [], categories, movements };
}

describe('planCategoryDeletion', () => {
  it('reasigna los movimientos (gastos e ingresos por igual) a la única "Otros"', () => {
    const s = stateOf([mv('a', 'food'), mv('b', 'food', 'income'), mv('c', 'other')]);
    expect(planCategoryDeletion('food', s)).toEqual({
      ok: true,
      value: { reassignToCategoryId: 'other', movementIds: ['a', 'b'] },
    });
  });

  it('una categoría sin movimientos devuelve lista vacía', () => {
    expect(planCategoryDeletion('salary', stateOf([mv('c', 'other')]))).toEqual({
      ok: true,
      value: { reassignToCategoryId: 'other', movementIds: [] },
    });
  });

  it.each(['other', 'loan'])('"%s" es de sistema: CATEGORY_PROTECTED', (id) => {
    const r = planCategoryDeletion(id, stateOf([]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('CATEGORY_PROTECTED');
  });

  it('una categoría inexistente devuelve CATEGORY_NOT_FOUND', () => {
    const r = planCategoryDeletion('nope', stateOf([]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('si falta "Otros" devuelve SYSTEM_CATEGORY_MISSING', () => {
    const withoutOther = baseCategories.filter((c) => c.id !== 'other');
    const r = planCategoryDeletion('food', stateOf([mv('a', 'food')], withoutOther));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('SYSTEM_CATEGORY_MISSING');
      expect(r.error.message).toContain('«Otros»');
    }
  });
});
