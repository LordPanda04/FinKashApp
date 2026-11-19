import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RepositoriesContext } from '@/data/RepositoriesContext';
import type { WalletRecord } from '@/data/types';
import type { Account } from '@/domain/ledger/types';
import { err } from '@/lib/result';
import { createFakeRepositories, movementOf } from '@/test-utils/fakeRepositories';
import { PeriodoScreen } from './PeriodoScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack, push: jest.fn() }),
}));

const wallet = (id: string, name: string, sortOrder: number, over: Partial<WalletRecord> = {}): WalletRecord => ({
  id, name, walletType: 'digital', icon: 'smartphone', color: '#742384', isHidden: false, includeInGeneral: true, sortOrder, ...over,
});
const accounts: Account[] = [
  { id: 'efPen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
  { id: 'yPen', kind: 'wallet', walletId: 'w2', currency: 'PEN', creditLimitMinor: null },
  { id: 'yUsd', kind: 'wallet', walletId: 'w2', currency: 'USD', creditLimitMinor: null },
  { id: 'hPen', kind: 'wallet', walletId: 'w3', currency: 'PEN', creditLimitMinor: null },
];
const movements = [
  movementOf({ id: 'm1', type: 'opening', sourceAccountId: null, destAccountId: 'yPen', amountMinor: 12000, occurredOn: '2026-11-01' }),
  movementOf({ id: 'm2', type: 'opening', sourceAccountId: null, destAccountId: 'yUsd', amountMinor: 5000, currency: 'USD', occurredOn: '2026-11-01' }),
  movementOf({ id: 'm3', type: 'opening', sourceAccountId: null, destAccountId: 'hPen', amountMinor: 99900, occurredOn: '2026-11-01' }),
];
const wallets = [wallet('w1', 'Efectivo', 0, { walletType: 'cash' }), wallet('w2', 'Yape', 1), wallet('w3', 'Oculta', 2, { isHidden: true })];

async function open(seed: Parameters<typeof createFakeRepositories>[0] = {}) {
  const fake = createFakeRepositories({ wallets, accounts, movements, ...seed });
  await render(
    <RepositoriesContext.Provider value={fake.repos}>
      <PeriodoScreen today="2026-11-20" />
    </RepositoriesContext.Provider>,
  );
  await screen.findByText('Iniciar periodo de Noviembre');
  return fake;
}

const startSwitch = () => screen.getByRole('switch', { name: '¿Empieza el día 1?' });
const confirmButton = () => screen.getByRole('button', { name: 'Confirmar periodo' });

beforeEach(() => {
  mockBack.mockClear();
  mockReplace.mockClear();
  mockCanGoBack = true;
});

describe('PeriodoScreen — revisión de saldos', () => {
  it('muestra el mes, el interruptor activado y solo las billeteras visibles con sus saldos', async () => {
    await open();
    expect(screen.getByRole('header', { name: 'Iniciar periodo de Noviembre' })).toBeOnTheScreen();
    expect(startSwitch()).toBeChecked();
    expect(screen.getByText('Efectivo')).toBeOnTheScreen();
    expect(screen.getByText('Yape')).toBeOnTheScreen();
    expect(screen.queryByText('Oculta')).toBeNull();
    expect(screen.getByText('S/ 0.00')).toBeOnTheScreen(); // Efectivo, saldo 0
    expect(screen.getByText('S/ 120.00')).toBeOnTheScreen();
    expect(screen.getByText('$ 50.00')).toBeOnTheScreen();
    expect(screen.queryByText('S/ 999.00')).toBeNull();
  });

  it('"Corregir" abre el Arreglo de esa billetera y, al guardar, el saldo de la fila se actualiza', async () => {
    const fake = await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Corregir Yape' }));
    await fireEvent.changeText(await screen.findByLabelText('Saldo real'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(fake.calls.adjustWallet).toHaveBeenCalledWith({ accountId: 'yPen', declaredMinor: 10000 }));
    expect(await screen.findByText('S/ 100.00')).toBeOnTheScreen();
    expect(screen.queryByText('S/ 120.00')).toBeNull();
  });

  it('sin billeteras visibles lo dice y el botón de confirmar sigue habilitado', async () => {
    await open({ wallets: [wallet('w3', 'Oculta', 0, { isHidden: true })] });
    expect(screen.getByText('No tienes billeteras visibles.')).toBeOnTheScreen();
    expect(confirmButton()).toBeEnabled();
  });
});

describe('PeriodoScreen — confirmar', () => {
  it('confirma el mes con inicio el día 1 y vuelve a Inicio', async () => {
    const fake = await open();
    await fireEvent.press(confirmButton());
    await waitFor(() => expect(fake.calls.confirmPeriod).toHaveBeenCalledWith({ month: '2026-11', startedOn: '2026-11-01' }));
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('si no hay historial al que volver, va a Inicio con replace', async () => {
    mockCanGoBack = false;
    await open();
    await fireEvent.press(confirmButton());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('desactivar el interruptor muestra el calendario y elegir otro día cambia el inicio', async () => {
    const fake = await open();
    expect(screen.queryByRole('button', { name: '15 de noviembre de 2026' })).toBeNull();
    await fireEvent.press(startSwitch());
    await fireEvent.press(await screen.findByRole('button', { name: '15 de noviembre de 2026' }));
    await fireEvent.press(confirmButton());
    await waitFor(() => expect(fake.calls.confirmPeriod).toHaveBeenCalledWith({ month: '2026-11', startedOn: '2026-11-15' }));
  });

  it('un día futuro muestra el mensaje del dominio y deshabilita el botón', async () => {
    const fake = await open();
    await fireEvent.press(startSwitch());
    await fireEvent.press(await screen.findByRole('button', { name: '25 de noviembre de 2026' }));
    expect(await screen.findByText('El día de inicio no puede ser posterior a hoy.')).toBeOnTheScreen();
    expect(confirmButton()).toBeDisabled();
    expect(fake.calls.confirmPeriod).not.toHaveBeenCalled();
  });

  it('un día de otro mes muestra el mensaje del dominio y deshabilita el botón', async () => {
    await open();
    await fireEvent.press(startSwitch());
    await fireEvent.press(screen.getByRole('button', { name: 'Mes anterior' }));
    await fireEvent.press(await screen.findByRole('button', { name: '31 de octubre de 2026' }));
    expect(await screen.findByText('El día de inicio debe estar dentro del mes 2026-11.')).toBeOnTheScreen();
    expect(confirmButton()).toBeDisabled();
  });

  it('volver a activar el interruptor restablece el día 1 y vuelve a habilitar el botón', async () => {
    const fake = await open();
    await fireEvent.press(startSwitch());
    await fireEvent.press(await screen.findByRole('button', { name: '25 de noviembre de 2026' }));
    await fireEvent.press(startSwitch());
    expect(confirmButton()).toBeEnabled();
    await fireEvent.press(confirmButton());
    await waitFor(() => expect(fake.calls.confirmPeriod).toHaveBeenCalledWith({ month: '2026-11', startedOn: '2026-11-01' }));
  });

  it('un error de confirmar (p. ej. ya confirmado) se muestra tal cual y no sale de la pantalla', async () => {
    const fake = await open();
    fake.confirmResult = () => err('PERIOD_ALREADY_CONFIRMED', 'El periodo 2026-11 ya fue confirmado.');
    await fireEvent.press(confirmButton());
    expect(await screen.findByText('El periodo 2026-11 ya fue confirmado.')).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('dos toques seguidos en Confirmar llaman al repositorio una sola vez', async () => {
    const fake = await open();
    // `await fireEvent.press` espera la promesa del manejador: los dos toques se disparan a la vez.
    const original = fake.repos.periods.confirm;
    (fake.repos.periods as { confirm: typeof original }).confirm = async (input) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return original(input);
    };
    const button = confirmButton();
    await act(async () => {
      await Promise.all([fireEvent.press(button), fireEvent.press(button)]);
    });
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(fake.calls.confirmPeriod).toHaveBeenCalledTimes(1);
  });
});
