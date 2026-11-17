import type { Category, LedgerState, Movement } from '@/domain/ledger/types';
import { planCategoryDeletion } from './categories';

const baseCategories: Category[] = [
  { id: 'food', kind: 'expense', systemKey: null },
  { id: 'salary', kind: 'income', systemKey: null },
  { id: 'otherExp', kind: 'expense', systemKey: 'other' },
  { id: 'otherInc', kind: 'income', systemKey: 'other' },
  { id: 'loanExp', kind: 'expense', systemKey: 'loan' },
  { id: 'loanInc', kind: 'income', systemKey: 'loan' },
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
  it('reasigna los movimientos de un gasto a "Otros" de gasto', () => {
    const s = stateOf([mv('a', 'food'), mv('b', 'food'), mv('c', 'otherExp')]);
    expect(planCategoryDeletion('food', s)).toEqual({
      ok: true,
      value: { reassignToCategoryId: 'otherExp', movementIds: ['a', 'b'] },
    });
  });

  it('reasigna los movimientos de un ingreso a "Otros" de ingreso', () => {
    const s = stateOf([mv('a', 'salary', 'income'), mv('b', 'food')]);
    expect(planCategoryDeletion('salary', s)).toEqual({
      ok: true,
      value: { reassignToCategoryId: 'otherInc', movementIds: ['a'] },
    });
  });

  it('una categoría sin movimientos devuelve lista vacía', () => {
    expect(planCategoryDeletion('food', stateOf([mv('c', 'otherExp')]))).toEqual({
      ok: true,
      value: { reassignToCategoryId: 'otherExp', movementIds: [] },
    });
  });

  it.each(['otherExp', 'otherInc', 'loanExp', 'loanInc'])('"%s" es de sistema: CATEGORY_PROTECTED', (id) => {
    const r = planCategoryDeletion(id, stateOf([]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('CATEGORY_PROTECTED');
  });

  it('una categoría inexistente devuelve CATEGORY_NOT_FOUND', () => {
    const r = planCategoryDeletion('nope', stateOf([]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('si falta "Otros" del mismo tipo devuelve SYSTEM_CATEGORY_MISSING', () => {
    const withoutOtherExp = baseCategories.filter((c) => c.id !== 'otherExp');
    const r = planCategoryDeletion('food', stateOf([mv('a', 'food')], withoutOtherExp));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SYSTEM_CATEGORY_MISSING');
  });

  it('"Otros" del otro tipo no sirve de reemplazo', () => {
    const onlyOtherInc = baseCategories.filter((c) => c.id !== 'otherExp');
    const r = planCategoryDeletion('food', stateOf([], onlyOtherInc));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SYSTEM_CATEGORY_MISSING');
  });
});
