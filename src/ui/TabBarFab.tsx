import type { TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable } from 'react-native';
import { Icon } from './Icon';
import { colors, radii, shadows } from './tokens';

/** Botón central "+" verde: sobresale 12 px de la barra y se encoge a 0.95 al presionar. */
export function TabBarFab({ isFocused, ref, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      ref={ref as never}
      accessibilityRole="tab"
      accessibilityLabel="Registrar movimiento"
      accessibilityState={{ selected: Boolean(isFocused) }}
      style={({ pressed }) => ({
        width: 56,
        height: 56,
        marginVertical: -12,
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        boxShadow: shadows.fab,
        transform: [{ scale: pressed ? 0.95 : 1 }],
      })}
    >
      <Icon name="add" size={28} color={colors.onPrimary} />
    </Pressable>
  );
}
