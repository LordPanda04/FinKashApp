import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRepositories } from '@/data/RepositoriesContext';
import { useQuery } from '@/data/useQuery';
import { accountBalance } from '@/domain/ledger/balances';
import { validatePeriodStart } from '@/domain/periods/periods';
import { AdjustForm } from '@/features/billeteras/AdjustForm';
import { CURRENCY_ORDER } from '@/features/billeteras/presenter';
import { todayInLima, type IsoDate } from '@/lib/dates';
import { AmountText } from '@/ui/AmountText';
import { AppText } from '@/ui/AppText';
import { Calendar } from '@/ui/Calendar';
import { GlassCard } from '@/ui/GlassCard';
import { GroupedList } from '@/ui/GroupedList';
import { HeaderIconButton } from '@/ui/HeaderIconButton';
import { IconCircle } from '@/ui/IconCircle';
import type { IconName } from '@/ui/Icon';
import { NoticeCard } from '@/ui/NoticeCard';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { Switch } from '@/ui/Switch';
import { colors, spacing } from '@/ui/tokens';
import { buildPeriodCheck, periodMonth } from './presenter';

/**
 * Confirmación del periodo del mes actual (`FINANCIAL_RULES.md` §10): elegir el día de inicio, revisar
 * el saldo de las billeteras visibles (corrigiéndolo con "Arreglo de billetera") y confirmar.
 */
export function PeriodoScreen({ today: todayProp }: { today?: IsoDate }) {
  const router = useRouter();
  const { periods } = useRepositories();
  const today = todayProp ?? todayInLima(new Date());
  const { month, monthLabel, defaultStart } = periodMonth(today);

  const [startsOnFirst, setStartsOnFirst] = useState(true);
  const [customStart, setCustomStart] = useState<IsoDate>(today);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const { data } = useQuery(async (r) => ({ state: await r.ledger.state(), wallets: await r.wallets.listWallets() }));
  const check = data ? buildPeriodCheck({ state: data.state, wallets: data.wallets, today }) : null;

  const startedOn = startsOnFirst ? defaultStart : customStart;
  const validation = validatePeriodStart(month, startedOn, today);
  const startError = validation.ok ? null : validation.error.message;
  const adjusting = check?.rows.find((row) => row.walletId === adjustingId) ?? null;

  async function confirm() {
    if (busy.current || !validation.ok) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await periods.confirm({ month, startedOn: validation.value });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <Screen backdrop="primary">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <HeaderIconButton icon="arrow_back" label="Volver" onPress={() => router.back()} />
        <AppText variant="headlineLg" color={colors.onBackground} accessibilityRole="header" style={{ flex: 1 }}>
          {`Iniciar periodo de ${monthLabel}`}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
          Revisa el saldo de tus billeteras. Si alguno no coincide con lo que tienes, corrígelo con el Arreglo de billetera antes de confirmar.
        </AppText>

        <GlassCard style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="titleMd">¿Empieza el día 1?</AppText>
              <AppText variant="labelMd" color={colors.onSurfaceMuted}>
                {`Inicio del periodo: ${startedOn}`}
              </AppText>
            </View>
            <Switch label="¿Empieza el día 1?" value={startsOnFirst} onValueChange={setStartsOnFirst} />
          </View>
          {startsOnFirst ? null : <Calendar value={customStart} initialMonth={today} onChange={setCustomStart} />}
          {startError ? (
            <AppText variant="labelMd" color={colors.danger}>
              {startError}
            </AppText>
          ) : null}
        </GlassCard>

        {check ? (
          check.rows.length === 0 ? (
            <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
              No tienes billeteras visibles.
            </AppText>
          ) : (
            <GroupedList>
              {check.rows.map((row) => (
                <View key={row.walletId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.rowX, paddingVertical: spacing.rowY }}>
                  <IconCircle icon={row.icon as IconName} color={row.color} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="titleMd">{row.name}</AppText>
                    {CURRENCY_ORDER.filter((c) => row.balances[c] !== undefined).map((c) => (
                      <AmountText key={c} amountMinor={row.balances[c]!} currency={c} />
                    ))}
                  </View>
                  {row.accounts.length > 0 ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Corregir ${row.name}`} onPress={() => setAdjustingId(row.walletId)} hitSlop={8}>
                      <AppText variant="labelLg" color={colors.primary}>
                        Corregir
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </GroupedList>
          )
        ) : null}

        {error ? <NoticeCard title="No se pudo confirmar el periodo" message={error} /> : null}
        <PrimaryButton label="Confirmar periodo" onPress={confirm} loading={saving} disabled={!validation.ok} />
      </ScrollView>

      {adjusting && data ? (
        <AdjustForm
          accounts={adjusting.accounts}
          balanceOf={(id) => accountBalance(id, data.state.movements)}
          onClose={() => setAdjustingId(null)}
        />
      ) : null}
    </Screen>
  );
}
