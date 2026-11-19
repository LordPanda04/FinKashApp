import { Pressable, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors, radii, withAlpha } from './tokens';

/** Selector de ícono: cuadrícula de íconos; el elegido se resalta con el color de la categoría. */
export function IconPicker({
  icons,
  value,
  color,
  onChange,
}: {
  icons: readonly IconName[];
  value: IconName;
  color: string;
  onChange: (icon: IconName) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {icons.map((name) => {
        const selected = name === value;
        return (
          <Pressable
            key={name}
            accessibilityRole="radio"
            accessibilityLabel={`Ícono ${name}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(name)}
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.row,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? withAlpha(color, 0.12) : colors.outlineSubtle,
              borderWidth: selected ? 2 : 0,
              borderColor: color,
            }}
          >
            <Icon name={name} size={22} color={selected ? color : colors.onSurfaceMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}
