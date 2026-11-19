import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RepositoriesContext } from '@/data/RepositoriesContext';
import { createFakeRepositories, movementOf } from '@/test-utils/fakeRepositories';
import { CategoriasScreen } from './CategoriasScreen';

async function open(movements = [] as ReturnType<typeof movementOf>[]) {
  const fake = createFakeRepositories({ movements });
  await render(
    <RepositoriesContext.Provider value={fake.repos}>
      <CategoriasScreen />
    </RepositoriesContext.Provider>,
  );
  await screen.findByText('Devolución / Reembolso');
  return fake;
}

async function createCategory(name: string) {
  await fireEvent.press(screen.getByRole('button', { name: 'Agregar categoría' }));
  await fireEvent.changeText(screen.getByLabelText('Nombre'), name);
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
}

describe('CategoriasScreen', () => {
  it('lista una sola categoría de cada una (Otros, Préstamo, Devolución / Reembolso) y ningún tipo', async () => {
    await open();
    expect(screen.getByRole('header', { name: 'Categorías' })).toBeOnTheScreen();
    expect(screen.getAllByText('Otros')).toHaveLength(1);
    expect(screen.getAllByText('Préstamo')).toHaveLength(1);
    expect(screen.getAllByText('Devolución / Reembolso')).toHaveLength(1);
    expect(screen.queryByText('Gasto')).toBeNull();
    expect(screen.queryByText('Ingreso')).toBeNull();
  });

  it('"Otros" y "Préstamo" no ofrecen eliminar; "Devolución / Reembolso" sí', async () => {
    await open();
    expect(screen.queryByRole('button', { name: 'Eliminar Otros' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Eliminar Préstamo' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Eliminar Devolución / Reembolso' })).toBeOnTheScreen();
  });

  it('el formulario no pide tipo de categoría', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar categoría' }));
    expect(screen.getByText('Nueva categoría')).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Gasto' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Ingreso' })).toBeNull();
  });

  it('crear "Comida" la agrega a la lista sin recargar y cierra el formulario', async () => {
    const { calls } = await open();
    await createCategory('Comida');
    expect(await screen.findByText('Comida')).toBeOnTheScreen();
    expect(calls.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Comida' }));
    expect(calls.create.mock.calls[0]![0]).not.toHaveProperty('kind');
    await waitFor(() => expect(screen.queryByText('Nueva categoría')).toBeNull());
  });

  it('un nombre repetido muestra el error y no cierra el formulario', async () => {
    await open();
    await createCategory('Comida');
    await screen.findByText('Comida');
    await createCategory('Comida');
    expect(await screen.findByText('Ya existe una categoría llamada "Comida".')).toBeOnTheScreen();
    expect(screen.getByText('Nueva categoría')).toBeOnTheScreen();
  });

  it('doble toque en Guardar crea una sola categoría', async () => {
    const { calls } = await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar categoría' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Comida');
    const save = screen.getByRole('button', { name: 'Guardar' });
    await fireEvent.press(save);
    await fireEvent.press(save);
    await screen.findByText('Comida');
    expect(calls.create).toHaveBeenCalledTimes(1);
  });

  it('eliminar con 2 movimientos pide confirmación indicando cuántos pasan a "Otros"', async () => {
    const { calls } = await open([
      movementOf({ id: 'm1', categoryId: 'refund' }),
      movementOf({ id: 'm2', type: 'income', categoryId: 'refund', sourceAccountId: null, destAccountId: 'acc' }),
    ]);
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar Devolución / Reembolso' }));
    expect(await screen.findByText('2 movimientos pasarán a «Otros».')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(calls.remove).not.toHaveBeenCalled();
    expect(screen.getAllByText('Devolución / Reembolso')).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar Devolución / Reembolso' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(screen.queryByText('Devolución / Reembolso')).toBeNull());
    expect(calls.remove).toHaveBeenCalledWith('refund');
  });

  it('editar cambia nombre y color y se refleja en la lista', async () => {
    const { calls } = await open();
    await createCategory('Comida');
    await screen.findByText('Comida');
    await fireEvent.press(screen.getByRole('button', { name: 'Editar Comida' }));
    expect(screen.getByText('Editar categoría')).toBeOnTheScreen();
    expect(screen.getByLabelText('Nombre').props.value).toBe('Comida');
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Alimentos');
    await fireEvent.press(screen.getByRole('radio', { name: 'Color #3B82F6' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Alimentos')).toBeOnTheScreen();
    expect(screen.queryByText('Comida')).toBeNull();
    expect(calls.update).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ name: 'Alimentos', color: '#3B82F6' }));
  });

  it('un nombre vacío muestra el error del repositorio', async () => {
    await open();
    await createCategory('   ');
    expect(await screen.findByText('El nombre es obligatorio.')).toBeOnTheScreen();
  });
});
