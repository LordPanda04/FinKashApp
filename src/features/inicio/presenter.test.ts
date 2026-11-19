import type { CardRecord, CategoryRecord, WalletRecord } from '@/data/types';
import type { Account, Debt, LedgerState, Movement } from '@/domain/ledger/types';
import { buildHomeView, maskAmount, scopeAccountIds, type HomeInput } from './presenter';

const TODAY = '2026-11-20';
const PERIOD = { start: '2026-11-01', end: TODAY };

const wallet = (id: string, name: string, sortOrder: number, over: Partial<WalletRecord> = {}): WalletRecord => ({
  id, name, walletType: 'digital', icon: 'smartphone', color: '#742384', isHidden: false, includeInGeneral: true, sortOrder, ...over,
});
const yape = wallet('w1', 'Yape', 0);
const plin = wallet('w2', 'Plin', 1);

const accounts: Account[] = [
  { id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
  { id: 'plinPen', kind: 'wallet', walletId: 'w2', currency: 'PEN', creditLimitMinor: null },
];
const categories: CategoryRecord[] = [
  { id: 'food', name: 'Comida', color: '#1C9C4D', icon: 'restaurant', systemKey: null, sortOrder: 0 },
  { id: 'services', name: 'Servicios', color: '#F59E0B', icon: 'bolt', systemKey: null, sortOrder: 1 },
];

let seq = 0;
function mv(p: Partial<Movement>): Movement {
  seq += 1;
  return {
    id: `m${seq}`, type: 'expense', occurredOn: '2026-11-05', description: null, categoryId: null, sourceAccountId: null,
    destAccountId: null, amountMinor: 0, currency: 'PEN', debtId: null, declaredBalanceMinor: null, ...p,
  };
}

/** Escenario de la Fase 4: restante conjunto 105470, gastado 15530, disponible 121000. */
const scenario: Movement[] = [
  mv({ type: 'opening', destAccountId: 'yapePen', amountMinor: 50000, occurredOn: '2026-11-01' }),
  mv({ type: 'opening', destAccountId: 'plinPen', amountMinor: 21000, occurredOn: '2026-11-01' }),
  mv({ type: 'expense', sourceAccountId: 'yapePen', amountMinor: 2450, categoryId: 'food', occurredOn: '2026-11-03' }),
  mv({ type: 'expense', sourceAccountId: 'yapePen', amountMinor: 1800, categoryId: 'food', occurredOn: '2026-11-04' }),
  mv({ type: 'expense', sourceAccountId: 'plinPen', amountMinor: 11280, categoryId: 'services', occurredOn: '2026-11-06' }),
  mv({ type: 'income', destAccountId: 'yapePen', amountMinor: 50000, occurredOn: '2026-11-10' }),
  mv({ type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'plinPen', amountMinor: 10000, occurredOn: '2026-11-12' }),
];

function input(over: Partial<HomeInput> = {}): HomeInput {
  const state: LedgerState = { accounts, movements: scenario, categories: categories, debts: [] };
  return { state, wallets: [yape, plin], cards: [], categories, period: PERIOD, today: TODAY, scope: 'general', thresholds: [], ...over };
}

describe('scopeAccountIds', () => {
  const state: LedgerState = { accounts, movements: [], categories: [], debts: [] };
  const withCard: LedgerState = { ...state, accounts: [...accounts, { id: 'bcp', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 }] };
  const card: CardRecord = { accountId: 'bcp', name: 'Tarjeta BCP', issuer: null, icon: 'credit_card', color: '#003DA5', creditLimitMinor: 200000, closingDay: null, dueDay: null, isHidden: false };

  it('Saldo general: cuentas de las billeteras con la casilla marcada y tarjetas visibles', () => {
    expect(scopeAccountIds(withCard, [yape, plin], [card], 'general')).toEqual({ walletAccountIds: ['yapePen', 'plinPen'], cardAccountIds: ['bcp'] });
  });

  it('una billetera con la casilla desmarcada sale del Saldo general', () => {
    const r = scopeAccountIds(state, [{ ...yape, includeInGeneral: false }, plin], [], 'general');
    expect(r.walletAccountIds).toEqual(['plinPen']);
  });

  it('las tarjetas ocultas no entran', () => {
    expect(scopeAccountIds(withCard, [yape], [{ ...card, isHidden: true }], 'general').cardAccountIds).toEqual([]);
  });

  it('una billetera: solo sus cuentas y sin tarjetas, aunque su casilla esté desmarcada', () => {
    const r = scopeAccountIds(withCard, [{ ...yape, includeInGeneral: false }, plin], [card], 'w1');
    expect(r).toEqual({ walletAccountIds: ['yapePen'], cardAccountIds: [] });
  });

  it('una billetera inexistente da listas vacías', () => {
    expect(scopeAccountIds(state, [yape], [], 'nope')).toEqual({ walletAccountIds: [], cardAccountIds: [] });
  });
});

describe('buildHomeView — resumen', () => {
  it('Saldo general con las dos billeteras', () => {
    const v = buildHomeView(input());
    expect(v.empty).toBe(false);
    expect(v.scopeLabel).toBe('Saldo general');
    expect(v.monthLabel).toBe('Noviembre');
    expect(v.currencies).toEqual(['PEN']);
    expect(v.blocks.PEN).toMatchObject({ currency: 'PEN', availableMinor: 121000, spentMinor: 15530, remainingMinor: 105470 });
  });

  it('solo Plin: la transferencia entrante suma al restante pero no al gastado', () => {
    const v = buildHomeView(input({ scope: 'w2' }));
    expect(v.scopeLabel).toBe('Plin');
    expect(v.blocks.PEN).toMatchObject({ availableMinor: 31000, spentMinor: 11280, remainingMinor: 19720 });
  });

  it('con la casilla de Yape desmarcada, el Saldo general solo suma Plin', () => {
    const v = buildHomeView(input({ wallets: [{ ...yape, includeInGeneral: false }, plin] }));
    expect(v.blocks.PEN).toMatchObject({ remainingMinor: 19720, spentMinor: 11280 });
  });

  it('una billetera en dólares da un bloque aparte y nunca se mezcla con soles', () => {
    const usd: Account = { id: 'yapeUsd', kind: 'wallet', walletId: 'w1', currency: 'USD', creditLimitMinor: null };
    const state: LedgerState = {
      accounts: [...accounts, usd], categories, debts: [],
      movements: [...scenario, mv({ type: 'opening', destAccountId: 'yapeUsd', amountMinor: 10000, currency: 'USD', occurredOn: '2026-11-01' }),
        mv({ type: 'expense', sourceAccountId: 'yapeUsd', amountMinor: 2500, currency: 'USD', categoryId: 'food', occurredOn: '2026-11-02' })],
    };
    const v = buildHomeView(input({ state }));
    expect(v.currencies).toEqual(['PEN', 'USD']);
    expect(v.blocks.USD).toMatchObject({ availableMinor: 10000, spentMinor: 2500, remainingMinor: 7500 });
    expect(v.blocks.PEN?.remainingMinor).toBe(105470);
    expect(v.donut.USD?.totalMinor).toBe(2500);
    expect(v.donut.PEN?.totalMinor).toBe(15530);
  });

  it('sin billeteras o con alcance inexistente: empty verdadero', () => {
    expect(buildHomeView(input({ wallets: [], state: { accounts: [], movements: [], categories, debts: [] } })).empty).toBe(true);
    expect(buildHomeView(input({ scope: 'nope' })).empty).toBe(true);
  });
});

describe('buildHomeView — proyección', () => {
  const card: CardRecord = { accountId: 'bcp', name: 'Tarjeta BCP', issuer: null, icon: 'credit_card', color: '#003DA5', creditLimitMinor: 200000, closingDay: null, dueDay: null, isHidden: false };
  const debt: Debt = { id: 'd1', direction: 'payable', currency: 'PEN', initialPendingMinor: 89000, installmentAmountMinor: 20000, nextDueOn: '2026-11-25' };
  const base: LedgerState = {
    accounts: [{ id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null }, { id: 'bcp', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 }],
    categories, debts: [debt],
    movements: [mv({ type: 'opening', destAccountId: 'yapePen', amountMinor: 100000, occurredOn: '2026-11-01' }), mv({ type: 'opening', sourceAccountId: 'bcp', amountMinor: 30000, occurredOn: '2026-11-01' })],
  };

  it('Saldo general: restante − tarjetas − cuota del mes = 50000', () => {
    const v = buildHomeView(input({ state: base, wallets: [yape], cards: [card] }));
    expect(v.blocks.PEN?.projectedMinor).toBe(50000);
  });

  it('con una billetera elegida no hay proyección', () => {
    const v = buildHomeView(input({ state: base, wallets: [yape], cards: [card], scope: 'w1' }));
    expect(v.blocks.PEN?.projectedMinor).toBeNull();
  });
});

describe('buildHomeView — umbral', () => {
  const global = (amountMinor: number) => ({ currency: 'PEN' as const, amountMinor, walletId: null });

  it('restante 29999 con umbral 30000 → bajo el umbral; 30000 → no', () => {
    const state = (amount: number): LedgerState => ({ accounts: [accounts[0]!], categories, debts: [], movements: [mv({ type: 'opening', destAccountId: 'yapePen', amountMinor: amount, occurredOn: '2026-11-01' })] });
    expect(buildHomeView(input({ state: state(29999), wallets: [yape], thresholds: [global(30000)] })).blocks.PEN).toMatchObject({ belowThreshold: true, thresholdMinor: 30000 });
    expect(buildHomeView(input({ state: state(30000), wallets: [yape], thresholds: [global(30000)] })).blocks.PEN?.belowThreshold).toBe(false);
  });

  it('sin umbral: no avisa y thresholdMinor es null', () => {
    expect(buildHomeView(input()).blocks.PEN).toMatchObject({ belowThreshold: false, thresholdMinor: null });
  });

  it('el umbral de una billetera solo aplica cuando esa billetera es el alcance', () => {
    const t = [{ currency: 'PEN' as const, amountMinor: 999999, walletId: 'w2' }];
    expect(buildHomeView(input({ thresholds: t })).blocks.PEN?.thresholdMinor).toBeNull();
    expect(buildHomeView(input({ thresholds: t, scope: 'w2' })).blocks.PEN).toMatchObject({ thresholdMinor: 999999, belowThreshold: true });
    expect(buildHomeView(input({ thresholds: t, scope: 'w1' })).blocks.PEN?.thresholdMinor).toBeNull();
  });

  it('el umbral global no aplica a una billetera sola', () => {
    expect(buildHomeView(input({ thresholds: [global(30000)], scope: 'w1' })).blocks.PEN?.thresholdMinor).toBeNull();
  });

  it('el umbral llega al flujo', () => {
    expect(buildHomeView(input({ thresholds: [global(30000)] })).flow.PEN?.thresholdMinor).toBe(30000);
  });
});

describe('buildHomeView — dona y flujo', () => {
  it('dona: de mayor a menor, con nombre y color de la categoría', () => {
    const v = buildHomeView(input());
    expect(v.donut.PEN).toEqual({
      totalMinor: 15530,
      slices: [
        { categoryId: 'services', name: 'Servicios', color: '#F59E0B', totalMinor: 11280 },
        { categoryId: 'food', name: 'Comida', color: '#1C9C4D', totalMinor: 4250 },
      ],
    });
  });

  it('sin gastos en el periodo: sin porciones y total 0', () => {
    const state: LedgerState = { accounts, categories, debts: [], movements: [scenario[0]!, scenario[1]!] };
    expect(buildHomeView(input({ state })).donut.PEN).toEqual({ totalMinor: 0, slices: [] });
  });

  it('una categoría borrada no rompe la dona: "Sin categoría" en gris', () => {
    const state: LedgerState = { accounts, categories, debts: [], movements: [scenario[0]!, mv({ type: 'expense', sourceAccountId: 'yapePen', amountMinor: 500, categoryId: 'borrada', occurredOn: '2026-11-03' })] };
    expect(buildHomeView(input({ state })).donut.PEN?.slices[0]).toMatchObject({ name: 'Sin categoría', totalMinor: 500 });
  });

  it('una compra con tarjeta aparece en la dona del Saldo general pero no en la de una billetera', () => {
    const card: CardRecord = { accountId: 'bcp', name: 'BCP', issuer: null, icon: 'credit_card', color: '#003DA5', creditLimitMinor: 200000, closingDay: null, dueDay: null, isHidden: false };
    const state: LedgerState = {
      accounts: [...accounts, { id: 'bcp', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 }], categories, debts: [],
      movements: [...scenario, mv({ type: 'expense', sourceAccountId: 'bcp', amountMinor: 9000, categoryId: 'food', occurredOn: '2026-11-07' })],
    };
    expect(buildHomeView(input({ state, cards: [card] })).donut.PEN?.totalMinor).toBe(24530);
    expect(buildHomeView(input({ state, cards: [card], scope: 'w1' })).donut.PEN?.totalMinor).toBe(4250);
    // La compra con tarjeta no suma al "Gastado" del resumen (D32).
    expect(buildHomeView(input({ state, cards: [card] })).blocks.PEN?.spentMinor).toBe(15530);
  });

  it('flujo: serie diaria del 1 al 20 y variación neta 105470', () => {
    const f = buildHomeView(input()).flow.PEN!;
    expect(f.series).toHaveLength(20);
    expect(f.series[0]).toEqual({ date: '2026-11-01', balanceMinor: 71000 });
    expect(f.series[19]).toEqual({ date: '2026-11-20', balanceMinor: 105470 });
    expect(f.netChangeMinor).toBe(105470);
  });
});

describe('maskAmount', () => {
  it('oculta con ****', () => {
    expect(maskAmount('S/ 1,840.00', true)).toBe('****');
  });
  it('si no está oculto devuelve el texto', () => {
    expect(maskAmount('S/ 1,840.00', false)).toBe('S/ 1,840.00');
  });
});
