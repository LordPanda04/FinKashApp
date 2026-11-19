import { Pressable, View } from 'react-native';
import { colors, radii } from './tokens';

/** Interruptor estilo iOS de 48 × 28 (encendido en `primary`, perilla blanca de 24). */
export function Switch({ value, onValueChange, label }: { value: boolean; onValueChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={{
        width: 48,
        height: 28,
        borderRadius: radii.pill,
        padding: 2,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
        backgroundColor: value ? colors.primary : colors.outlineSubtle,
      }}
    >
      <View style={{ width: 24, height: 24, borderRadius: radii.pill, backgroundColor: colors.surfaceSolid }} />
    </Pressable>
  );
}
