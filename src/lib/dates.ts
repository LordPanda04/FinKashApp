/** Fecha de calendario `YYYY-MM-DD` (sin hora). */
export type IsoDate = string;

const MS_PER_DAY = 86_400_000;
/** Perú usa UTC−5 todo el año (sin horario de verano). */
const LIMA_OFFSET_MS = -5 * 3_600_000;

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

function parse(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function format(ms: number): IsoDate {
  const dt = new Date(ms);
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Fecha de "hoy" en Lima. Desplazamiento fijo, sin depender de `Intl` con zonas horarias. */
export function todayInLima(now: Date): IsoDate {
  return format(now.getTime() + LIMA_OFFSET_MS);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return format(parse(date) + days * MS_PER_DAY);
}

export function endOfMonth(date: IsoDate): IsoDate {
  const dt = new Date(parse(date));
  return format(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0));
}

/** Mes de la fecha en formato `YYYY-MM`. */
export function monthOf(date: IsoDate): string {
  return date.slice(0, 7);
}

export function firstDayOfMonth(date: IsoDate): IsoDate {
  return `${monthOf(date)}-01`;
}

/** Todos los días entre `from` y `to`, ambos inclusive. Vacío si `from > to`. */
export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let ms = parse(from); ms <= parse(to); ms += MS_PER_DAY) {
    days.push(format(ms));
  }
  return days;
}

const MONTH_ABBR_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

export const MONTH_NAMES_ES: readonly string[] = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Etiqueta de un día para el Historial: "Hoy", "Ayer", "14 Nov" o, de otro año, "14 Nov 2026". */
export function formatDayLabel(date: IsoDate, today: IsoDate): string {
  if (date === today) return 'Hoy';
  if (date === addDays(today, -1)) return 'Ayer';
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const base = `${d} ${MONTH_ABBR_ES[m - 1]}`;
  return date.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${y}`;
}

/** Primer y último día del mes de `date`. */
export function monthRange(date: IsoDate): { start: IsoDate; end: IsoDate } {
  return { start: firstDayOfMonth(date), end: endOfMonth(date) };
}

/** Suma meses conservando el día; si el mes destino es más corto, usa su último día. */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const target = Date.UTC(y, m - 1 + months, 1); // primer día del mes destino
  const first = format(target);
  const last = Number(endOfMonth(first).slice(8, 10));
  return `${first.slice(0, 8)}${pad(Math.min(d, last))}`;
}

/** Día de la semana con el lunes primero: 0 = lunes … 6 = domingo. */
export function weekdayMonFirst(date: IsoDate): number {
  return (new Date(parse(date)).getUTCDay() + 6) % 7;
}
