/** Avisa a las pantallas cuando los datos cambiaron, para que vuelvan a leer. */
export interface ChangeNotifier {
  /** Devuelve la función para darse de baja. */
  subscribe(listener: () => void): () => void;
  notify(): void;
}

export function createChangeNotifier(): ChangeNotifier {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify() {
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch (error) {
          // Un oyente defectuoso no debe impedir avisar a los demás.
          console.error('Error en un oyente de cambios', error);
        }
      }
    },
  };
}
