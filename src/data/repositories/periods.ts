import { z } from 'zod';
import type { LocalDb } from '@/data/local/db';
import { RowReader } from '@/data/local/ledgerState';
import { activePeriodRange, shouldSuggestNewPeriod, type FinancialPeriod } from '@/domain/periods/periods';
import type { DateRange } from '@/domain/reports/home';
import { todayInLima, type IsoDate } from '@/lib/dates';
import { parseOrError, isValidIsoDate } from '@/validation/inputs';
import { abort, resolveDeps, transact, type RepoDeps } from './shared';

type Row = Record<string, unknown>;

function periodFromRow(row: Row): FinancialPeriod {
  const r = new RowReader('financial_periods', row);
  return {
    id: r.text('id'),
    month: r.text('month'),
    startedOn: r.textOrNull('started_on'),
    confirmedAt: r.textOrNull('confirmed_at'),
    dismissedAt: r.textOrNull('dismissed_at'),
  };
}

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes debe tener el formato AAAA-MM.');
const confirmInput = z.object({
  month: monthSchema,
  startedOn: z.string().refine(isValidIsoDate, 'El día de inicio no es una fecha válida (AAAA-MM-DD).').optional(),
});

export function createPeriodRepository(db: LocalDb, depsIn?: RepoDeps) {
  const { newId, clock, now } = resolveDeps(depsIn);
  const today = (): IsoDate => todayInLima(clock());

  const list = async (): Promise<FinancialPeriod[]> =>
    (await db.getAll<Row>('SELECT * FROM financial_periods ORDER BY month, id')).map(periodFromRow);

  return {
    list,

    async shouldSuggest(): Promise<boolean> {
      return shouldSuggestNewPeriod(await list(), today());
    },

    async activeRange(): Promise<DateRange> {
      return activePeriodRange(await list(), today());
    },

    /** Descarta la sugerencia del mes: reaparece al día siguiente (día de Lima). No cambia el periodo activo. */
    async dismiss(month: string): Promise<void> {
      const parsed = parseOrError(monthSchema, month);
      if (!parsed.ok) throw new Error(parsed.error.message);
      await db.writeTransaction(async (tx) => {
        const stamp = now();
        const existing = await tx.getOptional<{ id: string }>('SELECT id FROM financial_periods WHERE month = ?', [month]);
        if (existing) {
          await tx.execute('UPDATE financial_periods SET dismissed_at = ?, updated_at = ? WHERE id = ?', [stamp, stamp, existing.id]);
        } else {
          await tx.execute(
            'INSERT INTO financial_periods (id, user_id, month, started_on, confirmed_at, dismissed_at, created_at, updated_at) VALUES (?, NULL, ?, NULL, NULL, ?, ?, ?)',
            [newId(), month, stamp, stamp, stamp],
          );
        }
      });
    },

    /** Confirma el periodo del mes; empieza el día 1 salvo que se indique otro día. */
    async confirm(input: { month: string; startedOn?: IsoDate }) {
      const parsed = parseOrError(confirmInput, input);
      if (!parsed.ok) return parsed;
      const { month, startedOn } = parsed.value;
      return transact(db, async (tx) => {
        const stamp = now();
        const start = startedOn ?? `${month}-01`;
        const existing = await tx.getOptional<{ id: string; confirmed_at: string | null }>(
          'SELECT id, confirmed_at FROM financial_periods WHERE month = ?',
          [month],
        );
        if (existing?.confirmed_at) abort('PERIOD_ALREADY_CONFIRMED', `El periodo ${month} ya fue confirmado.`);
        let id = existing?.id;
        if (existing) {
          await tx.execute('UPDATE financial_periods SET started_on = ?, confirmed_at = ?, updated_at = ? WHERE id = ?', [start, stamp, stamp, existing.id]);
        } else {
          id = newId();
          await tx.execute(
            'INSERT INTO financial_periods (id, user_id, month, started_on, confirmed_at, dismissed_at, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, NULL, ?, ?)',
            [id, month, start, stamp, stamp, stamp],
          );
        }
        const row = await tx.getOptional<Row>('SELECT * FROM financial_periods WHERE id = ?', [id]);
        return periodFromRow(row!);
      });
    },
  };
}

export type PeriodRepository = ReturnType<typeof createPeriodRepository>;
