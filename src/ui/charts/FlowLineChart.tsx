import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import type { IsoDate } from '@/lib/dates';
import { AppText } from '../AppText';
import { colors, radii } from '../tokens';
import { flowChartModel, type FlowLayout } from './geometry';

const HEIGHT = 140;
const PADDING = { top: 16, right: 12, bottom: 24, left: 12 };

/**
 * Curva del saldo diario con relleno degradado, 2 líneas de grilla, línea de umbral discontinua con su
 * etiqueta, punto del día actual y eje X. Sin cifras propias: la etiqueta del umbral llega ya formateada
 * (o enmascarada) desde el padre.
 */
export function FlowLineChart({
  series,
  thresholdMinor,
  thresholdLabel,
}: {
  series: { date: IsoDate; balanceMinor: number }[];
  thresholdMinor: number | null;
  thresholdLabel: string | null;
}) {
  const [width, setWidth] = useState(300);
  const layout: FlowLayout = { width, height: HEIGHT, padding: PADDING };
  const model = flowChartModel(series, thresholdMinor, layout);
  const base = HEIGHT - PADDING.bottom;

  if (series.length === 0) {
    return (
      <View style={{ height: HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
          Sin movimientos
        </AppText>
      </View>
    );
  }

  const gridY = [PADDING.top + (base - PADDING.top) / 3, PADDING.top + (2 * (base - PADDING.top)) / 3];
  return (
    <View onLayout={(e) => setWidth(Math.max(e.nativeEvent.layout.width, 1))} style={{ height: HEIGHT }}>
      <Svg width={width} height={HEIGHT}>
        <Defs>
          <LinearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.22} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {gridY.map((y, i) => (
          <Line key={i} testID="flow-grid" x1={PADDING.left} x2={width - PADDING.right} y1={y} y2={y} stroke={colors.outlineSubtle} strokeWidth={1} />
        ))}
        <Path testID="flow-area" d={model.areaPath} fill="url(#flowFill)" />
        {model.thresholdY !== null ? (
          <Line
            testID="flow-threshold"
            x1={PADDING.left}
            x2={width - PADDING.right}
            y1={model.thresholdY}
            y2={model.thresholdY}
            stroke={colors.danger}
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
        ) : null}
        <Path testID="flow-line" d={model.linePath} stroke={colors.primary} strokeWidth={3} fill="none" strokeLinecap="round" />
        {model.todayPoint ? (
          <Circle testID="flow-today" cx={model.todayPoint.x} cy={model.todayPoint.y} r={5} fill={colors.surfaceSolid} stroke={colors.primary} strokeWidth={3} />
        ) : null}
      </Svg>

      {model.thresholdY !== null && thresholdLabel ? (
        <View
          style={{
            position: 'absolute',
            right: PADDING.right,
            top: Math.max(model.thresholdY - 20, 0),
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: radii.pill,
            backgroundColor: colors.dangerContainer,
          }}
        >
          <AppText variant="labelSm" color={colors.danger}>
            {thresholdLabel}
          </AppText>
        </View>
      ) : null}

      {model.xTicks.map((tick) => (
        <AppText key={tick.x} variant="labelSm" color={colors.onSurfaceMuted} tabular style={{ position: 'absolute', top: base + 6, left: tick.x - 10, width: 20, textAlign: 'center' }}>
          {tick.label}
        </AppText>
      ))}
    </View>
  );
}
