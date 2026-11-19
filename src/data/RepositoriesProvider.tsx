import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { createRepositories, type Repositories } from './index';
import { openLocalDatabase } from './local/database';
import { seedDatabase } from './local/seed';

const RepositoriesContext = createContext<Repositories | null>(null);

/** Abre la base local, corre la semilla (idempotente) y recién entonces muestra la app. */
export function RepositoriesProvider({ children }: { children: ReactNode }) {
  const [repositories, setRepositories] = useState<Repositories | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = openLocalDatabase();
      await db.waitForReady();
      await seedDatabase(db);
      if (!cancelled) setRepositories(createRepositories(db));
    })().catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
    });
    return () => {
      cancelled = true;
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

export function useRepositories(): Repositories {
  const value = useContext(RepositoriesContext);
  if (!value) throw new Error('useRepositories debe usarse dentro de RepositoriesProvider');
  return value;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontWeight: '600' },
});
