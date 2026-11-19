# Fase 5 — Base local PowerSync y repositorios: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que FinKash guarde y lea todos sus datos en SQLite local (PowerSync, sin servidor) a través de repositorios que aplican las reglas del dominio ya existente.

**Arquitectura:**
- Una interfaz mínima `LocalDb` (los cuatro métodos de PowerSync que usamos) separa los repositorios del motor: en la app es `PowerSyncDatabase` (op-sqlite); en las pruebas, una base real en Node.
- Esquema cliente con tablas **solo locales** (`localOnly`) más su gemela sincronizable, intercambiables con `viewName` (patrón de `DATABASE_SCHEMA.md`). En esta fase solo se activa el modo local; la sincronización es la Fase 9.
- Cada escritura va dentro de `writeTransaction`: se lee el `LedgerState` **dentro** de la transacción, se valida con `checkChange`/`validateMovement` y se escribe. Si algo falla, no se guarda nada.

**Stack:** `@powersync/react-native`, `@op-engineering/op-sqlite`, Zod, `expo-crypto` (UUID), Jest (`jest-expo`) y `@powersync/node` solo para pruebas.

**Especificación (leer junto con este plan):** `docs/DATABASE_SCHEMA.md`, `docs/ARCHITECTURE.md`, `docs/FINANCIAL_RULES.md`, `CLAUDE.md` y el plan anterior `docs/superpowers/plans/2026-11-17-fundacion-y-dominio.md` (dominio ya implementado en `src/domain/`).

## Restricciones globales
- Idioma: comentarios, mensajes al usuario y documentación en español; nombres técnicos en inglés.
- **Nunca commit sin autorización explícita; push requiere otra aparte.** Este plan tiene autorizado el commit local al cerrar cada tarea (instrucción del usuario, 2026-11-17, vigente); nada de `push`. No crear ni cambiar ramas.
- Instalar paquetes solo con `npx expo install <paquete>`; verificar APIs con Context7. **No agregar `expo-sqlite`.**
- Dinero: `integer` en SQLite (unidades mínimas) + `currency` `'PEN' | 'USD'`; nunca flotantes. Fechas de movimiento: texto `YYYY-MM-DD`. Booleanos: `integer` 0/1. Marcas de tiempo: texto ISO UTC.
- PowerSync agrega la columna `id` (texto, UUID) a toda tabla; **no se declara** en el esquema.
- Eliminación física (sin `deleted_at`). Las billeteras nunca se eliminan: solo se ocultan.
- `src/domain/` no importa nada de `src/data/`, React Native, Expo, PowerSync ni Supabase. Las features nunca tocan SQL: pasan por repositorios.
- `user_id` queda `null` mientras no haya cuenta.
- Al terminar cada tarea: `npm test`, `npm run typecheck` y `npx expo lint` en verde.

## Review Focus
Casos que la especificación implica y que tendrán prueba en la tarea indicada:
1. **Cierre o error a mitad de una escritura** (p. ej. eliminar categoría: reasignar y borrar): no queda nada a medias; se revierte todo (Tarea 5).
2. **Dos gastos simultáneos que juntos dejarían la billetera en negativo** (doble toque en Guardar): el segundo se rechaza porque se valida dentro de la transacción (Tarea 8).
3. **La app se abre dos veces** (o la semilla corre dos veces): no se duplican "Otros", "Préstamo" ni "Devolución / Reembolso" (Tarea 3).
4. **Cambio de día en Lima durante el uso**: "hoy" sale del reloj inyectado al momento de escribir; a las 22:00 del 30/11 en Lima el día es `2026-11-30` (Tarea 8).
5. **Fila corrupta en la base** (monto decimal o texto no numérico): el lector la rechaza con error claro en vez de calcular saldos erróneos (Tarea 3).

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/data/local/db.ts` | Interfaces `LocalDb`, `LocalTx`, `SqlReader` |
| `src/data/local/schema.ts` | `buildSchema(mode)` con tablas locales/sincronizables y `viewName` |
| `src/data/local/database.ts` | Instancia `PowerSyncDatabase` (op-sqlite) y `openLocalDatabase()` |
| `src/data/local/testDb.ts` | Base real en Node para pruebas (`createTestDb()`) |
| `src/data/local/seed.ts` | Semillas idempotentes: categorías de sistema y `device_settings` |
| `src/data/local/ledgerState.ts` | Lectura de filas → `LedgerState` y registros (con validación) |
| `src/data/types.ts` | Registros de datos (`CategoryRecord`, `WalletRecord`, `DebtRecord`…), `Clock`, `IdGen` |
| `src/lib/id.ts` | `newId(): string` (UUID v4 con `expo-crypto`) |
| `src/validation/*.ts` | Esquemas Zod de las entradas de los repositorios |
| `src/data/repositories/*.ts` | `categories`, `wallets`, `debts`, `movements`, `periods`, `settings` |
| `src/app/_layout.tsx` | `PowerSyncContext.Provider` y arranque con semilla |

Las pruebas van junto a cada archivo (`*.test.ts`).

---

### Tarea 1: Dependencias y arnés de pruebas con SQLite real

**Archivos:**
- Modificar: `package.json`, `package-lock.json`, `jest` config en `package.json`
- Crear: `src/data/local/db.ts`, `src/data/local/testDb.ts` (esqueleto), `src/data/local/testDb.test.ts`, `src/lib/id.ts`, `src/lib/id.test.ts`

**Interfaces:**
- Produce (`db.ts`):

```ts
export interface SqlReader {
  getAll<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getOptional<T>(sql: string, params?: unknown[]): Promise<T | null>;
}
export interface LocalTx extends SqlReader { execute(sql: string, params?: unknown[]): Promise<unknown> }
export interface LocalDb extends LocalTx {
  writeTransaction<T>(fn: (tx: LocalTx) => Promise<T>): Promise<T>;
}
```

- Produce: `newId(): string` en `src/lib/id.ts`.

- [ ] **Paso 1:** `npx expo install @powersync/react-native @op-engineering/op-sqlite zod expo-crypto` y luego los peers que indique `npm ls`/el aviso de instalación de `@powersync/react-native` (verificar con Context7 / `package.json` del paquete). `@powersync/node` va solo como dependencia de desarrollo (`npx expo install @powersync/node` y mover con `npm install --save-dev @powersync/node@<versión>`).
- [ ] **Paso 2: Prueba que falla** `src/data/local/testDb.test.ts` (con `/** @jest-environment node */` al inicio): `createTestDb()` crea una base en memoria/temporal con un esquema mínimo de prueba, `execute('INSERT …')` y `getAll('SELECT …')` devuelven la fila; `writeTransaction` con un `throw` interno revierte la inserción.
- [ ] **Paso 3:** `npx jest src/data/local/testDb` → FALLA (módulo inexistente).
- [ ] **Paso 4:** Implementar `db.ts` y `createTestDb(schema?: Schema): Promise<LocalDb & { close(): Promise<void> }>` con `@powersync/node` (archivo temporal único por llamada, borrado en `close`). Ajustar la configuración de Jest solo si hace falta para que los tests con entorno `node` resuelvan el binario nativo.
  - **Alternativa si `@powersync/node` no funciona bajo `jest-expo` tras un intento razonable:** implementar `createTestDb` sobre `better-sqlite3` con el mismo `LocalDb`, creando las tablas con DDL generado desde `schema.ts` (Tarea 2). Anotar la decisión en `DECISIONS.md`.
- [ ] **Paso 5:** `newId()` con `randomUUID()` de `expo-crypto`; prueba: devuelve UUID v4 válido (regex) y dos llamadas distintas (si `expo-crypto` no corre bajo Jest, mockear en `jest.setup`).
- [ ] **Paso 6:** Verificar `npm test`, `typecheck`, `lint` y que la app compile con el módulo nativo nuevo (`op-sqlite`): recompilar el development build (`npx expo run:android --device emulator-5554 --no-bundler`, con `JAVA_HOME` en JDK 17, en segundo plano) y confirmar que la app sigue abriendo.
- [ ] **Paso 7: Commit.** `chore(data): dependencias de PowerSync y arnés de pruebas con SQLite`.

### Tarea 2: Esquema cliente y apertura de la base

**Archivos:**
- Crear: `src/data/local/schema.ts`, `src/data/local/schema.test.ts`, `src/data/local/database.ts`

**Interfaces:**
- Consume: `LocalDb`, `createTestDb`.
- Produce: `buildSchema(mode: 'local' | 'synced'): Schema` y `openLocalDatabase(): PowerSyncDatabase` (singleton con `dbFilename: 'finkash.db'`, **sin** llamar a `connect()`).

Columnas (de `DATABASE_SCHEMA.md`; `id` implícito; todas `text` salvo indicación; `integer` = entero/booleano):
- `wallets`: `user_id`, `name`, `wallet_type`, `icon`, `color`, `is_hidden` (integer), `include_in_general` (integer), `sort_order` (integer), `created_at`, `updated_at`
- `accounts`: `user_id`, `kind`, `wallet_id`, `currency`, `created_at`, `updated_at`
- `credit_cards` (`id` = id de la cuenta): `user_id`, `name`, `issuer`, `icon`, `color`, `credit_limit_minor` (integer), `closing_day` (integer), `due_day` (integer), `is_hidden` (integer), `created_at`, `updated_at`
- `debts`: `user_id`, `direction`, `counterparty_name`, `counterparty_type`, `currency`, `initial_pending_minor` (integer), `due_on`, `installment_amount_minor` (integer), `installments_remaining` (integer), `next_due_on`, `notes`, `created_at`, `updated_at`
- `categories`: `user_id`, `kind`, `name`, `color`, `icon`, `system_key`, `sort_order` (integer), `created_at`, `updated_at`
- `movements`: `user_id`, `type`, `occurred_on`, `description`, `category_id`, `source_account_id`, `dest_account_id`, `amount_minor` (integer), `currency`, `debt_id`, `declared_balance_minor` (integer), `created_at`, `updated_at`
- `financial_periods`: `user_id`, `month`, `started_on`, `confirmed_at`, `dismissed_at`, `created_at`, `updated_at`
- `balance_thresholds`: `user_id`, `currency`, `amount_minor` (integer), `wallet_id`, `created_at`, `updated_at`
- `device_settings` (solo local, sin gemela sincronizable): `hide_amounts` (integer), `show_projection` (integer), `home_scope` (text)

Regla de nombres: en modo `local`, la tabla local se llama `local_<nombre>` con `viewName: '<nombre>'` y la sincronizable `inactive_synced_<nombre>` con `viewName` propio (`inactive_synced_<nombre>`); en modo `synced` se invierten. Las consultas usan siempre `<nombre>`.

- [ ] **Paso 1: Prueba que falla** (`schema.test.ts`, entorno node, con `createTestDb(buildSchema('local'))`): insertar y leer una fila en `movements`, `wallets`, `credit_cards` y `device_settings`; los nombres `local_movements` e `inactive_synced_movements` existen y `movements` es la vista de la local; en `buildSchema('synced')` `movements` apunta a la sincronizable; un monto `INTEGER` de 9007199254740991 vuelve igual.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar `buildSchema` con una lista declarativa de tablas (una sola definición de columnas por tabla, usada por ambas gemelas) y `openLocalDatabase`.
- [ ] **Paso 4:** `npx jest src/data/local` → PASA.
- [ ] **Paso 5: Commit.** `feat(data): esquema cliente local con viewName`.

### Tarea 3: Registros, semilla y lectura del `LedgerState`

**Archivos:**
- Crear: `src/data/types.ts`, `src/data/local/seed.ts`, `src/data/local/seed.test.ts`, `src/data/local/ledgerState.ts`, `src/data/local/ledgerState.test.ts`

**Interfaces:**
- Consume: `LocalDb`, `SqlReader`, tipos de `src/domain/ledger/types.ts`, `newId`.
- Produce (`types.ts`):

```ts
export type Clock = () => Date;
export type IdGen = () => string;
export interface CategoryRecord extends Category { name: string; color: string; icon: string; sortOrder: number }
export interface WalletRecord { id: string; name: string; walletType: 'cash'|'bank'|'digital'|'other'; icon: string; color: string; isHidden: boolean; includeInGeneral: boolean; sortOrder: number }
export interface CardRecord { accountId: string; name: string; issuer: string | null; icon: string; color: string; creditLimitMinor: number; closingDay: number | null; dueDay: number | null; isHidden: boolean }
export interface DebtRecord extends Debt { counterpartyName: string; counterpartyType: 'person'|'institution'; dueOn: IsoDate | null; installmentsRemaining: number | null; notes: string | null }
```

- Produce: `seedDatabase(db: LocalDb, deps?: { newId?: IdGen; clock?: Clock }): Promise<void>`; `loadLedgerState(reader: SqlReader): Promise<LedgerState>`.

Semilla: categorías de sistema `Otros` (`other`), `Préstamo` (`loan`) y `Devolución / Reembolso` (`systemKey` null pero creada por la semilla), cada una en versión `expense` e `income`, y una fila de `device_settings` con `hide_amounts 0`, `show_projection 0`, `home_scope 'general'`. Idempotente: no inserta lo que ya existe (clave: `kind` + `system_key`, o `kind` + `name` para "Devolución / Reembolso").

`loadLedgerState` une `accounts` con `credit_cards` (`creditLimitMinor`) y valida cada fila: montos enteros seguros, monedas `PEN|USD`, tipos conocidos; ante una fila inválida lanza `Error` con el id y la columna.

- [ ] **Paso 1: Pruebas que fallan:**
  - Semilla en base vacía → 6 categorías (3 por tipo), 1 `device_settings`; ejecutarla **dos veces** → siguen siendo 6 y 1 (punto de atención 3).
  - `loadLedgerState` con filas insertadas a mano (1 billetera PEN, 1 tarjeta con línea 200000, 1 movimiento) → `accounts` con `kind`, `walletId`, `currency`, `creditLimitMinor` correctos y `movements` con los campos del dominio (`debtId` y `declaredBalanceMinor` en `null`).
  - Fila con `amount_minor = 10.5` → lanza un error que menciona `movements`, el id y `amount_minor` (punto de atención 5); lo mismo con `currency = 'EUR'`.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar. El mapeo fila → dominio vive en `ledgerState.ts` y se exporta para que los repositorios lo reutilicen.
- [ ] **Paso 4:** `npx jest src/data` → PASA.
- [ ] **Paso 5: Commit.** `feat(data): semilla y lectura del estado del libro`.

### Tarea 4: Validación de entradas con Zod

**Archivos:**
- Crear: `src/validation/inputs.ts`, `src/validation/inputs.test.ts`

**Interfaces:**
- Produce (esquemas Zod y tipos inferidos): `categoryInput` (`kind`, `name` 1–40 caracteres sin espacios sobrantes, `color` `#RRGGBB`, `icon` no vacío), `walletInput` (`name` 1–40, `walletType`, `icon`, `color`, `currencies: ('PEN'|'USD')[]` de 1 a 2 distintas), `cardInput` (`name`, `issuer?`, `icon`, `color`, `currency`, `creditLimitMinor` entero seguro > 0, `closingDay?`/`dueDay?` enteros 1–31), `debtInput` (`direction`, `counterpartyName` 1–60, `counterpartyType`, `currency`, `initialPendingMinor` entero ≥ 0, `installmentAmountMinor?`, `nextDueOn?` y `dueOn?` `IsoDate` válidas), `thresholdInput` (`currency`, `amountMinor` entero > 0, `walletId?`), y `parseOrError<T>(schema, value): Result<T>` que convierte el error de Zod en `DomainError` con `code: 'INPUT_INVALID'`, mensaje en español y `details.fields`.

- [ ] **Paso 1: Pruebas que fallan:** nombre vacío o de 41 caracteres → `INPUT_INVALID` con el campo `name`; color `red` o `#12345` → inválido; `#1A2B3C` → válido; billetera con `currencies: []` o `['PEN','PEN']` → inválida; tarjeta con límite 0 o 1.5 → inválida; `dueDay: 32` → inválido; deuda con `nextDueOn: '2026-02-30'` → inválida (la fecha debe existir en el calendario); umbral `0` → inválido.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar (mensajes en español; la validación de fecha usa `Date.UTC` y compara componentes).
- [ ] **Paso 4:** `npx jest src/validation` → PASA.
- [ ] **Paso 5: Commit.** `feat(validation): esquemas de entrada con Zod`.

### Tarea 5: Repositorio de categorías

**Archivos:**
- Crear: `src/data/repositories/categories.ts`, `src/data/repositories/categories.test.ts`

**Interfaces:**
- Consume: `LocalDb`, `loadLedgerState`, `planCategoryDeletion` (dominio), `categoryInput`, `IdGen`/`Clock`.
- Produce:

```ts
export function createCategoryRepository(db: LocalDb, deps?: { newId?: IdGen; clock?: Clock }): {
  list(): Promise<CategoryRecord[]>;                       // por sort_order, luego name
  create(input: CategoryInput): Promise<Result<CategoryRecord>>;
  update(id: string, input: Pick<CategoryInput, 'color' | 'icon'> & { name?: string }): Promise<Result<CategoryRecord>>; // categorías de sistema: solo color e ícono
  remove(id: string): Promise<Result<{ reassigned: number }>>;
};
```

- [ ] **Paso 1: Pruebas que fallan** (base de prueba + `seedDatabase`):
  - `create` de "Comida" (gasto) → aparece en `list()` con `systemKey: null`; nombre duplicado en el mismo tipo → `CATEGORY_DUPLICATE`.
  - `update` de "Otros" con otro nombre → `CATEGORY_PROTECTED`; cambiando solo `color` → ok.
  - `remove` de "Comida" con 2 movimientos → ambos pasan a "Otros" de gasto, la categoría desaparece y `reassigned` = 2.
  - `remove` de "Préstamo" → `CATEGORY_PROTECTED`; id inexistente → `CATEGORY_NOT_FOUND`.
  - **Atomicidad (punto de atención 1):** forzar un fallo después de la reasignación (p. ej. inyectando una `Clock` que lanza al tocar el borrado, o un disparador SQL de prueba que aborta el `DELETE`) → tras el error la categoría sigue existiendo y los movimientos **conservan** su categoría original.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar; `remove` hace plan + reasignación + borrado dentro de una sola `writeTransaction`, leyendo el estado con el `tx`.
- [ ] **Paso 4:** `npx jest src/data/repositories/categories` → PASA.
- [ ] **Paso 5: Commit.** `feat(data): repositorio de categorías`.

### Tarea 6: Repositorio de billeteras, cuentas y tarjetas

**Archivos:**
- Crear: `src/data/repositories/wallets.ts`, `src/data/repositories/wallets.test.ts`

**Interfaces:**
- Consume: `buildOpening`, `validateMovement` (dominio), `walletInput`, `cardInput`, `loadLedgerState`.
- Produce:

```ts
export function createWalletRepository(db: LocalDb, deps?: { newId?: IdGen; clock?: Clock }): {
  listWallets(): Promise<WalletRecord[]>;                  // incluye ocultas; orden por sort_order
  listAccounts(): Promise<Account[]>;
  createWallet(input: WalletInput & { openings?: Partial<Record<Currency, number>> }): Promise<Result<{ wallet: WalletRecord; accounts: Account[] }>>;
  setHidden(walletId: string, hidden: boolean): Promise<Result<WalletRecord>>;
  setIncludeInGeneral(walletId: string, include: boolean): Promise<Result<WalletRecord>>;
  createCard(input: CardInput & { previousConsumedMinor?: number }): Promise<Result<{ card: CardRecord; account: Account }>>;
  listCards(): Promise<CardRecord[]>;
  setCardHidden(accountId: string, hidden: boolean): Promise<Result<CardRecord>>;
};
```

`createWallet` crea la billetera, una cuenta por moneda y, si hay `openings`, un movimiento `opening` por cuenta (fecha = hoy en Lima), todo en una transacción. `createCard` crea la cuenta `credit_card`, su fila de tarjeta y, si `previousConsumedMinor` > 0, la apertura de consumo previo. No existe `delete`.

- [ ] **Paso 1: Pruebas que fallan:**
  - Billetera "Yape" con `currencies: ['PEN','USD']` y `openings: { PEN: 50000 }` → 1 billetera, 2 cuentas, 1 movimiento `opening` hacia la cuenta PEN por 50000 con la fecha de hoy.
  - Apertura 0 o negativa en `openings` → `AMOUNT_INVALID` y no se crea nada (transacción revertida).
  - Tarjeta BCP, límite 200000, consumo previo 30000 → cuenta `credit_card`, `creditLimitMinor` 200000 y apertura con `sourceAccountId` = la cuenta.
  - Consumo previo mayor al límite → error `CARD_OVER_LIMIT` y nada creado.
  - `setHidden(true)` mantiene la billetera en `listWallets()` con `isHidden: true`; un movimiento posterior sigue contando en su saldo; no hay forma de borrarla (la interfaz no lo expone).
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `npx jest src/data/repositories/wallets` → PASA.
- [ ] **Paso 5: Commit.** `feat(data): repositorio de billeteras y tarjetas`.

### Tarea 7: Repositorio de deudas

**Archivos:**
- Crear: `src/data/repositories/debts.ts`, `src/data/repositories/debts.test.ts`

**Interfaces:**
- Consume: `debtPending`, `debtStatus` (dominio), `debtInput`, `loadLedgerState`.
- Produce:

```ts
export function createDebtRepository(db: LocalDb, deps?: { newId?: IdGen; clock?: Clock }): {
  list(): Promise<(DebtRecord & { pendingMinor: number; status: 'pending' | 'paid' })[]>;
  create(input: DebtInput): Promise<Result<DebtRecord>>;
  update(id: string, patch: Partial<Pick<DebtInput, 'counterpartyName' | 'installmentAmountMinor' | 'nextDueOn' | 'dueOn'>> & { installmentsRemaining?: number | null; notes?: string | null }): Promise<Result<DebtRecord>>;
};
```

No se elimina una deuda con movimientos vinculados; borrar deudas queda fuera de esta fase. Una deuda que ya existía se crea con `initialPendingMinor` > 0 y **sin** mover ninguna billetera.

- [ ] **Paso 1: Pruebas que fallan:**
  - Crear `interbank` (`payable`, `initialPendingMinor` 89000, cuota 44500, `nextDueOn` 2026-11-25) → `list()` devuelve `pendingMinor` 89000, estado `pending` y no se creó ningún movimiento.
  - Después de un gasto Préstamo de 44500 vinculado → `pendingMinor` 44500 (el movimiento se crea en la Tarea 8; aquí insertar la fila a mano).
  - Deuda `receivable` nueva con `initialPendingMinor` 0 → pendiente 0 y estado `paid` hasta que haya movimientos.
  - Moneda inválida o monto inicial negativo → `INPUT_INVALID`.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `npx jest src/data/repositories/debts` → PASA.
- [ ] **Paso 5: Commit.** `feat(data): repositorio de deudas`.

### Tarea 8: Repositorio de movimientos

**Archivos:**
- Crear: `src/data/repositories/movements.ts`, `src/data/repositories/movements.test.ts`

**Interfaces:**
- Consume: `checkChange`, `LedgerChange`, `buildAdjustment`, `loadLedgerState`, `todayInLima`, `newId`, `Clock`.
- Produce:

```ts
export type MovementDraft = Omit<Movement, 'id'>;
export function createMovementRepository(db: LocalDb, deps?: { newId?: IdGen; clock?: Clock }): {
  list(filter?: { from?: IsoDate; to?: IsoDate; accountId?: string; categoryId?: string }): Promise<Movement[]>; // más recientes primero (occurred_on desc, created_at desc)
  create(draft: MovementDraft): Promise<Result<Movement>>;
  update(id: string, draft: MovementDraft): Promise<Result<Movement>>;
  remove(id: string): Promise<Result<void>>;
  adjustWallet(input: { accountId: string; declaredMinor: number; occurredOn?: IsoDate }): Promise<Result<Movement | null>>;
};
```

Cada método abre **una** `writeTransaction`, lee el estado con `loadLedgerState(tx)`, llama a `checkChange(change, state, todayInLima(clock()))` y solo si es válido escribe. Si el resultado es un error, se devuelve tal cual (`TIMELINE_VIOLATION` incluido) y no se escribe nada. `created_at`/`updated_at` salen del reloj.

- [ ] **Paso 1: Pruebas que fallan** (base de prueba, semilla, billeteras y reloj fijo `2026-11-20T15:00:00Z`):
  - Ingreso 10000 y gasto 8000 el mismo día con saldo 0 → ambos `ok` (punto de atención 3 del plan anterior).
  - Gasto de 8000 sin fondos → `TIMELINE_VIOLATION` con `WALLET_NEGATIVE`, y `list()` sigue vacío.
  - `update` que mueve un gasto antes del ingreso que lo cubría → error con la fecha y el faltante, y el movimiento conserva su fecha original.
  - `remove` del ingreso que cubría un gasto posterior → error; `remove` del gasto → ok.
  - **Concurrencia (punto de atención 2):** saldo 10000; `Promise.all` de dos gastos de 8000 → exactamente uno `ok` y uno `TIMELINE_VIOLATION`; saldo final 2000.
  - **Día de Lima (punto de atención 4):** con reloj `2026-12-01T03:00:00Z`, una compra con fecha `2026-11-30` es válida y una con fecha `2026-12-02` también (futura) pero `adjustWallet` sin fecha usa `2026-11-30`.
  - `adjustWallet` con saldo 37550 y declarado 30000 → movimiento `adjustment` por 7550 desde la cuenta; declarado igual al saldo → `ok(null)` y no escribe.
  - Gasto con tarjeta de 210000 sobre línea 200000 → `CARD_OVER_LIMIT`.
  - Forma inválida (transferencia a la misma cuenta) → `SAME_ACCOUNT`, no `TIMELINE_VIOLATION`.
  - `list({ from, to })` filtra por fecha inclusive y ordena de más reciente a más antiguo.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar. La serialización de escrituras la da `writeTransaction`; no agregar candados propios.
- [ ] **Paso 4:** `npx jest src/data/repositories/movements` → PASA.
- [ ] **Paso 5: Commit.** `feat(data): repositorio de movimientos con validación en el tiempo`.

### Tarea 9: Periodos, umbrales y ajustes del dispositivo

**Archivos:**
- Crear: `src/data/repositories/periods.ts`, `src/data/repositories/periods.test.ts`, `src/data/repositories/settings.ts`, `src/data/repositories/settings.test.ts`

**Interfaces:**
- Consume: `shouldSuggestNewPeriod`, `activePeriodRange` (dominio), `thresholdInput`, `walletRepository.listAccounts`.
- Produce:

```ts
export function createPeriodRepository(db: LocalDb, deps?: { newId?: IdGen; clock?: Clock }): {
  list(): Promise<FinancialPeriod[]>;
  shouldSuggest(): Promise<boolean>;                 // usa todayInLima(clock())
  activeRange(): Promise<DateRange>;
  dismiss(month: string): Promise<void>;             // crea la fila del mes si no existe y fija dismissed_at
  confirm(input: { month: string; startedOn?: IsoDate }): Promise<Result<FinancialPeriod>>; // startedOn por defecto: día 1 del mes
};
export function createSettingsRepository(db: LocalDb, deps?: { newId?: IdGen; clock?: Clock }): {
  getDevice(): Promise<{ hideAmounts: boolean; showProjection: boolean; homeScope: 'general' | string }>;
  setDevice(patch: Partial<{ hideAmounts: boolean; showProjection: boolean; homeScope: 'general' | string }>): Promise<void>;
  listThresholds(): Promise<{ id: string; currency: Currency; amountMinor: number; walletId: string | null }[]>;
  setThreshold(input: ThresholdInput): Promise<Result<{ id: string }>>;   // upsert por (currency, walletId)
  clearThreshold(currency: Currency, walletId: string | null): Promise<void>;
};
```

- [ ] **Paso 1: Pruebas que fallan:**
  - Sin periodos y hoy 2026-11-17 → `shouldSuggest()` verdadero y `activeRange()` = `{ start: '2026-11-01', end: '2026-11-17' }`.
  - `confirm({ month: '2026-12' })` con reloj 2026-12-02 → `startedOn` `2026-12-01`, `shouldSuggest()` falso, rango desde `2026-12-01`.
  - `dismiss('2026-12')` el 2026-12-02 → `shouldSuggest()` falso ese día y verdadero con reloj 2026-12-03.
  - `getDevice()` en base recién sembrada → `{ hideAmounts: false, showProjection: false, homeScope: 'general' }`; `setDevice({ hideAmounts: true })` persiste y conserva lo demás.
  - `setThreshold` dos veces para PEN global → una sola fila con el último monto; umbral por billetera y global conviven; `amountMinor: 0` → `INPUT_INVALID`; `clearThreshold` lo elimina.
- [ ] **Paso 2:** ejecutar → FALLA.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `npx jest src/data/repositories` → PASA.
- [ ] **Paso 5: Commit.** `feat(data): periodos, umbrales y ajustes del dispositivo`.

### Tarea 10: Arranque de la app y verificación en el emulador

**Archivos:**
- Crear: `src/data/index.ts` (fábrica `createRepositories(db: LocalDb)` que reúne los seis repositorios), `src/data/index.test.ts`
- Modificar: `src/app/_layout.tsx`, `src/app/index.tsx`
- Modificar: `docs/progress/*`, `docs/DEVELOPMENT_ROADMAP.md`, `docs/progress/DECISIONS.md`

**Interfaces:**
- Consume: `openLocalDatabase`, `seedDatabase`, todos los repositorios.
- Produce: `createRepositories(db): { categories, wallets, debts, movements, periods, settings }` y un `RepositoriesProvider` + hook `useRepositories()` en `src/data/RepositoriesProvider.tsx`; el provider abre la base, corre `seedDatabase` una vez y muestra una pantalla de carga hasta que termina (sin parpadeos de contenido vacío).

- [ ] **Paso 1: Prueba que falla** (`index.test.ts`, entorno node): con `createTestDb(buildSchema('local'))` + semilla, un recorrido de punta a punta: crear billetera con apertura 50000 → gasto 2450 → `loadLedgerState` + `homeSummary` (dominio) para el periodo del mes da `remainingMinor` 47550 y `spentMinor` 2450.
- [ ] **Paso 2:** ejecutar → FALLA; implementar la fábrica.
- [ ] **Paso 3:** montar el `RepositoriesProvider` en `_layout.tsx`. En `src/app/index.tsx`, mostrar **temporalmente** (se reemplaza en la Fase 6) el número de categorías y de movimientos leídos de la base, para comprobar en el dispositivo que la base real funciona.
- [ ] **Paso 4: Verificación en el emulador** (`Medium_Phone_API_37.0`): arrancar Metro, abrir la app y confirmar que muestra 6 categorías; cerrarla por completo, reabrirla y confirmar que siguen siendo 6 (la semilla no se duplica y la base persiste). Capturar pantalla con `adb exec-out screencap -p`.
- [ ] **Paso 5:** `npm test`, `npm run typecheck`, `npx expo lint`; comprobar la pureza: `grep -rE "from '@/data|from '(react-native|expo|@powersync|@supabase)" src/domain` → sin resultados.
- [ ] **Paso 6:** actualizar `CURRENT_STATUS.md` (9 secciones), `COMPLETED_TASKS.md`, `PENDING_TASKS.md`, `DEVELOPMENT_ROADMAP.md` (Fase 5 ✅) y registrar en `DECISIONS.md` las decisiones tomadas (p. ej. arnés de pruebas, `id` de `credit_cards` = id de la cuenta).
- [ ] **Paso 7: Commit.** `feat(data): arranque con base local y repositorios`.

---

## Al terminar el plan
- Siguiente plan: **Fase 6** (estructura de navegación: pestañas y botón "+" elevado según Stitch; tokens de diseño; decisiones pendientes de estilos, gráficos e íconos).
- Fase 9 reutilizará `buildSchema('synced')` y la copia local → sincronizada descrita en `DATABASE_SCHEMA.md`.
