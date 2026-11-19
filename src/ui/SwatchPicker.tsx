import { Pressable, View } from 'react-native';
import { Icon } from './Icon';
import { colors, radii } from './tokens';

/** Selector de color: una muestra por color; la elegida lleva un check. */
export function SwatchPicker({
  colors: options,
  value,
  onChange,
}: {
  colors: readonly string[];
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {options.map((hex) => {
        const selected = hex === value;
        return (
          <Pressable
            key={hex}
            accessibilityRole="radio"
            accessibilityLabel={`Color ${hex}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(hex)}
            style={{
              width: 36,
              height: 36,
              borderRadius: radii.pill,
              backgroundColor: hex,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: selected ? 3 : 0,
              borderColor: colors.surfaceSolid,
              boxShadow: selected ? [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 2, color: hex }] : undefined,
            }}
          >
            {selected ? <Icon name="check" size={18} color={colors.onPrimary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
