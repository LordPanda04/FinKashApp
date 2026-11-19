import { Pressable, View } from 'react-native';
import type { WalletRecord } from '@/data/types';
import { AppText } from '@/ui/AppText';
import { BottomSheet } from '@/ui/BottomSheet';
import { Icon } from '@/ui/Icon';
import { colors, radii } from '@/ui/tokens';
import type { Scope } from './presenter';

function Option({ role, label, selected, onPress, hint }: { role: 'radio' | 'checkbox'; label: string; selected: boolean; onPress: () => void; hint?: string }) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: role === 'radio' ? radii.pill : 6,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? colors.primary : 'transparent',
          borderWidth: selected ? 0 : 1.5,
          borderColor: colors.outlineSubtle,
        }}
      >
        {selected ? <Icon name="check" size={16} color={colors.onPrimary} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyMd">{hint ? label.replace(/^Solo /, '') : label}</AppText>
      </View>
    </Pressable>
  );
}

/**
 * Selector de alcance de Inicio: "Saldo general" (con una casilla por billetera para elegir cuáles suma)
 * o una sola billetera. Elegir un alcance cierra la hoja; las casillas no.
 */
export function ScopeSheet({
  visible,
  wallets,
  scope,
  onSelect,
  onToggleInclude,
  onClose,
}: {
  visible: boolean;
  wallets: WalletRecord[];
  scope: Scope;
  onSelect: (scope: Scope) => void;
  onToggleInclude: (walletId: string, include: boolean) => void;
  onClose: () => void;
}) {
  const choose = (next: Scope) => {
    onSelect(next);
    onClose();
  };
  return (
    <BottomSheet visible={visible} title="Alcance de Inicio" onClose={onClose}>
      <Option role="radio" label="Saldo general" selected={scope === 'general'} onPress={() => choose('general')} />
      <AppText variant="labelMd" color={colors.onSurfaceMuted}>
        Billeteras que suma el Saldo general
      </AppText>
      <View>
        {wallets.map((w) => (
          <Option key={`inc-${w.id}`} role="checkbox" label={w.name} selected={w.includeInGeneral} onPress={() => onToggleInclude(w.id, !w.includeInGeneral)} />
        ))}
      </View>
      <AppText variant="labelMd" color={colors.onSurfaceMuted}>
        Ver una sola billetera
      </AppText>
      <View>
        {wallets.map((w) => (
          <Option key={`one-${w.id}`} role="radio" label={`Solo ${w.name}`} hint={w.name} selected={scope === w.id} onPress={() => choose(w.id)} />
        ))}
      </View>
    </BottomSheet>
  );
}
