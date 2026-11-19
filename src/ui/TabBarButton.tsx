import type { TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors, radii } from './tokens';

/** Ítem de la barra: solo ícono (el texto va como etiqueta de accesibilidad). Activo: círculo verde claro. */
export function TabBarButton({
  icon,
  label,
  isFocused,
  ref,
  ...props
}: TabTriggerSlotProps & { icon: IconName; label: string }) {
  return (
    <Pressable
      {...props}
      ref={ref as never}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(isFocused) }}
      style={{
        width: 44,
        height: 44,
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isFocused ? colors.primaryContainer : 'transparent',
      }}
    >
      <Icon name={icon} color={isFocused ? colors.primary : colors.onSurfaceMuted} active={Boolean(isFocused)} />
    </Pressable>
  );
}
