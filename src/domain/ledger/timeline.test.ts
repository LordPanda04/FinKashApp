import type { Violation } from './timeline';
import { checkChange } from './timeline';
import type { Account, Category, Debt, LedgerState, Movement } from './types';

const accounts: Account[] = [
  { id: 'yapePen', kind: 'wallet', walletId: 'yape', currency: 'PEN', creditLimitMinor: null },
  { id: 'plinPen', kind: 'wallet', walletId: 'plin', currency: 'PEN', creditLimitMinor: null },
  { id: 'bcpCard', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 },
];
const categories: Category[] = [
  { id: 'food', kind: 'expense', systemKey: null },
  { id: 'salary', kind: 'income', systemKey: null },
  { id: 'loanInc', kind: 'income', systemKey: 'loan' },
  { id: 'loanExp', kind: 'expense', systemKey: 'loan' },
];
const carlos: Debt = {
  id: 'carlos',
  direction: 'receivable',
  currency: 'PEN',
  initialPendingMinor: 15000,
  installmentAmountMinor: null,
  nextDueOn: null,
};

const TODAY = '2026-11-20';

function state(movements: Movement[] = []): LedgerState {
  return { accounts, categories, debts: [carlos], movements };
}

function mv(partial: Partial<Movement>): Movement {
  return {
    id: 'm',
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

const income = (id: string, on: string, amount: number, dest = 'yapePen'): Movement =>
  mv({ id, type: 'income', occurredOn: on, amountMinor: amount, destAccountId: dest, categoryId: 'salary' });
const expense = (id: string, on: string, amount: number, source = 'yapePen'): Movement =>
  mv({ id, type: 'expense', occurredOn: on, amountMinor: amount, sourceAccountId: source, categoryId: 'food' });

function violationsOf(result: ReturnType<typeof checkChange>): Violation[] {
  if (result.ok) throw new Error('se esperaba una violación');
  expect(result.error.code).toBe('TIMELINE_VIOLATION');
  return (result.error.details as { violations: Violation[] }).violations;
}

describe('checkChange — saldo de billeteras', () => {
  it('ingreso y gasto el mismo día con saldo 0 no se bloquean (se revisa el cierre del día)', () => {
    const s = state([income('i1', '2026-11-10', 10000)]);
    const r = checkChange({ kind: 'create', movement: expense('e1', '2026-11-10', 8000) }, s, TODAY);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.map((m) => m.id).sort()).toEqual(['e1', 'i1']);
  });

  it('gastar exactamente todo el saldo (queda en 0) es válido', () => {
    const s = state([income('i1', '2026-11-10', 10000)]);
    expect(checkChange({ kind: 'create', movement: expense('e1', '2026-11-12', 10000) }, s, TODAY).ok).toBe(true);
  });

  it('un gasto sin fondos se bloquea el día del gasto', () => {
    const r = checkChange({ kind: 'create', movement: expense('e1', '2026-11-10', 8000) }, state(), TODAY);
    expect(violationsOf(r)).toEqual([
      { code: 'WALLET_NEGATIVE', entityId: 'yapePen', date: '2026-11-10', shortfallMinor: 8000 },
    ]);
  });

  it('mover el gasto antes del ingreso que lo cubría se bloquea e informa día y faltante', () => {
    const s = state([income('i1', '2026-11-10', 10000), expense('e1', '2026-11-12', 8000)]);
    const r = checkChange(
      { kind: 'update', movement: expense('e1', '2026-11-05', 8000) },
      s,
      TODAY,
    );
    expect(violationsOf(r)).toEqual([
      { code: 'WALLET_NEGATIVE', entityId: 'yapePen', date: '2026-11-05', shortfallMinor: 8000 },
    ]);
    if (!r.ok) {
      expect(r.error.message).toContain('2026-11-05');
      expect(r.error.message).toContain('S/ 80.00');
    }
  });

  it('eliminar el ingreso que cubría un gasto se bloquea', () => {
    const s = state([income('i1', '2026-11-10', 10000), expense('e1', '2026-11-12', 8000)]);
    const r = checkChange({ kind: 'delete', movementId: 'i1' }, s, TODAY);
    expect(violationsOf(r)).toEqual([
      { code: 'WALLET_NEGATIVE', entityId: 'yapePen', date: '2026-11-12', shortfallMinor: 8000 },
    ]);
  });

  it('eliminar un gasto es válido', () => {
    const s = state([income('i1', '2026-11-10', 10000), expense('e1', '2026-11-12', 8000)]);
    const r = checkChange({ kind: 'delete', movementId: 'e1' }, s, TODAY);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.map((m) => m.id)).toEqual(['i1']);
  });

  it('mover un ingreso a otra billetera revisa la cuenta anterior', () => {
    const s = state([income('i1', '2026-11-10', 10000), expense('e1', '2026-11-12', 8000)]);
    const r = checkChange({ kind: 'update', movement: income('i1', '2026-11-10', 10000, 'plinPen') }, s, TODAY);
    expect(violationsOf(r)).toEqual([
      { code: 'WALLET_NEGATIVE', entityId: 'yapePen', date: '2026-11-12', shortfallMinor: 8000 },
    ]);
  });

  it('mover un gasto a otra billetera revisa la cuenta nueva', () => {
    const s = state([income('i1', '2026-11-10', 10000), expense('e1', '2026-11-12', 8000)]);
    const r = checkChange({ kind: 'update', movement: expense('e1', '2026-11-12', 8000, 'plinPen') }, s, TODAY);
    expect(violationsOf(r)).toEqual([
      { code: 'WALLET_NEGATIVE', entityId: 'plinPen', date: '2026-11-12', shortfallMinor: 8000 },
    ]);
  });

  it('informa solo la primera violación por entidad', () => {
    // El saldo queda negativo del 10 al 20 de noviembre (11 días), pero se informa solo el primero.
    const r = checkChange({ kind: 'create', movement: expense('e1', '2026-11-10', 8000) }, state(), TODAY);
    expect(violationsOf(r)).toHaveLength(1);
  });

  it('un movimiento con fecha futura se revisa hasta su fecha', () => {
    const s = state([income('i1', '2026-11-10', 10000)]);
    const r = checkChange({ kind: 'create', movement: expense('e1', '2026-12-05', 12000) }, s, TODAY);
    expect(violationsOf(r)).toEqual([
      { code: 'WALLET_NEGATIVE', entityId: 'yapePen', date: '2026-12-05', shortfallMinor: 2000 },
    ]);
  });
});

describe('checkChange — tarjetas', () => {
  it('un gasto que supera la línea de crédito se bloquea', () => {
    const r = checkChange(
      { kind: 'create', movement: expense('e1', '2026-11-10', 210000, 'bcpCard') },
      state(),
      TODAY,
    );
    expect(violationsOf(r)).toEqual([
      { code: 'CARD_OVER_LIMIT', entityId: 'bcpCard', date: '2026-11-10', shortfallMinor: 10000 },
    ]);
  });

  it('un gasto dentro de la línea es válido', () => {
    const r = checkChange(
      { kind: 'create', movement: expense('e1', '2026-11-10', 200000, 'bcpCard') },
      state(),
      TODAY,
    );
    expect(r.ok).toBe(true);
  });

  it('pagar más de lo consumido se bloquea como CARD_OVERPAID', () => {
    const s = state([income('i1', '2026-11-01', 20000, 'plinPen')]);
    const pago = mv({
      id: 'p1',
      type: 'card_payment',
      occurredOn: '2026-11-10',
      amountMinor: 5000,
      sourceAccountId: 'plinPen',
      destAccountId: 'bcpCard',
    });
    const r = checkChange({ kind: 'create', movement: pago }, s, TODAY);
    expect(violationsOf(r)).toEqual([
      { code: 'CARD_OVERPAID', entityId: 'bcpCard', date: '2026-11-10', shortfallMinor: 5000 },
    ]);
  });
});

describe('checkChange — deudas', () => {
  it('devolver más de lo pendiente se bloquea como DEBT_NEGATIVE', () => {
    const devolucion = mv({
      id: 'd1',
      type: 'income',
      occurredOn: '2026-11-10',
      amountMinor: 20000,
      destAccountId: 'yapePen',
      categoryId: 'loanInc',
      debtId: 'carlos',
    });
    const r = checkChange({ kind: 'create', movement: devolucion }, state(), TODAY);
    expect(violationsOf(r)).toEqual([
      { code: 'DEBT_NEGATIVE', entityId: 'carlos', date: '2026-11-10', shortfallMinor: 5000 },
    ]);
  });

  it('devolver exactamente lo pendiente es válido', () => {
    const devolucion = mv({
      id: 'd1',
      type: 'income',
      occurredOn: '2026-11-10',
      amountMinor: 15000,
      destAccountId: 'yapePen',
      categoryId: 'loanInc',
      debtId: 'carlos',
    });
    expect(checkChange({ kind: 'create', movement: devolucion }, state(), TODAY).ok).toBe(true);
  });
});

describe('checkChange — validación de forma e identificadores', () => {
  it('un create con forma inválida devuelve el código de validateMovement', () => {
    const r = checkChange(
      { kind: 'create', movement: mv({ id: 'x', type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'yapePen' }) },
      state(),
      TODAY,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SAME_ACCOUNT');
  });

  it('update de un id inexistente falla con MOVEMENT_NOT_FOUND', () => {
    const r = checkChange({ kind: 'update', movement: income('zzz', '2026-11-10', 1000) }, state(), TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('MOVEMENT_NOT_FOUND');
  });

  it('delete de un id inexistente falla con MOVEMENT_NOT_FOUND', () => {
    const r = checkChange({ kind: 'delete', movementId: 'zzz' }, state(), TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('MOVEMENT_NOT_FOUND');
  });

  it('create con un id ya existente falla con MOVEMENT_ID_DUPLICATE', () => {
    const s = state([income('i1', '2026-11-10', 1000)]);
    const r = checkChange({ kind: 'create', movement: income('i1', '2026-11-11', 1000) }, s, TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('MOVEMENT_ID_DUPLICATE');
  });

  it('no modifica el estado recibido', () => {
    const s = state([income('i1', '2026-11-10', 10000)]);
    checkChange({ kind: 'create', movement: expense('e1', '2026-11-10', 100) }, s, TODAY);
    expect(s.movements).toHaveLength(1);
  });
});
