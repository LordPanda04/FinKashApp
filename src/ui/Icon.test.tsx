import { render, screen } from '@testing-library/react-native';
import { Icon } from './Icon';

describe('Icon', () => {
  it('usa el nombre de Material Symbols en Android y web, tamaño 24 por defecto', async () => {
    await render(<Icon name="home" testID="i" />);
    const props = screen.getByTestId('i').props;
    expect(props.name).toEqual({ android: 'home', web: 'home' });
    expect(props.size).toBe(24);
  });

  it('aplica color y tamaño', async () => {
    await render(<Icon name="add" size={28} color="#FFFFFF" testID="i" />);
    const props = screen.getByTestId('i').props;
    expect(props.size).toBe(28);
    expect(props.tintColor).toBe('#FFFFFF');
  });

  it('active usa un peso mayor que inactivo', async () => {
    await render(
      <>
        <Icon name="home" active testID="on" />
        <Icon name="home" testID="off" />
      </>,
    );
    expect(screen.getByTestId('on').props.weight).not.toEqual(screen.getByTestId('off').props.weight);
  });
});
