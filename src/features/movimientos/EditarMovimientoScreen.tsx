import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRepositories } from '@/data/RepositoriesContext';
import { useQuery } from '@/data/useQuery';
import { err } from '@/lib/result';
import { todayInLima, type IsoDate } from '@/lib/dates';
import { AppText } from '@/ui/AppText';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { HeaderIconButton } from '@/ui/HeaderIconButton';
import { NoticeCard } from '@/ui/NoticeCard';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/tokens';
import { MovementForm } from './MovementForm';
import { blockedNotice } from './presenter';
import { toFormValues } from './toFormValues';

/** Pantalla `/movimiento/[id]`: edita o elimina un gasto, ingreso o transferencia con la validación de saldo en el tiempo. */
export function EditarMovimientoScreen({ movementId, today: todayProp }: { movementId: string; today?: IsoDate }) {
  const router = useRouter();
  const { movements } = useRepositories();
  const today = todayProp ?? todayInLima(new Date());
  const { data: movement, loading } = useQuery((r) => r.movements.get(movementId), [movementId]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [problem, setProblem] = useState<{ title: string; message: string } | null>(null);

  async function remove() {
    setConfirmDelete(false);
    const result = await movements.remove(movementId);
    if (result.ok) {
      router.back();
      return;
    }
    const notice = blockedNotice(result.error);
    setProblem(notice ? { title: notice.title, message: notice.message } : { title: 'No se pudo eliminar', message: result.error.message });
  }

  const editable = movement && (movement.type === 'expense' || movement.type === 'income' || movement.type === 'transfer');

  return (
    <Screen backdrop="primary">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <HeaderIconButton icon="arrow_back" label="Volver" onPress={() => router.back()} />
        <AppText variant="headlineLg" color={colors.onBackground} accessibilityRole="header" style={{ flex: 1 }}>
          Editar movimiento
        </AppText>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
        {!loading && movement === null ? <AppText color={colors.danger}>El movimiento no existe.</AppText> : null}

        {movement && !editable ? (
          <NoticeCard
            tone="info"
            title="No se edita aquí"
            message={
              movement.type === 'opening' || movement.type === 'adjustment'
                ? 'Este movimiento se corrige con «Arreglo de billetera».'
                : 'Este tipo de movimiento no se puede editar aquí.'
            }
          />
        ) : null}

        {movement && editable ? (
          <>
            <MovementForm
              today={today}
              lockKind
              submitLabel="Guardar cambios"
              initial={toFormValues(movement, today)}
              onSave={(draft, newDebt) =>
                newDebt
                  ? Promise.resolve(err('DEBT_REQUIRED', 'Para editar, elige una deuda existente.'))
                  : movements.update(movementId, draft)
              }
              onSaved={() => router.back()}
            />
            {problem ? <NoticeCard title={problem.title} message={problem.message} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Eliminar movimiento"
              onPress={() => setConfirmDelete(true)}
              style={{ alignItems: 'center', paddingVertical: 12 }}
            >
              <AppText variant="labelLg" color={colors.danger}>
                Eliminar movimiento
              </AppText>
            </Pressable>
          </>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Eliminar movimiento"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}
