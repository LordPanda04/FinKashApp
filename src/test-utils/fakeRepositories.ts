import { createChangeNotifier } from '@/data/changes';
import type { Repositories } from '@/data/index';
import type { CardRecord, CategoryRecord, DebtRecord, WalletRecord } from '@/data/types';
import type { Account, LedgerState, Movement } from '@/domain/ledger/types';
import type { Currency } from '@/domain/money/money';
import { accountBalance } from '@/domain/ledger/balances';
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
    device?: { hideAmounts: boolean; showProjection: boolean; homeScope: string; displayName?: string | null };
    thresholds?: { id: string; currency: Currency; amountMinor: number; walletId: string | null }[];
    period?: { start: string; end: string };
    /** Resultado de `periods.shouldSuggest()` (por defecto, `false`). */
    suggestPeriod?: boolean;
  } = {},
) {
  const changes = createChangeNotifier();
  let categories: CategoryRecord[] = seed.categories ?? seededCategories();
  const movements: Movement[] = [...(seed.movements ?? [])]; // copia: el falso agrega arreglos y no debe contaminar el arreglo de la prueba
  let nextId = 100;

  let wallets: WalletRecord[] = [...(seed.wallets ?? [])];
  // Copias: el falso agrega cuentas y movimientos y no debe contaminar los arreglos que definen las pruebas.
  const accounts: Account[] = [...(seed.accounts ?? [])];
  const cards: CardRecord[] = seed.cards ?? [];
  const debts: FakeDebt[] = seed.debts ?? [];
  // `displayName: ''` = nombre omitido: así las pantallas no abren la hoja de bienvenida salvo que la prueba lo pida.
  let device: { hideAmounts: boolean; showProjection: boolean; homeScope: string; displayName: string | null } = {
    hideAmounts: false, showProjection: false, homeScope: 'general', displayName: '', ...seed.device,
  };
  let thresholds = seed.thresholds ?? [];
  let suggestPeriod = seed.suggestPeriod ?? false;

  const calls = { setDevice: jest.fn(), setThreshold: jest.fn(), clearThreshold: jest.fn(), setIncludeInGeneral: jest.fn(), updateMovement: jest.fn(), removeMovement: jest.fn(), createMovement: jest.fn(), createWithNewDebt: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), createWallet: jest.fn(), setHidden: jest.fn(), adjustWallet: jest.fn(), confirmPeriod: jest.fn(), dismissPeriod: jest.fn(), addAccount: jest.fn() };

  const repos = {
    changes,
    categories: {
      list: async () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
      create: async (input: { name: string; color: string; icon: string }) => {
        calls.create(input);
        const name = input.name.trim();
        if (!name) return err('INPUT_INVALID', 'El nombre es obligatorio.');
        if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
          return err('CATEGORY_DUPLICATE', `Ya existe una categoría llamada "${name}".`);
        }
        const record: CategoryRecord = { id: `c${nextId++}`, name, color: input.color, icon: input.icon, systemKey: null, sortOrder: nextId };
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
          if (categories.some((c) => c.id !== id && c.name.toLowerCase() === patch.name!.trim().toLowerCase())) {
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
        const result = fakeAdjust(input) as { ok: boolean };
        if (result.ok) {
          // Como el repositorio real: registra un arreglo por la diferencia, para que los saldos cambien.
          const account = accounts.find((a) => a.id === input.accountId);
          const diff = input.declaredMinor - accountBalance(input.accountId, movements);
          if (account && diff !== 0) {
            movements.push(movementOf({
              id: `adj${nextId++}`, type: 'adjustment', occurredOn: input.occurredOn ?? '2026-11-20', currency: account.currency,
              sourceAccountId: diff < 0 ? input.accountId : null, destAccountId: diff > 0 ? input.accountId : null,
              amountMinor: Math.abs(diff), declaredBalanceMinor: input.declaredMinor,
            }));
          }
          changes.notify();
        }
        return result;
      },
    },
    debts: { list: async () => debts },
    periods: {
      activeRange: async () => seed.period ?? { start: '2026-11-01', end: '2026-11-20' },
      shouldSuggest: async () => suggestPeriod,
      confirm: async (input: { month: string; startedOn?: string }) => {
        calls.confirmPeriod(input);
        const result = (fake.confirmResult ? fake.confirmResult(input) : ok({ id: 'p', month: input.month, startedOn: input.startedOn ?? `${input.month}-01`, confirmedAt: 'x', dismissedAt: null })) as { ok: boolean };
        if (result.ok) {
          suggestPeriod = false;
          changes.notify();
        }
        return result;
      },
      dismiss: async (month: string) => {
        calls.dismissPeriod(month);
        suggestPeriod = false;
        changes.notify();
      },
    },
    settings: {
      getDevice: async () => device,
      setDevice: async (patch: Partial<typeof device>) => {
        calls.setDevice(patch);
        if (typeof patch.displayName === 'string') {
          // Imita la validación del repositorio real: recorta y limita a 40 caracteres.
          const trimmed = patch.displayName.trim();
          if (trimmed.length > 40) throw new Error('El nombre puede tener hasta 40 caracteres.');
          patch = { ...patch, displayName: trimmed };
        }
        device = { ...device, ...patch };
        changes.notify();
      },
      listThresholds: async () => thresholds,
      setThreshold: async (input: { currency: Currency; amountMinor: number; walletId?: string }) => {
        calls.setThreshold(input);
        if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) return err('INPUT_INVALID', 'El umbral debe ser mayor a 0.');
        const walletId = input.walletId ?? null;
        thresholds = [...thresholds.filter((t) => !(t.currency === input.currency && t.walletId === walletId)), { id: `t${nextId++}`, currency: input.currency, amountMinor: input.amountMinor, walletId }];
        changes.notify();
        return ok({ id: 't' });
      },
      clearThreshold: async (currency: Currency, walletId: string | null) => {
        calls.clearThreshold(currency, walletId);
        thresholds = thresholds.filter((t) => !(t.currency === currency && t.walletId === walletId));
        changes.notify();
      },
    },
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
      addAccount: async (input: { walletId: string; currency: Currency; openingMinor?: number }) => {
        calls.addAccount(input);
        if (fake.addAccountResult) return fake.addAccountResult(input);
        if (!wallets.some((w) => w.id === input.walletId)) return err('WALLET_NOT_FOUND', 'La billetera no existe.');
        if (accounts.some((a) => a.kind === 'wallet' && a.walletId === input.walletId && a.currency === input.currency)) {
          return err('ACCOUNT_ALREADY_EXISTS', `La billetera ya tiene una cuenta en ${input.currency}.`);
        }
        const account: Account = { id: `a${nextId++}`, kind: 'wallet', walletId: input.walletId, currency: input.currency, creditLimitMinor: null };
        accounts.push(account);
        if (input.openingMinor) {
          movements.push(movementOf({ id: `o${nextId++}`, type: 'opening', sourceAccountId: null, destAccountId: account.id, amountMinor: input.openingMinor, currency: input.currency }));
        }
        changes.notify();
        return ok({ account });
      },
      setIncludeInGeneral: async (id: string, include: boolean) => {
        calls.setIncludeInGeneral(id, include);
        const current = wallets.find((w) => w.id === id);
        if (!current) return err('WALLET_NOT_FOUND', 'La billetera no existe.');
        const next = { ...current, includeInGeneral: include };
        wallets = wallets.map((w) => (w.id === id ? next : w));
        changes.notify();
        return ok(next);
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
    addAccountResult: undefined as undefined | ((input: { walletId: string; currency: Currency; openingMinor?: number }) => unknown),
    confirmResult: undefined as undefined | ((input: { month: string; startedOn?: string }) => unknown),
    adjustResult: undefined as undefined | ((input: { accountId: string; declaredMinor: number }) => unknown),
    createResult: undefined as undefined | ((draft: Omit<Movement, 'id'>) => unknown),
    updateResult: undefined as undefined | ((id: string, draft: Omit<Movement, 'id'>) => unknown),
    removeResult: undefined as undefined | ((id: string) => unknown),
  };
  return fake;
}

export function seededCategories(): CategoryRecord[] {
  return [
    { id: 'other', name: 'Otros', systemKey: 'other', color: '#6B7280', icon: 'category', sortOrder: 0 },
    { id: 'loan', name: 'Préstamo', systemKey: 'loan', color: '#F59E0B', icon: 'handshake', sortOrder: 1 },
    { id: 'refund', name: 'Devolución / Reembolso', systemKey: null, color: '#10B981', icon: 'savings', sortOrder: 2 },
  ];
}

export function movementOf(partial: Partial<Movement> & { id: string }): Movement {
  return {
    type: 'expense', occurredOn: '2026-11-10', description: null, categoryId: null, sourceAccountId: 'acc',
    destAccountId: null, amountMinor: 1000, currency: 'PEN', debtId: null, declaredBalanceMinor: null, ...partial,
  };
}
