import { addDays, addMonths, eachDay, endOfMonth, firstDayOfMonth, formatDayLabel, MONTH_NAMES_ES, monthOf, monthRange, todayInLima, weekdayMonFirst } from './dates';

describe('todayInLima', () => {
  it('a las 22:00 en Lima del 30 de noviembre sigue siendo 30 de noviembre', () => {
    expect(todayInLima(new Date('2026-12-01T03:00:00Z'))).toBe('2026-11-30');
  });

  it('a las 00:00 en Lima del 1 de diciembre ya es 1 de diciembre', () => {
    expect(todayInLima(new Date('2026-12-01T05:00:00Z'))).toBe('2026-12-01');
  });
});

describe('aritmética de fechas', () => {
  it('addDays cruza el cambio de mes', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });

  it('addDays acepta días negativos', () => {
    expect(addDays('2026-12-01', -1)).toBe('2026-11-30');
  });

  it('endOfMonth respeta febrero y años bisiestos', () => {
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
  });

  it('monthOf devuelve YYYY-MM', () => {
    expect(monthOf('2026-11-17')).toBe('2026-11');
  });

  it('firstDayOfMonth devuelve el día 1', () => {
    expect(firstDayOfMonth('2026-11-17')).toBe('2026-11-01');
  });

  it('eachDay es inclusivo en ambos extremos', () => {
    expect(eachDay('2026-11-29', '2026-12-01')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01']);
  });

  it('eachDay devuelve lista vacía si from es posterior a to', () => {
    expect(eachDay('2026-12-02', '2026-12-01')).toEqual([]);
  });
});

describe('formatDayLabel', () => {
  const today = '2026-11-20';
  it('Hoy y Ayer', () => {
    expect(formatDayLabel('2026-11-20', today)).toBe('Hoy');
    expect(formatDayLabel('2026-11-19', today)).toBe('Ayer');
  });
  it('otro día del mismo año: "14 Nov"', () => {
    expect(formatDayLabel('2026-11-14', today)).toBe('14 Nov');
    expect(formatDayLabel('2026-01-05', today)).toBe('5 Ene');
  });
  it('de otro año incluye el año', () => {
    expect(formatDayLabel('2025-12-31', today)).toBe('31 Dic 2025');
  });
  it('un día futuro no es "Hoy" ni "Ayer"', () => {
    expect(formatDayLabel('2026-11-21', today)).toBe('21 Nov');
  });
  it('ayer cruzando el cambio de año', () => {
    expect(formatDayLabel('2025-12-31', '2026-01-01')).toBe('Ayer');
  });
});

describe('monthRange, addMonths y weekdayMonFirst', () => {
  it('monthRange devuelve primer y último día del mes', () => {
    expect(monthRange('2026-02-10')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthRange('2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });
  it('addMonths recorta el día al fin de mes y cruza años', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonths('2026-12-10', 1)).toBe('2027-01-10');
  });
  it('weekdayMonFirst: lunes = 0 y domingo = 6', () => {
    expect(weekdayMonFirst('2026-11-16')).toBe(0);
    expect(weekdayMonFirst('2026-11-22')).toBe(6);
    expect(weekdayMonFirst('2026-11-01')).toBe(6);
  });
  it('MONTH_NAMES_ES tiene los 12 meses', () => {
    expect(MONTH_NAMES_ES).toHaveLength(12);
    expect(MONTH_NAMES_ES[0]).toBe('Enero');
    expect(MONTH_NAMES_ES[10]).toBe('Noviembre');
  });
});
