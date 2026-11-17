import { addDays, eachDay, endOfMonth, firstDayOfMonth, monthOf, todayInLima } from './dates';

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
