/**
 * Definición declarativa del esquema cliente (de `docs/DATABASE_SCHEMA.md`). Es TypeScript puro,
 * sin PowerSync: `powersyncSchema.ts` la traduce al `Schema` de PowerSync y las pruebas la usan
 * para crear una base real. `id` no se declara: PowerSync lo agrega a toda tabla.
 * Dinero: `integer` (unidades mínimas). Booleanos: `integer` 0/1. Fechas y marcas de tiempo: `text`.
 */
import type { TableSpec } from './db';

const AUDIT = { created_at: 'text', updated_at: 'text' } as const;

export const SYNCED_TABLES: TableSpec[] = [
  {
    name: 'wallets',
    columns: {
      user_id: 'text', name: 'text', wallet_type: 'text', icon: 'text', color: 'text',
      is_hidden: 'integer', include_in_general: 'integer', sort_order: 'integer', ...AUDIT,
    },
  },
  {
    name: 'accounts',
    columns: { user_id: 'text', kind: 'text', wallet_id: 'text', currency: 'text', ...AUDIT },
  },
  {
    // `id` = id de la cuenta de tarjeta (relación 1:1 con accounts).
    name: 'credit_cards',
    columns: {
      user_id: 'text', name: 'text', issuer: 'text', icon: 'text', color: 'text',
      credit_limit_minor: 'integer', closing_day: 'integer', due_day: 'integer', is_hidden: 'integer', ...AUDIT,
    },
  },
  {
    name: 'debts',
    columns: {
      user_id: 'text', direction: 'text', counterparty_name: 'text', counterparty_type: 'text',
      currency: 'text', initial_pending_minor: 'integer', due_on: 'text',
      installment_amount_minor: 'integer', installments_remaining: 'integer', next_due_on: 'text',
      notes: 'text', ...AUDIT,
    },
  },
  {
    name: 'categories',
    columns: {
      user_id: 'text', kind: 'text', name: 'text', color: 'text', icon: 'text',
      system_key: 'text', sort_order: 'integer', ...AUDIT,
    },
  },
  {
    name: 'movements',
    columns: {
      user_id: 'text', type: 'text', occurred_on: 'text', description: 'text', category_id: 'text',
      source_account_id: 'text', dest_account_id: 'text', amount_minor: 'integer', currency: 'text',
      debt_id: 'text', declared_balance_minor: 'integer', ...AUDIT,
    },
  },
  {
    name: 'financial_periods',
    columns: {
      user_id: 'text', month: 'text', started_on: 'text', confirmed_at: 'text', dismissed_at: 'text', ...AUDIT,
    },
  },
  {
    name: 'balance_thresholds',
    columns: { user_id: 'text', currency: 'text', amount_minor: 'integer', wallet_id: 'text', ...AUDIT },
  },
];

/** Solo local: nunca se sincroniza ni tiene gemela. */
export const DEVICE_SETTINGS_TABLE: TableSpec = {
  name: 'device_settings',
  columns: { hide_amounts: 'integer', show_projection: 'integer', home_scope: 'text' },
};

export type SchemaMode = 'local' | 'synced';

export interface PlannedTable extends TableSpec {
  viewName: string;
  localOnly: boolean;
}

/**
 * Plan de tablas de PowerSync. Cada tabla sincronizable tiene una gemela `local_<nombre>`.
 * El nombre de la tabla sincronizable es siempre `<nombre>` (coincide con el servidor); lo que
 * cambia según el modo es qué gemela se expone con la vista `<nombre>` que usan las consultas.
 */
export function planTables(mode: SchemaMode): PlannedTable[] {
  const plan: PlannedTable[] = [];
  for (const spec of SYNCED_TABLES) {
    const local = mode === 'local';
    plan.push({
      name: `local_${spec.name}`,
      columns: spec.columns,
      localOnly: true,
      viewName: local ? spec.name : `inactive_local_${spec.name}`,
    });
    plan.push({
      name: spec.name,
      columns: spec.columns,
      localOnly: false,
      viewName: local ? `inactive_synced_${spec.name}` : spec.name,
    });
  }
  plan.push({ ...DEVICE_SETTINGS_TABLE, viewName: DEVICE_SETTINGS_TABLE.name, localOnly: true });
  return plan;
}

/** Tablas con el nombre de vista que usan las consultas (para crear la base de pruebas). */
export function viewTableSpecs(): TableSpec[] {
  return [...SYNCED_TABLES, DEVICE_SETTINGS_TABLE];
}
