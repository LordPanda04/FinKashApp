// Prueba de humo: confirma que Jest (preset jest-expo) ejecuta TypeScript.
describe('entorno de pruebas', () => {
  it('ejecuta TypeScript', () => {
    const total: number = [1, 2].reduce((a, b) => a + b, 0);
    expect(total).toBe(3);
  });
});
