import type { WalletRecord } from '@/data/types';
import type { Account, LedgerState } from '@/domain/ledger/types';
import { firstDayOfMonth, monthOf, MONTH_NAMES_ES, type IsoDate } from '@/lib/dates';
import { splitWallets, walletBalances, type WalletBalances } from '@/features/billeteras/presenter';

/** Mes que se va a iniciar (el de hoy): clave `YYYY-MM`, nombre en español y día de inicio por defecto. */
export function periodMonth(today: IsoDate): { month: string; monthLabel: string; defaultStart: IsoDate } {
  const month = monthOf(today);
  return { month, monthLabel: MONTH_NAMES_ES[Number(month.slice(5, 7)) - 1]!, defaultStart: firstDayOfMonth(today) };
}

export interface PeriodCheckRow {
  walletId: string;
  name: string;
  icon: string;
  color: string;
  balances: WalletBalances;
  /** Cuentas de la billetera (para el Arreglo de billetera). */
  accounts: Account[];
}

export interface PeriodCheck {
  month: string;
  monthLabel: string;
  defaultStart: IsoDate;
  rows: PeriodCheckRow[];
}

/**
 * Lista de billeteras visibles con su saldo calculado, para validarlas o corregirlas con "Arreglo de
 * billetera" antes de confirmar el periodo (`FINANCIAL_RULES.md` §10). Las ocultas y las tarjetas no entran.
 */
export function buildPeriodCheck({ state, wallets, today }: { state: LedgerState; wallets: WalletRecord[]; today: IsoDate }): PeriodCheck {
  const rows = [...splitWallets(wallets).visible]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((wallet) => ({
      walletId: wallet.id,
      name: wallet.name,
      icon: wallet.icon,
      color: wallet.color,
      balances: walletBalances(state, wallet),
      accounts: state.accounts.filter((a) => a.kind === 'wallet' && a.walletId === wallet.id),
    }));
  return { ...periodMonth(today), rows };
}
