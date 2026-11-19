import { SymbolView } from 'expo-symbols';
import regular from 'expo-symbols/androidWeights/regular';
import semiBold from 'expo-symbols/androidWeights/semiBold';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors } from './tokens';

/** Íconos de Material Symbols usados por el diseño (`DESIGN_SYSTEM.md` §5). */
export type IconName =
  | 'home' | 'schedule' | 'add' | 'account_balance_wallet' | 'grid_view' | 'restaurant'
  | 'directions_car' | 'payments' | 'bolt' | 'movie' | 'favorite' | 'edit' | 'delete'
  | 'expand_more' | 'category' | 'chevron_right' | 'notes' | 'calendar_today' | 'smartphone'
  | 'qr_code_2' | 'add_circle' | 'credit_card' | 'account_balance';

export function Icon({
  name,
  size = 24,
  color = colors.onSurface,
  active = false,
  style,
  testID,
}: {
  name: IconName;
  size?: number;
  color?: string;
  /** Ítem activo: mismo ícono con más peso (los Material Symbols de expo-symbols no tienen eje de relleno). */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <SymbolView
      name={{ android: name, web: name }}
      size={size}
      tintColor={color}
      weight={{ android: active ? semiBold : regular, ios: active ? 'semibold' : 'regular' }}
      style={style}
      testID={testID}
    />
  );
}
