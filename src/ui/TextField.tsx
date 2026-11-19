import { TextInput, View } from 'react-native';
import { AppText } from './AppText';
import { colors, radii, spacing, typography } from './tokens';

/** Campo de texto con etiqueta, prefijo opcional (p. ej. "S/") y mensaje de error. */
export function TextField({
  label,
  value,
  onChangeText,
  error,
  keyboardType = 'default',
  prefix,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  keyboardType?: 'default' | 'decimal-pad';
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="labelMd" color={colors.onSurfaceMuted}>
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: spacing.rowX,
          height: 48,
          borderRadius: radii.row,
          backgroundColor: colors.surfaceSolid,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.outlineSubtle,
        }}
      >
        {prefix ? (
          <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceMuted}
          style={{ flex: 1, color: colors.onSurface, fontSize: typography.bodyMd.fontSize }}
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
