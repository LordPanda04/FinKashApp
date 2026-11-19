import type { LocalDb } from './local/db';
import { createCategoryRepository } from './repositories/categories';
import { createDebtRepository } from './repositories/debts';
import { createMovementRepository } from './repositories/movements';
import { createPeriodRepository } from './repositories/periods';
import { createSettingsRepository } from './repositories/settings';
import type { RepoDeps } from './repositories/shared';
import { createWalletRepository } from './repositories/wallets';

/** Todos los repositorios sobre una misma base. Las features solo acceden a los datos por aquí. */
export function createRepositories(db: LocalDb, deps?: RepoDeps) {
  return {
    categories: createCategoryRepository(db, deps),
    wallets: createWalletRepository(db, deps),
    debts: createDebtRepository(db, deps),
    movements: createMovementRepository(db, deps),
    periods: createPeriodRepository(db, deps),
    settings: createSettingsRepository(db, deps),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
