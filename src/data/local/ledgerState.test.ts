/** @jest-environment node */
import { loadLedgerState } from './ledgerState';
import { viewTableSpecs } from './schema';
import { createTestDb, type TestDb } from './testDb';

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb(viewTableSpecs());
});
afterEach(async () => {
  await db.close();
});

async function insertBasics() {
  await db.execute(
    "INSERT INTO accounts (id, kind, wallet_id, currency) VALUES ('yapePen', 'wallet', 'w1', 'PEN'), ('bcp', 'credit_card', NULL, 'PEN')",
  );
  await db.execute(
    "INSERT INTO credit_cards (id, name, credit_limit_minor, is_hidden) VALUES ('bcp', 'Tarjeta BCP', 200000, 0)",
  );
  await db.execute(
    "INSERT INTO categories (id, kind, name, color, icon, system_key, sort_order) VALUES ('food', 'expense', 'Comida', '#FF0000', 'restaurant', NULL, 0), ('loanExp', 'expense', 'Préstamo', '#00FF00', 'handshake', 'loan', 1)",
  );
  await db.execute(
    "INSERT INTO debts (id, direction, counterparty_name, counterparty_type, currency, initial_pending_minor, installment_amount_minor, next_due_on) VALUES ('d1', 'payable', 'Interbank', 'institution', 'PEN', 89000, 44500, '2026-11-25')",
  );
  await db.execute(
    "INSERT INTO movements (id, type, occurred_on, category_id, source_account_id, amount_minor, currency) VALUES ('m1', 'expense', '2026-11-10', 'food', 'yapePen', 2450, 'PEN')",
  );
}

describe('loadLedgerState', () => {
  it('lee cuentas, categorías, deudas y movimientos con los campos del dominio', async () => {
    await insertBasics();
    const state = await loadLedgerState(db);
    expect(state.accounts).toEqual([
      { id: 'bcp', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 },
      { id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
    ]);
    expect(state.categories).toEqual([
      { id: 'food', kind: 'expense', systemKey: null },
      { id: 'loanExp', kind: 'expense', systemKey: 'loan' },
    ]);
    expect(state.debts).toEqual([
      {
        id: 'd1',
        direction: 'payable',
        currency: 'PEN',
        initialPendingMinor: 89000,
        installmentAmountMinor: 44500,
        nextDueOn: '2026-11-25',
      },
    ]);
    expect(state.movements).toEqual([
      {
        id: 'm1',
        type: 'expense',
        occurredOn: '2026-11-10',
        description: null,
        categoryId: 'food',
        sourceAccountId: 'yapePen',
        destAccountId: null,
        amountMinor: 2450,
        currency: 'PEN',
        debtId: null,
        declaredBalanceMinor: null,
      },
    ]);
  });

  it('una base vacía da un estado vacío', async () => {
    expect(await loadLedgerState(db)).toEqual({ accounts: [], movements: [], categories: [], debts: [] });
  });

  it('lee dentro de una transacción de escritura', async () => {
    await insertBasics();
    const state = await db.writeTransaction((tx) => loadLedgerState(tx));
    expect(state.movements).toHaveLength(1);
  });

  it('rechaza un monto decimal con un error que nombra tabla, id y columna', async () => {
    await insertBasics();
    await db.execute("UPDATE movements SET amount_minor = 10.5 WHERE id = 'm1'");
    await expect(loadLedgerState(db)).rejects.toThrow(/movements.*m1.*amount_minor/);
  });

  it('rechaza un monto de texto', async () => {
    await insertBasics();
    await db.execute("UPDATE movements SET amount_minor = 'abc' WHERE id = 'm1'");
    await expect(loadLedgerState(db)).rejects.toThrow(/movements.*m1.*amount_minor/);
  });

  it('rechaza una moneda desconocida', async () => {
    await insertBasics();
    await db.execute("UPDATE movements SET currency = 'EUR' WHERE id = 'm1'");
    await expect(loadLedgerState(db)).rejects.toThrow(/movements.*m1.*currency/);
  });

  it('rechaza un tipo de movimiento desconocido y un monto nulo', async () => {
    await insertBasics();
    await db.execute("UPDATE movements SET type = 'regalo' WHERE id = 'm1'");
    await expect(loadLedgerState(db)).rejects.toThrow(/movements.*m1.*type/);
    await db.execute("UPDATE movements SET type = 'expense', amount_minor = NULL WHERE id = 'm1'");
    await expect(loadLedgerState(db)).rejects.toThrow(/movements.*m1.*amount_minor/);
  });

  it('rechaza una línea de crédito inválida en una tarjeta', async () => {
    await insertBasics();
    await db.execute("UPDATE credit_cards SET credit_limit_minor = 2.5 WHERE id = 'bcp'");
    await expect(loadLedgerState(db)).rejects.toThrow(/accounts.*bcp.*credit_limit_minor/);
  });
});
