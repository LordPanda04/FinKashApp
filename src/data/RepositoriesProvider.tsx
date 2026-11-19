import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { createRepositories, type Repositories } from './index';
import { openLocalDatabase } from './local/database';
import { seedDatabase } from './local/seed';
import { SYNCED_TABLES } from './local/schema';
import { RepositoriesContext } from './RepositoriesContext';

// Nombres de tabla que PowerSync puede reportar (la tabla sincronizable y su gemela local).
const WATCHED_TABLES = [...SYNCED_TABLES.flatMap((t) => [t.name, `local_${t.name}`]), 'device_settings'];

/** Abre la base local, corre la semilla (idempotente) y recién entonces muestra la app. */
export function RepositoriesProvider({ children }: { children: ReactNode }) {
  const [repositories, setRepositories] = useState<Repositories | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stopWatching: (() => void) | undefined;
    (async () => {
      const db = openLocalDatabase();
      await db.waitForReady();
      await seedDatabase(db);
      if (cancelled) return;
      const repos = createRepositories(db);
      // Cambios que no pasan por los repositorios (p. ej. la sincronización de la Fase 9).
      stopWatching = db.onChange({ onChange: () => repos.changes.notify() }, { tables: WATCHED_TABLES, throttleMs: 100 });
      setRepositories(repos);
    })().catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
    });
    return () => {
      cancelled = true;
      stopWatching?.();
    };
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No se pudo abrir la base de datos</Text>
        <Text>{error.message}</Text>
      </View>
    );
  }
  if (!repositories) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  return <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontWeight: '600' },
});
