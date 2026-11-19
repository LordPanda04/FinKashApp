# Fase 8 — Primer arranque (nombre y "Efectivo") y periodos mensuales: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que la app arranque lista para usarse (billetera "Efectivo" y nombre para el saludo `Hola!, <nombre>`) y que el usuario pueda iniciar, confirmar y descartar el periodo mensual desde Inicio, revisando los saldos de sus billeteras, además de ver cualquier mes en el Historial.

**Arquitectura:**
- El dominio de periodos (`shouldSuggestNewPeriod`, `activePeriodRange`) y el repositorio (`confirm`, `dismiss`, `activeRange`, `shouldSuggest`) **ya existen y están probados**; la Fase 8 agrega validación del día de inicio, la interfaz y el primer arranque.
- El primer arranque se resuelve en la semilla idempotente (`seedDatabase`) y en dos columnas nuevas de `device_settings` (solo local); la interfaz del nombre es una hoja inferior en Inicio.
- La confirmación de periodo es una ruta propia (`/periodo`) que reutiliza `AdjustForm` (Arreglo de billetera) para corregir saldos; las cifras salen del dominio (`walletBalances`), la UI no recalcula.

**Tech Stack:** Expo Router, `@testing-library/react-native`, SQLite real en pruebas (`node:sqlite`, D38), repositorios `settings`, `periods`, `wallets`, `movements`. **Sin dependencias nuevas ni módulos nativos: no hace falta recompilar el development build.**

**Spec:** `docs/FINANCIAL_RULES.md` (§2, §10, §11), `docs/DATABASE_SCHEMA.md` (`device_settings`, "Datos semilla del primer arranque", `financial_periods`), `docs/DESIGN_SYSTEM.md` (§6.1, §10.6, §8 puntos 1 y 12), `docs/progress/DECISIONS.md` (D29, D33, D41, D50, D51).

## Alcance
- **Entra:** (A) primer arranque: billetera "Efectivo", primer periodo y nombre del usuario; (B) periodos: aviso en Inicio, confirmación con revisión de saldos, descarte, validación del día de inicio, etiqueta del periodo activo; (C) Historial: elegir cualquier mes.
- **No entra:** pantalla de Ajustes (el nombre se edita tocando el saludo), reportes de dona/flujo de meses pasados (Inicio sigue mostrando solo el periodo activo), agregar una cuenta en USD a una billetera ya creada, inicio de sesión y sincronización (Fase 9), deudas y tarjetas (Fase 10).

## Decisiones de este plan (confirmar o corregir)
Ya aceptadas por ti (D50 y D51): el nombre en el primer arranque con saludo `Hola!, <nombre>` y la billetera "Efectivo" con saldo 0. Lo que sigue son detalles que **no** definiste:

1. **"Efectivo" solo con cuenta en PEN.** Tipo `cash`, ícono `payments`, color `#6B7280`, sin movimiento de apertura (saldo 0). Motivo: con una cuenta en USD, Inicio mostraría desde el primer día un segundo saldo `$ 0.00` y el selector "S/ | $". Limitación: hoy no hay forma de agregar una cuenta USD a una billetera ya creada (queda en `PENDING_TASKS.md`; si guardas dólares en efectivo, crea otra billetera con USD).
2. **"Una sola vez" para Efectivo.** Marca `device_settings.default_wallet_seeded`: se crea solo si la marca es falsa **y** no existe ninguna billetera. En instalaciones que ya tienen billeteras (como tu emulador) no se crea nada. Si la ocultas o renombras, no vuelve.
3. **Primer periodo automático.** En una instalación nueva la semilla crea también el periodo del mes actual ya confirmado (inicio el día 1, sin pantalla de saldos), para que el aviso "Iniciar nuevo periodo" no salte el primer minuto con todo en cero y aparezca recién el mes siguiente. Las instalaciones existentes (sin periodos confirmados) sí verán el aviso de noviembre: sirve para probar el flujo.
4. **Nombre.** Hoja "¿Cómo te llamas?" sobre Inicio con "Continuar" y "Omitir"; tocar fuera de la hoja equivale a "Omitir". Omitir guarda `''` (no se vuelve a preguntar y el saludo queda "Hola!"). Nombre recortado (sin espacios al borde), máximo 40 caracteres. Se edita tocando el saludo (hoja "Tu nombre"; vaciarlo borra el nombre). Las instalaciones existentes también verán la hoja una vez (su `display_name` es `null`).
5. **Confirmar periodo = ruta `/periodo`** (fuera de las pestañas, como `/billetera/[id]`), siempre del mes actual. Muestra el mes, "¿Empieza el día 1?" (activado; al desactivarlo, calendario), la lista de **billeteras visibles** con su saldo por moneda y el botón "Corregir" (abre `AdjustForm`), y "Confirmar periodo". Las tarjetas y las billeteras ocultas no entran en la lista (D29, `FINANCIAL_RULES.md` §10).
6. **Día de inicio válido:** dentro del mes que se confirma y no posterior a hoy (si no, `activePeriodRange` lo ignoraría). Error de dominio nuevo: `PERIOD_START_INVALID`.
7. **Aviso en Inicio** (tarjeta de vidrio bajo el saludo): "Iniciar nuevo periodo — Es <mes>. Revisa tus saldos y empieza el periodo." con "Iniciar periodo" y "Ahora no". "Ahora no" descarta y reaparece al día siguiente (D33). No se muestra si no hay billeteras.
8. **Etiqueta del periodo activo** en Inicio (línea `label-md` muted bajo el selector del resumen): "Periodo desde el 1 de noviembre". Es un añadido pequeño a Stitch exigido por `FINANCIAL_RULES.md` §10 ("Inicio muestra el periodo activo").
9. **Historial "ver cualquier mes":** el filtro Fecha gana "Elegir mes…", que abre una lista con los meses que tienen movimientos (más reciente primero) y el chip pasa a decir, por ejemplo, "Octubre 2026".

## Restricciones globales
- Idioma: textos visibles, comentarios y documentación en español; nombres técnicos en inglés.
- **Nunca commit sin autorización explícita; push requiere otra aparte.** Vigente: un commit local por tarea al terminarla con pruebas en verde; nada de `push`. No crear ni cambiar ramas.
- Stitch es la fuente de verdad visual: tokens y componentes existentes (`GlassCard`, `BottomSheet`, `TextField`, `PrimaryButton`, `Switch`, `Calendar`, `NoticeCard`); no rediseñar.
- Solo fecha (sin hora), zona Lima; "hoy" = `todayInLima(new Date())` en pantallas y el reloj inyectado en repositorios.
- Dinero con `formatMoney`/`AmountText`; nunca flotantes; nunca mezclar monedas.
- `src/domain/` sin imports de React Native, Expo, PowerSync ni Supabase.
- Dobles toques bloqueados con un `ref` además del estado (D44) en todo botón que escribe.
- Los mensajes de error de dominio se muestran tal cual (D44). Las cifras salen del dominio.
- **Prohibido tomar capturas con `adb screencap` o reiniciar el emulador desde el agente**; la verificación visual la haces tú. Un solo Metro (8081). Para comprobar que todo compila: `npx expo export --platform android` en una carpeta temporal (D46).
- Al terminar cada tarea: `npm test`, `npm run typecheck`, `npx expo lint` en verde.

## Review Focus
1. **Instalación existente al actualizar:** la fila de `device_settings` ya existe y las dos columnas nuevas llegan en `NULL`; leerlas no debe lanzar y `NULL` significa "sin nombre" y "marca falsa" (Tarea 1).
2. **Reabrir la app muchas veces:** Efectivo y el primer periodo no se duplican; si el usuario oculta o renombra "Efectivo", no reaparece; con billeteras previas no se crea (Tarea 2).
3. **Nombre raro:** solo espacios (no se acepta en "Continuar"), 41+ caracteres (se rechaza con mensaje), nombre largo (el saludo se recorta a una línea, sin romper la pantalla) y acentos/emoji (se guardan tal cual) (Tarea 3).
4. **Día de inicio inválido:** otro mes, día futuro, `2026-02-30`; confirmar el mismo mes dos veces (doble toque o segundo dispositivo) muestra el error sin duplicar la fila (Tareas 4 y 5).
5. **Confirmar con billeteras ocultas, solo ocultas, o con saldo 0:** la lista ignora las ocultas, un saldo 0 se muestra como `S/ 0.00` y la confirmación sigue habilitada aunque no haya filas (Tarea 5).
6. **Mes sin movimientos / un solo mes de historia:** "Elegir mes…" no ofrece meses vacíos y siempre incluye el mes actual; un mes con movimientos pero ninguno en el filtro de billetera/categoría muestra la lista vacía sin errores (Tarea 7).

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/data/local/schema.ts` (mod.) | Columnas `display_name`, `default_wallet_seeded` en `device_settings` |
| `src/data/repositories/settings.ts` (mod.) | `DeviceSettings.displayName`; validación del nombre |
| `src/data/local/seed.ts` (mod.) | "Efectivo" y primer periodo en instalaciones nuevas |
| `src/domain/periods/periods.ts` (mod.) | `validatePeriodStart` |
| `src/data/repositories/periods.ts` (mod.) | `confirm` valida el día de inicio |
| `src/features/inicio/presenter.ts` (mod.) | `greetingText`, `periodLabel` en `HomeView` |
| `src/features/inicio/NameSheet.tsx` | Hoja de nombre (bienvenida y edición) |
| `src/features/inicio/InicioScreen.tsx` (mod.) | Saludo tocable, hoja de nombre, aviso de periodo, etiqueta del periodo |
| `src/features/periodos/presenter.ts` | `buildPeriodCheck` |
| `src/features/periodos/PeriodSuggestionCard.tsx` | Aviso "Iniciar nuevo periodo" |
| `src/features/periodos/PeriodoScreen.tsx` | Confirmación con revisión de saldos |
| `src/app/periodo.tsx` | Ruta delgada |
| `src/features/historial/presenter.ts`, `HistorialScreen.tsx` (mod.) | Filtro "Elegir mes…" |
| `src/test-utils/fakeRepositories.ts` (mod.) | `displayName`, `periods.{shouldSuggest,confirm,dismiss}` falsos |

Las pruebas van junto a cada archivo (`*.test.ts(x)`).

---

### Task 1: Columnas del primer arranque y nombre en los ajustes

**Archivos:**
- Modificar: `src/data/local/schema.ts`, `src/data/repositories/settings.ts`, `src/test-utils/fakeRepositories.ts`
- Probar: `src/data/repositories/settings.test.ts`, `src/data/local/schema.test.ts`

**Interfaces:**
- Produce: `DeviceSettings` gana `displayName: string | null` (`null` = aún no se pidió, `''` = omitido). `setDevice(patch)` acepta `displayName: string`.
- Produce: columnas `display_name text` y `default_wallet_seeded integer` en `DEVICE_SETTINGS_TABLE` (las usa la Tarea 2; el repositorio de ajustes **no** expone `default_wallet_seeded`).

- [ ] **Paso 1: pruebas que fallan** en `settings.test.ts`:
  - `getDevice()` sobre una fila sin las columnas nuevas (insertada con solo `hide_amounts, show_projection, home_scope`) devuelve `displayName: null` y no lanza.
  - `setDevice({ displayName: '  Ana  ' })` guarda `'Ana'`; `getDevice().displayName === 'Ana'`.
  - `setDevice({ displayName: '' })` guarda `''` (omitido).
  - `setDevice({ displayName: 'x'.repeat(41) })` lanza; con 40 caracteres guarda.
  - `setDevice({ hideAmounts: true })` no cambia `displayName`.
  - `schema.test.ts`: `DEVICE_SETTINGS_TABLE` incluye las dos columnas y sigue sin gemela sincronizable.
- [ ] **Paso 2:** correr `npx jest src/data` y comprobar que fallan por las columnas/campo ausentes.
- [ ] **Paso 3:** agregar las columnas al esquema; `deviceFromRow` lee `display_name` con `textOrNull` y **no** usa `r.bool` sobre `default_wallet_seeded`; `devicePatch` suma `displayName: z.string().trim().max(40, ...)`; `setDevice` escribe `display_name` junto a los demás campos. Migración: PowerSync reconstruye las vistas al cambiar el esquema local; las filas existentes quedan con `NULL`.
- [ ] **Paso 4:** actualizar `fakeRepositories.ts`: el `device` falso empieza con `displayName: ''` (así las pruebas existentes de Inicio siguen viendo "Hola!").
- [ ] **Paso 5:** `npm test`, `npm run typecheck`, `npx expo lint` en verde.
- [ ] **Paso 6: commit local** — `feat(ajustes): nombre del usuario y marca de billetera inicial en device_settings`.

---

### Task 2: Semilla del primer arranque — "Efectivo" y primer periodo

**Archivos:**
- Modificar: `src/data/local/seed.ts`
- Probar: `src/data/local/seed.test.ts`

**Interfaces:**
- Consume: columnas de la Tarea 1; tablas `wallets`, `accounts`, `financial_periods`.
- Produce: `seedDatabase(db, deps?)` (firma sin cambios) que además, **dentro de la misma transacción**, ejecuta `seedDefaultWallet(tx, newId, now, today)` (privada): crea "Efectivo" y el periodo inicial solo si `default_wallet_seeded` es falso/`NULL` y `wallets` está vacía; en todo caso deja `default_wallet_seeded = 1`.

- [ ] **Paso 1: pruebas que fallan** en `seed.test.ts` (reloj fijo `2026-11-20T15:00:00Z`):
  - instalación vacía → una billetera `{ name: 'Efectivo', wallet_type: 'cash', icon: 'payments', color: '#6B7280', is_hidden: 0, include_in_general: 1, sort_order: 0, user_id: NULL }`, **una** cuenta `{ kind: 'wallet', currency: 'PEN' }` ligada a ella y **cero** movimientos.
  - instalación vacía → un periodo `{ month: '2026-11', started_on: '2026-11-01', confirmed_at: '2026-11-20T15:00:00.000Z', dismissed_at: NULL }`.
  - `default_wallet_seeded = 1` tras la semilla.
  - correrla dos veces → 1 billetera, 1 cuenta, 1 periodo.
  - renombrar y ocultar "Efectivo", correr la semilla → sigue 1 billetera con ese nombre y estado.
  - hay una billetera "Yape" previa y marca `NULL` → no se crea "Efectivo" ni periodo; marca en 1.
  - marca en 1 y sin billeteras → no se crea nada (el usuario no puede borrarla, pero la marca manda).
  - una fila de `device_settings` heredada (sin columnas nuevas, marca `NULL`) con billeteras → no falla.
  - los saldos derivados de "Efectivo" (con `loadLedgerState` + `balances` existentes) dan `0` y se le puede registrar después una apertura/ingreso.
- [ ] **Paso 2:** correr `npx jest src/data/local/seed.test.ts` y ver fallar.
- [ ] **Paso 3:** implementar `seedDefaultWallet` con `INSERT` directos (la semilla no depende de los repositorios): constante `DEFAULT_WALLET` con los valores de arriba; `today` = `todayInLima(clock())`; el periodo usa `month = monthOf(today)`, `started_on = firstDayOfMonth(today)`. Respetar que la inserción de `device_settings` ocurre antes de leer/actualizar la marca (usar una sola fila).
- [ ] **Paso 4:** `npm test`, `npm run typecheck`, `npx expo lint`.
- [ ] **Paso 5: commit local** — `feat(semilla): billetera Efectivo y primer periodo en el primer arranque`.

---

### Task 3: Saludo `Hola!, <nombre>` y hoja de nombre

**Archivos:**
- Crear: `src/features/inicio/NameSheet.tsx`
- Modificar: `src/features/inicio/presenter.ts`, `src/features/inicio/InicioScreen.tsx`
- Probar: `src/features/inicio/presenter.test.ts`, `src/features/inicio/components.test.tsx`, `src/features/inicio/InicioScreen.test.tsx`

**Interfaces:**
- Consume: `DeviceSettings.displayName`, `settings.setDevice` (Tarea 1).
- Produce: `greetingText(name: string | null): string` en `presenter.ts` (`null`, `''` o solo espacios → `'Hola!'`; si no, `` `Hola!, ${name.trim()}` ``).
- Produce: `NameSheet({ visible, mode, initialName, onSave, onSkip, onClose })` con `mode: 'welcome' | 'edit'`, `onSave(name: string): Promise<string | null>` (devuelve el mensaje de error o `null`), `onSkip?: () => void`. Bienvenida: título "¿Cómo te llamas?", botones "Continuar" y "Omitir"; edición: título "Tu nombre", botón "Guardar" (sin "Omitir"). `onClose` en bienvenida se comporta como "Omitir".

- [ ] **Paso 1: pruebas que fallan:**
  - `greetingText(null) === 'Hola!'`, `('') === 'Hola!'`, `('   ') === 'Hola!'`, `('Ana') === 'Hola!, Ana'`, `('  José María ') === 'Hola!, José María'`.
  - `NameSheet` bienvenida: "Continuar" con campo vacío o solo espacios muestra "Escribe tu nombre u omite este paso." y **no** llama a `onSave`; con "Ana" llama `onSave('Ana')` una vez aunque se toque dos veces seguidas (doble toque); el mensaje de error devuelto por `onSave` se muestra; "Omitir" llama `onSkip`.
  - `NameSheet` edición: vaciar el campo y "Guardar" llama `onSave('')`.
  - `InicioScreen` con `displayName: null` → aparece "¿Cómo te llamas?"; escribir "Ana" + "Continuar" → `setDevice({ displayName: 'Ana' })` y el saludo es "Hola!, Ana". "Omitir" → `setDevice({ displayName: '' })` y saludo "Hola!". Con `displayName: ''` o `'Ana'` **no** aparece la hoja. Tocar el saludo abre "Tu nombre" con el nombre actual y guardar lo cambia. Un nombre de 41 caracteres muestra el error del repositorio.
  - El saludo tiene `numberOfLines={1}` y `accessibilityLabel` "Editar tu nombre" cuando es tocable.
- [ ] **Paso 2:** correr `npx jest src/features/inicio` y ver fallar.
- [ ] **Paso 3:** implementar `greetingText` y `NameSheet` (con `BottomSheet`, `TextField`, `PrimaryButton` y una acción de texto secundaria; bloqueo de doble toque con `ref`). En `InicioScreen`: el saludo pasa a un `Pressable` con `greetingText(device.displayName)`; `welcomeOpen = data.device.displayName === null`; `onSave` normaliza con `settings.setDevice({ displayName })` y devuelve el mensaje si lanza (el repositorio lanza ante nombres inválidos, D44: capturar y mostrar). Mientras `data` no carga, el saludo es "Hola!" (sin hoja).
- [ ] **Paso 4:** `npm test`, `npm run typecheck`, `npx expo lint`.
- [ ] **Paso 5: commit local** — `feat(inicio): saludo con nombre y hoja de nombre del primer arranque`.

---

### Task 4: Validación del día de inicio del periodo

**Archivos:**
- Modificar: `src/domain/periods/periods.ts`, `src/data/repositories/periods.ts`
- Probar: `src/domain/periods/periods.test.ts`, `src/data/repositories/periods.test.ts`

**Interfaces:**
- Produce: `validatePeriodStart(month: string, startedOn: IsoDate, today: IsoDate): Result<IsoDate>` en el dominio. `ok(startedOn)` si `monthOf(startedOn) === month` y `startedOn <= today`; si no, `err('PERIOD_START_INVALID', mensaje en español)`.
- Produce: `periods.confirm({ month, startedOn? })` devuelve `PERIOD_START_INVALID` (Result de error, sin escribir) cuando el día no cumple; el día por defecto (`${month}-01`) también se valida (un mes futuro falla).

- [ ] **Paso 1: pruebas que fallan:**
  - dominio: `('2026-11', '2026-11-01', '2026-11-20')` ok; `('2026-11', '2026-11-20', '2026-11-20')` ok (hoy); `('2026-11', '2026-11-21', '2026-11-20')` error (futuro); `('2026-11', '2026-10-31', '2026-11-20')` error (otro mes); `('2026-12', '2026-12-01', '2026-11-20')` error (mes futuro).
  - repositorio (reloj 2026-11-20): `confirm({ month: '2026-11', startedOn: '2026-11-25' })` → error `PERIOD_START_INVALID` y la tabla queda igual; `confirm({ month: '2026-12' })` → error; `confirm({ month: '2026-11' })` sigue funcionando (las pruebas existentes no cambian).
- [ ] **Paso 2:** correr `npx jest src/domain/periods src/data/repositories/periods.test.ts` y ver fallar.
- [ ] **Paso 3:** implementar `validatePeriodStart` (puro, usa `monthOf` y `Result` de `@/lib/result`) y llamarlo en `confirm` dentro de la transacción, antes de escribir, con `abort`/`unwrap` como el resto del repositorio.
- [ ] **Paso 4:** `npm test`, `npm run typecheck`, `npx expo lint`.
- [ ] **Paso 5: commit local** — `feat(periodos): validar el día de inicio del periodo`.

---

### Task 5: Pantalla de confirmación del periodo (revisión de saldos)

**Archivos:**
- Crear: `src/features/periodos/presenter.ts`, `src/features/periodos/PeriodoScreen.tsx`, `src/app/periodo.tsx`
- Modificar: `src/test-utils/fakeRepositories.ts`
- Probar: `src/features/periodos/presenter.test.ts`, `src/features/periodos/PeriodoScreen.test.tsx`, `src/ui/navigation.test.tsx` (la ruta existe)

**Interfaces:**
- Consume: `walletBalances(state, wallet): WalletBalances`, `splitWallets` (`features/billeteras/presenter.ts`); `AdjustForm({ accounts, balanceOf, onClose })`; `periods.confirm`; `validatePeriodStart` (Tarea 4); `Calendar`, `Switch`, `GlassCard`, `PrimaryButton`, `NoticeCard`; `MONTH_NAMES_ES`.
- Produce: `buildPeriodCheck({ state, wallets, today }): { month: string; monthLabel: string; defaultStart: IsoDate; rows: { walletId: string; name: string; icon: string; color: string; balances: WalletBalances; accounts: Account[] }[] }` — solo billeteras **no ocultas**, en `sortOrder`; `month = monthOf(today)`, `monthLabel` = nombre del mes en español con mayúscula inicial.
- Produce (fake): `periods.shouldSuggest`, `periods.confirm` (devuelve `ok`/`err` configurable y registra la llamada) y `periods.dismiss`.

- [ ] **Paso 1: pruebas que fallan:**
  - presentador: oculta billeteras ocultas; respeta el orden; una billetera con PEN y USD trae ambos saldos; un saldo 0 aparece como `0` (no `undefined`); `monthLabel` de `2026-11-20` es `'Noviembre'`; `defaultStart` es `'2026-11-01'`.
  - pantalla: muestra "Iniciar periodo de Noviembre", el interruptor "¿Empieza el día 1?" activado y las billeteras visibles con sus saldos; "Confirmar periodo" llama `periods.confirm({ month: '2026-11', startedOn: '2026-11-01' })` y, si va bien, vuelve a Inicio; desactivar el interruptor muestra el calendario y elegir otro día cambia `startedOn` en la llamada; elegir un día futuro o de otro mes muestra el mensaje de `validatePeriodStart` y deshabilita el botón; "Corregir" abre `AdjustForm` de esa billetera y, al guardar, el saldo de la fila se actualiza; un error de `confirm` (p. ej. `PERIOD_ALREADY_CONFIRMED`) se muestra tal cual; dos toques seguidos llaman `confirm` una sola vez; sin billeteras visibles muestra "No tienes billeteras visibles." y el botón sigue habilitado.
  - navegación: la ruta `/periodo` existe y se registra como pantalla de pila fuera de las pestañas.
- [ ] **Paso 2:** correr `npx jest src/features/periodos src/ui/navigation.test.tsx` y ver fallar.
- [ ] **Paso 3:** implementar `buildPeriodCheck`, `PeriodoScreen` (lee con `useQuery`: `ledger.state()` y `wallets.listWallets()`; `today = todayInLima(new Date())`; botón atrás del sistema vuelve a Inicio sin confirmar) y la ruta delgada `src/app/periodo.tsx`.
- [ ] **Paso 4:** `npm test`, `npm run typecheck`, `npx expo lint`.
- [ ] **Paso 5: commit local** — `feat(periodos): pantalla de confirmación con revisión de saldos`.

---

### Task 6: Aviso en Inicio, descarte y etiqueta del periodo activo

**Archivos:**
- Crear: `src/features/periodos/PeriodSuggestionCard.tsx`
- Modificar: `src/features/inicio/InicioScreen.tsx`, `src/features/inicio/presenter.ts`, `src/features/inicio/SummaryCard.tsx`
- Probar: `src/features/periodos/PeriodSuggestionCard.test.tsx`, `src/features/inicio/presenter.test.ts`, `src/features/inicio/InicioScreen.test.tsx`

**Interfaces:**
- Consume: `periods.shouldSuggest(): Promise<boolean>`, `periods.dismiss(month: string): Promise<void>`, `periods.activeRange()`; ruta `/periodo`.
- Produce: `PeriodSuggestionCard({ monthLabel, onStart, onDismiss })` ("Iniciar nuevo periodo", "Iniciar periodo", "Ahora no").
- Produce: `HomeView.periodLabel: string` — `'Periodo desde el 1 de noviembre'` a partir de `period.start`.

- [ ] **Paso 1: pruebas que fallan:**
  - `buildHomeView` con periodo `2026-11-01 → 2026-11-20` da `periodLabel === 'Periodo desde el 1 de noviembre'`; con inicio `2026-11-15`, `'Periodo desde el 15 de noviembre'`.
  - tarjeta: muestra el mes y llama `onStart`/`onDismiss`; un doble toque en "Ahora no" llama `onDismiss` una sola vez.
  - `InicioScreen`: con `shouldSuggest = true` y billeteras aparece el aviso bajo el saludo; "Iniciar periodo" navega a `/periodo`; "Ahora no" llama `periods.dismiss('2026-11')` y el aviso desaparece; con `shouldSuggest = false` no aparece; **sin billeteras no aparece** aunque `shouldSuggest` sea `true`; la etiqueta del periodo se ve en el resumen.
  - (el descarte de verdad —reaparece al día siguiente, el mes anterior sigue activo, confirmar tras descartar no duplica— ya está probado en `periods.test.ts`; no se repite)
- [ ] **Paso 2:** correr `npx jest src/features` y ver fallar.
- [ ] **Paso 3:** implementar; `InicioScreen` suma `suggest: await r.periods.shouldSuggest()` a la consulta existente y usa `monthOf(today)` para el descarte.
- [ ] **Paso 4:** `npm test`, `npm run typecheck`, `npx expo lint`.
- [ ] **Paso 5: commit local** — `feat(inicio): aviso de nuevo periodo, descarte y etiqueta del periodo activo`.

---

### Task 7: Historial — elegir cualquier mes

**Archivos:**
- Modificar: `src/features/historial/presenter.ts`, `src/features/historial/HistorialScreen.tsx`
- Probar: `src/features/historial/presenter.test.ts`, `src/features/historial/HistorialScreen.test.tsx`

**Interfaces:**
- Produce: `DateFilter` gana `'pick'`; `HistoryFilters` gana `pickedMonth: string | null` (`YYYY-MM`); `filterMovements` con `date: 'pick'` usa `monthRange(`${pickedMonth}-01`)`.
- Produce: `monthsWithMovements(movements: Movement[], today: IsoDate): string[]` — meses (`YYYY-MM`) con movimientos, **más** el mes de `today`, sin repetir, del más reciente al más antiguo.
- Produce: `dateFilterLabel(filters: HistoryFilters): string` (p. ej. `'Este mes'`, `'Octubre 2026'` para `pick`).

- [ ] **Paso 1: pruebas que fallan:**
  - `filterMovements` con `{ date: 'pick', pickedMonth: '2026-10' }` deja solo los movimientos de octubre (incluidos el 1 y el 31); combinado con filtros de categoría/billetera sigue filtrando.
  - `monthsWithMovements` con movimientos en oct y sep y `today` en nov → `['2026-11','2026-10','2026-09']`; sin movimientos → `['2026-11']`; no repite.
  - `dateFilterLabel` → `'Octubre 2026'` para `pick` en `2026-10`.
  - pantalla: Fecha → "Elegir mes…" abre la lista de meses; elegir octubre muestra solo sus grupos y el chip dice "Octubre 2026"; elegir "Este mes" quita `pickedMonth`.
- [ ] **Paso 2:** correr `npx jest src/features/historial` y ver fallar.
- [ ] **Paso 3:** implementar (añadir `pickedMonth: null` a los filtros iniciales; `SelectorSheet` para la lista de meses con `MONTH_NAMES_ES`).
- [ ] **Paso 4:** `npm test`, `npm run typecheck`, `npx expo lint`.
- [ ] **Paso 5: commit local** — `feat(historial): elegir cualquier mes en el filtro de fecha`.

---

### Task 8: Cierre de la Fase 8

**Archivos:**
- Modificar: `docs/progress/{CURRENT_STATUS,COMPLETED_TASKS,PENDING_TASKS,DECISIONS}.md`, `docs/DEVELOPMENT_ROADMAP.md`, `docs/DESIGN_SYSTEM.md` (§8 punto 12 y nueva §10.7 "Periodos"), `docs/FINANCIAL_RULES.md` (§10: primer periodo automático y validación del día de inicio)

- [ ] **Paso 1:** `npm test`, `npm run typecheck`, `npx expo lint` y `npx expo export --platform android --output-dir <carpeta temporal>` en verde (compila todas las rutas, incluida `/periodo`). Pureza: `src/domain/` sin imports prohibidos (`grep` de `react-native|expo|powersync|supabase|@/data`).
- [ ] **Paso 2:** registrar en `DECISIONS.md` las decisiones de este plan una vez confirmadas (D52 en adelante) y los detalles de implementación que surjan.
- [ ] **Paso 3:** actualizar los documentos de progreso (las 9 secciones de `CURRENT_STATUS.md`), agregar a `PENDING_TASKS.md` la lista de **verificación visual** (primer arranque con datos limpios: hoja de nombre, "Hola!, <nombre>", "Efectivo" en Billeteras, ausencia del aviso de periodo; instalación existente: aviso de periodo, confirmar con y sin corregir un saldo, "Ahora no", Historial → Elegir mes) y la limitación "agregar cuenta USD a una billetera existente".
- [ ] **Paso 4: commit local** — `docs: cierre de la Fase 8`.

---

## Autorrevisión
- **Cobertura:** nombre (D50) → Tareas 1 y 3; "Efectivo" (D51) → Tareas 1 y 2; documentos → ya actualizados el 2026-11-19 (DECISIONS D50/D51, DATABASE_SCHEMA, DESIGN_SYSTEM §6.1/§8/§10.6, FINANCIAL_RULES §2); sugerencia/confirmación/descarte (`FINANCIAL_RULES.md` §10) → Tareas 4–6; "Historial permite ver cualquier mes" → Tarea 7; "Inicio muestra el periodo activo" → Tarea 6.
- **Consistencia de nombres:** `displayName`/`display_name`, `default_wallet_seeded`, `validatePeriodStart`, `buildPeriodCheck`, `greetingText`, `PeriodSuggestionCard`, `monthsWithMovements` se usan igual en todas las tareas.
- **Proporción:** las tareas fijan firmas, valores y pruebas; los cuerpos los escribe quien implementa.
