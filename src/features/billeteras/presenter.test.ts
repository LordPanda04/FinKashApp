import type { CardRecord, DebtRecord, WalletRecord } from '@/data/types';
import type { Account, LedgerState, Movement } from '@/domain/ledger/types';
import { cardSummary, groupDebts, splitWallets, walletBalances } from './presenter';

const yape: WalletRecord = { id: 'w1', name: 'Yape', walletType: 'digital', icon: 'smartphone', color: '#742384', isHidden: false, includeInGeneral: true, sortOrder: 0 };
const plin: WalletRecord = { ...yape, id: 'w2', name: 'Plin', sortOrder: 1 };

const accounts: Account[] = [
  { id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
  { id: 'yapeUsd', kind: 'wallet', walletId: 'w1', currency: 'USD', creditLimitMinor: null },
  { id: 'plinPen', kind: 'wallet', walletId: 'w2', currency: 'PEN', creditLimitMinor: null },
  { id: 'bcp', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 },
];

function mv(p: Partial<Movement> & { id: string }): Movement {
  return {
    type: 'expense', occurredOn: '2026-11-10', description: null, categoryId: null, sourceAccountId: null,
    destAccountId: null, amountMinor: 0, currency: 'PEN', debtId: null, declaredBalanceMinor: null, ...p,
  };
}

const movements: Movement[] = [
  mv({ id: '1', type: 'opening', destAccountId: 'yapePen', amountMinor: 50000 }),
  mv({ id: '2', type: 'expense', sourceAccountId: 'yapePen', amountMinor: 2450 }),
  mv({ id: '3', type: 'opening', destAccountId: 'yapeUsd', amountMinor: 10000, currency: 'USD' }),
  mv({ id: '4', type: 'opening', sourceAccountId: 'bcp', amountMinor: 30000 }),
];
const state: LedgerState = { accounts, movements, categories: [], debts: [] };

describe('walletBalances', () => {
  it('saldo por moneda de las cuentas de la billetera', () => {
    expect(walletBalances(state, yape)).toEqual({ PEN: 47550, USD: 10000 });
  });

  it('una billetera sin movimientos tiene saldo 0 en su moneda', () => {
    expect(walletBalances(state, plin)).toEqual({ PEN: 0 });
  });

  it('una transferencia descuenta en el origen y suma en el destino', () => {
    const withTransfer = { ...state, movements: [...movements, mv({ id: '5', type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'plinPen', amountMinor: 10000 })] };
    expect(walletBalances(withTransfer, yape).PEN).toBe(37550);
    expect(walletBalances(withTransfer, plin).PEN).toBe(10000);
  });

  it('una billetera sin cuentas da un objeto vacío', () => {
    expect(walletBalances({ ...state, accounts: [] }, yape)).toEqual({});
  });
});

describe('cardSummary', () => {
  const card: CardRecord = { accountId: 'bcp', name: 'Tarjeta BCP', issuer: null, icon: 'credit_card', color: '#003DA5', creditLimitMinor: 200000, closingDay: null, dueDay: null, isHidden: false };

  it('consumido 30000 de una línea de 200000 deja 170000 disponibles', () => {
    expect(cardSummary(state, card)).toEqual({ consumedMinor: 30000, availableMinor: 170000, creditLimitMinor: 200000, currency: 'PEN' });
  });

  it('lanza si la cuenta de la tarjeta no existe en el libro', () => {
    expect(() => cardSummary({ ...state, accounts: [] }, card)).toThrow();
  });
});

describe('groupDebts', () => {
  const base: DebtRecord & { pendingMinor: number; status: 'pending' | 'paid' } = {
    id: 'd', direction: 'receivable', currency: 'PEN', initialPendingMinor: 0, installmentAmountMinor: null, nextDueOn: null,
    counterpartyName: 'Carlos', counterpartyType: 'person', dueOn: null, installmentsRemaining: null, notes: null, pendingMinor: 10000, status: 'pending',
  };

  it('separa Me deben, Debo a personas y Debo a instituciones, y omite las pagadas', () => {
    const debts = [
      { ...base, id: 'a' },
      { ...base, id: 'b', direction: 'payable' as const, counterpartyName: 'Ana' },
      { ...base, id: 'c', direction: 'payable' as const, counterpartyType: 'institution' as const, counterpartyName: 'Interbank' },
      { ...base, id: 'd', status: 'paid' as const, pendingMinor: 0 },
    ];
    const g = groupDebts(debts);
    expect(g.receivable.map((d) => d.id)).toEqual(['a']);
    expect(g.payablePersons.map((d) => d.id)).toEqual(['b']);
    expect(g.payableInstitutions.map((d) => d.id)).toEqual(['c']);
  });

  it('sin deudas devuelve grupos vacíos', () => {
    expect(groupDebts([])).toEqual({ receivable: [], payablePersons: [], payableInstitutions: [] });
  });
});

describe('splitWallets', () => {
  it('separa las ocultas conservando el orden', () => {
    const hidden = { ...plin, isHidden: true };
    expect(splitWallets([yape, hidden])).toEqual({ visible: [yape], hidden: [hidden] });
  });
});
