# Fase 7A — Datos en vivo, Categorías y Billeteras: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que las pantallas Categorías y Billeteras (con detalle de billetera y arreglo de saldo) funcionen con datos reales de la base local y se actualicen solas al escribir.

**Arquitectura:**
- Un notificador de cambios en la capa de datos avisa cuando un repositorio escribe; un hook `useQuery` vuelve a leer al recibir el aviso. Es TypeScript/React puro (probable en Jest) y en el arranque se alimenta también con `db.onChange` de PowerSync.
- Las pantallas viven en `src/features/<área>/` (hook de pantalla + presentador puro + componentes); los archivos de `src/app/` solo montan la feature.
- Los saldos se calculan con el dominio (`accountBalance`) sobre el `LedgerState` que expone un repositorio de lectura; la UI nunca consulta SQL.

**Tech Stack:** Expo Router, React Native, `expo-symbols`, `@testing-library/react-native`, repositorios de `src/data/`, dominio de `src/domain/`.

**Spec:** `docs/DESIGN_SYSTEM.md` (§4, §6.4, §6.5, §10.2, §10.5), `docs/FINANCIAL_RULES.md` (§2, §3, §11), `docs/DATABASE_SCHEMA.md`, `docs/ARCHITECTURE.md`.

## División de la Fase 7
La Fase 7 del roadmap son cinco pantallas; para que cada plan entregue software que se pueda probar solo, se divide en:
- **7A (este plan):** datos en vivo + componentes de lista/formulario + **Categorías** + **Billeteras** (tarjetas con saldos, ocultas, deudas y bancos solo lectura, detalle de billetera, arreglo de saldo).
- **7B:** **Registrar movimiento** (Gasto | Ingreso | Transferencia, selector de fecha, "Préstamo" con deuda) + **Historial** (filtros, editar/eliminar). Aquí se completa el botón "Transferir" del detalle de billetera.
- **7C:** **Inicio** (resumen, selector de alcance con casillas, ojo, proyección, dona y gráfico de flujo con `react-native-svg`).
Crear tarjetas y deudas queda para la Fase 10 y para "+ Nueva deuda" de 7B.

## Decisiones de este plan (confirmar o corregir)
1. **Notificador propio en lugar de `@powersync/react`:** los paquetes `@powersync/*` no cargan bajo Jest (ESM), así que sus hooks no serían probables. El notificador se prueba con SQLite real; el proveedor lo conecta además a `db.onChange` para cuando la sincronización cambie datos desde fuera (Fase 9).
2. **Formularios en hojas inferiores (`Modal`)**, no en rutas nuevas; el **detalle de billetera sí es una ruta** (`/billetera/[id]`, fuera de las pestañas, con botón de volver).
3. **Paleta fija de 10 colores y 24 íconos** para categorías y billeteras (sin selector libre): colores de los ejemplos de Stitch; íconos de Material Symbols ya validados.
4. **El botón "Transferir"** del detalle navega a `/registrar?tipo=transferencia&desde=<cuenta>`; funciona de punta a punta cuando llegue 7B (en 7A abre Registrar, que aún es un esqueleto).
5. **Deudas y bancos en Billeteras:** solo lectura (listas y saldos pendientes derivados); su creación llega con 7B/Fase 10.
6. **Formularios y hojas sin diseño en Stitch** (`DESIGN_SYSTEM.md` §8): se construyen con los componentes existentes, sin estilos nuevos.

## Restricciones globales
- Idioma: textos visibles, comentarios y documentación en español; nombres técnicos en inglés.
- **Nunca commit sin autorización explícita; push requiere otra aparte.** Este plan tiene autorizado el commit local al cerrar cada tarea (instrucción vigente); nada de `push`. No crear ni cambiar ramas.
- Instalar con `npx expo install`; verificar APIs con Context7. No agregar `expo-sqlite`.
- Stitch es la fuente de verdad visual: tokens y componentes de `DESIGN_SYSTEM.md`; no rediseñar.
- Dinero siempre con `formatMoney`/`AmountText` y `parseAmountInput` del dominio; nunca flotantes; nunca sumar monedas distintas (cada moneda se muestra aparte).
- Las features acceden a los datos solo por repositorios (`useRepositories`); los cálculos van en el dominio o en presentadores puros.
- **Prohibido tomar capturas con `adb screencap` o reiniciar el emulador desde el agente**; la verificación visual la hace el usuario. Un solo Metro a la vez (puerto 8081) y detenerlo al terminar.
- Al terminar cada tarea: `npm test`, `npm run typecheck`, `npx expo lint` en verde.

## Review Focus
1. **Pantalla desactualizada tras escribir:** crear, editar o eliminar una categoría/billetera actualiza la lista sin recargar (Tareas 1, 3, 4).
2. **Doble toque en "Guardar":** se crea un solo registro (el botón se deshabilita mientras guarda) (Tarea 3).
3. **Monto con coma decimal** ("24,50") en apertura o arreglo: muestra el error claro de monto, nunca guarda S/ 2,450 (Tareas 4 y 5).
4. **Arreglo con saldo declarado 0** es válido (billetera vaciada); negativo se rechaza (Tarea 5).
5. **Eliminar una categoría con movimientos** pide confirmación indicando cuántos pasarán a "Otros" y no ofrece borrar "Otros"/"Préstamo" (Tarea 3).

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/data/changes.ts` | `createChangeNotifier()`: `subscribe`, `notify` |
| `src/data/repositories/ledger.ts` | Lectura del `LedgerState` y de movimientos por cuenta |
| `src/data/index.ts` (mod.) | Repositorio `ledger`, notificador y notificación tras cada escritura |
| `src/data/RepositoriesProvider.tsx` (mod.) | Expone el notificador y lo conecta a `db.onChange` |
| `src/data/useQuery.ts` | `useQuery(fn, deps)`: lee, se actualiza al notificar, ignora respuestas viejas |
| `src/domain/money/money.ts` (mod.) | `parseBalanceInput` (≥ 0) |
| `src/ui/` (nuevos) | `GroupedList`, `ListRow`, `HeaderIconButton`, `PrimaryButton`, `TextField`, `SwatchPicker`, `IconPicker`, `BottomSheet`, `ConfirmDialog` |
| `src/features/categorias/*` | Pantalla, formulario y presentador de Categorías |
| `src/features/billeteras/*` | Pantalla, tarjetas, formularios, detalle y presentador de Billeteras |
| `src/app/(tabs)/categorias.tsx`, `billeteras.tsx` (mod.), `src/app/billetera/[id].tsx` (nuevo) | Rutas delgadas |

Las pruebas van junto a cada archivo (`*.test.ts(x)`).

---

### Task 1: Datos en vivo (notificador, repositorio de lectura y `useQuery`)

**Archivos:**
- Crear: `src/data/changes.ts`, `src/data/changes.test.ts`, `src/data/repositories/ledger.ts`, `src/data/repositories/ledger.test.ts`, `src/data/useQuery.ts`, `src/data/useQuery.test.tsx`
- Modificar: `src/data/index.ts`, `src/data/index.test.ts`, `src/data/RepositoriesProvider.tsx`

**Interfaces:**
- Produce:

```ts
export interface ChangeNotifier { subscribe(listener: () => void): () => void; notify(): void }
export function createChangeNotifier(): ChangeNotifier;
export function createLedgerRepository(db: LocalDb): { state(): Promise<LedgerState> };
export function useQuery<T>(fn: (repos: Repositories) => Promise<T>, deps?: unknown[]): { data: T | undefined; loading: boolean; error: Error | null; reload(): void };
// createRepositories(db, deps) → { ..., ledger, changes: ChangeNotifier }; repos de escritura llaman changes.notify() al terminar cada escritura
```

Escrituras que notifican (lista explícita en `createRepositories`): `categories.{create,update,remove}`, `wallets.{createWallet,setHidden,setIncludeInGeneral,createCard,setCardHidden}`, `debts.{create,update}`, `movements.{create,update,remove,adjustWallet}`, `periods.{confirm,dismiss}`, `settings.{setDevice,setThreshold,clearThreshold}`. Las lecturas nunca notifican (evita bucles). Notifica tanto si la escritura tuvo éxito como si devolvió un error de dominio (no hace daño y simplifica).

- [ ] **Paso 1: Pruebas que fallan:**
  - `changes.test.ts`: `notify` llama a todos los oyentes suscritos; el que se dio de baja con la función devuelta no se llama; un oyente que lanza no impide avisar a los demás.
  - `ledger.test.ts` (SQLite real, entorno node): `state()` devuelve cuentas, categorías, deudas y movimientos tras crear una billetera con apertura 50000 (usa `createWalletRepository`).
  - `index.test.ts`: una escritura (`categories.create`) llama al notificador una vez; `categories.list()` no lo llama; una escritura rechazada por validación también notifica una vez.
  - `useQuery.test.tsx` (RNTL, repositorios falsos + notificador real): al montar `loading: true` y luego `data` con el valor; tras `notify()` vuelve a leer y entrega el dato nuevo; si la primera lectura tarda más que la segunda, **gana la más reciente** (se ignora la vieja); un error en `fn` queda en `error` y `data` conserva el último valor bueno; al desmontar se da de baja (un `notify()` posterior no vuelve a llamar a `fn`); `reload()` fuerza una lectura.
- [ ] **Paso 2:** ejecutar → FALLA; implementar. `useQuery` usa un contador de peticiones para descartar respuestas viejas y `useRepositories()` para obtener los repositorios y el notificador.
- [ ] **Paso 3:** en `RepositoriesProvider`, tras abrir la base, suscribir `db.onChange({ onChange: () => changes.notify() }, { tables: [...] })` (verificar la firma exacta con Context7) y darlo de baja al desmontar; exponer `changes` por contexto.
- [ ] **Paso 4:** `npm test`, `typecheck`, `lint`. **Commit:** `feat(data): datos en vivo con notificador y useQuery`.

### Task 2: Componentes de lista y formulario

**Archivos:**
- Crear en `src/ui/`: `GroupedList.tsx`, `ListRow.tsx`, `HeaderIconButton.tsx`, `PrimaryButton.tsx`, `TextField.tsx`, `SwatchPicker.tsx`, `IconPicker.tsx`, `BottomSheet.tsx`, `ConfirmDialog.tsx`, `palette.ts` y sus `*.test.tsx`
- Modificar: `src/ui/Icon.tsx` (ampliar `IconName`), `src/ui/Icon.test.tsx`

**Interfaces:**
- Consume: tokens, `GlassCard`, `IconCircle`, `Icon`, `AppText`, `AmountText` (Fase 6).
- Produce:

```ts
export const CATEGORY_COLORS: readonly string[]; // 10 hex: '#1C9C4D','#F59E0B','#3B82F6','#AF52DE','#E5484D','#06B6D4','#EC4899','#6B7280','#84CC16','#F97316'
export const CATEGORY_ICONS: readonly IconName[]; // 24 íconos (los de Stitch + shopping_cart, school, medical_services, pets, flight, sports_esports, local_cafe, savings…)
export function GroupedList(props: { children: ReactNode }): JSX.Element;               // GlassCard con filas separadas por outlineSubtle
export function ListRow(props: { icon?: IconName; iconColor?: string; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; testID?: string }): JSX.Element;
export function HeaderIconButton(props: { icon: IconName; label: string; onPress: () => void }): JSX.Element; // 40 px, glassSm, accessibilityLabel = label
export function PrimaryButton(props: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }): JSX.Element; // píldora primary; disabled = no dispara onPress
export function TextField(props: { label: string; value: string; onChangeText: (t: string) => void; error?: string | null; keyboardType?: 'default' | 'decimal-pad'; prefix?: string; placeholder?: string }): JSX.Element;
export function SwatchPicker(props: { colors: readonly string[]; value: string; onChange: (hex: string) => void }): JSX.Element; // cada muestra con accessibilityLabel "Color #1C9C4D" y estado selected
export function IconPicker(props: { icons: readonly IconName[]; value: IconName; color: string; onChange: (i: IconName) => void }): JSX.Element;
export function BottomSheet(props: { visible: boolean; title: string; onClose: () => void; children: ReactNode }): JSX.Element;
export function ConfirmDialog(props: { visible: boolean; title: string; message: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void }): JSX.Element;
```

- [ ] **Paso 1: Verificar nombres de íconos:** comprobar contra `expo-symbols/build/android/symbols.json` que existen los íconos nuevos de `CATEGORY_ICONS` (`visibility`, `visibility_off`, `swap_horiz`, `tune`, `handshake` también, usados en 7B/7C); quitar o sustituir los que no existan y ampliar `IconName` solo con los verificados.
- [ ] **Paso 2: Pruebas que fallan** (RNTL): `ListRow` con `onPress` es un botón con `accessibilityLabel` = título y dispara el handler; sin `onPress` no es botón; `GroupedList` con 3 filas dibuja 2 separadores; `PrimaryButton` con `disabled` o `loading` no llama a `onPress`; `TextField` muestra la etiqueta, el error en `danger` y el prefijo, y reenvía `onChangeText`; `SwatchPicker` marca solo el color elegido (`selected`) y llama a `onChange` con el hex tocado; `IconPicker` igual con íconos; `BottomSheet` con `visible=false` no dibuja nada y con `true` muestra el título y llama a `onClose` al tocar el fondo; `ConfirmDialog` muestra mensaje y los dos botones, `destructive` pinta el confirmar en `danger`; `CATEGORY_COLORS` tiene 10 hex válidos únicos y `CATEGORY_ICONS` 24 nombres únicos.
- [ ] **Paso 3:** ejecutar → FALLA; implementar con los tokens (sin estilos nuevos).
- [ ] **Paso 4:** `npm test`, `typecheck`, `lint`. **Commit:** `feat(ui): componentes de lista, formulario y hojas`.

### Task 3: Pantalla de Categorías

**Archivos:**
- Crear: `src/features/categorias/CategoriasScreen.tsx`, `CategoryForm.tsx`, `presenter.ts`, `presenter.test.ts`, `CategoriasScreen.test.tsx`
- Modificar: `src/app/(tabs)/categorias.tsx`

**Interfaces:**
- Consume: `useQuery`, `useRepositories` (`categories`, `movements`), componentes de la Tarea 2, `CATEGORY_COLORS`, `CATEGORY_ICONS`.
- Produce (`presenter.ts`): `describeCategory(c: CategoryRecord): { title: string; kindLabel: 'Gasto' | 'Ingreso'; kindColor: string; canDelete: boolean }` (`canDelete` falso si `systemKey` no es null) y `deleteMessage(name: string, movementCount: number): string` (singular/plural: "1 movimiento pasará a «Otros»" / "3 movimientos pasarán a «Otros»"; con 0 dice que no hay movimientos).

Comportamiento: título "Categorías" + `HeaderIconButton` "Agregar categoría"; una sola lista agrupada con gasto e ingreso mezclados; cada fila: `IconCircle` con el color de la categoría, nombre, tipo ("Gasto" `danger` / "Ingreso" `primary`) y botones editar/eliminar (sin eliminar en las de sistema). El formulario (hoja inferior) pide nombre, tipo (solo al crear), color e ícono; "Guardar" se deshabilita mientras guarda; los errores de la capa de datos (`CATEGORY_DUPLICATE`, `INPUT_INVALID`…) se muestran en el campo o bajo el botón.

- [ ] **Paso 1: Pruebas que fallan:**
  - `presenter.test.ts`: `describeCategory` para "Comida" (gasto) → `{ kindLabel: 'Gasto', kindColor: '#E5484D', canDelete: true }`; para "Préstamo" (sistema) → `canDelete: false`; `deleteMessage('Comida', 1)` y `('Comida', 3)` y `0` con los textos exactos del comportamiento.
  - `CategoriasScreen.test.tsx` (RNTL con repositorios reales sobre SQLite no es posible en este entorno; usar repositorios falsos en memoria con notificador real): lista las 6 categorías sembradas; "Otros" y "Préstamo" no muestran el botón eliminar; crear "Comida" desde el formulario la agrega a la lista **sin recargar** (punto de atención 1); un nombre repetido muestra "Ya existe una categoría llamada «Comida»."; **doble toque** en "Guardar" llama una sola vez a `create` (punto de atención 2); eliminar una categoría con 2 movimientos abre el diálogo "2 movimientos pasarán a «Otros»", cancelar no borra, confirmar llama a `remove` y la fila desaparece (punto de atención 5); editar cambia nombre y color y se refleja.
- [ ] **Paso 2:** ejecutar → FALLA; implementar. `CategoriasScreen` usa `useQuery(r => r.categories.list())`; para el conteo al eliminar, `movements.list({ categoryId })`.
- [ ] **Paso 3:** `npm test`, `typecheck`, `lint`. **Commit:** `feat(categorias): pantalla de categorías con crear, editar y eliminar`.

### Task 4: Pantalla de Billeteras

**Archivos:**
- Crear: `src/features/billeteras/presenter.ts`, `presenter.test.ts`, `BilleterasScreen.tsx`, `WalletCard.tsx`, `WalletForm.tsx`, `BilleterasScreen.test.tsx`
- Modificar: `src/app/(tabs)/billeteras.tsx`, `src/domain/money/money.ts`, `src/domain/money/money.test.ts` (solo si hace falta; ver Tarea 5)

**Interfaces:**
- Consume: `useQuery`, repositorios `wallets`, `debts`, `ledger`; `accountBalance`, `debtPending` (dominio); `AmountText`; componentes de la Tarea 2.
- Produce (`presenter.ts`, puro):

```ts
export type WalletBalances = Partial<Record<Currency, number>>;
export function walletBalances(state: LedgerState, wallet: WalletRecord): WalletBalances;               // saldo por moneda de las cuentas de la billetera
export function cardSummary(state: LedgerState, card: CardRecord): { consumedMinor: number; availableMinor: number; creditLimitMinor: number; currency: Currency };
export function groupDebts(debts: (DebtRecord & { pendingMinor: number; status: 'pending' | 'paid' })[]): { receivable: typeof debts; payablePersons: typeof debts; payableInstitutions: typeof debts }; // solo pendientes
export function splitWallets(wallets: WalletRecord[]): { visible: WalletRecord[]; hidden: WalletRecord[] };
```

Comportamiento: grilla de 2 columnas con `WalletCard` (ícono, etiqueta de tipo "Principal"/"Digital"…, nombre y **saldo por moneda en líneas separadas**) + `AddWalletCard`; tocar una tarjeta abre `/billetera/<id>`. Sección **Deudas personales** ("Me deben" con paleta `primary` y "Debo" con `danger`, con `CountBadge` "N pendientes"), sección **Deudas con bancos** (tarjetas con consumido/disponible y deudas con instituciones, "Por pagar"), y al final **Billeteras ocultas** plegable. Formulario de nueva billetera (hoja): nombre, tipo, color, ícono, monedas (PEN/USD) y saldo inicial opcional por moneda con `TextField` decimal.

- [ ] **Paso 1: Pruebas que fallan:**
  - `presenter.test.ts`: billetera con cuentas PEN (apertura 50000, gasto 2450) y USD (apertura 10000) → `{ PEN: 47550, USD: 10000 }`; billetera sin movimientos → `{ PEN: 0 }`; una transferencia de 10000 a otra billetera descuenta en la de origen y suma en la de destino; `cardSummary` con apertura de consumo 30000 y línea 200000 → consumido 30000, disponible 170000; `groupDebts` separa "Me deben", "Debo" con persona y "Debo" con institución y omite las pagadas; `splitWallets` pone las ocultas aparte conservando el orden.
  - `BilleterasScreen.test.tsx` (repositorios falsos + notificador): muestra cada saldo con su símbolo (`S/ 475.50` y `$ 100.00` en líneas distintas); una billetera oculta no está en la grilla y sí bajo "Billeteras ocultas" al desplegar; crear "Yape" con PEN y apertura "500" muestra la tarjeta nueva con `S/ 500.00` **sin recargar**; apertura "24,50" muestra el error de monto y **no** llama a `createWallet` (punto de atención 3); doble toque en guardar crea una sola billetera; tocar una tarjeta navega a `/billetera/<id>`.
- [ ] **Paso 2:** ejecutar → FALLA; implementar (el formulario convierte cada apertura con `parseAmountInput` y pasa las aperturas en céntimos a `createWallet`).
- [ ] **Paso 3:** `npm test`, `typecheck`, `lint`. **Commit:** `feat(billeteras): pantalla de billeteras, deudas y tarjetas`.

### Task 5: Detalle de billetera y arreglo de saldo

**Archivos:**
- Crear: `src/app/billetera/[id].tsx`, `src/features/billeteras/WalletDetailScreen.tsx`, `AdjustForm.tsx`, `WalletDetailScreen.test.tsx`, `adjust.ts`, `adjust.test.ts`
- Modificar: `src/domain/money/money.ts`, `src/domain/money/money.test.ts`, `src/app/_layout.tsx` (declarar la ruta sin cabecera si hace falta)

**Interfaces:**
- Consume: `useQuery`, repositorios `wallets`, `movements` (`list({ accountId })`, `adjustWallet`), `ledger`; presentador de la Tarea 4; `HeaderIconButton`, `BottomSheet`, `ConfirmDialog`.
- Produce:

```ts
// money.ts (dominio)
export function parseBalanceInput(text: string): Result<number>; // como parseAmountInput pero acepta 0; AMOUNT_INVALID para negativos, decimales de más, comas mal puestas
// adjust.ts (presentador puro)
export function adjustPreview(currentMinor: number, declaredMinor: number): { differenceMinor: number; direction: 'up' | 'down' | 'none' };
```

Comportamiento: ruta `/billetera/[id]` con botón de volver; muestra saldos por moneda, historial filtrado por las cuentas de la billetera (filas con descripción y `AmountText`; sin hora), y botones **"Arreglo de billetera"**, **"Transferir"** (navega a `/registrar?tipo=transferencia&desde=<id de cuenta>`, decisión 4) y **"Ocultar billetera"/"Mostrar billetera"** (con confirmación al ocultar). El arreglo (hoja) tiene una pestaña por moneda si hay dos, muestra saldo calculado, campo "Saldo real", la diferencia (+/−) con `AmountText` y la fecha de hoy; al guardar llama a `movements.adjustWallet`; si el repositorio devuelve `TIMELINE_VIOLATION` se muestra su mensaje en español y no se cierra la hoja.

- [ ] **Paso 1: Pruebas que fallan:**
  - `money.test.ts`: `parseBalanceInput('0')` → ok 0; `'37550.5'` → 3755050; `'1,840.50'` → 184050; `'-1'`, `'24,50'`, `'abc'`, `''`, `'1.005'` → `AMOUNT_INVALID` (puntos de atención 3 y 4).
  - `adjust.test.ts`: `adjustPreview(37550, 30000)` → `{ differenceMinor: -7550, direction: 'down' }`; `(37550, 40000)` → `+2450 'up'`; `(37550, 37550)` → `0 'none'`; `(37550, 0)` → `-37550 'down'`.
  - `WalletDetailScreen.test.tsx` (repositorios falsos): muestra los saldos y solo los movimientos de esa billetera; "Arreglo de billetera" con saldo real "300" sobre 375.50 muestra la diferencia "- S/ 75.50" y al guardar llama a `adjustWallet` con `declaredMinor: 30000`; declarar "0" es aceptado; "-5" y "24,50" muestran el error de monto sin llamar al repositorio; un `TIMELINE_VIOLATION` simulado muestra el mensaje y la hoja sigue abierta; "Ocultar billetera" pide confirmación, al confirmar llama a `setHidden(id, true)` y el botón pasa a "Mostrar billetera"; "Transferir" navega a `/registrar` con `tipo=transferencia` y `desde`.
- [ ] **Paso 2:** ejecutar → FALLA; implementar (`parseBalanceInput` reutiliza la validación de `parseAmountInput` cambiando solo la regla de "mayor a 0" por "≥ 0").
- [ ] **Paso 3:** `npm test`, `typecheck`, `lint`; comprobar que Metro empaqueta (`curl` al bundle responde 200) y detenerlo. **Commit:** `feat(billeteras): detalle de billetera y arreglo de saldo`.

### Task 6: Cierre y verificación del usuario

**Archivos:**
- Modificar: `docs/progress/*`, `docs/DEVELOPMENT_ROADMAP.md`, `docs/DESIGN_SYSTEM.md` (§8: marcar como resueltos los elementos 5 parcial, 6, 7)

- [ ] **Paso 1:** pasar al usuario la lista de comprobación visual (sin capturas del agente): crear/editar/eliminar categorías y ver el aviso con el conteo; "Otros" y "Préstamo" sin botón de eliminar; crear una billetera "Yape" con PEN y USD y saldos iniciales y verla en la grilla; abrir el detalle, hacer un arreglo y ver el saldo cambiar; ocultar y mostrar una billetera; que la app conserve los datos al cerrarla y reabrirla (la base real de PowerSync).
- [ ] **Paso 2:** registrar en `PENDING_TASKS.md` las diferencias con Stitch que el usuario reporte y las decisiones 1–6 en `DECISIONS.md` según su respuesta.
- [ ] **Paso 3:** actualizar `CURRENT_STATUS.md` (9 secciones), `COMPLETED_TASKS.md`, `PENDING_TASKS.md` y `DEVELOPMENT_ROADMAP.md` (Fase 7A). **Commit:** `docs: cierre de la Fase 7A`.

---

## Al terminar el plan
- Siguiente plan: **7B** (Registrar movimiento y Historial), luego **7C** (Inicio con gráficos). 7B completará el botón "Transferir" y la creación de deudas desde "Préstamo".
