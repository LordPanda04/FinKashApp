import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { createChangeNotifier } from './changes';
import { RepositoriesContext } from './RepositoriesContext';
import type { Repositories } from './index';
import { useQuery } from './useQuery';

function setup() {
  const changes = createChangeNotifier();
  const repos = { changes } as unknown as Repositories;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RepositoriesContext.Provider value={repos}>{children}</RepositoriesContext.Provider>
  );
  return { changes, wrapper };
}

describe('useQuery', () => {
  it('empieza cargando y luego entrega el dato', async () => {
    const { wrapper } = setup();
    let resolve!: (v: number) => void;
    const pending = new Promise<number>((r) => (resolve = r));
    const { result } = await renderHook(() => useQuery(() => pending), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();
    await act(async () => resolve(42));
    await waitFor(() => expect(result.current.data).toBe(42));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('vuelve a leer cuando el notificador avisa', async () => {
    const { wrapper, changes } = setup();
    let value = 1;
    const { result } = await renderHook(() => useQuery(async () => value), { wrapper });
    await waitFor(() => expect(result.current.data).toBe(1));
    value = 2;
    await act(async () => changes.notify());
    await waitFor(() => expect(result.current.data).toBe(2));
  });

  it('si la lectura vieja termina después de la nueva, gana la más reciente', async () => {
    const { wrapper, changes } = setup();
    const resolvers: ((v: string) => void)[] = [];
    const fn = () => new Promise<string>((resolve) => resolvers.push(resolve));
    const { result } = await renderHook(() => useQuery(fn), { wrapper });
    await act(async () => changes.notify()); // segunda lectura
    expect(resolvers).toHaveLength(2);
    await act(async () => resolvers[1]!('nuevo'));
    await act(async () => resolvers[0]!('viejo'));
    expect(result.current.data).toBe('nuevo');
  });

  it('un error queda en error y data conserva el último valor bueno', async () => {
    const { wrapper, changes } = setup();
    let fail = false;
    const { result } = await renderHook(
      () =>
        useQuery(async () => {
          if (fail) throw new Error('boom');
          return 'ok';
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toBe('ok'));
    fail = true;
    await act(async () => changes.notify());
    await waitFor(() => expect(result.current.error?.message).toBe('boom'));
    expect(result.current.data).toBe('ok');
  });

  it('al desmontar se da de baja: un aviso posterior no vuelve a leer', async () => {
    const { wrapper, changes } = setup();
    const fn = jest.fn(async () => 1);
    const { unmount } = await renderHook(() => useQuery(fn), { wrapper });
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    await unmount();
    await act(async () => changes.notify());
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('reload() fuerza una lectura', async () => {
    const { wrapper } = setup();
    const fn = jest.fn(async () => 1);
    const { result } = await renderHook(() => useQuery(fn), { wrapper });
    await waitFor(() => expect(result.current.data).toBe(1));
    await act(async () => result.current.reload());
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
  });

  it('cambiar deps vuelve a leer', async () => {
    const { wrapper } = setup();
    const fn = jest.fn(async (id: number) => id);
    const { result, rerender } = await renderHook(({ id }: { id: number }) => useQuery(async () => fn(id), [id]), {
      wrapper,
      initialProps: { id: 1 },
    });
    await waitFor(() => expect(result.current.data).toBe(1));
    await rerender({ id: 2 });
    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
