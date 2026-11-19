import { View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { radii, withAlpha } from './tokens';

/** Círculo con fondo del color al 10 % e ícono de 20 px del mismo color. */
export function IconCircle({ icon, color, size = 40 }: { icon: IconName; color: string; size?: 36 | 40 }) {
  return (
    <View
      testID="icon-circle"
      style={{
        width: size,
        height: size,
        borderRadius: radii.pill,
        backgroundColor: withAlpha(color, 0.1),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={20} color={color} />
    </View>
  );
}
