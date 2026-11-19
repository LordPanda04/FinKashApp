import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { ConfirmDialog } from './ConfirmDialog';
import { GroupedList } from './GroupedList';
import { HeaderIconButton } from './HeaderIconButton';
import { IconPicker } from './IconPicker';
import { ListRow } from './ListRow';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './palette';
import { PrimaryButton } from './PrimaryButton';
import { SwatchPicker } from './SwatchPicker';
import { TextField } from './TextField';

describe('palette', () => {
  it('10 colores hex válidos y únicos', () => {
    expect(CATEGORY_COLORS).toHaveLength(10);
    for (const c of CATEGORY_COLORS) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(CATEGORY_COLORS).size).toBe(10);
    expect(CATEGORY_COLORS[0]).toBe('#1C9C4D');
  });

  it('24 íconos únicos', () => {
    expect(CATEGORY_ICONS).toHaveLength(24);
    expect(new Set(CATEGORY_ICONS).size).toBe(24);
  });
});

describe('ListRow', () => {
  it('con onPress es un botón con la etiqueta del título y dispara el handler', async () => {
    const onPress = jest.fn();
    await render(<ListRow title="Comida" subtitle="Gasto" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Comida' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Gasto')).toBeOnTheScreen();
  });

  it('sin onPress no es un botón', async () => {
    await render(<ListRow title="Solo texto" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Solo texto')).toBeOnTheScreen();
  });

  it('muestra el contenido de la derecha', async () => {
    await render(<ListRow title="A" right={<Text>derecha</Text>} />);
    expect(screen.getByText('derecha')).toBeOnTheScreen();
  });
});

describe('GroupedList', () => {
  it('con 3 filas dibuja 2 separadores', async () => {
    await render(
      <GroupedList>
        <ListRow title="1" />
        <ListRow title="2" />
        <ListRow title="3" />
      </GroupedList>,
    );
    expect(screen.getAllByTestId('row-separator')).toHaveLength(2);
  });

  it('con una fila no dibuja separadores y con ninguna no falla', async () => {
    await render(
      <GroupedList>
        <ListRow title="1" />
      </GroupedList>,
    );
    expect(screen.queryAllByTestId('row-separator')).toHaveLength(0);
  });
});

describe('HeaderIconButton', () => {
  it('es un botón con la etiqueta y dispara onPress', async () => {
    const onPress = jest.fn();
    await render(<HeaderIconButton icon="add" label="Agregar categoría" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar categoría' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('PrimaryButton', () => {
  it('dispara onPress', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Guardar" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([{ disabled: true }, { loading: true }])('con %o no dispara onPress', async (props) => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Guardar" onPress={onPress} {...props} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });
});

describe('TextField', () => {
  it('muestra etiqueta, prefijo y reenvía los cambios', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Saldo inicial" value="" onChangeText={onChangeText} prefix="S/" />);
    expect(screen.getByText('Saldo inicial')).toBeOnTheScreen();
    expect(screen.getByText('S/')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Saldo inicial'), '24.5');
    expect(onChangeText).toHaveBeenCalledWith('24.5');
  });

  it('muestra el error en rojo', async () => {
    await render(<TextField label="Nombre" value="" onChangeText={() => undefined} error="El nombre es obligatorio." />);
    expect(screen.getByText('El nombre es obligatorio.')).toHaveStyle({ color: '#E5484D' });
  });

  it('sin error no dibuja mensaje', async () => {
    await render(<TextField label="Nombre" value="x" onChangeText={() => undefined} error={null} />);
    expect(screen.queryByText('El nombre es obligatorio.')).toBeNull();
  });
});

describe('SwatchPicker', () => {
  it('marca solo el color elegido y llama a onChange con el tocado', async () => {
    const onChange = jest.fn();
    await render(<SwatchPicker colors={CATEGORY_COLORS} value="#F59E0B" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Color #F59E0B' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Color #1C9C4D' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'Color #3B82F6' }));
    expect(onChange).toHaveBeenCalledWith('#3B82F6');
  });
});

describe('IconPicker', () => {
  it('marca solo el ícono elegido y llama a onChange', async () => {
    const onChange = jest.fn();
    await render(<IconPicker icons={CATEGORY_ICONS} value="restaurant" color="#1C9C4D" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Ícono restaurant' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Ícono movie' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'Ícono movie' }));
    expect(onChange).toHaveBeenCalledWith('movie');
  });
});

describe('BottomSheet', () => {
  it('con visible=false no dibuja nada', async () => {
    await render(
      <BottomSheet visible={false} title="Nueva categoría" onClose={() => undefined}>
        <Text>contenido</Text>
      </BottomSheet>,
    );
    expect(screen.queryByText('Nueva categoría')).toBeNull();
    expect(screen.queryByText('contenido')).toBeNull();
  });

  it('con visible=true muestra título y contenido y cierra al tocar el fondo', async () => {
    const onClose = jest.fn();
    await render(
      <BottomSheet visible title="Nueva categoría" onClose={onClose}>
        <Text>contenido</Text>
      </BottomSheet>,
    );
    expect(screen.getByText('Nueva categoría')).toBeOnTheScreen();
    expect(screen.getByText('contenido')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ConfirmDialog', () => {
  it('muestra mensaje y botones; cada uno llama a su handler', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(
      <ConfirmDialog visible title="Eliminar categoría" message="2 movimientos pasarán a «Otros»." confirmLabel="Eliminar" onConfirm={onConfirm} onCancel={onCancel} />,
    );
    expect(screen.getByText('2 movimientos pasarán a «Otros».')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('destructive pinta el texto de confirmar en rojo', async () => {
    await render(
      <ConfirmDialog visible destructive title="t" message="m" confirmLabel="Eliminar" onConfirm={() => undefined} onCancel={() => undefined} />,
    );
    expect(screen.getByText('Eliminar')).toHaveStyle({ color: '#E5484D' });
  });

  it('invisible no dibuja nada', async () => {
    await render(
      <ConfirmDialog visible={false} title="t" message="m" confirmLabel="Eliminar" onConfirm={() => undefined} onCancel={() => undefined} />,
    );
    expect(screen.queryByText('m')).toBeNull();
  });
});
