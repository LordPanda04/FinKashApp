import { buildAdjustment, buildOpening } from './builders';
import type { Account, Movement } from './types';

const yapePen: Account = { id: 'yapePen', kind: 'wallet', walletId: 'yape', currency: 'PEN', creditLimitMinor: null };
const bcpCard: Account = { id: 'bcpCard', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 };

function mv(partial: Partial<Movement>): Movement {
  return {
    id: `m-${Math.random()}`,
    type: 'expense',
    occurredOn: '2026-11-01',
    description: null,
    categoryId: null,
    sourceAccountId: null,
    destAccountId: null,
    amountMinor: 0,
    currency: 'PEN',
    debtId: null,
    declaredBalanceMinor: null,
    ...partial,
  };
}

// Saldo de yapePen al 2026-11-16: 50000 − 2450 − 10000 = 37550
const movements: Movement[] = [
  mv({ type: 'opening', destAccountId: 'yapePen', amountMinor: 50000, occurredOn: '2026-11-01' }),
  mv({ type: 'expense', sourceAccountId: 'yapePen', amountMinor: 2450, occurredOn: '2026-11-16', categoryId: 'food' }),
  mv({ type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'plinPen', amountMinor: 10000, occurredOn: '2026-11-16' }),
];

describe('buildOpening', () => {
  it('billetera: el tramo de entrada es la cuenta', () => {
    const m = buildOpening({ id: 'o1', account: yapePen, amountMinor: 50000, occurredOn: '2026-11-01' });
    expect(m).toMatchObject({
      id: 'o1',
      type: 'opening',
      destAccountId: 'yapePen',
      sourceAccountId: null,
      amountMinor: 50000,
      currency: 'PEN',
      occurredOn: '2026-11-01',
      categoryId: null,
      debtId: null,
      declaredBalanceMinor: null,
    });
  });

  it('tarjeta: el tramo de salida es la cuenta (consumo previo)', () => {
    const m = buildOpening({ id: 'o2', account: bcpCard, amountMinor: 30000, occurredOn: '2026-11-01' });
    expect(m).toMatchObject({
      type: 'opening',
      sourceAccountId: 'bcpCard',
      destAccountId: null,
      categoryId: null,
      amountMinor: 30000,
    });
  });
});

describe('buildAdjustment', () => {
  const base = { id: 'a1', account: yapePen, occurredOn: '2026-11-16', movements };

  it('declarado menor que el saldo: el tramo de salida es la cuenta', () => {
    const r = buildAdjustment({ ...base, declaredMinor: 30000 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({
        type: 'adjustment',
        sourceAccountId: 'yapePen',
        destAccountId: null,
        amountMinor: 7550,
        declaredBalanceMinor: 30000,
        currency: 'PEN',
        occurredOn: '2026-11-16',
      });
    }
  });

  it('declarado mayor que el saldo: el tramo de entrada es la cuenta', () => {
    const r = buildAdjustment({ ...base, declaredMinor: 40000 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({
        destAccountId: 'yapePen',
        sourceAccountId: null,
        amountMinor: 2450,
        declaredBalanceMinor: 40000,
      });
    }
  });

  it('declarado igual al saldo: no hace falta ajuste (null)', () => {
    expect(buildAdjustment({ ...base, declaredMinor: 37550 })).toEqual({ ok: true, value: null });
  });

  it('usa el saldo al cierre de la fecha del arreglo, no el actual', () => {
    const r = buildAdjustment({ ...base, occurredOn: '2026-11-15', declaredMinor: 49000 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ sourceAccountId: 'yapePen', amountMinor: 1000 });
  });

  it('declarar 0 es válido', () => {
    const r = buildAdjustment({ ...base, declaredMinor: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ amountMinor: 37550, declaredBalanceMinor: 0 });
  });

  it.each([-1, 1.5, Number.NaN])('rechaza el saldo declarado %p con AMOUNT_INVALID', (declaredMinor) => {
    const r = buildAdjustment({ ...base, declaredMinor });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('AMOUNT_INVALID');
  });

  it('rechaza un arreglo sobre una tarjeta con LEG_INVALID', () => {
    const r = buildAdjustment({ ...base, account: bcpCard, declaredMinor: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('LEG_INVALID');
  });
});
