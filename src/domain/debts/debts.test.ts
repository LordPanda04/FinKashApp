import type { Debt, Movement } from '@/domain/ledger/types';
import { debtDelta, debtPending, debtStatus } from './debts';

const carlos: Debt = {
  id: 'carlos',
  direction: 'receivable',
  currency: 'PEN',
  initialPendingMinor: 0,
  installmentAmountMinor: null,
  nextDueOn: null,
};
const interbank: Debt = {
  id: 'interbank',
  direction: 'payable',
  currency: 'PEN',
  initialPendingMinor: 89000,
  installmentAmountMinor: 44500,
  nextDueOn: '2026-11-25',
};

function loan(partial: Partial<Movement>): Movement {
  return {
    id: `m-${Math.random()}`,
    type: 'expense',
    occurredOn: '2026-11-10',
    description: null,
    categoryId: 'loan',
    sourceAccountId: 'yapePen',
    destAccountId: null,
    amountMinor: 0,
    currency: 'PEN',
    debtId: 'carlos',
    declaredBalanceMinor: null,
    ...partial,
  };
}

describe('debtDelta', () => {
  it('por cobrar: el gasto Préstamo suma y el ingreso resta', () => {
    expect(debtDelta(carlos, loan({ type: 'expense', amountMinor: 15000 }))).toBe(15000);
    expect(debtDelta(carlos, loan({ type: 'income', amountMinor: 5000 }))).toBe(-5000);
  });

  it('por pagar: el ingreso Préstamo suma y el gasto resta', () => {
    expect(debtDelta(interbank, loan({ debtId: 'interbank', type: 'income', amountMinor: 1000 }))).toBe(1000);
    expect(debtDelta(interbank, loan({ debtId: 'interbank', type: 'expense', amountMinor: 1000 }))).toBe(-1000);
  });

  it('es 0 si el movimiento es de otra deuda', () => {
    expect(debtDelta(carlos, loan({ debtId: 'otra', amountMinor: 15000 }))).toBe(0);
  });

  it('es 0 para tipos de movimiento que no son gasto ni ingreso', () => {
    expect(debtDelta(carlos, loan({ type: 'transfer', amountMinor: 15000 }))).toBe(0);
  });
});

describe('debtPending y debtStatus', () => {
  it('por cobrar: 15000 prestados y 5000 devueltos → 10000 pendiente', () => {
    const ms = [
      loan({ type: 'expense', amountMinor: 15000, occurredOn: '2026-11-01' }),
      loan({ type: 'income', amountMinor: 5000, occurredOn: '2026-11-05' }),
    ];
    expect(debtPending(carlos, ms)).toBe(10000);
    expect(debtStatus(carlos, ms)).toBe('pending');
  });

  it('por cobrar: al devolver todo queda pagada', () => {
    const ms = [
      loan({ type: 'expense', amountMinor: 15000, occurredOn: '2026-11-01' }),
      loan({ type: 'income', amountMinor: 5000, occurredOn: '2026-11-05' }),
      loan({ type: 'income', amountMinor: 10000, occurredOn: '2026-11-08' }),
    ];
    expect(debtPending(carlos, ms)).toBe(0);
    expect(debtStatus(carlos, ms)).toBe('paid');
  });

  it('por pagar: parte del saldo inicial menos lo pagado', () => {
    const ms = [loan({ debtId: 'interbank', type: 'expense', amountMinor: 44500 })];
    expect(debtPending(interbank, ms)).toBe(44500);
  });

  it('un movimiento con otro debtId no altera el pendiente', () => {
    const ms = [loan({ debtId: 'otra', type: 'expense', amountMinor: 99999 })];
    expect(debtPending(interbank, ms)).toBe(89000);
  });

  it('respeta el corte upTo', () => {
    const ms = [
      loan({ type: 'expense', amountMinor: 15000, occurredOn: '2026-11-01' }),
      loan({ type: 'income', amountMinor: 5000, occurredOn: '2026-11-05' }),
    ];
    expect(debtPending(carlos, ms, '2026-11-04')).toBe(15000);
  });
});
