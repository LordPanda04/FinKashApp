import { Pressable, View } from 'react-native';
import type { Currency } from '@/domain/money/money';
import type { IsoDate } from '@/lib/dates';
import { AppText } from '@/ui/AppText';
import { FlowLineChart } from '@/ui/charts/FlowLineChart';
import { GlassCard } from '@/ui/GlassCard';
import { colors } from '@/ui/tokens';
import { labelWithAmount, MoneyValue } from './MoneyValue';

/** "Flujo del mes": variación neta y curva del saldo con la línea de umbral. Tocar el título edita el umbral. */
export function FlowCard({
  netChangeMinor,
  currency,
  series,
  thresholdMinor,
  hidden,
  onOpenThreshold,
}: {
  netChangeMinor: number;
  currency: Currency;
  series: { date: IsoDate; balanceMinor: number }[];
  thresholdMinor: number | null;
  hidden: boolean;
  onOpenThreshold: () => void;
}) {
  const sign = netChangeMinor > 0 ? 'plus' : netChangeMinor < 0 ? 'minus' : undefined;
  return (
    <GlassCard style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Flujo del mes" onPress={onOpenThreshold} hitSlop={8}>
          <AppText variant="titleMd">Flujo del mes</AppText>
        </Pressable>
        <MoneyValue
          amountMinor={Math.abs(netChangeMinor)}
          currency={currency}
          hidden={hidden}
          sign={sign}
          color={netChangeMinor > 0 ? colors.primary : netChangeMinor < 0 ? colors.danger : colors.onSurface}
        />
      </View>
      <FlowLineChart
        series={series}
        thresholdMinor={thresholdMinor}
        thresholdLabel={thresholdMinor === null ? null : labelWithAmount('Límite: ', thresholdMinor, currency, hidden)}
      />
    </GlassCard>
  );
}
