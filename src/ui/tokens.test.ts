import { colors, fontFamilyFor, radii, spacing, typography, withAlpha } from './tokens';

describe('colors', () => {
  it('usa los valores de Stitch', () => {
    expect(colors.primary).toBe('#1C9C4D');
    expect(colors.background).toBe('#F5F5F7');
    expect(colors.danger).toBe('#E5484D');
    expect(colors.onSurfaceMuted).toBe('#86868B');
    expect(colors.primaryContainer).toBe('#E6F5EC');
    expect(colors.surface).toBe('rgba(255,255,255,0.72)');
  });
});

describe('typography', () => {
  it('displayLg, headlineLg y bodyMd coinciden con DESIGN_SYSTEM §3.2', () => {
    expect(typography.displayLg).toEqual({ fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -1.08 });
    expect(typography.headlineLg).toEqual({ fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7 });
    expect(typography.bodyMd).toEqual({ fontSize: 15, lineHeight: 22, fontWeight: '400', letterSpacing: 0 });
  });

  it('define las 8 variantes', () => {
    expect(Object.keys(typography).sort()).toEqual(
      ['bodyMd', 'displayLg', 'headlineLg', 'headlineMd', 'labelLg', 'labelMd', 'labelSm', 'titleMd'],
    );
  });
});

describe('radii y spacing', () => {
  it('radios y márgenes de pantalla', () => {
    expect(radii).toEqual({ card: 24, row: 16, badge: 12, pill: 9999 });
    expect(spacing.screenX).toBe(20);
    expect(spacing.screenTop).toBe(48);
    expect(spacing.screenBottom).toBe(128);
  });
});

describe('withAlpha', () => {
  it('convierte hex a rgba', () => {
    expect(withAlpha('#1C9C4D', 0.1)).toBe('rgba(28,156,77,0.1)');
  });
  it('rechaza un color inválido', () => {
    expect(() => withAlpha('#zzz', 0.1)).toThrow();
  });
});

describe('fontFamilyFor', () => {
  it('usa Inter si cargó y la fuente del sistema si no', () => {
    expect(fontFamilyFor('400', true)).toBe('Inter_400Regular');
    expect(fontFamilyFor('500', true)).toBe('Inter_500Medium');
    expect(fontFamilyFor('600', true)).toBe('Inter_600SemiBold');
    expect(fontFamilyFor('700', true)).toBe('Inter_700Bold');
    expect(fontFamilyFor('600', false)).toBeUndefined();
  });
});
