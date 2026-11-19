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
      'categories', 'changes', 'debts', 'ledger', 'movements', 'periods', 'settings', 'wallets',
    ]);
  });

  it('recorrido completo: billetera con apertura → gasto → resumen de Inicio del dominio', async () => {
    const repos = createRepositories(db, deps);
    const wallet = await repos.wallets.createWallet({
      name: 'Efectivo', walletType: 'cash', icon: 'payments', color: '#10B981', currencies: ['PEN'], openings: { PEN: 50000 },
    });
    if (!wallet.ok) throw new Error('setup');
    const account = wallet.value.accounts[0]!;
    const food = (await repos.categories.list()).find((c) => c.systemKey === 'other')!;

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

  it('primer arranque: "Efectivo" nace con saldo 0 y habilitar USD desde su detalle lo suma al resumen de Inicio', async () => {
    const repos = createRepositories(db, deps);
    const [efectivo] = await repos.wallets.listWallets();
    expect(efectivo).toMatchObject({ name: 'Efectivo', walletType: 'cash', isHidden: false });
    const before = await loadLedgerState(db);
    const penAccount = before.accounts.find((a) => a.walletId === efectivo!.id)!;
    expect(before.accounts.map((a) => a.currency)).toEqual(['PEN']);

    const usd = await repos.wallets.addAccount({ walletId: efectivo!.id, currency: 'USD', openingMinor: 2500 });
    if (!usd.ok) throw new Error('setup');
    const state = await loadLedgerState(db);
    const period = await repos.periods.activeRange();
    expect(homeSummary(state, [penAccount.id, usd.value.account.id], period)).toEqual({
      PEN: { availableMinor: 0, spentMinor: 0, remainingMinor: 0 },
      USD: { availableMinor: 2500, spentMinor: 0, remainingMinor: 2500 },
    });
  });

  describe('notificaciones de cambios', () => {
    const food = { name: 'Comida', color: '#FF0000', icon: 'restaurant' };

    it('una escritura notifica una vez y una lectura no notifica', async () => {
      const repos = createRepositories(db, deps);
      const listener = jest.fn();
      repos.changes.subscribe(listener);
      await repos.categories.create(food);
      expect(listener).toHaveBeenCalledTimes(1);
      await repos.categories.list();
      await repos.ledger.state();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('habilitar una cuenta notifica una vez (la pantalla de detalle se actualiza sola)', async () => {
      const repos = createRepositories(db, deps);
      const [efectivo] = await repos.wallets.listWallets();
      const listener = jest.fn();
      repos.changes.subscribe(listener);
      const r = await repos.wallets.addAccount({ walletId: efectivo!.id, currency: 'USD' });
      expect(r.ok).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('una escritura rechazada por validación también notifica una vez', async () => {
      const repos = createRepositories(db, deps);
      const listener = jest.fn();
      repos.changes.subscribe(listener);
      const r = await repos.categories.create({ ...food, color: 'rojo' });
      expect(r.ok).toBe(false);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('notifica aunque la escritura lance una excepción', async () => {
      const repos = createRepositories(db, deps);
      const listener = jest.fn();
      repos.changes.subscribe(listener);
      await expect(repos.settings.setDevice({ homeScope: '' })).rejects.toThrow();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
