import type { Clock, IdGen } from '@/data/types';
import { newId as defaultNewId } from '@/lib/id';
import type { LocalDb } from './db';

interface SeedCategory {
  name: string;
  systemKey: 'other' | 'loan' | null;
  color: string;
  icon: string;
}

/** Categorías de sistema (y "Devolución / Reembolso"), cada una en versión de gasto y de ingreso. */
const SEED_CATEGORIES: SeedCategory[] = [
  { name: 'Otros', systemKey: 'other', color: '#6B7280', icon: 'more_horiz' },
  { name: 'Préstamo', systemKey: 'loan', color: '#F59E0B', icon: 'handshake' },
  { name: 'Devolución / Reembolso', systemKey: null, color: '#10B981', icon: 'undo' },
];

/**
 * Crea lo que la app necesita para funcionar: categorías de sistema y ajustes del dispositivo.
 * Es idempotente: solo inserta lo que falta, así que puede correr en cada arranque.
 */
export async function seedDatabase(db: LocalDb, deps: { newId?: IdGen; clock?: Clock } = {}): Promise<void> {
  const newId = deps.newId ?? defaultNewId;
  const now = (deps.clock ?? (() => new Date()))().toISOString();

  await db.writeTransaction(async (tx) => {
    for (const kind of ['expense', 'income'] as const) {
      for (const [index, cat] of SEED_CATEGORIES.entries()) {
        const exists = cat.systemKey
          ? await tx.getOptional('SELECT id FROM categories WHERE kind = ? AND system_key = ?', [kind, cat.systemKey])
          : await tx.getOptional('SELECT id FROM categories WHERE kind = ? AND name = ?', [kind, cat.name]);
        if (exists) continue;
        await tx.execute(
          `INSERT INTO categories (id, user_id, kind, name, color, icon, system_key, sort_order, created_at, updated_at)
           VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newId(), kind, cat.name, cat.color, cat.icon, cat.systemKey, index, now, now],
        );
      }
    }
    if (!(await tx.getOptional('SELECT id FROM device_settings LIMIT 1'))) {
      await tx.execute(
        'INSERT INTO device_settings (id, hide_amounts, show_projection, home_scope) VALUES (?, 0, 0, ?)',
        [newId(), 'general'],
      );
    }
  });
}
