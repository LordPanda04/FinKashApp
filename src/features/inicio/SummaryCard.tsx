import { View } from 'react-native';
import type { Currency } from '@/domain/money/money';
import { AppText } from '@/ui/AppText';
import { FilterChip } from '@/ui/FilterChip';
import { GlassCard } from '@/ui/GlassCard';
import { HeaderIconButton } from '@/ui/HeaderIconButton';
import { Switch } from '@/ui/Switch';
import { colors } from '@/ui/tokens';
import { MoneyValue } from './MoneyValue';
import type { CurrencyBlock, HomeView } from './presenter';

type Field = 'availableMinor' | 'spentMinor' | 'remainingMinor';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
        {label}
      </AppText>
      <View style={{ alignItems: 'flex-end' }}>{children}</View>
    </View>
  );
}

/** Bloque de resumen (`DESIGN_SYSTEM.md` §10.1): alcance, ojo, disponible, gastado, restante y proyección. */
export function SummaryCard({
  view,
  hidden,
  onToggleHidden,
  projectionOn,
  onToggleProjection,
  onOpenScope,
}: {
  view: HomeView;
  hidden: boolean;
  onToggleHidden: () => void;
  projectionOn: boolean;
  onToggleProjection: (value: boolean) => void;
  onOpenScope: () => void;
}) {
  const blocks = view.currencies.map((c) => view.blocks[c]).filter((b): b is CurrencyBlock => b !== undefined);
  const canProject = blocks.some((b) => b.projectedMinor !== null);

  const lines = (field: Field) =>
    blocks.map((b) => (
      <MoneyValue
        key={b.currency}
        amountMinor={b[field]}
        currency={b.currency as Currency}
        hidden={hidden}
        color={field === 'remainingMinor' && b.belowThreshold ? colors.danger : colors.onSurface}
        variant={b.currency === blocks[0]!.currency ? 'headlineMd' : 'titleMd'}
      />
    ));

  return (
    <GlassCard style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <FilterChip label={view.scopeLabel} onPress={onOpenScope} />
        <HeaderIconButton icon={hidden ? 'visibility_off' : 'visibility'} label={hidden ? 'Mostrar montos' : 'Ocultar montos'} onPress={onToggleHidden} />
      </View>

      <Row label="Disponible">{lines('availableMinor')}</Row>
      <Row label="Gastado">{lines('spentMinor')}</Row>
      <Row label="Restante">{lines('remainingMinor')}</Row>

      {canProject ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
              Ver proyectado
            </AppText>
            <Switch label="Ver proyectado" value={projectionOn} onValueChange={onToggleProjection} />
          </View>
          {projectionOn ? (
            <Row label="Proyectado a fin de mes">
              {blocks.map((b) =>
                b.projectedMinor === null ? null : (
                  <MoneyValue
                    key={b.currency}
                    amountMinor={Math.abs(b.projectedMinor)}
                    currency={b.currency}
                    hidden={hidden}
                    sign={b.projectedMinor < 0 ? 'minus' : undefined}
                    color={b.projectedMinor < 0 ? colors.danger : colors.onSurface}
                  />
                ),
              )}
            </Row>
          ) : null}
        </>
      ) : null}
    </GlassCard>
  );
}
