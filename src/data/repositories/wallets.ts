import type { LocalDb, SqlReader } from '@/data/local/db';
import { RowReader, loadLedgerState } from '@/data/local/ledgerState';
import type { CardRecord, WalletRecord } from '@/data/types';
import { buildOpening } from '@/domain/ledger/builders';
import type { Account } from '@/domain/ledger/types';
import { validateMovement } from '@/domain/ledger/validateMovement';
import type { Currency } from '@/domain/money/money';
import { todayInLima } from '@/lib/dates';
import { err, ok, type Result } from '@/lib/result';
import { cardInput, parseOrError, walletInput, type CardInput, type WalletInput } from '@/validation/inputs';
import { insertMovementRow } from './movementRows';
import { abort, resolveDeps, transact, unwrap, type RepoDeps } from './shared';

type Row = Record<string, unknown>;

function walletFromRow(row: Row): WalletRecord {
  const r = new RowReader('wallets', row);
  return {
    id: r.text('id'),
    name: r.text('name'),
    walletType: r.oneOf<WalletRecord['walletType']>('wallet_type', ['cash', 'bank', 'digital', 'other']),
    icon: r.text('icon'),
    color: r.text('color'),
    isHidden: r.bool('is_hidden'),
    includeInGeneral: r.bool('include_in_general'),
    sortOrder: r.int('sort_order'),
  };
}

function cardFromRow(row: Row): CardRecord {
  const r = new RowReader('credit_cards', row);
  return {
    accountId: r.text('id'),
    name: r.text('name'),
    issuer: r.textOrNull('issuer'),
    icon: r.text('icon'),
    color: r.text('color'),
    creditLimitMinor: r.int('credit_limit_minor'),
    closingDay: r.intOrNull('closing_day'),
    dueDay: r.intOrNull('due_day'),
    isHidden: r.bool('is_hidden'),
  };
}

async function findWallet(reader: SqlReader, id: string): Promise<WalletRecord | null> {
  const row = await reader.getOptional<Row>('SELECT * FROM wallets WHERE id = ?', [id]);
  return row ? walletFromRow(row) : null;
}

async function findCard(reader: SqlReader, id: string): Promise<CardRecord | null> {
  const row = await reader.getOptional<Row>('SELECT * FROM credit_cards WHERE id = ?', [id]);
  return row ? cardFromRow(row) : null;
}

const amountInvalid = (what: string) =>
  err<never>('AMOUNT_INVALID', `${what} debe ser un monto entero mayor a 0 (en unidades mínimas).`);

export function createWalletRepository(db: LocalDb, depsIn?: RepoDeps) {
  const { newId, clock, now } = resolveDeps(depsIn);

  async function setFlag(
    table: 'wallets' | 'credit_cards',
    column: 'is_hidden' | 'include_in_general',
    id: string,
    value: boolean,
  ): Promise<void> {
    await db.execute(`UPDATE ${table} SET ${column} = ?, updated_at = ? WHERE id = ?`, [value ? 1 : 0, now(), id]);
  }

  return {
    async listWallets(): Promise<WalletRecord[]> {
      return (await db.getAll<Row>('SELECT * FROM wallets ORDER BY sort_order, name')).map(walletFromRow);
    },

    async listAccounts(): Promise<Account[]> {
      return (await loadLedgerState(db)).accounts;
    },

    /** Crea la billetera, una cuenta por moneda y, si se indican, los saldos iniciales (aperturas). */
    async createWallet(
      input: WalletInput & { openings?: Partial<Record<Currency, number>> },
    ): Promise<Result<{ wallet: WalletRecord; accounts: Account[] }>> {
      const parsed = parseOrError(walletInput, input);
      if (!parsed.ok) return parsed;
      const value = parsed.value;
      const openings = Object.entries(input.openings ?? {}) as [Currency, number][];
      for (const [currency, amount] of openings) {
        if (!value.currencies.includes(currency)) {
          return err('INPUT_INVALID', `La billetera no tiene cuenta en ${currency}.`, { fields: { openings: currency } });
        }
        if (!Number.isSafeInteger(amount) || amount <= 0) return amountInvalid('El saldo inicial');
      }

      return transact(db, async (tx) => {
        const stamp = now();
        const walletId = newId();
        const max = await tx.getOptional<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM wallets');
        await tx.execute(
          `INSERT INTO wallets (id, user_id, name, wallet_type, icon, color, is_hidden, include_in_general, sort_order, created_at, updated_at)
           VALUES (?, NULL, ?, ?, ?, ?, 0, 1, ?, ?, ?)`,
          [walletId, value.name, value.walletType, value.icon, value.color, (max?.m ?? -1) + 1, stamp, stamp],
        );
        const accounts: Account[] = [];
        for (const currency of value.currencies) {
          const account: Account = { id: newId(), kind: 'wallet', walletId, currency, creditLimitMinor: null };
          await tx.execute(
            'INSERT INTO accounts (id, user_id, kind, wallet_id, currency, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?, ?)',
            [account.id, 'wallet', walletId, currency, stamp, stamp],
          );
          accounts.push(account);
        }
        const state = await loadLedgerState(tx);
        for (const [currency, amountMinor] of openings) {
          const account = accounts.find((a) => a.currency === currency)!;
          const opening = buildOpening({ id: newId(), account, amountMinor, occurredOn: todayInLima(clock()) });
          await insertMovementRow(tx, unwrap(validateMovement(opening, state)), stamp);
        }
        return { wallet: (await findWallet(tx, walletId))!, accounts };
      });
    },

    async setHidden(walletId: string, hidden: boolean): Promise<Result<WalletRecord>> {
      if (!(await findWallet(db, walletId))) return err('WALLET_NOT_FOUND', 'La billetera no existe.');
      await setFlag('wallets', 'is_hidden', walletId, hidden);
      return ok((await findWallet(db, walletId))!);
    },

    async setIncludeInGeneral(walletId: string, include: boolean): Promise<Result<WalletRecord>> {
      if (!(await findWallet(db, walletId))) return err('WALLET_NOT_FOUND', 'La billetera no existe.');
      await setFlag('wallets', 'include_in_general', walletId, include);
      return ok((await findWallet(db, walletId))!);
    },

    /** Crea la tarjeta (cuenta + datos) y, si hay consumo previo, su apertura. `id` de la fila = id de la cuenta. */
    async createCard(input: CardInput & { previousConsumedMinor?: number }): Promise<Result<{ card: CardRecord; account: Account }>> {
      const parsed = parseOrError(cardInput, input);
      if (!parsed.ok) return parsed;
      const value = parsed.value;
      const previous = input.previousConsumedMinor ?? 0;
      if (!Number.isSafeInteger(previous) || previous < 0) return amountInvalid('El consumo previo');
      if (previous > value.creditLimitMinor) {
        return err('CARD_OVER_LIMIT', 'El consumo previo no puede superar la línea de crédito.');
      }

      return transact(db, async (tx) => {
        const stamp = now();
        const account: Account = {
          id: newId(),
          kind: 'credit_card',
          walletId: null,
          currency: value.currency,
          creditLimitMinor: value.creditLimitMinor,
        };
        await tx.execute(
          'INSERT INTO accounts (id, user_id, kind, wallet_id, currency, created_at, updated_at) VALUES (?, NULL, ?, NULL, ?, ?, ?)',
          [account.id, 'credit_card', value.currency, stamp, stamp],
        );
        await tx.execute(
          `INSERT INTO credit_cards (id, user_id, name, issuer, icon, color, credit_limit_minor, closing_day, due_day, is_hidden, created_at, updated_at)
           VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [
            account.id, value.name, value.issuer ?? null, value.icon, value.color, value.creditLimitMinor,
            value.closingDay ?? null, value.dueDay ?? null, stamp, stamp,
          ],
        );
        if (previous > 0) {
          const opening = buildOpening({ id: newId(), account, amountMinor: previous, occurredOn: todayInLima(clock()) });
          const state = await loadLedgerState(tx);
          await insertMovementRow(tx, unwrap(validateMovement(opening, state)), stamp);
        }
        const card = await findCard(tx, account.id);
        if (!card) abort('CARD_NOT_FOUND', 'No se pudo leer la tarjeta recién creada.');
        return { card, account };
      });
    },

    async listCards(): Promise<CardRecord[]> {
      return (await db.getAll<Row>('SELECT * FROM credit_cards ORDER BY name')).map(cardFromRow);
    },

    async setCardHidden(accountId: string, hidden: boolean): Promise<Result<CardRecord>> {
      if (!(await findCard(db, accountId))) return err('CARD_NOT_FOUND', 'La tarjeta no existe.');
      await setFlag('credit_cards', 'is_hidden', accountId, hidden);
      return ok((await findCard(db, accountId))!);
    },
  };
}

export type WalletRepository = ReturnType<typeof createWalletRepository>;
