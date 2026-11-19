import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RepositoriesContext } from '@/data/RepositoriesContext';
import type { WalletRecord } from '@/data/types';
import type { Account } from '@/domain/ledger/types';
import { err, ok } from '@/lib/result';
import { createFakeRepositories, movementOf } from '@/test-utils/fakeRepositories';
import { WalletDetailScreen } from './WalletDetailScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));

const yape: WalletRecord = { id: 'w1', name: 'Yape', walletType: 'digital', icon: 'smartphone', color: '#742384', isHidden: false, includeInGeneral: true, sortOrder: 0 };
const otra: WalletRecord = { ...yape, id: 'w2', name: 'Plin', sortOrder: 1 };
const accounts: Account[] = [
  { id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
  { id: 'yapeUsd', kind: 'wallet', walletId: 'w1', currency: 'USD', creditLimitMinor: null },
  { id: 'plinPen', kind: 'wallet', walletId: 'w2', currency: 'PEN', creditLimitMinor: null },
];
const movements = [
  movementOf({ id: 'm1', type: 'opening', sourceAccountId: null, destAccountId: 'yapePen', amountMinor: 40000, occurredOn: '2026-11-01' }),
  movementOf({ id: 'm2', type: 'expense', sourceAccountId: 'yapePen', amountMinor: 2450, description: 'Menú', occurredOn: '2026-11-05' }),
  movementOf({ id: 'm3', type: 'opening', sourceAccountId: null, destAccountId: 'yapeUsd', amountMinor: 10000, currency: 'USD', occurredOn: '2026-11-01' }),
  movementOf({ id: 'm4', type: 'income', sourceAccountId: null, destAccountId: 'plinPen', amountMinor: 99900, description: 'Ajeno', occurredOn: '2026-11-02' }),
];
// Saldo de yape PEN = 40000 − 2450 = 37550 (S/ 375.50)

async function open(wallet = yape) {
  const fake = createFakeRepositories({ wallets: [yape, otra], accounts, movements });
  await render(
    <RepositoriesContext.Provider value={fake.repos}>
      <WalletDetailScreen walletId={wallet.id} />
    </RepositoriesContext.Provider>,
  );
  await screen.findByText('S/ 375.50');
  return fake;
}

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
});

describe('WalletDetailScreen', () => {
  it('muestra nombre, saldos por moneda y solo los movimientos de esa billetera', async () => {
    await open();
    expect(screen.getByRole('header', { name: 'Yape' })).toBeOnTheScreen();
    expect(screen.getByText('S/ 375.50')).toBeOnTheScreen();
    expect(screen.getByText('$ 100.00')).toBeOnTheScreen();
    expect(screen.getByText('Menú')).toBeOnTheScreen();
    expect(screen.getByText('- S/ 24.50')).toBeOnTheScreen();
    expect(screen.queryByText('Ajeno')).toBeNull();
  });

  it('el botón volver regresa a la pantalla anterior', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('"Transferir" abre Registrar como transferencia desde la primera cuenta', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Transferir' }));
    expect(mockPush).toHaveBeenCalledWith('/registrar?tipo=transferencia&desde=yapePen');
  });
});

describe('Arreglo de billetera', () => {
  async function openAdjust() {
    const fake = await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Arreglo de billetera' }));
    return fake;
  }

  it('muestra el saldo calculado y la diferencia al escribir el saldo real', async () => {
    await openAdjust();
    expect(screen.getByText('Saldo calculado')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Saldo real'), '300');
    expect(await screen.findByText('- S/ 75.50')).toBeOnTheScreen();
  });

  it('al guardar llama a adjustWallet con el saldo declarado en céntimos y cierra la hoja', async () => {
    const { calls } = await openAdjust();
    await fireEvent.changeText(screen.getByLabelText('Saldo real'), '300');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(calls.adjustWallet).toHaveBeenCalledWith({ accountId: 'yapePen', declaredMinor: 30000 }));
    await waitFor(() => expect(screen.queryByLabelText('Saldo real')).toBeNull());
  });

  it('declarar "0" es válido (billetera vaciada)', async () => {
    const { calls } = await openAdjust();
    await fireEvent.changeText(screen.getByLabelText('Saldo real'), '0');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(calls.adjustWallet).toHaveBeenCalledWith({ accountId: 'yapePen', declaredMinor: 0 }));
  });

  it.each(['-5', '24,50', 'abc', ''])('con "%s" muestra el error de monto y no llama al repositorio', async (bad) => {
    const { calls } = await openAdjust();
    await fireEvent.changeText(screen.getByLabelText('Saldo real'), bad);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ingresa un monto válido (0 o mayor), con hasta 2 decimales.')).toBeOnTheScreen();
    expect(calls.adjustWallet).not.toHaveBeenCalled();
  });

  it('un TIMELINE_VIOLATION muestra el mensaje y deja la hoja abierta', async () => {
    const fake = await openAdjust();
    fake.adjustResult = () => err('TIMELINE_VIOLATION', 'La billetera quedaría con saldo negativo el 2026-11-12: faltan S/ 80.00.');
    await fireEvent.changeText(screen.getByLabelText('Saldo real'), '10');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('La billetera quedaría con saldo negativo el 2026-11-12: faltan S/ 80.00.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Saldo real')).toBeOnTheScreen();
  });

  it('con dos monedas permite elegir la cuenta a arreglar', async () => {
    const { calls } = await openAdjust();
    await fireEvent.press(screen.getByRole('radio', { name: 'Dólares ($)' }));
    expect(screen.getAllByText('$ 100.00').length).toBeGreaterThanOrEqual(2); // saldo de la billetera y saldo calculado del arreglo
    await fireEvent.changeText(screen.getByLabelText('Saldo real'), '80');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(calls.adjustWallet).toHaveBeenCalledWith({ accountId: 'yapeUsd', declaredMinor: 8000 }));
  });

  it('el éxito sin diferencia (null) también cierra la hoja', async () => {
    const fake = await openAdjust();
    fake.adjustResult = () => ok(null);
    await fireEvent.changeText(screen.getByLabelText('Saldo real'), '375.50');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByLabelText('Saldo real')).toBeNull());
  });
});

describe('Ocultar billetera', () => {
  it('pide confirmación, oculta y el botón pasa a "Mostrar billetera"', async () => {
    const { calls } = await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar billetera' }));
    expect(calls.setHidden).not.toHaveBeenCalled();
    await fireEvent.press(await screen.findByRole('button', { name: 'Ocultar' }));
    await waitFor(() => expect(calls.setHidden).toHaveBeenCalledWith('w1', true));
    expect(await screen.findByRole('button', { name: 'Mostrar billetera' })).toBeOnTheScreen();
  });

  it('cancelar la confirmación no oculta nada', async () => {
    const { calls } = await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar billetera' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(calls.setHidden).not.toHaveBeenCalled();
  });

  it('mostrar una billetera oculta no pide confirmación', async () => {
    const fake = createFakeRepositories({ wallets: [{ ...yape, isHidden: true }], accounts, movements });
    await render(
      <RepositoriesContext.Provider value={fake.repos}>
        <WalletDetailScreen walletId="w1" />
      </RepositoriesContext.Provider>,
    );
    await fireEvent.press(await screen.findByRole('button', { name: 'Mostrar billetera' }));
    await waitFor(() => expect(fake.calls.setHidden).toHaveBeenCalledWith('w1', false));
  });
});

describe('Habilitar cuenta en dólares (D52)', () => {
  // Plin solo tiene cuenta en soles: saldo S/ 999.00.
  async function openPlin() {
    const fake = createFakeRepositories({ wallets: [yape, otra], accounts, movements });
    await render(
      <RepositoriesContext.Provider value={fake.repos}>
        <WalletDetailScreen walletId="w2" />
      </RepositoriesContext.Provider>,
    );
    await screen.findByText('S/ 999.00');
    return fake;
  }
  const rowName = 'Habilitar cuenta en dólares';

  it('una billetera sin cuenta USD ofrece la fila; una que ya la tiene, no', async () => {
    await openPlin();
    expect(screen.getByRole('button', { name: rowName })).toBeOnTheScreen();
    expect(screen.queryByText('$ 0.00')).toBeNull();
  });

  it('una billetera con cuenta USD no ofrece habilitarla otra vez', async () => {
    await open();
    expect(screen.queryByRole('button', { name: rowName })).toBeNull();
  });

  it('tocar la fila abre la hoja con el saldo inicial opcional en dólares', async () => {
    await openPlin();
    await fireEvent.press(screen.getByRole('button', { name: rowName }));
    const field = await screen.findByLabelText('Saldo inicial (USD)');
    expect(field.props.value).toBe('');
    expect(screen.getByText('$')).toBeOnTheScreen();
  });

  it('"Habilitar" con el campo vacío crea la cuenta sin saldo inicial, cierra la hoja y muestra $ 0.00', async () => {
    const fake = await openPlin();
    await fireEvent.press(screen.getByRole('button', { name: rowName }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Habilitar' }));
    await waitFor(() => expect(fake.calls.addAccount).toHaveBeenCalledWith({ walletId: 'w2', currency: 'USD' }));
    await waitFor(() => expect(screen.queryByLabelText('Saldo inicial (USD)')).toBeNull());
    expect(await screen.findByText('$ 0.00')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: rowName })).toBeNull();
  });

  it('con "100.50" manda el saldo inicial en centavos y lo muestra', async () => {
    const fake = await openPlin();
    await fireEvent.press(screen.getByRole('button', { name: rowName }));
    await fireEvent.changeText(await screen.findByLabelText('Saldo inicial (USD)'), '100.50');
    await fireEvent.press(screen.getByRole('button', { name: 'Habilitar' }));
    await waitFor(() => expect(fake.calls.addAccount).toHaveBeenCalledWith({ walletId: 'w2', currency: 'USD', openingMinor: 10050 }));
    expect(await screen.findByText('$ 100.50')).toBeOnTheScreen();
  });

  it('un monto inválido ("24,50") muestra el error y no llama al repositorio', async () => {
    const fake = await openPlin();
    await fireEvent.press(screen.getByRole('button', { name: rowName }));
    await fireEvent.changeText(await screen.findByLabelText('Saldo inicial (USD)'), '24,50');
    await fireEvent.press(screen.getByRole('button', { name: 'Habilitar' }));
    expect(await screen.findByText('Ingresa un monto válido mayor a 0, con hasta 2 decimales.')).toBeOnTheScreen();
    expect(fake.calls.addAccount).not.toHaveBeenCalled();
  });

  it('un error del repositorio se muestra tal cual y la hoja sigue abierta', async () => {
    const fake = await openPlin();
    fake.addAccountResult = () => err('ACCOUNT_ALREADY_EXISTS', 'La billetera ya tiene una cuenta en USD.');
    await fireEvent.press(screen.getByRole('button', { name: rowName }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Habilitar' }));
    expect(await screen.findByText('La billetera ya tiene una cuenta en USD.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Saldo inicial (USD)')).toBeOnTheScreen();
  });

  it('dos toques seguidos en "Habilitar" llaman al repositorio una sola vez', async () => {
    const fake = await openPlin();
    const original = fake.repos.wallets.addAccount;
    (fake.repos.wallets as { addAccount: typeof original }).addAccount = async (input) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return original(input);
    };
    await fireEvent.press(screen.getByRole('button', { name: rowName }));
    const button = await screen.findByRole('button', { name: 'Habilitar' });
    await act(async () => {
      await Promise.all([fireEvent.press(button), fireEvent.press(button)]);
    });
    await waitFor(() => expect(screen.queryByLabelText('Saldo inicial (USD)')).toBeNull());
    expect(fake.calls.addAccount).toHaveBeenCalledTimes(1);
  });
});
