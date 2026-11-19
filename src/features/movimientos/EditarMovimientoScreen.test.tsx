import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RepositoriesContext } from '@/data/RepositoriesContext';
import type { CategoryRecord, WalletRecord } from '@/data/types';
import type { Account } from '@/domain/ledger/types';
import { err } from '@/lib/result';
import { createFakeRepositories, movementOf, seededCategories } from '@/test-utils/fakeRepositories';
import { EditarMovimientoScreen } from './EditarMovimientoScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: mockBack }) }));

const wallets: WalletRecord[] = [
  { id: 'w1', name: 'Yape', walletType: 'digital', icon: 'smartphone', color: '#742384', isHidden: false, includeInGeneral: true, sortOrder: 0 },
];
const accounts: Account[] = [{ id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null }];
const comida: CategoryRecord = { id: 'comida', kind: 'expense', name: 'Comida', color: '#1C9C4D', icon: 'restaurant', systemKey: null, sortOrder: 50 };

const seed = () => [
  movementOf({ id: 'i1', type: 'income', occurredOn: '2026-11-10', categoryId: 'income-0', sourceAccountId: null, destAccountId: 'yapePen', amountMinor: 10000 }),
  movementOf({ id: 'm1', type: 'expense', occurredOn: '2026-11-12', description: 'Menú', categoryId: 'comida', sourceAccountId: 'yapePen', amountMinor: 2450 }),
  movementOf({ id: 'o1', type: 'opening', occurredOn: '2026-11-01', categoryId: null, sourceAccountId: null, destAccountId: 'yapePen', amountMinor: 50000 }),
];

async function open(id: string) {
  const fake = createFakeRepositories({ categories: [...seededCategories(), comida], wallets, accounts, movements: seed() });
  await render(
    <RepositoriesContext.Provider value={fake.repos}>
      <EditarMovimientoScreen movementId={id} today="2026-11-20" />
    </RepositoriesContext.Provider>,
  );
  return fake;
}

beforeEach(() => mockBack.mockClear());

describe('EditarMovimientoScreen', () => {
  it('abre con el monto y la descripción del movimiento y sin selector de tipo', async () => {
    await open('m1');
    expect(await screen.findByRole('header', { name: 'Editar movimiento' })).toBeOnTheScreen();
    expect((await screen.findByLabelText('Monto')).props.value).toBe('24.50');
    expect(screen.getByLabelText('Descripción').props.value).toBe('Menú');
    expect(screen.queryByRole('radio', { name: 'Transferencia' })).toBeNull();
  });

  it('cambiar el monto a "30" y guardar llama a update y vuelve', async () => {
    const { calls } = await open('m1');
    await fireEvent.changeText(await screen.findByLabelText('Monto'), '30');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(calls.updateMovement).toHaveBeenCalledWith('m1', expect.objectContaining({ amountMinor: 3000, type: 'expense', sourceAccountId: 'yapePen' })));
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('mover la fecha antes del ingreso muestra el aviso con el faltante y conserva la fecha original', async () => {
    const fake = await open('m1');
    fake.updateResult = () =>
      err('TIMELINE_VIOLATION', 'La billetera quedaría con saldo negativo el 2026-11-05: faltan S/ 24.50.', {
        violations: [{ code: 'WALLET_NEGATIVE', entityId: 'yapePen', date: '2026-11-05', shortfallMinor: 2450 }],
      });
    await fireEvent.press(await screen.findByRole('button', { name: '5 de noviembre de 2026' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Saldo insuficiente')).toBeOnTheScreen();
    expect(screen.getByText('La billetera quedaría con saldo negativo el 2026-11-05: faltan S/ 24.50.')).toBeOnTheScreen();
    expect((await fake.repos.movements.get('m1'))?.occurredOn).toBe('2026-11-12');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('"Eliminar movimiento" pide confirmación y luego elimina y vuelve', async () => {
    const { calls } = await open('m1');
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar movimiento' }));
    expect(await screen.findByText('Esta acción no se puede deshacer.')).toBeOnTheScreen();
    expect(calls.removeMovement).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(calls.removeMovement).toHaveBeenCalledWith('m1'));
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('cancelar la eliminación no borra nada', async () => {
    const { calls } = await open('m1');
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar movimiento' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(calls.removeMovement).not.toHaveBeenCalled();
  });

  it('eliminar un ingreso que cubría un gasto muestra el aviso y no vuelve', async () => {
    const fake = await open('i1');
    fake.removeResult = () =>
      err('TIMELINE_VIOLATION', 'La billetera quedaría con saldo negativo el 2026-11-12: faltan S/ 24.50.', {
        violations: [{ code: 'WALLET_NEGATIVE', entityId: 'yapePen', date: '2026-11-12', shortfallMinor: 2450 }],
      });
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar movimiento' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('Saldo insuficiente')).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('una apertura se corrige con "Arreglo de billetera" y no muestra el formulario', async () => {
    await open('o1');
    expect(await screen.findByText('Este movimiento se corrige con «Arreglo de billetera».')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
    expect(screen.queryByLabelText('Monto')).toBeNull();
  });

  it('un id inexistente muestra "El movimiento no existe."', async () => {
    await open('nope');
    expect(await screen.findByText('El movimiento no existe.')).toBeOnTheScreen();
  });

  it('el botón volver regresa', async () => {
    await open('m1');
    await fireEvent.press(await screen.findByRole('button', { name: 'Volver' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
