import { createChangeNotifier } from '@/data/changes';
import type { Repositories } from '@/data/index';
import type { CardRecord, CategoryRecord, DebtRecord, WalletRecord } from '@/data/types';
import type { Account, LedgerState, Movement } from '@/domain/ledger/types';
import type { Currency } from '@/domain/money/money';
import { err, ok } from '@/lib/result';

/**
 * Repositorios en memoria para probar pantallas (la capa de datos real se prueba con SQLite en
 * `src/data`). Imitan mensajes y códigos de error de los repositorios reales y notifican cambios.
 */
export type FakeDebt = DebtRecord & { pendingMinor: number; status: 'pending' | 'paid' };

export function createFakeRepositories(
  seed: {
    categories?: CategoryRecord[];
    movements?: Movement[];
    wallets?: WalletRecord[];
    accounts?: Account[];
    cards?: CardRecord[];
    debts?: FakeDebt[];
  } = {},
) {
  const changes = createChangeNotifier();
  let categories: CategoryRecord[] = seed.categories ?? seededCategories();
  const movements: Movement[] = seed.movements ?? [];
  let nextId = 100;

  let wallets: WalletRecord[] = seed.wallets ?? [];
  const accounts: Account[] = seed.accounts ?? [];
  const cards: CardRecord[] = seed.cards ?? [];
  const debts: FakeDebt[] = seed.debts ?? [];

  const calls = { updateMovement: jest.fn(), removeMovement: jest.fn(), createMovement: jest.fn(), createWithNewDebt: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), createWallet: jest.fn(), setHidden: jest.fn(), adjustWallet: jest.fn() };

  const repos = {
    changes,
    categories: {
      list: async () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
      create: async (input: { kind: 'expense' | 'income'; name: string; color: string; icon: string }) => {
        calls.create(input);
        const name = input.name.trim();
        if (!name) return err('INPUT_INVALID', 'El nombre es obligatorio.');
        if (categories.some((c) => c.kind === input.kind && c.name.toLowerCase() === name.toLowerCase())) {
          return err('CATEGORY_DUPLICATE', `Ya existe una categoría llamada "${name}".`);
        }
        const record: CategoryRecord = { id: `c${nextId++}`, kind: input.kind, name, color: input.color, icon: input.icon, systemKey: null, sortOrder: nextId };
        categories = [...categories, record];
        changes.notify();
        return ok(record);
      },
      update: async (id: string, patch: { name?: string; color?: string; icon?: string }) => {
        calls.update(id, patch);
        const current = categories.find((c) => c.id === id);
        if (!current) return err('CATEGORY_NOT_FOUND', 'La categoría no existe.');
        if (patch.name !== undefined && patch.name !== current.name) {
          if (current.systemKey) return err('CATEGORY_PROTECTED', 'Las categorías "Otros" y "Préstamo" no se pueden renombrar.');
          if (categories.some((c) => c.id !== id && c.kind === current.kind && c.name.toLowerCase() === patch.name!.trim().toLowerCase())) {
            return err('CATEGORY_DUPLICATE', `Ya existe una categoría llamada "${patch.name.trim()}".`);
          }
        }
        const next = { ...current, ...patch, name: patch.name?.trim() ?? current.name };
        categories = categories.map((c) => (c.id === id ? next : c));
        changes.notify();
        return ok(next);
      },
      remove: async (id: string) => {
        calls.remove(id);
        const current = categories.find((c) => c.id === id);
        if (!current) return err('CATEGORY_NOT_FOUND', 'La categoría no existe.');
        if (current.systemKey) return err('CATEGORY_PROTECTED', 'Las categorías "Otros" y "Préstamo" no se pueden eliminar.');
        const reassigned = movements.filter((m) => m.categoryId === id).length;
        categories = categories.filter((c) => c.id !== id);
        changes.notify();
        return ok({ reassigned });
      },
    },
    movements: {
      // Más recientes primero (como el repositorio real); el orden dentro de un día es el de inserción.
      list: async (filter: { categoryId?: string; accountId?: string } = {}) =>
        movements
          .filter(
            (m) =>
              (!filter.categoryId || m.categoryId === filter.categoryId) &&
              (!filter.accountId || m.sourceAccountId === filter.accountId || m.destAccountId === filter.accountId),
          )
          .sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : a.occurredOn > b.occurredOn ? -1 : 0)),
      get: async (id: string) => movements.find((m) => m.id === id) ?? null,
      create: async (draft: Omit<Movement, 'id'>) => {
        calls.createMovement(draft);
        const r = (fake.createResult ? fake.createResult(draft) : ok({ id: `mv${nextId++}`, ...draft })) as ReturnType<typeof ok<Movement>> | ReturnType<typeof err>;
        if (r.ok) {
          movements.push(r.value as Movement);
          changes.notify();
        }
        return r;
      },
      createWithNewDebt: async (draft: Omit<Movement, 'id'>, debt: unknown) => {
        calls.createWithNewDebt(draft, debt);
        const r = (fake.createResult ? fake.createResult(draft) : ok({ movement: { id: `mv${nextId++}`, ...draft, debtId: 'newDebt' }, debtId: 'newDebt' })) as { ok: boolean; value?: { movement: Movement } };
        if (r.ok && r.value) {
          movements.push(r.value.movement);
          changes.notify();
        }
        return r;
      },
      update: async (id: string, draft: Omit<Movement, 'id'>) => {
        calls.updateMovement(id, draft);
        const r = (fake.updateResult ? fake.updateResult(id, draft) : ok({ id, ...draft })) as { ok: boolean; value?: Movement };
        if (r.ok && r.value) {
          const index = movements.findIndex((m) => m.id === id);
          if (index >= 0) movements[index] = r.value;
          changes.notify();
        }
        return r;
      },
      remove: async (id: string) => {
        calls.removeMovement(id);
        const r = (fake.removeResult ? fake.removeResult(id) : ok(undefined)) as { ok: boolean };
        if (r.ok) {
          const index = movements.findIndex((m) => m.id === id);
          if (index >= 0) movements.splice(index, 1);
          changes.notify();
        }
        return r;
      },
      adjustWallet: async (input: { accountId: string; declaredMinor: number; occurredOn?: string }) => {
        calls.adjustWallet(input);
        return fakeAdjust(input);
      },
    },
    debts: { list: async () => debts },
    ledger: {
      state: async (): Promise<LedgerState> => ({ accounts: [...accounts], movements: [...movements], categories: [], debts: [] }),
    },
    wallets: {
      listWallets: async () => [...wallets].sort((a, b) => a.sortOrder - b.sortOrder),
      listCards: async () => [...cards],
      listAccounts: async () => [...accounts],
      createWallet: async (input: { name: string; walletType: WalletRecord['walletType']; icon: string; color: string; currencies: Currency[]; openings?: Partial<Record<Currency, number>> }) => {
        calls.createWallet(input);
        if (!input.name.trim()) return err('INPUT_INVALID', 'El nombre es obligatorio.');
        const wallet: WalletRecord = { id: `w${nextId++}`, name: input.name.trim(), walletType: input.walletType, icon: input.icon, color: input.color, isHidden: false, includeInGeneral: true, sortOrder: nextId };
        wallets = [...wallets, wallet];
        const created = input.currencies.map((currency): Account => ({ id: `a${nextId++}`, kind: 'wallet', walletId: wallet.id, currency, creditLimitMinor: null }));
        accounts.push(...created);
        for (const a of created) {
          const amount = input.openings?.[a.currency];
          if (amount) movements.push(movementOf({ id: `o${nextId++}`, type: 'opening', sourceAccountId: null, destAccountId: a.id, amountMinor: amount, currency: a.currency }));
        }
        changes.notify();
        return ok({ wallet, accounts: created });
      },
      setHidden: async (id: string, hidden: boolean) => {
        calls.setHidden(id, hidden);
        const current = wallets.find((w) => w.id === id);
        if (!current) return err('WALLET_NOT_FOUND', 'La billetera no existe.');
        const next = { ...current, isHidden: hidden };
        wallets = wallets.map((w) => (w.id === id ? next : w));
        changes.notify();
        return ok(next);
      },
    },
  };

  /** Respuesta simulada de adjustWallet: configurable desde la prueba con `fake.adjustResult`. */
  const fakeAdjust = (input: { accountId: string; declaredMinor: number }) => (fake.adjustResult ? fake.adjustResult(input) : ok(null));
  const fake = {
    repos: repos as unknown as Repositories,
    calls,
    changes,
    adjustResult: undefined as undefined | ((input: { accountId: string; declaredMinor: number }) => unknown),
    createResult: undefined as undefined | ((draft: Omit<Movement, 'id'>) => unknown),
    updateResult: undefined as undefined | ((id: string, draft: Omit<Movement, 'id'>) => unknown),
    removeResult: undefined as undefined | ((id: string) => unknown),
  };
  return fake;
}

export function seededCategories(): CategoryRecord[] {
  const base = [
    { name: 'Otros', systemKey: 'other', color: '#6B7280', icon: 'category' },
    { name: 'Préstamo', systemKey: 'loan', color: '#F59E0B', icon: 'handshake' },
    { name: 'Devolución / Reembolso', systemKey: null, color: '#10B981', icon: 'savings' },
  ] as const;
  return (['expense', 'income'] as const).flatMap((kind, k) =>
    base.map((b, i) => ({ id: `${kind}-${i}`, kind, systemKey: b.systemKey, name: b.name, color: b.color, icon: b.icon, sortOrder: k * 10 + i })),
  ) as CategoryRecord[];
}

export function movementOf(partial: Partial<Movement> & { id: string }): Movement {
  return {
    type: 'expense', occurredOn: '2026-11-10', description: null, categoryId: null, sourceAccountId: 'acc',
    destAccountId: null, amountMinor: 1000, currency: 'PEN', debtId: null, declaredBalanceMinor: null, ...partial,
  };
}
