/** @jest-environment node */
import { viewTableSpecs } from '@/data/local/schema';
import { createTestDb, type TestDb } from '@/data/local/testDb';
import type { DebtInput } from '@/validation/inputs';
import { createDebtRepository } from './debts';

let db: TestDb;
let n: number;
const deps = () => ({ newId: () => `id-${++n}`, clock: () => new Date('2026-11-20T15:00:00Z') });

beforeEach(async () => {
  n = 0;
  db = await createTestDb(viewTableSpecs());
});
afterEach(async () => {
  await db.close();
});

const repo = () => createDebtRepository(db, deps());
const interbank: DebtInput = {
  direction: 'payable',
  counterpartyName: 'Interbank',
  counterpartyType: 'institution',
  currency: 'PEN',
  initialPendingMinor: 89000,
  installmentAmountMinor: 44500,
  nextDueOn: '2026-11-25',
};

async function addLoanMovement(id: string, type: 'expense' | 'income', debtId: string, amount: number): Promise<void> {
  await db.execute(
    'INSERT INTO movements (id, type, occurred_on, category_id, source_account_id, dest_account_id, amount_minor, currency, debt_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, type, '2026-11-10', 'loan', type === 'expense' ? 'acc' : null, type === 'income' ? 'acc' : null, amount, 'PEN', debtId],
  );
}

describe('create', () => {
  it('una deuda que ya existía queda con su saldo pendiente y sin mover ninguna billetera', async () => {
    const r = await repo().create(interbank);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({
      direction: 'payable',
      counterpartyName: 'Interbank',
      counterpartyType: 'institution',
      currency: 'PEN',
      initialPendingMinor: 89000,
      installmentAmountMinor: 44500,
      nextDueOn: '2026-11-25',
      dueOn: null,
      installmentsRemaining: null,
      notes: null,
    });
    const list = await repo().list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ pendingMinor: 89000, status: 'pending' });
    expect(await db.getAll('SELECT id FROM movements')).toEqual([]);
  });

  it('una deuda nueva con saldo inicial 0 figura como pagada hasta que haya movimientos', async () => {
    const r = await repo().create({ ...interbank, direction: 'receivable', counterpartyName: 'Carlos', counterpartyType: 'person', initialPendingMinor: 0, installmentAmountMinor: undefined, nextDueOn: undefined });
    expect(r.ok).toBe(true);
    expect((await repo().list())[0]).toMatchObject({ pendingMinor: 0, status: 'paid' });
  });

  it('una entrada inválida da INPUT_INVALID y no escribe', async () => {
    for (const bad of [{ ...interbank, currency: 'EUR' }, { ...interbank, initialPendingMinor: -1 }, { ...interbank, nextDueOn: '2026-02-30' }]) {
      const r = await repo().create(bad as unknown as DebtInput);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('INPUT_INVALID');
    }
    expect(await db.getAll('SELECT id FROM debts')).toEqual([]);
  });
});

describe('list: pendiente derivado de los movimientos', () => {
  it('por pagar: un gasto Préstamo vinculado reduce el pendiente (89000 − 44500)', async () => {
    const r = await repo().create(interbank);
    if (!r.ok) throw new Error('setup');
    await addLoanMovement('m1', 'expense', r.value.id, 44500);
    expect((await repo().list())[0]).toMatchObject({ pendingMinor: 44500, status: 'pending' });
  });

  it('por pagar: pagar todo deja el estado en pagada', async () => {
    const r = await repo().create(interbank);
    if (!r.ok) throw new Error('setup');
    await addLoanMovement('m1', 'expense', r.value.id, 89000);
    expect((await repo().list())[0]).toMatchObject({ pendingMinor: 0, status: 'paid' });
  });

  it('por cobrar: prestar suma y que devuelvan resta', async () => {
    const r = await repo().create({ ...interbank, direction: 'receivable', counterpartyName: 'Carlos', counterpartyType: 'person', initialPendingMinor: 0, installmentAmountMinor: undefined, nextDueOn: undefined });
    if (!r.ok) throw new Error('setup');
    await addLoanMovement('m1', 'expense', r.value.id, 15000);
    await addLoanMovement('m2', 'income', r.value.id, 5000);
    expect((await repo().list())[0]).toMatchObject({ pendingMinor: 10000, status: 'pending' });
  });

  it('los movimientos de otra deuda no afectan', async () => {
    const r = await repo().create(interbank);
    if (!r.ok) throw new Error('setup');
    await addLoanMovement('m1', 'expense', 'otra-deuda', 5000);
    expect((await repo().list())[0]!.pendingMinor).toBe(89000);
  });
});

describe('update', () => {
  it('cambia cuota, próximo pago y notas sin tocar el saldo inicial', async () => {
    const r = await repo().create(interbank);
    if (!r.ok) throw new Error('setup');
    const u = await repo().update(r.value.id, { installmentAmountMinor: 30000, nextDueOn: '2026-12-25', installmentsRemaining: 3, notes: 'cuotas' });
    expect(u.ok).toBe(true);
    if (u.ok) {
      expect(u.value).toMatchObject({
        installmentAmountMinor: 30000,
        nextDueOn: '2026-12-25',
        installmentsRemaining: 3,
        notes: 'cuotas',
        initialPendingMinor: 89000,
      });
    }
  });

  it('un patch vacío no cambia nada y una deuda inexistente da DEBT_NOT_FOUND', async () => {
    const r = await repo().create(interbank);
    if (!r.ok) throw new Error('setup');
    const same = await repo().update(r.value.id, {});
    expect(same.ok && same.value.installmentAmountMinor).toBe(44500);
    const missing = await repo().update('nope', { notes: 'x' });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('DEBT_NOT_FOUND');
  });

  it('una fecha inválida da INPUT_INVALID', async () => {
    const r = await repo().create(interbank);
    if (!r.ok) throw new Error('setup');
    const u = await repo().update(r.value.id, { nextDueOn: '2026-02-30' });
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.error.code).toBe('INPUT_INVALID');
  });

  it('se puede quitar la cuota y el próximo pago con null', async () => {
    const r = await repo().create(interbank);
    if (!r.ok) throw new Error('setup');
    const u = await repo().update(r.value.id, { installmentAmountMinor: null, nextDueOn: null });
    expect(u.ok && [u.value.installmentAmountMinor, u.value.nextDueOn]).toEqual([null, null]);
  });
});
