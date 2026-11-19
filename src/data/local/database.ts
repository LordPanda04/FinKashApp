import { PowerSyncDatabase } from '@powersync/react-native';
import { buildSchema } from './powersyncSchema';

let instance: PowerSyncDatabase | null = null;

/**
 * Base local de la app (SQLite de PowerSync con op-sqlite). Singleton: solo debe existir una
 * instancia por archivo. No llama a `connect()`: la sincronización llega en la Fase 9.
 */
export function openLocalDatabase(): PowerSyncDatabase {
  instance ??= new PowerSyncDatabase({
    schema: buildSchema('local'),
    database: { dbFilename: 'finkash.db' },
  });
  return instance;
}
