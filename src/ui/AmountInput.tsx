import { TextInput, View } from 'react-native';
import { AppText } from './AppText';
import { colors, typography } from './tokens';

/** Monto grande: prefijo ("S/" o "$") en gris y cifra en `displayLg` centrada, con teclado decimal. */
export function AmountInput({
  prefix,
  value,
  onChangeText,
  error,
}: {
  prefix: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string | null;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <AppText variant="headlineMd" color={colors.onSurfaceMuted}>
          {prefix}
        </AppText>
        <TextInput
          accessibilityLabel="Monto"
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.onSurfaceMuted}
          style={{
            minWidth: 120,
            textAlign: 'center',
            color: colors.onSurface,
            fontSize: typography.displayLg.fontSize,
            fontVariant: ['tabular-nums'],
          }}
        />
      </View>
      {error ? (
        <AppText variant="labelMd" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
