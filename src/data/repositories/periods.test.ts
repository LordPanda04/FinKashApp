/** @jest-environment node */
import { viewTableSpecs } from '@/data/local/schema';
import { createTestDb, type TestDb } from '@/data/local/testDb';
import { createPeriodRepository } from './periods';

let db: TestDb;
let n: number;
const at = (iso: string) => ({ newId: () => `p-${++n}`, clock: () => new Date(iso) });

beforeEach(async () => {
  n = 0;
  db = await createTestDb(viewTableSpecs());
});
afterEach(async () => {
  await db.close();
});

const repo = (iso: string) => createPeriodRepository(db, at(iso));

describe('primer uso (sin periodos)', () => {
  it('sugiere crear el periodo y el activo va del día 1 del mes a hoy', async () => {
    const r = repo('2026-11-17T15:00:00Z');
    expect(await r.shouldSuggest()).toBe(true);
    expect(await r.activeRange()).toEqual({ start: '2026-11-01', end: '2026-11-17' });
    expect(await r.list()).toEqual([]);
  });
});

describe('confirm', () => {
  it('confirmar diciembre el 2/12 inicia el 1/12, deja de sugerir y fija el rango', async () => {
    const r = repo('2026-12-02T15:00:00Z');
    const c = await r.confirm({ month: '2026-12' });
    expect(c.ok).toBe(true);
    if (c.ok) {
      expect(c.value).toMatchObject({ month: '2026-12', startedOn: '2026-12-01', confirmedAt: '2026-12-02T15:00:00.000Z', dismissedAt: null });
    }
    expect(await r.shouldSuggest()).toBe(false);
    expect(await r.activeRange()).toEqual({ start: '2026-12-01', end: '2026-12-02' });
  });

  it('acepta un día de inicio explícito', async () => {
    const r = repo('2026-12-05T15:00:00Z');
    const c = await r.confirm({ month: '2026-12', startedOn: '2026-12-03' });
    expect(c.ok && c.value.startedOn).toBe('2026-12-03');
    expect(await r.activeRange()).toEqual({ start: '2026-12-03', end: '2026-12-05' });
  });

  it('el periodo anterior sigue activo hasta confirmar el nuevo (nunca se borra nada)', async () => {
    await repo('2026-11-02T15:00:00Z').confirm({ month: '2026-11' });
    const dec = repo('2026-12-02T15:00:00Z');
    expect(await dec.shouldSuggest()).toBe(true);
    expect(await dec.activeRange()).toEqual({ start: '2026-11-01', end: '2026-12-02' });
    await dec.confirm({ month: '2026-12' });
    expect((await dec.list()).map((p) => p.month)).toEqual(['2026-11', '2026-12']);
  });

  it('un mes mal escrito o un día inválido da INPUT_INVALID y no escribe', async () => {
    const r = repo('2026-12-02T15:00:00Z');
    for (const bad of [{ month: '2026-13' }, { month: 'diciembre' }, { month: '2026-12', startedOn: '2026-12-32' }]) {
      const c = await r.confirm(bad);
      expect(c.ok).toBe(false);
      if (!c.ok) expect(c.error.code).toBe('INPUT_INVALID');
    }
    expect(await r.list()).toEqual([]);
  });

  it('confirmar dos veces el mismo mes da PERIOD_ALREADY_CONFIRMED', async () => {
    const r = repo('2026-12-02T15:00:00Z');
    await r.confirm({ month: '2026-12' });
    const again = await r.confirm({ month: '2026-12' });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe('PERIOD_ALREADY_CONFIRMED');
    expect(await r.list()).toHaveLength(1);
  });

  it('confirmar un mes antes descartado conserva la fila (no duplica)', async () => {
    const r = repo('2026-12-02T15:00:00Z');
    await r.dismiss('2026-12');
    const c = await r.confirm({ month: '2026-12' });
    expect(c.ok).toBe(true);
    expect(await r.list()).toHaveLength(1);
  });
});

describe('dismiss', () => {
  it('descartar el 2/12 oculta la sugerencia ese día y reaparece el 3/12', async () => {
    await repo('2026-11-02T15:00:00Z').confirm({ month: '2026-11' });
    await repo('2026-12-02T15:00:00Z').dismiss('2026-12');
    expect(await repo('2026-12-02T20:00:00Z').shouldSuggest()).toBe(false);
    expect(await repo('2026-12-03T15:00:00Z').shouldSuggest()).toBe(true);
  });

  it('descartar no cambia el periodo activo', async () => {
    await repo('2026-11-02T15:00:00Z').confirm({ month: '2026-11' });
    await repo('2026-12-02T15:00:00Z').dismiss('2026-12');
    expect(await repo('2026-12-02T15:00:00Z').activeRange()).toEqual({ start: '2026-11-01', end: '2026-12-02' });
  });

  it('descartar varias veces actualiza la misma fila', async () => {
    await repo('2026-12-02T15:00:00Z').dismiss('2026-12');
    await repo('2026-12-03T15:00:00Z').dismiss('2026-12');
    const list = await repo('2026-12-03T15:00:00Z').list();
    expect(list).toHaveLength(1);
    expect(list[0]!.dismissedAt).toBe('2026-12-03T15:00:00.000Z');
  });

  it('el descarte de las 22:00 en Lima (03:00Z del día siguiente) cuenta como ese día de Lima', async () => {
    await repo('2026-11-02T15:00:00Z').confirm({ month: '2026-11' });
    await repo('2026-12-03T03:00:00Z').dismiss('2026-12'); // 22:00 del 2/12 en Lima
    expect(await repo('2026-12-03T03:30:00Z').shouldSuggest()).toBe(false); // sigue siendo 2/12 en Lima
    expect(await repo('2026-12-03T15:00:00Z').shouldSuggest()).toBe(true);
  });
});
