import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RepositoriesContext } from '@/data/RepositoriesContext';
import type { CategoryRecord, WalletRecord } from '@/data/types';
import type { Account } from '@/domain/ledger/types';
import { err } from '@/lib/result';
import { createFakeRepositories, movementOf, seededCategories } from '@/test-utils/fakeRepositories';
import { HistorialScreen } from './HistorialScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

const wallets: WalletRecord[] = [
  { id: 'w1', name: 'Yape', walletType: 'digital', icon: 'smartphone', color: '#742384', isHidden: false, includeInGeneral: true, sortOrder: 0 },
  { id: 'w2', name: 'Plin', walletType: 'digital', icon: 'smartphone', color: '#00D1A0', isHidden: false, includeInGeneral: true, sortOrder: 1 },
];
const accounts: Account[] = [
  { id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
  { id: 'plinPen', kind: 'wallet', walletId: 'w2', currency: 'PEN', creditLimitMinor: null },
];
const comida: CategoryRecord = { id: 'comida', name: 'Comida', color: '#1C9C4D', icon: 'restaurant', systemKey: null, sortOrder: 50 };
const sueldo: CategoryRecord = { id: 'sueldo', name: 'Sueldo', color: '#1C9C4D', icon: 'work', systemKey: null, sortOrder: 51 };

const movements = [
  movementOf({ id: 'm1', type: 'expense', occurredOn: '2026-11-20', description: 'Menú', categoryId: 'comida', sourceAccountId: 'yapePen', amountMinor: 2450 }),
  movementOf({ id: 'm2', type: 'income', occurredOn: '2026-11-19', description: 'Pago', categoryId: 'sueldo', sourceAccountId: null, destAccountId: 'plinPen', amountMinor: 100000 }),
  movementOf({ id: 'm3', type: 'transfer', occurredOn: '2026-11-14', description: null, categoryId: null, sourceAccountId: 'yapePen', destAccountId: 'plinPen', amountMinor: 10000 }),
  movementOf({ id: 'm4', type: 'opening', occurredOn: '2026-11-01', categoryId: null, sourceAccountId: null, destAccountId: 'yapePen', amountMinor: 50000 }),
  movementOf({ id: 'm5', type: 'expense', occurredOn: '2026-10-20', description: 'Café viejo', categoryId: 'comida', sourceAccountId: 'yapePen', amountMinor: 500 }),
];

async function open() {
  const fake = createFakeRepositories({ categories: [...seededCategories(), comida, sueldo], wallets, accounts, movements: [...movements] });
  await render(
    <RepositoriesContext.Provider value={fake.repos}>
      <HistorialScreen today="2026-11-20" />
    </RepositoriesContext.Provider>,
  );
  await screen.findByText('Menú');
  return fake;
}

beforeEach(() => mockPush.mockClear());

describe('HistorialScreen — lista', () => {
  it('muestra el título, los grupos por día y las filas sin hora', async () => {
    await open();
    expect(screen.getByRole('header', { name: 'Historial' })).toBeOnTheScreen();
    expect(screen.getByText('Hoy')).toBeOnTheScreen();
    expect(screen.getByText('Ayer')).toBeOnTheScreen();
    expect(screen.getByText('14 Nov')).toBeOnTheScreen();
    expect(screen.getByText('1 Nov')).toBeOnTheScreen();
    expect(screen.getByText('Menú')).toBeOnTheScreen();
    expect(screen.getByText('Pago')).toBeOnTheScreen();
    expect(screen.queryByText(/\d{1,2}:\d{2}/)).toBeNull();
  });

  it('montos con signo y color; transferencias y aperturas sin signo', async () => {
    await open();
    expect(screen.getByText('- S/ 24.50')).toHaveStyle({ color: '#E5484D' });
    expect(screen.getByText('+ S/ 1,000.00')).toHaveStyle({ color: '#1C9C4D' });
    expect(screen.getByText('S/ 100.00')).toBeOnTheScreen(); // transferencia
    expect(screen.getByText('Yape → Plin')).toBeOnTheScreen();
    expect(screen.getByText('Apertura')).toBeOnTheScreen();
  });

  it('por defecto muestra solo "Este mes" (el movimiento de octubre no aparece)', async () => {
    await open();
    expect(screen.queryByText('Café viejo')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Fecha' }));
    expect(await screen.findByRole('radio', { name: 'Este mes' })).toBeSelected();
  });

  it('elegir "Todo" muestra también octubre', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Fecha' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Todo' }));
    expect(await screen.findByText('Café viejo')).toBeOnTheScreen();
  });

  it('el filtro de Categoría deja solo las categorías elegidas', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Categoría' }));
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Comida' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Listo' }));
    expect(screen.getByText('Menú')).toBeOnTheScreen();
    expect(screen.queryByText('Pago')).toBeNull();
  });

  it('el filtro de Billetera incluye transferencias que la tocan', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Billetera' }));
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Plin' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Listo' }));
    expect(screen.getByText('Pago')).toBeOnTheScreen();
    expect(screen.getByText('Yape → Plin')).toBeOnTheScreen();
    expect(screen.queryByText('Menú')).toBeNull();
  });

  it('sin resultados muestra el mensaje vacío', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Categoría' }));
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Sueldo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Listo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Fecha' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Mes pasado' }));
    expect(await screen.findByText('No hay movimientos con estos filtros.')).toBeOnTheScreen();
  });
});

describe('HistorialScreen — elegir mes', () => {
  async function openMonths() {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Fecha' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Elegir mes…' }));
  }

  it('"Elegir mes…" abre la lista de meses con movimientos, el actual primero, sin meses vacíos', async () => {
    await openMonths();
    expect(await screen.findByRole('radio', { name: 'Noviembre 2026' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Octubre 2026' })).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Septiembre 2026' })).toBeNull();
    const labels = screen.getAllByRole('radio').map((r) => r.props.accessibilityLabel);
    expect(labels).toEqual(['Noviembre 2026', 'Octubre 2026']);
  });

  it('elegir octubre muestra solo sus movimientos y el chip pasa a decir "Octubre 2026"', async () => {
    await openMonths();
    await fireEvent.press(await screen.findByRole('radio', { name: 'Octubre 2026' }));
    expect(await screen.findByText('Café viejo')).toBeOnTheScreen();
    expect(screen.queryByText('Menú')).toBeNull();
    expect(screen.getByRole('button', { name: 'Octubre 2026' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Fecha' })).toBeNull();
  });

  it('volver a elegir "Este mes" restablece el chip y la lista', async () => {
    await openMonths();
    await fireEvent.press(await screen.findByRole('radio', { name: 'Octubre 2026' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Octubre 2026' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Este mes' }));
    expect(await screen.findByText('Menú')).toBeOnTheScreen();
    expect(screen.queryByText('Café viejo')).toBeNull();
    expect(screen.getByRole('button', { name: 'Fecha' })).toBeOnTheScreen();
  });

  it('elegir el mes actual en la lista equivale a "Este mes"', async () => {
    await openMonths();
    await fireEvent.press(await screen.findByRole('radio', { name: 'Noviembre 2026' }));
    expect(await screen.findByText('Menú')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fecha' })).toBeOnTheScreen();
  });

  it('un mes con movimientos pero sin coincidencias para los demás filtros muestra la lista vacía', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Categoría' }));
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Sueldo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Listo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Fecha' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Elegir mes…' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Octubre 2026' }));
    expect(await screen.findByText('No hay movimientos con estos filtros.')).toBeOnTheScreen();
  });
});

describe('HistorialScreen — modo edición', () => {
  it('el lápiz muestra "Editar" y "Eliminar" en cada fila y se oculta al terminar', async () => {
    await open();
    expect(screen.queryByRole('button', { name: 'Editar Menú' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Editar historial' }));
    expect(screen.getByRole('button', { name: 'Editar Menú' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Eliminar Menú' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Terminar edición' }));
    expect(screen.queryByRole('button', { name: 'Editar Menú' })).toBeNull();
  });

  it('"Editar" abre la pantalla de edición del movimiento', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Editar historial' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Editar Menú' }));
    expect(mockPush).toHaveBeenCalledWith('/movimiento/m1');
  });

  it('"Eliminar" pide confirmación; cancelar no borra y confirmar sí', async () => {
    const { calls } = await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Editar historial' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar Menú' }));
    expect(await screen.findByText('Esta acción no se puede deshacer.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(calls.removeMovement).not.toHaveBeenCalled();
    expect(screen.getByText('Menú')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar Menú' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(calls.removeMovement).toHaveBeenCalledWith('m1'));
    await waitFor(() => expect(screen.queryByText('Menú')).toBeNull());
  });

  it('un TIMELINE_VIOLATION al eliminar muestra el aviso y la fila sigue', async () => {
    const fake = await open();
    fake.removeResult = () =>
      err('TIMELINE_VIOLATION', 'La billetera quedaría con saldo negativo el 2026-11-12: faltan S/ 80.00.', {
        violations: [{ code: 'WALLET_NEGATIVE', entityId: 'yapePen', date: '2026-11-12', shortfallMinor: 8000 }],
      });
    await fireEvent.press(screen.getByRole('button', { name: 'Editar historial' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar Pago' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('Saldo insuficiente')).toBeOnTheScreen();
    expect(screen.getByText('La billetera quedaría con saldo negativo el 2026-11-12: faltan S/ 80.00.')).toBeOnTheScreen();
    expect(screen.getByText('Pago')).toBeOnTheScreen();
  });
});
