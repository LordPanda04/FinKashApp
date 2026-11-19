import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRepositories } from '@/data/RepositoriesContext';
import type { WalletRecord } from '@/data/types';
import { CURRENCY_SYMBOL, parseAmountInput, type Currency } from '@/domain/money/money';
import { AppText } from '@/ui/AppText';
import { BottomSheet } from '@/ui/BottomSheet';
import type { IconName } from '@/ui/Icon';
import { IconPicker } from '@/ui/IconPicker';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/ui/palette';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { SwatchPicker } from '@/ui/SwatchPicker';
import { TextField } from '@/ui/TextField';
import { colors, radii } from '@/ui/tokens';
import { CURRENCY_ORDER } from './presenter';

const TYPES: { value: WalletRecord['walletType']; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank', label: 'Banco' },
  { value: 'digital', label: 'Digital' },
  { value: 'other', label: 'Otra' },
];
const CURRENCY_LABEL: Record<Currency, string> = { PEN: 'Soles (S/)', USD: 'Dólares ($)' };

/** Hoja para crear una billetera con sus monedas y saldos iniciales opcionales. Se monta solo al abrirla. */
export function WalletForm({ onClose }: { onClose: () => void }) {
  const { wallets } = useRepositories();
  const [name, setName] = useState('');
  const [walletType, setWalletType] = useState<WalletRecord['walletType']>('cash');
  const [color, setColor] = useState(CATEGORY_COLORS[0]!);
  const [icon, setIcon] = useState<IconName>('payments');
  const [currencies, setCurrencies] = useState<Currency[]>(['PEN']);
  const [openingText, setOpeningText] = useState<Partial<Record<Currency, string>>>({});
  const [openingErrors, setOpeningErrors] = useState<Partial<Record<Currency, string>>>({});
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  function toggleCurrency(c: Currency) {
    setCurrencies((current) => {
      if (current.includes(c)) return current.length === 1 ? current : current.filter((x) => x !== c);
      return CURRENCY_ORDER.filter((x) => x === c || current.includes(x));
    });
  }

  async function save() {
    if (busy.current) return;
    const openings: Partial<Record<Currency, number>> = {};
    const errors: Partial<Record<Currency, string>> = {};
    for (const c of currencies) {
      const text = openingText[c]?.trim();
      if (!text) continue; // el saldo inicial es opcional
      const parsed = parseAmountInput(text);
      if (parsed.ok) openings[c] = parsed.value;
      else errors[c] = parsed.error.message;
    }
    setOpeningErrors(errors);
    if (Object.keys(errors).length > 0) return;

    busy.current = true;
    setSaving(true);
    setNameError(null);
    try {
      const result = await wallets.createWallet({ name, walletType, icon, color, currencies, openings });
      if (!result.ok) {
        setNameError(result.error.message);
        return;
      }
      onClose();
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible title="Nueva billetera" onClose={onClose}>
      <TextField label="Nombre" value={name} onChangeText={setName} error={nameError} />

      <AppText variant="labelMd" color={colors.onSurfaceMuted}>
        Tipo
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TYPES.map((t) => {
          const selected = t.value === walletType;
          return (
            <Pressable
              key={t.value}
              accessibilityRole="radio"
              accessibilityLabel={t.label}
              accessibilityState={{ selected }}
              onPress={() => setWalletType(t.value)}
              style={{ paddingHorizontal: 16, height: 40, borderRadius: radii.pill, justifyContent: 'center', backgroundColor: selected ? colors.primary : colors.surface }}
            >
              <AppText variant="labelLg" color={selected ? colors.onPrimary : colors.onSurface}>
                {t.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="labelMd" color={colors.onSurfaceMuted}>
        Monedas
      </AppText>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {CURRENCY_ORDER.map((c) => {
          const checked = currencies.includes(c);
          return (
            <Pressable
              key={c}
              accessibilityRole="checkbox"
              accessibilityLabel={CURRENCY_LABEL[c]}
              accessibilityState={{ checked }}
              onPress={() => toggleCurrency(c)}
              style={{ paddingHorizontal: 16, height: 40, borderRadius: radii.pill, justifyContent: 'center', backgroundColor: checked ? colors.primaryContainer : colors.surface, borderWidth: 1, borderColor: checked ? colors.primary : colors.outlineSubtle }}
            >
              <AppText variant="labelLg" color={checked ? colors.onPrimaryContainer : colors.onSurface}>
                {CURRENCY_LABEL[c]}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {currencies.map((c) => (
        <TextField
          key={c}
          label={`Saldo inicial (${c})`}
          prefix={CURRENCY_SYMBOL[c]}
          keyboardType="decimal-pad"
          placeholder="0.00"
          value={openingText[c] ?? ''}
          onChangeText={(t) => setOpeningText((cur) => ({ ...cur, [c]: t }))}
          error={openingErrors[c] ?? null}
        />
      ))}

      <AppText variant="labelMd" color={colors.onSurfaceMuted}>
        Color
      </AppText>
      <SwatchPicker colors={CATEGORY_COLORS} value={color} onChange={setColor} />
      <AppText variant="labelMd" color={colors.onSurfaceMuted}>
        Ícono
      </AppText>
      <IconPicker icons={CATEGORY_ICONS} value={icon} color={color} onChange={setIcon} />
      <PrimaryButton label="Guardar" onPress={save} loading={saving} />
    </BottomSheet>
  );
}
