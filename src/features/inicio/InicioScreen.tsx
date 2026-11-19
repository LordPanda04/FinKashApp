import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRepositories } from '@/data/RepositoriesContext';
import { useQuery } from '@/data/useQuery';
import { parseAmountInput, type Currency } from '@/domain/money/money';
import { todayInLima, type IsoDate } from '@/lib/dates';
import { AppText } from '@/ui/AppText';
import { GlassCard } from '@/ui/GlassCard';
import { NoticeCard } from '@/ui/NoticeCard';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { colors } from '@/ui/tokens';
import { ExpensesCard } from './ExpensesCard';
import { FlowCard } from './FlowCard';
import { buildHomeView } from './presenter';
import { ScopeSheet } from './ScopeSheet';
import { SummaryCard } from './SummaryCard';
import { ThresholdSheet } from './ThresholdSheet';

/** Pestaña Inicio: saludo, resumen de saldos, "Gastos del mes" y "Flujo del mes" (`DESIGN_SYSTEM.md` §6.1 y §10.1). */
export function InicioScreen({ today: todayProp }: { today?: IsoDate }) {
  const router = useRouter();
  const { settings, wallets: walletsRepo } = useRepositories();
  const today = todayProp ?? todayInLima(new Date());
  const [scopeOpen, setScopeOpen] = useState(false);
  const [thresholdOpen, setThresholdOpen] = useState(false);
  const [chartCurrency, setChartCurrency] = useState<Currency>('PEN');

  const { data, error } = useQuery(async (r) => ({
    state: await r.ledger.state(),
    wallets: await r.wallets.listWallets(),
    cards: await r.wallets.listCards(),
    categories: await r.categories.list(),
    period: await r.periods.activeRange(),
    device: await r.settings.getDevice(),
    thresholds: await r.settings.listThresholds(),
  }));

  const greeting = (
    <AppText variant="headlineLg" color={colors.onBackground}>
      Hola!
    </AppText>
  );

  if (error && !data) {
    return (
      <Screen backdrop="primary">
        {greeting}
        <AppText variant="bodyMd" color={colors.danger}>
          No se pudo leer tu información.
        </AppText>
      </Screen>
    );
  }
  if (!data) return <Screen backdrop="primary">{greeting}</Screen>;

  const { device } = data;
  // Un alcance guardado que ya no existe vuelve a Saldo general.
  const scope = data.wallets.some((w) => w.id === device.homeScope) ? device.homeScope : 'general';
  const view = buildHomeView({ ...data, today, scope });
  const currency: Currency = view.currencies.includes(chartCurrency) ? chartCurrency : (view.currencies[0] ?? 'PEN');
  const thresholdMinor = view.blocks[currency]?.thresholdMinor ?? null;

  async function saveThreshold(text: string): Promise<string | null> {
    const amount = parseAmountInput(text);
    if (!amount.ok) return amount.error.message;
    const result = await settings.setThreshold({ currency, amountMinor: amount.value, ...(scope === 'general' ? {} : { walletId: scope }) });
    return result.ok ? null : result.error.message;
  }

  return (
    <Screen backdrop="primary">
      <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {greeting}

        {data.wallets.length === 0 ? (
          <GlassCard style={{ gap: 12 }}>
            <AppText variant="titleMd">Crea tu primera billetera</AppText>
            <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
              Con una billetera podrás registrar movimientos y ver tu resumen aquí.
            </AppText>
            <PrimaryButton label="Crear billetera" onPress={() => router.push('/billeteras' as Href)} />
          </GlassCard>
        ) : view.empty ? (
          <View style={{ gap: 12 }}>
            <NoticeCard tone="info" title="Sin billeteras en el resumen" message="Ninguna billetera está incluida en el Saldo general." />
            <PrimaryButton label="Elegir billeteras" onPress={() => setScopeOpen(true)} />
          </View>
        ) : (
          <>
            <SummaryCard
              view={view}
              hidden={device.hideAmounts}
              onToggleHidden={() => settings.setDevice({ hideAmounts: !device.hideAmounts })}
              projectionOn={device.showProjection}
              onToggleProjection={(value) => settings.setDevice({ showProjection: value })}
              onOpenScope={() => setScopeOpen(true)}
            />

            {view.currencies.length > 1 ? (
              <SegmentedControl
                options={view.currencies.map((c) => ({ value: c, label: c === 'PEN' ? 'S/' : '$' }))}
                value={currency}
                onChange={setChartCurrency}
              />
            ) : null}

            <ExpensesCard
              key={currency}
              monthLabel={view.monthLabel}
              currency={currency}
              data={view.donut[currency] ?? { totalMinor: 0, slices: [] }}
              hidden={device.hideAmounts}
            />
            <FlowCard
              netChangeMinor={view.flow[currency]?.netChangeMinor ?? 0}
              currency={currency}
              series={view.flow[currency]?.series ?? []}
              thresholdMinor={thresholdMinor}
              hidden={device.hideAmounts}
              onOpenThreshold={() => setThresholdOpen(true)}
            />
          </>
        )}
      </ScrollView>

      <ScopeSheet
        visible={scopeOpen}
        wallets={data.wallets}
        scope={scope}
        onSelect={(next) => settings.setDevice({ homeScope: next })}
        onToggleInclude={(id, include) => walletsRepo.setIncludeInGeneral(id, include)}
        onClose={() => setScopeOpen(false)}
      />
      {thresholdOpen ? (
        <ThresholdSheet
          visible
          currency={currency}
          currentMinor={thresholdMinor}
          scopeLabel={view.scopeLabel}
          onSave={saveThreshold}
          onClear={() => settings.clearThreshold(currency, scope === 'general' ? null : scope)}
          onClose={() => setThresholdOpen(false)}
        />
      ) : null}
    </Screen>
  );
}
