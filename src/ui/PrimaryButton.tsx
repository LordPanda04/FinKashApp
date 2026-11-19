import { ActivityIndicator, Pressable } from 'react-native';
import { AppText } from './AppText';
import { colors, radii, shadows } from './tokens';

/** CTA de ancho completo. Con `disabled` o `loading` no dispara `onPress` (evita el doble toque). */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      style={{
        height: 52,
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        backgroundColor: colors.primary,
        opacity: blocked ? 0.6 : 1,
        boxShadow: shadows.fab,
      }}
    >
      {loading ? <ActivityIndicator color={colors.onPrimary} /> : null}
      <AppText variant="titleMd" color={colors.onPrimary}>
        {label}
      </AppText>
    </Pressable>
  );
}
