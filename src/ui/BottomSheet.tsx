import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { AppText } from './AppText';
import { colors, radii } from './tokens';

/** Hoja inferior de vidrio sobre un fondo atenuado. Tocar el fondo la cierra. */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable testID="sheet-backdrop" accessibilityLabel="Cerrar" onPress={onClose} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(29,29,31,0.35)' }} />
        <View
          style={{
            maxHeight: '88%',
            backgroundColor: colors.background,
            borderTopLeftRadius: radii.card,
            borderTopRightRadius: radii.card,
            paddingTop: 20,
          }}
        >
          <AppText variant="headlineMd" style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            {title}
          </AppText>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
