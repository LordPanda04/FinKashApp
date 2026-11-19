import type { CardRecord, CategoryRecord, WalletRecord } from '@/data/types';
import type { LedgerState } from '@/domain/ledger/types';
import type { Currency } from '@/domain/money/money';
import {
  dailyBalanceSeries,
  expensesByCategory,
  homeSummary,
  isBelowThreshold,
  netChange,
  projectedRemaining,
  type DateRange,
} from '@/domain/reports/home';
import { MONTH_NAMES_ES, type IsoDate } from '@/lib/dates';
import { colors } from '@/ui/tokens';

/** Saludo de Inicio (D50): `Hola!, <nombre>`; sin nombre (o solo espacios), `Hola!`. */
export function greetingText(name: string | null): string {
  const trimmed = name?.trim() ?? '';
  return trimmed === '' ? 'Hola!' : `Hola!, ${trimmed}`;
}

/** `'general'` (Saldo general) o el id de una billetera. */
export type Scope = 'general' | string;

export interface HomeInput {
  state: LedgerState;
  wallets: WalletRecord[];
  cards: CardRecord[];
  categories: CategoryRecord[];
  period: DateRange;
  today: IsoDate;
  scope: Scope;
  thresholds: { currency: Currency; amountMinor: number; walletId: string | null }[];
}

export interface CurrencyBlock {
  currency: Currency;
  availableMinor: number;
  spentMinor: number;
  remainingMinor: number;
  /** Solo en Saldo general. */
  projectedMinor: number | null;
  belowThreshold: boolean;
  thresholdMinor: number | null;
}

export interface DonutData {
  totalMinor: number;
  slices: { categoryId: string; name: string; color: string; totalMinor: number }[];
}

export interface FlowData {
  series: { date: IsoDate; balanceMinor: number }[];
  netChangeMinor: number;
  thresholdMinor: number | null;
}

export interface HomeView {
  /** No hay billeteras en el alcance. */
  empty: boolean;
  scopeLabel: string;
  monthLabel: string;
  /** Desde cuándo va el periodo activo: "Periodo desde el 1 de noviembre". */
  periodLabel: string;
  /** Monedas con cuentas en el alcance, PEN primero. */
  currencies: Currency[];
  blocks: Partial<Record<Currency, CurrencyBlock>>;
  donut: Partial<Record<Currency, DonutData>>;
  flow: Partial<Record<Currency, FlowData>>;
}

const CURRENCY_ORDER: Currency[] = ['PEN', 'USD'];

/**
 * Cuentas del alcance. Saldo general: billeteras con la casilla "incluir en general" y tarjetas
 * visibles. Una billetera: solo sus cuentas (sin tarjetas), aunque su casilla esté desmarcada.
 */
export function scopeAccountIds(
  state: LedgerState,
  wallets: WalletRecord[],
  cards: CardRecord[],
  scope: Scope,
): { walletAccountIds: string[]; cardAccountIds: string[] } {
  const walletIds =
    scope === 'general' ? wallets.filter((w) => w.includeInGeneral).map((w) => w.id) : wallets.filter((w) => w.id === scope).map((w) => w.id);
  const walletAccountIds = state.accounts.filter((a) => a.kind === 'wallet' && a.walletId !== null && walletIds.includes(a.walletId)).map((a) => a.id);
  const cardAccountIds =
    scope === 'general'
      ? cards.filter((c) => !c.isHidden && state.accounts.some((a) => a.id === c.accountId)).map((c) => c.accountId)
      : [];
  return { walletAccountIds, cardAccountIds };
}

/** "Periodo desde el 15 de noviembre" a partir del día de inicio del periodo activo. */
function periodLabelOf(start: IsoDate): string {
  const month = MONTH_NAMES_ES[Number(start.slice(5, 7)) - 1] ?? '';
  return `Periodo desde el ${Number(start.slice(8, 10))} de ${month.toLowerCase()}`;
}

export function buildHomeView(input: HomeInput): HomeView {
  const { state, wallets, cards, categories, period, today, scope, thresholds } = input;
  const { walletAccountIds, cardAccountIds } = scopeAccountIds(state, wallets, cards, scope);
  const monthLabel = MONTH_NAMES_ES[Number(period.end.slice(5, 7)) - 1] ?? '';
  const periodLabel = periodLabelOf(period.start);
  const scopeLabel = scope === 'general' ? 'Saldo general' : (wallets.find((w) => w.id === scope)?.name ?? '');

  if (walletAccountIds.length === 0) {
    return { empty: true, scopeLabel, monthLabel, periodLabel, currencies: [], blocks: {}, donut: {}, flow: {} };
  }

  const present = new Set(state.accounts.filter((a) => walletAccountIds.includes(a.id)).map((a) => a.currency));
  const currencies = CURRENCY_ORDER.filter((c) => present.has(c));
  const summary = homeSummary(state, walletAccountIds, period);
  const expenseAccountIds = [...walletAccountIds, ...cardAccountIds];

  const blocks: HomeView['blocks'] = {};
  const donut: HomeView['donut'] = {};
  const flow: HomeView['flow'] = {};

  for (const currency of currencies) {
    const s = summary[currency] ?? { availableMinor: 0, spentMinor: 0, remainingMinor: 0 };
    const wanted = scope === 'general' ? null : scope;
    const thresholdMinor = thresholds.find((t) => t.currency === currency && t.walletId === wanted)?.amountMinor ?? null;
    blocks[currency] = {
      currency,
      ...s,
      projectedMinor: scope === 'general' ? projectedRemaining(state, walletAccountIds, cardAccountIds, currency, today) : null,
      thresholdMinor,
      belowThreshold: isBelowThreshold(s.remainingMinor, thresholdMinor),
    };

    const slices = expensesByCategory(state, expenseAccountIds, period, currency).map(({ categoryId, totalMinor }) => {
      const category = categories.find((c) => c.id === categoryId);
      return { categoryId, name: category?.name ?? 'Sin categoría', color: category?.color ?? colors.onSurfaceMuted, totalMinor };
    });
    donut[currency] = { totalMinor: slices.reduce((sum, x) => sum + x.totalMinor, 0), slices };

    flow[currency] = {
      series: dailyBalanceSeries(state, walletAccountIds, currency, period),
      netChangeMinor: netChange(state, walletAccountIds, currency, period),
      thresholdMinor,
    };
  }

  return { empty: false, scopeLabel, monthLabel, periodLabel, currencies, blocks, donut, flow };
}

/** Con el ojo cerrado, todo monto se reemplaza por `****`. */
export function maskAmount(text: string, hidden: boolean): string {
  return hidden ? '****' : text;
}
