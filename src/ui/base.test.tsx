import { render, screen } from '@testing-library/react-native';
import { AmbientBackdrop } from './AmbientBackdrop';
import { AmountText } from './AmountText';
import { AppText, FontStatusContext } from './AppText';
import { GlassCard } from './GlassCard';
import { IconCircle } from './IconCircle';
import { Screen } from './Screen';
import { Text } from 'react-native';

describe('AmountText', () => {
  it('gasto: "- S/ 24.50" en rojo', async () => {
    await render(<AmountText amountMinor={2450} currency="PEN" sign="minus" />);
    expect(screen.getByText('- S/ 24.50')).toHaveStyle({ color: '#E5484D' });
  });

  it('ingreso en dólares: "+ $ 500.00" en verde', async () => {
    await render(<AmountText amountMinor={50000} currency="USD" sign="plus" />);
    expect(screen.getByText('+ $ 500.00')).toHaveStyle({ color: '#1C9C4D' });
  });

  it('sin signo: "S/ 1,840.00" con el color de texto normal', async () => {
    await render(<AmountText amountMinor={184000} currency="PEN" sign="none" />);
    expect(screen.getByText('S/ 1,840.00')).toHaveStyle({ color: '#1D1D1F' });
  });

  it('usa números tabulares', async () => {
    await render(<AmountText amountMinor={100} currency="PEN" />);
    expect(screen.getByText('S/ 1.00')).toHaveStyle({ fontVariant: ['tabular-nums'] });
  });

  it('un monto negativo o decimal no se dibuja a medias: lanza (error de programación)', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(render(<AmountText amountMinor={-1} currency="PEN" />)).rejects.toThrow();
    spy.mockRestore();
  });
});

describe('AppText', () => {
  it('aplica la variante (headlineLg: 28/34) y la familia Inter si cargó', async () => {
    await render(<AppText variant="headlineLg">Hola</AppText>);
    expect(screen.getByText('Hola')).toHaveStyle({ fontSize: 28, lineHeight: 34, fontFamily: 'Inter_700Bold' });
  });

  it('si Inter no cargó, usa la fuente del sistema (sin fontFamily)', async () => {
    await render(
      <FontStatusContext.Provider value={{ interLoaded: false }}>
        <AppText variant="bodyMd">Texto</AppText>
      </FontStatusContext.Provider>,
    );
    expect(screen.getByText('Texto').props.style).not.toEqual(expect.objectContaining({ fontFamily: expect.anything() }));
    expect(screen.getByText('Texto')).toHaveStyle({ fontSize: 15 });
  });
});

describe('GlassCard', () => {
  it('radio 24, borde de 1 px y relleno translúcido', async () => {
    await render(<GlassCard testID="card"><Text>x</Text></GlassCard>);
    expect(screen.getByTestId('card')).toHaveStyle({
      borderRadius: 24,
      borderWidth: 1,
      backgroundColor: 'rgba(255,255,255,0.72)',
    });
  });
});

describe('IconCircle', () => {
  it('fondo del color al 10 % y círculo de 40 px por defecto', async () => {
    await render(<IconCircle icon="restaurant" color="#1C9C4D" />);
    expect(screen.getByTestId('icon-circle')).toHaveStyle({
      backgroundColor: 'rgba(28,156,77,0.1)',
      width: 40,
      height: 40,
      borderRadius: 9999,
    });
  });

  it('admite 36 px', async () => {
    await render(<IconCircle icon="payments" color="#E5484D" size={36} />);
    expect(screen.getByTestId('icon-circle')).toHaveStyle({ width: 36, height: 36 });
  });
});

describe('Screen', () => {
  it('muestra el título como encabezado y deja los márgenes de Stitch', async () => {
    await render(<Screen title="Historial"><Text>contenido</Text></Screen>);
    expect(screen.getByRole('header')).toHaveTextContent('Historial');
    expect(screen.getByTestId('screen')).toHaveStyle({
      backgroundColor: '#F5F5F7',
      paddingHorizontal: 20,
      paddingTop: 48,
      paddingBottom: 128,
    });
  });

  it('sin título no dibuja encabezado', async () => {
    await render(<Screen><Text>contenido</Text></Screen>);
    expect(screen.queryByRole('header')).toBeNull();
  });
});

describe('AmbientBackdrop', () => {
  it.each(['primary', 'plin', 'yape'] as const)('el tono %s dibuja al menos un círculo y no recibe toques', async (tone) => {
    await render(<AmbientBackdrop tone={tone} />);
    expect(screen.getAllByTestId('ambient-circle').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('ambient-backdrop').props.pointerEvents).toBe('none');
  });
});
