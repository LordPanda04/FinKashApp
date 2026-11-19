/**
 * Geometría pura de los gráficos de Inicio (sin React ni SVG): arcos de la dona, curva suave y escalas.
 * Los componentes de `react-native-svg` solo dibujan lo que calcula este archivo.
 */
import type { IsoDate } from '@/lib/dates';

const TWO_PI = Math.PI * 2;
const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface DonutSlice {
  key: string;
  value: number;
  color: string;
}

export interface DonutArc {
  key: string;
  color: string;
  fraction: number;
  /** Radianes desde las 12 en punto, sentido horario. */
  startAngle: number;
  endAngle: number;
  /** Trazo SVG con centro en (0, 0). */
  path: string;
}

function pointAt(radius: number, angle: number): { x: number; y: number } {
  return { x: round2(radius * Math.sin(angle)), y: round2(-radius * Math.cos(angle)) };
}

function arcPath(radius: number, start: number, end: number, full: boolean): string {
  if (full) {
    // Un círculo completo no se puede dibujar con un solo arco (inicio = fin): dos medias vueltas.
    return `M 0 ${-radius} A ${radius} ${radius} 0 1 1 0 ${radius} A ${radius} ${radius} 0 1 1 0 ${-radius}`;
  }
  const from = pointAt(radius, start);
  const to = pointAt(radius, end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${large} 1 ${to.x} ${to.y}`;
}

/** Arcos de una dona. Ignora valores ≤ 0; `gapRadians` separa las porciones (sin cambiar sus fracciones). */
export function donutArcs(slices: DonutSlice[], opts: { radius: number; gapRadians?: number }): DonutArc[] {
  const positive = slices.filter((s) => s.value > 0);
  const total = positive.reduce((sum, s) => sum + s.value, 0);
  if (positive.length === 0 || total <= 0) return [];

  let cursor = 0;
  return positive.map((slice) => {
    const fraction = slice.value / total;
    const start = cursor;
    const end = cursor + fraction * TWO_PI;
    cursor = end;
    const full = positive.length === 1;
    const gap = full ? 0 : Math.min(opts.gapRadians ?? 0, (end - start) * 0.5);
    const startAngle = start + gap / 2;
    const endAngle = end - gap / 2;
    return {
      key: slice.key,
      color: slice.color,
      fraction,
      startAngle: full ? 0 : startAngle,
      endAngle: full ? TWO_PI : endAngle,
      path: arcPath(opts.radius, startAngle, endAngle, full),
    };
  });
}

/** Escala lineal; con un dominio de ancho 0 devuelve el centro del rango (evita dividir entre cero). */
export function linearScale(domain: [number, number], range: [number, number]): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return () => (r0 + r1) / 2;
  return (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

/** Curva suave que pasa por los puntos (Catmull-Rom convertido a Bézier). */
export function smoothLinePath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n === 0) return '';
  const first = points[0]!;
  if (n === 1) return `M ${round2(first.x)} ${round2(first.y)}`;
  if (n === 2) {
    const last = points[1]!;
    return `M ${round2(first.x)} ${round2(first.y)} L ${round2(last.x)} ${round2(last.y)}`;
  }
  let d = `M ${round2(first.x)} ${round2(first.y)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${round2(c1.x)} ${round2(c1.y)}, ${round2(c2.x)} ${round2(c2.y)}, ${round2(p2.x)} ${round2(p2.y)}`;
  }
  return d;
}

export interface FlowLayout {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface FlowModel {
  linePath: string;
  areaPath: string;
  thresholdY: number | null;
  todayPoint: { x: number; y: number } | null;
  xTicks: { x: number; label: string }[];
  yMin: number;
  yMax: number;
}

/**
 * Modelo del gráfico "Flujo del mes". La escala vertical incluye el umbral (si existe) y un colchón
 * del 10 %; una serie plana o de un solo punto da una recta, nunca un dominio de ancho 0.
 */
export function flowChartModel(
  series: { date: IsoDate; balanceMinor: number }[],
  threshold: number | null,
  layout: FlowLayout,
): FlowModel {
  const { width, height, padding } = layout;
  const base = height - padding.bottom;
  if (series.length === 0) {
    return { linePath: '', areaPath: '', thresholdY: null, todayPoint: null, xTicks: [], yMin: 0, yMax: 1 };
  }

  const values = series.map((s) => s.balanceMinor);
  if (threshold !== null) values.push(threshold);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.abs(max) || 1;
  const yMin = min - span * 0.1;
  const yMax = max + span * 0.1;

  const x = linearScale([0, series.length - 1], [padding.left, width - padding.right]);
  const y = linearScale([yMin, yMax], [base, padding.top]);
  const points = series.map((s, i) => ({ x: round2(x(i)), y: round2(y(s.balanceMinor)) }));
  const linePath = smoothLinePath(points);
  const last = points[points.length - 1]!;
  const firstPoint = points[0]!;

  const tickIndexes = [...new Set([0, 1, 2, 3, 4].map((i) => Math.round((i * (series.length - 1)) / 4)))];
  return {
    linePath,
    areaPath: `${linePath} L ${last.x} ${base} L ${firstPoint.x} ${base} Z`,
    thresholdY: threshold === null ? null : round2(y(threshold)),
    todayPoint: last,
    xTicks: tickIndexes.map((i) => ({ x: round2(x(i)), label: String(Number(series[i]!.date.slice(8, 10))) })),
    yMin,
    yMax,
  };
}
