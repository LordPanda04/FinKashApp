import type { WalletRecord } from '@/data/types';
import type { Account, LedgerState, Movement } from '@/domain/ledger/types';
import { buildPeriodCheck } from './presenter';

const wallet = (id: string, name: string, sortOrder: number, over: Partial<WalletRecord> = {}): WalletRecord => ({
  id, name, walletType: 'cash', icon: 'payments', color: '#6B7280', isHidden: false, includeInGeneral: true, sortOrder, ...over,
});
const acc = (id: string, walletId: string, currency: 'PEN' | 'USD'): Account => ({ id, kind: 'wallet', walletId, currency, creditLimitMinor: null });
const opening = (id: string, dest: string, amountMinor: number, currency: 'PEN' | 'USD' = 'PEN'): Movement => ({
  id, type: 'opening', occurredOn: '2026-11-01', description: null, categoryId: null, sourceAccountId: null,
  destAccountId: dest, amountMinor, currency, debtId: null, declaredBalanceMinor: null,
});

const accounts = [acc('efPen', 'w1', 'PEN'), acc('yPen', 'w2', 'PEN'), acc('yUsd', 'w2', 'USD'), acc('hPen', 'w3', 'PEN')];
const state: LedgerState = {
  accounts, categories: [], debts: [],
  movements: [opening('m1', 'yPen', 12000), opening('m2', 'yUsd', 5000, 'USD'), opening('m3', 'hPen', 999)],
};
const wallets = [
  wallet('w2', 'Yape', 1),
  wallet('w1', 'Efectivo', 0),
  wallet('w3', 'Oculta', 2, { isHidden: true }),
];

describe('buildPeriodCheck', () => {
  it('lista solo las billeteras visibles, en su orden', () => {
    const view = buildPeriodCheck({ state, wallets, today: '2026-11-20' });
    expect(view.rows.map((r) => r.name)).toEqual(['Efectivo', 'Yape']);
  });

  it('trae el saldo por moneda; un saldo 0 aparece como 0 y no como ausente', () => {
    const view = buildPeriodCheck({ state, wallets, today: '2026-11-20' });
    expect(view.rows[0]!.balances).toEqual({ PEN: 0 });
    expect(view.rows[1]!.balances).toEqual({ PEN: 12000, USD: 5000 });
  });

  it('cada fila trae las cuentas de su billetera para el arreglo', () => {
    const view = buildPeriodCheck({ state, wallets, today: '2026-11-20' });
    expect(view.rows[1]!.accounts.map((a) => a.id)).toEqual(['yPen', 'yUsd']);
  });

  it('el mes es el de hoy, con nombre en español y el día de inicio por defecto es el 1', () => {
    const view = buildPeriodCheck({ state, wallets, today: '2026-11-20' });
    expect(view).toMatchObject({ month: '2026-11', monthLabel: 'Noviembre', defaultStart: '2026-11-01' });
  });

  it('sin billeteras visibles devuelve la lista vacía', () => {
    expect(buildPeriodCheck({ state, wallets: [wallet('w3', 'Oculta', 0, { isHidden: true })], today: '2026-11-20' }).rows).toEqual([]);
    expect(buildPeriodCheck({ state, wallets: [], today: '2026-11-20' }).rows).toEqual([]);
  });
});
