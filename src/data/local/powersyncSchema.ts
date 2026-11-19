import { column, Schema, Table } from '@powersync/react-native';
import { planTables, type SchemaMode } from './schema';

/** Traduce el plan declarativo (`schema.ts`) al `Schema` de PowerSync. */
export function buildSchema(mode: SchemaMode): Schema {
  const tables: Record<string, Table> = {};
  for (const planned of planTables(mode)) {
    const columns = Object.fromEntries(
      Object.entries(planned.columns).map(([name, type]) => [name, type === 'integer' ? column.integer : column.text]),
    );
    tables[planned.name] = new Table(columns, { localOnly: planned.localOnly, viewName: planned.viewName });
  }
  return new Schema(tables);
}
