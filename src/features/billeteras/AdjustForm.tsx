import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRepositories } from '@/data/RepositoriesContext';
import type { Account } from '@/domain/ledger/types';
import { CURRENCY_SYMBOL, parseBalanceInput, type Currency } from '@/domain/money/money';
import { AmountText } from '@/ui/AmountText';
import { AppText } from '@/ui/AppText';
import { BottomSheet } from '@/ui/BottomSheet';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { TextField } from '@/ui/TextField';
import { colors, radii } from '@/ui/tokens';
import { adjustPreview } from './adjust';

const CURRENCY_LABEL: Record<Currency, string> = { PEN: 'Soles (S/)', USD: 'Dólares ($)' };

/** Hoja de "Arreglo de billetera": saldo calculado, saldo real, diferencia y fecha (hoy). */
export function AdjustForm({
  accounts,
  balanceOf,
  onClose,
}: {
  accounts: Account[];
  balanceOf: (accountId: string) => number;
  onClose: () => void;
}) {
  const { movements } = useRepositories();
  const [accountId, setAccountId] = useState(accounts[0]!.id);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const account = accounts.find((a) => a.id === accountId)!;
  const current = balanceOf(accountId);
  const parsed = parseBalanceInput(text);
  const preview = parsed.ok ? adjustPreview(current, parsed.value) : null;

  async function save() {
    if (busy.current) return;
    const declared = parseBalanceInput(text);
    if (!declared.ok) {
      setError(declared.error.message);
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await movements.adjustWallet({ accountId, declaredMinor: declared.value });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onClose();
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible title="Arreglo de billetera" onClose={onClose}>
      {accounts.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {accounts.map((a) => {
            const selected = a.id === accountId;
            return (
              <Pressable
                key={a.id}
                accessibilityRole="radio"
                accessibilityLabel={CURRENCY_LABEL[a.currency]}
                accessibilityState={{ selected }}
                onPress={() => {
                  setAccountId(a.id);
                  setError(null);
                }}
                style={{ paddingHorizontal: 16, height: 40, borderRadius: radii.pill, justifyContent: 'center', backgroundColor: selected ? colors.primary : colors.surface }}
              >
                <AppText variant="labelLg" color={selected ? colors.onPrimary : colors.onSurface}>
                  {CURRENCY_LABEL[a.currency]}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={{ gap: 4 }}>
        <AppText variant="labelMd" color={colors.onSurfaceMuted}>
          Saldo calculado
        </AppText>
        <AmountText amountMinor={current} currency={account.currency} variant="headlineMd" />
      </View>

      <TextField
        label="Saldo real"
        prefix={CURRENCY_SYMBOL[account.currency]}
        keyboardType="decimal-pad"
        placeholder="0.00"
        value={text}
        onChangeText={(t) => {
          setText(t);
          setError(null);
        }}
        error={error}
      />

      <View style={{ gap: 4 }}>
        <AppText variant="labelMd" color={colors.onSurfaceMuted}>
          Diferencia
        </AppText>
        {preview === null ? (
          <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
            —
          </AppText>
        ) : preview.direction === 'none' ? (
          <AppText variant="bodyMd">Sin diferencia</AppText>
        ) : (
          <AmountText amountMinor={Math.abs(preview.differenceMinor)} currency={account.currency} sign={preview.direction === 'up' ? 'plus' : 'minus'} />
        )}
      </View>

      <AppText variant="labelMd" color={colors.onSurfaceMuted}>
        Fecha: hoy
      </AppText>
      <PrimaryButton label="Guardar" onPress={save} loading={saving} />
    </BottomSheet>
  );
}
