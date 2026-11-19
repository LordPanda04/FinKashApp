import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRepositories } from '@/data/RepositoriesContext';
import type { CategoryRecord } from '@/data/types';
import { useQuery } from '@/data/useQuery';
import { AppText } from '@/ui/AppText';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { GroupedList } from '@/ui/GroupedList';
import { HeaderIconButton } from '@/ui/HeaderIconButton';
import { Icon, type IconName } from '@/ui/Icon';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/tokens';
import { CategoryForm } from './CategoryForm';
import { deleteMessage, describeCategory } from './presenter';

export function CategoriasScreen() {
  const repos = useRepositories();
  const { data: categories, error } = useQuery((r) => r.categories.list());
  const [form, setForm] = useState<{ category: CategoryRecord | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ category: CategoryRecord; count: number } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function askDelete(category: CategoryRecord) {
    const count = (await repos.movements.list({ categoryId: category.id })).length;
    setPendingDelete({ category, count });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { category } = pendingDelete;
    setPendingDelete(null);
    const result = await repos.categories.remove(category.id);
    setDeleteError(result.ok ? null : result.error.message);
  }

  return (
    <Screen backdrop="plin">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="headlineLg" color={colors.onBackground} accessibilityRole="header">
          Categorías
        </AppText>
        <HeaderIconButton icon="add" label="Agregar categoría" onPress={() => setForm({ category: null })} />
      </View>

      {error ? <AppText color={colors.danger}>No se pudieron leer las categorías.</AppText> : null}
      {deleteError ? <AppText color={colors.danger}>{deleteError}</AppText> : null}

      <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
        <GroupedList>
          {(categories ?? []).map((category) => {
            const d = describeCategory(category);
            return (
              <ListRow
                key={category.id}
                icon={category.icon as IconName}
                iconColor={category.color}
                title={d.title}
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppText variant="labelMd" color={d.kindColor}>
                      {d.kindLabel}
                    </AppText>
                    <RowAction icon="edit" label={`Editar ${d.title} (${d.kindLabel})`} onPress={() => setForm({ category })} />
                    {d.canDelete ? (
                      <RowAction icon="delete" label={`Eliminar ${d.title} (${d.kindLabel})`} onPress={() => askDelete(category)} />
                    ) : null}
                  </View>
                }
              />
            );
          })}
        </GroupedList>
      </ScrollView>

      {form ? <CategoryForm category={form.category} onClose={() => setForm(null)} /> : null}
      <ConfirmDialog
        visible={pendingDelete !== null}
        title={pendingDelete ? `Eliminar «${pendingDelete.category.name}»` : ''}
        message={pendingDelete ? deleteMessage(pendingDelete.category.name, pendingDelete.count) : ''}
        confirmLabel="Eliminar"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Screen>
  );
}

function RowAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={{ padding: 6 }}>
      <Icon name={icon} size={18} color={colors.onSurfaceMuted} />
    </Pressable>
  );
}
