import { TabTrigger } from 'expo-router/ui';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarButton } from './TabBarButton';
import { TabBarFab } from './TabBarFab';
import { colors, radii, shadows } from './tokens';
import { useKeyboardVisible } from './useKeyboardVisible';

/**
 * Píldora de vidrio flotante a 20 px del borde inferior (más el inset de seguridad), con 5 ítems
 * solo con íconos y el "+" al centro. Se oculta mientras el teclado está visible.
 * Debe renderizarse dentro de `Tabs` (`expo-router/ui`).
 */
export function TabBar() {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  if (keyboardVisible) return null;

  return (
    <View
      testID="tab-bar"
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 20 + insets.bottom,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: radii.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outline,
        boxShadow: shadows.glass,
      }}
    >
      <TabTrigger name="index" asChild>
        <TabBarButton icon="home" label="Inicio" />
      </TabTrigger>
      <TabTrigger name="historial" asChild>
        <TabBarButton icon="schedule" label="Historial" />
      </TabTrigger>
      <TabTrigger name="registrar" asChild>
        <TabBarFab />
      </TabTrigger>
      <TabTrigger name="billeteras" asChild>
        <TabBarButton icon="account_balance_wallet" label="Billeteras" />
      </TabTrigger>
      <TabTrigger name="categorias" asChild>
        <TabBarButton icon="grid_view" label="Categorías" />
      </TabTrigger>
    </View>
  );
}
