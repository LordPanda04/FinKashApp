import type { CardRecord, CategoryRecord, WalletRecord } from '@/data/types';
import type { Account, Movement } from '@/domain/ledger/types';
import { describeMovement, filterMovements, groupByDay, monthLabel, monthsWithMovements } from './presenter';

const TODAY = '2026-11-20';
const wallets: WalletRecord[] = [
  { id: 'w1', name: 'Yape', walletType: 'digital', icon: 'smartphone', color: '#742384', isHidden: false, includeInGeneral: true, sortOrder: 0 },
  { id: 'w2', name: 'Plin', walletType: 'digital', icon: 'smartphone', color: '#00D1A0', isHidden: false, includeInGeneral: true, sortOrder: 1 },
];
const accounts: Account[] = [
  { id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
  { id: 'plinPen', kind: 'wallet', walletId: 'w2', currency: 'PEN', creditLimitMinor: null },
  { id: 'bcp', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 },
];
const cards: CardRecord[] = [{ accountId: 'bcp', name: 'Tarjeta BCP', issuer: null, icon: 'credit_card', color: '#003DA5', creditLimitMinor: 200000, closingDay: null, dueDay: null, isHidden: false }];
const categories: CategoryRecord[] = [
  { id: 'food', name: 'Comida', color: '#1C9C4D', icon: 'restaurant', systemKey: null, sortOrder: 1 },
  { id: 'salary', name: 'Sueldo', color: '#1C9C4D', icon: 'work', systemKey: null, sortOrder: 2 },
];
const ctx = { categories, accounts, wallets, cards };

function mv(p: Partial<Movement> & { id: string }): Movement {
  return {
    type: 'expense', occurredOn: TODAY, description: null, categoryId: null, sourceAccountId: null, destAccountId: null,
    amountMinor: 1000, currency: 'PEN', debtId: null, declaredBalanceMinor: null, ...p,
  };
}

describe('groupByDay', () => {
  it('etiqueta Hoy, Ayer y "14 Nov" y ordena del más reciente al más antiguo', () => {
    const ms = [mv({ id: 'c', occurredOn: '2026-11-14' }), mv({ id: 'a', occurredOn: TODAY }), mv({ id: 'b', occurredOn: '2026-11-19' })];
    const groups = groupByDay(ms, TODAY);
    expect(groups.map((g) => [g.label, g.date])).toEqual([['Hoy', TODAY], ['Ayer', '2026-11-19'], ['14 Nov', '2026-11-14']]);
  });

  it('dentro de un día conserva el orden recibido', () => {
    const ms = [mv({ id: 'x1' }), mv({ id: 'x2' }), mv({ id: 'x3' })];
    expect(groupByDay(ms, TODAY)[0]!.items.map((m) => m.id)).toEqual(['x1', 'x2', 'x3']);
  });

  it('sin movimientos devuelve una lista vacía', () => {
    expect(groupByDay([], TODAY)).toEqual([]);
  });
});

describe('describeMovement', () => {
  it('gasto: ícono y color de la categoría, título = descripción, badge = billetera, signo menos', () => {
    const v = describeMovement(mv({ id: '1', description: 'Menú', categoryId: 'food', sourceAccountId: 'yapePen', amountMinor: 2450 }), ctx);
    expect(v).toMatchObject({ icon: 'restaurant', iconColor: '#1C9C4D', title: 'Menú', badge: 'Yape', badgeColor: '#742384', amountMinor: 2450, currency: 'PEN', sign: 'minus', muted: false });
  });

  it('gasto sin descripción: el título es el nombre de la categoría', () => {
    expect(describeMovement(mv({ id: '1', categoryId: 'food', sourceAccountId: 'yapePen' }), ctx).title).toBe('Comida');
  });

  it('ingreso: signo más y badge de la billetera destino', () => {
    const v = describeMovement(mv({ id: '2', type: 'income', categoryId: 'salary', destAccountId: 'plinPen' }), ctx);
    expect(v).toMatchObject({ sign: 'plus', badge: 'Plin', title: 'Sueldo' });
  });

  it('compra con tarjeta: el badge es el nombre de la tarjeta', () => {
    const v = describeMovement(mv({ id: '3', categoryId: 'food', sourceAccountId: 'bcp' }), ctx);
    expect(v).toMatchObject({ badge: 'Tarjeta BCP', badgeColor: '#003DA5', sign: 'minus' });
  });

  it('transferencia: ícono swap_horiz, "Yape → Plin", sin signo y color neutro', () => {
    const v = describeMovement(mv({ id: '4', type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'plinPen' }), ctx);
    expect(v).toMatchObject({ icon: 'swap_horiz', iconColor: '#86868B', title: 'Transferencia', badge: 'Yape → Plin', sign: 'none', muted: false });
  });

  it('pago de tarjeta: swap_horiz y "Yape → Tarjeta BCP"', () => {
    const v = describeMovement(mv({ id: '5', type: 'card_payment', sourceAccountId: 'yapePen', destAccountId: 'bcp' }), ctx);
    expect(v).toMatchObject({ icon: 'swap_horiz', title: 'Pago de tarjeta', badge: 'Yape → Tarjeta BCP', sign: 'none' });
  });

  it('apertura y arreglo: ícono tune, título fijo, neutros y atenuados', () => {
    const o = describeMovement(mv({ id: '6', type: 'opening', destAccountId: 'yapePen' }), ctx);
    expect(o).toMatchObject({ icon: 'tune', title: 'Apertura', sign: 'none', muted: true, badge: 'Yape' });
    const a = describeMovement(mv({ id: '7', type: 'adjustment', sourceAccountId: 'yapePen', declaredBalanceMinor: 0 }), ctx);
    expect(a).toMatchObject({ icon: 'tune', title: 'Arreglo', sign: 'none', muted: true });
  });

  it('una categoría o cuenta desconocida no rompe la fila', () => {
    const v = describeMovement(mv({ id: '8', categoryId: 'borrada', sourceAccountId: 'fantasma' }), ctx);
    expect(v.title).toBe('Gasto');
    expect(v.badge).toBe('—');
  });
});

describe('filterMovements', () => {
  const ms = [
    mv({ id: 'oct', occurredOn: '2026-10-20', categoryId: 'food', sourceAccountId: 'yapePen' }),
    mv({ id: 'nov1', occurredOn: '2026-11-01', type: 'opening', destAccountId: 'yapePen' }),
    mv({ id: 'nov14', occurredOn: '2026-11-14', categoryId: 'food', sourceAccountId: 'yapePen' }),
    mv({ id: 'nov13', occurredOn: '2026-11-13', categoryId: 'food', sourceAccountId: 'yapePen' }),
    mv({ id: 'nov20', type: 'income', categoryId: 'salary', destAccountId: 'plinPen' }),
    mv({ id: 'tr', occurredOn: '2026-11-18', type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'plinPen' }),
    mv({ id: 'card', occurredOn: '2026-11-19', categoryId: 'food', sourceAccountId: 'bcp' }),
  ];
  const none = { categoryIds: [], walletIds: [], pickedMonth: null };
  const ids = (f: Parameters<typeof filterMovements>[2]) => filterMovements(ms, accounts, f, TODAY).map((m) => m.id);

  it('"Este mes" excluye octubre', () => {
    expect(ids({ date: 'month', ...none })).not.toContain('oct');
    expect(ids({ date: 'month', ...none })).toContain('nov1');
  });
  it('"Mes pasado" incluye solo octubre', () => {
    expect(ids({ date: 'lastMonth', ...none })).toEqual(['oct']);
  });
  it('"Últimos 7 días" incluye del 14 al 20', () => {
    const r = ids({ date: 'last7', ...none });
    expect(r).toContain('nov14');
    expect(r).not.toContain('nov13');
    expect(r).not.toContain('oct');
  });
  it('"Todo" no filtra por fecha', () => {
    expect(ids({ date: 'all', ...none })).toHaveLength(ms.length);
  });
  it('categoría: solo esa categoría', () => {
    expect(ids({ date: 'all', categoryIds: ['salary'], walletIds: [], pickedMonth: null })).toEqual(['nov20']);
  });
  it('billetera: incluye transferencias que la tocan por origen o destino', () => {
    const r = ids({ date: 'all', categoryIds: [], walletIds: ['w2'], pickedMonth: null });
    expect(r).toEqual(expect.arrayContaining(['nov20', 'tr']));
    expect(r).not.toContain('nov14');
  });
  it('una tarjeta se filtra por el id de su cuenta', () => {
    expect(ids({ date: 'all', categoryIds: [], walletIds: ['bcp'], pickedMonth: null })).toEqual(['card']);
  });
  it('combina fecha, categoría y billetera', () => {
    expect(ids({ date: 'month', categoryIds: ['food'], walletIds: ['w1'], pickedMonth: null }).sort()).toEqual(['nov13', 'nov14']);
  });
  it('filtros vacíos y fecha "all" devuelven todo', () => {
    expect(ids({ date: 'all', ...none })).toHaveLength(7);
  });
});

describe('filterMovements — elegir un mes', () => {
  const ms = [
    mv({ id: 'sep30', occurredOn: '2026-09-30', categoryId: 'food', sourceAccountId: 'yapePen' }),
    mv({ id: 'oct01', occurredOn: '2026-10-01', categoryId: 'food', sourceAccountId: 'yapePen' }),
    mv({ id: 'oct31', occurredOn: '2026-10-31', categoryId: 'food', sourceAccountId: 'plinPen' }),
    mv({ id: 'oct15', occurredOn: '2026-10-15', type: 'income', categoryId: 'salary', sourceAccountId: null, destAccountId: 'plinPen' }),
    mv({ id: 'nov01', occurredOn: '2026-11-01', categoryId: 'food', sourceAccountId: 'yapePen' }),
  ];
  const ids = (f: Parameters<typeof filterMovements>[2]) => filterMovements(ms, accounts, f, TODAY).map((m) => m.id).sort();

  it('deja solo los movimientos de ese mes, incluidos el primer y el último día', () => {
    expect(ids({ date: 'pick', pickedMonth: '2026-10', categoryIds: [], walletIds: [] })).toEqual(['oct01', 'oct15', 'oct31']);
  });

  it('sigue combinándose con los filtros de categoría y de billetera', () => {
    expect(ids({ date: 'pick', pickedMonth: '2026-10', categoryIds: ['food'], walletIds: ['w2'] })).toEqual(['oct31']);
    expect(ids({ date: 'pick', pickedMonth: '2026-10', categoryIds: ['salary'], walletIds: ['w1'] })).toEqual([]);
  });

  it('un mes sin movimientos da lista vacía', () => {
    expect(ids({ date: 'pick', pickedMonth: '2026-08', categoryIds: [], walletIds: [] })).toEqual([]);
  });

  it('"pick" sin mes elegido se comporta como "Este mes"', () => {
    expect(ids({ date: 'pick', pickedMonth: null, categoryIds: [], walletIds: [] })).toEqual(['nov01']);
  });
});

describe('monthsWithMovements', () => {
  const at = (id: string, occurredOn: string) => mv({ id, occurredOn });

  it('lista los meses con movimientos y el mes actual, del más reciente al más antiguo y sin repetir', () => {
    const list = [at('a', '2026-09-30'), at('b', '2026-10-01'), at('c', '2026-10-31'), at('d', '2026-09-01')];
    expect(monthsWithMovements(list, TODAY)).toEqual(['2026-11', '2026-10', '2026-09']);
  });

  it('sin movimientos ofrece solo el mes actual', () => {
    expect(monthsWithMovements([], TODAY)).toEqual(['2026-11']);
  });

  it('no ofrece meses vacíos intermedios', () => {
    expect(monthsWithMovements([at('a', '2026-07-10')], TODAY)).toEqual(['2026-11', '2026-07']);
  });

  it('conserva un mes futuro si hay movimientos allí', () => {
    expect(monthsWithMovements([at('a', '2026-12-05')], TODAY)).toEqual(['2026-12', '2026-11']);
  });
});

describe('monthLabel', () => {
  it('da el mes en español con su año', () => {
    expect(monthLabel('2026-10')).toBe('Octubre 2026');
    expect(monthLabel('2027-01')).toBe('Enero 2027');
  });
});
