import { useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { AppText } from '@/ui/AppText';
import { BottomSheet } from '@/ui/BottomSheet';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { TextField } from '@/ui/TextField';
import { colors } from '@/ui/tokens';

/**
 * Hoja del nombre para el saludo de Inicio (D50). En `welcome` (primer arranque) pregunta el nombre y
 * permite omitirlo; tocar fuera equivale a omitir. En `edit` permite cambiarlo o vaciarlo.
 */
export function NameSheet({
  visible,
  mode,
  initialName,
  onSave,
  onSkip,
  onClose,
}: {
  visible: boolean;
  mode: 'welcome' | 'edit';
  initialName: string;
  /** Recibe el nombre recortado; devuelve un mensaje de error o `null` si se guardó. */
  onSave: (name: string) => Promise<string | null>;
  /** Solo en `welcome`: el usuario eligió omitir. */
  onSkip?: () => void;
  /** Se llama tras guardar con éxito y, en `edit`, al tocar fuera de la hoja. */
  onClose: () => void;
}) {
  const [text, setText] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const welcome = mode === 'welcome';

  async function save() {
    if (busy.current) return;
    const name = text.trim();
    if (welcome && name === '') {
      setError('Escribe tu nombre u omite este paso.');
      return;
    }
    busy.current = true;
    setSaving(true);
    try {
      const message = await onSave(name);
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

  return (
    <BottomSheet visible={visible} title={welcome ? '¿Cómo te llamas?' : 'Tu nombre'} onClose={welcome ? (onSkip ?? onClose) : onClose}>
      {welcome ? (
        <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
          Lo usaremos para saludarte en Inicio. Puedes cambiarlo después tocando el saludo.
        </AppText>
      ) : null}
      <TextField
        label="Nombre"
        value={text}
        onChangeText={(t) => {
          setText(t);
          setError(null);
        }}
        error={error}
      />
      <PrimaryButton label={welcome ? 'Continuar' : 'Guardar'} onPress={save} loading={saving} />
      {welcome ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Omitir" onPress={onSkip} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <AppText variant="labelLg" color={colors.onSurfaceMuted}>
            Omitir
          </AppText>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}
