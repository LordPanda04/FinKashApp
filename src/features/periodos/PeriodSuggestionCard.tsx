import { useRef } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { GlassCard } from '@/ui/GlassCard';
import { Icon } from '@/ui/Icon';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { colors } from '@/ui/tokens';

/** Aviso de Inicio "Iniciar nuevo periodo" (`FINANCIAL_RULES.md` §10): iniciar ahora o descartar hasta mañana. */
export function PeriodSuggestionCard({
  monthLabel,
  onStart,
  onDismiss,
}: {
  monthLabel: string;
  onStart: () => void;
  onDismiss: () => void | Promise<void>;
}) {
  const busy = useRef(false);

  async function dismiss() {
    if (busy.current) return;
    busy.current = true;
    try {
      await onDismiss();
    } finally {
      busy.current = false;
    }
  }

  return (
    <GlassCard style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Icon name="calendar_today" size={24} color={colors.primary} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="titleMd">Iniciar nuevo periodo</AppText>
          <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
            {`Es ${monthLabel.toLowerCase()}. Revisa tus saldos y empieza el periodo.`}
          </AppText>
        </View>
      </View>
      <PrimaryButton label="Iniciar periodo" onPress={onStart} />
      <Pressable accessibilityRole="button" accessibilityLabel="Ahora no" onPress={dismiss} style={{ alignItems: 'center', paddingVertical: 8 }}>
        <AppText variant="labelLg" color={colors.onSurfaceMuted}>
          Ahora no
        </AppText>
      </Pressable>
    </GlassCard>
  );
}
