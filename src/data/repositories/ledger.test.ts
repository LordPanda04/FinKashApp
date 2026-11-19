/** @jest-environment node */
import { viewTableSpecs } from '@/data/local/schema';
import { seedDatabase } from '@/data/local/seed';
import { createTestDb, type TestDb } from '@/data/local/testDb';
import { createLedgerRepository } from './ledger';
import { createWalletRepository } from './wallets';

let db: TestDb;
let n = 0;
const deps = { newId: () => `id-${++n}`, clock: () => new Date('2026-11-20T15:00:00Z') };

beforeEach(async () => {
  n = 0;
  db = await createTestDb(viewTableSpecs());
  await seedDatabase(db, deps);
});
afterEach(async () => {
  await db.close();
});

describe('ledger repository', () => {
  it('state() devuelve el libro completo', async () => {
    const wallets = createWalletRepository(db, deps);
    const w = await wallets.createWallet({
      name: 'Yape', walletType: 'digital', icon: 'smartphone', color: '#742384', currencies: ['PEN'], openings: { PEN: 50000 },
    });
    if (!w.ok) throw new Error('setup');
    const state = await createLedgerRepository(db).state();
    expect(state.accounts).toHaveLength(1);
    expect(state.categories).toHaveLength(6);
    expect(state.debts).toEqual([]);
    expect(state.movements).toHaveLength(1);
    expect(state.movements[0]).toMatchObject({ type: 'opening', amountMinor: 50000 });
  });

  it('en una base vacía devuelve un libro vacío', async () => {
    const empty = await createTestDb(viewTableSpecs());
    expect(await createLedgerRepository(empty).state()).toEqual({ accounts: [], categories: [], debts: [], movements: [] });
    await empty.close();
  });
});
