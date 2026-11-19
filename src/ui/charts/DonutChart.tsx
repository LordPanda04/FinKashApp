import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { AppText } from '../AppText';
import { colors } from '../tokens';
import { donutArcs } from './geometry';

const SIZE = 200;
const RADIUS = 76;
const STROKE = 24;
const STROKE_SELECTED = 28;

/**
 * Dona de gastos por categoría (anillo de radio 76 y grosor 24). El segmento seleccionado es más grueso y
 * se desplaza hacia afuera. El centro muestra un total ya formateado (el que decide si se oculta es el padre).
 */
export function DonutChart({
  slices,
  selectedKey,
  centerLabel,
  centerValue,
  accessibilityLabel,
}: {
  slices: { key: string; name: string; color: string; totalMinor: number }[];
  selectedKey: string | null;
  centerLabel: string;
  centerValue: string;
  accessibilityLabel?: string;
}) {
  const arcs = donutArcs(
    slices.map((s) => ({ key: s.key, value: s.totalMinor, color: s.color })),
    { radius: RADIUS, gapRadians: 0.04 },
  );

  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={{ width: SIZE, height: SIZE, alignSelf: 'center' }}>
      <Svg width={SIZE} height={SIZE} viewBox="-100 -100 200 200">
        {arcs.length === 0 ? (
          <Circle testID="donut-empty" cx={0} cy={0} r={RADIUS} stroke={colors.outlineSubtle} strokeWidth={STROKE} fill="none" />
        ) : (
          arcs.map((arc) => {
            const selected = arc.key === selectedKey;
            const mid = (arc.startAngle + arc.endAngle) / 2;
            const shift = selected ? 3 : 0;
            return (
              <G key={arc.key} transform={`translate(${(shift * Math.sin(mid)).toFixed(2)} ${(-shift * Math.cos(mid)).toFixed(2)})`}>
                <Path testID={`donut-arc-${arc.key}`} d={arc.path} stroke={arc.color} strokeWidth={selected ? STROKE_SELECTED : STROKE} fill="none" />
              </G>
            );
          })
        )}
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }}>
        {arcs.length === 0 ? (
          <AppText variant="labelLg" color={colors.onSurfaceMuted}>
            Sin gastos
          </AppText>
        ) : (
          <>
            <AppText variant="labelMd" color={colors.onSurfaceMuted}>
              {centerLabel}
            </AppText>
            <AppText variant="headlineMd" tabular>
              {centerValue}
            </AppText>
          </>
        )}
      </View>
    </View>
  );
}
