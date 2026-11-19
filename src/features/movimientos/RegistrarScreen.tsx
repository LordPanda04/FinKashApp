import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useRepositories } from '@/data/RepositoriesContext';
import { todayInLima, type IsoDate } from '@/lib/dates';
import { NoticeCard } from '@/ui/NoticeCard';
import { Screen } from '@/ui/Screen';
import { emptyValues, MovementForm } from './MovementForm';
import type { MovementKind } from './presenter';

/** Pestaña "Registrar movimiento": gasto, ingreso o transferencia. Lee `tipo` y `desde` de la ruta para precargar. */
export function RegistrarScreen({ today: todayProp }: { today?: IsoDate }) {
  const { movements } = useRepositories();
  const params = useLocalSearchParams<{ tipo?: string; desde?: string }>();
  const today = todayProp ?? todayInLima(new Date());
  const [resetKey, setResetKey] = useState(0);
  const [lastKind, setLastKind] = useState<MovementKind | null>(null);
  const [saved, setSaved] = useState(false);

  const kind: MovementKind = lastKind ?? (params.tipo === 'transferencia' ? 'transfer' : 'expense');
  const accountId = lastKind === null ? (params.desde ?? null) : null;

  return (
    <Screen title="Registrar movimiento" backdrop="primary">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
        {saved ? <NoticeCard tone="info" title="Movimiento guardado" message="Ya puedes verlo en el Historial." /> : null}
        <MovementForm
          key={resetKey}
          today={today}
          initial={emptyValues(today, kind, accountId)}
          onSave={(draft, newDebt) => (newDebt ? movements.createWithNewDebt(draft, newDebt) : movements.create(draft))}
          onEdit={() => setSaved(false)}
          onSaved={(k) => {
            setLastKind(k);
            setSaved(true);
            setResetKey((n) => n + 1);
          }}
        />
      </ScrollView>
    </Screen>
  );
}
