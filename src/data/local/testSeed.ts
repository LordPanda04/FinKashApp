/**
 * Solo para pruebas (nunca se importa desde la app): siembra la base como una instalación que ya
 * pasó por el primer arranque, es decir, con la marca `default_wallet_seeded` en 1 y por lo tanto sin
 * la billetera "Efectivo" ni el periodo inicial. Sirve para probar repositorios sobre un libro vacío.
 */
import type { Clock, IdGen } from '@/data/types';
import type { LocalDb } from './db';
import { seedDatabase } from './seed';

export async function seedWithoutDefaultWallet(db: LocalDb, deps: { newId?: IdGen; clock?: Clock } = {}): Promise<void> {
  await db.execute(
    "INSERT INTO device_settings (id, hide_amounts, show_projection, home_scope, default_wallet_seeded) VALUES ('test-device', 0, 0, 'general', 1)",
  );
  await seedDatabase(db, deps);
}
