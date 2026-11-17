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
