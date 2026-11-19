import { Pressable } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors, radii, shadows } from './tokens';

/** Botón de ícono de 40 px con vidrio (editar, agregar…). */
export function HeaderIconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outline,
        boxShadow: shadows.glassSm,
      }}
    >
      <Icon name={icon} size={20} color={colors.onSurface} />
    </Pressable>
  );
}
