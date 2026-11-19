import type { Account, Category, Debt, LedgerState, Movement } from './types';
import { validateMovement } from './validateMovement';

const accounts: Account[] = [
  { id: 'yapePen', kind: 'wallet', walletId: 'yape', currency: 'PEN', creditLimitMinor: null },
  { id: 'yapeUsd', kind: 'wallet', walletId: 'yape', currency: 'USD', creditLimitMinor: null },
  { id: 'plinPen', kind: 'wallet', walletId: 'plin', currency: 'PEN', creditLimitMinor: null },
  { id: 'bcpCard', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 },
];
const categories: Category[] = [
  { id: 'food', systemKey: null },
  { id: 'salary', systemKey: null },
  { id: 'loan', systemKey: 'loan' },
];
const debts: Debt[] = [
  {
    id: 'carlos',
    direction: 'receivable',
    currency: 'PEN',
    initialPendingMinor: 0,
    installmentAmountMinor: null,
    nextDueOn: null,
  },
  {
    id: 'debtUsd',
    direction: 'receivable',
    currency: 'USD',
    initialPendingMinor: 0,
    installmentAmountMinor: null,
    nextDueOn: null,
  },
];

function makeState(movements: Movement[] = []): LedgerState {
  return { accounts, categories, debts, movements };
}

function mv(partial: Partial<Movement>): Movement {
  return {
    id: 'm1',
    type: 'expense',
    occurredOn: '2026-11-10',
    description: null,
    categoryId: null,
    sourceAccountId: null,
    destAccountId: null,
    amountMinor: 1000,
    currency: 'PEN',
    debtId: null,
    declaredBalanceMinor: null,
    ...partial,
  };
}

function codeOf(movement: Movement, state: LedgerState = makeState()): string | null {
  const r = validateMovement(movement, state);
  return r.ok ? null : r.error.code;
}

describe('validateMovement — casos válidos', () => {
  it('gasto desde tarjeta con categoría de gasto', () => {
    const m = mv({ type: 'expense', sourceAccountId: 'bcpCard', categoryId: 'food' });
    expect(validateMovement(m, makeState())).toEqual({ ok: true, value: m });
  });

  it('gasto desde billetera', () => {
    expect(codeOf(mv({ type: 'expense', sourceAccountId: 'yapePen', categoryId: 'food' }))).toBeNull();
  });

  it('ingreso a billetera con categoría de ingreso', () => {
    expect(codeOf(mv({ type: 'income', destAccountId: 'yapePen', categoryId: 'salary' }))).toBeNull();
  });

  it('transferencia entre billeteras de la misma moneda', () => {
    expect(
      codeOf(mv({ type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'plinPen' })),
    ).toBeNull();
  });

  it('pago de tarjeta desde billetera', () => {
    expect(
      codeOf(mv({ type: 'card_payment', sourceAccountId: 'plinPen', destAccountId: 'bcpCard' })),
    ).toBeNull();
  });

  it('apertura de billetera (tramo de entrada)', () => {
    expect(codeOf(mv({ type: 'opening', destAccountId: 'yapePen' }))).toBeNull();
  });

  it('apertura de tarjeta (tramo de salida)', () => {
    expect(codeOf(mv({ type: 'opening', sourceAccountId: 'bcpCard' }))).toBeNull();
  });

  it('arreglo de billetera que baja el saldo', () => {
    expect(
      codeOf(mv({ type: 'adjustment', sourceAccountId: 'yapePen', declaredBalanceMinor: 0 })),
    ).toBeNull();
  });

  it('préstamo con deuda de la misma moneda', () => {
    expect(
      codeOf(
        mv({ type: 'expense', sourceAccountId: 'yapePen', categoryId: 'loan', debtId: 'carlos' }),
      ),
    ).toBeNull();
  });
});

describe('validateMovement — AMOUNT_INVALID', () => {
  it.each([0, -5, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN])('rechaza monto %p', (amountMinor) => {
    expect(
      codeOf(mv({ type: 'expense', sourceAccountId: 'yapePen', categoryId: 'food', amountMinor })),
    ).toBe('AMOUNT_INVALID');
  });
});

describe('validateMovement — LEG_INVALID', () => {
  it('ingreso hacia tarjeta', () => {
    expect(codeOf(mv({ type: 'income', destAccountId: 'bcpCard', categoryId: 'salary' }))).toBe(
      'LEG_INVALID',
    );
  });

  it('gasto sin cuenta de origen', () => {
    expect(codeOf(mv({ type: 'expense', categoryId: 'food' }))).toBe('LEG_INVALID');
  });

  it('gasto con cuenta de destino', () => {
    expect(
      codeOf(
        mv({
          type: 'expense',
          sourceAccountId: 'yapePen',
          destAccountId: 'plinPen',
          categoryId: 'food',
        }),
      ),
    ).toBe('LEG_INVALID');
  });

  it('transferencia sin destino', () => {
    expect(codeOf(mv({ type: 'transfer', sourceAccountId: 'yapePen' }))).toBe('LEG_INVALID');
  });

  it('transferencia hacia una tarjeta', () => {
    expect(
      codeOf(mv({ type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'bcpCard' })),
    ).toBe('LEG_INVALID');
  });

  it('pago de tarjeta hacia una billetera', () => {
    expect(
      codeOf(mv({ type: 'card_payment', sourceAccountId: 'yapePen', destAccountId: 'plinPen' })),
    ).toBe('LEG_INVALID');
  });

  it('pago de tarjeta desde una tarjeta', () => {
    expect(
      codeOf(mv({ type: 'card_payment', sourceAccountId: 'bcpCard', destAccountId: 'bcpCard' })),
    ).toBe('LEG_INVALID');
  });

  it('apertura con dos tramos', () => {
    expect(
      codeOf(mv({ type: 'opening', sourceAccountId: 'yapePen', destAccountId: 'plinPen' })),
    ).toBe('LEG_INVALID');
  });

  it('apertura sin ningún tramo', () => {
    expect(codeOf(mv({ type: 'opening' }))).toBe('LEG_INVALID');
  });

  it('apertura de billetera con tramo de salida', () => {
    expect(codeOf(mv({ type: 'opening', sourceAccountId: 'yapePen' }))).toBe('LEG_INVALID');
  });

  it('apertura de tarjeta con tramo de entrada', () => {
    expect(codeOf(mv({ type: 'opening', destAccountId: 'bcpCard' }))).toBe('LEG_INVALID');
  });

  it('arreglo sobre una tarjeta', () => {
    expect(
      codeOf(mv({ type: 'adjustment', sourceAccountId: 'bcpCard', declaredBalanceMinor: 0 })),
    ).toBe('LEG_INVALID');
  });

  it('arreglo con dos tramos', () => {
    expect(
      codeOf(
        mv({
          type: 'adjustment',
          sourceAccountId: 'yapePen',
          destAccountId: 'plinPen',
          declaredBalanceMinor: 0,
        }),
      ),
    ).toBe('LEG_INVALID');
  });
});

describe('validateMovement — ACCOUNT_NOT_FOUND', () => {
  it('cuenta de origen inexistente', () => {
    expect(codeOf(mv({ type: 'expense', sourceAccountId: 'nope', categoryId: 'food' }))).toBe(
      'ACCOUNT_NOT_FOUND',
    );
  });

  it('cuenta de destino inexistente', () => {
    expect(codeOf(mv({ type: 'income', destAccountId: 'nope', categoryId: 'salary' }))).toBe(
      'ACCOUNT_NOT_FOUND',
    );
  });
});

describe('validateMovement — monedas y misma cuenta', () => {
  it('transferencia hacia una cuenta en otra moneda', () => {
    expect(
      codeOf(mv({ type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'yapeUsd' })),
    ).toBe('CURRENCY_MISMATCH');
  });

  it('gasto en USD desde una cuenta en PEN', () => {
    expect(
      codeOf(
        mv({ type: 'expense', sourceAccountId: 'yapePen', categoryId: 'food', currency: 'USD' }),
      ),
    ).toBe('CURRENCY_MISMATCH');
  });

  it('transferencia a la misma cuenta', () => {
    expect(
      codeOf(mv({ type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'yapePen' })),
    ).toBe('SAME_ACCOUNT');
  });
});

describe('validateMovement — categoría', () => {
  it('gasto sin categoría', () => {
    expect(codeOf(mv({ type: 'expense', sourceAccountId: 'yapePen' }))).toBe('CATEGORY_REQUIRED');
  });

  it('ingreso sin categoría', () => {
    expect(codeOf(mv({ type: 'income', destAccountId: 'yapePen' }))).toBe('CATEGORY_REQUIRED');
  });

  it('transferencia con categoría', () => {
    expect(
      codeOf(
        mv({
          type: 'transfer',
          sourceAccountId: 'yapePen',
          destAccountId: 'plinPen',
          categoryId: 'food',
        }),
      ),
    ).toBe('CATEGORY_NOT_ALLOWED');
  });

  it('las categorías no tienen tipo: la misma categoría sirve para un gasto y para un ingreso', () => {
    expect(codeOf(mv({ type: 'expense', sourceAccountId: 'yapePen', categoryId: 'salary' }))).toBeNull();
    expect(codeOf(mv({ type: 'income', destAccountId: 'yapePen', categoryId: 'food' }))).toBeNull();
  });

  it('categoría inexistente', () => {
    expect(codeOf(mv({ type: 'expense', sourceAccountId: 'yapePen', categoryId: 'nope' }))).toBe(
      'CATEGORY_NOT_FOUND',
    );
  });
});

describe('validateMovement — deuda', () => {
  it('categoría Préstamo sin deuda', () => {
    expect(
      codeOf(mv({ type: 'expense', sourceAccountId: 'yapePen', categoryId: 'loan' })),
    ).toBe('DEBT_REQUIRED');
  });

  it('deuda con categoría que no es Préstamo', () => {
    expect(
      codeOf(
        mv({ type: 'expense', sourceAccountId: 'yapePen', categoryId: 'food', debtId: 'carlos' }),
      ),
    ).toBe('DEBT_NOT_ALLOWED');
  });

  it('deuda en otra moneda que el movimiento', () => {
    expect(
      codeOf(
        mv({ type: 'expense', sourceAccountId: 'yapePen', categoryId: 'loan', debtId: 'debtUsd' }),
      ),
    ).toBe('DEBT_CURRENCY_MISMATCH');
  });

  it('deuda inexistente', () => {
    expect(
      codeOf(
        mv({ type: 'expense', sourceAccountId: 'yapePen', categoryId: 'loan', debtId: 'nope' }),
      ),
    ).toBe('DEBT_NOT_FOUND');
  });

  it('transferencia con deuda', () => {
    expect(
      codeOf(
        mv({
          type: 'transfer',
          sourceAccountId: 'yapePen',
          destAccountId: 'plinPen',
          debtId: 'carlos',
        }),
      ),
    ).toBe('DEBT_NOT_ALLOWED');
  });
});

describe('validateMovement — apertura duplicada', () => {
  const existing = mv({ id: 'open1', type: 'opening', destAccountId: 'yapePen' });

  it('segunda apertura de la misma cuenta', () => {
    expect(codeOf(mv({ id: 'open2', type: 'opening', destAccountId: 'yapePen' }), makeState([existing]))).toBe(
      'OPENING_DUPLICATE',
    );
  });

  it('al editar la propia apertura no es duplicado', () => {
    expect(codeOf(mv({ id: 'open1', type: 'opening', destAccountId: 'yapePen', amountMinor: 5 }), makeState([existing]))).toBeNull();
  });

  it('apertura de otra cuenta es válida', () => {
    expect(codeOf(mv({ id: 'open2', type: 'opening', destAccountId: 'plinPen' }), makeState([existing]))).toBeNull();
  });
});

describe('validateMovement — arreglo', () => {
  it('sin saldo declarado', () => {
    expect(codeOf(mv({ type: 'adjustment', sourceAccountId: 'yapePen' }))).toBe(
      'ADJUSTMENT_DECLARED_REQUIRED',
    );
  });

  it('con saldo declarado negativo', () => {
    expect(
      codeOf(mv({ type: 'adjustment', sourceAccountId: 'yapePen', declaredBalanceMinor: -1 })),
    ).toBe('ADJUSTMENT_DECLARED_REQUIRED');
  });
});
