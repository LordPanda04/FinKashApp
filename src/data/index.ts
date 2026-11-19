import { createChangeNotifier, type ChangeNotifier } from './changes';
import type { LocalDb } from './local/db';
import { createCategoryRepository } from './repositories/categories';
import { createDebtRepository } from './repositories/debts';
import { createLedgerRepository } from './repositories/ledger';
import { createMovementRepository } from './repositories/movements';
import { createPeriodRepository } from './repositories/periods';
import { createSettingsRepository } from './repositories/settings';
import type { RepoDeps } from './repositories/shared';
import { createWalletRepository } from './repositories/wallets';

/**
 * Envuelve las escrituras de un repositorio para avisar al terminar (con éxito, con error de
 * dominio o con excepción). Las lecturas no se envuelven: notificarlas causaría bucles de lectura.
 */
function notifying<T extends object, K extends keyof T>(repo: T, writes: readonly K[], changes: ChangeNotifier): T {
  const wrapped = { ...repo };
  for (const name of writes) {
    const original = repo[name] as unknown as (...args: unknown[]) => Promise<unknown>;
    (wrapped as Record<K, unknown>)[name] = async (...args: unknown[]) => {
      try {
        return await original(...args);
      } finally {
        changes.notify();
      }
    };
  }
  return wrapped;
}

/** Todos los repositorios sobre una misma base. Las features solo acceden a los datos por aquí. */
export function createRepositories(db: LocalDb, deps?: RepoDeps) {
  const changes = createChangeNotifier();
  return {
    categories: notifying(createCategoryRepository(db, deps), ['create', 'update', 'remove'], changes),
    wallets: notifying(
      createWalletRepository(db, deps),
      ['createWallet', 'setHidden', 'setIncludeInGeneral', 'createCard', 'setCardHidden'],
      changes,
    ),
    debts: notifying(createDebtRepository(db, deps), ['create', 'update'], changes),
    movements: notifying(createMovementRepository(db, deps), ['create', 'createWithNewDebt', 'update', 'remove', 'adjustWallet'], changes),
    periods: notifying(createPeriodRepository(db, deps), ['confirm', 'dismiss'], changes),
    settings: notifying(createSettingsRepository(db, deps), ['setDevice', 'setThreshold', 'clearThreshold'], changes),
    ledger: createLedgerRepository(db),
    changes,
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
