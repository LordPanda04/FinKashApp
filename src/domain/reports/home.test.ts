import type { Account, Category, Debt, LedgerState, Movement } from '@/domain/ledger/types';
import {
  dailyBalanceSeries,
  expensesByCategory,
  homeSummary,
  isBelowThreshold,
  netChange,
  projectedRemaining,
  type DateRange,
} from './home';

const accounts: Account[] = [
  { id: 'yape', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
  { id: 'plin', kind: 'wallet', walletId: 'w2', currency: 'PEN', creditLimitMinor: null },
  { id: 'yapeUsd', kind: 'wallet', walletId: 'w1', currency: 'USD', creditLimitMinor: null },
  { id: 'bcpCard', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 },
];
const categories: Category[] = [
  { id: 'food', kind: 'expense', systemKey: null },
  { id: 'services', kind: 'expense', systemKey: null },
  { id: 'salary', kind: 'income', systemKey: null },
];

const NOV: DateRange = { start: '2026-11-01', end: '2026-11-30' };

let seq = 0;
function mv(partial: Partial<Movement>): Movement {
  seq += 1;
  return {
    id: `m${seq}`,
    type: 'expense',
    occurredOn: '2026-11-05',
    description: null,
    categoryId: null,
    sourceAccountId: null,
    destAccountId: null,
    amountMinor: 0,
    currency: 'PEN',
    debtId: null,
    declaredBalanceMinor: null,
    ...partial,
  };
}

function stateOf(movements: Movement[], debts: Debt[] = []): LedgerState {
  return { accounts, categories, debts, movements };
}

/** Escenario del plan: yape + plin, noviembre 2026. */
const scenario: Movement[] = [
  mv({ type: 'opening', destAccountId: 'yape', amountMinor: 50000, occurredOn: '2026-11-01' }),
  mv({ type: 'opening', destAccountId: 'plin', amountMinor: 21000, occurredOn: '2026-11-01' }),
  mv({ type: 'expense', sourceAccountId: 'yape', amountMinor: 2450, categoryId: 'food', occurredOn: '2026-11-03' }),
  mv({ type: 'expense', sourceAccountId: 'yape', amountMinor: 1800, categoryId: 'food', occurredOn: '2026-11-04' }),
  mv({ type: 'expense', sourceAccountId: 'plin', amountMinor: 11280, categoryId: 'services', occurredOn: '2026-11-06' }),
  mv({ type: 'income', destAccountId: 'yape', amountMinor: 50000, categoryId: 'salary', occurredOn: '2026-11-10' }),
  mv({ type: 'transfer', sourceAccountId: 'yape', destAccountId: 'plin', amountMinor: 10000, occurredOn: '2026-11-12' }),
];

describe('homeSummary', () => {
  it('alcance yape + plin: restante, gastado y disponible', () => {
    expect(homeSummary(stateOf(scenario), ['yape', 'plin'], NOV)).toEqual({
      PEN: { availableMinor: 121000, spentMinor: 15530, remainingMinor: 105470 },
    });
  });

  it('alcance solo plin: la transferencia entrante suma al restante sin sumar al gastado', () => {
    expect(homeSummary(stateOf(scenario), ['plin'], NOV)).toEqual({
      PEN: { availableMinor: 31000, spentMinor: 11280, remainingMinor: 19720 },
    });
  });

  it('solo aparecen las monedas que tienen cuentas en el alcance', () => {
    const summary = homeSummary(stateOf(scenario), ['yape'], NOV);
    expect(Object.keys(summary)).toEqual(['PEN']);
  });

  it('no mezcla monedas: cada moneda tiene su propio resumen', () => {
    const usd = mv({ type: 'opening', destAccountId: 'yapeUsd', amountMinor: 10000, currency: 'USD', occurredOn: '2026-11-01' });
    const spendUsd = mv({
      type: 'expense', sourceAccountId: 'yapeUsd', amountMinor: 2500, currency: 'USD', categoryId: 'food', occurredOn: '2026-11-02',
    });
    const summary = homeSummary(stateOf([...scenario, usd, spendUsd]), ['yape', 'plin', 'yapeUsd'], NOV);
    expect(summary.USD).toEqual({ availableMinor: 10000, spentMinor: 2500, remainingMinor: 7500 });
    expect(summary.PEN?.remainingMinor).toBe(105470);
  });

  it('ignora gastos fuera del periodo en "gastado" pero los resta del restante', () => {
    const old = mv({ type: 'expense', sourceAccountId: 'yape', amountMinor: 1000, categoryId: 'food', occurredOn: '2026-10-20' });
    const opening = mv({ type: 'opening', destAccountId: 'yape', amountMinor: 5000, occurredOn: '2026-10-01' });
    const summary = homeSummary(stateOf([opening, old]), ['yape'], NOV);
    expect(summary.PEN).toEqual({ availableMinor: 4000, spentMinor: 0, remainingMinor: 4000 });
  });

  it('las compras con tarjeta no suman al "gastado" del resumen', () => {
    const card = mv({ type: 'expense', sourceAccountId: 'bcpCard', amountMinor: 9000, categoryId: 'food', occurredOn: '2026-11-07' });
    const summary = homeSummary(stateOf([...scenario, card]), ['yape', 'plin'], NOV);
    expect(summary.PEN?.spentMinor).toBe(15530);
  });
});

describe('expensesByCategory', () => {
  it('suma por categoría y ordena de mayor a menor', () => {
    expect(expensesByCategory(stateOf(scenario), ['yape', 'plin'], NOV, 'PEN')).toEqual([
      { categoryId: 'services', totalMinor: 11280 },
      { categoryId: 'food', totalMinor: 4250 },
    ]);
  });

  it('incluye compras con tarjeta si la tarjeta está en el alcance', () => {
    const card = mv({ type: 'expense', sourceAccountId: 'bcpCard', amountMinor: 9000, categoryId: 'food', occurredOn: '2026-11-07' });
    expect(expensesByCategory(stateOf([...scenario, card]), ['yape', 'plin', 'bcpCard'], NOV, 'PEN')).toEqual([
      { categoryId: 'food', totalMinor: 13250 },
      { categoryId: 'services', totalMinor: 11280 },
    ]);
  });

  it('filtra por moneda y por periodo', () => {
    const out = mv({ type: 'expense', sourceAccountId: 'yape', amountMinor: 700, categoryId: 'food', occurredOn: '2026-12-01' });
    expect(expensesByCategory(stateOf([...scenario, out]), ['yape', 'plin'], NOV, 'USD')).toEqual([]);
    expect(expensesByCategory(stateOf([...scenario, out]), ['yape', 'plin'], NOV, 'PEN')).toHaveLength(2);
  });
});

describe('dailyBalanceSeries y netChange', () => {
  it('una entrada por día con el saldo conjunto al cierre', () => {
    const series = dailyBalanceSeries(stateOf(scenario), ['yape', 'plin'], 'PEN', NOV);
    expect(series).toHaveLength(30);
    expect(series[0]).toEqual({ date: '2026-11-01', balanceMinor: 71000 });
    expect(series[2]).toEqual({ date: '2026-11-03', balanceMinor: 68550 });
    expect(series[29]).toEqual({ date: '2026-11-30', balanceMinor: 105470 });
  });

  it('netChange = saldo al cierre del periodo − saldo al cierre del día anterior', () => {
    expect(netChange(stateOf(scenario), ['yape', 'plin'], 'PEN', NOV)).toBe(105470);
  });

  it('netChange resta lo acumulado antes del periodo', () => {
    // 30000 ya estaban en la cuenta el 31/10: el flujo del mes sigue siendo 105470.
    const prior = mv({ type: 'income', destAccountId: 'yape', amountMinor: 30000, categoryId: 'salary', occurredOn: '2026-10-31' });
    expect(netChange(stateOf([prior, ...scenario]), ['yape', 'plin'], 'PEN', NOV)).toBe(105470);
  });

  it('netChange puede ser negativo', () => {
    const base = mv({ type: 'opening', destAccountId: 'yape', amountMinor: 10000, occurredOn: '2026-10-01' });
    const spend = mv({ type: 'expense', sourceAccountId: 'yape', amountMinor: 4000, categoryId: 'food', occurredOn: '2026-11-02' });
    expect(netChange(stateOf([base, spend]), ['yape'], 'PEN', NOV)).toBe(-4000);
  });
});

describe('projectedRemaining', () => {
  const movements: Movement[] = [
    mv({ type: 'opening', destAccountId: 'yape', amountMinor: 100000, occurredOn: '2026-11-01' }),
    mv({ type: 'opening', sourceAccountId: 'bcpCard', amountMinor: 30000, occurredOn: '2026-11-01' }),
  ];
  const debt = (nextDueOn: string): Debt => ({
    id: 'interbank',
    direction: 'payable',
    currency: 'PEN',
    initialPendingMinor: 89000,
    installmentAmountMinor: 20000,
    nextDueOn,
  });

  it('resta tarjetas y la cuota que vence este mes', () => {
    expect(projectedRemaining(stateOf(movements, [debt('2026-11-25')]), ['yape'], ['bcpCard'], 'PEN', '2026-11-17')).toBe(50000);
  });

  it('no resta la cuota que vence el mes siguiente', () => {
    expect(projectedRemaining(stateOf(movements, [debt('2026-12-05')]), ['yape'], ['bcpCard'], 'PEN', '2026-11-17')).toBe(70000);
  });

  it('resta como máximo el pendiente cuando la cuota es mayor', () => {
    const small: Debt = { ...debt('2026-11-25'), initialPendingMinor: 5000 };
    expect(projectedRemaining(stateOf(movements, [small]), ['yape'], ['bcpCard'], 'PEN', '2026-11-17')).toBe(65000);
  });

  it('ignora deudas pagadas, por cobrar o de otra moneda', () => {
    const paid: Debt = { ...debt('2026-11-25'), id: 'paid', initialPendingMinor: 0 };
    const receivable: Debt = { ...debt('2026-11-25'), id: 'rec', direction: 'receivable' };
    const usd: Debt = { ...debt('2026-11-25'), id: 'usd', currency: 'USD' };
    expect(projectedRemaining(stateOf(movements, [paid, receivable, usd]), ['yape'], ['bcpCard'], 'PEN', '2026-11-17')).toBe(70000);
  });

  it('puede resultar negativo', () => {
    const big: Debt = { ...debt('2026-11-25'), initialPendingMinor: 500000, installmentAmountMinor: 90000 };
    expect(projectedRemaining(stateOf(movements, [big]), ['yape'], ['bcpCard'], 'PEN', '2026-11-17')).toBe(-20000);
  });
});

describe('isBelowThreshold', () => {
  it('es verdadero solo si el saldo es menor al umbral', () => {
    expect(isBelowThreshold(29999, 30000)).toBe(true);
    expect(isBelowThreshold(30000, 30000)).toBe(false);
  });

  it('sin umbral nunca avisa', () => {
    expect(isBelowThreshold(1, null)).toBe(false);
  });
});
