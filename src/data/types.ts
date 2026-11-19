import type { Category, Debt } from '@/domain/ledger/types';
import type { IsoDate } from '@/lib/dates';

/** Reloj inyectable: los repositorios nunca llaman a `new Date()` directamente. */
export type Clock = () => Date;
/** Generador de ids inyectable (en la app, UUID v4). */
export type IdGen = () => string;

export interface CategoryRecord extends Category {
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface WalletRecord {
  id: string;
  name: string;
  walletType: 'cash' | 'bank' | 'digital' | 'other';
  icon: string;
  color: string;
  isHidden: boolean;
  includeInGeneral: boolean;
  sortOrder: number;
}

export interface CardRecord {
  accountId: string;
  name: string;
  issuer: string | null;
  icon: string;
  color: string;
  creditLimitMinor: number;
  closingDay: number | null;
  dueDay: number | null;
  isHidden: boolean;
}

export interface DebtRecord extends Debt {
  counterpartyName: string;
  counterpartyType: 'person' | 'institution';
  dueOn: IsoDate | null;
  installmentsRemaining: number | null;
  notes: string | null;
}
