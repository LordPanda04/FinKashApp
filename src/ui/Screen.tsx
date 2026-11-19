import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from './tokens';

/** Lienzo de pantalla: fondo claro, márgenes de Stitch (20 / 48 / 128) y título opcional. */
export function Screen({ title, children }: { title?: string; children: ReactNode }) {
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
      {title ? (
        <AppText variant="headlineLg" color={colors.onBackground} accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}
