import { formatMoney, type Currency } from '@/domain/money/money';
import { AppText } from '@/ui/AppText';
import { colors, type TextVariant } from '@/ui/tokens';
import { maskAmount } from './presenter';

/** Monto de Inicio: con el ojo cerrado se ve `****` y el lector de pantalla dice "Monto oculto". */
export function MoneyValue({
  amountMinor,
  currency,
  hidden,
  sign,
  variant = 'titleMd',
  color = colors.onSurface,
}: {
  amountMinor: number;
  currency: Currency;
  hidden: boolean;
  sign?: 'plus' | 'minus';
  variant?: TextVariant;
  color?: string;
}) {
  const text = formatMoney(amountMinor, currency, sign ? { sign } : undefined);
  return (
    <AppText variant={variant} color={color} tabular accessibilityLabel={hidden ? 'Monto oculto' : text}>
      {maskAmount(text, hidden)}
    </AppText>
  );
}

/** Texto con un monto adentro ("Límite: S/ 300.00"): enmascara solo el monto. */
export function labelWithAmount(prefix: string, amountMinor: number, currency: Currency, hidden: boolean): string {
  return `${prefix}${maskAmount(formatMoney(amountMinor, currency), hidden)}`;
}
