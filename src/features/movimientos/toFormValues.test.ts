import type { CategoryRecord } from '@/data/types';
import type { Account, Movement } from '@/domain/ledger/types';
import { accountOptions, buildMovementDraft } from './presenter';
import { toFormValues } from './toFormValues';

const TODAY = '2026-11-20';
const mv = (p: Partial<Movement>): Movement => ({
  id: 'm1', type: 'expense', occurredOn: TODAY, description: 'Menú', categoryId: 'food', sourceAccountId: 'yapePen', destAccountId: null,
  amountMinor: 2450, currency: 'PEN', debtId: null, declaredBalanceMinor: null, ...p,
});

describe('toFormValues', () => {
  it('gasto de hoy: monto "24.50" e isToday verdadero', () => {
    expect(toFormValues(mv({}), TODAY)).toEqual({
      kind: 'expense', amountText: '24.50', accountId: 'yapePen', destAccountId: null, categoryId: 'food', debtId: null,
      newDebt: null, description: 'Menú', isToday: true, date: TODAY,
    });
  });

  it('con otra fecha: isToday falso y date la del movimiento', () => {
    expect(toFormValues(mv({ occurredOn: '2026-11-12' }), TODAY)).toMatchObject({ isToday: false, date: '2026-11-12' });
  });

  it('montos redondos y de un solo dígito de céntimos', () => {
    expect(toFormValues(mv({ amountMinor: 184000 }), TODAY).amountText).toBe('1840.00');
    expect(toFormValues(mv({ amountMinor: 5 }), TODAY).amountText).toBe('0.05');
    expect(toFormValues(mv({ amountMinor: 123456789 }), TODAY).amountText).toBe('1234567.89');
  });

  it('ingreso: la cuenta es el destino', () => {
    const v = toFormValues(mv({ type: 'income', sourceAccountId: null, destAccountId: 'plinPen', categoryId: 'salary' }), TODAY);
    expect(v).toMatchObject({ kind: 'income', accountId: 'plinPen', destAccountId: null });
  });

  it('transferencia: origen en accountId y destino en destAccountId, sin categoría', () => {
    const v = toFormValues(mv({ type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'plinPen', categoryId: null, description: null }), TODAY);
    expect(v).toMatchObject({ kind: 'transfer', accountId: 'yapePen', destAccountId: 'plinPen', categoryId: null, description: '' });
  });

  it('conserva la deuda de un préstamo', () => {
    expect(toFormValues(mv({ debtId: 'd1', categoryId: 'loan' }), TODAY).debtId).toBe('d1');
  });

  it.each(['opening', 'adjustment', 'card_payment'] as const)('un movimiento %s no se edita con el formulario', (type) => {
    expect(() => toFormValues(mv({ type }), TODAY)).toThrow();
  });
});

describe('ida y vuelta con buildMovementDraft', () => {
  const accounts: Account[] = [
    { id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
    { id: 'plinPen', kind: 'wallet', walletId: 'w2', currency: 'PEN', creditLimitMinor: null },
  ];
  const wallets = [
    { id: 'w1', name: 'Yape', walletType: 'digital' as const, icon: 'smartphone', color: '#742384', isHidden: false, includeInGeneral: true, sortOrder: 0 },
    { id: 'w2', name: 'Plin', walletType: 'digital' as const, icon: 'smartphone', color: '#00D1A0', isHidden: false, includeInGeneral: true, sortOrder: 1 },
  ];
  const categories: CategoryRecord[] = [
    { id: 'food', name: 'Comida', color: '#1C9C4D', icon: 'restaurant', systemKey: null, sortOrder: 1 },
    { id: 'salary', name: 'Sueldo', color: '#1C9C4D', icon: 'work', systemKey: null, sortOrder: 2 },
  ];

  it.each([
    mv({}),
    mv({ occurredOn: '2026-11-03', amountMinor: 184050 }),
    mv({ type: 'income', sourceAccountId: null, destAccountId: 'plinPen', categoryId: 'salary', description: null }),
    mv({ type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'plinPen', categoryId: null, description: null, amountMinor: 10000 }),
  ])('reproduce el movimiento (sin id)', (m) => {
    const kind = m.type === 'income' ? 'income' : m.type === 'transfer' ? 'transfer' : 'expense';
    const options = accountOptions(wallets, [], accounts, kind);
    const r = buildMovementDraft(toFormValues(m, TODAY), { accounts: options, categories, today: TODAY });
    const { id: _id, ...expected } = m;
    expect(r.ok && r.value.draft).toEqual(expected);
  });
});
