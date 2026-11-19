import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { BottomSheet } from '@/ui/BottomSheet';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { TextField } from '@/ui/TextField';
import { colors, radii } from '@/ui/tokens';
import type { NewDebt } from './presenter';

const TYPES: { value: NewDebt['counterpartyType']; label: string }[] = [
  { value: 'person', label: 'Persona' },
  { value: 'institution', label: 'Institución' },
];

/** Datos de una deuda nueva ("+ Nueva deuda"); se crea junto con el movimiento, en una sola operación. */
export function NewDebtSheet({ visible, onConfirm, onClose }: { visible: boolean; onConfirm: (debt: NewDebt) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<NewDebt['counterpartyType']>('person');
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (name.trim() === '') {
      setError('Escribe el nombre de la persona o institución.');
      return;
    }
    setError(null);
    onConfirm({ counterpartyName: name.trim(), counterpartyType: type });
    onClose();
  }

  return (
    <BottomSheet visible={visible} title="Nueva deuda" onClose={onClose}>
      <TextField
        label="Nombre"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(null);
        }}
        error={error}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {TYPES.map((t) => {
          const selected = t.value === type;
          return (
            <Pressable
              key={t.value}
              accessibilityRole="radio"
              accessibilityLabel={t.label}
              accessibilityState={{ selected }}
              onPress={() => setType(t.value)}
              style={{ flex: 1, height: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primary : colors.surface }}
            >
              <AppText variant="labelLg" color={selected ? colors.onPrimary : colors.onSurface}>
                {t.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton label="Usar esta deuda" onPress={confirm} />
    </BottomSheet>
  );
}
