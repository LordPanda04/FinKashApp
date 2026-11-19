import { Pressable, View } from 'react-native';
import { AmountText } from '@/ui/AmountText';
import { AppText } from '@/ui/AppText';
import { Icon } from '@/ui/Icon';
import { IconCircle } from '@/ui/IconCircle';
import { colors, spacing } from '@/ui/tokens';
import { WalletBadge } from '@/ui/WalletBadge';
import type { RowView } from './presenter';

/** Fila del Historial: ícono de categoría, descripción, badge de billetera (sin hora) y monto con signo. */
export function MovementRow({
  row,
  editing,
  onEdit,
  onDelete,
}: {
  row: RowView;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.rowX, paddingVertical: spacing.rowY, opacity: row.muted ? 0.75 : 1 }}>
      <IconCircle icon={row.icon} color={row.iconColor} />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="titleMd">{row.title}</AppText>
        <WalletBadge label={row.badge} color={row.badgeColor} />
      </View>
      <AmountText amountMinor={row.amountMinor} currency={row.currency} sign={row.sign} />
      {editing ? (
        <View style={{ flexDirection: 'row' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${row.title}`} onPress={onEdit} hitSlop={6} style={{ padding: 6 }}>
            <Icon name="edit" size={18} color={colors.onSurfaceMuted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${row.title}`} onPress={onDelete} hitSlop={6} style={{ padding: 6 }}>
            <Icon name="delete" size={18} color={colors.danger} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
