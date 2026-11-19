import type { Currency } from '@/domain/money/money';
import type { IsoDate } from '@/lib/dates';

export type AccountKind = 'wallet' | 'credit_card';

export interface Account {
  id: string;
  kind: AccountKind;
  /** Billetera a la que pertenece la cuenta (null si no aplica). */
  walletId: string | null;
  currency: Currency;
  /** Línea de crédito en unidades mínimas; solo para tarjetas. */
  creditLimitMinor: number | null;
}

export type MovementType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'card_payment'
  | 'opening'
  | 'adjustment';

export interface Movement {
  id: string;
  type: MovementType;
  occurredOn: IsoDate;
  description: string | null;
  categoryId: string | null;
  /** Cuenta de la que sale el dinero (tramo de salida). */
  sourceAccountId: string | null;
  /** Cuenta a la que entra el dinero (tramo de entrada). */
  destAccountId: string | null;
  amountMinor: number;
  currency: Currency;
  debtId: string | null;
  /** Saldo declarado por el usuario (solo `adjustment`). */
  declaredBalanceMinor: number | null;
}

/** Las categorías no tienen tipo: gasto o ingreso lo define el movimiento (`FINANCIAL_RULES.md` §11). */
export interface Category {
  id: string;
  /** `other` = "Otros", `loan` = "Préstamo"; null para categorías del usuario. */
  systemKey: 'other' | 'loan' | null;
}

export interface Debt {
  id: string;
  direction: 'receivable' | 'payable';
  currency: Currency;
  initialPendingMinor: number;
  installmentAmountMinor: number | null;
  nextDueOn: IsoDate | null;
}

export interface LedgerState {
  accounts: Account[];
  movements: Movement[];
  categories: Category[];
  debts: Debt[];
}
