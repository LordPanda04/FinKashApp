import { randomUUID } from 'expo-crypto';

/** UUID v4 generado en el dispositivo (permite crear registros sin conexión y sin cuenta). */
export function newId(): string {
  return randomUUID();
}
