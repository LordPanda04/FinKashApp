# Fase 7B — Registrar movimiento e Historial: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** poder registrar gastos, ingresos y transferencias (con fecha, categoría, billetera o tarjeta y préstamos con deuda), verlos agrupados por día en el Historial con filtros, y editarlos o eliminarlos con la validación de saldo en el tiempo.

**Arquitectura:**
- Un formulario único (`MovementForm`) se usa para crear (pestaña Registrar) y para editar (ruta `/movimiento/[id]`); su lógica de armado y validación vive en un presentador puro (`buildMovementDraft`).
- Toda escritura pasa por `movements.create/update/remove`, que ya validan con `checkChange`; los errores de saldo se muestran en un aviso de vidrio con el día y el monto faltante.
- El Historial lee el libro (`ledger.state`), categorías y billeteras, y agrupa, describe y filtra en presentadores puros; los filtros se aplican en memoria.

**Tech Stack:** Expo Router, React Native, `expo-symbols`, `@testing-library/react-native`, repositorios de `src/data/`, dominio de `src/domain/`.

**Spec:** `docs/DESIGN_SYSTEM.md` (§4, §6.2, §6.3, §10.3, §10.4), `docs/FINANCIAL_RULES.md` (§4–§7, §11), `docs/DATABASE_SCHEMA.md`, y los planes 7A y de la Fase 5 (repositorios ya implementados).

## Alcance
- **Entra:** Registrar (Gasto | Ingreso | Transferencia, selector de fecha, "Préstamo" con deuda existente o nueva) e Historial (grupos por día, filtros, modo de edición, editar y eliminar).
- **No entra:** pago de tarjeta (`card_payment`) y creación de tarjetas o deudas fuera de "+ Nueva deuda" (Fase 10; el Historial sí muestra los pagos de tarjeta que existan); Inicio y gráficos (7C).

## Decisiones de este plan (confirmar o corregir)
1. **Editar = ruta aparte** `/movimiento/[id]` (pantalla con el mismo formulario), no una hoja: evita hojas dentro de hojas.
2. **Calendario propio** (cuadrícula de mes, lunes primero, textos en español), sin dependencias nuevas.
3. **"Editar historial" (el lápiz):** activa un modo de edición donde cada fila muestra "Editar" y "Eliminar"; fuera de ese modo, tocar una fila no hace nada (decisión sobre lo que Stitch no define, `DESIGN_SYSTEM.md` §8 punto 8).
4. **Contenido de los filtros** (`DESIGN_SYSTEM.md` §8 punto 9): **Fecha** = Este mes · Mes pasado · Últimos 7 días · Todo (por defecto: Este mes); **Categoría** y **Billetera** = selección múltiple; se aplican en memoria.
5. **"+ Nueva deuda" atómica:** crear la deuda y su primer movimiento ocurre en una sola transacción (`movements.createWithNewDebt`); si el movimiento se rechaza, no queda una deuda huérfana. Dirección según `FINANCIAL_RULES.md` §7: Gasto·Préstamo nueva → "Me deben"; Ingreso·Préstamo nueva → "Debo".
6. **Fechas del Historial:** "Hoy", "Ayer", "14 Nov" y, si es de otro año, "14 Nov 2026".
7. **Registrar y sus selectores sin diseño en Stitch** (`DESIGN_SYSTEM.md` §8): se construyen con los componentes existentes, sin estilos nuevos.

## Restricciones globales
- Idioma: textos visibles, comentarios y documentación en español; nombres técnicos en inglés.
- **Nunca commit sin autorización explícita; push requiere otra aparte.** Este plan tiene autorizado el commit local al cerrar cada tarea (instrucción vigente); nada de `push`. No crear ni cambiar ramas.
- Instalar con `npx expo install`; verificar APIs con Context7. No agregar `expo-sqlite`.
- Stitch es la fuente de verdad visual; tokens y componentes de `DESIGN_SYSTEM.md`.
- Dinero con `parseAmountInput`/`formatMoney`/`AmountText`; nunca flotantes; nunca mezclar monedas (la moneda del movimiento es la de la cuenta elegida; no hay selector de moneda).
- Solo fecha (sin hora), zona Lima: "hoy" sale de `todayInLima(new Date())`.
- Las features acceden a datos solo por repositorios; la lógica va en presentadores puros o en el dominio.
- **Prohibido tomar capturas con `adb screencap` o reiniciar el emulador desde el agente**; la verificación visual la hace el usuario. Un solo Metro (8081): no detener uno que no inició el agente; si el puerto está ocupado, reutilizarlo para comprobar el bundle.
- Al terminar cada tarea: `npm test`, `npm run typecheck`, `npx expo lint` en verde.

## Review Focus
1. **Gasto que deja la billetera en negativo:** se bloquea, el aviso dice el día y el monto faltante y sugiere registrar antes un ingreso "Otros"; no se guarda nada (Tareas 3 y 5).
2. **Doble toque en "Guardar":** un solo movimiento (Tarea 3).
3. **Monto con coma decimal** ("24,50") o 0: error claro, nunca guarda S/ 2,450 (Tarea 3).
4. **Cambiar de cuenta cambia la moneda:** el prefijo cambia ("S/" ↔ "$") y en Transferencia "Hacia" se limpia si deja de ser de la misma moneda (Tarea 3).
5. **Deuda nueva + movimiento rechazado:** no queda la deuda creada (Tarea 1); y un pago de "Préstamo" mayor al pendiente muestra el error de deuda en negativo (Tareas 1 y 3).

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/dates.ts` (mod.) | `formatDayLabel`, `monthRange`, `addMonths`, `weekdayMonFirst` |
| `src/data/repositories/movements.ts` (mod.) | `get(id)` y `createWithNewDebt(draft, debt)` |
| `src/ui/` (nuevos) | `SegmentedControl`, `FormRow`, `Switch`, `AmountInput`, `FilterChip`, `WalletBadge`, `Calendar`, `SelectorSheet`, `NoticeCard` |
| `src/features/movimientos/presenter.ts` | `buildMovementDraft`, `accountOptions`, `categoryOptions`, `debtOptions`, `blockedNotice` |
| `src/features/movimientos/MovementForm.tsx` + selectores | Formulario compartido (crear/editar) |
| `src/features/movimientos/RegistrarScreen.tsx`, `EditarMovimientoScreen.tsx` | Pantallas |
| `src/features/historial/presenter.ts`, `HistorialScreen.tsx`, `FilterSheets.tsx`, `MovementRow.tsx` | Historial |
| `src/app/(tabs)/registrar.tsx` (mod.), `historial.tsx` (mod.), `src/app/movimiento/[id].tsx` (nuevo) | Rutas delgadas |

Las pruebas van junto a cada archivo (`*.test.ts(x)`).

---

### Task 1: Fechas y datos (`formatDayLabel`, `createWithNewDebt`, `get`)

**Archivos:**
- Modificar: `src/lib/dates.ts`, `src/lib/dates.test.ts`, `src/data/repositories/movements.ts`, `src/data/repositories/movements.test.ts`, `src/test-utils/fakeRepositories.ts`

**Interfaces:**
- Produce (`dates.ts`):

```ts
export function formatDayLabel(date: IsoDate, today: IsoDate): string; // 'Hoy' | 'Ayer' | '14 Nov' | '14 Nov 2026' (otro año)
export function monthRange(date: IsoDate): { start: IsoDate; end: IsoDate };   // primer y último día del mes de `date`
export function addMonths(date: IsoDate, months: number): IsoDate;             // conserva el día o lo recorta al fin de mes
export function weekdayMonFirst(date: IsoDate): number;                        // 0 = lunes … 6 = domingo
export const MONTH_NAMES_ES: readonly string[];                                // 'Enero' … 'Diciembre'
```

- Produce (`movements.ts`): `get(id: string): Promise<Movement | null>` y

```ts
createWithNewDebt(draft: MovementDraft, debt: Omit<DebtInput, 'direction' | 'currency' | 'initialPendingMinor'>): Promise<Result<{ movement: Movement; debtId: string }>>
```

Crea la deuda (dirección: `expense` → `receivable`; `income` → `payable`; moneda = la del movimiento; `initialPendingMinor` 0), asigna su id a `draft.debtId`, valida el movimiento con `checkChange` y escribe ambos **en una sola transacción**. Errores de validación del movimiento o de la deuda abortan y no dejan nada.

- [ ] **Paso 1: Pruebas que fallan:**
  - `dates.test.ts`: `formatDayLabel('2026-11-20','2026-11-20')` = `Hoy`; `('2026-11-19', …)` = `Ayer`; `('2026-11-14', …)` = `14 Nov`; `('2025-12-31','2026-11-20')` = `31 Dic 2025`; `monthRange('2026-02-10')` = `{ start:'2026-02-01', end:'2026-02-28' }`; `addMonths('2026-01-31', 1)` = `2026-02-28`; `addMonths('2026-01-15', -1)` = `2025-12-15`; `weekdayMonFirst('2026-11-16')` = 0 (lunes) y `('2026-11-22')` = 6; `MONTH_NAMES_ES` tiene 12 nombres.
  - `movements.test.ts` (SQLite real): `get` devuelve el movimiento o `null`; `createWithNewDebt` con un gasto Préstamo de 15000 desde una billetera con saldo crea la deuda `receivable` "Carlos" (persona) y el movimiento vinculado; el pendiente de la deuda es 15000; con un ingreso Préstamo crea una deuda `payable`; con un gasto sin fondos devuelve `TIMELINE_VIOLATION` y **no existe** ninguna fila nueva en `debts` (punto de atención 5); con categoría que no es "Préstamo" devuelve `DEBT_NOT_ALLOWED` y tampoco deja deuda; con nombre de contraparte vacío devuelve `INPUT_INVALID` y no escribe nada.
- [ ] **Paso 2:** ejecutar → FALLA; implementar (el helper de fechas usa `Date.UTC`; la deuda se inserta con las mismas columnas que `debts.create`, reutilizando su SQL de inserción exportado desde un archivo común).
- [ ] **Paso 3:** agregar `get`, `createWithNewDebt`, `debts.create` y `list` al repositorio falso y a la lista de escrituras que notifican (`createWithNewDebt`) en `src/data/index.ts`.
- [ ] **Paso 4:** `npm test`, `typecheck`, `lint`. **Commit:** `feat(data): fechas de Historial y deuda nueva atómica`.

### Task 2: Componentes de Registrar e Historial

**Archivos:**
- Crear en `src/ui/`: `SegmentedControl.tsx`, `FormRow.tsx`, `Switch.tsx`, `AmountInput.tsx`, `FilterChip.tsx`, `WalletBadge.tsx`, `Calendar.tsx`, `SelectorSheet.tsx`, `NoticeCard.tsx` y `components2.test.tsx`

**Interfaces:**
- Consume: tokens, `GlassCard`, `GroupedList`, `Icon`, `IconCircle`, `BottomSheet`, `AppText`, `TextField` (7A); `MONTH_NAMES_ES`, `monthRange`, `addMonths`, `weekdayMonFirst` (Tarea 1).
- Produce:

```ts
export function SegmentedControl<T extends string>(props: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }): JSX.Element; // píldora de vidrio; activa en primary con texto blanco; cada opción role radio con selected
export function FormRow(props: { icon: IconName; label: string; value?: string; onPress?: () => void; right?: ReactNode; iconColor?: string }): JSX.Element; // IconCircle 36 + etiqueta + valor + chevron_right si hay onPress
export function Switch(props: { value: boolean; onValueChange: (v: boolean) => void; label: string }): JSX.Element; // 48×28, encendido primary, perilla blanca de 24; role switch con checked
export function AmountInput(props: { prefix: string; value: string; onChangeText: (t: string) => void; error?: string | null }): JSX.Element; // prefijo headlineMd gris + displayLg centrado; decimal-pad; accessibilityLabel "Monto"
export function FilterChip(props: { label: string; active?: boolean; onPress: () => void }): JSX.Element; // píldora con chevron expand_more; activa en primaryContainer
export function WalletBadge(props: { label: string; color?: string }): JSX.Element; // label-sm, radio badge, color de la billetera (neutro si no hay color)
export function Calendar(props: { value: IsoDate; onChange: (d: IsoDate) => void; initialMonth?: IsoDate }): JSX.Element; // mes con flechas, lunes primero, día elegido en primary; cada día role button con label "14 de noviembre de 2026"
export function SelectorSheet<T extends string>(props: { visible: boolean; title: string; options: { value: T; label: string; subtitle?: string; icon?: IconName; color?: string; disabled?: boolean }[]; value: T | null; onSelect: (v: T) => void; onClose: () => void; multi?: boolean; emptyMessage?: string }): JSX.Element; // lista con radios (o casillas si multi) dentro de BottomSheet; al elegir en modo simple se cierra
export function NoticeCard(props: { title: string; message: string; tone?: 'danger' | 'info' }): JSX.Element; // GlassCard con ícono, título y mensaje; accessibilityRole alert
```

- [ ] **Paso 1: Pruebas que fallan** (RNTL): `SegmentedControl` con 3 opciones marca solo la activa y llama a `onChange` con la tocada; `FormRow` con `onPress` es botón con la etiqueta, muestra el valor y sin `onPress` no es botón; `Switch` alterna `onValueChange(!value)` y expone `checked`; `AmountInput` muestra el prefijo "S/", reenvía el texto y muestra el error en rojo; `FilterChip` activo tiene fondo `primaryContainer`; `WalletBadge` usa el color dado; `Calendar` en noviembre de 2026 muestra "Noviembre 2026", 30 días, el 1 cae en domingo (6 huecos vacíos antes), tocar "14 de noviembre de 2026" llama a `onChange('2026-11-14')`, las flechas cambian de mes (diciembre → "Diciembre 2026", y enero cruza de año), el día elegido está `selected`; `SelectorSheet` simple cierra al elegir y llama a `onSelect`; en modo `multi` no cierra y alterna casillas; opciones `disabled` no se pueden elegir; sin opciones muestra `emptyMessage`; `NoticeCard` tiene rol `alert`.
- [ ] **Paso 2:** ejecutar → FALLA; implementar con los tokens (sin estilos nuevos).
- [ ] **Paso 3:** `npm test`, `typecheck`, `lint`. **Commit:** `feat(ui): componentes de Registrar e Historial`.

### Task 3: Pantalla Registrar movimiento

**Archivos:**
- Crear: `src/features/movimientos/presenter.ts`, `presenter.test.ts`, `MovementForm.tsx`, `RegistrarScreen.tsx`, `RegistrarScreen.test.tsx`, `NewDebtSheet.tsx`
- Modificar: `src/app/(tabs)/registrar.tsx`

**Interfaces:**
- Consume: componentes (Tareas 1–2 y 7A), `useQuery`, `useRepositories` (`wallets`, `categories`, `debts`, `movements`), `parseAmountInput`, `todayInLima`.
- Produce (`presenter.ts`, puro):

```ts
export type MovementKind = 'expense' | 'income' | 'transfer';
export interface FormValues { kind: MovementKind; amountText: string; accountId: string | null; destAccountId: string | null; categoryId: string | null; debtId: string | null; description: string; isToday: boolean; date: IsoDate }
export interface AccountOption { id: string; label: string; currency: Currency; kind: 'wallet' | 'credit_card'; walletName: string } // label 'Yape · S/' o 'Tarjeta BCP'
export function accountOptions(wallets: WalletRecord[], cards: CardRecord[], accounts: Account[], kind: MovementKind): AccountOption[]; // gasto: billeteras + tarjetas; ingreso y transferencia: solo billeteras; sin ocultas
export function destOptions(options: AccountOption[], from: AccountOption | null): AccountOption[]; // misma moneda que `from` y distintas de ella
export function categoryOptions(categories: CategoryRecord[], kind: 'expense' | 'income'): CategoryRecord[];
export function buildMovementDraft(values: FormValues, ctx: { accounts: AccountOption[]; categories: CategoryRecord[]; today: IsoDate }): Result<MovementDraft & { needsNewDebt?: boolean }>;
export function blockedNotice(error: DomainError): { title: string; message: string; suggestion: string | null } | null; // solo para TIMELINE_VIOLATION
```

`buildMovementDraft`: parsea el monto con `parseAmountInput`; exige cuenta (y destino en transferencia, con misma moneda y distinta); exige categoría en gasto/ingreso; exige deuda si la categoría es de sistema `loan`; `currency` = la de la cuenta; fecha = `today` si `isToday`, si no `date`. Devuelve el primer error con código `AMOUNT_INVALID`, `ACCOUNT_REQUIRED`, `DEST_REQUIRED`, `CATEGORY_REQUIRED` o `DEBT_REQUIRED` y mensaje en español. `blockedNotice` convierte `TIMELINE_VIOLATION` en título "Saldo insuficiente" (o "Línea de crédito superada" / "Pago mayor al consumo" / "Deuda sobrepagada" según el código), el mensaje del dominio y, para `WALLET_NEGATIVE`, la sugerencia "Registra antes un ingreso (categoría «Otros») para cubrir la diferencia."

Comportamiento de la pantalla: título "Registrar movimiento"; `SegmentedControl` Gasto | Ingreso | Transferencia; monto grande con prefijo según la cuenta elegida; en Transferencia subtítulo "Entre mis billeteras" y filas "Desde" (`account_balance_wallet`) y "Hacia" (`swap_horiz`) en lugar de Categoría/Billetera; "Hacia" solo ofrece cuentas de la misma moneda; Descripción; "¿Es de hoy?" activado, y al desactivarlo aparece el `Calendar`; con la categoría "Préstamo" aparece la fila "Deuda" (ícono `handshake`) con las deudas pendientes de la misma moneda y "+ Nueva deuda" (`NewDebtSheet`: nombre y tipo persona/institución); CTA "Guardar movimiento" / "Guardar transferencia"; la barra de pestañas sigue visible. Lee `tipo` y `desde` de los parámetros de ruta para precargar. Al guardar con éxito limpia el formulario y muestra "Movimiento guardado"; si hay `TIMELINE_VIOLATION` muestra el `NoticeCard` y no limpia; el botón se deshabilita mientras guarda.

- [ ] **Paso 1: Pruebas que fallan:**
  - `presenter.test.ts`: `accountOptions` para gasto incluye "Yape · S/", "Yape · $" y la tarjeta; para ingreso excluye tarjetas; no incluye billeteras ni tarjetas ocultas; `destOptions` con origen "Yape · S/" devuelve solo cuentas PEN distintas (no "Yape · $" ni la propia); `categoryOptions('expense')` no devuelve las de ingreso; `buildMovementDraft` con "24,50" → `AMOUNT_INVALID`, con "0" → `AMOUNT_INVALID`, con "1,840.50" y cuenta PEN → monto 184050 y `currency: 'PEN'`; gasto sin categoría → `CATEGORY_REQUIRED`; sin cuenta → `ACCOUNT_REQUIRED`; categoría "Préstamo" sin deuda → `DEBT_REQUIRED`; transferencia sin destino → `DEST_REQUIRED`; transferencia entre monedas distintas o a la misma cuenta → error; `isToday` usa `today` y si no usa `date`; transferencia produce `type: 'transfer'`, `categoryId: null`, `debtId: null`; `blockedNotice` para `WALLET_NEGATIVE` incluye el día, el faltante (`S/ 80.00`) y la sugerencia; para `CARD_OVER_LIMIT` título "Línea de crédito superada" sin sugerencia; para otro código devuelve `null`.
  - `RegistrarScreen.test.tsx` (repositorios falsos ampliados con cuentas, tarjetas, deudas, `movements.create/createWithNewDebt`): guardar un gasto de "24.50" con categoría y billetera llama a `create` con `amountMinor: 2450` y muestra "Movimiento guardado" y limpia el monto; **doble toque** en Guardar → una sola llamada (punto de atención 2); "24,50" muestra el error de monto y no llama (punto de atención 3); cambiar la cuenta de "Yape · S/" a "Yape · $" cambia el prefijo a "$" (punto de atención 4); en Transferencia, cambiar "Desde" a una cuenta de otra moneda limpia "Hacia" y la lista de "Hacia" solo ofrece su moneda; desactivar "¿Es de hoy?" muestra el calendario y el día elegido llega en `occurredOn`; elegir "Préstamo" muestra la fila "Deuda" y sin deuda no guarda ("Elige o crea la deuda."); "+ Nueva deuda" con nombre "Carlos" llama a `createWithNewDebt` (no a `create`); un `TIMELINE_VIOLATION` simulado muestra "Saldo insuficiente", el mensaje con el faltante y la sugerencia, y conserva lo escrito (punto de atención 1); los parámetros `tipo=transferencia&desde=<cuenta>` abren en Transferencia con "Desde" elegida; la barra de pestañas sigue visible.
- [ ] **Paso 2:** ejecutar → FALLA; implementar `presenter.ts`, `MovementForm` (recibe `initial?: FormValues`, `onSubmit`, `submitLabels`; reutilizable en la Tarea 5), `NewDebtSheet` y `RegistrarScreen`.
- [ ] **Paso 3:** `npm test`, `typecheck`, `lint`. **Commit:** `feat(registrar): pantalla de registrar gasto, ingreso y transferencia`.

### Task 4: Pantalla Historial

**Archivos:**
- Crear: `src/features/historial/presenter.ts`, `presenter.test.ts`, `MovementRow.tsx`, `FilterSheets.tsx`, `HistorialScreen.tsx`, `HistorialScreen.test.tsx`
- Modificar: `src/app/(tabs)/historial.tsx`

**Interfaces:**
- Consume: `useQuery`, repositorios (`ledger`, `categories`, `wallets`, `movements`), `formatDayLabel`, `monthRange`, `todayInLima`, componentes (7A, Tarea 2).
- Produce (`presenter.ts`, puro):

```ts
export type DateFilter = 'month' | 'lastMonth' | 'last7' | 'all';
export interface HistoryFilters { date: DateFilter; categoryIds: string[]; walletIds: string[] } // vacío = sin filtrar
export interface RowView { id: string; icon: IconName; iconColor: string; title: string; badge: string; badgeColor?: string; amountMinor: number; currency: Currency; sign: 'plus' | 'minus' | 'none'; muted: boolean }
export function filterMovements(movements: Movement[], accounts: Account[], filters: HistoryFilters, today: IsoDate): Movement[];
export function groupByDay(movements: Movement[], today: IsoDate): { date: IsoDate; label: string; items: Movement[] }[]; // más reciente primero; dentro del día, el más nuevo primero
export function describeMovement(m: Movement, ctx: { categories: CategoryRecord[]; accounts: Account[]; wallets: WalletRecord[]; cards: CardRecord[] }): RowView;
```

`describeMovement`: gasto → ícono y color de la categoría, título = descripción o nombre de la categoría, badge = billetera/tarjeta de origen, signo `minus`; ingreso → `plus`; transferencia o pago de tarjeta → ícono `swap_horiz`, color neutro, `sign: 'none'`, badge "Yape → Plin"; apertura → ícono `tune`, título "Apertura"; arreglo → `tune`, "Arreglo"; ambos neutros y `muted`. **Sin hora.** `filterMovements`: `walletIds` filtra por billetera de la cuenta de origen o destino; `categoryIds` por categoría; fechas con `monthRange`/`addDays`; `all` no filtra.

Comportamiento: título "Historial" + `HeaderIconButton` lápiz ("Editar historial"); fila de `FilterChip` **Fecha**, **Categoría**, **Billetera** (cada uno abre `SelectorSheet`; activos resaltados); grupos por día con `GroupedList`; cada fila con ícono, título, `WalletBadge` y `AmountText`; en modo edición cada fila añade "Editar" (navega a `/movimiento/<id>`) y "Eliminar" (`ConfirmDialog` "Esta acción no se puede deshacer", llama a `movements.remove`; si devuelve `TIMELINE_VIOLATION` muestra su mensaje en un `NoticeCard` y no elimina); estado vacío "No hay movimientos con estos filtros.".

- [ ] **Paso 1: Pruebas que fallan:**
  - `presenter.test.ts`: `groupByDay` con movimientos del 20/11 (hoy), 19/11 y 14/11 → etiquetas `Hoy`, `Ayer`, `14 Nov` en ese orden; `describeMovement` de un gasto "Menú" con categoría Comida (color `#1C9C4D`) desde Yape → `{ title: 'Menú', badge: 'Yape', sign: 'minus', muted: false }`; sin descripción el título es "Comida"; ingreso → `plus`; transferencia Yape→Plin → ícono `swap_horiz`, badge `Yape → Plin`, `sign: 'none'`, neutro; apertura → título "Apertura", ícono `tune`, `muted: true`; arreglo → "Arreglo"; compra con tarjeta → badge = nombre de la tarjeta; `filterMovements` con `date: 'month'` y hoy 20/11 excluye octubre; `lastMonth` incluye solo octubre; `last7` incluye del 14 al 20; `categoryIds: ['food']` deja solo esa categoría; `walletIds` incluye transferencias que tocan la billetera por origen o destino; filtros vacíos devuelven todo.
  - `HistorialScreen.test.tsx` (repositorios falsos): muestra grupos "Hoy", "Ayer" y "14 Nov" con sus filas **sin hora**; el filtro Categoría deja solo una categoría y "Este mes" es el predeterminado; sin resultados muestra el mensaje vacío; el lápiz muestra "Editar" y "Eliminar" en cada fila y los oculta al volver a tocarlo; "Editar" navega a `/movimiento/<id>`; "Eliminar" pide confirmación, cancelar no llama a `remove`, confirmar llama a `remove` y la fila desaparece; un `TIMELINE_VIOLATION` al eliminar muestra el mensaje y la fila sigue.
- [ ] **Paso 2:** ejecutar → FALLA; implementar.
- [ ] **Paso 3:** `npm test`, `typecheck`, `lint`. **Commit:** `feat(historial): historial con grupos por día, filtros y modo de edición`.

### Task 5: Editar movimiento

**Archivos:**
- Crear: `src/app/movimiento/[id].tsx`, `src/features/movimientos/EditarMovimientoScreen.tsx`, `EditarMovimientoScreen.test.tsx`, `src/features/movimientos/toFormValues.ts`, `toFormValues.test.ts`

**Interfaces:**
- Consume: `MovementForm`, `buildMovementDraft`, `blockedNotice` (Tarea 3), `movements.get/update/remove`, `HeaderIconButton`.
- Produce: `toFormValues(m: Movement, today: IsoDate): FormValues` (inversa de `buildMovementDraft`: `isToday` verdadero si la fecha es hoy).

Comportamiento: ruta `/movimiento/[id]` con botón volver y título "Editar movimiento"; abre el formulario con los valores del movimiento (tipo no editable); "Guardar cambios" llama a `movements.update(id, draft)`; `TIMELINE_VIOLATION` → `NoticeCard` con día y faltante, **la fecha original se conserva**; "Eliminar movimiento" con confirmación llama a `movements.remove`. Las aperturas y los arreglos no se editan aquí: se muestra "Este movimiento se corrige con «Arreglo de billetera»." sin formulario.

- [ ] **Paso 1: Pruebas que fallan:**
  - `toFormValues.test.ts`: gasto de 2450 en PEN el día de hoy → `{ kind: 'expense', amountText: '24.50', isToday: true, … }`; con otra fecha `isToday: false` y `date` la del movimiento; transferencia → `kind: 'transfer'` con `accountId` y `destAccountId`; ida y vuelta: `buildMovementDraft(toFormValues(m))` reproduce el movimiento (sin `id`).
  - `EditarMovimientoScreen.test.tsx`: precarga monto y descripción; cambiar el monto a "30" y guardar llama a `update(id, …amountMinor: 3000)`; mover la fecha antes del ingreso que lo cubría muestra "Saldo insuficiente" con la fecha y el faltante y la pantalla conserva la fecha original al reabrir; "Eliminar movimiento" pide confirmación y llama a `remove`; una apertura muestra el aviso de "Arreglo de billetera" y no muestra el formulario; un id inexistente muestra "El movimiento no existe.".
- [ ] **Paso 2:** ejecutar → FALLA; implementar.
- [ ] **Paso 3:** `npm test`, `typecheck`, `lint`; comprobar que Metro empaqueta (`curl` al bundle de Android responde 200, reutilizando el Metro en 8081 si ya existe). **Commit:** `feat(movimientos): editar y eliminar movimientos`.

### Task 6: Cierre y verificación del usuario

**Archivos:**
- Modificar: `docs/progress/*`, `docs/DEVELOPMENT_ROADMAP.md`, `docs/DESIGN_SYSTEM.md` (§8: marcar resueltos 2, 3, 4, 8, 9, 10 en lo que corresponda)

- [ ] **Paso 1:** pasar al usuario la lista de comprobación visual: registrar un gasto con categoría y billetera, un ingreso, una transferencia entre dos billeteras (y ver los saldos en Billeteras); desactivar "¿Es de hoy?" y elegir otro día; registrar un gasto mayor al saldo y ver el aviso con el faltante; "Préstamo" con "+ Nueva deuda" y verla en "Me deben"; en Historial, grupos Hoy/Ayer, filtros, lápiz, editar y eliminar (incluido uno bloqueado por saldo); "Transferir" desde el detalle de una billetera llega con "Desde" precargada.
- [ ] **Paso 2:** registrar diferencias con Stitch y las decisiones 1–7 en `DECISIONS.md` según su respuesta.
- [ ] **Paso 3:** actualizar `CURRENT_STATUS.md` (9 secciones), `COMPLETED_TASKS.md`, `PENDING_TASKS.md` y `DEVELOPMENT_ROADMAP.md` (Fase 7B). **Commit:** `docs: cierre de la Fase 7B`.

---

## Al terminar el plan
- Siguiente plan: **7C** (Inicio: resumen, selector de alcance con casillas, ojo, proyección, dona y gráfico de flujo con `react-native-svg`).
