import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRepositories } from '@/data/RepositoriesContext';
import { useQuery } from '@/data/useQuery';
import { monthOf, todayInLima, type IsoDate } from '@/lib/dates';
import { AppText } from '@/ui/AppText';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { FilterChip } from '@/ui/FilterChip';
import { GroupedList } from '@/ui/GroupedList';
import { HeaderIconButton } from '@/ui/HeaderIconButton';
import { NoticeCard } from '@/ui/NoticeCard';
import { Screen } from '@/ui/Screen';
import { SelectorSheet } from '@/ui/SelectorSheet';
import { colors } from '@/ui/tokens';
import { blockedNotice } from '@/features/movimientos/presenter';
import { MovementRow } from './MovementRow';
import { DATE_FILTER_LABEL, describeMovement, filterMovements, groupByDay, monthLabel, monthsWithMovements, type DateFilter, type HistoryFilters, type RowView } from './presenter';

type Sheet = 'date' | 'month' | 'category' | 'wallet' | null;

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export function HistorialScreen({ today: todayProp }: { today?: IsoDate }) {
  const router = useRouter();
  const { movements } = useRepositories();
  const today = todayProp ?? todayInLima(new Date());
  const [filters, setFilters] = useState<HistoryFilters>({ date: 'month', pickedMonth: null, categoryIds: [], walletIds: [] });
  const [sheet, setSheet] = useState<Sheet>(null);
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RowView | null>(null);
  const [problem, setProblem] = useState<{ title: string; message: string } | null>(null);

  const { data, error } = useQuery(async (r) => ({
    movements: await r.movements.list(),
    accounts: await r.wallets.listAccounts(),
    wallets: await r.wallets.listWallets(),
    cards: await r.wallets.listCards(),
    categories: await r.categories.list(),
  }));

  const ctx = data && { categories: data.categories, accounts: data.accounts, wallets: data.wallets, cards: data.cards };
  const groups = data ? groupByDay(filterMovements(data.movements, data.accounts, filters, today), today) : [];

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    const result = await movements.remove(id);
    if (result.ok) {
      setProblem(null);
      return;
    }
    const notice = blockedNotice(result.error);
    setProblem(notice ? { title: notice.title, message: notice.message } : { title: 'No se pudo eliminar', message: result.error.message });
  }

  return (
    <Screen backdrop="plin">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="headlineLg" color={colors.onBackground} accessibilityRole="header">
          Historial
        </AppText>
        <HeaderIconButton
          icon={editing ? 'check' : 'edit'}
          label={editing ? 'Terminar edición' : 'Editar historial'}
          onPress={() => setEditing((v) => !v)}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
        <FilterChip
          label={filters.date === 'pick' && filters.pickedMonth ? monthLabel(filters.pickedMonth) : 'Fecha'}
          active={filters.date !== 'month'}
          onPress={() => setSheet('date')}
        />
        <FilterChip label="Categoría" active={filters.categoryIds.length > 0} onPress={() => setSheet('category')} />
        <FilterChip label="Billetera" active={filters.walletIds.length > 0} onPress={() => setSheet('wallet')} />
      </ScrollView>

      {error ? <AppText color={colors.danger}>No se pudo leer el historial.</AppText> : null}
      {problem ? <NoticeCard title={problem.title} message={problem.message} /> : null}

      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
        {data && groups.length === 0 ? (
          <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
            No hay movimientos con estos filtros.
          </AppText>
        ) : null}
        {ctx
          ? groups.map((g) => (
              <View key={g.date} style={{ gap: 8 }}>
                <AppText variant="labelLg" color={colors.onSurfaceMuted}>
                  {g.label}
                </AppText>
                <GroupedList>
                  {g.items.map((m) => {
                    const row = describeMovement(m, ctx);
                    return (
                      <MovementRow
                        key={m.id}
                        row={row}
                        editing={editing}
                        onEdit={() => router.push(`/movimiento/${m.id}` as Href)}
                        onDelete={() => setPendingDelete(row)}
                      />
                    );
                  })}
                </GroupedList>
              </View>
            ))
          : null}
      </ScrollView>

      <SelectorSheet<DateFilter>
        visible={sheet === 'date'}
        title="Fecha"
        options={(Object.keys(DATE_FILTER_LABEL) as DateFilter[]).map((v) => ({ value: v, label: DATE_FILTER_LABEL[v] }))}
        value={filters.date}
        onSelect={(date) => {
          if (date === 'pick') {
            // "Elegir mes…" abre la lista de meses; el cierre automático de esta hoja no debe taparla.
            setSheet('month');
            return;
          }
          setFilters((f) => ({ ...f, date, pickedMonth: null }));
        }}
        onClose={() => setSheet((current) => (current === 'date' ? null : current))}
      />
      <SelectorSheet
        visible={sheet === 'month'}
        title="Elegir mes"
        options={(data ? monthsWithMovements(data.movements, today) : [monthOf(today)]).map((m) => ({ value: m, label: monthLabel(m) }))}
        value={filters.date === 'pick' ? filters.pickedMonth : monthOf(today)}
        onSelect={(month) =>
          setFilters((f) => (month === monthOf(today) ? { ...f, date: 'month', pickedMonth: null } : { ...f, date: 'pick', pickedMonth: month }))
        }
        onClose={() => setSheet(null)}
      />
      <SelectorSheet
        visible={sheet === 'category'}
        multi
        title="Categoría"
        options={(data?.categories ?? []).map((c) => ({
          value: c.id,
          label: c.name,
          icon: c.icon as never,
          color: c.color,
        }))}
        value={filters.categoryIds}
        onSelect={(id) => setFilters((f) => ({ ...f, categoryIds: toggle(f.categoryIds, id) }))}
        onClose={() => setSheet(null)}
      />
      <SelectorSheet
        visible={sheet === 'wallet'}
        multi
        title="Billetera"
        options={[
          ...(data?.wallets ?? []).map((w) => ({ value: w.id, label: w.name, icon: w.icon as never, color: w.color })),
          ...(data?.cards ?? []).map((c) => ({ value: c.accountId, label: c.name, icon: 'credit_card' as const, color: c.color })),
        ]}
        value={filters.walletIds}
        onSelect={(id) => setFilters((f) => ({ ...f, walletIds: toggle(f.walletIds, id) }))}
        onClose={() => setSheet(null)}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Eliminar movimiento"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Screen>
  );
}
