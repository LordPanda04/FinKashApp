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
  await screen.findByText('Devolución / Reembolso', {}, { timeout: 2000 }).catch(() => undefined);
  return fake;
}

async function createCategory(name: string) {
  await fireEvent.press(screen.getByRole('button', { name: 'Agregar categoría' }));
  await fireEvent.changeText(screen.getByLabelText('Nombre'), name);
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
}

describe('CategoriasScreen', () => {
  it('lista las 6 categorías sembradas bajo el título', async () => {
    await open();
    expect(screen.getByRole('header', { name: 'Categorías' })).toBeOnTheScreen();
    expect(await screen.findAllByText('Otros')).toHaveLength(2);
    expect(screen.getAllByText('Préstamo')).toHaveLength(2);
    expect(screen.getAllByText('Devolución / Reembolso')).toHaveLength(2);
    expect(screen.getAllByText('Gasto')).toHaveLength(3);
    expect(screen.getAllByText('Ingreso')).toHaveLength(3);
  });

  it('"Otros" y "Préstamo" no ofrecen eliminar; las demás sí', async () => {
    await open();
    await screen.findAllByText('Otros');
    expect(screen.queryAllByRole('button', { name: /^Eliminar Otros/ })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: /^Eliminar Préstamo/ })).toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /^Eliminar Devolución/ })).toHaveLength(2);
  });

  it('crear "Comida" la agrega a la lista sin recargar y cierra el formulario', async () => {
    const { calls } = await open();
    await screen.findAllByText('Otros');
    await createCategory('Comida');
    expect(await screen.findByText('Comida')).toBeOnTheScreen();
    expect(calls.create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'expense', name: 'Comida' }));
    await waitFor(() => expect(screen.queryByText('Nueva categoría')).toBeNull());
  });

  it('un nombre repetido muestra el error y no cierra el formulario', async () => {
    await open();
    await screen.findAllByText('Otros');
    await createCategory('Comida');
    await screen.findByText('Comida');
    await createCategory('Comida');
    expect(await screen.findByText('Ya existe una categoría llamada "Comida".')).toBeOnTheScreen();
    expect(screen.getByText('Nueva categoría')).toBeOnTheScreen();
  });

  it('doble toque en Guardar crea una sola categoría', async () => {
    const { calls } = await open();
    await screen.findAllByText('Otros');
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar categoría' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Comida');
    const save = screen.getByRole('button', { name: 'Guardar' });
    await fireEvent.press(save);
    await fireEvent.press(save);
    await screen.findByText('Comida');
    expect(calls.create).toHaveBeenCalledTimes(1);
  });

  it('crear con el tipo Ingreso respeta el tipo elegido', async () => {
    const { calls } = await open();
    await screen.findAllByText('Otros');
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar categoría' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Ingreso' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Sueldo');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await screen.findByText('Sueldo');
    expect(calls.create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'income', name: 'Sueldo' }));
  });

  it('eliminar con 2 movimientos pide confirmación indicando cuántos pasan a "Otros"', async () => {
    const { calls } = await open([
      movementOf({ id: 'm1', categoryId: 'expense-2' }),
      movementOf({ id: 'm2', categoryId: 'expense-2' }),
    ]);
    await screen.findAllByText('Otros');
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar Devolución / Reembolso (Gasto)' }));
    expect(await screen.findByText('2 movimientos pasarán a «Otros».')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(calls.remove).not.toHaveBeenCalled();
    expect(screen.getAllByText('Devolución / Reembolso')).toHaveLength(2);

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar Devolución / Reembolso (Gasto)' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(screen.getAllByText('Devolución / Reembolso')).toHaveLength(1));
    expect(calls.remove).toHaveBeenCalledWith('expense-2');
  });

  it('editar cambia nombre y color y se refleja en la lista', async () => {
    const { calls } = await open();
    await screen.findAllByText('Otros');
    await createCategory('Comida');
    await screen.findByText('Comida');
    await fireEvent.press(screen.getByRole('button', { name: 'Editar Comida (Gasto)' }));
    expect(screen.getByText('Editar categoría')).toBeOnTheScreen();
    expect(screen.getByLabelText('Nombre').props.value).toBe('Comida');
    expect(screen.queryByRole('radio', { name: 'Ingreso' })).toBeNull(); // el tipo no se cambia al editar
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Alimentos');
    await fireEvent.press(screen.getByRole('radio', { name: 'Color #3B82F6' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Alimentos')).toBeOnTheScreen();
    expect(screen.queryByText('Comida')).toBeNull();
    expect(calls.update).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ name: 'Alimentos', color: '#3B82F6' }));
  });

  it('un nombre vacío muestra el error del repositorio', async () => {
    await open();
    await screen.findAllByText('Otros');
    await createCategory('   ');
    expect(await screen.findByText('El nombre es obligatorio.')).toBeOnTheScreen();
  });
});
