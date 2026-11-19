/** @jest-environment node */
import { viewTableSpecs } from '@/data/local/schema';
import { seedWithoutDefaultWallet } from '@/data/local/testSeed';
import { createTestDb, type TestDb } from '@/data/local/testDb';
import { accountBalance } from '@/domain/ledger/balances';
import { loadLedgerState } from '@/data/local/ledgerState';
import type { CardInput, WalletInput } from '@/validation/inputs';
import { createWalletRepository } from './wallets';

let db: TestDb;
let n: number;
const deps = () => ({ newId: () => `id-${++n}`, clock: () => new Date('2026-11-20T15:00:00Z') });

beforeEach(async () => {
  n = 0;
  db = await createTestDb(viewTableSpecs());
  await seedWithoutDefaultWallet(db, deps());
});
afterEach(async () => {
  await db.close();
});

const repo = () => createWalletRepository(db, deps());
const yape: WalletInput = { name: 'Yape', walletType: 'digital', icon: 'phone', color: '#7B2CBF', currencies: ['PEN', 'USD'] };
const bcp: CardInput = { name: 'Tarjeta BCP', icon: 'credit_card', color: '#003DA5', currency: 'PEN', creditLimitMinor: 200000 };

const count = async (table: string) => (await db.getAll(`SELECT id FROM ${table}`)).length;

describe('createWallet', () => {
  it('crea la billetera, una cuenta por moneda y la apertura con fecha de hoy en Lima', async () => {
    const r = await repo().createWallet({ ...yape, openings: { PEN: 50000 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.wallet).toMatchObject({ name: 'Yape', walletType: 'digital', isHidden: false, includeInGeneral: true });
    expect(r.value.accounts.map((a) => [a.kind, a.currency, a.walletId])).toEqual([
      ['wallet', 'PEN', r.value.wallet.id],
      ['wallet', 'USD', r.value.wallet.id],
    ]);
    const movements = await db.getAll<Record<string, unknown>>('SELECT * FROM movements');
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      type: 'opening',
      dest_account_id: r.value.accounts[0]!.id,
      source_account_id: null,
      amount_minor: 50000,
      currency: 'PEN',
      occurred_on: '2026-11-20',
    });
  });

  it('el saldo de la cuenta es el de la apertura', async () => {
    const r = await repo().createWallet({ ...yape, currencies: ['PEN'], openings: { PEN: 50000 } });
    if (!r.ok) throw new Error('setup');
    const state = await loadLedgerState(db);
    expect(accountBalance(r.value.accounts[0]!.id, state.movements)).toBe(50000);
  });

  it('sin openings no crea movimientos', async () => {
    const r = await repo().createWallet(yape);
    expect(r.ok).toBe(true);
    expect(await count('movements')).toBe(0);
    expect(await count('accounts')).toBe(2);
  });

  it.each([0, -5, 1.5])('una apertura de %p da AMOUNT_INVALID y no crea nada', async (amount) => {
    const r = await repo().createWallet({ ...yape, openings: { PEN: amount } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('AMOUNT_INVALID');
    expect(await count('wallets')).toBe(0);
    expect(await count('accounts')).toBe(0);
    expect(await count('movements')).toBe(0);
  });

  it('una apertura en una moneda que la billetera no tiene da INPUT_INVALID y no crea nada', async () => {
    const r = await repo().createWallet({ ...yape, currencies: ['PEN'], openings: { USD: 100 } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INPUT_INVALID');
    expect(await count('wallets')).toBe(0);
  });

  it('una entrada inválida (sin monedas) da INPUT_INVALID', async () => {
    const r = await repo().createWallet({ ...yape, currencies: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INPUT_INVALID');
  });

  it('las billeteras nuevas van al final del orden', async () => {
    await repo().createWallet(yape);
    await repo().createWallet({ ...yape, name: 'Plin' });
    expect((await repo().listWallets()).map((w) => w.name)).toEqual(['Yape', 'Plin']);
  });
});

describe('ocultar y casillas del Saldo general', () => {
  it('ocultar mantiene la billetera en la lista y su saldo cuenta', async () => {
    const r = await repo().createWallet({ ...yape, currencies: ['PEN'], openings: { PEN: 50000 } });
    if (!r.ok) throw new Error('setup');
    const hidden = await repo().setHidden(r.value.wallet.id, true);
    expect(hidden.ok && hidden.value.isHidden).toBe(true);
    const list = await repo().listWallets();
    expect(list).toHaveLength(1);
    expect(list[0]!.isHidden).toBe(true);
    const state = await loadLedgerState(db);
    expect(accountBalance(r.value.accounts[0]!.id, state.movements)).toBe(50000);
  });

  it('setIncludeInGeneral cambia la casilla', async () => {
    const r = await repo().createWallet(yape);
    if (!r.ok) throw new Error('setup');
    const off = await repo().setIncludeInGeneral(r.value.wallet.id, false);
    expect(off.ok && off.value.includeInGeneral).toBe(false);
  });

  it('una billetera inexistente da WALLET_NOT_FOUND', async () => {
    const r = await repo().setHidden('nope', true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('WALLET_NOT_FOUND');
  });

  it('el repositorio no ofrece borrar billeteras', () => {
    expect(Object.keys(repo()).filter((k) => /delete|remove/i.test(k))).toEqual([]);
  });
});

describe('tarjetas', () => {
  it('crea la cuenta de tarjeta, su fila y el consumo previo como apertura', async () => {
    const r = await repo().createCard({ ...bcp, issuer: 'BCP', dueDay: 15, previousConsumedMinor: 30000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.account).toMatchObject({ kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 });
    expect(r.value.card).toMatchObject({
      accountId: r.value.account.id,
      name: 'Tarjeta BCP',
      issuer: 'BCP',
      creditLimitMinor: 200000,
      dueDay: 15,
      closingDay: null,
      isHidden: false,
    });
    const opening = await db.getOptional<Record<string, unknown>>("SELECT * FROM movements WHERE type = 'opening'");
    expect(opening).toMatchObject({ source_account_id: r.value.account.id, dest_account_id: null, amount_minor: 30000 });
    const state = await loadLedgerState(db);
    expect(-accountBalance(r.value.account.id, state.movements)).toBe(30000);
  });

  it('sin consumo previo no crea movimientos', async () => {
    expect((await repo().createCard(bcp)).ok).toBe(true);
    expect(await count('movements')).toBe(0);
  });

  it('un consumo previo mayor a la línea da CARD_OVER_LIMIT y no crea nada', async () => {
    const r = await repo().createCard({ ...bcp, previousConsumedMinor: 200001 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('CARD_OVER_LIMIT');
    expect(await count('accounts')).toBe(0);
    expect(await count('credit_cards')).toBe(0);
  });

  it('un consumo previo igual a la línea es válido', async () => {
    expect((await repo().createCard({ ...bcp, previousConsumedMinor: 200000 })).ok).toBe(true);
  });

  it('una línea de crédito inválida da INPUT_INVALID', async () => {
    const r = await repo().createCard({ ...bcp, creditLimitMinor: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INPUT_INVALID');
  });

  it('listCards y setCardHidden', async () => {
    const r = await repo().createCard(bcp);
    if (!r.ok) throw new Error('setup');
    const hidden = await repo().setCardHidden(r.value.account.id, true);
    expect(hidden.ok && hidden.value.isHidden).toBe(true);
    expect((await repo().listCards()).map((c) => [c.name, c.isHidden])).toEqual([['Tarjeta BCP', true]]);
    const missing = await repo().setCardHidden('nope', true);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('CARD_NOT_FOUND');
  });

  it('listAccounts incluye billeteras y tarjetas con su línea de crédito', async () => {
    await repo().createWallet({ ...yape, currencies: ['PEN'] });
    await repo().createCard(bcp);
    const accounts = await repo().listAccounts();
    expect(accounts.map((a) => [a.kind, a.creditLimitMinor]).sort()).toEqual([
      ['credit_card', 200000],
      ['wallet', null],
    ]);
  });
});
