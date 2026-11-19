import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import type { IconName } from './Icon';
import { IconCircle } from './IconCircle';
import { colors, spacing } from './tokens';

/** Fila de lista: círculo de ícono, título, subtítulo y contenido a la derecha. Con `onPress` es un botón. */
export function ListRow({
  icon,
  iconColor = colors.primary,
  title,
  subtitle,
  right,
  onPress,
  testID,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  testID?: string;
}) {
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.rowX, paddingVertical: spacing.rowY }}>
      {icon ? <IconCircle icon={icon} color={iconColor} /> : null}
      <View style={{ flex: 1 }}>
        <AppText variant="titleMd">{title}</AppText>
        {subtitle ? (
          <AppText variant="labelMd" color={colors.onSurfaceMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) return <View testID={testID}>{content}</View>;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      {content}
    </Pressable>
  );
}
