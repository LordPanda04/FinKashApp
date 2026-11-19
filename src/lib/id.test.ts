import { newId } from './id';

describe('newId', () => {
  it('devuelve un UUID v4 válido', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('dos llamadas devuelven ids distintos', () => {
    expect(newId()).not.toBe(newId());
  });
});
