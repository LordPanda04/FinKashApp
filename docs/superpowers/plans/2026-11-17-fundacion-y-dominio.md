# Fundación del proyecto y núcleo de dominio — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** dejar creado el proyecto Expo funcionando en el emulador Android y toda la lógica financiera de FinKash implementada en TypeScript puro, con pruebas.

**Arquitectura:**
- El proyecto se genera con la plantilla `default@sdk-58` (Expo Router + TypeScript, rutas en `src/app/`) y se limpia.
- Las reglas financieras viven en `src/domain/` como funciones puras sin dependencias de React Native, PowerSync ni Supabase. Reciben un `LedgerState` en memoria y devuelven resultados.
- La persistencia (PowerSync), las pantallas y la sincronización son planes posteriores.

**Stack:** Expo SDK 58 (React Native 0.88), TypeScript `strict`, Expo Router, Jest con `jest-expo`, `expo-dev-client`.

**Especificación (leer junto con este plan):**
- `docs/FINANCIAL_RULES.md` (reglas)
- `docs/DATABASE_SCHEMA.md` (modelo y cálculos derivados)
- `docs/ARCHITECTURE.md` (capas y estructura)
- `CLAUDE.md` (reglas del proyecto)

**Fuera de alcance de este plan:** base de datos local, repositorios, pantallas, Supabase y PowerSync. Cada uno tendrá su propio plan (ver `docs/DEVELOPMENT_ROADMAP.md`, Fases 5 en adelante).

## Restricciones globales
- Idioma: comentarios, mensajes de error para el usuario y documentación en español; nombres técnicos (variables, funciones, tipos, archivos) en inglés.
- **Nunca hacer commit sin autorización explícita del usuario; push requiere otra autorización aparte.** No cambiar ni crear ramas sin aprobación.
- No agregar `expo-sqlite`. Verificar con Context7 cualquier paquete antes de instalarlo.
- Dinero: enteros en unidades mínimas (`number` con `Number.isSafeInteger`), monedas `'PEN' | 'USD'`. Nunca punto flotante para montos; nunca sumar monedas distintas.
- Fechas de movimiento: cadenas `YYYY-MM-DD` (sin hora), zona `America/Lima` (UTC−5 fijo; Perú no usa horario de verano).
- `src/domain/` no importa nada de `react-native`, `expo-*`, `@powersync/*` ni `@supabase/*`.
- Formato de montos: `S/ 1,840.00`, `$ 1,840.00`, `- S/ 24.50`, `+ $ 500.00`.
- Node.js ≥ 22.13 (instalado: 26.13.1). JDK 17 (`JAVA_HOME` ya configurado).

## Puntos de atención para la revisión
Casos que la especificación implica y que un usuario encontrará; cada uno tiene su prueba en la tarea indicada:
1. **Monto mal escrito** ("", "0", "-5", "1.005", "abc") → se rechaza con un error claro; "1,840.50" → 184050 céntimos (Tarea 3).
2. **Cambio de mes en Lima**: a las 22:00 del 30 de noviembre en Lima (03:00 UTC del 1 de diciembre), "hoy" debe ser `2026-11-30` (Tarea 3).
3. **Ingreso y gasto el mismo día**: con saldo 0, un ingreso de 100 y un gasto de 80 el mismo día **no** deben bloquearse, porque se revisa el saldo al cierre del día (Tarea 7).
4. **Mover la fecha de un gasto hacia atrás**, antes del ingreso que lo cubría, debe bloquearse e informar el día y el monto faltante (Tarea 7).
5. **Transferencia a la misma cuenta o entre monedas distintas** → se rechaza (Tarea 4).

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/result.ts` | Tipo `Result<T>` y `DomainError` |
| `src/lib/dates.ts` | Fechas `IsoDate` en zona Lima |
| `src/domain/money/money.ts` | Parseo y formato de montos |
| `src/domain/ledger/types.ts` | Tipos del libro: cuentas, movimientos, categorías, deudas, estado |
| `src/domain/ledger/validateMovement.ts` | Reglas de forma por tipo de movimiento |
| `src/domain/ledger/balances.ts` | Saldos y saldos al cierre de cada día |
| `src/domain/debts/debts.ts` | Efecto de los préstamos y saldo pendiente de deudas |
| `src/domain/ledger/timeline.ts` | Validación de toda la línea de tiempo ante un cambio |
| `src/domain/ledger/builders.ts` | Construcción de aperturas y arreglos de billetera |
| `src/domain/reports/home.ts` | Resumen de Inicio, gastos por categoría, serie de flujo, proyección, umbral |
| `src/domain/periods/periods.ts` | Periodos mensuales: sugerencia y periodo activo |
| `src/domain/categories/categories.ts` | Eliminación de categorías con reasignación a "Otros" |

Las pruebas van junto a cada archivo (`*.test.ts`).

---

### Tarea 1: Inicializar el proyecto Expo

**Archivos:**
- Crear (desde la plantilla): `package.json`, `app.json`, `tsconfig.json`, `.gitignore`, `src/app/_layout.tsx`, `src/app/index.tsx`, `assets/`, etc.
- Modificar: `tsconfig.json`, `.gitignore`, `package.json`
- Crear: `src/lib/smoke.test.ts`

**Interfaces:**
- Produce:
  - `npm test` (Jest con preset `jest-expo`)
  - `npm run typecheck` (`tsc --noEmit`)
  - alias `@/*` → `./src/*`

- [ ] **Paso 1: Generar la plantilla en el scratchpad** (la carpeta del repo no está vacía):
  `npx create-expo-app@latest finkash --template default@sdk-58 --no-install` dentro del directorio scratchpad de la sesión.
  Esperado: carpeta `finkash/` con `package.json` que declara `"expo": "~58.x"`.
- [ ] **Paso 2: Copiar al repositorio sin sobrescribir.** Copiar todo el contenido de `finkash/` a la raíz del repo excepto `.git/`.
  - Si algún archivo ya existe en el repo (no debería: hoy solo hay `CLAUDE.md` y `docs/`), detenerse y consultar al usuario.
  - Luego ejecutar `npm install` en la raíz.
- [ ] **Paso 3: Limpiar el ejemplo.** Ejecutar `npm run reset-project` respondiendo `n` a la pregunta de mover a `/example`, para borrar el código de ejemplo. Luego eliminar el script `reset-project` de `package.json` y la carpeta `scripts/`.
  Esperado: `src/app/` contiene solo `_layout.tsx` e `index.tsx`.
- [ ] **Paso 4: TypeScript estricto.** En `tsconfig.json`, mantener `"strict": true` y agregar `"noUncheckedIndexedAccess": true`. Confirmar que existe `"paths": { "@/*": ["./src/*"] }`.
- [ ] **Paso 5: `.gitignore`.**
  - Agregar `.env*` y `!.env.example`.
  - Verificar que `/android` y `/ios` estén ignorados (agregarlos si no lo están).
- [ ] **Paso 6: Jest.**
  - Instalar con `npx expo install jest-expo jest @types/jest "--" --dev` (sintaxis de Windows según la documentación de Expo SDK 58).
  - En `package.json`, agregar `"test": "jest"`, `"typecheck": "tsc --noEmit"` y `"jest": { "preset": "jest-expo" }`.
- [ ] **Paso 7: Prueba de humo.** Crear `src/lib/smoke.test.ts`:

```ts
describe('entorno de pruebas', () => {
  it('ejecuta TypeScript', () => {
    const total: number = [1, 2].reduce((a, b) => a + b, 0);
    expect(total).toBe(3);
  });
});
```

- [ ] **Paso 8: Verificar.** Ejecutar `npm test`, `npm run typecheck`, `npx expo lint` (acepta la configuración que propone) y `npx expo-doctor`.
  Esperado: 1 prueba pasa, sin errores de tipos ni de lint, y expo-doctor sin problemas bloqueantes.
- [ ] **Paso 9: Commit (solo con autorización explícita del usuario).** Mensaje: `chore: inicializar proyecto Expo SDK 58`.

### Tarea 2: Development build en el emulador Android

**Archivos:**
- Modificar: `package.json` (dependencia `expo-dev-client`)

**Interfaces:**
- Consume: proyecto de la Tarea 1.
- Produce: app de desarrollo instalada en el AVD `Pixel_8_Pro`.

- [ ] **Paso 1:** `npx expo install expo-dev-client`.
- [ ] **Paso 2:** Iniciar el emulador en segundo plano: `emulator -avd Pixel_8_Pro`. Verificar con `adb devices` que aparezca `emulator-5554  device`.
- [ ] **Paso 3:** `npx expo run:android` en segundo plano (la primera compilación de Gradle tarda varios minutos y puede descargar la plataforma de SDK y el NDK que pida).
  Esperado: `BUILD SUCCESSFUL` y la app abierta en el emulador mostrando la pantalla de `src/app/index.tsx`.
  Si Gradle pide licencias o componentes y no puede instalarlos, anotar el error exacto en `CURRENT_STATUS.md` y avisar al usuario: puede faltar "Android SDK Command-line Tools".
- [ ] **Paso 4:** Confirmar que la carpeta `android/` generada está ignorada por git (`git status` no la muestra).
- [ ] **Paso 5: Commit (solo con autorización explícita del usuario).** Mensaje: `chore: agregar expo-dev-client`.

### Tarea 3: Dinero y fechas

**Archivos:**
- Crear: `src/lib/result.ts`, `src/lib/dates.ts`, `src/lib/dates.test.ts`, `src/domain/money/money.ts`, `src/domain/money/money.test.ts`

**Interfaces:**
- Produce:
  - `type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError }`
  - `interface DomainError { code: string; message: string; details?: Record<string, unknown> }` (`message` en español)
  - `type IsoDate = string` (`YYYY-MM-DD`)
  - `todayInLima(now: Date): IsoDate`
  - `addDays(date: IsoDate, days: number): IsoDate`
  - `endOfMonth(date: IsoDate): IsoDate`
  - `monthOf(date: IsoDate): string` (`YYYY-MM`)
  - `firstDayOfMonth(date: IsoDate): IsoDate`
  - `eachDay(from: IsoDate, to: IsoDate): IsoDate[]` (inclusive)
  - `type Currency = 'PEN' | 'USD'`
  - `CURRENCY_SYMBOL: Record<Currency, string>` = `{ PEN: 'S/', USD: '$' }`
  - `parseAmountInput(text: string): Result<number>`
  - `formatMoney(amountMinor: number, currency: Currency, opts?: { sign?: 'plus' | 'minus' }): string`

- [ ] **Paso 1: Pruebas que fallan** en `dates.test.ts`:

```ts
expect(todayInLima(new Date('2026-12-01T03:00:00Z'))).toBe('2026-11-30'); // 22:00 en Lima
expect(todayInLima(new Date('2026-12-01T05:00:00Z'))).toBe('2026-12-01');
expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
expect(monthOf('2026-11-17')).toBe('2026-11');
expect(firstDayOfMonth('2026-11-17')).toBe('2026-11-01');
expect(eachDay('2026-11-29', '2026-12-01')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01']);
```

  Y en `money.test.ts`:

```ts
expect(parseAmountInput('1,840.50')).toEqual({ ok: true, value: 184050 });
expect(parseAmountInput('24.5')).toEqual({ ok: true, value: 2450 });
expect(parseAmountInput('1840')).toEqual({ ok: true, value: 184000 });
for (const bad of ['', '0', '0.00', '-5', '1.005', 'abc', '12.3.4']) {
  const r = parseAmountInput(bad);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error.code).toBe('AMOUNT_INVALID');
}
expect(formatMoney(184000, 'PEN')).toBe('S/ 1,840.00');
expect(formatMoney(2450, 'PEN', { sign: 'minus' })).toBe('- S/ 24.50');
expect(formatMoney(50000, 'USD', { sign: 'plus' })).toBe('+ $ 500.00');
expect(formatMoney(5, 'PEN')).toBe('S/ 0.05');
expect(() => formatMoney(-1, 'PEN')).toThrow();
expect(() => formatMoney(1.5, 'PEN')).toThrow();
```

- [ ] **Paso 2:** `npx jest src/lib/dates.test.ts src/domain/money` → FALLA (módulos inexistentes).
- [ ] **Paso 3: Implementar.**
  - `todayInLima`: desplazamiento fijo de −5 h sobre UTC (no depender de `Intl` con zona horaria, que puede no estar disponible en Hermes).
  - Aritmética de fechas con `Date.UTC`.
  - `parseAmountInput`: quitar comas, validar `/^\d+(\.\d{1,2})?$/`, convertir a céntimos con aritmética entera (separar parte entera y decimal; nunca `parseFloat * 100`), exigir > 0 y `Number.isSafeInteger`.
  - `formatMoney`: agrupación de miles manual con coma y 2 decimales.
- [ ] **Paso 4:** `npx jest src/lib src/domain/money` → PASA.
- [ ] **Paso 5: Commit (solo con autorización explícita del usuario).** `feat(domain): dinero y fechas`.

### Tarea 4: Tipos del libro y validación de movimientos

**Archivos:**
- Crear: `src/domain/ledger/types.ts`, `src/domain/ledger/validateMovement.ts`, `src/domain/ledger/validateMovement.test.ts`

**Interfaces:**
- Consume: `Result`, `DomainError`, `IsoDate`, `Currency` (Tarea 3).
- Produce (`types.ts`):

```ts
export type AccountKind = 'wallet' | 'credit_card';
export interface Account { id: string; kind: AccountKind; walletId: string | null; currency: Currency; creditLimitMinor: number | null }
export type MovementType = 'expense' | 'income' | 'transfer' | 'card_payment' | 'opening' | 'adjustment';
export interface Movement {
  id: string; type: MovementType; occurredOn: IsoDate; description: string | null;
  categoryId: string | null; sourceAccountId: string | null; destAccountId: string | null;
  amountMinor: number; currency: Currency; debtId: string | null; declaredBalanceMinor: number | null;
}
export interface Category { id: string; kind: 'expense' | 'income'; systemKey: 'other' | 'loan' | null }
export interface Debt {
  id: string; direction: 'receivable' | 'payable'; currency: Currency; initialPendingMinor: number;
  installmentAmountMinor: number | null; nextDueOn: IsoDate | null;
}
export interface LedgerState { accounts: Account[]; movements: Movement[]; categories: Category[]; debts: Debt[] }
```

- Produce: `validateMovement(movement: Movement, state: LedgerState): Result<Movement>`. Valida solo la forma; los saldos son de la Tarea 7. Al editar, `state` puede contener la versión anterior del mismo `id`, que se ignora.

Reglas (de `DATABASE_SCHEMA.md`, tabla "Reglas por tipo"). Códigos de error:

| Código | Cuándo |
|---|---|
| `AMOUNT_INVALID` | `amountMinor` no es entero seguro > 0 |
| `LEG_INVALID` | tramos presentes/ausentes o tipo de cuenta no permitido para el `type` |
| `ACCOUNT_NOT_FOUND` | cuenta referida inexistente |
| `CURRENCY_MISMATCH` | `currency` distinta de la de alguna cuenta involucrada |
| `SAME_ACCOUNT` | `transfer` con origen = destino |
| `CATEGORY_REQUIRED` / `CATEGORY_NOT_ALLOWED` / `CATEGORY_KIND_MISMATCH` | categoría ausente en `expense`/`income`, presente en otros tipos, o de tipo distinto |
| `DEBT_REQUIRED` / `DEBT_NOT_ALLOWED` / `DEBT_CURRENCY_MISMATCH` | categoría "Préstamo" (`systemKey: 'loan'`) sin deuda, deuda sin esa categoría, o monedas distintas |
| `OPENING_DUPLICATE` | ya existe otra apertura para la misma cuenta |
| `ADJUSTMENT_DECLARED_REQUIRED` | `adjustment` sin `declaredBalanceMinor` ≥ 0 |

- [ ] **Paso 1: Pruebas que fallan.**
  - Crear en el test una fábrica `makeState()` con:
    - cuentas: `yapePen` (wallet, PEN), `yapeUsd` (wallet, USD), `plinPen` (wallet, PEN), `bcpCard` (credit_card, PEN, límite 200000)
    - categorías: `food` (expense), `salary` (income), `loanExp` (expense, `loan`), `loanInc` (income, `loan`)
    - deuda: `carlos` (receivable, PEN)
  - Una prueba por fila de la tabla de códigos. Ejemplos con valores exactos:
    - `transfer` `yapePen → yapePen` → `SAME_ACCOUNT`
    - `transfer` `yapePen → yapeUsd` → `CURRENCY_MISMATCH`
    - `expense` desde `bcpCard` con `food` → ok
    - `income` hacia `bcpCard` → `LEG_INVALID`
    - `expense` con `loanExp` sin `debtId` → `DEBT_REQUIRED`
    - `card_payment` `plinPen → bcpCard` → ok
    - segunda `opening` de `yapePen` → `OPENING_DUPLICATE`
- [ ] **Paso 2:** `npx jest src/domain/ledger/validateMovement` → FALLA.
- [ ] **Paso 3:** Implementar `validateMovement` devolviendo el **primer** error encontrado, en el orden de la tabla.
- [ ] **Paso 4:** `npx jest src/domain/ledger` → PASA.
- [ ] **Paso 5: Commit (solo con autorización explícita del usuario).** `feat(domain): tipos del libro y validación de movimientos`.

### Tarea 5: Saldos

**Archivos:**
- Crear: `src/domain/ledger/balances.ts`, `src/domain/ledger/balances.test.ts`

**Interfaces:**
- Consume: tipos de la Tarea 4; `eachDay` (Tarea 3).
- Produce:
  - `accountBalance(accountId: string, movements: Movement[], upTo?: IsoDate): number` — Σ entradas − Σ salidas con `occurredOn <= upTo`.
  - `dailyClosingBalances(accountId: string, movements: Movement[], from: IsoDate, to: IsoDate): { date: IsoDate; balanceMinor: number }[]` — un elemento por día, incluye todo lo anterior a `from`.
  - `cardConsumed(account: Account, movements: Movement[]): number` = `-accountBalance(...)`.
  - `cardAvailable(account: Account, movements: Movement[]): number` = `creditLimitMinor - consumed`.

- [ ] **Paso 1: Pruebas que fallan.**
  - Apertura de 50000 en `yapePen` el 2026-11-01, gasto de 2450 el 2026-11-16 y transferencia de 10000 hacia `plinPen` el 2026-11-16:
    - `accountBalance(yapePen)` = 37550
    - `accountBalance(plinPen)` = 10000
    - `accountBalance(yapePen, ..., '2026-11-15')` = 50000
  - `dailyClosingBalances(yapePen, ..., '2026-11-15', '2026-11-16')` = `[{ date: '2026-11-15', balanceMinor: 50000 }, { date: '2026-11-16', balanceMinor: 37550 }]`.
  - Gasto de 42000 con `bcpCard` y pago de 12000 desde `plinPen`: `cardConsumed` = 30000 y `cardAvailable` = 170000.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `npx jest src/domain/ledger/balances` → PASA.
- [ ] **Paso 5: Commit (solo con autorización explícita del usuario).** `feat(domain): saldos y saldos diarios`.

### Tarea 6: Deudas

**Archivos:**
- Crear: `src/domain/debts/debts.ts`, `src/domain/debts/debts.test.ts`

**Interfaces:**
- Consume: tipos de la Tarea 4.
- Produce:
  - `debtDelta(debt: Debt, movement: Movement): number` — receivable: `expense` = +monto, `income` = −monto; payable: `income` = +monto, `expense` = −monto; 0 si `movement.debtId !== debt.id`.
  - `debtPending(debt: Debt, movements: Movement[], upTo?: IsoDate): number` = `initialPendingMinor` + Σ `debtDelta`.
  - `debtStatus(debt: Debt, movements: Movement[]): 'pending' | 'paid'` (`paid` cuando el pendiente es 0).

- [ ] **Paso 1: Pruebas que fallan** (tabla de `FINANCIAL_RULES.md` §7):
  - `carlos` (receivable): gasto Préstamo de 15000 y luego ingreso Préstamo de 5000 → pendiente 10000, `pending`; tras otro ingreso de 10000 → 0, `paid`.
  - `interbank` (payable, `initialPendingMinor` 89000): gasto Préstamo de 44500 → 44500.
  - Un movimiento con otro `debtId` no altera el pendiente.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `npx jest src/domain/debts` → PASA.
- [ ] **Paso 5: Commit (solo con autorización explícita del usuario).** `feat(domain): deudas y préstamos`.

### Tarea 7: Validación en el tiempo

**Archivos:**
- Crear: `src/domain/ledger/timeline.ts`, `src/domain/ledger/timeline.test.ts`

**Interfaces:**
- Consume: `validateMovement` (T4), `dailyClosingBalances` y `accountBalance` (T5), `debtPending` (T6), `eachDay` (T3).
- Produce:

```ts
export type LedgerChange =
  | { kind: 'create'; movement: Movement }
  | { kind: 'update'; movement: Movement }        // mismo id, nueva versión
  | { kind: 'delete'; movementId: string };
export type ViolationCode = 'WALLET_NEGATIVE' | 'CARD_OVER_LIMIT' | 'CARD_OVERPAID' | 'DEBT_NEGATIVE';
export interface Violation { code: ViolationCode; entityId: string; date: IsoDate; shortfallMinor: number }
export function checkChange(change: LedgerChange, state: LedgerState, today: IsoDate): Result<Movement[]>;
```

  Si todo es válido, devuelve la lista de movimientos resultante. Si no, `error.code = 'TIMELINE_VIOLATION'` y `error.details = { violations: Violation[] }`, con la primera violación por entidad y un `message` en español con el monto faltante formateado.

Algoritmo (la especificación no fija el detalle):
1. Para `create`/`update`, ejecutar primero `validateMovement`; si falla, devolver ese error.
2. Construir la lista resultante de movimientos aplicando el cambio.
3. Las entidades afectadas son las cuentas origen/destino y la deuda de la versión anterior **y** de la nueva.
4. Para cada entidad afectada, recorrer `eachDay(primera fecha de sus movimientos, today)` con los saldos al cierre de cada día (o el pendiente, en deudas):
   - billetera < 0 → `WALLET_NEGATIVE`, faltante = −saldo
   - tarjeta: consumido > límite → `CARD_OVER_LIMIT`, faltante = consumido − límite; consumido < 0 → `CARD_OVERPAID`, faltante = −consumido
   - deuda: pendiente < 0 → `DEBT_NEGATIVE`, faltante = −pendiente
5. Los movimientos con fecha futura se incluyen hasta su fecha: recorrer hasta `max(today, última fecha)`.

- [ ] **Paso 1: Pruebas que fallan:**
  - Saldo 0; ingreso de 10000 y gasto de 8000 el mismo día → ok (punto de atención 3).
  - Ingreso de 10000 el 2026-11-10 y gasto de 8000 el 2026-11-12; `update` del gasto a fecha 2026-11-05 → violación `WALLET_NEGATIVE`, `date: '2026-11-05'`, `shortfallMinor: 8000` (punto de atención 4).
  - Eliminar el ingreso de ese escenario → `WALLET_NEGATIVE` el 2026-11-12, faltante 8000.
  - Gasto con tarjeta de 210000 sobre una línea de 200000 → `CARD_OVER_LIMIT`, faltante 10000.
  - `card_payment` de 5000 sobre una tarjeta con consumido 0 → `CARD_OVERPAID` (en la tarjeta), faltante 5000.
  - Ingreso Préstamo de 20000 sobre `carlos` con pendiente 15000 → `DEBT_NEGATIVE`, faltante 5000.
  - `update` que mueve un gasto de `yapePen` a `plinPen` revisa ambas cuentas.
  - Un `create` con forma inválida devuelve el código de la Tarea 4, no `TIMELINE_VIOLATION`.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `npx jest src/domain/ledger/timeline` → PASA.
- [ ] **Paso 5: Commit (solo con autorización explícita del usuario).** `feat(domain): validación de saldo en el tiempo`.

### Tarea 8: Apertura y "Arreglo de billetera"

**Archivos:**
- Crear: `src/domain/ledger/builders.ts`, `src/domain/ledger/builders.test.ts`

**Interfaces:**
- Consume: tipos (T4), `accountBalance` (T5).
- Produce:
  - `buildOpening(input: { id: string; account: Account; amountMinor: number; occurredOn: IsoDate }): Movement` — billetera: `dest` = cuenta; tarjeta: `source` = cuenta.
  - `buildAdjustment(input: { id: string; account: Account; declaredMinor: number; occurredOn: IsoDate; movements: Movement[] }): Result<Movement | null>` — diferencia = declarado − saldo al cierre de `occurredOn`. Si sube, `dest` = cuenta; si baja, `source` = cuenta. Devuelve `null` si la diferencia es 0. `AMOUNT_INVALID` si lo declarado no es entero ≥ 0.

- [ ] **Paso 1: Pruebas que fallan:**
  - Saldo 37550 y declarado 30000 → `type: 'adjustment'`, `sourceAccountId: yapePen`, `amountMinor: 7550`, `declaredBalanceMinor: 30000`.
  - Declarado 40000 → `destAccountId: yapePen`, `amountMinor: 2450`.
  - Declarado 37550 → `null`.
  - Declarado −1 → `AMOUNT_INVALID`.
  - `buildOpening` de una tarjeta con 30000 → `sourceAccountId: bcpCard`, `categoryId: null`.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `npx jest src/domain/ledger/builders` → PASA.
- [ ] **Paso 5: Commit (solo con autorización explícita del usuario).** `feat(domain): apertura y arreglo de billetera`.

### Tarea 9: Reportes de Inicio

**Archivos:**
- Crear: `src/domain/reports/home.ts`, `src/domain/reports/home.test.ts`

**Interfaces:**
- Consume: T3, T4, T5, T6.
- Produce:
  - `interface DateRange { start: IsoDate; end: IsoDate }` (inclusive)
  - `homeSummary(state: LedgerState, walletAccountIds: string[], period: DateRange): Partial<Record<Currency, { availableMinor: number; spentMinor: number; remainingMinor: number }>>`
    - restante = saldo actual de las cuentas al `period.end`
    - gastado = Σ `expense` con origen en esas cuentas dentro del periodo
    - disponible = restante + gastado
    - Solo aparecen las monedas que tienen cuentas en el alcance.
  - `expensesByCategory(state: LedgerState, accountIds: string[], period: DateRange, currency: Currency): { categoryId: string; totalMinor: number }[]` — ordenado de mayor a menor.
  - `dailyBalanceSeries(state: LedgerState, walletAccountIds: string[], currency: Currency, period: DateRange): { date: IsoDate; balanceMinor: number }[]`
  - `netChange(state: LedgerState, walletAccountIds: string[], currency: Currency, period: DateRange): number` = saldo al cierre de `period.end` − saldo al cierre del día anterior a `period.start` (es el "+ S/ 1,015.50" de "Flujo del mes").
  - `projectedRemaining(state: LedgerState, walletAccountIds: string[], cardAccountIds: string[], currency: Currency, today: IsoDate): number` = restante − Σ consumido de las tarjetas − Σ `min(cuota, pendiente)` de las deudas `payable` con `nextDueOn <= endOfMonth(today)` y pendiente > 0.
  - `isBelowThreshold(balanceMinor: number, thresholdMinor: number | null): boolean`

**Decisiones de este plan** (la especificación no las fija; quedan anotadas para que el usuario las vea):
- El "Saldo gastado" del resumen cuenta solo los gastos pagados **desde billeteras** del alcance. Las compras con tarjeta no salieron de una billetera, así que no se suman en el resumen: aparecen en la proyección y en "Gastos del mes".
- `expensesByCategory` recibe la lista de cuentas. En el Saldo general, la interfaz pasará las billeteras marcadas más las tarjetas visibles.

- [ ] **Paso 1: Pruebas que fallan** (periodo 2026-11-01 a 2026-11-30):
  - Billeteras `yape` y `plin`: aperturas de 50000 y 21000 el 1/11; gastos de 2450, 1800 y 11280; ingreso de 50000; transferencia `yape → plin` de 10000.
    - restante = 105470
    - gastado = 15530
    - disponible = 121000
  - El mismo escenario con alcance solo `plin`: la transferencia entrante suma al restante sin sumar al gastado, y disponible = restante + gastado.
  - `netChange` de ese escenario (alcance `yape` + `plin`): el saldo al cierre del 31/10 es 0, así que da 105470.
  - `expensesByCategory` con gastos `food` 2450 + 1800 y `services` 11280 → `[{ categoryId: 'services', totalMinor: 11280 }, { categoryId: 'food', totalMinor: 4250 }]`.
  - Proyección:
    - restante 100000, tarjeta con consumido 30000 y deuda payable con cuota 20000 y `nextDueOn` 2026-11-25 → `projectedRemaining` = 50000
    - con `nextDueOn` 2026-12-05 → 70000
  - Umbral: `isBelowThreshold(29999, 30000)` = true; `isBelowThreshold(30000, 30000)` = false; `isBelowThreshold(1, null)` = false.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `npx jest src/domain/reports` → PASA.
- [ ] **Paso 5: Commit (solo con autorización explícita del usuario).** `feat(domain): reportes de Inicio`.

### Tarea 10: Periodos mensuales

**Archivos:**
- Crear: `src/domain/periods/periods.ts`, `src/domain/periods/periods.test.ts`

**Interfaces:**
- Consume: T3; `DateRange` (T9).
- Produce:
  - `interface FinancialPeriod { id: string; month: string; startedOn: IsoDate | null; confirmedAt: string | null; dismissedAt: string | null }`
  - `shouldSuggestNewPeriod(periods: FinancialPeriod[], today: IsoDate): boolean`
  - `activePeriodRange(periods: FinancialPeriod[], today: IsoDate): DateRange`

**Decisiones de este plan** (para completar `FINANCIAL_RULES.md` §10; el usuario puede corregirlas):
- La sugerencia aparece si no hay un periodo confirmado para el mes de `today`. Tras descartarla, vuelve a aparecer **al día siguiente** (`dismissedAt` de un día anterior a `today`).
- Si nunca se confirmó un periodo (primer uso), el periodo activo va del día 1 del mes actual hasta hoy.
- Si hay periodos confirmados, el activo es el último con `startedOn <= today` y va de `startedOn` hasta `today`.

- [ ] **Paso 1: Pruebas que fallan:**
  - Sin periodos y `today` 2026-11-17 → sugerir `true`; rango `{ start: '2026-11-01', end: '2026-11-17' }`.
  - Noviembre confirmado con `startedOn` 2026-11-01 y `today` 2026-12-02 → sugerir `true`; rango `{ start: '2026-11-01', end: '2026-12-02' }` (el periodo anterior sigue activo).
  - Diciembre descartado el 2026-12-02 y `today` 2026-12-02 → `false`; `today` 2026-12-03 → `true`.
  - Diciembre confirmado con `startedOn` 2026-12-03 → rango desde 2026-12-03.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `npx jest src/domain/periods` → PASA.
- [ ] **Paso 5: Commit (solo con autorización explícita del usuario).** `feat(domain): periodos mensuales`.

### Tarea 11: Eliminación de categorías

**Archivos:**
- Crear: `src/domain/categories/categories.ts`, `src/domain/categories/categories.test.ts`

**Interfaces:**
- Consume: tipos (T4).
- Produce: `planCategoryDeletion(categoryId: string, state: LedgerState): Result<{ reassignToCategoryId: string; movementIds: string[] }>`
  - Errores: `CATEGORY_NOT_FOUND`; `CATEGORY_PROTECTED` si `systemKey` no es null; `SYSTEM_CATEGORY_MISSING` si no existe "Otros" del mismo `kind`.
  - Los movimientos reasignados van a "Otros" del mismo tipo (gasto o ingreso).

- [ ] **Paso 1: Pruebas que fallan:**
  - Eliminar `food` con 2 movimientos → `reassignToCategoryId` = "Otros" de gasto y los 2 ids.
  - Eliminar "Otros" o "Préstamo" → `CATEGORY_PROTECTED`.
  - Una categoría sin movimientos → lista vacía.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `npm test` (toda la suite) y `npm run typecheck` → PASA, sin errores.
- [ ] **Paso 5: Revisión de pureza:** `grep -rE "from '(react-native|expo|@powersync|@supabase)" src/domain` → sin resultados.
- [ ] **Paso 6: Commit (solo con autorización explícita del usuario).** `feat(domain): eliminación de categorías`.

---

## Al terminar el plan
- Actualizar `docs/progress/CURRENT_STATUS.md` (9 secciones), `COMPLETED_TASKS.md`, `PENDING_TASKS.md` y `DEVELOPMENT_ROADMAP.md` (Fases 3 y 4).
- Registrar en `DECISIONS.md` las "Decisiones de este plan" de las Tareas 9 y 10 si el usuario las confirma.
- Siguiente plan: Fase 5, base local PowerSync (tablas solo locales + `viewName`) y repositorios que usen `checkChange` antes de escribir.
