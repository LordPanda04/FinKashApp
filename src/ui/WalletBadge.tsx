import { View } from 'react-native';
import { AppText } from './AppText';
import { colors, radii, withAlpha } from './tokens';

/** Etiqueta pequeña con el color de la billetera (neutra si no hay color). */
export function WalletBadge({ label, color }: { label: string; color?: string }) {
  const tone = color ?? colors.onSurfaceMuted;
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.badge, backgroundColor: color ? withAlpha(color, 0.1) : colors.outlineSubtle }}>
      <AppText variant="labelSm" color={tone}>
        {label}
      </AppText>
    </View>
  );
}
