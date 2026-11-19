import type { CardRecord, DebtRecord, WalletRecord } from '@/data/types';
import { accountBalance, cardAvailable, cardConsumed } from '@/domain/ledger/balances';
import type { LedgerState } from '@/domain/ledger/types';
import type { Currency } from '@/domain/money/money';

export type WalletBalances = Partial<Record<Currency, number>>;
export type DebtView = DebtRecord & { pendingMinor: number; status: 'pending' | 'paid' };

/** Saldo por moneda de las cuentas de una billetera (derivado de los movimientos; nunca mezcla monedas). */
export function walletBalances(state: LedgerState, wallet: WalletRecord): WalletBalances {
  const balances: WalletBalances = {};
  for (const account of state.accounts) {
    if (account.kind !== 'wallet' || account.walletId !== wallet.id) continue;
    balances[account.currency] = (balances[account.currency] ?? 0) + accountBalance(account.id, state.movements);
  }
  return balances;
}

export function cardSummary(
  state: LedgerState,
  card: CardRecord,
): { consumedMinor: number; availableMinor: number; creditLimitMinor: number; currency: Currency } {
  const account = state.accounts.find((a) => a.id === card.accountId);
  if (!account) throw new Error(`La tarjeta ${card.accountId} no tiene cuenta en el libro`);
  return {
    consumedMinor: cardConsumed(account, state.movements),
    availableMinor: cardAvailable(account, state.movements),
    creditLimitMinor: card.creditLimitMinor,
    currency: account.currency,
  };
}

/** Solo deudas pendientes: "Me deben", "Debo" a personas y "Debo" a instituciones. */
export function groupDebts(debts: DebtView[]): {
  receivable: DebtView[];
  payablePersons: DebtView[];
  payableInstitutions: DebtView[];
} {
  const pending = debts.filter((d) => d.status === 'pending');
  return {
    receivable: pending.filter((d) => d.direction === 'receivable'),
    payablePersons: pending.filter((d) => d.direction === 'payable' && d.counterpartyType === 'person'),
    payableInstitutions: pending.filter((d) => d.direction === 'payable' && d.counterpartyType === 'institution'),
  };
}

export function splitWallets(wallets: WalletRecord[]): { visible: WalletRecord[]; hidden: WalletRecord[] } {
  return { visible: wallets.filter((w) => !w.isHidden), hidden: wallets.filter((w) => w.isHidden) };
}

export const WALLET_TYPE_LABEL: Record<WalletRecord['walletType'], string> = {
  cash: 'Principal',
  bank: 'Banco',
  digital: 'Digital',
  other: 'Otra',
};

export const CURRENCY_ORDER: Currency[] = ['PEN', 'USD'];
