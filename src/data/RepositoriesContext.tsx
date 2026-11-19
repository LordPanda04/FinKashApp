import { createContext, useContext } from 'react';
import type { Repositories } from './index';

export const RepositoriesContext = createContext<Repositories | null>(null);

export function useRepositories(): Repositories {
  const value = useContext(RepositoriesContext);
  if (!value) throw new Error('useRepositories debe usarse dentro de RepositoriesProvider');
  return value;
}
