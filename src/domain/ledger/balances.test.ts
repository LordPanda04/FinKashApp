import { accountBalance, cardAvailable, cardConsumed, dailyClosingBalances } from './balances';
import type { Account, Movement } from './types';

const yapePen: Account = { id: 'yapePen', kind: 'wallet', walletId: 'yape', currency: 'PEN', creditLimitMinor: null };
const bcpCard: Account = { id: 'bcpCard', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 };

function mv(partial: Partial<Movement>): Movement {
  return {
    id: `m-${Math.random()}`,
    type: 'expense',
    occurredOn: '2026-11-01',
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

const wallets: Movement[] = [
  mv({ type: 'opening', destAccountId: 'yapePen', amountMinor: 50000, occurredOn: '2026-11-01' }),
  mv({ type: 'expense', sourceAccountId: 'yapePen', amountMinor: 2450, occurredOn: '2026-11-16', categoryId: 'food' }),
  mv({ type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'plinPen', amountMinor: 10000, occurredOn: '2026-11-16' }),
];

describe('accountBalance', () => {
  it('suma entradas y resta salidas', () => {
    expect(accountBalance('yapePen', wallets)).toBe(37550);
    expect(accountBalance('plinPen', wallets)).toBe(10000);
  });

  it('respeta el corte upTo (inclusive)', () => {
    expect(accountBalance('yapePen', wallets, '2026-11-15')).toBe(50000);
    expect(accountBalance('yapePen', wallets, '2026-11-16')).toBe(37550);
  });

  it('una cuenta sin movimientos tiene saldo 0', () => {
    expect(accountBalance('otra', wallets)).toBe(0);
  });
});

describe('dailyClosingBalances', () => {
  it('devuelve un elemento por día e incluye todo lo anterior a from', () => {
    expect(dailyClosingBalances('yapePen', wallets, '2026-11-15', '2026-11-16')).toEqual([
      { date: '2026-11-15', balanceMinor: 50000 },
      { date: '2026-11-16', balanceMinor: 37550 },
    ]);
  });

  it('mantiene el saldo en días sin movimientos', () => {
    const series = dailyClosingBalances('yapePen', wallets, '2026-11-02', '2026-11-04');
    expect(series.map((s) => s.balanceMinor)).toEqual([50000, 50000, 50000]);
  });
});

describe('tarjeta de crédito', () => {
  const cardMovements: Movement[] = [
    mv({ type: 'expense', sourceAccountId: 'bcpCard', amountMinor: 42000, categoryId: 'food' }),
    mv({ type: 'card_payment', sourceAccountId: 'plinPen', destAccountId: 'bcpCard', amountMinor: 12000 }),
  ];

  it('consumido = gastos − pagos', () => {
    expect(cardConsumed(bcpCard, cardMovements)).toBe(30000);
  });

  it('disponible = línea − consumido', () => {
    expect(cardAvailable(bcpCard, cardMovements)).toBe(170000);
  });

  it('la apertura de tarjeta cuenta como consumo previo', () => {
    const opening = mv({ type: 'opening', sourceAccountId: 'bcpCard', amountMinor: 30000 });
    expect(cardConsumed(bcpCard, [opening])).toBe(30000);
  });

  it('cardAvailable lanza error si la cuenta no tiene línea de crédito', () => {
    expect(() => cardAvailable(yapePen, [])).toThrow();
  });
});
