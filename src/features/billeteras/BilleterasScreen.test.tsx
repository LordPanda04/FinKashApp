import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RepositoriesContext } from '@/data/RepositoriesContext';
import type { CardRecord, WalletRecord } from '@/data/types';
import type { Account } from '@/domain/ledger/types';
import { createFakeRepositories, movementOf, type FakeDebt } from '@/test-utils/fakeRepositories';
import { BilleterasScreen } from './BilleterasScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const yape: WalletRecord = { id: 'w1', name: 'Yape', walletType: 'digital', icon: 'smartphone', color: '#742384', isHidden: false, includeInGeneral: true, sortOrder: 0 };
const secreta: WalletRecord = { id: 'w2', name: 'Caja vieja', walletType: 'cash', icon: 'payments', color: '#6B7280', isHidden: true, includeInGeneral: true, sortOrder: 1 };
const accounts: Account[] = [
  { id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
  { id: 'yapeUsd', kind: 'wallet', walletId: 'w1', currency: 'USD', creditLimitMinor: null },
  { id: 'bcp', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 },
];
const card: CardRecord = { accountId: 'bcp', name: 'Tarjeta BCP', issuer: null, icon: 'credit_card', color: '#003DA5', creditLimitMinor: 200000, closingDay: null, dueDay: null, isHidden: false };
const debtBase = { initialPendingMinor: 0, installmentAmountMinor: null, nextDueOn: null, dueOn: null, installmentsRemaining: null, notes: null, status: 'pending' as const };
const debts: FakeDebt[] = [
  { ...debtBase, id: 'd1', direction: 'receivable', currency: 'PEN', counterpartyName: 'Carlos', counterpartyType: 'person', pendingMinor: 10000 },
  { ...debtBase, id: 'd2', direction: 'payable', currency: 'PEN', counterpartyName: 'Ana', counterpartyType: 'person', pendingMinor: 2500 },
  { ...debtBase, id: 'd3', direction: 'payable', currency: 'PEN', counterpartyName: 'Interbank', counterpartyType: 'institution', pendingMinor: 44500 },
];
const movements = [
  movementOf({ id: 'm1', type: 'opening', sourceAccountId: null, destAccountId: 'yapePen', amountMinor: 50000 }),
  movementOf({ id: 'm2', type: 'expense', sourceAccountId: 'yapePen', amountMinor: 2450 }),
  movementOf({ id: 'm3', type: 'opening', sourceAccountId: null, destAccountId: 'yapeUsd', amountMinor: 10000, currency: 'USD' }),
  movementOf({ id: 'm4', type: 'opening', sourceAccountId: 'bcp', destAccountId: null, amountMinor: 30000 }),
];

async function open(seed: Parameters<typeof createFakeRepositories>[0] = {}) {
  const fake = createFakeRepositories({ wallets: [yape, secreta], accounts, cards: [card], debts, movements, ...seed });
  await render(
    <RepositoriesContext.Provider value={fake.repos}>
      <BilleterasScreen />
    </RepositoriesContext.Provider>,
  );
  await screen.findByText('Yape');
  return fake;
}

beforeEach(() => mockPush.mockClear());

describe('BilleterasScreen — billeteras', () => {
  it('muestra el saldo de cada moneda en líneas separadas con su símbolo', async () => {
    await open();
    expect(screen.getByRole('header', { name: 'Billeteras' })).toBeOnTheScreen();
    expect(screen.getByText('S/ 475.50')).toBeOnTheScreen();
    expect(screen.getByText('$ 100.00')).toBeOnTheScreen();
    expect(screen.getByText('Digital')).toBeOnTheScreen();
  });

  it('una billetera oculta no está en la grilla y aparece al desplegar "Billeteras ocultas"', async () => {
    await open();
    expect(screen.queryByText('Caja vieja')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Billeteras ocultas (1)' }));
    expect(await screen.findByText('Caja vieja')).toBeOnTheScreen();
  });

  it('tocar una tarjeta de billetera abre su detalle', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Billetera Yape' }));
    expect(mockPush).toHaveBeenCalledWith('/billetera/w1');
  });
});

describe('BilleterasScreen — crear billetera', () => {
  async function openForm() {
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar billetera' }));
  }

  it('crea "Plin" con saldo inicial "500" y la muestra sin recargar', async () => {
    const { calls } = await open();
    await openForm();
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Plin');
    await fireEvent.changeText(screen.getByLabelText('Saldo inicial (PEN)'), '500');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Plin')).toBeOnTheScreen();
    expect(await screen.findByText('S/ 500.00')).toBeOnTheScreen();
    expect(calls.createWallet).toHaveBeenCalledWith(expect.objectContaining({ name: 'Plin', currencies: ['PEN'], openings: { PEN: 50000 } }));
  });

  it('con monto "24,50" muestra el error y no llama al repositorio', async () => {
    const { calls } = await open();
    await openForm();
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Plin');
    await fireEvent.changeText(screen.getByLabelText('Saldo inicial (PEN)'), '24,50');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ingresa un monto válido mayor a 0, con hasta 2 decimales.')).toBeOnTheScreen();
    expect(calls.createWallet).not.toHaveBeenCalled();
  });

  it('el saldo inicial vacío es opcional (sin openings)', async () => {
    const { calls } = await open();
    await openForm();
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Efectivo');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await screen.findByText('Efectivo');
    expect(calls.createWallet).toHaveBeenCalledWith(expect.objectContaining({ openings: {} }));
  });

  it('con las dos monedas pide un saldo inicial por cada una', async () => {
    const { calls } = await open();
    await openForm();
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Plin');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Dólares ($)' }));
    await fireEvent.changeText(screen.getByLabelText('Saldo inicial (PEN)'), '10');
    await fireEvent.changeText(screen.getByLabelText('Saldo inicial (USD)'), '5.50');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await screen.findByText('Plin');
    expect(calls.createWallet).toHaveBeenCalledWith(expect.objectContaining({ currencies: ['PEN', 'USD'], openings: { PEN: 1000, USD: 550 } }));
  });

  it('no se puede quitar la última moneda', async () => {
    await open();
    await openForm();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Soles (S/)' }));
    expect(screen.getByRole('checkbox', { name: 'Soles (S/)' })).toBeChecked();
  });

  it('doble toque en Guardar crea una sola billetera', async () => {
    const { calls } = await open();
    await openForm();
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Plin');
    const save = screen.getByRole('button', { name: 'Guardar' });
    await fireEvent.press(save);
    await fireEvent.press(save);
    await screen.findByText('Plin');
    expect(calls.createWallet).toHaveBeenCalledTimes(1);
  });

  it('un nombre vacío muestra el error del repositorio y deja el formulario abierto', async () => {
    await open();
    await openForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('El nombre es obligatorio.')).toBeOnTheScreen();
    expect(screen.getByText('Nueva billetera')).toBeOnTheScreen();
  });
});

describe('BilleterasScreen — deudas y bancos', () => {
  it('Me deben: contador, persona con inicial y monto en verde con "+"', async () => {
    await open();
    expect(screen.getByText('Me deben')).toBeOnTheScreen();
    expect(screen.getAllByText('1 pendiente')).toHaveLength(2); // Me deben y Debo
    expect(screen.getByText('Carlos')).toBeOnTheScreen();
    expect(screen.getByText('C')).toBeOnTheScreen();
    expect(screen.getByText('+ S/ 100.00')).toHaveStyle({ color: '#1C9C4D' });
  });

  it('Debo: persona con monto en rojo con "-"', async () => {
    await open();
    expect(screen.getByText('Debo')).toBeOnTheScreen();
    expect(screen.getByText('Ana')).toBeOnTheScreen();
    expect(screen.getByText('- S/ 25.00')).toHaveStyle({ color: '#E5484D' });
  });

  it('Deudas con bancos: tarjeta con consumido y disponible, e institución por pagar', async () => {
    await open();
    expect(screen.getByText('Deudas con bancos')).toBeOnTheScreen();
    expect(screen.getByText('Tarjeta BCP')).toBeOnTheScreen();
    expect(screen.getByText('- S/ 300.00')).toBeOnTheScreen();
    expect(screen.getByText('Disponible S/ 1,700.00')).toBeOnTheScreen();
    expect(screen.getByText('Interbank')).toBeOnTheScreen();
    expect(screen.getByText('- S/ 445.00')).toBeOnTheScreen();
    expect(screen.getByText('Por pagar')).toBeOnTheScreen();
  });

  it('sin deudas muestra los textos de vacío', async () => {
    const fake = createFakeRepositories({ wallets: [yape], accounts, cards: [], debts: [], movements });
    await render(
      <RepositoriesContext.Provider value={fake.repos}>
        <BilleterasScreen />
      </RepositoriesContext.Provider>,
    );
    await screen.findByText('Yape');
    await waitFor(() => expect(screen.getAllByText('Sin deudas pendientes.').length).toBeGreaterThanOrEqual(2));
  });
});
