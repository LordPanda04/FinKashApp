import { DEVICE_SETTINGS_TABLE, planTables, SYNCED_TABLES, viewTableSpecs } from './schema';

const NAMES = [
  'wallets',
  'accounts',
  'credit_cards',
  'debts',
  'categories',
  'movements',
  'financial_periods',
  'balance_thresholds',
];

describe('SYNCED_TABLES', () => {
  it('define las 8 tablas sincronizables de DATABASE_SCHEMA.md', () => {
    expect(SYNCED_TABLES.map((t) => t.name)).toEqual(NAMES);
  });

  it('movements guarda dinero y fechas con el tipo correcto', () => {
    const m = SYNCED_TABLES.find((t) => t.name === 'movements')!;
    expect(m.columns).toMatchObject({
      type: 'text',
      occurred_on: 'text',
      amount_minor: 'integer',
      declared_balance_minor: 'integer',
      currency: 'text',
      source_account_id: 'text',
      dest_account_id: 'text',
      debt_id: 'text',
      category_id: 'text',
      user_id: 'text',
    });
  });

  it('no declara la columna id (PowerSync la agrega)', () => {
    for (const t of [...SYNCED_TABLES, DEVICE_SETTINGS_TABLE]) expect(t.columns).not.toHaveProperty('id');
  });

  it('todo monto termina en _minor y es integer', () => {
    for (const t of SYNCED_TABLES) {
      for (const [name, type] of Object.entries(t.columns)) {
        if (name.endsWith('_minor')) expect(type).toBe('integer');
      }
    }
  });

  it('device_settings es solo local y no está entre las sincronizables', () => {
    expect(DEVICE_SETTINGS_TABLE.name).toBe('device_settings');
    expect(NAMES).not.toContain('device_settings');
  });

  it('device_settings guarda el nombre y la marca de billetera inicial (D50, D51)', () => {
    expect(DEVICE_SETTINGS_TABLE.columns).toMatchObject({ display_name: 'text', default_wallet_seeded: 'integer' });
  });
});

describe('planTables', () => {
  it('modo local: la tabla local usa el nombre de vista y la sincronizable queda inactiva', () => {
    const plan = planTables('local');
    const local = plan.find((t) => t.name === 'local_movements')!;
    const synced = plan.find((t) => t.name === 'movements')!;
    expect(local).toMatchObject({ viewName: 'movements', localOnly: true });
    expect(synced).toMatchObject({ viewName: 'inactive_synced_movements', localOnly: false });
  });

  it('modo sincronizado: se invierten las vistas', () => {
    const plan = planTables('synced');
    expect(plan.find((t) => t.name === 'movements')).toMatchObject({ viewName: 'movements', localOnly: false });
    expect(plan.find((t) => t.name === 'local_movements')).toMatchObject({
      viewName: 'inactive_local_movements',
      localOnly: true,
    });
  });

  it('en ambos modos las dos gemelas comparten columnas y device_settings va una sola vez', () => {
    for (const mode of ['local', 'synced'] as const) {
      const plan = planTables(mode);
      expect(plan).toHaveLength(NAMES.length * 2 + 1);
      expect(plan.find((t) => t.name === 'local_wallets')!.columns).toEqual(
        plan.find((t) => t.name === 'wallets')!.columns,
      );
      expect(plan.filter((t) => t.name === 'device_settings')).toEqual([
        { name: 'device_settings', viewName: 'device_settings', localOnly: true, columns: DEVICE_SETTINGS_TABLE.columns },
      ]);
    }
  });

  it('no hay dos tablas con el mismo nombre ni la misma vista', () => {
    for (const mode of ['local', 'synced'] as const) {
      const plan = planTables(mode);
      expect(new Set(plan.map((t) => t.name)).size).toBe(plan.length);
      expect(new Set(plan.map((t) => t.viewName)).size).toBe(plan.length);
    }
  });
});

describe('viewTableSpecs', () => {
  it('lista las tablas con el nombre de vista que usan las consultas', () => {
    expect(viewTableSpecs().map((t) => t.name)).toEqual([...NAMES, 'device_settings']);
  });
});
