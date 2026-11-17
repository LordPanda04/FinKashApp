import { firstDayOfMonth, monthOf, todayInLima, type IsoDate } from '@/lib/dates';
import type { DateRange } from '@/domain/reports/home';

export interface FinancialPeriod {
  id: string;
  /** Mes sugerido, `YYYY-MM`. */
  month: string;
  /** Día de inicio al confirmar (por defecto, el día 1 del mes). */
  startedOn: IsoDate | null;
  /** Marca de tiempo ISO (UTC) de la confirmación; null si no se confirmó. */
  confirmedAt: string | null;
  /** Marca de tiempo ISO (UTC) del último descarte de la sugerencia. */
  dismissedAt: string | null;
}

const startOf = (p: FinancialPeriod): IsoDate => p.startedOn ?? `${p.month}-01`;

/**
 * ¿Mostrar la sugerencia "Iniciar nuevo periodo"? Aparece si no hay un periodo confirmado para el
 * mes de `today`. Si se descartó, vuelve a aparecer al día siguiente (el día se mide en Lima).
 */
export function shouldSuggestNewPeriod(periods: FinancialPeriod[], today: IsoDate): boolean {
  const thisMonth = periods.filter((p) => p.month === monthOf(today));
  if (thisMonth.some((p) => p.confirmedAt !== null)) return false;
  return !thisMonth.some(
    (p) => p.dismissedAt !== null && todayInLima(new Date(p.dismissedAt)) >= today,
  );
}

/**
 * Periodo activo: desde el inicio del último periodo confirmado (con inicio hasta hoy) hasta hoy.
 * Nunca reinicia ni borra datos. Sin periodos confirmados (primer uso): del día 1 del mes actual a hoy.
 */
export function activePeriodRange(periods: FinancialPeriod[], today: IsoDate): DateRange {
  const starts = periods
    .filter((p) => p.confirmedAt !== null)
    .map(startOf)
    .filter((start) => start <= today)
    .sort();
  return { start: starts[starts.length - 1] ?? firstDayOfMonth(today), end: today };
}
