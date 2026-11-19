# Fase 7C — Inicio (resumen, selector de alcance, dona y flujo): plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que la pestaña Inicio muestre el resumen de saldos (disponible, gastado, restante, proyectado), con selector de billetera o Saldo general, botón de ojo para ocultar montos, la dona "Gastos del mes" y el gráfico "Flujo del mes" con su umbral, todo calculado con el dominio ya existente.

**Arquitectura:**
- Un presentador puro (`buildHomeView`) recibe el libro, las billeteras, las categorías, el periodo activo, los ajustes del dispositivo y los umbrales, y devuelve todo lo que dibuja Inicio; no sabe nada de React ni de SQL.
- La geometría de los gráficos (arcos de la dona, curva suave, escalas) también es pura y se prueba con números; los componentes `react-native-svg` solo la dibujan.
- La pantalla lee con `useQuery` (se actualiza sola) y guarda el alcance, el ojo y la proyección en `device_settings`.

**Tech Stack:** `react-native-svg`, Expo Router, `@testing-library/react-native`, repositorios (`ledger`, `wallets`, `categories`, `periods`, `settings`) y funciones de `src/domain/reports/home.ts`.

**Spec:** `docs/DESIGN_SYSTEM.md` (§3, §4 `DonutChart`/`FlowLineChart`, §6.1, §9, §10.1), `docs/FINANCIAL_RULES.md` (§9, §10, §11), `docs/DATABASE_SCHEMA.md` (`device_settings`, `balance_thresholds`), plan 7A/7B y Fase 5.

## Alcance
- **Entra:** Inicio completo (saludo, resumen, selector de alcance con casillas, ojo, proyección, dona, flujo con umbral) y una hoja para fijar o quitar el umbral desde el gráfico.
- **No entra:** sugerencia y confirmación de nuevo periodo (Fase 8: aquí se usa `periods.activeRange`), pantalla de Ajustes completa, modo oscuro.

## Decisiones de este plan (confirmar o corregir)
1. **`react-native-svg`** para la dona y la curva, con componentes propios (como proponía `DESIGN_SYSTEM.md` §9). Es un módulo nativo: requiere recompilar el development build una vez (`npx expo run:android --no-bundler`).
2. **Moneda de los gráficos:** el resumen muestra cada moneda por separado (la segunda, en USD, como segunda línea); la dona y el flujo se dibujan **de una moneda a la vez**, con un selector "S/ | $" si el alcance tiene las dos. Nunca se suman monedas.
3. **Umbral:** se fija desde el gráfico "Flujo del mes" (tocar el título abre "Umbral de aviso", por moneda y para el alcance: global en Saldo general o de la billetera elegida); no existe pantalla de Ajustes todavía.
4. **Saldo general** suma las billeteras con la casilla "incluir en general" (`wallets.include_in_general`); las ocultas cuentan si su casilla está marcada. Las tarjetas visibles entran en la dona y en la proyección (solo Saldo general).
5. **Ojo:** reemplaza **todo** monto de Inicio por `****`, incluidas las etiquetas de accesibilidad y el total del centro de la dona; su estado, el alcance y la proyección se guardan en `device_settings`.
6. **Periodo:** el de `periods.activeRange()` (día 1 del mes actual hasta hoy si no hay periodos); el pill muestra el nombre del mes.
7. **Gráficos sin interacción compleja:** la dona permite elegir un segmento tocando su fila de la leyenda (se engrosa y resalta); el flujo no tiene gestos (el "punto del día actual" y el eje X son fijos).

## Restricciones globales
- Idioma: textos visibles, comentarios y documentación en español; nombres técnicos en inglés.
- **Nunca commit sin autorización explícita; push requiere otra aparte.** Este plan tiene autorizado el commit local al cerrar cada tarea (instrucción vigente); nada de `push`. No crear ni cambiar ramas.
- Instalar con `npx expo install`; verificar APIs con Context7. No agregar `expo-sqlite`.
- Stitch es la fuente de verdad visual: tokens y componentes de `DESIGN_SYSTEM.md`; no rediseñar.
- Dinero con `formatMoney`/`AmountText`; nunca flotantes; nunca mezclar monedas.
- Las cifras salen del dominio (`homeSummary`, `expensesByCategory`, `dailyBalanceSeries`, `netChange`, `projectedRemaining`, `isBelowThreshold`); la UI no recalcula saldos.
- Solo fecha (sin hora), zona Lima; "hoy" = `todayInLima(new Date())`.
- **Prohibido tomar capturas con `adb screencap` o reiniciar el emulador desde el agente**; la verificación visual la hace el usuario. Un solo Metro (8081): no detener uno que no inició el agente. Para comprobar que todo compila, usar `npx expo export --platform android` en una carpeta temporal (el bundle de desarrollo carga las rutas de forma diferida).
- Al terminar cada tarea: `npm test`, `npm run typecheck`, `npx expo lint` en verde.

## Review Focus
1. **Ojo cerrado:** ningún monto se ve ni se lee con el lector de pantalla (resumen, dona, leyenda, flujo, umbral) (Tarea 4).
2. **Cambiar el alcance** (billetera ↔ Saldo general ↔ casillas) actualiza resumen, dona y flujo a la vez; en una billetera con una sola moneda no aparece el selector "S/ | $" (Tareas 2 y 4).
3. **Sin gastos en el periodo:** la dona muestra un estado vacío, sin `NaN` ni arcos rotos (Tareas 1 y 3).
4. **Serie plana o de un solo punto** (saldo constante, primer día del mes): el gráfico dibuja una línea recta, sin dividir entre cero; un umbral muy por encima o por debajo de los saldos entra en la escala (Tarea 1).
5. **Primer uso sin billeteras:** Inicio muestra "Crea tu primera billetera" en vez de ceros o errores (Tarea 4).

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/ui/charts/geometry.ts` | Geometría pura: `donutArcs`, `smoothLinePath`, `linearScale`, `flowChartLayout` |
| `src/ui/charts/DonutChart.tsx`, `FlowLineChart.tsx` | Dibujo con `react-native-svg` |
| `src/features/inicio/presenter.ts` | `buildHomeView`, `scopeAccountIds`, `maskAmount` |
| `src/features/inicio/SummaryCard.tsx`, `ScopeSheet.tsx`, `ThresholdSheet.tsx`, `ExpensesCard.tsx`, `FlowCard.tsx` | Bloques de la pantalla |
| `src/features/inicio/InicioScreen.tsx` | Composición, lectura y persistencia de ajustes |
| `src/app/(tabs)/index.tsx` (mod.) | Ruta delgada |

Las pruebas van junto a cada archivo (`*.test.ts(x)`).

---

### Task 1: Dependencia y geometría de los gráficos

**Archivos:**
- Modificar: `package.json`, `package-lock.json`
- Crear: `src/ui/charts/geometry.ts`, `src/ui/charts/geometry.test.ts`

**Interfaces:**
- Produce:

```ts
export interface DonutSlice { key: string; value: number; color: string }
export interface DonutArc { key: string; color: string; fraction: number; startAngle: number; endAngle: number; path: string } // ángulos en radianes desde las 12 en punto, sentido horario
export function donutArcs(slices: DonutSlice[], opts: { radius: number; gapRadians?: number }): DonutArc[]; // ignora valores ≤ 0; suma de fracciones = 1; [] si no hay valores
export function linearScale(domain: [number, number], range: [number, number]): (v: number) => number; // si el dominio es de ancho 0 devuelve el centro del rango
export function smoothLinePath(points: { x: number; y: number }[]): string; // M … C … (Catmull-Rom → Bézier); 1 punto → "M x y"; 2 puntos → recta
export interface FlowLayout { width: number; height: number; padding: { top: number; right: number; bottom: number; left: number } }
export function flowChartModel(series: { date: IsoDate; balanceMinor: number }[], threshold: number | null, layout: FlowLayout): { linePath: string; areaPath: string; thresholdY: number | null; todayPoint: { x: number; y: number } | null; xTicks: { x: number; label: string }[]; yMin: number; yMax: number };
```

`flowChartModel`: escala X por índice del día; escala Y con dominio = [min, max] de la serie **ampliado para incluir el umbral** y con un colchón del 10 %; serie vacía → rutas vacías y `todayPoint: null`; serie plana o de un punto → recta al centro; `xTicks` = 5 fechas repartidas (día del mes, p. ej. "1", "8", "15", "22", "30"); `areaPath` cierra la curva hasta la base.

- [ ] **Paso 1: Instalar:** `npx expo install react-native-svg`.
- [ ] **Paso 2: Pruebas que fallan** (`geometry.test.ts`): `donutArcs` con valores 50/30/20 → fracciones 0.5/0.3/0.2 que suman 1, el primer arco empieza en 0 y el último termina en 2π; valores 0 o negativos se ignoran; lista vacía o todo 0 → `[]`; un solo valor → un arco de fracción 1 (círculo completo, sin `NaN`); `path` es una cadena que empieza por `M` y no contiene `NaN`; `linearScale([0,100],[0,200])(50)` = 100; dominio de ancho 0 → el centro del rango; `smoothLinePath` de 1 punto = `M 10 20`, de 2 puntos una recta (`L`), de 4 puntos empieza con `M` y contiene `C`; `flowChartModel`: con serie de 30 días el último punto es `todayPoint`, hay 5 `xTicks` con etiquetas de día; serie vacía → `linePath: ''` y `todayPoint: null`; **serie plana** (30 días en 1000) → `yMin < yMax`, sin `NaN` y la línea queda dentro del área; **un solo punto** → sin `NaN`; **umbral 30000 con saldos entre 1000 y 5000** → `thresholdY` dentro de `[padding.top, height − padding.bottom]` (la escala lo incluyó); umbral `null` → `thresholdY: null`; `areaPath` termina cerrando en la base (`Z`).
- [ ] **Paso 3:** ejecutar → FALLA; implementar (aritmética sencilla; redondear coordenadas a 2 decimales).
- [ ] **Paso 4:** `npm test`, `typecheck`, `lint`. **Commit:** `feat(ui): geometría de gráficos y react-native-svg`.

### Task 2: Presentador de Inicio

**Archivos:**
- Crear: `src/features/inicio/presenter.ts`, `src/features/inicio/presenter.test.ts`

**Interfaces:**
- Consume: `homeSummary`, `expensesByCategory`, `dailyBalanceSeries`, `netChange`, `projectedRemaining`, `isBelowThreshold`, `DateRange` (dominio), registros de `src/data/types.ts`, `monthRange`, `MONTH_NAMES_ES`, `formatMoney`.
- Produce:

```ts
export type Scope = 'general' | string; // 'general' o el id de una billetera
export interface HomeInput { state: LedgerState; wallets: WalletRecord[]; cards: CardRecord[]; categories: CategoryRecord[]; period: DateRange; today: IsoDate; scope: Scope; thresholds: { currency: Currency; amountMinor: number; walletId: string | null }[] }
export interface CurrencyBlock { currency: Currency; availableMinor: number; spentMinor: number; remainingMinor: number; projectedMinor: number | null; belowThreshold: boolean; thresholdMinor: number | null }
export interface HomeView {
  empty: boolean;                                   // no hay billeteras en el alcance
  scopeLabel: string;                               // 'Saldo general' o el nombre de la billetera
  monthLabel: string;                               // 'Noviembre'
  currencies: Currency[];                           // monedas con cuentas en el alcance, PEN primero
  blocks: Record<Currency, CurrencyBlock | undefined>;
  donut: Record<Currency, { totalMinor: number; slices: { categoryId: string; name: string; color: string; totalMinor: number }[] } | undefined>;
  flow: Record<Currency, { series: { date: IsoDate; balanceMinor: number }[]; netChangeMinor: number; thresholdMinor: number | null } | undefined>;
}
export function scopeAccountIds(state: LedgerState, wallets: WalletRecord[], scope: Scope): { walletAccountIds: string[]; cardAccountIds: string[] };
export function buildHomeView(input: HomeInput): HomeView;
export function maskAmount(text: string, hidden: boolean): string; // hidden → '****', si no el mismo texto
```

Reglas: en `general`, las cuentas son las de las billeteras con `includeInGeneral` y las tarjetas visibles; con una billetera, solo sus cuentas y **sin tarjetas ni proyección** (`projectedMinor: null`); `projectedMinor` solo en `general`; el umbral aplicado es el de la billetera (si el alcance es una billetera) o el global de la moneda (`walletId: null`) en Saldo general; `belowThreshold` = `isBelowThreshold(remainingMinor, thresholdMinor)`; la dona ordena de mayor a menor y excluye categorías sin gasto; el flujo usa `period` completo.

- [ ] **Paso 1: Pruebas que fallan** (escenario del plan de la Fase 4: noviembre 2026, `yape` y `plin`, aperturas 50000 y 21000, gastos 2450, 1800 y 11280, ingreso 50000, transferencia 10000):
  - Saldo general con las dos billeteras → `blocks.PEN` = `{ availableMinor: 121000, spentMinor: 15530, remainingMinor: 105470 }`; solo `plin` → restante 19720, gastado 11280.
  - `currencies` solo tiene las monedas con cuentas: una billetera solo PEN → `['PEN']`; con cuenta USD → `['PEN','USD']` y `blocks.USD` separado, sin mezclar.
  - `include_in_general: false` en `yape` saca sus saldos del Saldo general pero no de la vista de esa billetera.
  - Proyección solo en general: restante 100000, tarjeta con consumido 30000 y deuda "Debo" con cuota 20000 vencida este mes → `projectedMinor` 50000; con una billetera elegida → `null`.
  - Umbral: global de 30000 y restante 29999 → `belowThreshold: true`; restante 30000 → `false`; sin umbral → `false` y `thresholdMinor: null`; el umbral de una billetera solo aplica cuando esa billetera es el alcance.
  - Dona: gastos `food` 4250 y `services` 11280 → `[services, food]` con nombre y color de la categoría y total 15530; sin gastos → `slices: []` y `totalMinor: 0`; una compra con tarjeta aparece en la dona en Saldo general pero no cuando el alcance es una billetera.
  - Flujo: serie diaria del 1 al 20 de noviembre, `netChangeMinor` = 105470 en el escenario; `thresholdMinor` pasa al flujo.
  - `empty: true` sin billeteras o con alcance inexistente; `scopeLabel` = "Saldo general" o el nombre; `monthLabel` = "Noviembre".
  - `maskAmount('S/ 1,840.00', true)` = `****` y con `false` el mismo texto.
- [ ] **Paso 2:** ejecutar → FALLA; implementar.
- [ ] **Paso 3:** `npm test`, `typecheck`, `lint`. **Commit:** `feat(inicio): presentador de Inicio`.

### Task 3: Componentes de Inicio

**Archivos:**
- Crear: `src/ui/charts/DonutChart.tsx`, `FlowLineChart.tsx`, `src/features/inicio/SummaryCard.tsx`, `ScopeSheet.tsx`, `ThresholdSheet.tsx`, `ExpensesCard.tsx`, `FlowCard.tsx` y `src/features/inicio/components.test.tsx`

**Interfaces:**
- Consume: geometría (Tarea 1), `HomeView`, `maskAmount` (Tarea 2), `GlassCard`, `FilterChip`, `HeaderIconButton`, `Switch`, `SelectorSheet`, `BottomSheet`, `AmountText`, `TextField`, `PrimaryButton`, `Icon` (7A/7B).
- Produce (props, todo con `hidden: boolean` para el ojo):

```ts
export function DonutChart(props: { slices: { key: string; name: string; color: string; totalMinor: number }[]; selectedKey: string | null; centerLabel: string; centerValue: string }): JSX.Element; // anillo radio 76, grosor 24; seleccionado 28 y desplazado; vacío → anillo gris y "Sin gastos"
export function FlowLineChart(props: { series: { date: IsoDate; balanceMinor: number }[]; thresholdMinor: number | null; thresholdLabel: string | null; hidden: boolean }): JSX.Element; // curva primary 3 px con degradado 22 %→0 %, 2 líneas de grilla, umbral discontinuo danger con pill, punto de hoy, 5 fechas
export function SummaryCard(props: { view: HomeView; currencyBlocks…; hidden: boolean; onToggleHidden(): void; projectionOn: boolean; onToggleProjection(v: boolean): void; onOpenScope(): void }): JSX.Element;
export function ScopeSheet(props: { visible: boolean; wallets: WalletRecord[]; scope: Scope; onSelect(scope: Scope): void; onToggleInclude(walletId: string, include: boolean): void; onClose(): void }): JSX.Element;
export function ThresholdSheet(props: { visible: boolean; currency: Currency; currentMinor: number | null; scopeLabel: string; onSave(amountText: string): Promise<string | null>; onClear(): Promise<void>; onClose(): void }): JSX.Element; // onSave devuelve un mensaje de error o null
export function ExpensesCard(props: { monthLabel: string; slices: …; currency: Currency; hidden: boolean }): JSX.Element;
export function FlowCard(props: { netChangeMinor: number; currency: Currency; series: …; thresholdMinor: number | null; hidden: boolean; onOpenThreshold(): void }): JSX.Element;
```

Comportamiento: `SummaryCard` (bloque de `DESIGN_SYSTEM.md` §10.1) muestra el `FilterChip` con el alcance, el ojo (`visibility`/`visibility_off`, etiqueta "Mostrar montos"/"Ocultar montos"), Disponible, Gastado y Restante (el restante en `danger` si `belowThreshold`), la segunda línea en `$` si hay USD, y "Ver proyectado" con `Switch` solo en Saldo general (cuando está activo muestra "Proyectado a fin de mes"). `ScopeSheet`: "Saldo general" con casillas de billeteras (marcar/desmarcar llama a `onToggleInclude`) y las billeteras individuales; elegir una cierra. Con `hidden` todo monto se muestra como `****` y las etiquetas de accesibilidad no contienen cifras.

- [ ] **Paso 1: Pruebas que fallan** (RNTL; `react-native-svg` bajo Jest): `DonutChart` con 3 porciones dibuja 3 arcos con los colores dados, el seleccionado tiene mayor `strokeWidth`, el centro muestra etiqueta y valor; sin porciones muestra "Sin gastos" y ningún arco; `FlowLineChart` dibuja la curva y el área, la línea de umbral solo si hay umbral y su etiqueta "Límite: S/ 300.00"; con `hidden` la etiqueta de umbral es "Límite: ****"; serie vacía muestra "Sin movimientos"; `SummaryCard` muestra Disponible/Gastado/Restante con `S/ 1,210.00`, `S/ 155.30`, `S/ 1,054.70`; con `hidden` esas tres cifras son `****` y ningún texto ni etiqueta de accesibilidad contiene dígitos de dinero; el ojo cambia su etiqueta y llama a `onToggleHidden`; la segunda línea en `$` solo con USD; el switch de proyección solo aparece en Saldo general y llama a `onToggleProjection`; restante bajo el umbral en rojo; `ScopeSheet` marca "Saldo general" o la billetera actual, alterna las casillas llamando a `onToggleInclude(id, bool)` y elegir una billetera llama a `onSelect(id)` y cierra; `ThresholdSheet`: "24,50" muestra el error devuelto por `onSave` y no cierra, un monto válido cierra, "Quitar umbral" llama a `onClear`.
- [ ] **Paso 2:** ejecutar → FALLA; implementar.
- [ ] **Paso 3:** `npm test`, `typecheck`, `lint`. **Commit:** `feat(inicio): componentes de resumen, dona y flujo`.

### Task 4: Pantalla Inicio

**Archivos:**
- Crear: `src/features/inicio/InicioScreen.tsx`, `src/features/inicio/InicioScreen.test.tsx`
- Modificar: `src/app/(tabs)/index.tsx`, `src/test-utils/fakeRepositories.ts` (settings, periods y umbrales falsos), `src/ui/navigation.test.tsx`

**Interfaces:**
- Consume: `useQuery`, repositorios (`ledger.state`, `wallets.listWallets/listCards/setIncludeInGeneral`, `categories.list`, `periods.activeRange`, `settings.getDevice/setDevice/listThresholds/setThreshold/clearThreshold`), `buildHomeView`, componentes (Tarea 3), `parseAmountInput`.
- Produce: `InicioScreen({ today? })`. Estructura: saludo "Hola!" (sin título de pantalla), `SummaryCard`, `ExpensesCard`, `FlowCard`; selector "S/ | $" cuando hay dos monedas (por defecto PEN); estado de carga; **primer uso**: tarjeta "Crea tu primera billetera" con botón que lleva a Billeteras; un error de lectura muestra un aviso, no una pantalla en blanco. Ojo, alcance y proyección se guardan con `settings.setDevice`; el umbral con `settings.setThreshold`/`clearThreshold`.

- [ ] **Paso 1: Pruebas que fallan** (repositorios falsos; escenario con `yape` y `plin`, hoy 2026-11-20): muestra "Hola!" sin título superior; con Saldo general muestra `S/ 1,210.00` (disponible), `S/ 155.30` (gastado) y `S/ 1,054.70` (restante); el ojo oculta **todas** las cifras de Inicio (resumen, total de la dona, leyenda, etiqueta del umbral) y ninguna etiqueta de accesibilidad contiene cifras de dinero (punto de atención 1), llama a `setDevice({ hideAmounts: true })` y al volver a tocarlo las muestra; elegir la billetera "Plin" en el selector cambia resumen, dona y flujo a la vez y guarda `homeScope` (punto de atención 2); desmarcar "Yape" en las casillas de Saldo general baja el restante y llama a `setIncludeInGeneral`; con una billetera en soles y otra con USD aparecen las dos líneas en el resumen y el selector "S/ | $" cambia la dona y el flujo de moneda sin mezclarlas; con una billetera de una sola moneda no hay selector de moneda; "Ver proyectado" solo existe en Saldo general, y al activarlo muestra el proyectado y guarda `showProjection`; sin gastos en el periodo la dona muestra "Sin gastos" (punto de atención 3); con un umbral de 300 y un restante menor, el restante se muestra en rojo; tocar el título "Flujo del mes" abre "Umbral de aviso", guardar "300" llama a `setThreshold({ currency: 'PEN', amountMinor: 30000, … })` y aparece "Límite: S/ 300.00"; sin billeteras muestra "Crea tu primera billetera" y el botón navega a `/billeteras` (punto de atención 5); una lectura que falla muestra el aviso de error; los ajustes guardados (`hideAmounts`, `homeScope`) se aplican al abrir.
- [ ] **Paso 2:** ejecutar → FALLA; implementar; actualizar la prueba de navegación (Inicio con repositorios falsos: sigue mostrando "Hola!" y sin título "Inicio").
- [ ] **Paso 3:** `npm test`, `typecheck`, `lint`; `npx expo export --platform android --output-dir <carpeta temporal>` (sin dejar archivos en el repositorio). **Commit:** `feat(inicio): pantalla de Inicio con resumen, dona y flujo`.

### Task 5: Cierre y verificación del usuario

**Archivos:**
- Modificar: `docs/progress/*`, `docs/DEVELOPMENT_ROADMAP.md`, `docs/DESIGN_SYSTEM.md` (§8: marcar resueltos 14, 15, 16 en lo que corresponda)

- [ ] **Paso 1:** pasar al usuario la lista de comprobación: **recompilar el development build** (`npx expo run:android --no-bundler`, por `react-native-svg`); abrir Inicio con datos de prueba; resumen con Disponible/Gastado/Restante; selector de billetera y Saldo general con casillas; ojo; proyección; dona (tocar filas de la leyenda); flujo con "Límite"; fijar y quitar el umbral; primer uso en una instalación limpia (si se quiere probar).
- [ ] **Paso 2:** registrar las diferencias con Stitch que reporte y las decisiones 1–7 en `DECISIONS.md` según su respuesta.
- [ ] **Paso 3:** actualizar `CURRENT_STATUS.md` (9 secciones), `COMPLETED_TASKS.md`, `PENDING_TASKS.md` y `DEVELOPMENT_ROADMAP.md` (Fase 7C y Fase 7 completa). **Commit:** `docs: cierre de la Fase 7C`.

---

## Al terminar el plan
- La Fase 7 queda completa. Siguiente: **Fase 8** (periodos: sugerencia, confirmación y descarte), luego Fase 9 (Supabase y sincronización) y Fase 10 (tarjetas y deudas).
