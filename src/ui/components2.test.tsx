import { fireEvent, render, screen } from '@testing-library/react-native';
import { AmountInput } from './AmountInput';
import { Calendar } from './Calendar';
import { FilterChip } from './FilterChip';
import { FormRow } from './FormRow';
import { NoticeCard } from './NoticeCard';
import { SegmentedControl } from './SegmentedControl';
import { SelectorSheet } from './SelectorSheet';
import { Switch } from './Switch';
import { WalletBadge } from './WalletBadge';

describe('SegmentedControl', () => {
  const options = [
    { value: 'expense', label: 'Gasto' },
    { value: 'income', label: 'Ingreso' },
    { value: 'transfer', label: 'Transferencia' },
  ] as const;

  it('marca solo la opción activa y llama a onChange con la tocada', async () => {
    const onChange = jest.fn();
    await render(<SegmentedControl options={[...options]} value="income" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Ingreso' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Gasto' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'Transferencia' }));
    expect(onChange).toHaveBeenCalledWith('transfer');
  });
});

describe('FormRow', () => {
  it('con onPress es un botón con la etiqueta y muestra el valor', async () => {
    const onPress = jest.fn();
    await render(<FormRow icon="category" label="Categoría" value="Comida" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Categoría' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Comida')).toBeOnTheScreen();
  });

  it('sin onPress no es un botón', async () => {
    await render(<FormRow icon="notes" label="Descripción" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Descripción')).toBeOnTheScreen();
  });
});

describe('Switch', () => {
  it('alterna el valor y expone checked', async () => {
    const onValueChange = jest.fn();
    await render(<Switch value label="¿Es de hoy?" onValueChange={onValueChange} />);
    const sw = screen.getByRole('switch', { name: '¿Es de hoy?' });
    expect(sw).toBeChecked();
    await fireEvent.press(sw);
    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('apagado se marca como no checked y al tocar pide true', async () => {
    const onValueChange = jest.fn();
    await render(<Switch value={false} label="Proyección" onValueChange={onValueChange} />);
    expect(screen.getByRole('switch', { name: 'Proyección' })).not.toBeChecked();
    await fireEvent.press(screen.getByRole('switch', { name: 'Proyección' }));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

describe('AmountInput', () => {
  it('muestra el prefijo y reenvía el texto', async () => {
    const onChangeText = jest.fn();
    await render(<AmountInput prefix="S/" value="" onChangeText={onChangeText} />);
    expect(screen.getByText('S/')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Monto'), '24.5');
    expect(onChangeText).toHaveBeenCalledWith('24.5');
  });

  it('muestra el error en rojo y cambia el prefijo a "$"', async () => {
    await render(<AmountInput prefix="$" value="x" onChangeText={() => undefined} error="Monto inválido." />);
    expect(screen.getByText('$')).toBeOnTheScreen();
    expect(screen.getByText('Monto inválido.')).toHaveStyle({ color: '#E5484D' });
  });
});

describe('FilterChip', () => {
  it('activo tiene fondo primaryContainer y dispara onPress', async () => {
    const onPress = jest.fn();
    await render(<FilterChip label="Categoría" active onPress={onPress} />);
    const chip = screen.getByRole('button', { name: 'Categoría' });
    expect(chip).toHaveStyle({ backgroundColor: '#E6F5EC' });
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('inactivo usa el fondo de vidrio', async () => {
    await render(<FilterChip label="Fecha" onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Fecha' })).toHaveStyle({ backgroundColor: 'rgba(255,255,255,0.72)' });
  });
});

describe('WalletBadge', () => {
  it('usa el color de la billetera', async () => {
    await render(<WalletBadge label="Yape" color="#742384" />);
    expect(screen.getByText('Yape')).toHaveStyle({ color: '#742384' });
  });

  it('sin color usa el neutro', async () => {
    await render(<WalletBadge label="Efectivo" />);
    expect(screen.getByText('Efectivo')).toHaveStyle({ color: '#86868B' });
  });
});

describe('Calendar', () => {
  it('noviembre de 2026: título, 30 días y 6 huecos antes del domingo 1', async () => {
    await render(<Calendar value="2026-11-14" onChange={() => undefined} />);
    expect(screen.getByText('Noviembre 2026')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /de noviembre de 2026$/ })).toHaveLength(30);
    expect(screen.getAllByTestId('calendar-blank')).toHaveLength(6);
  });

  it('tocar un día llama a onChange con la fecha ISO y el elegido está seleccionado', async () => {
    const onChange = jest.fn();
    await render(<Calendar value="2026-11-14" onChange={onChange} />);
    expect(screen.getByRole('button', { name: '14 de noviembre de 2026' })).toBeSelected();
    expect(screen.getByRole('button', { name: '15 de noviembre de 2026' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: '3 de noviembre de 2026' }));
    expect(onChange).toHaveBeenCalledWith('2026-11-03');
  });

  it('las flechas cambian de mes y cruzan el año', async () => {
    await render(<Calendar value="2026-12-10" onChange={() => undefined} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(screen.getByText('Enero 2027')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Mes anterior' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(screen.getByText('Noviembre 2026')).toBeOnTheScreen();
  });

  it('febrero de un año bisiesto tiene 29 días', async () => {
    await render(<Calendar value="2028-02-10" onChange={() => undefined} />);
    expect(screen.getAllByRole('button', { name: /de febrero de 2028$/ })).toHaveLength(29);
  });
});

describe('SelectorSheet', () => {
  const options = [
    { value: 'a', label: 'Yape · S/' },
    { value: 'b', label: 'Plin · S/', subtitle: 'Digital' },
    { value: 'c', label: 'Tarjeta', disabled: true },
  ];

  it('modo simple: al elegir llama a onSelect y cierra', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await render(<SelectorSheet visible title="Billetera" options={options} value="a" onSelect={onSelect} onClose={onClose} />);
    expect(screen.getByRole('radio', { name: 'Yape · S/' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'Plin · S/' }));
    expect(onSelect).toHaveBeenCalledWith('b');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('una opción deshabilitada no se puede elegir', async () => {
    const onSelect = jest.fn();
    await render(<SelectorSheet visible title="Billetera" options={options} value={null} onSelect={onSelect} onClose={() => undefined} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Tarjeta' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('modo múltiple: alterna casillas sin cerrar y "Listo" cierra', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await render(<SelectorSheet visible multi title="Billetera" options={options} value={['a']} onSelect={onSelect} onClose={onClose} />);
    expect(screen.getByRole('checkbox', { name: 'Yape · S/' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Plin · S/' })).not.toBeChecked();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Plin · S/' }));
    expect(onSelect).toHaveBeenCalledWith('b');
    expect(onClose).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Listo' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sin opciones muestra el mensaje vacío', async () => {
    await render(<SelectorSheet visible title="Deuda" options={[]} value={null} onSelect={() => undefined} onClose={() => undefined} emptyMessage="No hay deudas pendientes." />);
    expect(screen.getByText('No hay deudas pendientes.')).toBeOnTheScreen();
  });

  it('invisible no dibuja nada', async () => {
    await render(<SelectorSheet visible={false} title="Billetera" options={options} value={null} onSelect={() => undefined} onClose={() => undefined} />);
    expect(screen.queryByText('Billetera')).toBeNull();
  });
});

describe('NoticeCard', () => {
  it('es una alerta con título y mensaje', async () => {
    await render(<NoticeCard title="Saldo insuficiente" message="Faltan S/ 80.00." />);
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByText('Saldo insuficiente')).toBeOnTheScreen();
    expect(screen.getByText('Faltan S/ 80.00.')).toBeOnTheScreen();
  });
});
