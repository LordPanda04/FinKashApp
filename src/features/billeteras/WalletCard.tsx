import { Pressable, View } from 'react-native';
import type { WalletRecord } from '@/data/types';
import { AmountText } from '@/ui/AmountText';
import { AppText } from '@/ui/AppText';
import { GlassCard } from '@/ui/GlassCard';
import { Icon, type IconName } from '@/ui/Icon';
import { colors, radii, withAlpha } from '@/ui/tokens';
import { CURRENCY_ORDER, WALLET_TYPE_LABEL, type WalletBalances } from './presenter';

/** Tarjeta de billetera: ícono, tipo, nombre y un saldo por moneda en líneas separadas. */
export function WalletCard({ wallet, balances, onPress }: { wallet: WalletRecord; balances: WalletBalances; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Billetera ${wallet.name}`} onPress={onPress} style={{ flexBasis: '47%', flexGrow: 1 }}>
      <GlassCard padding={16} style={{ gap: 10, minHeight: 130 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 36, height: 36, borderRadius: radii.pill, backgroundColor: withAlpha(wallet.color, 0.12), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={wallet.icon as IconName} size={20} color={wallet.color} />
          </View>
          <AppText variant="labelSm" color={colors.onSurfaceMuted}>
            {WALLET_TYPE_LABEL[wallet.walletType]}
          </AppText>
        </View>
        <AppText variant="titleMd">{wallet.name}</AppText>
        <View style={{ gap: 2 }}>
          {CURRENCY_ORDER.filter((c) => balances[c] !== undefined).map((c) => (
            <AmountText key={c} amountMinor={balances[c]!} currency={c} variant="headlineMd" />
          ))}
        </View>
      </GlassCard>
    </Pressable>
  );
}

export function AddWalletCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Agregar billetera"
      onPress={onPress}
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        minHeight: 130,
        borderRadius: radii.card,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.outlineSubtle,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <Icon name="add_circle" size={28} color={colors.primary} />
      <AppText variant="labelLg" color={colors.onSurfaceMuted}>
        + Agregar billetera
      </AppText>
    </Pressable>
  );
}
