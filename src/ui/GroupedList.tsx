import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';
import { GlassCard } from './GlassCard';
import { colors } from './tokens';

/** `GlassCard` con filas separadas por líneas `outlineSubtle` (estilo Ajustes de iOS). */
export function GroupedList({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children);
  return (
    <GlassCard padding={0} style={{ overflow: 'hidden' }}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {row}
          {i < rows.length - 1 ? <View testID="row-separator" style={{ height: 1, backgroundColor: colors.outlineSubtle, marginLeft: 16 }} /> : null}
        </Fragment>
      ))}
    </GlassCard>
  );
}
