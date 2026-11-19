import { renderHook } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { useAppFonts } from './fonts';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));
const mockUseFonts = useFonts as jest.Mock;

describe('useAppFonts', () => {
  it('mientras carga: ready false', async () => {
    mockUseFonts.mockReturnValue([false, null]);
    expect((await renderHook(() => useAppFonts())).result.current).toEqual({ ready: false, failed: false });
  });

  it('carga correcta: ready true y failed false', async () => {
    mockUseFonts.mockReturnValue([true, null]);
    expect((await renderHook(() => useAppFonts())).result.current).toEqual({ ready: true, failed: false });
  });

  it('error de carga: ready true (la app no se queda esperando) y failed true', async () => {
    mockUseFonts.mockReturnValue([false, new Error('sin red')]);
    expect((await renderHook(() => useAppFonts())).result.current).toEqual({ ready: true, failed: true });
  });

  it('pide los cuatro pesos de Inter', async () => {
    mockUseFonts.mockReturnValue([true, null]);
    await renderHook(() => useAppFonts());
    const requested = Object.keys(mockUseFonts.mock.calls.at(-1)![0]);
    expect(requested.sort()).toEqual(['Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'Inter_700Bold']);
  });
});
