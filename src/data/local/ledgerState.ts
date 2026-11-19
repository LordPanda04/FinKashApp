import type { Account, Category, Debt, LedgerState, Movement, MovementType } from '@/domain/ledger/types';
import type { Currency } from '@/domain/money/money';
import type { SqlReader } from './db';

const CURRENCIES: readonly string[] = ['PEN', 'USD'];
const MOVEMENT_TYPES: readonly string[] = ['expense', 'income', 'transfer', 'card_payment', 'opening', 'adjustment'];

type Row = Record<string, unknown>;

/** Lector de columnas que falla con un mensaje claro (tabla, id y columna) ante datos corruptos. */
export class RowReader {
  constructor(
    private readonly table: string,
    private readonly row: Row,
  ) {}

  private fail(column: string): never {
    throw new Error(
      `Dato inválido en ${this.table} (id ${String(this.row.id)}): columna ${column} = ${JSON.stringify(this.row[column])}`,
    );
  }

  text(column: string): string {
    const v = this.row[column];
    return typeof v === 'string' ? v : this.fail(column);
  }

  textOrNull(column: string): string | null {
    const v = this.row[column];
    return v === null || v === undefined ? null : this.text(column);
  }

  int(column: string): number {
    const v = this.row[column];
    return typeof v === 'number' && Number.isSafeInteger(v) ? v : this.fail(column);
  }

  intOrNull(column: string): number | null {
    const v = this.row[column];
    return v === null || v === undefined ? null : this.int(column);
  }

  bool(column: string): boolean {
    const v = this.int(column);
    return v === 1 ? true : v === 0 ? false : this.fail(column);
  }

  oneOf<T extends string>(column: string, allowed: readonly string[]): T {
    const v = this.text(column);
    return allowed.includes(v) ? (v as T) : this.fail(column);
  }

  currency(column: string): Currency {
    return this.oneOf<Currency>(column, CURRENCIES);
  }
}

export function accountFromRow(row: Row): Account {
  const r = new RowReader('accounts', row);
  const kind = r.oneOf<Account['kind']>('kind', ['wallet', 'credit_card']);
  return {
    id: r.text('id'),
    kind,
    walletId: r.textOrNull('wallet_id'),
    currency: r.currency('currency'),
    creditLimitMinor: kind === 'credit_card' ? r.int('credit_limit_minor') : null,
  };
}

export function categoryFromRow(row: Row): Category {
  const r = new RowReader('categories', row);
  const systemKey =
    r.textOrNull('system_key') === null ? null : r.oneOf<'other' | 'loan'>('system_key', ['other', 'loan']);
  return { id: r.text('id'), kind: r.oneOf<Category['kind']>('kind', ['expense', 'income']), systemKey };
}

export function debtFromRow(row: Row): Debt {
  const r = new RowReader('debts', row);
  return {
    id: r.text('id'),
    direction: r.oneOf<Debt['direction']>('direction', ['receivable', 'payable']),
    currency: r.currency('currency'),
    initialPendingMinor: r.int('initial_pending_minor'),
    installmentAmountMinor: r.intOrNull('installment_amount_minor'),
    nextDueOn: r.textOrNull('next_due_on'),
  };
}

export function movementFromRow(row: Row): Movement {
  const r = new RowReader('movements', row);
  return {
    id: r.text('id'),
    type: r.oneOf<MovementType>('type', MOVEMENT_TYPES),
    occurredOn: r.text('occurred_on'),
    description: r.textOrNull('description'),
    categoryId: r.textOrNull('category_id'),
    sourceAccountId: r.textOrNull('source_account_id'),
    destAccountId: r.textOrNull('dest_account_id'),
    amountMinor: r.int('amount_minor'),
    currency: r.currency('currency'),
    debtId: r.textOrNull('debt_id'),
    declaredBalanceMinor: r.intOrNull('declared_balance_minor'),
  };
}

/** Lee todo el libro (cuentas, categorías, deudas y movimientos), validando cada fila. */
export async function loadLedgerState(reader: SqlReader): Promise<LedgerState> {
  const [accounts, categories, debts, movements] = await Promise.all([
    reader.getAll<Row>(
      `SELECT a.id, a.kind, a.wallet_id, a.currency, c.credit_limit_minor
         FROM accounts a LEFT JOIN credit_cards c ON c.id = a.id ORDER BY a.id`,
    ),
    reader.getAll<Row>('SELECT id, kind, system_key FROM categories ORDER BY sort_order, id'),
    reader.getAll<Row>('SELECT * FROM debts ORDER BY id'),
    reader.getAll<Row>('SELECT * FROM movements ORDER BY occurred_on, created_at, id'),
  ]);
  return {
    accounts: accounts.map(accountFromRow),
    categories: categories.map(categoryFromRow),
    debts: debts.map(debtFromRow),
    movements: movements.map(movementFromRow),
  };
}
