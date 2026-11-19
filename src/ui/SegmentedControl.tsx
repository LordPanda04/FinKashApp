import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { colors, radii } from './tokens';

/** Píldora de vidrio con varias opciones; la activa va en `primary` con texto blanco. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', padding: 4, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primary : 'transparent' }}
          >
            <AppText variant="labelLg" color={selected ? colors.onPrimary : colors.onSurface}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
