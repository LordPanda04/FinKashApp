import { formatMoney, type Currency } from '@/domain/money/money';
import { AppText } from './AppText';
import { colors, type TextVariant } from './tokens';

const SIGN_COLOR = { minus: colors.danger, plus: colors.primary, none: colors.onSurface } as const;

/** Monto con formato del dominio (`S/ 1,840.00`). Gasto en rojo con "- ", ingreso en verde con "+ ". */
export function AmountText({
  amountMinor,
  currency,
  sign = 'none',
  variant = 'titleMd',
}: {
  amountMinor: number;
  currency: Currency;
  sign?: 'plus' | 'minus' | 'none';
  variant?: TextVariant;
}) {
  const text = formatMoney(amountMinor, currency, sign === 'none' ? undefined : { sign });
  return (
    <AppText variant={variant} color={SIGN_COLOR[sign]} tabular>
      {text}
    </AppText>
  );
}
