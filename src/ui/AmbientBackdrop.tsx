import { View } from 'react-native';
import { colors } from './tokens';

const CIRCLES = {
  primary: [{ color: colors.primaryContainer, size: 320, top: -80, right: -100 }],
  plin: [
    { color: colors.plinContainer, size: 300, top: -60, left: -120 },
    { color: colors.primaryContainer, size: 260, top: 320, right: -120 },
  ],
  yape: [
    { color: colors.yapeContainer, size: 300, top: -40, right: -120 },
    { color: colors.primaryContainer, size: 240, top: 360, left: -120 },
  ],
} as const;

/** Fondo ambiental: círculos grandes translúcidos detrás del contenido (sin desenfoque en tiempo real). */
export function AmbientBackdrop({ tone }: { tone: keyof typeof CIRCLES }) {
  return (
    <View
      testID="ambient-backdrop"
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' }}
    >
      {CIRCLES[tone].map(({ color, size, ...position }, i) => (
        <View
          key={i}
          testID="ambient-circle"
          style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, ...position }}
        />
      ))}
    </View>
  );
}
