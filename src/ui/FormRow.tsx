import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { IconCircle } from './IconCircle';
import { colors, spacing } from './tokens';

/** Fila de formulario: círculo de ícono, etiqueta, valor y chevron (si es tocable). */
export function FormRow({
  icon,
  label,
  value,
  onPress,
  right,
  iconColor = colors.primary,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  iconColor?: string;
}) {
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.rowX, paddingVertical: spacing.rowY }}>
      <IconCircle icon={icon} color={iconColor} size={36} />
      <AppText variant="bodyMd" style={{ flex: 1 }}>
        {label}
      </AppText>
      {value ? (
        <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
          {value}
        </AppText>
      ) : null}
      {right}
      {onPress ? <Icon name="chevron_right" size={20} color={colors.onSurfaceMuted} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {content}
    </Pressable>
  );
}
