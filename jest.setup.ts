// expo-crypto es nativo: en Jest se sustituye por el UUID de Node.
jest.mock('expo-crypto', () => ({
  randomUUID: () => (jest.requireActual('node:crypto') as typeof import('node:crypto')).randomUUID(),
}));
