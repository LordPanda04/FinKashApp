import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { WalletRecord } from '@/data/types';
import { DonutChart } from '@/ui/charts/DonutChart';
import { FlowLineChart } from '@/ui/charts/FlowLineChart';
import { ExpensesCard } from './ExpensesCard';
import { FlowCard } from './FlowCard';
import { NameSheet } from './NameSheet';
import type { CurrencyBlock, HomeView } from './presenter';
import { ScopeSheet } from './ScopeSheet';
import { SummaryCard } from './SummaryCard';
import { ThresholdSheet } from './ThresholdSheet';

/** react-native-svg convierte el color a un entero ARGB. */
const argb = (hex: string): number => 0xff000000 + parseInt(hex.slice(1), 16);

const slices = [
  { key: 'services', name: 'Servicios', color: '#F59E0B', totalMinor: 11280 },
  { key: 'food', name: 'Comida', color: '#1C9C4D', totalMinor: 4250 },
  { key: 'bus', name: 'Transporte', color: '#3B82F6', totalMinor: 1000 },
];

function textsAndLabels(): string[] {
  // Todo texto visible y toda etiqueta de accesibilidad de la pantalla actual.
  const out: string[] = [];
  const walk = (node: { props?: Record<string, unknown>; children?: unknown[] } | string | null) => {
    if (node === null) return;
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    const label = node.props?.accessibilityLabel;
    if (typeof label === 'string') out.push(label);
    for (const child of node.children ?? []) walk(child as never);
  };
  walk(screen.toJSON() as never);
  return out;
}
const hasMoneyDigits = (texts: string[]) => texts.some((t) => /\d[\d,]*\.\d{2}/.test(t));

describe('DonutChart', () => {
  it('dibuja un arco por porción con su color y el seleccionado es más grueso', async () => {
    await render(<DonutChart slices={slices} selectedKey="food" centerLabel="Total gastado" centerValue="S/ 165.30" />);
    expect(screen.getByTestId('donut-arc-services').props.stroke.payload).toBe(argb('#F59E0B'));
    expect(screen.getByTestId('donut-arc-food').props.stroke.payload).toBe(argb('#1C9C4D'));
    expect(screen.getByTestId('donut-arc-bus').props.stroke.payload).toBe(argb('#3B82F6'));
    expect(Number(screen.getByTestId('donut-arc-food').props.strokeWidth)).toBeGreaterThan(Number(screen.getByTestId('donut-arc-services').props.strokeWidth));
  });

  it('el centro muestra la etiqueta y el valor', async () => {
    await render(<DonutChart slices={slices} selectedKey={null} centerLabel="Total gastado" centerValue="S/ 165.30" />);
    expect(screen.getByText('Total gastado')).toBeOnTheScreen();
    expect(screen.getByText('S/ 165.30')).toBeOnTheScreen();
  });

  it('sin porciones muestra "Sin gastos" y ningún arco', async () => {
    await render(<DonutChart slices={[]} selectedKey={null} centerLabel="Total gastado" centerValue="S/ 0.00" />);
    expect(screen.getByText('Sin gastos')).toBeOnTheScreen();
    expect(screen.queryByTestId(/donut-arc-/)).toBeNull();
  });

  it('un solo gasto dibuja un círculo completo sin NaN', async () => {
    await render(<DonutChart slices={[slices[0]!]} selectedKey={null} centerLabel="Total" centerValue="x" />);
    expect(screen.getByTestId('donut-arc-services').props.d).not.toContain('NaN');
  });
});

describe('FlowLineChart', () => {
  const series = Array.from({ length: 20 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, balanceMinor: 1000 + i * 100 }));

  it('dibuja la curva, el área, el punto de hoy y 2 líneas de grilla', async () => {
    await render(<FlowLineChart series={series} thresholdMinor={null} thresholdLabel={null} />);
    expect(screen.getByTestId('flow-line')).toBeOnTheScreen();
    expect(screen.getByTestId('flow-area')).toBeOnTheScreen();
    expect(screen.getByTestId('flow-today')).toBeOnTheScreen();
    expect(screen.getAllByTestId('flow-grid')).toHaveLength(2);
    expect(screen.queryByTestId('flow-threshold')).toBeNull();
  });

  it('la línea de umbral y su etiqueta solo aparecen si hay umbral', async () => {
    await render(<FlowLineChart series={series} thresholdMinor={30000} thresholdLabel="Límite: S/ 300.00" />);
    expect(screen.getByTestId('flow-threshold')).toBeOnTheScreen();
    expect(screen.getByText('Límite: S/ 300.00')).toBeOnTheScreen();
  });

  it('muestra las fechas del eje (día del mes)', async () => {
    await render(<FlowLineChart series={series} thresholdMinor={null} thresholdLabel={null} />);
    expect(screen.getByText('1')).toBeOnTheScreen();
    expect(screen.getByText('20')).toBeOnTheScreen();
  });

  it('serie vacía: "Sin movimientos" y sin curva', async () => {
    await render(<FlowLineChart series={[]} thresholdMinor={null} thresholdLabel={null} />);
    expect(screen.getByText('Sin movimientos')).toBeOnTheScreen();
    expect(screen.queryByTestId('flow-line')).toBeNull();
  });

  it('una serie plana no genera NaN', async () => {
    const flat = series.map((s) => ({ ...s, balanceMinor: 500 }));
    await render(<FlowLineChart series={flat} thresholdMinor={null} thresholdLabel={null} />);
    expect(screen.getByTestId('flow-line').props.d).not.toContain('NaN');
  });
});

function view(over: Partial<HomeView> = {}, blockOver: Partial<CurrencyBlock> = {}): HomeView {
  const pen: CurrencyBlock = { currency: 'PEN', availableMinor: 121000, spentMinor: 15530, remainingMinor: 105470, projectedMinor: 50000, belowThreshold: false, thresholdMinor: null, ...blockOver };
  return { empty: false, scopeLabel: 'Saldo general', monthLabel: 'Noviembre', currencies: ['PEN'], blocks: { PEN: pen }, donut: {}, flow: {}, ...over };
}
const summaryProps = { hidden: false, onToggleHidden: jest.fn(), projectionOn: false, onToggleProjection: jest.fn(), onOpenScope: jest.fn() };

describe('SummaryCard', () => {
  it('muestra Disponible, Gastado y Restante', async () => {
    await render(<SummaryCard view={view()} {...summaryProps} />);
    expect(screen.getByText('Disponible')).toBeOnTheScreen();
    expect(screen.getByText('S/ 1,210.00')).toBeOnTheScreen();
    expect(screen.getByText('Gastado')).toBeOnTheScreen();
    expect(screen.getByText('S/ 155.30')).toBeOnTheScreen();
    expect(screen.getByText('Restante')).toBeOnTheScreen();
    expect(screen.getByText('S/ 1,054.70')).toBeOnTheScreen();
  });

  it('con el ojo cerrado todas las cifras son **** y ningún texto ni etiqueta tiene dinero', async () => {
    await render(<SummaryCard view={view()} {...summaryProps} hidden projectionOn />);
    expect(screen.getAllByText('****').length).toBeGreaterThanOrEqual(4);
    expect(hasMoneyDigits(textsAndLabels())).toBe(false);
  });

  it('el ojo cambia su etiqueta y llama a onToggleHidden', async () => {
    const onToggleHidden = jest.fn();
    await render(<SummaryCard view={view()} {...summaryProps} onToggleHidden={onToggleHidden} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar montos' }));
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
    await render(<SummaryCard view={view()} {...summaryProps} hidden />);
    expect(screen.getByRole('button', { name: 'Mostrar montos' })).toBeOnTheScreen();
  });

  it('segunda línea en dólares solo con USD', async () => {
    const usd: CurrencyBlock = { currency: 'USD', availableMinor: 10000, spentMinor: 2500, remainingMinor: 7500, projectedMinor: null, belowThreshold: false, thresholdMinor: null };
    await render(<SummaryCard view={view({ currencies: ['PEN', 'USD'], blocks: { PEN: view().blocks.PEN!, USD: usd } })} {...summaryProps} />);
    expect(screen.getByText('$ 100.00')).toBeOnTheScreen();
    expect(screen.getByText('$ 25.00')).toBeOnTheScreen();
    expect(screen.getByText('$ 75.00')).toBeOnTheScreen();
  });

  it('el switch de proyección solo existe en Saldo general (projectedMinor no nulo)', async () => {
    const onToggleProjection = jest.fn();
    await render(<SummaryCard view={view()} {...summaryProps} onToggleProjection={onToggleProjection} />);
    await fireEvent.press(screen.getByRole('switch', { name: 'Ver proyectado' }));
    expect(onToggleProjection).toHaveBeenCalledWith(true);
  });

  it('sin proyección (billetera sola) no hay switch', async () => {
    await render(<SummaryCard view={view({ scopeLabel: 'Yape' }, { projectedMinor: null })} {...summaryProps} />);
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('con la proyección activa muestra el proyectado a fin de mes', async () => {
    await render(<SummaryCard view={view()} {...summaryProps} projectionOn />);
    expect(screen.getByText('Proyectado a fin de mes')).toBeOnTheScreen();
    expect(screen.getByText('S/ 500.00')).toBeOnTheScreen();
  });

  it('el restante bajo el umbral va en rojo', async () => {
    await render(<SummaryCard view={view({}, { belowThreshold: true, thresholdMinor: 200000 })} {...summaryProps} />);
    expect(screen.getByText('S/ 1,054.70')).toHaveStyle({ color: '#E5484D' });
  });

  it('el chip de alcance muestra el nombre y abre el selector', async () => {
    const onOpenScope = jest.fn();
    await render(<SummaryCard view={view()} {...summaryProps} onOpenScope={onOpenScope} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Saldo general' }));
    expect(onOpenScope).toHaveBeenCalledTimes(1);
  });
});

const wallets: WalletRecord[] = [
  { id: 'w1', name: 'Yape', walletType: 'digital', icon: 'smartphone', color: '#742384', isHidden: false, includeInGeneral: true, sortOrder: 0 },
  { id: 'w2', name: 'Plin', walletType: 'digital', icon: 'smartphone', color: '#00D1A0', isHidden: false, includeInGeneral: false, sortOrder: 1 },
];

describe('ScopeSheet', () => {
  it('marca Saldo general y las casillas según includeInGeneral', async () => {
    await render(<ScopeSheet visible wallets={wallets} scope="general" onSelect={() => undefined} onToggleInclude={() => undefined} onClose={() => undefined} />);
    expect(screen.getByRole('radio', { name: 'Saldo general' })).toBeSelected();
    expect(screen.getByRole('checkbox', { name: 'Yape' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Plin' })).not.toBeChecked();
  });

  it('alternar una casilla llama a onToggleInclude(id, nuevoValor)', async () => {
    const onToggleInclude = jest.fn();
    await render(<ScopeSheet visible wallets={wallets} scope="general" onSelect={() => undefined} onToggleInclude={onToggleInclude} onClose={() => undefined} />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Plin' }));
    expect(onToggleInclude).toHaveBeenCalledWith('w2', true);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Yape' }));
    expect(onToggleInclude).toHaveBeenCalledWith('w1', false);
  });

  it('elegir una billetera llama a onSelect(id) y cierra', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await render(<ScopeSheet visible wallets={wallets} scope="general" onSelect={onSelect} onToggleInclude={() => undefined} onClose={onClose} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Solo Plin' }));
    expect(onSelect).toHaveBeenCalledWith('w2');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('elegir Saldo general llama a onSelect("general") y cierra', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await render(<ScopeSheet visible wallets={wallets} scope="w1" onSelect={onSelect} onToggleInclude={() => undefined} onClose={onClose} />);
    expect(screen.getByRole('radio', { name: 'Solo Yape' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'Saldo general' }));
    expect(onSelect).toHaveBeenCalledWith('general');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('invisible no dibuja nada', async () => {
    await render(<ScopeSheet visible={false} wallets={wallets} scope="general" onSelect={() => undefined} onToggleInclude={() => undefined} onClose={() => undefined} />);
    expect(screen.queryByText('Saldo general')).toBeNull();
  });
});

describe('ThresholdSheet', () => {
  it('un monto inválido muestra el error devuelto y no cierra', async () => {
    const onSave = jest.fn().mockResolvedValue('Ingresa un monto válido mayor a 0, con hasta 2 decimales.');
    const onClose = jest.fn();
    await render(<ThresholdSheet visible currency="PEN" currentMinor={null} scopeLabel="Saldo general" onSave={onSave} onClear={jest.fn()} onClose={onClose} />);
    await fireEvent.changeText(screen.getByLabelText('Monto mínimo'), '24,50');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ingresa un monto válido mayor a 0, con hasta 2 decimales.')).toBeOnTheScreen();
    expect(onSave).toHaveBeenCalledWith('24,50');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('un monto válido cierra la hoja', async () => {
    const onSave = jest.fn().mockResolvedValue(null);
    const onClose = jest.fn();
    await render(<ThresholdSheet visible currency="PEN" currentMinor={null} scopeLabel="Saldo general" onSave={onSave} onClear={jest.fn()} onClose={onClose} />);
    await fireEvent.changeText(screen.getByLabelText('Monto mínimo'), '300');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('"Quitar umbral" solo aparece si hay uno y llama a onClear', async () => {
    const onClear = jest.fn().mockResolvedValue(undefined);
    await render(<ThresholdSheet visible currency="PEN" currentMinor={30000} scopeLabel="Saldo general" onSave={jest.fn()} onClear={onClear} onClose={jest.fn()} />);
    expect(screen.getByLabelText('Monto mínimo').props.value).toBe('300.00');
    await fireEvent.press(screen.getByRole('button', { name: 'Quitar umbral' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('sin umbral no ofrece quitarlo', async () => {
    await render(<ThresholdSheet visible currency="USD" currentMinor={null} scopeLabel="Yape" onSave={jest.fn()} onClear={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Quitar umbral' })).toBeNull();
    expect(screen.getByText('$')).toBeOnTheScreen();
  });

  it('doble toque en Guardar llama una sola vez', async () => {
    const onSave = jest.fn().mockImplementation(() => new Promise<null>((resolve) => setTimeout(() => resolve(null), 30)));
    await render(<ThresholdSheet visible currency="PEN" currentMinor={null} scopeLabel="Saldo general" onSave={onSave} onClear={jest.fn()} onClose={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText('Monto mínimo'), '300');
    const save = screen.getByRole('button', { name: 'Guardar' });
    await fireEvent.press(save);
    await fireEvent.press(save);
    await new Promise((r) => setTimeout(r, 80));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe('NameSheet', () => {
  const sheet = (over: Partial<React.ComponentProps<typeof NameSheet>> = {}) => (
    <NameSheet visible mode="welcome" initialName="" onSave={jest.fn().mockResolvedValue(null)} onSkip={jest.fn()} onClose={jest.fn()} {...over} />
  );

  it('bienvenida: pregunta "¿Cómo te llamas?" y ofrece Continuar y Omitir', async () => {
    await render(sheet());
    expect(screen.getByText('¿Cómo te llamas?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Omitir' })).toBeOnTheScreen();
  });

  it('bienvenida: con el campo vacío o solo espacios muestra el aviso y no guarda', async () => {
    const onSave = jest.fn();
    await render(sheet({ onSave }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Escribe tu nombre u omite este paso.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Nombre'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('bienvenida: Continuar guarda el nombre recortado y cierra', async () => {
    const onSave = jest.fn().mockResolvedValue(null);
    const onClose = jest.fn();
    await render(sheet({ onSave, onClose }));
    await fireEvent.changeText(screen.getByLabelText('Nombre'), '  Ana ');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith('Ana');
  });

  it('un error devuelto por onSave se muestra y la hoja no se cierra', async () => {
    const onSave = jest.fn().mockResolvedValue('El nombre puede tener hasta 40 caracteres.');
    const onClose = jest.fn();
    await render(sheet({ onSave, onClose }));
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Ana');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('El nombre puede tener hasta 40 caracteres.')).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('bienvenida: Omitir llama onSkip y tocar fuera de la hoja equivale a omitir', async () => {
    const onSkip = jest.fn();
    await render(sheet({ onSkip }));
    await fireEvent.press(screen.getByRole('button', { name: 'Omitir' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('sheet-backdrop'));
    expect(onSkip).toHaveBeenCalledTimes(2);
  });

  it('doble toque en Continuar guarda una sola vez', async () => {
    const onSave = jest.fn().mockImplementation(() => new Promise<null>((resolve) => setTimeout(() => resolve(null), 30)));
    await render(sheet({ onSave }));
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Ana');
    const button = screen.getByRole('button', { name: 'Continuar' });
    await fireEvent.press(button);
    await fireEvent.press(button);
    await new Promise((r) => setTimeout(r, 80));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('edición: título "Tu nombre", parte del nombre actual, sin Omitir; vaciar y guardar manda ""', async () => {
    const onSave = jest.fn().mockResolvedValue(null);
    await render(sheet({ mode: 'edit', initialName: 'Ana', onSave }));
    expect(screen.getByText('Tu nombre')).toBeOnTheScreen();
    expect(screen.getByLabelText('Nombre').props.value).toBe('Ana');
    expect(screen.queryByRole('button', { name: 'Omitir' })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Nombre'), '');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(''));
  });

  it('edición: tocar fuera de la hoja la cierra sin guardar', async () => {
    const onClose = jest.fn();
    const onSave = jest.fn();
    await render(sheet({ mode: 'edit', initialName: 'Ana', onClose, onSave }));
    await fireEvent.press(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('ExpensesCard', () => {
  const data = { totalMinor: 16530, slices: slices.map((s) => ({ categoryId: s.key, name: s.name, color: s.color, totalMinor: s.totalMinor })) };

  it('título, mes, total al centro y leyenda con montos', async () => {
    await render(<ExpensesCard monthLabel="Noviembre" currency="PEN" data={data} hidden={false} />);
    expect(screen.getByText('Gastos del mes')).toBeOnTheScreen();
    expect(screen.getByText('Noviembre')).toBeOnTheScreen();
    expect(screen.getByText('Total gastado')).toBeOnTheScreen();
    expect(screen.getByText('S/ 165.30')).toBeOnTheScreen();
    expect(screen.getByText('Servicios')).toBeOnTheScreen();
    expect(screen.getByText('S/ 112.80')).toBeOnTheScreen();
  });

  it('tocar una fila de la leyenda resalta su segmento', async () => {
    await render(<ExpensesCard monthLabel="Noviembre" currency="PEN" data={data} hidden={false} />);
    const before = Number(screen.getByTestId('donut-arc-bus').props.strokeWidth);
    await fireEvent.press(screen.getByRole('button', { name: /Transporte/ }));
    expect(Number(screen.getByTestId('donut-arc-bus').props.strokeWidth)).toBeGreaterThan(before);
  });

  it('con el ojo cerrado no queda ningún monto en textos ni etiquetas', async () => {
    await render(<ExpensesCard monthLabel="Noviembre" currency="PEN" data={data} hidden />);
    expect(hasMoneyDigits(textsAndLabels())).toBe(false);
    expect(screen.getAllByText('****').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('Servicios')).toBeOnTheScreen(); // los nombres sí se ven
  });

  it('sin gastos muestra el estado vacío', async () => {
    await render(<ExpensesCard monthLabel="Noviembre" currency="PEN" data={{ totalMinor: 0, slices: [] }} hidden={false} />);
    expect(screen.getByText('Sin gastos')).toBeOnTheScreen();
  });
});

describe('FlowCard', () => {
  const series = Array.from({ length: 10 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, balanceMinor: 1000 + i * 100 }));

  it('variación positiva en verde con "+" y título tocable', async () => {
    const onOpenThreshold = jest.fn();
    await render(<FlowCard netChangeMinor={101550} currency="PEN" series={series} thresholdMinor={30000} hidden={false} onOpenThreshold={onOpenThreshold} />);
    expect(screen.getByText('+ S/ 1,015.50')).toHaveStyle({ color: '#1C9C4D' });
    expect(screen.getByText('Límite: S/ 300.00')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Flujo del mes' }));
    expect(onOpenThreshold).toHaveBeenCalledTimes(1);
  });

  it('variación negativa en rojo con "-"', async () => {
    await render(<FlowCard netChangeMinor={-4000} currency="PEN" series={series} thresholdMinor={null} hidden={false} onOpenThreshold={() => undefined} />);
    expect(screen.getByText('- S/ 40.00')).toHaveStyle({ color: '#E5484D' });
    expect(screen.queryByTestId('flow-threshold')).toBeNull();
  });

  it('variación 0 sin signo', async () => {
    await render(<FlowCard netChangeMinor={0} currency="PEN" series={series} thresholdMinor={null} hidden={false} onOpenThreshold={() => undefined} />);
    expect(screen.getByText('S/ 0.00')).toBeOnTheScreen();
  });

  it('con el ojo cerrado: variación y límite en ****, sin dinero en textos ni etiquetas', async () => {
    await render(<FlowCard netChangeMinor={101550} currency="PEN" series={series} thresholdMinor={30000} hidden onOpenThreshold={() => undefined} />);
    expect(screen.getByText('Límite: ****')).toBeOnTheScreen();
    expect(hasMoneyDigits(textsAndLabels())).toBe(false);
  });
});
