import type { CategoryRecord } from '@/data/types';
import { deleteMessage, describeCategory } from './presenter';

const comida: CategoryRecord = { id: 'c1', kind: 'expense', name: 'Comida', color: '#1C9C4D', icon: 'restaurant', systemKey: null, sortOrder: 1 };

describe('describeCategory', () => {
  it('gasto de usuario: etiqueta roja y se puede eliminar', () => {
    expect(describeCategory(comida)).toEqual({ title: 'Comida', kindLabel: 'Gasto', kindColor: '#E5484D', canDelete: true });
  });

  it('ingreso: etiqueta verde', () => {
    expect(describeCategory({ ...comida, kind: 'income', name: 'Sueldo' })).toMatchObject({ kindLabel: 'Ingreso', kindColor: '#1C9C4D' });
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
