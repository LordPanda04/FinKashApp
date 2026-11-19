# Fase 6 — Navegación, tokens y base visual: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que la app muestre la estructura de Stitch: lienzo claro "Liquid Glass", barra de pestañas flotante solo con íconos y botón "+" verde elevado, con las cinco pantallas como esqueletos navegables.

**Arquitectura:**
- Tokens de diseño en TypeScript (`src/ui/tokens.ts`) y `StyleSheet`; sin NativeWind.
- Barra personalizada con `expo-router/ui` (`Tabs`, `TabList`, `TabTrigger`, `TabSlot`): las rutas viven en `src/app/(tabs)/`, delgadas; los componentes visuales en `src/ui/`.
- Esta fase **no** construye el contenido de las pantallas (Fase 7): cada pestaña muestra su título y un estado vacío mínimo.

**Stack:** Expo Router (`expo-router/ui`), `expo-symbols` (ya instalado; Material Symbols en Android), `@expo-google-fonts/inter` + `expo-font`, `react-native-safe-area-context` (ya instalados), `@testing-library/react-native` y `expo-router/testing-library` para pruebas.

**Especificación (leer junto con este plan):** `docs/DESIGN_SYSTEM.md` (§2–§6, §9, §10), `docs/ARCHITECTURE.md` (estructura de `src/app` y `src/ui`), `CLAUDE.md`.

## Decisiones de este plan (confirmar o corregir)
Cierran lo que `DESIGN_SYSTEM.md` §9 y `PENDING_TASKS.md` dejaban abierto; quedan como propuestas hasta tu confirmación:
1. **Estilos:** tokens en TypeScript + `StyleSheet` (sin NativeWind).
2. **Íconos:** `expo-symbols` con `SymbolView` (Material Symbols en Android). Limitación: no hay eje "relleno" (FILL); el ítem activo se distingue con el círculo `primary-container` y color `primary`, y un peso mayor.
3. **Sin desenfoque de fondo** en esta fase: las superficies de vidrio son blanco translúcido + borde + sombra. `expo-blur` se evalúa en el emulador más adelante si el resultado no se parece a Stitch.
4. **Gráficos** (`react-native-svg`): se instalan en la Fase 7, cuando se construya Inicio.
5. **Saludo de Inicio:** como aún no hay perfil de usuario, el esqueleto dice "Hola!" (el diseño de Stitch dice "Hola, Leonardo!"). El nombre llega con los ajustes/perfil.
6. **Solo modo claro:** se fuerza con `Appearance.setColorScheme('light')`; `userInterfaceStyle` de `app.json` pasa a `"light"` (surte efecto en el próximo build nativo).
7. **Orden de pestañas:** Inicio, Historial, "+" (Registrar), Billeteras, Categorías; íconos `home`, `schedule`, `add`, `account_balance_wallet`, `grid_view`.

## Restricciones globales
- Idioma: textos visibles, comentarios y documentación en español; nombres técnicos en inglés.
- **Nunca commit sin autorización explícita; push requiere otra aparte.** Este plan tiene autorizado el commit local al cerrar cada tarea (instrucción vigente del usuario); nada de `push`. No crear ni cambiar ramas.
- Instalar con `npx expo install`; verificar APIs con Context7. No agregar `expo-sqlite`.
- El diseño de Stitch es la fuente de verdad: valores de `DESIGN_SYSTEM.md` tal cual; no rediseñar ni inventar estilos nuevos.
- Números tabulares (`fontVariant: ['tabular-nums']`) en montos y fechas. La barra de pestañas va **solo con íconos** (pero con `accessibilityLabel` en español).
- Márgenes: 20 px laterales, 48 px arriba, 128 px abajo (espacio de la barra flotante).
- Montos con `formatMoney` del dominio; la UI no formatea dinero por su cuenta.
- **Prohibido tomar capturas con `adb screencap` o reiniciar el emulador desde el agente** (instrucción del usuario, 2026-11-19): la verificación visual la hace el usuario; el agente solo revisa `logcat` (máx. 15 s) y pruebas.
- Al terminar cada tarea: `npm test`, `npm run typecheck`, `npx expo lint` en verde. Un solo Metro a la vez (puerto 8081); detenerlo al terminar.

## Review Focus
Casos que el diseño implica y que tendrán prueba en la tarea indicada:
1. **Fuente Inter no carga** (error o demora): la app no se cae ni queda en blanco; usa la fuente del sistema y sigue (Tarea 1).
2. **Lector de pantalla con barra sin texto:** cada pestaña y el "+" tienen `accessibilityLabel` en español y `accessibilityState.selected` (Tarea 3).
3. **Botón atrás de Android** desde Registrar vuelve a la pestaña anterior, no cierra la app (Tarea 3).
4. **Teclado abierto en Registrar:** la barra flotante no tapa los campos (se oculta con el teclado) (Tarea 3).
5. **Navegación por gestos (inset inferior ≠ 0):** la barra se eleva el inset de seguridad y no queda bajo la barra del sistema (Tarea 3).

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/ui/tokens.ts` | Colores, tipografía, radios, sombras y espaciado de `DESIGN_SYSTEM.md` §3 |
| `src/ui/fonts.ts` | `useAppFonts()`: carga Inter y expone `{ ready, failed }` |
| `src/ui/Icon.tsx` | `Icon`: envoltorio de `SymbolView` con nombres de Material Symbols tipados |
| `src/ui/GlassCard.tsx`, `IconCircle.tsx`, `AmbientBackdrop.tsx`, `AmountText.tsx`, `Screen.tsx` | Componentes base de §4 |
| `src/ui/TabBar.tsx`, `TabBarFab.tsx` | Barra flotante y botón "+" |
| `src/app/(tabs)/_layout.tsx` | Navegador con barra personalizada |
| `src/app/(tabs)/{index,historial,registrar,billeteras,categorias}.tsx` | Esqueletos de las 5 pantallas |
| `src/app/_layout.tsx` | Fuentes, tema claro, proveedor de repositorios |

Las pruebas van junto a cada archivo (`*.test.ts(x)`).

---

### Task 1: Dependencias, tokens y fuentes

**Archivos:**
- Modificar: `package.json`, `package-lock.json`, `app.json` (`userInterfaceStyle`), `src/app/_layout.tsx`
- Crear: `src/ui/tokens.ts`, `src/ui/tokens.test.ts`, `src/ui/fonts.ts`, `src/ui/fonts.test.tsx`

**Interfaces:**
- Produce (`tokens.ts`, valores de `DESIGN_SYSTEM.md` §3, p. ej. `colors.primary === '#1C9C4D'`):

```ts
export const colors: { primary: string; onPrimary: string; primaryContainer: string; onPrimaryContainer: string; background: string; onBackground: string; surface: string; surfaceSolid: string; surfaceSubtle: string; onSurface: string; onSurfaceMuted: string; outline: string; outlineSubtle: string; danger: string; dangerContainer: string; warning: string; yape: string; yapeContainer: string; plin: string; plinContainer: string };
export type TextVariant = 'displayLg' | 'headlineLg' | 'headlineMd' | 'titleMd' | 'bodyMd' | 'labelLg' | 'labelMd' | 'labelSm';
export const typography: Record<TextVariant, { fontSize: number; lineHeight: number; fontWeight: '400'|'500'|'600'|'700'; letterSpacing: number }>;
export const radii: { card: 24; row: 16; badge: 12; pill: 9999 };
export const spacing: { screenX: 20; screenTop: 48; screenBottom: 128; section: 20; cardPadding: 20; rowX: 16; rowY: 14 };
export function withAlpha(hex: string, alpha: number): string; // '#1C9C4D', 0.1 → 'rgba(28,156,77,0.1)'
export function fontFamilyFor(weight: '400'|'500'|'600'|'700', interLoaded: boolean): string | undefined; // 'Inter_600SemiBold' si cargó; undefined (sistema) si no
```

- Produce (`fonts.ts`): `useAppFonts(): { ready: boolean; failed: boolean }`; `ready` es true al terminar la carga **o** al fallar (la app nunca se queda esperando).

- [ ] **Paso 1: Instalar:** `npx expo install @expo-google-fonts/inter` y, como dependencias de desarrollo, `@testing-library/react-native` (`npx expo install` y mover con `npm install --save-dev <paquete>@<versión>`). Cambiar `userInterfaceStyle` a `"light"` en `app.json`.
- [ ] **Paso 2: Pruebas que fallan** (`tokens.test.ts`): `colors.primary` `#1C9C4D`, `colors.background` `#F5F5F7`, `colors.danger` `#E5484D`; `typography.displayLg` = `{ fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -1.08 }`; `typography.headlineLg` = `{ 28, 34, '700', -0.7 }`; `typography.bodyMd` = `{ 15, 22, '400', 0 }`; `radii.card` 24; `spacing.screenBottom` 128; `withAlpha('#1C9C4D', 0.1)` = `'rgba(28,156,77,0.1)'`; `withAlpha('#zzz', 0.1)` lanza; `fontFamilyFor('600', true)` = `'Inter_600SemiBold'`, `fontFamilyFor('600', false)` = `undefined`.
- [ ] **Paso 3:** `npx jest src/ui/tokens` → FALLA; implementar `tokens.ts`; → PASA.
- [ ] **Paso 4: Pruebas que fallan** (`fonts.test.tsx`, con `useFonts` de `expo-font` simulado): carga correcta → `{ ready: true, failed: false }`; error → `{ ready: true, failed: true }` (punto de atención 1); mientras carga → `ready: false`.
- [ ] **Paso 5:** implementar `useAppFonts` sobre `useFonts` con `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`; en `_layout.tsx` mantener el splash (`expo-splash-screen`) hasta `ready`, forzar `Appearance.setColorScheme('light')` y envolver con `RepositoriesProvider`.
- [ ] **Paso 6:** `npm test`, `typecheck`, `lint`. **Commit:** `feat(ui): tokens de diseño y fuente Inter`.

### Task 2: Íconos y componentes base de vidrio

**Archivos:**
- Crear: `src/ui/Icon.tsx`, `GlassCard.tsx`, `IconCircle.tsx`, `AmbientBackdrop.tsx`, `AmountText.tsx`, `Screen.tsx` y sus `*.test.tsx`

**Interfaces:**
- Consume: `colors`, `typography`, `radii`, `spacing`, `withAlpha`, `fontFamilyFor` (Tarea 1); `formatMoney`, `Currency` (dominio).
- Produce:

```ts
export type IconName = 'home' | 'schedule' | 'add' | 'account_balance_wallet' | 'grid_view' | 'restaurant' | 'directions_car' | 'payments' | 'bolt' | 'movie' | 'favorite' | 'edit' | 'delete' | 'expand_more' | 'category' | 'chevron_right' | 'notes' | 'calendar_today' | 'smartphone' | 'qr_code_2' | 'add_circle' | 'credit_card' | 'account_balance';
export function Icon(props: { name: IconName; size?: number; color?: string; active?: boolean }): JSX.Element; // size por defecto 24; active = peso mayor
export function GlassCard(props: ViewProps & { padding?: number }): JSX.Element;       // surface + borde outline 1 px + radio card + sombra glass
export function IconCircle(props: { icon: IconName; color: string; size?: 36 | 40 }): JSX.Element; // fondo withAlpha(color, 0.1), ícono de 20 px
export function AmbientBackdrop(props: { tone: 'primary' | 'plin' | 'yape' }): JSX.Element;       // 1–2 círculos translúcidos grandes, sin desenfoque
export function AmountText(props: { amountMinor: number; currency: Currency; sign?: 'plus' | 'minus' | 'none'; variant?: TextVariant }): JSX.Element; // gasto danger "- S/", ingreso primary "+ S/", tabular-nums
export function Screen(props: { title?: string; children: ReactNode }): JSX.Element; // fondo background, márgenes 20/48/128, título headlineLg opcional
```

- [ ] **Paso 1: Pruebas que fallan** (RNTL): `AmountText amountMinor=2450 currency="PEN" sign="minus"` muestra `- S/ 24.50`, con color `#E5484D`; `sign="plus"` con 50000 USD muestra `+ $ 500.00` en `#1C9C4D`; `sign="none"` muestra `S/ 1,840.00` para 184000 sin color de signo; el estilo incluye `fontVariant: ['tabular-nums']`; `IconCircle` con `#1C9C4D` usa fondo `rgba(28,156,77,0.1)`; `GlassCard` aplica radio 24 y borde 1 px; `Screen title="Historial"` muestra el título y `Screen` sin título no renderiza ninguno; `Icon` con un nombre fuera de `IconName` no compila (comprobado por `typecheck`).
- [ ] **Paso 2:** ejecutar → FALLA; implementar los componentes (sombras con la propiedad `boxShadow` de React Native; verificar con Context7 el soporte de `boxShadow` y de `inset` en Android antes de usar `inset`, y si no hay soporte usar la sombra exterior más un borde superior de 1 px en `outline`).
- [ ] **Paso 3:** `npx jest src/ui` → PASA; `typecheck`, `lint`. **Commit:** `feat(ui): íconos y componentes base de vidrio`.

### Task 3: Barra de pestañas flotante y navegación

**Archivos:**
- Crear: `src/ui/TabBar.tsx`, `src/ui/TabBarFab.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/index.tsx`, `historial.tsx`, `registrar.tsx`, `billeteras.tsx`, `categorias.tsx`, `src/app/(tabs)/navigation.test.tsx`
- Eliminar: `src/app/index.tsx` (la pantalla provisional de la Fase 5; la comprobación de la base pasa a un registro de depuración en `__DEV__` dentro de `(tabs)/index.tsx`)

**Interfaces:**
- Consume: `Icon`, `GlassCard`, `Screen`, `AmbientBackdrop`, tokens (Tareas 1–2); `useRepositories` (Fase 5).
- Produce: rutas `/` (Inicio), `/historial`, `/registrar`, `/billeteras`, `/categorias` bajo el grupo `(tabs)`.
  - `TabBar`: píldora de vidrio flotante a 20 px del borde inferior (más el inset inferior de seguridad), ancho = pantalla − 40 px, 5 ítems de 44 px solo con íconos; el activo en círculo `primaryContainer` con ícono `primary`, los inactivos en `onSurfaceMuted`; cada ítem con `accessibilityRole="tab"`, `accessibilityLabel` ("Inicio", "Historial", "Registrar movimiento", "Billeteras", "Categorías") y `accessibilityState={{ selected }}`.
  - `TabBarFab`: círculo `primary` de 56 px con `add` de 28 px, sombra `fab`, sobresale 12 px de la barra, escala 0.95 al presionar; lleva a `/registrar`.
  - La barra se oculta mientras el teclado está visible (suscripción a `Keyboard`).
  - Esqueletos: Inicio ("Hola!" en `headlineLg`, sin título de pantalla), Historial, Registrar movimiento, Billeteras y Categorías con su título y un texto de estado vacío ("Aquí irá …").

- [ ] **Paso 1: Pruebas que fallan** (`navigation.test.tsx`, con `renderRouter` de `expo-router/testing-library`):
  - Al abrir `/` se ve "Hola!" y no existe un título "Inicio".
  - Los 5 ítems existen con sus etiquetas en español; el de Inicio tiene `selected: true` y los demás `false` (punto de atención 2).
  - Tocar "Billeteras" navega a `/billeteras` y cambia el ítem seleccionado; tocar el "+" navega a `/registrar` y selecciona "Registrar movimiento".
  - Desde `/registrar`, el retroceso (`router.back()`) vuelve a la pestaña anterior, no a un estado vacío (punto de atención 3).
  - Con el teclado visible (disparar el evento `keyboardDidShow`) la barra no se renderiza; con `keyboardDidHide` reaparece (punto de atención 4).
  - Con un inset inferior de 24 (proveedor de safe area simulado), la barra queda a 20 + 24 px del borde inferior (punto de atención 5).
  - Los textos de los esqueletos no incluyen la palabra "Tabs" ni texto en inglés.
- [ ] **Paso 2:** ejecutar → FALLA; implementar `TabBar`, `TabBarFab` y el `_layout` con `Tabs`/`TabList asChild`/`TabTrigger`/`TabSlot` de `expo-router/ui`; `TabList` queda oculta (`display: 'none'`) y la barra personalizada usa `TabTrigger` (patrón "multiple tab bars" de la documentación). Cada pantalla deja 128 px abajo para la barra.
- [ ] **Paso 3:** `npm test`, `typecheck`, `lint`; comprobar que Metro empaqueta (`curl` al bundle de Android responde 200) y que `logcat` no muestra un fallo fatal tras abrir la app (máx. 15 s). **Commit:** `feat(ui): barra de pestañas flotante y esqueletos de pantalla`.

### Task 4: Verificación del usuario y cierre de la fase

**Archivos:**
- Modificar: `docs/progress/*`, `docs/DEVELOPMENT_ROADMAP.md`, `docs/progress/DECISIONS.md`, `docs/DESIGN_SYSTEM.md` (§8/§9: marcar lo resuelto)

- [ ] **Paso 1:** pasar al usuario la lista de comprobación visual (sin capturas del agente): fondo `#F5F5F7`; barra flotante con 5 íconos y "+" elevado; ítem activo con círculo verde claro; cambio de pestaña; "+" abre Registrar con la barra visible; tecla atrás; teclado (si hay campo); sin texto bajo los íconos; "Hola!" sin título superior en Inicio.
- [ ] **Paso 2:** con lo que el usuario reporte, registrar diferencias con Stitch en `PENDING_TASKS.md` (no se corrigen en esta fase salvo errores de funcionamiento).
- [ ] **Paso 3:** actualizar `CURRENT_STATUS.md` (9 secciones), `COMPLETED_TASKS.md`, `PENDING_TASKS.md`, `DEVELOPMENT_ROADMAP.md` (Fase 6) y registrar en `DECISIONS.md` las decisiones 1–7 de este plan según la respuesta del usuario.
- [ ] **Paso 4:** `npm test`, `typecheck`, `lint`; detener Metro. **Commit:** `docs: cierre de la Fase 6`.

---

## Al terminar el plan
- Siguiente plan: **Fase 7** (pantallas), en el orden del roadmap: Categorías → Billeteras y transferencias → Registrar movimiento → Historial → Inicio. Instalará `react-native-svg` y `@powersync/react` (consultas en vivo) y tomará las decisiones de diseño pendientes (`DESIGN_SYSTEM.md` §8).
