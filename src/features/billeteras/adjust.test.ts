import { adjustPreview } from './adjust';

describe('adjustPreview', () => {
  it('declarar menos que el saldo baja', () => {
    expect(adjustPreview(37550, 30000)).toEqual({ differenceMinor: -7550, direction: 'down' });
  });

  it('declarar más que el saldo sube', () => {
    expect(adjustPreview(37550, 40000)).toEqual({ differenceMinor: 2450, direction: 'up' });
  });

  it('declarar lo mismo no cambia nada', () => {
    expect(adjustPreview(37550, 37550)).toEqual({ differenceMinor: 0, direction: 'none' });
  });

  it('declarar 0 vacía la billetera', () => {
    expect(adjustPreview(37550, 0)).toEqual({ differenceMinor: -37550, direction: 'down' });
  });
});
