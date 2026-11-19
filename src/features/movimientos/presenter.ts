import type { CardRecord, CategoryRecord, WalletRecord } from '@/data/types';
import type { Account, Movement } from '@/domain/ledger/types';
import { CURRENCY_SYMBOL, parseAmountInput, type Currency } from '@/domain/money/money';
import type { IsoDate } from '@/lib/dates';
import { err, ok, type DomainError, type Result } from '@/lib/result';

export type MovementKind = 'expense' | 'income' | 'transfer';
export type MovementDraft = Omit<Movement, 'id'>;
export interface NewDebt {
  counterpartyName: string;
  counterpartyType: 'person' | 'institution';
}

export interface FormValues {
  kind: MovementKind;
  amountText: string;
  accountId: string | null;
  destAccountId: string | null;
  categoryId: string | null;
  debtId: string | null;
  newDebt: NewDebt | null;
  description: string;
  isToday: boolean;
  date: IsoDate;
}

export interface AccountOption {
  id: string;
  /** "Yape · S/" para billeteras; el nombre de la tarjeta para tarjetas. */
  label: string;
  currency: Currency;
  kind: 'wallet' | 'credit_card';
  walletName: string;
}

/** Cuentas elegibles: billeteras visibles (una por moneda) y, solo para gastos, tarjetas visibles. */
export function accountOptions(
  wallets: WalletRecord[],
  cards: CardRecord[],
  accounts: Account[],
  kind: MovementKind,
): AccountOption[] {
  const options: AccountOption[] = [];
  const ordered = [...wallets].filter((w) => !w.isHidden).sort((a, b) => a.sortOrder - b.sortOrder);
  for (const wallet of ordered) {
    const own = accounts
      .filter((a) => a.kind === 'wallet' && a.walletId === wallet.id)
      .sort((a, b) => (a.currency === b.currency ? 0 : a.currency === 'PEN' ? -1 : 1));
    for (const a of own) {
      options.push({ id: a.id, label: `${wallet.name} · ${CURRENCY_SYMBOL[a.currency]}`, currency: a.currency, kind: 'wallet', walletName: wallet.name });
    }
  }
  if (kind === 'expense') {
    for (const card of cards) {
      const account = accounts.find((a) => a.id === card.accountId);
      if (card.isHidden || !account) continue;
      options.push({ id: card.accountId, label: card.name, currency: account.currency, kind: 'credit_card', walletName: card.name });
    }
  }
  return options;
}

/** "Hacia" de una transferencia: misma moneda que el origen y distinta de él. */
export function destOptions(options: AccountOption[], from: AccountOption | null): AccountOption[] {
  if (!from) return options;
  return options.filter((o) => o.id !== from.id && o.currency === from.currency);
}

/** Todas las categorías, por orden: no tienen tipo, sirven igual para un gasto que para un ingreso. */
export function categoryOptions(categories: CategoryRecord[]): CategoryRecord[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Convierte el formulario en un borrador de movimiento (o en el primer error de forma, en español).
 * La moneda sale de la cuenta elegida. Los saldos se validan después, en el repositorio.
 */
export function buildMovementDraft(
  values: FormValues,
  ctx: { accounts: AccountOption[]; categories: CategoryRecord[]; today: IsoDate },
): Result<{ draft: MovementDraft; newDebt: NewDebt | null }> {
  const amount = parseAmountInput(values.amountText);
  if (!amount.ok) return amount;

  const from = ctx.accounts.find((a) => a.id === values.accountId);
  if (!from) {
    return err('ACCOUNT_REQUIRED', values.kind === 'transfer' ? 'Elige la billetera de origen.' : 'Elige la billetera.');
  }

  const base = {
    occurredOn: values.isToday ? ctx.today : values.date,
    description: values.description.trim() === '' ? null : values.description.trim(),
    amountMinor: amount.value,
    currency: from.currency,
    declaredBalanceMinor: null,
  };

  if (values.kind === 'transfer') {
    if (!values.destAccountId) return err('DEST_REQUIRED', 'Elige la billetera de destino.');
    if (values.destAccountId === from.id) return err('SAME_ACCOUNT', 'Elige dos billeteras distintas.');
    const to = ctx.accounts.find((a) => a.id === values.destAccountId);
    if (!to) return err('DEST_REQUIRED', 'Elige la billetera de destino.');
    if (to.currency !== from.currency) return err('CURRENCY_MISMATCH', 'Las dos billeteras deben ser de la misma moneda.');
    return ok({
      draft: { ...base, type: 'transfer', categoryId: null, sourceAccountId: from.id, destAccountId: to.id, debtId: null },
      newDebt: null,
    });
  }

  if (!values.categoryId) return err('CATEGORY_REQUIRED', 'Elige una categoría.');
  const category = ctx.categories.find((c) => c.id === values.categoryId);
  const isLoan = category?.systemKey === 'loan';
  if (isLoan && !values.debtId && !values.newDebt) return err('DEBT_REQUIRED', 'Elige o crea la deuda.');

  return ok({
    draft: {
      ...base,
      type: values.kind,
      categoryId: values.categoryId,
      sourceAccountId: values.kind === 'expense' ? from.id : null,
      destAccountId: values.kind === 'income' ? from.id : null,
      debtId: isLoan ? (values.newDebt ? null : values.debtId) : null,
    },
    newDebt: isLoan && values.newDebt ? values.newDebt : null,
  });
}

const BLOCK_TITLE: Record<string, string> = {
  WALLET_NEGATIVE: 'Saldo insuficiente',
  CARD_OVER_LIMIT: 'Línea de crédito superada',
  CARD_OVERPAID: 'Pago mayor al consumo',
  DEBT_NEGATIVE: 'Deuda sobrepagada',
};

/** Aviso para una operación bloqueada por la validación de saldo en el tiempo; `null` si el error es otro. */
export function blockedNotice(error: DomainError): { title: string; message: string; suggestion: string | null } | null {
  if (error.code !== 'TIMELINE_VIOLATION') return null;
  const first = (error.details as { violations?: { code: string }[] } | undefined)?.violations?.[0];
  const code = first?.code ?? '';
  return {
    title: BLOCK_TITLE[code] ?? 'Operación bloqueada',
    message: error.message,
    suggestion: code === 'WALLET_NEGATIVE' ? 'Registra antes un ingreso (categoría «Otros») para cubrir la diferencia.' : null,
  };
}
