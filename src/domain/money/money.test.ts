import { CURRENCY_SYMBOL, formatMoney, parseAmountInput } from './money';

describe('parseAmountInput', () => {
  it('convierte "1,840.50" a 184050 céntimos', () => {
    expect(parseAmountInput('1,840.50')).toEqual({ ok: true, value: 184050 });
  });

  it('convierte "24.5" a 2450', () => {
    expect(parseAmountInput('24.5')).toEqual({ ok: true, value: 2450 });
  });

  it('convierte "1840" a 184000', () => {
    expect(parseAmountInput('1840')).toEqual({ ok: true, value: 184000 });
  });

  it('no sufre errores de punto flotante ("1.15" → 115)', () => {
    expect(parseAmountInput('1.15')).toEqual({ ok: true, value: 115 });
    expect(parseAmountInput('0.29')).toEqual({ ok: true, value: 29 });
  });

  it.each(['', '0', '0.00', '-5', '1.005', 'abc', '12.3.4'])('rechaza %j con AMOUNT_INVALID', (bad) => {
    const r = parseAmountInput(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('AMOUNT_INVALID');
  });

  it('rechaza montos que exceden el entero seguro', () => {
    const r = parseAmountInput('99999999999999999999');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('AMOUNT_INVALID');
  });
});

describe('formatMoney', () => {
  it('usa el símbolo de la moneda', () => {
    expect(CURRENCY_SYMBOL).toEqual({ PEN: 'S/', USD: '$' });
  });

  it('formatea soles con separador de miles', () => {
    expect(formatMoney(184000, 'PEN')).toBe('S/ 1,840.00');
  });

  it('formatea con signo menos', () => {
    expect(formatMoney(2450, 'PEN', { sign: 'minus' })).toBe('- S/ 24.50');
  });

  it('formatea dólares con signo más', () => {
    expect(formatMoney(50000, 'USD', { sign: 'plus' })).toBe('+ $ 500.00');
  });

  it('rellena céntimos menores a 10', () => {
    expect(formatMoney(5, 'PEN')).toBe('S/ 0.05');
  });

  it('agrupa millones', () => {
    expect(formatMoney(123456789, 'PEN')).toBe('S/ 1,234,567.89');
  });

  it('lanza error con montos negativos o no enteros', () => {
    expect(() => formatMoney(-1, 'PEN')).toThrow();
    expect(() => formatMoney(1.5, 'PEN')).toThrow();
  });
});
