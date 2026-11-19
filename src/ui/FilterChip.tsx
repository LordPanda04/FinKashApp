import { Pressable } from 'react-native';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { colors, radii } from './tokens';

/** Píldora de filtro con chevron; activa en `primaryContainer`. */
export function FilterChip({ label, active = false, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 14,
        height: 36,
        borderRadius: radii.pill,
        backgroundColor: active ? colors.primaryContainer : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.outline,
      }}
    >
      <AppText variant="labelMd" color={active ? colors.onPrimaryContainer : colors.onSurface}>
        {label}
      </AppText>
      <Icon name="expand_more" size={16} color={active ? colors.onPrimaryContainer : colors.onSurfaceMuted} />
    </Pressable>
  );
}
