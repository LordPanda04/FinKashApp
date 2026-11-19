/** @jest-environment node */
import { loadLedgerState } from '@/data/local/ledgerState';
import { viewTableSpecs } from '@/data/local/schema';
import { seedDatabase } from '@/data/local/seed';
import { createTestDb, type TestDb } from '@/data/local/testDb';
import { accountBalance } from '@/domain/ledger/balances';
import type { Violation } from '@/domain/ledger/timeline';
import { createMovementRepository, type MovementDraft } from './movements';
import { createWalletRepository } from './wallets';

let db: TestDb;
let n: number;
const DAY = new Date('2026-11-20T15:00:00Z');
const deps = (clock = () => DAY) => ({ newId: () => `id-${++n}`, clock });

beforeEach(async () => {
  n = 0;
  db = await createTestDb(viewTableSpecs());
  await seedDatabase(db, deps());
});
afterEach(async () => {
  await db.close();
});

const movements = (clock?: () => Date) => createMovementRepository(db, deps(clock));

async function categoryId(kind: 'expense' | 'income'): Promise<string> {
  return (await db.getOptional<{ id: string }>("SELECT id FROM categories WHERE kind = ? AND system_key = 'other'", [kind]))!.id;
}

/** Billetera PEN con apertura opcional (fechada hoy según el reloj). */
async function wallet(opening?: number, clock?: () => Date): Promise<string> {
  const r = await createWalletRepository(db, deps(clock)).createWallet({
    name: `W${n}`, walletType: 'cash', icon: 'wallet', color: '#112233', currencies: ['PEN'],
    openings: opening ? { PEN: opening } : undefined,
  });
  if (!r.ok) throw new Error('setup wallet');
  return r.value.accounts[0]!.id;
}

async function expense(account: string, amountMinor: number, occurredOn: string): Promise<MovementDraft> {
  return {
    type: 'expense', occurredOn, description: null, categoryId: await categoryId('expense'),
    sourceAccountId: account, destAccountId: null, amountMinor, currency: 'PEN', debtId: null, declaredBalanceMinor: null,
  };
}
async function income(account: string, amountMinor: number, occurredOn: string): Promise<MovementDraft> {
  return {
    type: 'income', occurredOn, description: null, categoryId: await categoryId('income'),
    sourceAccountId: null, destAccountId: account, amountMinor, currency: 'PEN', debtId: null, declaredBalanceMinor: null,
  };
}

function violations(r: { ok: boolean; error?: { code: string; details?: Record<string, unknown> } }): Violation[] {
  expect(r.ok).toBe(false);
  expect(r.error?.code).toBe('TIMELINE_VIOLATION');
  return (r.error!.details as { violations: Violation[] }).violations;
}

describe('create', () => {
  it('ingreso y gasto el mismo día con saldo 0 se aceptan (se revisa el cierre del día)', async () => {
    const acc = await wallet();
    expect((await movements().create(await income(acc, 10000, '2026-11-20'))).ok).toBe(true);
    expect((await movements().create(await expense(acc, 8000, '2026-11-20'))).ok).toBe(true);
    const state = await loadLedgerState(db);
    expect(accountBalance(acc, state.movements)).toBe(2000);
  });

  it('un gasto sin fondos da TIMELINE_VIOLATION y no guarda nada', async () => {
    const acc = await wallet();
    const r = await movements().create(await expense(acc, 8000, '2026-11-20'));
    expect(violations(r)).toEqual([{ code: 'WALLET_NEGATIVE', entityId: acc, date: '2026-11-20', shortfallMinor: 8000 }]);
    expect(await movements().list()).toEqual([]);
  });

  it('guarda con id generado, sello de tiempo y sin user_id', async () => {
    const acc = await wallet();
    const r = await movements().create(await income(acc, 10000, '2026-11-10'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const row = await db.getOptional<Record<string, unknown>>('SELECT * FROM movements WHERE id = ?', [r.value.id]);
    expect(row).toMatchObject({
      user_id: null, type: 'income', occurred_on: '2026-11-10', amount_minor: 10000, dest_account_id: acc,
      created_at: '2026-11-20T15:00:00.000Z', updated_at: '2026-11-20T15:00:00.000Z',
    });
  });

  it('un gasto con tarjeta que supera la línea da CARD_OVER_LIMIT', async () => {
    const cardRes = await createWalletRepository(db, deps()).createCard({
      name: 'BCP', icon: 'credit_card', color: '#003DA5', currency: 'PEN', creditLimitMinor: 200000,
    });
    if (!cardRes.ok) throw new Error('setup card');
    const r = await movements().create(await expense(cardRes.value.account.id, 210000, '2026-11-20'));
    expect(violations(r)).toEqual([
      { code: 'CARD_OVER_LIMIT', entityId: cardRes.value.account.id, date: '2026-11-20', shortfallMinor: 10000 },
    ]);
  });

  it('una forma inválida (transferencia a la misma cuenta) da SAME_ACCOUNT, no TIMELINE_VIOLATION', async () => {
    const acc = await wallet(1000);
    const r = await movements().create({
      type: 'transfer', occurredOn: '2026-11-20', description: null, categoryId: null,
      sourceAccountId: acc, destAccountId: acc, amountMinor: 100, currency: 'PEN', debtId: null, declaredBalanceMinor: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SAME_ACCOUNT');
  });

  it('concurrencia: dos gastos de 8000 con saldo 10000 → solo uno se acepta', async () => {
    const acc = await wallet(10000);
    const [a, b] = await Promise.all([
      movements().create(await expense(acc, 8000, '2026-11-20')),
      movements().create(await expense(acc, 8000, '2026-11-20')),
    ]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    const failed = a.ok ? b : a;
    expect(violations(failed)[0]).toMatchObject({ code: 'WALLET_NEGATIVE', shortfallMinor: 6000 });
    const state = await loadLedgerState(db);
    expect(accountBalance(acc, state.movements)).toBe(2000);
  });
});

describe('día de Lima', () => {
  const lateNight = () => new Date('2026-12-01T03:00:00Z'); // 22:00 del 30/11 en Lima

  it('adjustWallet sin fecha usa el día de Lima (2026-11-30), no el de UTC', async () => {
    const acc = await wallet(37550, lateNight);
    const r = await movements(lateNight).adjustWallet({ accountId: acc, declaredMinor: 30000 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ occurredOn: '2026-11-30', amountMinor: 7550 });
  });

  it('un gasto del 30/11 a las 22:00 en Lima es de hoy y se acepta; uno futuro con fondos también', async () => {
    const acc = await wallet(50000, lateNight);
    expect((await movements(lateNight).create(await expense(acc, 1000, '2026-11-30'))).ok).toBe(true);
    expect((await movements(lateNight).create(await expense(acc, 1000, '2026-12-02'))).ok).toBe(true);
  });

  it('un gasto futuro sin fondos se bloquea en su fecha', async () => {
    const acc = await wallet(1000, lateNight);
    const r = await movements(lateNight).create(await expense(acc, 5000, '2026-12-02'));
    expect(violations(r)).toEqual([{ code: 'WALLET_NEGATIVE', entityId: acc, date: '2026-12-02', shortfallMinor: 4000 }]);
  });
});

describe('update y remove', () => {
  async function scenario() {
    const acc = await wallet();
    const inc = await movements().create(await income(acc, 10000, '2026-11-10'));
    const exp = await movements().create(await expense(acc, 8000, '2026-11-12'));
    if (!inc.ok || !exp.ok) throw new Error('setup');
    return { acc, inc: inc.value, exp: exp.value };
  }

  it('mover el gasto antes del ingreso que lo cubría se bloquea y conserva la fecha original', async () => {
    const { acc, exp } = await scenario();
    const { id: _id, ...draft } = exp;
    const r = await movements().update(exp.id, { ...draft, occurredOn: '2026-11-05' });
    expect(violations(r)).toEqual([{ code: 'WALLET_NEGATIVE', entityId: acc, date: '2026-11-05', shortfallMinor: 8000 }]);
    const row = await db.getOptional<{ occurred_on: string }>('SELECT occurred_on FROM movements WHERE id = ?', [exp.id]);
    expect(row!.occurred_on).toBe('2026-11-12');
  });

  it('un cambio válido actualiza la fila, conserva created_at y mueve updated_at', async () => {
    const { exp } = await scenario();
    const later = () => new Date('2026-11-21T10:00:00Z');
    const { id: _id, ...draft } = exp;
    const r = await movements(later).update(exp.id, { ...draft, amountMinor: 3000, description: 'almuerzo' });
    expect(r.ok).toBe(true);
    const row = await db.getOptional<Record<string, unknown>>('SELECT * FROM movements WHERE id = ?', [exp.id]);
    expect(row).toMatchObject({
      amount_minor: 3000, description: 'almuerzo',
      created_at: '2026-11-20T15:00:00.000Z', updated_at: '2026-11-21T10:00:00.000Z',
    });
  });

  it('eliminar el ingreso que cubría un gasto posterior se bloquea; eliminar el gasto se acepta', async () => {
    const { acc, inc, exp } = await scenario();
    const blocked = await movements().remove(inc.id);
    expect(violations(blocked)).toEqual([{ code: 'WALLET_NEGATIVE', entityId: acc, date: '2026-11-12', shortfallMinor: 8000 }]);
    expect(await db.getOptional('SELECT id FROM movements WHERE id = ?', [inc.id])).not.toBeNull();
    expect((await movements().remove(exp.id)).ok).toBe(true);
    expect(await db.getOptional('SELECT id FROM movements WHERE id = ?', [exp.id])).toBeNull();
  });

  it('ids inexistentes dan MOVEMENT_NOT_FOUND', async () => {
    const acc = await wallet(1000);
    const upd = await movements().update('nope', await expense(acc, 100, '2026-11-20'));
    const del = await movements().remove('nope');
    for (const r of [upd, del]) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('MOVEMENT_NOT_FOUND');
    }
  });
});

describe('adjustWallet', () => {
  it('declarado menor que el saldo crea un arreglo que sale de la cuenta', async () => {
    const acc = await wallet(37550);
    const r = await movements().adjustWallet({ accountId: acc, declaredMinor: 30000 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({
        type: 'adjustment', sourceAccountId: acc, destAccountId: null, amountMinor: 7550,
        declaredBalanceMinor: 30000, occurredOn: '2026-11-20',
      });
    }
    const state = await loadLedgerState(db);
    expect(accountBalance(acc, state.movements)).toBe(30000);
  });

  it('declarado igual al saldo devuelve ok(null) y no escribe', async () => {
    const acc = await wallet(37550);
    expect(await movements().adjustWallet({ accountId: acc, declaredMinor: 37550 })).toEqual({ ok: true, value: null });
    expect(await db.getAll("SELECT id FROM movements WHERE type = 'adjustment'")).toEqual([]);
  });

  it('un arreglo que dejaría un gasto posterior sin fondos se bloquea', async () => {
    const acc = await wallet();
    await movements().create(await income(acc, 10000, '2026-11-10'));
    await movements().create(await expense(acc, 8000, '2026-11-12'));
    const r = await movements().adjustWallet({ accountId: acc, declaredMinor: 5000, occurredOn: '2026-11-11' });
    expect(violations(r)).toEqual([{ code: 'WALLET_NEGATIVE', entityId: acc, date: '2026-11-12', shortfallMinor: 3000 }]);
  });

  it('cuenta inexistente → ACCOUNT_NOT_FOUND; tarjeta → LEG_INVALID; negativo → AMOUNT_INVALID', async () => {
    const acc = await wallet(1000);
    const cardRes = await createWalletRepository(db, deps()).createCard({
      name: 'BCP', icon: 'credit_card', color: '#003DA5', currency: 'PEN', creditLimitMinor: 200000,
    });
    if (!cardRes.ok) throw new Error('setup');
    const cases: [string, number, string][] = [
      ['nope', 0, 'ACCOUNT_NOT_FOUND'],
      [cardRes.value.account.id, 0, 'LEG_INVALID'],
      [acc, -1, 'AMOUNT_INVALID'],
    ];
    for (const [accountId, declaredMinor, code] of cases) {
      const r = await movements().adjustWallet({ accountId, declaredMinor });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe(code);
    }
  });
});

describe('list', () => {
  it('ordena de más reciente a más antiguo y filtra por fecha, cuenta y categoría', async () => {
    const a = await wallet();
    const b = await wallet();
    const m1 = await movements().create(await income(a, 10000, '2026-11-01'));
    const m2 = await movements().create(await income(b, 5000, '2026-11-10'));
    const m3 = await movements().create(await expense(a, 1000, '2026-11-15'));
    if (!m1.ok || !m2.ok || !m3.ok) throw new Error('setup');
    expect((await movements().list()).map((m) => m.id)).toEqual([m3.value.id, m2.value.id, m1.value.id]);
    expect((await movements().list({ from: '2026-11-05', to: '2026-11-15' })).map((m) => m.id)).toEqual([m3.value.id, m2.value.id]);
    expect((await movements().list({ accountId: b })).map((m) => m.id)).toEqual([m2.value.id]);
    expect((await movements().list({ categoryId: await categoryId('expense') })).map((m) => m.id)).toEqual([m3.value.id]);
  });
});
