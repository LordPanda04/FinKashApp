import { View, type ViewProps } from 'react-native';
import { colors, radii, shadows, spacing } from './tokens';

/** Superficie de vidrio: blanco translúcido, borde de 1 px, radio 24 y sombra `glass` (sin desenfoque). */
export function GlassCard({ padding = spacing.cardPadding, style, ...rest }: ViewProps & { padding?: number }) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.outline,
          borderWidth: 1,
          borderRadius: radii.card,
          padding,
          boxShadow: shadows.glass,
        },
        style,
      ]}
    />
  );
}
