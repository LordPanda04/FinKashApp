import { cardInput, categoryInput, debtInput, parseOrError, thresholdInput, walletInput } from './inputs';

function fieldsOf(r: ReturnType<typeof parseOrError>): string[] {
  if (r.ok) throw new Error('se esperaba un error');
  expect(r.error.code).toBe('INPUT_INVALID');
  return Object.keys((r.error.details as { fields: Record<string, string> }).fields);
}

const goodCategory = { kind: 'expense', name: 'Comida', color: '#1A2B3C', icon: 'restaurant' };

describe('categoryInput', () => {
  it('acepta una categoría válida y recorta espacios del nombre', () => {
    const r = parseOrError(categoryInput, { ...goodCategory, name: '  Comida ' });
    expect(r).toEqual({ ok: true, value: { ...goodCategory, name: 'Comida' } });
  });

  it('rechaza nombre vacío, solo espacios o de 41 caracteres', () => {
    expect(fieldsOf(parseOrError(categoryInput, { ...goodCategory, name: '' }))).toEqual(['name']);
    expect(fieldsOf(parseOrError(categoryInput, { ...goodCategory, name: '   ' }))).toEqual(['name']);
    expect(fieldsOf(parseOrError(categoryInput, { ...goodCategory, name: 'a'.repeat(41) }))).toEqual(['name']);
    expect(parseOrError(categoryInput, { ...goodCategory, name: 'a'.repeat(40) }).ok).toBe(true);
  });

  it.each(['red', '#12345', '#GGGGGG', '1A2B3C'])('rechaza el color %j', (color) => {
    expect(fieldsOf(parseOrError(categoryInput, { ...goodCategory, color }))).toEqual(['color']);
  });

  it('rechaza un tipo desconocido y un ícono vacío', () => {
    expect(fieldsOf(parseOrError(categoryInput, { ...goodCategory, kind: 'transfer' }))).toEqual(['kind']);
    expect(fieldsOf(parseOrError(categoryInput, { ...goodCategory, icon: '' }))).toEqual(['icon']);
  });

  it('el mensaje de error está en español', () => {
    const r = parseOrError(categoryInput, { ...goodCategory, name: '' });
    if (!r.ok) expect(r.error.message).toMatch(/nombre/i);
  });
});

const goodWallet = { name: 'Yape', walletType: 'digital', icon: 'phone', color: '#7B2CBF', currencies: ['PEN', 'USD'] };

describe('walletInput', () => {
  it('acepta una billetera con una o dos monedas distintas', () => {
    expect(parseOrError(walletInput, goodWallet).ok).toBe(true);
    expect(parseOrError(walletInput, { ...goodWallet, currencies: ['PEN'] }).ok).toBe(true);
  });

  it('rechaza monedas vacías, repetidas o desconocidas', () => {
    expect(fieldsOf(parseOrError(walletInput, { ...goodWallet, currencies: [] }))).toEqual(['currencies']);
    expect(fieldsOf(parseOrError(walletInput, { ...goodWallet, currencies: ['PEN', 'PEN'] }))).toEqual(['currencies']);
    expect(fieldsOf(parseOrError(walletInput, { ...goodWallet, currencies: ['EUR'] }))).toEqual(['currencies.0']);
  });

  it('rechaza un tipo de billetera desconocido', () => {
    expect(fieldsOf(parseOrError(walletInput, { ...goodWallet, walletType: 'banco' }))).toEqual(['walletType']);
  });
});

const goodCard = { name: 'Tarjeta BCP', icon: 'credit_card', color: '#003DA5', currency: 'PEN', creditLimitMinor: 200000 };

describe('cardInput', () => {
  it('acepta una tarjeta válida con días opcionales', () => {
    expect(parseOrError(cardInput, { ...goodCard, closingDay: 20, dueDay: 15, issuer: 'BCP' }).ok).toBe(true);
  });

  it.each([0, -1, 1.5])('rechaza una línea de crédito de %p', (creditLimitMinor) => {
    expect(fieldsOf(parseOrError(cardInput, { ...goodCard, creditLimitMinor }))).toEqual(['creditLimitMinor']);
  });

  it.each([0, 32, 1.5])('rechaza dueDay %p', (dueDay) => {
    expect(fieldsOf(parseOrError(cardInput, { ...goodCard, dueDay }))).toEqual(['dueDay']);
  });
});

const goodDebt = {
  direction: 'payable',
  counterpartyName: 'Interbank',
  counterpartyType: 'institution',
  currency: 'PEN',
  initialPendingMinor: 89000,
};

describe('debtInput', () => {
  it('acepta una deuda con cuota y fechas válidas', () => {
    expect(
      parseOrError(debtInput, { ...goodDebt, installmentAmountMinor: 44500, nextDueOn: '2026-11-25', dueOn: '2027-05-25' }).ok,
    ).toBe(true);
  });

  it('acepta saldo inicial 0 y rechaza negativo o decimal', () => {
    expect(parseOrError(debtInput, { ...goodDebt, initialPendingMinor: 0 }).ok).toBe(true);
    expect(fieldsOf(parseOrError(debtInput, { ...goodDebt, initialPendingMinor: -1 }))).toEqual(['initialPendingMinor']);
    expect(fieldsOf(parseOrError(debtInput, { ...goodDebt, initialPendingMinor: 10.5 }))).toEqual(['initialPendingMinor']);
  });

  it.each(['2026-02-30', '2026-13-01', '25/11/2026', '2026-2-3'])('rechaza la fecha %j (debe existir en el calendario)', (nextDueOn) => {
    expect(fieldsOf(parseOrError(debtInput, { ...goodDebt, nextDueOn }))).toEqual(['nextDueOn']);
  });

  it('acepta el 29 de febrero solo en año bisiesto', () => {
    expect(parseOrError(debtInput, { ...goodDebt, nextDueOn: '2028-02-29' }).ok).toBe(true);
    expect(fieldsOf(parseOrError(debtInput, { ...goodDebt, nextDueOn: '2026-02-29' }))).toEqual(['nextDueOn']);
  });

  it('rechaza moneda inválida y contraparte vacía o de más de 60 caracteres', () => {
    expect(fieldsOf(parseOrError(debtInput, { ...goodDebt, currency: 'EUR' }))).toEqual(['currency']);
    expect(fieldsOf(parseOrError(debtInput, { ...goodDebt, counterpartyName: '' }))).toEqual(['counterpartyName']);
    expect(fieldsOf(parseOrError(debtInput, { ...goodDebt, counterpartyName: 'a'.repeat(61) }))).toEqual(['counterpartyName']);
  });
});

describe('thresholdInput', () => {
  it('acepta un umbral global o por billetera', () => {
    expect(parseOrError(thresholdInput, { currency: 'PEN', amountMinor: 30000 }).ok).toBe(true);
    expect(parseOrError(thresholdInput, { currency: 'USD', amountMinor: 5000, walletId: 'w1' }).ok).toBe(true);
  });

  it.each([0, -1, 2.5])('rechaza el monto %p', (amountMinor) => {
    expect(fieldsOf(parseOrError(thresholdInput, { currency: 'PEN', amountMinor }))).toEqual(['amountMinor']);
  });
});

describe('parseOrError', () => {
  it('informa todos los campos inválidos a la vez', () => {
    const fields = fieldsOf(parseOrError(categoryInput, { kind: 'x', name: '', color: 'red', icon: '' }));
    expect(fields.sort()).toEqual(['color', 'icon', 'kind', 'name']);
  });

  it('rechaza entradas que no son objetos', () => {
    expect(parseOrError(categoryInput, null).ok).toBe(false);
    expect(parseOrError(categoryInput, 'texto').ok).toBe(false);
  });
});
