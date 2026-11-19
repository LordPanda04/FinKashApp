import { act, fireEvent } from '@testing-library/react-native';
import { renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { Keyboard } from 'react-native';
import Billeteras from '@/app/(tabs)/billeteras';
import Categorias from '@/app/(tabs)/categorias';
import Historial from '@/app/(tabs)/historial';
import Inicio from '@/app/(tabs)/index';
import TabsLayout from '@/app/(tabs)/_layout';
import Registrar from '@/app/(tabs)/registrar';
import { RepositoriesContext } from '@/data/RepositoriesContext';
import { createFakeRepositories } from '@/test-utils/fakeRepositories';

let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => mockInsets,
}));

const routes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': Inicio,
  '(tabs)/historial': Historial,
  '(tabs)/registrar': function RegistrarConDatos() {
    return (
      <RepositoriesContext.Provider value={createFakeRepositories().repos}>
        <Registrar />
      </RepositoriesContext.Provider>
    );
  },
  '(tabs)/billeteras': function BilleterasConDatos() {
    return (
      <RepositoriesContext.Provider value={createFakeRepositories().repos}>
        <Billeteras />
      </RepositoriesContext.Provider>
    );
  },
  '(tabs)/categorias': function CategoriasConDatos() {
    return (
      <RepositoriesContext.Provider value={createFakeRepositories().repos}>
        <Categorias />
      </RepositoriesContext.Provider>
    );
  },
};

const LABELS = ['Inicio', 'Historial', 'Registrar movimiento', 'Billeteras', 'Categorías'];
const tab = (name: string) => screen.getByRole('tab', { name });

// Captura los listeners del teclado para dispararlos a mano.
const keyboard = {
  handlers: {} as Record<string, () => void>,
  fire(event: string) {
    this.handlers[event]?.();
  },
};

beforeEach(() => {
  mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  keyboard.handlers = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: () => void) => {
    keyboard.handlers[event] = handler;
    return { remove: () => undefined };
  }) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('barra de pestañas', () => {
  it('muestra 5 ítems con etiqueta en español y solo Inicio seleccionado al abrir', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    for (const label of LABELS) expect(tab(label)).toBeOnTheScreen();
    expect(tab('Inicio')).toBeSelected();
    for (const label of LABELS.slice(1)) expect(tab(label)).not.toBeSelected();
  });

  it('tocar "Billeteras" navega y mueve la selección', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(tab('Billeteras'));
    expect(screen).toHavePathname('/billeteras');
    expect(tab('Billeteras')).toBeSelected();
    expect(tab('Inicio')).not.toBeSelected();
  });

  it('el botón "+" abre Registrar movimiento y lo selecciona', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(tab('Registrar movimiento'));
    expect(screen).toHavePathname('/registrar');
    expect(tab('Registrar movimiento')).toBeSelected();
  });

  it('la barra sigue visible en Registrar (es una pantalla de pestaña, no un modal)', async () => {
    await renderRouter(routes, { initialUrl: '/registrar' });
    expect(screen.getByTestId('tab-bar')).toBeOnTheScreen();
  });

  it('atrás desde Registrar vuelve a la pestaña anterior', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(tab('Billeteras'));
    await fireEvent.press(tab('Registrar movimiento'));
    await testRouter.back();
    expect(screen).toHavePathname('/billeteras');
  });

  it('se oculta con el teclado visible y reaparece al cerrarlo', async () => {
    await renderRouter(routes, { initialUrl: '/registrar' });
    await act(async () => {
      keyboard.fire('keyboardDidShow');
    });
    expect(screen.queryByTestId('tab-bar')).toBeNull();
    await act(async () => {
      keyboard.fire('keyboardDidHide');
    });
    expect(screen.getByTestId('tab-bar')).toBeOnTheScreen();
  });

  it('queda a 20 px del borde inferior sin inset y a 20 + inset con navegación por gestos', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByTestId('tab-bar')).toHaveStyle({ bottom: 20 });
  });

  it('con inset inferior de 24 la barra se eleva a 44 px', async () => {
    mockInsets = { top: 0, bottom: 24, left: 0, right: 0 };
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByTestId('tab-bar')).toHaveStyle({ bottom: 44 });
  });

  it('deja 20 px de margen lateral (ancho = pantalla − 40)', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByTestId('tab-bar')).toHaveStyle({ left: 20, right: 20 });
  });
});

describe('pantallas', () => {
  it('Billeteras muestra su título y sus secciones', async () => {
    await renderRouter(routes, { initialUrl: '/billeteras' });
    expect(screen.getByRole('header', { name: 'Billeteras' })).toBeOnTheScreen();
    expect(await screen.findByText('Mis Billeteras')).toBeOnTheScreen();
  });

  it('Categorías muestra su título y sus datos', async () => {
    await renderRouter(routes, { initialUrl: '/categorias' });
    expect(screen.getByRole('header', { name: 'Categorías' })).toBeOnTheScreen();
    expect(await screen.findAllByText('Otros')).toHaveLength(2);
  });

  it('Inicio: saludo sin título de pantalla', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByText('Hola!')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Inicio' })).toBeNull();
  });

  it.each([
    ['/historial', 'Historial', 'Aquí irá el historial de movimientos.'],
  ])('%s muestra su título y su estado vacío en español', async (url, title, empty) => {
    await renderRouter(routes, { initialUrl: url });
    expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
    expect(screen.getByText(empty)).toBeOnTheScreen();
  });
});
