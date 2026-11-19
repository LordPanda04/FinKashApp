import type { CategoryRecord } from '@/data/types';
import { deleteMessage, describeCategory } from './presenter';

const comida: CategoryRecord = { id: 'c1', name: 'Comida', color: '#1C9C4D', icon: 'restaurant', systemKey: null, sortOrder: 1 };

describe('describeCategory', () => {
  it('categoría de usuario: se puede eliminar y no expone ningún tipo', () => {
    expect(describeCategory(comida)).toEqual({ title: 'Comida', canDelete: true });
  });

  it.each(['other', 'loan'] as const)('la categoría de sistema %s no se puede eliminar', (systemKey) => {
    expect(describeCategory({ ...comida, systemKey }).canDelete).toBe(false);
  });
});

describe('deleteMessage', () => {
  it('singular', () => {
    expect(deleteMessage('Comida', 1)).toBe('1 movimiento pasará a «Otros».');
  });
  it('plural', () => {
    expect(deleteMessage('Comida', 3)).toBe('3 movimientos pasarán a «Otros».');
  });
  it('sin movimientos', () => {
    expect(deleteMessage('Comida', 0)).toBe('«Comida» no tiene movimientos. Solo se elimina la categoría.');
  });
});
