import { useRef, useState } from 'react';
import { useRepositories } from '@/data/RepositoriesContext';
import { CURRENCY_SYMBOL, parseAmountInput } from '@/domain/money/money';
import { AppText } from '@/ui/AppText';
import { BottomSheet } from '@/ui/BottomSheet';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { TextField } from '@/ui/TextField';
import { colors } from '@/ui/tokens';

/**
 * Hoja "Habilitar cuenta en dólares" (D52): desde el detalle de una billetera ya creada, agrega su
 * cuenta en `USD` con un saldo inicial opcional. Se monta solo al abrirla.
 */
export function EnableUsdForm({ walletId, onClose }: { walletId: string; onClose: () => void }) {
  const { wallets } = useRepositories();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  async function save() {
    if (busy.current) return;
    const trimmed = text.trim();
    let openingMinor: number | undefined;
    if (trimmed !== '') {
      const parsed = parseAmountInput(trimmed);
      if (!parsed.ok) {
        setError(parsed.error.message);
        return;
      }
      openingMinor = parsed.value;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await wallets.addAccount({ walletId, currency: 'USD', ...(openingMinor === undefined ? {} : { openingMinor }) });
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
    <BottomSheet visible title="Habilitar cuenta en dólares" onClose={onClose}>
      <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
        La billetera tendrá una cuenta en dólares además de la de soles. El saldo inicial es opcional.
      </AppText>
      <TextField
        label="Saldo inicial (USD)"
        prefix={CURRENCY_SYMBOL.USD}
        keyboardType="decimal-pad"
        placeholder="0.00"
        value={text}
        onChangeText={(t) => {
          setText(t);
          setError(null);
        }}
        error={error}
      />
      <PrimaryButton label="Habilitar" onPress={save} loading={saving} />
    </BottomSheet>
  );
}
