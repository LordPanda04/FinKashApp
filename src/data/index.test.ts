/** @jest-environment node */
import { loadLedgerState } from '@/data/local/ledgerState';
import { viewTableSpecs } from '@/data/local/schema';
import { seedDatabase } from '@/data/local/seed';
import { createTestDb, type TestDb } from '@/data/local/testDb';
import { homeSummary } from '@/domain/reports/home';
import { createRepositories } from './index';

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

describe('createRepositories', () => {
  it('expone los seis repositorios', () => {
    expect(Object.keys(createRepositories(db, deps)).sort()).toEqual([
      'categories', 'debts', 'movements', 'periods', 'settings', 'wallets',
    ]);
  });

  it('recorrido completo: billetera con apertura → gasto → resumen de Inicio del dominio', async () => {
    const repos = createRepositories(db, deps);
    const wallet = await repos.wallets.createWallet({
      name: 'Efectivo', walletType: 'cash', icon: 'payments', color: '#10B981', currencies: ['PEN'], openings: { PEN: 50000 },
    });
    if (!wallet.ok) throw new Error('setup');
    const account = wallet.value.accounts[0]!;
    const food = (await repos.categories.list()).find((c) => c.kind === 'expense' && c.systemKey === 'other')!;

    const spent = await repos.movements.create({
      type: 'expense', occurredOn: '2026-11-20', description: 'menú', categoryId: food.id,
      sourceAccountId: account.id, destAccountId: null, amountMinor: 2450, currency: 'PEN', debtId: null, declaredBalanceMinor: null,
    });
    expect(spent.ok).toBe(true);

    const state = await loadLedgerState(db);
    const period = await repos.periods.activeRange();
    expect(period).toEqual({ start: '2026-11-01', end: '2026-11-20' });
    expect(homeSummary(state, [account.id], period)).toEqual({
      PEN: { availableMinor: 50000, spentMinor: 2450, remainingMinor: 47550 },
    });
  });
});
