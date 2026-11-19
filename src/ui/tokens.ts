/** Tokens de diseño de Stitch (`docs/DESIGN_SYSTEM.md` §3). Solo modo claro. */

export const colors = {
  primary: '#1C9C4D',
  onPrimary: '#FFFFFF',
  primaryContainer: '#E6F5EC',
  onPrimaryContainer: '#0E5A2B',
  background: '#F5F5F7',
  onBackground: '#1D1D1F',
  surface: 'rgba(255,255,255,0.72)',
  surfaceSolid: '#FFFFFF',
  surfaceSubtle: 'rgba(255,255,255,0.52)',
  onSurface: '#1D1D1F',
  onSurfaceMuted: '#86868B',
  outline: 'rgba(255,255,255,0.85)',
  outlineSubtle: 'rgba(29,29,31,0.08)',
  danger: '#E5484D',
  dangerContainer: '#FDECEC',
  warning: '#F5A623',
  yape: '#742384',
  yapeContainer: 'rgba(116,35,132,0.10)',
  plin: '#00D1A0',
  plinContainer: 'rgba(0,209,160,0.12)',
} as const;

export type TextVariant =
  | 'displayLg'
  | 'headlineLg'
  | 'headlineMd'
  | 'titleMd'
  | 'bodyMd'
  | 'labelLg'
  | 'labelMd'
  | 'labelSm';

type FontWeight = '400' | '500' | '600' | '700';

export const typography: Record<
  TextVariant,
  { fontSize: number; lineHeight: number; fontWeight: FontWeight; letterSpacing: number }
> = {
  displayLg: { fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -1.08 },
  headlineLg: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7 },
  headlineMd: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.3 },
  titleMd: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.17 },
  bodyMd: { fontSize: 15, lineHeight: 22, fontWeight: '400', letterSpacing: 0 },
  labelLg: { fontSize: 14, lineHeight: 18, fontWeight: '600', letterSpacing: 0 },
  labelMd: { fontSize: 13, lineHeight: 16, fontWeight: '500', letterSpacing: 0 },
  labelSm: { fontSize: 12, lineHeight: 14, fontWeight: '500', letterSpacing: 0 },
};

export const radii = { card: 24, row: 16, badge: 12, pill: 9999 } as const;

export const spacing = {
  screenX: 20,
  screenTop: 48,
  screenBottom: 128,
  section: 20,
  cardPadding: 20,
  rowX: 16,
  rowY: 14,
} as const;

/** `#1C9C4D`, 0.1 → `rgba(28,156,77,0.1)`. */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
  if (!match) throw new Error(`Color hex inválido: ${hex}`);
  const [r, g, b] = [match[1], match[2], match[3]].map((part) => parseInt(part as string, 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

const INTER: Record<FontWeight, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
};

/** Sombras de Stitch (`boxShadow` de React Native; la interior marca el borde superior de vidrio). */
export const shadows = {
  glass: [
    { offsetX: 0, offsetY: 8, blurRadius: 32, color: 'rgba(29,29,31,0.06)' },
    { offsetX: 0, offsetY: 1, blurRadius: 0, color: 'rgba(255,255,255,0.9)', inset: true },
  ],
  glassSm: [
    { offsetX: 0, offsetY: 4, blurRadius: 16, color: 'rgba(29,29,31,0.04)' },
    { offsetX: 0, offsetY: 1, blurRadius: 0, color: 'rgba(255,255,255,0.85)', inset: true },
  ],
  fab: [{ offsetX: 0, offsetY: 8, blurRadius: 20, color: 'rgba(28,156,77,0.35)' }],
} as const;

/** Familia Inter para el peso pedido; `undefined` (fuente del sistema) si Inter no cargó. */
export function fontFamilyFor(weight: FontWeight, interLoaded: boolean): string | undefined {
  return interLoaded ? INTER[weight] : undefined;
}
