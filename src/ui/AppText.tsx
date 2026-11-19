import { createContext, useContext, type ReactNode } from 'react';
import { Text, type TextProps } from 'react-native';
import { colors, fontFamilyFor, typography, type TextVariant } from './tokens';

/** Indica si Inter cargó; si no, el texto usa la fuente del sistema. */
export const FontStatusContext = createContext<{ interLoaded: boolean }>({ interLoaded: true });

export function AppText({
  variant = 'bodyMd',
  color = colors.onSurface,
  tabular = false,
  style,
  children,
  ...rest
}: TextProps & { variant?: TextVariant; color?: string; tabular?: boolean; children?: ReactNode }) {
  const { interLoaded } = useContext(FontStatusContext);
  const base = typography[variant];
  const fontFamily = fontFamilyFor(base.fontWeight, interLoaded);
  return (
    <Text
      {...rest}
      style={[
        { ...base, color },
        fontFamily ? { fontFamily } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
