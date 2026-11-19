/** @jest-environment node */
import { viewTableSpecs } from '@/data/local/schema';
import { seedDatabase } from '@/data/local/seed';
import { createTestDb, type TestDb } from '@/data/local/testDb';
import { createSettingsRepository } from './settings';

let db: TestDb;
let n: number;
const deps = () => ({ newId: () => `s-${++n}`, clock: () => new Date('2026-11-20T15:00:00Z') });

beforeEach(async () => {
  n = 0;
  db = await createTestDb(viewTableSpecs());
});
afterEach(async () => {
  await db.close();
});

const repo = () => createSettingsRepository(db, deps());

describe('ajustes del dispositivo', () => {
  it('en una base recién sembrada: montos visibles, sin proyección, alcance general', async () => {
    await seedDatabase(db, deps());
    expect(await repo().getDevice()).toEqual({ hideAmounts: false, showProjection: false, homeScope: 'general' });
  });

  it('setDevice persiste solo lo indicado y conserva lo demás', async () => {
    await seedDatabase(db, deps());
    await repo().setDevice({ hideAmounts: true });
    await repo().setDevice({ homeScope: 'wallet-7' });
    expect(await repo().getDevice()).toEqual({ hideAmounts: true, showProjection: false, homeScope: 'wallet-7' });
  });

  it('sin semilla devuelve los valores por defecto y setDevice crea la fila', async () => {
    expect(await repo().getDevice()).toEqual({ hideAmounts: false, showProjection: false, homeScope: 'general' });
    await repo().setDevice({ showProjection: true });
    expect(await repo().getDevice()).toEqual({ hideAmounts: false, showProjection: true, homeScope: 'general' });
    expect(await db.getAll('SELECT id FROM device_settings')).toHaveLength(1);
  });

  it('un alcance vacío se rechaza', async () => {
    await seedDatabase(db, deps());
    await expect(repo().setDevice({ homeScope: '' })).rejects.toThrow();
  });
});

describe('umbrales', () => {
  const addWallet = (id: string) =>
    db.execute("INSERT INTO wallets (id, name, wallet_type, icon, color, is_hidden, include_in_general, sort_order) VALUES (?, 'W', 'cash', 'i', '#000000', 0, 1, 0)", [id]);

  it('setThreshold dos veces para PEN global deja una sola fila con el último monto', async () => {
    await repo().setThreshold({ currency: 'PEN', amountMinor: 30000 });
    await repo().setThreshold({ currency: 'PEN', amountMinor: 50000 });
    expect(await repo().listThresholds()).toEqual([{ id: 's-1', currency: 'PEN', amountMinor: 50000, walletId: null }]);
  });

  it('el umbral global y el de una billetera conviven; cada moneda tiene el suyo', async () => {
    await addWallet('w1');
    await repo().setThreshold({ currency: 'PEN', amountMinor: 30000 });
    await repo().setThreshold({ currency: 'PEN', amountMinor: 10000, walletId: 'w1' });
    await repo().setThreshold({ currency: 'USD', amountMinor: 5000 });
    const list = await repo().listThresholds();
    expect(list.map((t) => [t.currency, t.walletId, t.amountMinor]).sort()).toEqual([
      ['PEN', null, 30000],
      ['PEN', 'w1', 10000],
      ['USD', null, 5000],
    ]);
  });

  it('un monto 0 o decimal da INPUT_INVALID y no escribe', async () => {
    for (const amountMinor of [0, 1.5, -1]) {
      const r = await repo().setThreshold({ currency: 'PEN', amountMinor });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('INPUT_INVALID');
    }
    expect(await repo().listThresholds()).toEqual([]);
  });

  it('una billetera inexistente da WALLET_NOT_FOUND', async () => {
    const r = await repo().setThreshold({ currency: 'PEN', amountMinor: 100, walletId: 'nope' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('WALLET_NOT_FOUND');
  });

  it('clearThreshold elimina solo el indicado', async () => {
    await addWallet('w1');
    await repo().setThreshold({ currency: 'PEN', amountMinor: 30000 });
    await repo().setThreshold({ currency: 'PEN', amountMinor: 10000, walletId: 'w1' });
    await repo().clearThreshold('PEN', null);
    expect((await repo().listThresholds()).map((t) => t.walletId)).toEqual(['w1']);
    await repo().clearThreshold('PEN', 'w1');
    expect(await repo().listThresholds()).toEqual([]);
  });
});
