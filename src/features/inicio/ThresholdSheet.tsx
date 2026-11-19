import { useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { CURRENCY_SYMBOL, type Currency } from '@/domain/money/money';
import { AppText } from '@/ui/AppText';
import { BottomSheet } from '@/ui/BottomSheet';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { TextField } from '@/ui/TextField';
import { colors } from '@/ui/tokens';

function toText(minor: number | null): string {
  return minor === null ? '' : `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
}

/** Umbral de aviso: solo una alerta visual cuando el restante baja de este monto; nunca bloquea gastos. */
export function ThresholdSheet({
  visible,
  currency,
  currentMinor,
  scopeLabel,
  onSave,
  onClear,
  onClose,
}: {
  visible: boolean;
  currency: Currency;
  currentMinor: number | null;
  scopeLabel: string;
  /** Devuelve un mensaje de error o `null` si se guardó. */
  onSave: (amountText: string) => Promise<string | null>;
  onClear: () => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState(toText(currentMinor));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  async function save() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const message = await onSave(text);
      if (message) {
        setError(message);
        return;
      }
      onClose();
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  async function clear() {
    await onClear();
    onClose();
  }

  return (
    <BottomSheet visible={visible} title="Umbral de aviso" onClose={onClose}>
      <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
        {`Te avisaremos cuando el saldo restante de ${scopeLabel} baje de este monto. Solo es una alerta: nunca bloquea gastos.`}
      </AppText>
      <TextField
        label="Monto mínimo"
        prefix={CURRENCY_SYMBOL[currency]}
        keyboardType="decimal-pad"
        placeholder="0.00"
        value={text}
        onChangeText={(t) => {
          setText(t);
          setError(null);
        }}
        error={error}
      />
      <PrimaryButton label="Guardar" onPress={save} loading={saving} />
      {currentMinor !== null ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Quitar umbral" onPress={clear} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <AppText variant="labelLg" color={colors.danger}>
            Quitar umbral
          </AppText>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}
