import { eachDay } from '@/lib/dates';
import { donutArcs, flowChartModel, linearScale, smoothLinePath, type FlowLayout } from './geometry';

const TWO_PI = Math.PI * 2;

describe('donutArcs', () => {
  const slices = [
    { key: 'a', value: 50, color: '#111111' },
    { key: 'b', value: 30, color: '#222222' },
    { key: 'c', value: 20, color: '#333333' },
  ];

  it('las fracciones son proporcionales y suman 1', () => {
    const arcs = donutArcs(slices, { radius: 76 });
    expect(arcs.map((a) => a.fraction)).toEqual([0.5, 0.3, 0.2]);
    expect(arcs.reduce((s, a) => s + a.fraction, 0)).toBeCloseTo(1, 10);
  });

  it('empieza en 0 y termina en 2π, en sentido horario y sin huecos', () => {
    const arcs = donutArcs(slices, { radius: 76 });
    expect(arcs[0]!.startAngle).toBe(0);
    expect(arcs[2]!.endAngle).toBeCloseTo(TWO_PI, 10);
    expect(arcs[1]!.startAngle).toBeCloseTo(arcs[0]!.endAngle, 10);
    expect(arcs[2]!.startAngle).toBeCloseTo(arcs[1]!.endAngle, 10);
  });

  it('conserva clave y color de cada porción', () => {
    const arcs = donutArcs(slices, { radius: 76 });
    expect(arcs.map((a) => [a.key, a.color])).toEqual([['a', '#111111'], ['b', '#222222'], ['c', '#333333']]);
  });

  it('ignora valores cero o negativos', () => {
    const arcs = donutArcs([...slices, { key: 'z', value: 0, color: '#000000' }, { key: 'n', value: -5, color: '#000000' }], { radius: 76 });
    expect(arcs.map((a) => a.key)).toEqual(['a', 'b', 'c']);
  });

  it('sin valores devuelve una lista vacía', () => {
    expect(donutArcs([], { radius: 76 })).toEqual([]);
    expect(donutArcs([{ key: 'a', value: 0, color: '#000000' }], { radius: 76 })).toEqual([]);
  });

  it('un solo valor es un círculo completo sin NaN', () => {
    const [arc] = donutArcs([{ key: 'a', value: 10, color: '#111111' }], { radius: 76 });
    expect(arc!.fraction).toBe(1);
    expect(arc!.path).toMatch(/^M /);
    expect(arc!.path).not.toContain('NaN');
  });

  it('todos los trazos son cadenas que empiezan en M y no contienen NaN', () => {
    for (const a of donutArcs(slices, { radius: 76, gapRadians: 0.04 })) {
      expect(a.path).toMatch(/^M /);
      expect(a.path).not.toContain('NaN');
    }
  });

  it('el hueco separa las porciones sin cambiar sus fracciones', () => {
    const arcs = donutArcs(slices, { radius: 76, gapRadians: 0.1 });
    expect(arcs.map((a) => a.fraction)).toEqual([0.5, 0.3, 0.2]);
    expect(arcs[0]!.endAngle).toBeLessThan(arcs[1]!.startAngle);
  });

  it('una porción diminuta (0.1 %) sigue dibujándose', () => {
    const arcs = donutArcs([{ key: 'a', value: 999, color: '#1' }, { key: 'b', value: 1, color: '#2' }], { radius: 76, gapRadians: 0.04 });
    expect(arcs).toHaveLength(2);
    expect(arcs[1]!.path).not.toContain('NaN');
  });
});

describe('linearScale', () => {
  it('mapea el dominio al rango', () => {
    expect(linearScale([0, 100], [0, 200])(50)).toBe(100);
    expect(linearScale([0, 100], [200, 0])(25)).toBe(150);
  });
  it('un dominio de ancho 0 devuelve el centro del rango', () => {
    expect(linearScale([5, 5], [0, 100])(5)).toBe(50);
  });
});

describe('smoothLinePath', () => {
  it('1 punto: solo un M', () => {
    expect(smoothLinePath([{ x: 10, y: 20 }])).toBe('M 10 20');
  });
  it('2 puntos: una recta', () => {
    expect(smoothLinePath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe('M 0 0 L 10 10');
  });
  it('4 puntos: empieza con M y usa curvas C sin NaN', () => {
    const path = smoothLinePath([{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 20, y: 5 }, { x: 30, y: 15 }]);
    expect(path).toMatch(/^M 0 0/);
    expect(path).toContain('C');
    expect(path).not.toContain('NaN');
  });
  it('sin puntos devuelve una cadena vacía', () => {
    expect(smoothLinePath([])).toBe('');
  });
});

describe('flowChartModel', () => {
  const layout: FlowLayout = { width: 300, height: 140, padding: { top: 16, right: 12, bottom: 24, left: 12 } };
  const days = eachDay('2026-11-01', '2026-11-30');
  const rising = days.map((date, i) => ({ date, balanceMinor: 1000 + i * 100 }));
  const inside = (y: number) => y >= layout.padding.top && y <= layout.height - layout.padding.bottom;

  it('el último punto es el de hoy y hay 5 marcas de fecha con el día del mes', () => {
    const m = flowChartModel(rising, null, layout);
    expect(m.todayPoint).not.toBeNull();
    expect(m.todayPoint!.x).toBeCloseTo(layout.width - layout.padding.right, 5);
    expect(m.xTicks).toHaveLength(5);
    expect(m.xTicks[0]!.label).toBe('1');
    expect(m.xTicks[4]!.label).toBe('30');
  });

  it('la curva sube cuando el saldo sube (y menor = más arriba)', () => {
    const m = flowChartModel(rising, null, layout);
    expect(m.todayPoint!.y).toBeLessThan(layout.height - layout.padding.bottom);
    expect(inside(m.todayPoint!.y)).toBe(true);
  });

  it('serie vacía: rutas vacías y sin punto de hoy', () => {
    const m = flowChartModel([], null, layout);
    expect(m.linePath).toBe('');
    expect(m.areaPath).toBe('');
    expect(m.todayPoint).toBeNull();
    expect(m.xTicks).toEqual([]);
  });

  it('serie plana: línea recta dentro del área, sin NaN ni dominio degenerado', () => {
    const flat = days.map((date) => ({ date, balanceMinor: 1000 }));
    const m = flowChartModel(flat, null, layout);
    expect(m.yMin).toBeLessThan(m.yMax);
    expect(m.linePath).not.toContain('NaN');
    expect(inside(m.todayPoint!.y)).toBe(true);
  });

  it('serie plana en 0 tampoco divide entre cero', () => {
    const zero = days.map((date) => ({ date, balanceMinor: 0 }));
    const m = flowChartModel(zero, null, layout);
    expect(m.yMin).toBeLessThan(m.yMax);
    expect(m.linePath).not.toContain('NaN');
  });

  it('un solo punto: sin NaN y centrado horizontalmente', () => {
    const m = flowChartModel([{ date: '2026-11-01', balanceMinor: 500 }], null, layout);
    expect(m.linePath).not.toContain('NaN');
    expect(m.todayPoint!.x).toBeCloseTo(layout.width / 2, 5);
    expect(m.xTicks).toHaveLength(1);
  });

  it('un umbral muy por encima de los saldos entra en la escala', () => {
    const small = days.map((date, i) => ({ date, balanceMinor: 1000 + i * 100 }));
    const m = flowChartModel(small, 30000, layout);
    expect(m.thresholdY).not.toBeNull();
    expect(inside(m.thresholdY!)).toBe(true);
    expect(m.yMax).toBeGreaterThanOrEqual(30000);
  });

  it('un umbral muy por debajo también entra en la escala', () => {
    const m = flowChartModel(rising, -5000, layout);
    expect(inside(m.thresholdY!)).toBe(true);
    expect(m.yMin).toBeLessThanOrEqual(-5000);
  });

  it('sin umbral thresholdY es null', () => {
    expect(flowChartModel(rising, null, layout).thresholdY).toBeNull();
  });

  it('el área se cierra hasta la base', () => {
    const m = flowChartModel(rising, null, layout);
    expect(m.areaPath.endsWith('Z')).toBe(true);
    expect(m.areaPath).toContain(` ${layout.height - layout.padding.bottom}`);
  });

  it('saldos negativos también se dibujan dentro del área', () => {
    const neg = days.map((date, i) => ({ date, balanceMinor: -500 + i * 50 }));
    const m = flowChartModel(neg, null, layout);
    expect(m.linePath).not.toContain('NaN');
    expect(inside(m.todayPoint!.y)).toBe(true);
  });
});
