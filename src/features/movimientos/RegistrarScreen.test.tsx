import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RepositoriesContext } from '@/data/RepositoriesContext';
import type { CardRecord, CategoryRecord, WalletRecord } from '@/data/types';
import type { Account } from '@/domain/ledger/types';
import { err } from '@/lib/result';
import { createFakeRepositories, seededCategories, type FakeDebt } from '@/test-utils/fakeRepositories';
import { RegistrarScreen } from './RegistrarScreen';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const wallet = (id: string, name: string, sortOrder: number): WalletRecord => ({
  id, name, walletType: 'digital', icon: 'smartphone', color: '#742384', isHidden: false, includeInGeneral: true, sortOrder,
});
const accounts: Account[] = [
  { id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
  { id: 'yapeUsd', kind: 'wallet', walletId: 'w1', currency: 'USD', creditLimitMinor: null },
  { id: 'plinPen', kind: 'wallet', walletId: 'w2', currency: 'PEN', creditLimitMinor: null },
  { id: 'bcp', kind: 'credit_card', walletId: null, currency: 'PEN', creditLimitMinor: 200000 },
];
const card: CardRecord = { accountId: 'bcp', name: 'Tarjeta BCP', issuer: null, icon: 'credit_card', color: '#003DA5', creditLimitMinor: 200000, closingDay: null, dueDay: null, isHidden: false };
const comida: CategoryRecord = { id: 'comida', kind: 'expense', name: 'Comida', color: '#1C9C4D', icon: 'restaurant', systemKey: null, sortOrder: 50 };
const sueldo: CategoryRecord = { id: 'sueldo', kind: 'income', name: 'Sueldo', color: '#1C9C4D', icon: 'work', systemKey: null, sortOrder: 51 };
const carlos: FakeDebt = {
  id: 'd1', direction: 'receivable', currency: 'PEN', initialPendingMinor: 0, installmentAmountMinor: null, nextDueOn: null,
  counterpartyName: 'Carlos', counterpartyType: 'person', dueOn: null, installmentsRemaining: null, notes: null, pendingMinor: 10000, status: 'pending',
};
const dolar: FakeDebt = { ...carlos, id: 'd2', currency: 'USD', counterpartyName: 'Pedro', pendingMinor: 5000 };

async function open() {
  const fake = createFakeRepositories({
    categories: [...seededCategories(), comida, sueldo],
    wallets: [wallet('w1', 'Yape', 0), wallet('w2', 'Plin', 1)],
    accounts,
    cards: [card],
    debts: [carlos, dolar],
  });
  await render(
    <RepositoriesContext.Provider value={fake.repos}>
      <RegistrarScreen today="2026-11-20" />
    </RepositoriesContext.Provider>,
  );
  await screen.findByRole('radio', { name: 'Gasto' });
  return fake;
}

async function choose(row: string, option: string) {
  await fireEvent.press(await screen.findByRole('button', { name: row }));
  await fireEvent.press(await screen.findByRole('radio', { name: option }));
}
async function fillExpense(amount = '24.50') {
  await choose('Categoría', 'Comida');
  await choose('Billetera', 'Yape · S/');
  await fireEvent.changeText(screen.getByLabelText('Monto'), amount);
}
const save = () => screen.getByRole('button', { name: 'Guardar movimiento' });

beforeEach(() => {
  mockParams = {};
});

describe('RegistrarScreen — gasto', () => {
  it('muestra el título y las tres opciones con Gasto activo', async () => {
    await open();
    expect(screen.getByRole('header', { name: 'Registrar movimiento' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Gasto' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Ingreso' })).not.toBeSelected();
    expect(screen.getByRole('radio', { name: 'Transferencia' })).not.toBeSelected();
  });

  it('guarda un gasto de 24.50: llama a create, avisa y limpia el monto', async () => {
    const { calls } = await open();
    await fillExpense();
    await fireEvent.press(save());
    await waitFor(() =>
      expect(calls.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'expense', amountMinor: 2450, currency: 'PEN', sourceAccountId: 'yapePen', categoryId: 'comida', occurredOn: '2026-11-20' }),
      ),
    );
    expect(await screen.findByText('Movimiento guardado')).toBeOnTheScreen();
    expect(screen.getByLabelText('Monto').props.value).toBe('');
  });

  it('doble toque en Guardar crea un solo movimiento', async () => {
    const { calls } = await open();
    await fillExpense();
    await fireEvent.press(save());
    await fireEvent.press(save());
    await screen.findByText('Movimiento guardado');
    expect(calls.createMovement).toHaveBeenCalledTimes(1);
  });

  it('"24,50" muestra el error de monto y no llama al repositorio', async () => {
    const { calls } = await open();
    await fillExpense('24,50');
    await fireEvent.press(save());
    expect(await screen.findByText('Ingresa un monto válido mayor a 0, con hasta 2 decimales.')).toBeOnTheScreen();
    expect(calls.createMovement).not.toHaveBeenCalled();
  });

  it('sin categoría pide elegirla', async () => {
    const { calls } = await open();
    await choose('Billetera', 'Yape · S/');
    await fireEvent.changeText(screen.getByLabelText('Monto'), '10');
    await fireEvent.press(save());
    expect(await screen.findByText('Elige una categoría.')).toBeOnTheScreen();
    expect(calls.createMovement).not.toHaveBeenCalled();
  });

  it('el prefijo del monto cambia con la moneda de la cuenta (S/ → $)', async () => {
    await open();
    expect(screen.getByText('S/')).toBeOnTheScreen();
    await choose('Billetera', 'Yape · $');
    expect(screen.getByText('$')).toBeOnTheScreen();
  });

  it('el selector de billetera de un gasto incluye la tarjeta; el de un ingreso no', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Billetera' }));
    expect(await screen.findByRole('radio', { name: 'Tarjeta BCP' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Yape · S/' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Ingreso' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Billetera' }));
    expect(screen.queryByRole('radio', { name: 'Tarjeta BCP' })).toBeNull();
  });

  it('un ingreso usa la cuenta como destino', async () => {
    const { calls } = await open();
    await fireEvent.press(screen.getByRole('radio', { name: 'Ingreso' }));
    await choose('Categoría', 'Sueldo');
    await choose('Billetera', 'Plin · S/');
    await fireEvent.changeText(screen.getByLabelText('Monto'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar movimiento' }));
    await waitFor(() => expect(calls.createMovement).toHaveBeenCalledWith(expect.objectContaining({ type: 'income', destAccountId: 'plinPen', sourceAccountId: null, amountMinor: 10000 })));
  });
});

describe('RegistrarScreen — fecha', () => {
  it('desactivar "¿Es de hoy?" muestra el calendario y la fecha elegida llega al movimiento', async () => {
    const { calls } = await open();
    await fillExpense();
    await fireEvent.press(screen.getByRole('switch', { name: '¿Es de hoy?' }));
    expect(await screen.findByRole('button', { name: 'Mes siguiente' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '3 de noviembre de 2026' }));
    await fireEvent.press(save());
    await waitFor(() => expect(calls.createMovement).toHaveBeenCalledWith(expect.objectContaining({ occurredOn: '2026-11-03' })));
  });

  it('con "¿Es de hoy?" activado no hay calendario', async () => {
    await open();
    expect(screen.queryByRole('button', { name: 'Mes siguiente' })).toBeNull();
    expect(screen.getByRole('switch', { name: '¿Es de hoy?' })).toBeChecked();
  });
});

describe('RegistrarScreen — transferencia', () => {
  async function toTransfer() {
    await fireEvent.press(screen.getByRole('radio', { name: 'Transferencia' }));
  }

  it('muestra "Entre mis billeteras", Desde/Hacia y el CTA de transferencia', async () => {
    await open();
    await toTransfer();
    expect(screen.getByText('Entre mis billeteras')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Desde' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Hacia' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Categoría' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Guardar transferencia' })).toBeOnTheScreen();
  });

  it('"Hacia" solo ofrece cuentas de la misma moneda y distintas del origen', async () => {
    await open();
    await toTransfer();
    await choose('Desde', 'Yape · S/');
    await fireEvent.press(screen.getByRole('button', { name: 'Hacia' }));
    expect(await screen.findByRole('radio', { name: 'Plin · S/' })).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Yape · $' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Yape · S/' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Tarjeta BCP' })).toBeNull();
  });

  it('cambiar "Desde" a otra moneda limpia "Hacia"', async () => {
    await open();
    await toTransfer();
    await choose('Desde', 'Yape · S/');
    await choose('Hacia', 'Plin · S/');
    expect(screen.getByText('Plin · S/')).toBeOnTheScreen();
    await choose('Desde', 'Yape · $');
    expect(screen.queryByText('Plin · S/')).toBeNull();
  });

  it('guarda una transferencia sin categoría', async () => {
    const { calls } = await open();
    await toTransfer();
    await choose('Desde', 'Yape · S/');
    await choose('Hacia', 'Plin · S/');
    await fireEvent.changeText(screen.getByLabelText('Monto'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar transferencia' }));
    await waitFor(() =>
      expect(calls.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'plinPen', categoryId: null, amountMinor: 10000 }),
      ),
    );
  });

  it('sin destino pide elegirlo', async () => {
    const { calls } = await open();
    await toTransfer();
    await choose('Desde', 'Yape · S/');
    await fireEvent.changeText(screen.getByLabelText('Monto'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar transferencia' }));
    expect(await screen.findByText('Elige la billetera de destino.')).toBeOnTheScreen();
    expect(calls.createMovement).not.toHaveBeenCalled();
  });

  it('los parámetros tipo=transferencia&desde=<cuenta> abren en Transferencia con "Desde" elegida', async () => {
    mockParams = { tipo: 'transferencia', desde: 'yapePen' };
    await open();
    expect(screen.getByRole('radio', { name: 'Transferencia' })).toBeSelected();
    expect(screen.getByText('Yape · S/')).toBeOnTheScreen();
  });
});

describe('RegistrarScreen — préstamo y deuda', () => {
  async function loanExpense() {
    await choose('Categoría', 'Préstamo');
    await choose('Billetera', 'Yape · S/');
    await fireEvent.changeText(screen.getByLabelText('Monto'), '150');
  }

  it('al elegir "Préstamo" aparece la fila "Deuda" y sin deuda no guarda', async () => {
    const { calls } = await open();
    expect(screen.queryByRole('button', { name: 'Deuda' })).toBeNull();
    await loanExpense();
    expect(screen.getByRole('button', { name: 'Deuda' })).toBeOnTheScreen();
    await fireEvent.press(save());
    expect(await screen.findByText('Elige o crea la deuda.')).toBeOnTheScreen();
    expect(calls.createMovement).not.toHaveBeenCalled();
  });

  it('elegir una deuda existente de la misma moneda la vincula', async () => {
    const { calls } = await open();
    await loanExpense();
    await fireEvent.press(screen.getByRole('button', { name: 'Deuda' }));
    expect(screen.queryByRole('radio', { name: /Pedro/ })).toBeNull(); // deuda en USD: otra moneda
    await fireEvent.press(await screen.findByRole('radio', { name: 'Carlos · Me deben' }));
    await fireEvent.press(save());
    await waitFor(() => expect(calls.createMovement).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'expense-1', debtId: 'd1', amountMinor: 15000 })));
  });

  it('"+ Nueva deuda" guarda con createWithNewDebt y no con create', async () => {
    const { calls } = await open();
    await loanExpense();
    await fireEvent.press(screen.getByRole('button', { name: 'Deuda' }));
    await fireEvent.press(await screen.findByRole('radio', { name: '+ Nueva deuda' }));
    await fireEvent.changeText(await screen.findByLabelText('Nombre'), 'Ana');
    await fireEvent.press(screen.getByRole('button', { name: 'Usar esta deuda' }));
    await fireEvent.press(save());
    await waitFor(() => expect(calls.createWithNewDebt).toHaveBeenCalledWith(expect.objectContaining({ amountMinor: 15000, debtId: null }), { counterpartyName: 'Ana', counterpartyType: 'person' }));
    expect(calls.createMovement).not.toHaveBeenCalled();
  });

  it('una deuda nueva sin nombre muestra el error y no se usa', async () => {
    await open();
    await loanExpense();
    await fireEvent.press(screen.getByRole('button', { name: 'Deuda' }));
    await fireEvent.press(await screen.findByRole('radio', { name: '+ Nueva deuda' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Usar esta deuda' }));
    expect(await screen.findByText('Escribe el nombre de la persona o institución.')).toBeOnTheScreen();
  });

  it('un error de deuda en negativo del repositorio se muestra tal cual', async () => {
    const fake = await open();
    fake.createResult = () => err('TIMELINE_VIOLATION', 'La deuda quedaría con pendiente negativo el 2026-11-20: sobran S/ 50.00.', {
      violations: [{ code: 'DEBT_NEGATIVE', entityId: 'd1', date: '2026-11-20', shortfallMinor: 5000 }],
    });
    await loanExpense();
    await fireEvent.press(screen.getByRole('button', { name: 'Deuda' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Carlos · Me deben' }));
    await fireEvent.press(save());
    expect(await screen.findByText('Deuda sobrepagada')).toBeOnTheScreen();
    expect(screen.getByText('La deuda quedaría con pendiente negativo el 2026-11-20: sobran S/ 50.00.')).toBeOnTheScreen();
  });
});

describe('RegistrarScreen — saldo insuficiente', () => {
  it('muestra el aviso con el faltante y la sugerencia, y conserva lo escrito', async () => {
    const fake = await open();
    fake.createResult = () => err('TIMELINE_VIOLATION', 'La billetera quedaría con saldo negativo el 2026-11-20: faltan S/ 80.00.', {
      violations: [{ code: 'WALLET_NEGATIVE', entityId: 'yapePen', date: '2026-11-20', shortfallMinor: 8000 }],
    });
    await fillExpense('80');
    await fireEvent.press(save());
    expect(await screen.findByText('Saldo insuficiente')).toBeOnTheScreen();
    expect(screen.getByText('La billetera quedaría con saldo negativo el 2026-11-20: faltan S/ 80.00.')).toBeOnTheScreen();
    expect(screen.getByText('Registra antes un ingreso (categoría «Otros») para cubrir la diferencia.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Monto').props.value).toBe('80');
    expect(screen.queryByText('Movimiento guardado')).toBeNull();
  });

  it('el aviso desaparece al corregir el monto', async () => {
    const fake = await open();
    fake.createResult = () => err('TIMELINE_VIOLATION', 'faltan S/ 80.00.', { violations: [{ code: 'WALLET_NEGATIVE', entityId: 'a', date: '2026-11-20', shortfallMinor: 8000 }] });
    await fillExpense('80');
    await fireEvent.press(save());
    await screen.findByText('Saldo insuficiente');
    await fireEvent.changeText(screen.getByLabelText('Monto'), '10');
    expect(screen.queryByText('Saldo insuficiente')).toBeNull();
  });
});
