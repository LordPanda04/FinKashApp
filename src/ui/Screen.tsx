import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AmbientBackdrop } from './AmbientBackdrop';
import { AppText } from './AppText';
import { colors, spacing } from './tokens';

/** Lienzo de pantalla: fondo claro, márgenes de Stitch (20 / 48 / 128) y título opcional. */
export function Screen({
  title,
  backdrop,
  children,
}: {
  title?: string;
  /** Tono del fondo ambiental (círculos translúcidos detrás del contenido). */
  backdrop?: 'primary' | 'plin' | 'yape';
  children: ReactNode;
}) {
  return (
    <View
      testID="screen"
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.screenX,
        paddingTop: spacing.screenTop,
        paddingBottom: spacing.screenBottom,
        gap: spacing.section,
      }}
    >
      {backdrop ? <AmbientBackdrop tone={backdrop} /> : null}
      {title ? (
        <AppText variant="headlineLg" color={colors.onBackground} accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}
