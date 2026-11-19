import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { z } from 'zod';
import { RepositoriesContext } from '@/data/RepositoriesContext';
import type { CategoryRecord, WalletRecord } from '@/data/types';
import type { Account } from '@/domain/ledger/types';
import { createFakeRepositories, movementOf } from '@/test-utils/fakeRepositories';
import { InicioScreen } from './InicioScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

const wallet = (id: string, name: string, sortOrder: number, over: Partial<WalletRecord> = {}): WalletRecord => ({
  id, name, walletType: 'digital', icon: 'smartphone', color: '#742384', isHidden: false, includeInGeneral: true, sortOrder, ...over,
});
const accounts: Account[] = [
  { id: 'yapePen', kind: 'wallet', walletId: 'w1', currency: 'PEN', creditLimitMinor: null },
  { id: 'plinPen', kind: 'wallet', walletId: 'w2', currency: 'PEN', creditLimitMinor: null },
];
const categories: CategoryRecord[] = [
  { id: 'food', name: 'Comida', color: '#1C9C4D', icon: 'restaurant', systemKey: null, sortOrder: 0 },
  { id: 'services', name: 'Servicios', color: '#F59E0B', icon: 'bolt', systemKey: null, sortOrder: 1 },
];
const m = (p: Parameters<typeof movementOf>[0]) => movementOf(p);
const scenario = () => [
  m({ id: '1', type: 'opening', sourceAccountId: null, destAccountId: 'yapePen', amountMinor: 50000, occurredOn: '2026-11-01' }),
  m({ id: '2', type: 'opening', sourceAccountId: null, destAccountId: 'plinPen', amountMinor: 21000, occurredOn: '2026-11-01' }),
  m({ id: '3', type: 'expense', sourceAccountId: 'yapePen', amountMinor: 2450, categoryId: 'food', occurredOn: '2026-11-03' }),
  m({ id: '4', type: 'expense', sourceAccountId: 'yapePen', amountMinor: 1800, categoryId: 'food', occurredOn: '2026-11-04' }),
  m({ id: '5', type: 'expense', sourceAccountId: 'plinPen', amountMinor: 11280, categoryId: 'services', occurredOn: '2026-11-06' }),
  m({ id: '6', type: 'income', sourceAccountId: null, destAccountId: 'yapePen', amountMinor: 50000, occurredOn: '2026-11-10' }),
  m({ id: '7', type: 'transfer', sourceAccountId: 'yapePen', destAccountId: 'plinPen', amountMinor: 10000, occurredOn: '2026-11-12' }),
];
// General: disponible 1,210.00 · gastado 155.30 · restante 1,054.70 — Plin: restante 197.20, gastado 112.80.

async function open(seed: Parameters<typeof createFakeRepositories>[0] = {}) {
  const fake = createFakeRepositories({
    categories, wallets: [wallet('w1', 'Yape', 0), wallet('w2', 'Plin', 1)], accounts, movements: scenario(), ...seed,
  });
  await render(
    <RepositoriesContext.Provider value={fake.repos}>
      <InicioScreen today="2026-11-20" />
    </RepositoriesContext.Provider>,
  );
  return fake;
}

function textsAndLabels(): string[] {
  const out: string[] = [];
  const walk = (node: { props?: Record<string, unknown>; children?: unknown[] } | string | null) => {
    if (node === null) return;
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    const label = node.props?.accessibilityLabel;
    if (typeof label === 'string') out.push(label);
    for (const child of node.children ?? []) walk(child as never);
  };
  walk(screen.toJSON() as never);
  return out;
}
const hasMoneyDigits = () => textsAndLabels().some((t) => /\d[\d,]*\.\d{2}/.test(t));

beforeEach(() => mockPush.mockClear());

describe('InicioScreen — Saldo general', () => {
  it('empieza con el saludo, sin título de pantalla, y muestra el resumen', async () => {
    await open();
    expect(await screen.findByText('Hola!')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Inicio' })).toBeNull();
    expect(await screen.findByText('S/ 1,210.00')).toBeOnTheScreen();
    expect(screen.getAllByText('S/ 155.30').length).toBeGreaterThanOrEqual(1); // gastado (y total de la dona)
    expect(screen.getAllByText('S/ 1,054.70').length).toBeGreaterThanOrEqual(1); // restante (y variación del flujo)
    expect(screen.getByRole('button', { name: 'Saldo general' })).toBeOnTheScreen();
  });

  it('muestra la dona del mes con el total y el flujo con la variación neta', async () => {
    await open();
    expect(await screen.findByText('Gastos del mes')).toBeOnTheScreen();
    expect(screen.getByText('Noviembre')).toBeOnTheScreen();
    expect(screen.getAllByText('S/ 155.30')).toHaveLength(2); // fila "Gastado" y total al centro de la dona
    expect(screen.getByText('Servicios')).toBeOnTheScreen();
    expect(screen.getByText('Comida')).toBeOnTheScreen();
    expect(screen.getByText('Flujo del mes')).toBeOnTheScreen();
    expect(screen.getByText('+ S/ 1,054.70')).toBeOnTheScreen();
  });
});

describe('InicioScreen — ojo', () => {
  it('con el ojo cerrado ninguna cifra queda visible ni en etiquetas de accesibilidad', async () => {
    const { calls } = await open({ thresholds: [{ id: 't1', currency: 'PEN', amountMinor: 30000, walletId: null }] });
    await screen.findByText('S/ 1,210.00');
    expect(screen.getByText('Límite: S/ 300.00')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar montos' }));
    await waitFor(() => expect(screen.queryByText('S/ 1,210.00')).toBeNull());
    expect(calls.setDevice).toHaveBeenCalledWith({ hideAmounts: true });
    expect(hasMoneyDigits()).toBe(false);
    expect(screen.getByText('Límite: ****')).toBeOnTheScreen();
    expect(screen.getAllByText('****').length).toBeGreaterThanOrEqual(7);
    expect(screen.getByText('Servicios')).toBeOnTheScreen(); // los nombres de categoría sí se ven
  });

  it('volver a tocar el ojo muestra los montos otra vez', async () => {
    const { calls } = await open();
    await screen.findByText('S/ 1,210.00');
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar montos' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Mostrar montos' }));
    expect(await screen.findByText('S/ 1,210.00')).toBeOnTheScreen();
    expect(calls.setDevice).toHaveBeenLastCalledWith({ hideAmounts: false });
  });

  it('abre ya oculto si así quedó guardado y con el alcance guardado', async () => {
    await open({ device: { hideAmounts: true, showProjection: false, homeScope: 'w2' } });
    expect(await screen.findByRole('button', { name: 'Plin' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mostrar montos' })).toBeOnTheScreen();
    expect(hasMoneyDigits()).toBe(false);
  });
});

describe('InicioScreen — alcance', () => {
  it('elegir "Solo Plin" cambia resumen, dona y flujo a la vez y guarda el alcance', async () => {
    const { calls } = await open();
    await screen.findByText('S/ 1,210.00');
    await fireEvent.press(screen.getByRole('button', { name: 'Saldo general' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Solo Plin' }));
    expect(await screen.findByRole('button', { name: 'Plin' })).toBeOnTheScreen();
    expect(await screen.findByText('S/ 310.00')).toBeOnTheScreen(); // disponible de Plin
    expect(screen.getByText('S/ 197.20')).toBeOnTheScreen(); // restante
    expect(screen.getAllByText('S/ 112.80').length).toBeGreaterThanOrEqual(2); // gastado y total de la dona
    expect(screen.queryByText('Comida')).toBeNull(); // la dona de Plin solo tiene Servicios
    expect(calls.setDevice).toHaveBeenCalledWith({ homeScope: 'w2' });
  });

  it('desmarcar la casilla de Yape baja el Saldo general y llama a setIncludeInGeneral', async () => {
    const { calls } = await open();
    await screen.findByText('S/ 1,210.00');
    await fireEvent.press(screen.getByRole('button', { name: 'Saldo general' }));
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Yape' }));
    await waitFor(() => expect(calls.setIncludeInGeneral).toHaveBeenCalledWith('w1', false));
    await fireEvent.press(screen.getByRole('radio', { name: 'Saldo general' }));
    expect(await screen.findByText('S/ 197.20')).toBeOnTheScreen();
  });
});

describe('InicioScreen — monedas', () => {
  const withUsd = () => {
    const usd: Account = { id: 'yapeUsd', kind: 'wallet', walletId: 'w1', currency: 'USD', creditLimitMinor: null };
    return {
      accounts: [...accounts, usd],
      movements: [
        ...scenario(),
        m({ id: 'u1', type: 'opening', sourceAccountId: null, destAccountId: 'yapeUsd', amountMinor: 10000, currency: 'USD', occurredOn: '2026-11-01' }),
        m({ id: 'u2', type: 'expense', sourceAccountId: 'yapeUsd', amountMinor: 2500, currency: 'USD', categoryId: 'food', occurredOn: '2026-11-02' }),
      ],
    };
  };

  it('con soles y dólares muestra las dos líneas en el resumen y un selector "S/ | $" para los gráficos', async () => {
    await open(withUsd());
    expect(await screen.findByText('$ 100.00')).toBeOnTheScreen();
    expect(screen.getByText('$ 25.00')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'S/' })).toBeSelected();
    expect(screen.getByRole('radio', { name: '$' })).not.toBeSelected();
  });

  it('cambiar a "$" dibuja la dona y el flujo en dólares sin mezclar monedas', async () => {
    await open(withUsd());
    await screen.findByText('$ 100.00');
    expect(screen.getAllByText('S/ 155.30').length).toBeGreaterThanOrEqual(2);
    await fireEvent.press(screen.getByRole('radio', { name: '$' }));
    expect(await screen.findByRole('radio', { name: '$' })).toBeSelected();
    await waitFor(() => expect(screen.getAllByText('$ 25.00').length).toBeGreaterThanOrEqual(2)); // fila de gastado + total de la dona
    expect(screen.queryByText('Servicios')).toBeNull(); // la categoría de soles no aparece en la dona de dólares
  });

  it('con una sola moneda no hay selector de moneda', async () => {
    await open();
    await screen.findByText('S/ 1,210.00');
    expect(screen.queryByRole('radio', { name: '$' })).toBeNull();
  });
});

describe('InicioScreen — proyección y umbral', () => {
  it('"Ver proyectado" existe en Saldo general y, al activarlo, muestra el proyectado y lo guarda', async () => {
    const { calls } = await open();
    await screen.findByText('S/ 1,210.00');
    expect(screen.queryByText('Proyectado a fin de mes')).toBeNull();
    await fireEvent.press(screen.getByRole('switch', { name: 'Ver proyectado' }));
    expect(await screen.findByText('Proyectado a fin de mes')).toBeOnTheScreen();
    expect(calls.setDevice).toHaveBeenCalledWith({ showProjection: true });
  });

  it('con una sola billetera no hay proyección', async () => {
    await open({ device: { hideAmounts: false, showProjection: true, homeScope: 'w2' } });
    await screen.findByText('S/ 197.20');
    expect(screen.queryByRole('switch', { name: 'Ver proyectado' })).toBeNull();
    expect(screen.queryByText('Proyectado a fin de mes')).toBeNull();
  });

  it('el restante bajo el umbral se muestra en rojo', async () => {
    await open({ thresholds: [{ id: 't1', currency: 'PEN', amountMinor: 200000, walletId: null }] });
    expect(await screen.findByText('S/ 1,054.70')).toHaveStyle({ color: '#E5484D' });
  });

  it('sin umbral el restante conserva el color normal', async () => {
    await open();
    expect(await screen.findByText('S/ 1,054.70')).toHaveStyle({ color: '#1D1D1F' });
  });

  it('tocar "Flujo del mes" abre el umbral; guardar "300" lo aplica y aparece "Límite: S/ 300.00"', async () => {
    const { calls } = await open();
    await screen.findByText('S/ 1,210.00');
    await fireEvent.press(screen.getByRole('button', { name: 'Flujo del mes' }));
    await fireEvent.changeText(await screen.findByLabelText('Monto mínimo'), '300');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(calls.setThreshold).toHaveBeenCalledWith({ currency: 'PEN', amountMinor: 30000 }));
    expect(await screen.findByText('Límite: S/ 300.00')).toBeOnTheScreen();
  });

  it('un monto con coma decimal muestra el error y no guarda', async () => {
    const { calls } = await open();
    await screen.findByText('S/ 1,210.00');
    await fireEvent.press(screen.getByRole('button', { name: 'Flujo del mes' }));
    await fireEvent.changeText(await screen.findByLabelText('Monto mínimo'), '24,50');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ingresa un monto válido mayor a 0, con hasta 2 decimales.')).toBeOnTheScreen();
    expect(calls.setThreshold).not.toHaveBeenCalled();
  });

  it('en una billetera el umbral se guarda para esa billetera', async () => {
    const { calls } = await open({ device: { hideAmounts: false, showProjection: false, homeScope: 'w2' } });
    await screen.findByText('S/ 197.20');
    await fireEvent.press(screen.getByRole('button', { name: 'Flujo del mes' }));
    await fireEvent.changeText(await screen.findByLabelText('Monto mínimo'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(calls.setThreshold).toHaveBeenCalledWith({ currency: 'PEN', amountMinor: 10000, walletId: 'w2' }));
  });

  it('quitar el umbral llama a clearThreshold', async () => {
    const { calls } = await open({ thresholds: [{ id: 't1', currency: 'PEN', amountMinor: 30000, walletId: null }] });
    await screen.findByText('Límite: S/ 300.00');
    await fireEvent.press(screen.getByRole('button', { name: 'Flujo del mes' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Quitar umbral' }));
    await waitFor(() => expect(calls.clearThreshold).toHaveBeenCalledWith('PEN', null));
    await waitFor(() => expect(screen.queryByText('Límite: S/ 300.00')).toBeNull());
  });
});

describe('InicioScreen — casos límite', () => {
  it('sin gastos en el periodo la dona muestra "Sin gastos"', async () => {
    await open({ movements: scenario().slice(0, 2) });
    expect(await screen.findByText('Sin gastos')).toBeOnTheScreen();
  });

  it('primer uso sin billeteras: "Crea tu primera billetera" y el botón lleva a Billeteras', async () => {
    await open({ wallets: [], accounts: [], movements: [] });
    expect(await screen.findByText('Crea tu primera billetera')).toBeOnTheScreen();
    expect(screen.queryByText('Gastos del mes')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear billetera' }));
    expect(mockPush).toHaveBeenCalledWith('/billeteras');
  });

  it('si ninguna billetera está incluida en el Saldo general lo explica y permite elegir', async () => {
    await open({ wallets: [wallet('w1', 'Yape', 0, { includeInGeneral: false }), wallet('w2', 'Plin', 1, { includeInGeneral: false })] });
    expect(await screen.findByText('Ninguna billetera está incluida en el Saldo general.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Elegir billeteras' }));
    expect(await screen.findByRole('checkbox', { name: 'Yape' })).toBeOnTheScreen();
  });

  it('si la lectura falla muestra un aviso en vez de una pantalla en blanco', async () => {
    const fake = createFakeRepositories({ categories, wallets: [wallet('w1', 'Yape', 0)], accounts, movements: scenario() });
    (fake.repos.ledger as { state: () => Promise<never> }).state = async () => {
      throw new Error('base cerrada');
    };
    await render(
      <RepositoriesContext.Provider value={fake.repos}>
        <InicioScreen today="2026-11-20" />
      </RepositoriesContext.Provider>,
    );
    expect(await screen.findByText('No se pudo leer tu información.')).toBeOnTheScreen();
    expect(screen.getByText('Hola!')).toBeOnTheScreen();
  });

  it('un alcance guardado que ya no existe vuelve a Saldo general', async () => {
    await open({ device: { hideAmounts: false, showProjection: false, homeScope: 'borrada' } });
    expect(await screen.findByRole('button', { name: 'Saldo general' })).toBeOnTheScreen();
    expect(screen.getByText('S/ 1,210.00')).toBeOnTheScreen();
  });
});

describe('InicioScreen — nombre del usuario (D50)', () => {
  const device = (displayName: string | null) => ({ hideAmounts: false, showProjection: false, homeScope: 'general', displayName });

  it('primer arranque (sin nombre guardado): pide el nombre y, al continuar, saluda "Hola!, Ana"', async () => {
    const fake = await open({ device: device(null) });
    expect(await screen.findByText('¿Cómo te llamas?')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Ana');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Hola!, Ana')).toBeOnTheScreen();
    expect(fake.calls.setDevice).toHaveBeenCalledWith({ displayName: 'Ana' });
    expect(screen.queryByText('¿Cómo te llamas?')).toBeNull();
  });

  it('Omitir guarda "" y deja el saludo en "Hola!" sin volver a preguntar', async () => {
    const fake = await open({ device: device(null) });
    await fireEvent.press(await screen.findByRole('button', { name: 'Omitir' }));
    await waitFor(() => expect(screen.queryByText('¿Cómo te llamas?')).toBeNull());
    expect(fake.calls.setDevice).toHaveBeenCalledWith({ displayName: '' });
    expect(screen.getByText('Hola!')).toBeOnTheScreen();
  });

  it('con nombre guardado o con el nombre omitido no aparece la hoja de bienvenida', async () => {
    await open({ device: device('Ana') });
    expect(await screen.findByText('Hola!, Ana')).toBeOnTheScreen();
    expect(screen.queryByText('¿Cómo te llamas?')).toBeNull();
  });

  it('con el nombre omitido ("") tampoco pregunta', async () => {
    await open({ device: device('') });
    expect(await screen.findByText('Hola!')).toBeOnTheScreen();
    expect(screen.queryByText('¿Cómo te llamas?')).toBeNull();
  });

  it('tocar el saludo abre "Tu nombre" con el nombre actual y guardar lo cambia', async () => {
    await open({ device: device('Ana') });
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar tu nombre' }));
    expect(await screen.findByText('Tu nombre')).toBeOnTheScreen();
    expect(screen.getByLabelText('Nombre').props.value).toBe('Ana');
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Luis');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Hola!, Luis')).toBeOnTheScreen();
  });

  it('vaciar el nombre al editar vuelve al saludo "Hola!"', async () => {
    await open({ device: device('Ana') });
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar tu nombre' }));
    await fireEvent.changeText(await screen.findByLabelText('Nombre'), '');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Hola!')).toBeOnTheScreen();
  });

  it('un nombre de 41 caracteres muestra el error del repositorio y no se guarda', async () => {
    await open({ device: device('Ana') });
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar tu nombre' }));
    await fireEvent.changeText(await screen.findByLabelText('Nombre'), 'x'.repeat(41));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('El nombre puede tener hasta 40 caracteres.')).toBeOnTheScreen();
    expect(screen.getByText('Hola!, Ana')).toBeOnTheScreen();
  });

  it('un ZodError del repositorio real se muestra con su primer mensaje, no como JSON', async () => {
    const fake = await open({ device: device('Ana') });
    (fake.repos.settings as { setDevice: (p: unknown) => Promise<void> }).setDevice = async () => {
      z.string().max(1, 'El nombre puede tener hasta 40 caracteres.').parse('xx');
    };
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar tu nombre' }));
    await fireEvent.changeText(await screen.findByLabelText('Nombre'), 'Luis');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('El nombre puede tener hasta 40 caracteres.')).toBeOnTheScreen();
  });

  it('un nombre largo se recorta a una línea en el saludo', async () => {
    await open({ device: device('x'.repeat(40)) });
    const greeting = await screen.findByText(`Hola!, ${'x'.repeat(40)}`);
    expect(greeting.props.numberOfLines).toBe(1);
  });
});
