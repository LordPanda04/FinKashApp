import { useCallback, useEffect, useRef, useState } from 'react';
import type { Repositories } from './index';
import { useRepositories } from './RepositoriesContext';

/**
 * Lee datos por repositorios y los mantiene al día: vuelve a leer al montar, cuando cambian
 * `deps`, cuando el notificador avisa de una escritura o con `reload()`. Si una lectura vieja
 * termina después de una nueva, se descarta. En un error conserva el último dato bueno.
 */
export function useQuery<T>(
  fn: (repos: Repositories) => Promise<T>,
  deps: unknown[] = [],
): { data: T | undefined; loading: boolean; error: Error | null; reload: () => void } {
  const repos = useRepositories();
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const latest = useRef(0);
  const fnRef = useRef(fn);
  // Se actualiza tras cada render (antes del efecto de lectura) para que `run` use la `fn` más reciente.
  useEffect(() => {
    fnRef.current = fn;
  });

  const run = useCallback(() => {
    const ticket = ++latest.current;
    fnRef
      .current(repos)
      .then((value) => {
        if (ticket !== latest.current) return;
        setData(value);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (ticket !== latest.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
  }, [repos]);

  useEffect(() => {
    run();
    const off = repos.changes.subscribe(run);
    return () => {
      off();
      // Intencional: invalida las lecturas en vuelo al desmontar o cambiar deps.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      latest.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, repos, ...deps]);

  return { data, loading, error, reload: run };
}
