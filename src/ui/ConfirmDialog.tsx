import { Modal, Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { colors, radii } from './tokens';

/** Diálogo de confirmación con "Cancelar" y el botón de confirmar (en rojo si es destructivo). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(29,29,31,0.35)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: '100%', backgroundColor: colors.surfaceSolid, borderRadius: radii.card, padding: 20, gap: 8 }}>
          <AppText variant="titleMd">{title}</AppText>
          <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
            {message}
          </AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancelar" onPress={onCancel} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <AppText variant="labelLg">Cancelar</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={confirmLabel} onPress={onConfirm} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <AppText variant="labelLg" color={destructive ? colors.danger : colors.primary}>
                {confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
