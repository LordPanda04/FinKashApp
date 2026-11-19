import type { CardRecord, CategoryRecord, WalletRecord } from '@/data/types';
import type { Account } from '@/domain/ledger/types';
import type { DomainError } from '@/lib/result';
import {
  accountOptions,
  blockedNotice,
  buildMovementDraft,
  categoryOptions,
  destOptions,
  type FormValues,
} from './presenter';

const wallet = (id: string, name: string, sortOrder: number, isHidden = false): WalletRecord => ({
  id, name, walletType: 'digital', icon: 'smartphone', color: '#742384', isHidden, includeInGeneral: true, sortOrder,
});
const wallets = [wallet('w1', 'Yape', 0), wallet('w2', 'Plin', 1), wallet('w3', 'Oculta', 2, true)];
const accounts: Account[] = [
  { id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
  { id: 'yapeUsd', kind: 'wallet', walletId: 'w1', currency: 'USD', creditLimitMinor: null },
  { id: 'plinPen', kind: 'wallet', walletId: 'w2', currency: 'PEN', creditLimitMinor: null },
  { id: 'ocultaPen', kind: 'wallet', walletId: 'w3', currency: 'PEN', creditLimitMinor: null },
  { id: 'bcp', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 },
  { id: 'hiddenCard', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 100000 },
];
const card = (accountId: string, name: string, isHidden = false): CardRecord => ({
  accountId, name, issuer: null, icon: 'credit_card', color: '#003DA5', creditLimitMinor: 100000, closingDay: null, dueDay: null, isHidden,
});
const cards = [card('bcp', 'Tarjeta BCP'), card('hiddenCard', 'Tarjeta oculta', true)];
const cat = (id: string, kind: 'expense' | 'income', name: string, systemKey: 'other' | 'loan' | null = null, sortOrder = 0): CategoryRecord => ({
  id, kind, name, color: '#1C9C4D', icon: 'category', systemKey, sortOrder,
});
const categories = [
  cat('food', 'expense', 'Comida', null, 1),
  cat('loanExp', 'expense', 'Préstamo', 'loan', 2),
  cat('salary', 'income', 'Sueldo', null, 1),
];

describe('accountOptions', () => {
  it('gasto: billeteras y tarjetas visibles, con etiqueta "Nombre · símbolo"', () => {
    const o = accountOptions(wallets, cards, accounts, 'expense');
    expect(o.map((x) => x.label)).toEqual(['Yape · S/', 'Yape · $', 'Plin · S/', 'Tarjeta BCP']);
  });

  it('ingreso y transferencia: sin tarjetas', () => {
    for (const kind of ['income', 'transfer'] as const) {
      expect(accountOptions(wallets, cards, accounts, kind).map((x) => x.id)).toEqual(['yapePen', 'yapeUsd', 'plinPen']);
    }
  });

  it('no incluye billeteras ni tarjetas ocultas', () => {
    const ids = accountOptions(wallets, cards, accounts, 'expense').map((x) => x.id);
    expect(ids).not.toContain('ocultaPen');
    expect(ids).not.toContain('hiddenCard');
  });

  it('cada opción trae su moneda y tipo', () => {
    const o = accountOptions(wallets, cards, accounts, 'expense');
    expect(o.find((x) => x.id === 'yapeUsd')).toMatchObject({ currency: 'USD', kind: 'wallet', walletName: 'Yape' });
    expect(o.find((x) => x.id === 'bcp')).toMatchObject({ currency: 'PEN', kind: 'credit_card' });
  });
});

describe('destOptions', () => {
  const options = accountOptions(wallets, cards, accounts, 'transfer');
  it('solo cuentas de la misma moneda y distintas del origen', () => {
    const from = options.find((o) => o.id === 'yapePen')!;
    expect(destOptions(options, from).map((o) => o.id)).toEqual(['plinPen']);
  });
  it('sin origen devuelve todas', () => {
    expect(destOptions(options, null)).toHaveLength(3);
  });
});

describe('categoryOptions', () => {
  it('filtra por tipo y ordena', () => {
    expect(categoryOptions(categories, 'expense').map((c) => c.id)).toEqual(['food', 'loanExp']);
    expect(categoryOptions(categories, 'income').map((c) => c.id)).toEqual(['salary']);
  });
});

describe('buildMovementDraft', () => {
  const opts = accountOptions(wallets, cards, accounts, 'expense');
  const ctx = { accounts: opts, categories, today: '2026-11-20' };
  const base: FormValues = {
    kind: 'expense', amountText: '24.50', accountId: 'yapePen', destAccountId: null, categoryId: 'food',
    debtId: null, newDebt: null, description: '', isToday: true, date: '2026-11-20',
  };
  const err = (v: Partial<FormValues>) => {
    const r = buildMovementDraft({ ...base, ...v }, ctx);
    if (r.ok) throw new Error('se esperaba un error');
    return r.error.code;
  };

  it('arma un gasto con monto en céntimos, moneda de la cuenta y fecha de hoy', () => {
    const r = buildMovementDraft({ ...base, amountText: '1,840.50', description: ' menú ' }, ctx);
    expect(r).toEqual({
      ok: true,
      value: {
        newDebt: null,
        draft: {
          type: 'expense', occurredOn: '2026-11-20', description: 'menú', categoryId: 'food', sourceAccountId: 'yapePen',
          destAccountId: null, amountMinor: 184050, currency: 'PEN', debtId: null, declaredBalanceMinor: null,
        },
      },
    });
  });

  it('un ingreso usa la cuenta como destino', () => {
    const r = buildMovementDraft({ ...base, kind: 'income', categoryId: 'salary' }, ctx);
    expect(r.ok && r.value.draft).toMatchObject({ type: 'income', sourceAccountId: null, destAccountId: 'yapePen', categoryId: 'salary' });
  });

  it('la moneda sale de la cuenta (USD)', () => {
    const r = buildMovementDraft({ ...base, accountId: 'yapeUsd' }, ctx);
    expect(r.ok && r.value.draft.currency).toBe('USD');
  });

  it('descripción vacía queda null', () => {
    const r = buildMovementDraft({ ...base, description: '   ' }, ctx);
    expect(r.ok && r.value.draft.description).toBeNull();
  });

  it.each(['24,50', '0', '', 'abc', '-5'])('monto %j → AMOUNT_INVALID', (amountText) => {
    expect(err({ amountText })).toBe('AMOUNT_INVALID');
  });

  it('sin cuenta → ACCOUNT_REQUIRED', () => {
    expect(err({ accountId: null })).toBe('ACCOUNT_REQUIRED');
  });

  it('gasto o ingreso sin categoría → CATEGORY_REQUIRED', () => {
    expect(err({ categoryId: null })).toBe('CATEGORY_REQUIRED');
    expect(err({ kind: 'income', categoryId: null })).toBe('CATEGORY_REQUIRED');
  });

  it('categoría "Préstamo" sin deuda → DEBT_REQUIRED; con deuda existente la vincula', () => {
    expect(err({ categoryId: 'loanExp' })).toBe('DEBT_REQUIRED');
    const r = buildMovementDraft({ ...base, categoryId: 'loanExp', debtId: 'd1' }, ctx);
    expect(r.ok && r.value.draft.debtId).toBe('d1');
    expect(r.ok && r.value.newDebt).toBeNull();
  });

  it('categoría "Préstamo" con deuda nueva devuelve los datos de la deuda y debtId null', () => {
    const newDebt = { counterpartyName: 'Carlos', counterpartyType: 'person' as const };
    const r = buildMovementDraft({ ...base, categoryId: 'loanExp', newDebt }, ctx);
    expect(r.ok && r.value.draft.debtId).toBeNull();
    expect(r.ok && r.value.newDebt).toEqual(newDebt);
  });

  it('una deuda sobrante con una categoría que no es Préstamo se ignora', () => {
    const r = buildMovementDraft({ ...base, debtId: 'd1', newDebt: { counterpartyName: 'X', counterpartyType: 'person' } }, ctx);
    expect(r.ok && r.value.draft.debtId).toBeNull();
    expect(r.ok && r.value.newDebt).toBeNull();
  });

  it('con "¿Es de hoy?" apagado usa la fecha elegida', () => {
    const r = buildMovementDraft({ ...base, isToday: false, date: '2026-11-03' }, ctx);
    expect(r.ok && r.value.draft.occurredOn).toBe('2026-11-03');
  });

  describe('transferencia', () => {
    const t = (v: Partial<FormValues>) => buildMovementDraft({ ...base, kind: 'transfer', categoryId: null, destAccountId: 'plinPen', ...v }, ctx);

    it('arma origen y destino sin categoría ni deuda', () => {
      const r = t({});
      expect(r.ok && r.value.draft).toMatchObject({ type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'plinPen', categoryId: null, debtId: null, amountMinor: 2450, currency: 'PEN' });
    });
    it('sin destino → DEST_REQUIRED', () => {
      const r = t({ destAccountId: null });
      expect(!r.ok && r.error.code).toBe('DEST_REQUIRED');
    });
    it('a la misma cuenta → SAME_ACCOUNT', () => {
      const r = t({ destAccountId: 'yapePen' });
      expect(!r.ok && r.error.code).toBe('SAME_ACCOUNT');
    });
    it('entre monedas distintas → CURRENCY_MISMATCH', () => {
      const r = t({ destAccountId: 'yapeUsd' });
      expect(!r.ok && r.error.code).toBe('CURRENCY_MISMATCH');
    });
    it('ignora categoría y deuda aunque sobren en el formulario', () => {
      const r = t({ categoryId: 'food', debtId: 'd1' });
      expect(r.ok && r.value.draft).toMatchObject({ categoryId: null, debtId: null });
    });
  });
});

describe('blockedNotice', () => {
  const timeline = (code: string, message: string): DomainError => ({
    code: 'TIMELINE_VIOLATION', message, details: { violations: [{ code, entityId: 'a', date: '2026-11-20', shortfallMinor: 8000 }] },
  });

  it('WALLET_NEGATIVE: título, mensaje del dominio (día y faltante) y sugerencia', () => {
    const n = blockedNotice(timeline('WALLET_NEGATIVE', 'La billetera quedaría con saldo negativo el 2026-11-20: faltan S/ 80.00.'));
    expect(n?.title).toBe('Saldo insuficiente');
    expect(n?.message).toContain('2026-11-20');
    expect(n?.message).toContain('S/ 80.00');
    expect(n?.suggestion).toBe('Registra antes un ingreso (categoría «Otros») para cubrir la diferencia.');
  });

  it.each([
    ['CARD_OVER_LIMIT', 'Línea de crédito superada'],
    ['CARD_OVERPAID', 'Pago mayor al consumo'],
    ['DEBT_NEGATIVE', 'Deuda sobrepagada'],
  ])('%s: título "%s" y sin sugerencia', (code, title) => {
    const n = blockedNotice(timeline(code, 'mensaje'));
    expect(n).toMatchObject({ title, message: 'mensaje', suggestion: null });
  });

  it('otros errores no son un aviso de bloqueo', () => {
    expect(blockedNotice({ code: 'AMOUNT_INVALID', message: 'x' })).toBeNull();
  });
});
