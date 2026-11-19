import type { LocalDb } from '@/data/local/db';
import { loadLedgerState } from '@/data/local/ledgerState';
import type { LedgerState } from '@/domain/ledger/types';

/** Lectura del libro completo (cuentas, categorías, deudas y movimientos) para calcular saldos con el dominio. */
export function createLedgerRepository(db: LocalDb) {
  return {
    state(): Promise<LedgerState> {
      return loadLedgerState(db);
    },
  };
}

export type LedgerRepository = ReturnType<typeof createLedgerRepository>;
