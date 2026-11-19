import { useRef, useState } from 'react';
import { useRepositories } from '@/data/RepositoriesContext';
import type { CategoryRecord } from '@/data/types';
import { AppText } from '@/ui/AppText';
import { BottomSheet } from '@/ui/BottomSheet';
import type { IconName } from '@/ui/Icon';
import { IconPicker } from '@/ui/IconPicker';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/ui/palette';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { SwatchPicker } from '@/ui/SwatchPicker';
import { TextField } from '@/ui/TextField';
import { colors } from '@/ui/tokens';

/** Hoja para crear (`category` null) o editar una categoría. Se monta solo al abrirla, así su estado siempre parte limpio. */
export function CategoryForm({ category, onClose }: { category: CategoryRecord | null; onClose: () => void }) {
  const { categories } = useRepositories();
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]!);
  const [icon, setIcon] = useState<IconName>((category?.icon as IconName | undefined) ?? 'category');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false); // evita el doble toque aunque el estado aún no se haya repintado

  async function save() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const result = category
        ? await categories.update(category.id, { name, color, icon })
        : await categories.create({ name, color, icon });
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
    <BottomSheet visible title={category ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose}>
      <TextField label="Nombre" value={name} onChangeText={setName} error={error} />
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
