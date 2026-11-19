import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Currency } from '@/domain/money/money';
import { AppText } from '@/ui/AppText';
import { DonutChart } from '@/ui/charts/DonutChart';
import { GlassCard } from '@/ui/GlassCard';
import { colors, radii, withAlpha } from '@/ui/tokens';
import { MoneyValue } from './MoneyValue';
import { maskAmount, type DonutData } from './presenter';
import { formatMoney } from '@/domain/money/money';

/** "Gastos del mes": dona por categoría y leyenda; tocar una fila resalta su segmento. */
export function ExpensesCard({
  monthLabel,
  currency,
  data,
  hidden,
}: {
  monthLabel: string;
  currency: Currency;
  data: DonutData;
  hidden: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(data.slices[0]?.categoryId ?? null);
  const effective = data.slices.some((s) => s.categoryId === selected) ? selected : (data.slices[0]?.categoryId ?? null);
  const chartSlices = data.slices.map((s) => ({ key: s.categoryId, name: s.name, color: s.color, totalMinor: s.totalMinor }));

  return (
    <GlassCard style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="titleMd">Gastos del mes</AppText>
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: colors.surfaceSubtle }}>
          <AppText variant="labelMd" color={colors.onSurfaceMuted}>
            {monthLabel}
          </AppText>
        </View>
      </View>

      <DonutChart
        slices={chartSlices}
        selectedKey={effective}
        centerLabel="Total gastado"
        centerValue={maskAmount(formatMoney(data.totalMinor, currency), hidden)}
        accessibilityLabel={hidden ? 'Gastos del mes: monto oculto' : `Gastos del mes: ${formatMoney(data.totalMinor, currency)}`}
      />

      <View style={{ gap: 4 }}>
        {data.slices.map((s) => {
          const active = s.categoryId === effective;
          return (
            <Pressable
              key={s.categoryId}
              accessibilityRole="button"
              accessibilityLabel={hidden ? s.name : `${s.name} ${formatMoney(s.totalMinor, currency)}`}
              onPress={() => setSelected(s.categoryId)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radii.row, backgroundColor: active ? withAlpha(s.color, 0.1) : 'transparent' }}
            >
              <View style={{ width: 10, height: 10, borderRadius: radii.pill, backgroundColor: s.color }} />
              <AppText variant="bodyMd" style={{ flex: 1 }}>
                {s.name}
              </AppText>
              <MoneyValue amountMinor={s.totalMinor} currency={currency} hidden={hidden} variant="labelLg" />
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}
