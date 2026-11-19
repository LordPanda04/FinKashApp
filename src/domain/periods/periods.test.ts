import { activePeriodRange, shouldSuggestNewPeriod, validatePeriodStart, type FinancialPeriod } from './periods';

function period(partial: Partial<FinancialPeriod>): FinancialPeriod {
  return { id: 'p', month: '2026-11', startedOn: null, confirmedAt: null, dismissedAt: null, ...partial };
}

const novConfirmed = period({
  id: 'nov',
  month: '2026-11',
  startedOn: '2026-11-01',
  confirmedAt: '2026-11-01T14:00:00Z',
});

describe('sin periodos (primer uso)', () => {
  it('sugiere crear el periodo', () => {
    expect(shouldSuggestNewPeriod([], '2026-11-17')).toBe(true);
  });

  it('el periodo activo va del día 1 del mes actual hasta hoy', () => {
    expect(activePeriodRange([], '2026-11-17')).toEqual({ start: '2026-11-01', end: '2026-11-17' });
  });
});

describe('periodo de noviembre confirmado', () => {
  it('no sugiere nada durante noviembre', () => {
    expect(shouldSuggestNewPeriod([novConfirmed], '2026-11-30')).toBe(false);
  });

  it('en diciembre sugiere el nuevo periodo', () => {
    expect(shouldSuggestNewPeriod([novConfirmed], '2026-12-02')).toBe(true);
  });

  it('en diciembre el periodo anterior sigue activo hasta que se confirme el nuevo', () => {
    expect(activePeriodRange([novConfirmed], '2026-12-02')).toEqual({ start: '2026-11-01', end: '2026-12-02' });
  });

  it('nunca reinicia ni recorta datos: el inicio sigue siendo el confirmado', () => {
    expect(activePeriodRange([novConfirmed], '2027-03-15').start).toBe('2026-11-01');
  });
});

describe('sugerencia descartada', () => {
  const decDismissed = period({ id: 'dec', month: '2026-12', dismissedAt: '2026-12-02T15:00:00Z' });

  it('no vuelve a aparecer el mismo día del descarte', () => {
    expect(shouldSuggestNewPeriod([novConfirmed, decDismissed], '2026-12-02')).toBe(false);
  });

  it('vuelve a aparecer al día siguiente', () => {
    expect(shouldSuggestNewPeriod([novConfirmed, decDismissed], '2026-12-03')).toBe(true);
  });

  it('el descarte de otro mes no silencia la sugerencia del mes actual', () => {
    const oldDismissal = period({ id: 'old', month: '2026-10', dismissedAt: '2026-12-02T15:00:00Z' });
    expect(shouldSuggestNewPeriod([novConfirmed, oldDismissal], '2026-12-02')).toBe(true);
  });

  it('un descarte nocturno cuenta como el día de Lima (22:00 del 2/12 es 03:00Z del 3/12)', () => {
    const late = period({ id: 'dec', month: '2026-12', dismissedAt: '2026-12-03T03:00:00Z' });
    expect(shouldSuggestNewPeriod([novConfirmed, late], '2026-12-02')).toBe(false);
    expect(shouldSuggestNewPeriod([novConfirmed, late], '2026-12-03')).toBe(true);
  });
});

describe('periodo de diciembre confirmado', () => {
  const decConfirmed = period({
    id: 'dec',
    month: '2026-12',
    startedOn: '2026-12-03',
    confirmedAt: '2026-12-03T14:00:00Z',
  });

  it('el rango activo empieza en el inicio confirmado', () => {
    expect(activePeriodRange([novConfirmed, decConfirmed], '2026-12-10')).toEqual({
      start: '2026-12-03',
      end: '2026-12-10',
    });
  });

  it('ya no sugiere más para ese mes', () => {
    expect(shouldSuggestNewPeriod([novConfirmed, decConfirmed], '2026-12-10')).toBe(false);
  });

  it('el orden de la lista no importa', () => {
    expect(activePeriodRange([decConfirmed, novConfirmed], '2026-12-10').start).toBe('2026-12-03');
  });

  it('ignora periodos confirmados que empiezan en el futuro', () => {
    expect(activePeriodRange([novConfirmed, decConfirmed], '2026-12-01')).toEqual({
      start: '2026-11-01',
      end: '2026-12-01',
    });
  });
});

describe('validatePeriodStart (día de inicio del periodo)', () => {
  const TODAY = '2026-11-20';

  it('acepta el día 1, un día intermedio y hoy', () => {
    for (const day of ['2026-11-01', '2026-11-15', '2026-11-20']) {
      expect(validatePeriodStart('2026-11', day, TODAY)).toEqual({ ok: true, value: day });
    }
  });

  it('rechaza un día futuro', () => {
    const r = validatePeriodStart('2026-11', '2026-11-21', TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('PERIOD_START_INVALID');
      expect(r.error.message).toMatch(/futuro|hoy/i);
    }
  });

  it('rechaza un día de otro mes, incluido el último día del mes anterior', () => {
    for (const day of ['2026-10-31', '2026-12-01']) {
      const r = validatePeriodStart('2026-11', day, TODAY);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('PERIOD_START_INVALID');
    }
  });

  it('rechaza un mes futuro aunque el día sea el 1', () => {
    const r = validatePeriodStart('2026-12', '2026-12-01', TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('PERIOD_START_INVALID');
  });
});
