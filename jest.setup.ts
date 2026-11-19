// expo-crypto es nativo: en Jest se sustituye por el UUID de Node.
jest.mock('expo-crypto', () => ({
  randomUUID: () => (jest.requireActual('node:crypto') as typeof import('node:crypto')).randomUUID(),
}));

// expo-symbols es nativo: en Jest, SymbolView se reemplaza por un host simple con las mismas props.
jest.mock('expo-symbols', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return { SymbolView: (props: Record<string, unknown>) => React.createElement('Symbol', props) };
});
