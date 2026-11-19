import { AppText } from './AppText';
import { GlassCard } from './GlassCard';
import { colors } from './tokens';

/** Tarjeta de estado vacío provisional de los esqueletos de pantalla (Fase 6). */
export function EmptyState({ message }: { message: string }) {
  return (
    <GlassCard>
      <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
        {message}
      </AppText>
    </GlassCard>
  );
}
