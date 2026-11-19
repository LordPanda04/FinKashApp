import type { Clock, IdGen } from '@/data/types';
import { nameKey } from '@/data/repositories/shared';
import { firstDayOfMonth, monthOf, todayInLima, type IsoDate } from '@/lib/dates';
import { newId as defaultNewId } from '@/lib/id';
import type { LocalDb, LocalTx } from './db';

interface SeedCategory {
  name: string;
  systemKey: 'other' | 'loan' | null;
  color: string;
  icon: string;
}

/** Categorías iniciales: una sola de cada una, sin tipo (gasto/ingreso lo define el movimiento). */
const SEED_CATEGORIES: SeedCategory[] = [
  { name: 'Otros', systemKey: 'other', color: '#6B7280', icon: 'more_horiz' },
  { name: 'Préstamo', systemKey: 'loan', color: '#F59E0B', icon: 'handshake' },
  { name: 'Devolución / Reembolso', systemKey: null, color: '#10B981', icon: 'undo' },
];

/**
 * Las versiones anteriores creaban cada categoría en dos versiones (gasto e ingreso). Aquí se deja
 * una sola por `system_key` (o por nombre, sin distinguir mayúsculas, en las de usuario): se conserva
 * la de menor orden, luego la más antigua, luego la de menor id, y los movimientos de las repetidas
 * pasan a ella. Es idempotente: sin duplicados no escribe nada.
 */
async function consolidateCategories(tx: LocalTx, now: string): Promise<void> {
  const rows = await tx.getAll<{ id: string; name: string; system_key: string | null; sort_order: number; created_at: string | null }>(
    'SELECT id, name, system_key, sort_order, created_at FROM categories',
  );
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.system_key ? `sys:${row.system_key}` : `name:${nameKey(row.name)}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [keeper, ...duplicates] = [...group].sort(
      (a, b) => a.sort_order - b.sort_order || (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id),
    );
    for (const dup of duplicates) {
      await tx.execute('UPDATE movements SET category_id = ?, updated_at = ? WHERE category_id = ?', [keeper!.id, now, dup.id]);
      await tx.execute('DELETE FROM categories WHERE id = ?', [dup.id]);
    }
  }
}

/** Billetera inicial (D51): una sola cuenta en PEN y sin movimiento de apertura (saldo derivado 0). */
const DEFAULT_WALLET = { name: 'Efectivo', walletType: 'cash', icon: 'payments', color: '#6B7280' } as const;

/**
 * Primer arranque (D51): crea "Efectivo" y el periodo del mes ya confirmado (día 1), una sola vez.
 * Solo corre si la marca `default_wallet_seeded` aún no está en 1; si ya hay billeteras (instalaciones
 * anteriores) no crea nada. En todo caso deja la marca en 1.
 */
async function seedDefaultWallet(tx: LocalTx, newId: IdGen, now: string, today: IsoDate): Promise<void> {
  const settings = (await tx.getOptional<{ id: string; default_wallet_seeded: number | null }>(
    'SELECT id, default_wallet_seeded FROM device_settings LIMIT 1',
  ))!;
  if (settings.default_wallet_seeded === 1) return;

  if (!(await tx.getOptional('SELECT id FROM wallets LIMIT 1'))) {
    const walletId = newId();
    await tx.execute(
      `INSERT INTO wallets (id, user_id, name, wallet_type, icon, color, is_hidden, include_in_general, sort_order, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, 0, 1, 0, ?, ?)`,
      [walletId, DEFAULT_WALLET.name, DEFAULT_WALLET.walletType, DEFAULT_WALLET.icon, DEFAULT_WALLET.color, now, now],
    );
    await tx.execute(
      'INSERT INTO accounts (id, user_id, kind, wallet_id, currency, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?, ?)',
      [newId(), 'wallet', walletId, 'PEN', now, now],
    );
    if (!(await tx.getOptional('SELECT id FROM financial_periods WHERE month = ?', [monthOf(today)]))) {
      await tx.execute(
        'INSERT INTO financial_periods (id, user_id, month, started_on, confirmed_at, dismissed_at, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, NULL, ?, ?)',
        [newId(), monthOf(today), firstDayOfMonth(today), now, now, now],
      );
    }
  }
  await tx.execute('UPDATE device_settings SET default_wallet_seeded = 1 WHERE id = ?', [settings.id]);
}

/**
 * Crea lo que la app necesita para funcionar: categorías iniciales, ajustes del dispositivo y, en el
 * primer arranque, la billetera "Efectivo" con su primer periodo; y fusiona las categorías duplicadas
 * de versiones anteriores. Es idempotente: puede correr en cada arranque.
 */
export async function seedDatabase(db: LocalDb, deps: { newId?: IdGen; clock?: Clock } = {}): Promise<void> {
  const newId = deps.newId ?? defaultNewId;
  const instant = (deps.clock ?? (() => new Date()))();
  const now = instant.toISOString();

  await db.writeTransaction(async (tx) => {
    await consolidateCategories(tx, now);
    for (const [index, cat] of SEED_CATEGORIES.entries()) {
      const exists = cat.systemKey
        ? await tx.getOptional('SELECT id FROM categories WHERE system_key = ?', [cat.systemKey])
        : await tx.getOptional('SELECT id FROM categories WHERE name = ?', [cat.name]);
      if (exists) continue;
      await tx.execute(
        `INSERT INTO categories (id, user_id, name, color, icon, system_key, sort_order, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), cat.name, cat.color, cat.icon, cat.systemKey, index, now, now],
      );
    }
    if (!(await tx.getOptional('SELECT id FROM device_settings LIMIT 1'))) {
      await tx.execute(
        'INSERT INTO device_settings (id, hide_amounts, show_projection, home_scope, default_wallet_seeded) VALUES (?, 0, 0, ?, 0)',
        [newId(), 'general'],
      );
    }
    await seedDefaultWallet(tx, newId, now, todayInLima(instant));
  });
}
