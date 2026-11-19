import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';

/**
 * Carga Inter. `ready` es true al terminar la carga **o** al fallar: la app nunca se queda
 * esperando; si falló (`failed`), el texto usa la fuente del sistema.
 */
export function useAppFonts(): { ready: boolean; failed: boolean } {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  return { ready: loaded || error !== null, failed: error !== null };
}
