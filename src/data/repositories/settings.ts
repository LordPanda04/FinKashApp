import { z } from 'zod';
import type { LocalDb } from '@/data/local/db';
import { RowReader } from '@/data/local/ledgerState';
import type { Currency } from '@/domain/money/money';
import { parseOrError, thresholdInput, type ThresholdInput } from '@/validation/inputs';
import { abort, resolveDeps, transact, type RepoDeps } from './shared';

type Row = Record<string, unknown>;

export interface DeviceSettings {
  hideAmounts: boolean;
  showProjection: boolean;
  /** `general` o el id de la billetera elegida en Inicio. */
  homeScope: string;
  /** Nombre para el saludo: `null` = aún no se pidió, `''` = el usuario lo omitió (D50). */
  displayName: string | null;
}

const DEFAULTS: DeviceSettings = { hideAmounts: false, showProjection: false, homeScope: 'general', displayName: null };

const devicePatch = z.object({
  hideAmounts: z.boolean(),
  showProjection: z.boolean(),
  homeScope: z.string().min(1, 'El alcance de Inicio no puede estar vacío.'),
  displayName: z.string().trim().max(40, 'El nombre puede tener hasta 40 caracteres.'),
}).partial();

function deviceFromRow(row: Row): DeviceSettings {
  const r = new RowReader('device_settings', row);
  return {
    hideAmounts: r.bool('hide_amounts'),
    showProjection: r.bool('show_projection'),
    homeScope: r.text('home_scope'),
    // En instalaciones anteriores la columna llega en NULL: equivale a "aún no se pidió".
    displayName: r.textOrNull('display_name'),
  };
}

export interface ThresholdRecord {
  id: string;
  currency: Currency;
  amountMinor: number;
  walletId: string | null;
}

export function createSettingsRepository(db: LocalDb, depsIn?: RepoDeps) {
  const { newId, now } = resolveDeps(depsIn);

  return {
    async getDevice(): Promise<DeviceSettings> {
      const row = await db.getOptional<Row>('SELECT * FROM device_settings LIMIT 1');
      return row ? deviceFromRow(row) : { ...DEFAULTS };
    },

    /** Guarda solo lo indicado. Lanza si el valor es inválido (es un error de programación, no del usuario). */
    async setDevice(patch: Partial<DeviceSettings>): Promise<void> {
      const value = devicePatch.parse(patch);
      await db.writeTransaction(async (tx) => {
        const row = await tx.getOptional<Row>('SELECT * FROM device_settings LIMIT 1');
        const next = { ...(row ? deviceFromRow(row) : DEFAULTS), ...value };
        const params = [next.hideAmounts ? 1 : 0, next.showProjection ? 1 : 0, next.homeScope, next.displayName];
        if (row) {
          await tx.execute('UPDATE device_settings SET hide_amounts = ?, show_projection = ?, home_scope = ?, display_name = ? WHERE id = ?', [...params, row.id]);
        } else {
          await tx.execute('INSERT INTO device_settings (id, hide_amounts, show_projection, home_scope, display_name) VALUES (?, ?, ?, ?, ?)', [newId(), ...params]);
        }
      });
    },

    async listThresholds(): Promise<ThresholdRecord[]> {
      const rows = await db.getAll<Row>('SELECT * FROM balance_thresholds ORDER BY currency, wallet_id, id');
      return rows.map((row) => {
        const r = new RowReader('balance_thresholds', row);
        return { id: r.text('id'), currency: r.currency('currency'), amountMinor: r.int('amount_minor'), walletId: r.textOrNull('wallet_id') };
      });
    },

    /** Crea o reemplaza el umbral de (moneda, billetera); `walletId` ausente = global de esa moneda. */
    async setThreshold(input: ThresholdInput) {
      const parsed = parseOrError(thresholdInput, input);
      if (!parsed.ok) return parsed;
      const { currency, amountMinor, walletId = null } = parsed.value;
      return transact(db, async (tx) => {
        if (walletId !== null && !(await tx.getOptional('SELECT id FROM wallets WHERE id = ?', [walletId]))) {
          abort('WALLET_NOT_FOUND', 'La billetera no existe.');
        }
        const stamp = now();
        const existing = await tx.getOptional<{ id: string }>(
          'SELECT id FROM balance_thresholds WHERE currency = ? AND wallet_id IS ?',
          [currency, walletId],
        );
        if (existing) {
          await tx.execute('UPDATE balance_thresholds SET amount_minor = ?, updated_at = ? WHERE id = ?', [amountMinor, stamp, existing.id]);
          return { id: existing.id };
        }
        const id = newId();
        await tx.execute(
          'INSERT INTO balance_thresholds (id, user_id, currency, amount_minor, wallet_id, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?, ?)',
          [id, currency, amountMinor, walletId, stamp, stamp],
        );
        return { id };
      });
    },

    async clearThreshold(currency: Currency, walletId: string | null): Promise<void> {
      await db.execute('DELETE FROM balance_thresholds WHERE currency = ? AND wallet_id IS ?', [currency, walletId]);
    },
  };
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
