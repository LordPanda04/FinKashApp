import type { CardRecord, CategoryRecord, WalletRecord } from '@/data/types';
import type { Account, Movement } from '@/domain/ledger/types';
import type { Currency } from '@/domain/money/money';
import { addDays, addMonths, formatDayLabel, monthOf, monthRange, MONTH_NAMES_ES, type IsoDate } from '@/lib/dates';
import type { IconName } from '@/ui/Icon';
import { colors } from '@/ui/tokens';

/** `'pick'` = un mes elegido de la lista (`HistoryFilters.pickedMonth`). */
export type DateFilter = 'month' | 'lastMonth' | 'last7' | 'all' | 'pick';

/** Filtros del Historial; una lista vacía significa "sin filtrar". `walletIds` acepta billeteras y cuentas de tarjeta. */
export interface HistoryFilters {
  date: DateFilter;
  /** Mes `YYYY-MM` elegido; solo se usa con `date: 'pick'`. */
  pickedMonth: string | null;
  categoryIds: string[];
  walletIds: string[];
}

export interface RowView {
  id: string;
  icon: IconName;
  iconColor: string;
  title: string;
  badge: string;
  badgeColor?: string;
  amountMinor: number;
  currency: Currency;
  sign: 'plus' | 'minus' | 'none';
  /** Aperturas y arreglos: se muestran atenuados. */
  muted: boolean;
}

export const DATE_FILTER_LABEL: Record<DateFilter, string> = {
  month: 'Este mes',
  lastMonth: 'Mes pasado',
  last7: 'Últimos 7 días',
  all: 'Todo',
  pick: 'Elegir mes…',
};

function dateRange(filters: HistoryFilters, today: IsoDate): { start: IsoDate; end: IsoDate } | null {
  switch (filters.date) {
    case 'month':
      return monthRange(today);
    case 'lastMonth':
      return monthRange(addMonths(today, -1));
    case 'last7':
      return { start: addDays(today, -6), end: today };
    case 'all':
      return null;
    case 'pick':
      return monthRange(filters.pickedMonth ? `${filters.pickedMonth}-01` : today);
  }
}

/** "Octubre 2026" a partir de `YYYY-MM`. */
export function monthLabel(month: string): string {
  return `${MONTH_NAMES_ES[Number(month.slice(5, 7)) - 1] ?? ''} ${month.slice(0, 4)}`;
}

/** Meses (`YYYY-MM`) con movimientos, más el mes de `today`; del más reciente al más antiguo y sin repetir. */
export function monthsWithMovements(movements: Movement[], today: IsoDate): string[] {
  const months = new Set<string>([monthOf(today), ...movements.map((m) => monthOf(m.occurredOn))]);
  return [...months].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

export function filterMovements(movements: Movement[], accounts: Account[], filters: HistoryFilters, today: IsoDate): Movement[] {
  const range = dateRange(filters, today);
  const walletAccountIds = new Set(
    accounts.filter((a) => (a.walletId !== null && filters.walletIds.includes(a.walletId)) || filters.walletIds.includes(a.id)).map((a) => a.id),
  );
  return movements.filter((m) => {
    if (range && (m.occurredOn < range.start || m.occurredOn > range.end)) return false;
    if (filters.categoryIds.length > 0 && !(m.categoryId !== null && filters.categoryIds.includes(m.categoryId))) return false;
    if (filters.walletIds.length > 0) {
      const touches = (m.sourceAccountId !== null && walletAccountIds.has(m.sourceAccountId)) || (m.destAccountId !== null && walletAccountIds.has(m.destAccountId));
      if (!touches) return false;
    }
    return true;
  });
}

/** Agrupa por día (más reciente primero). Dentro de cada día conserva el orden recibido. */
export function groupByDay(movements: Movement[], today: IsoDate): { date: IsoDate; label: string; items: Movement[] }[] {
  const byDay = new Map<IsoDate, Movement[]>();
  for (const m of movements) byDay.set(m.occurredOn, [...(byDay.get(m.occurredOn) ?? []), m]);
  return [...byDay.keys()]
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .map((date) => ({ date, label: formatDayLabel(date, today), items: byDay.get(date)! }));
}

export interface DescribeContext {
  categories: CategoryRecord[];
  accounts: Account[];
  wallets: WalletRecord[];
  cards: CardRecord[];
}

function accountLabel(id: string | null, ctx: DescribeContext): { name: string; color?: string } {
  const account = ctx.accounts.find((a) => a.id === id);
  if (!account) return { name: '—' };
  if (account.kind === 'credit_card') {
    const card = ctx.cards.find((c) => c.accountId === account.id);
    return { name: card?.name ?? '—', color: card?.color };
  }
  const wallet = ctx.wallets.find((w) => w.id === account.walletId);
  return { name: wallet?.name ?? '—', color: wallet?.color };
}

/** Datos de una fila del Historial (sin hora: los movimientos solo tienen fecha). */
export function describeMovement(m: Movement, ctx: DescribeContext): RowView {
  const base = { id: m.id, amountMinor: m.amountMinor, currency: m.currency };

  if (m.type === 'expense' || m.type === 'income') {
    const category = ctx.categories.find((c) => c.id === m.categoryId);
    const account = accountLabel(m.type === 'expense' ? m.sourceAccountId : m.destAccountId, ctx);
    return {
      ...base,
      icon: (category?.icon as IconName | undefined) ?? 'category',
      iconColor: category?.color ?? colors.onSurfaceMuted,
      title: m.description ?? category?.name ?? (m.type === 'expense' ? 'Gasto' : 'Ingreso'),
      badge: account.name,
      badgeColor: account.color,
      sign: m.type === 'expense' ? 'minus' : 'plus',
      muted: false,
    };
  }

  if (m.type === 'transfer' || m.type === 'card_payment') {
    return {
      ...base,
      icon: 'swap_horiz',
      iconColor: colors.onSurfaceMuted,
      title: m.description ?? (m.type === 'transfer' ? 'Transferencia' : 'Pago de tarjeta'),
      badge: `${accountLabel(m.sourceAccountId, ctx).name} → ${accountLabel(m.destAccountId, ctx).name}`,
      sign: 'none',
      muted: false,
    };
  }

  const account = accountLabel(m.sourceAccountId ?? m.destAccountId, ctx);
  return {
    ...base,
    icon: 'tune',
    iconColor: colors.onSurfaceMuted,
    title: m.type === 'opening' ? 'Apertura' : 'Arreglo',
    badge: account.name,
    badgeColor: account.color,
    sign: 'none',
    muted: true,
  };
}
