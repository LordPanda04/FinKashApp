import { View } from 'react-native';
import { AppText } from './AppText';
import { GlassCard } from './GlassCard';
import { Icon } from './Icon';
import { colors } from './tokens';

/** Aviso de vidrio con ícono, título y mensaje (p. ej. "Saldo insuficiente"). */
export function NoticeCard({ title, message, tone = 'danger' }: { title: string; message: string; tone?: 'danger' | 'info' }) {
  const color = tone === 'danger' ? colors.danger : colors.primary;
  return (
    <GlassCard accessible accessibilityRole="alert" padding={16} style={{ flexDirection: 'row', gap: 12 }}>
      <Icon name={tone === 'danger' ? 'error' : 'info'} size={24} color={color} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="titleMd" color={color}>
          {title}
        </AppText>
        <AppText variant="bodyMd">{message}</AppText>
      </View>
    </GlassCard>
  );
}
