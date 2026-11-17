# FinKash — Esquema de base de datos

Estado: **Borrador final para aprobación (2026-11-17).** Refleja `FINANCIAL_RULES.md` del 2026-11-17 (incluidas las respuestas P1–P5).
Postgres (migraciones de Supabase) es la fuente de verdad del esquema; el esquema cliente de PowerSync lo replica.

## Convenciones
- Claves primarias: UUID generado en el dispositivo (permite crear registros sin conexión y sin cuenta).
- Toda tabla de usuario tiene `user_id`, `created_at timestamptz` y `updated_at timestamptz`.
- Dinero: `*_minor bigint` (unidades mínimas enteras; en movimientos siempre > 0) + `currency text` (`PEN` | `USD`).
- Fechas de movimiento: `date` (sin hora), interpretadas en `America/Lima`.
- Eliminación **física** (sin `deleted_at`): PowerSync sincroniza los borrados.
- RLS en todas las tablas: `user_id = auth.uid()`.

## Uso sin cuenta (offline-first)
Patrón verificado en la documentación de PowerSync ("local-only usage"):
- Cada tabla sincronizable tiene una gemela **solo local** (`localOnly: true`) en el esquema cliente.
- Antes de iniciar sesión, la app usa las tablas locales a través de `viewName` (las consultas usan el mismo nombre: `movements`, `wallets`…).
- Al iniciar sesión o registrarse, en **una sola transacción** se copian las filas a las tablas sincronizadas asignando `user_id`, se vacían las locales y se cambia el `viewName` con `updateSchema()`. Las filas copiadas entran en la cola de subida.
- En el dispositivo, `user_id` puede estar vacío mientras no haya cuenta. En Postgres es `NOT NULL`.

## Tablas

### currencies (datos semilla)
| code PK | symbol | minor_units |
|---|---|---|
| PEN | S/ | 2 |
| USD | $ | 2 |

### wallets — billeteras (agrupación visible)
| columna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| name | text | |
| wallet_type | text | `cash` \| `bank` \| `digital` \| `other` (etiqueta "Principal" / "Digital" en Stitch) |
| icon, color | text | |
| is_hidden | boolean | default `false`; las billeteras no se eliminan |
| include_in_general | boolean | default `true`; casillas del "Saldo general" en Inicio |
| sort_order | int | |

### accounts — cuentas con saldo (una moneda cada una)
| columna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| kind | text | `wallet` \| `credit_card` |
| wallet_id | uuid null FK → wallets | obligatorio si `kind = wallet`; null si `kind = credit_card` |
| currency | text FK → currencies | |

Restricciones: único `(wallet_id, currency)` para `kind = wallet` (máximo una cuenta PEN y una USD por billetera).

### credit_cards (1:1 con accounts, `kind = credit_card`)
| columna | tipo | notas |
|---|---|---|
| account_id | uuid PK/FK | |
| name | text | p. ej., "Tarjeta BCP" |
| issuer | text null | |
| icon, color | text | |
| credit_limit_minor | bigint | > 0 |
| closing_day | smallint null | 1–31, informativo |
| due_day | smallint null | 1–31; se usa en la proyección |
| is_hidden | boolean | |

### debts — préstamos y deudas
| columna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| direction | text | `receivable` ("Me deben") \| `payable` ("Debo") |
| counterparty_name | text | persona o institución |
| counterparty_type | text | `person` \| `institution` |
| currency | text | |
| initial_pending_minor | bigint | ≥ 0; saldo pendiente de una deuda que ya existía al registrarla (0 si nace de un movimiento) |
| due_on | date null | vencimiento final opcional |
| installment_amount_minor | bigint null | si es en cuotas |
| installments_remaining | smallint null | |
| next_due_on | date null | próximo pago (mensual) |
| notes | text null | |

Los movimientos con categoría "Préstamo" se vinculan a una deuda (`movements.debt_id`). El saldo pendiente se deriva (ver "Cálculos derivados").

### categories
| columna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| kind | text | `expense` \| `income` |
| name | text | |
| color | text | un solo hex; el fondo del ícono se deriva al 10 % |
| icon | text | nombre de Material Symbols |
| system_key | text null | `other` ("Otros") \| `loan` ("Préstamo"); null para el resto |
| sort_order | int | |

Restricciones: único `(user_id, kind, system_key)` cuando `system_key` no es null. Las categorías con `system_key` no se eliminan ni se renombran.
Datos semilla por usuario: "Otros", "Préstamo" y "Devolución / Reembolso", cada una en versión de gasto y de ingreso.
Eliminar una categoría personalizada: en una sola transacción, sus movimientos pasan a "Otros" del mismo tipo y luego se borra la categoría.

### movements
| columna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| type | text | `expense` \| `income` \| `transfer` \| `card_payment` \| `opening` \| `adjustment` |
| occurred_on | date | sin hora |
| description | text null | |
| category_id | uuid null FK → categories | obligatoria solo en `expense` / `income` |
| source_account_id | uuid null FK → accounts | |
| dest_account_id | uuid null FK → accounts | |
| amount_minor | bigint | > 0; un solo monto porque no hay conversión |
| currency | text | igual a la moneda de las cuentas involucradas |
| debt_id | uuid null FK → debts | obligatorio si la categoría es "Préstamo"; null en los demás casos |
| declared_balance_minor | bigint null | solo en `adjustment`: monto real declarado |

Reglas por tipo (CHECK en Postgres + validación en el dominio):

| type | source | dest | categoría | debt_id |
|---|---|---|---|---|
| `expense` | cuenta `wallet` o `credit_card` | null | de gasto | si la categoría es "Préstamo" |
| `income` | null | cuenta `wallet` | de ingreso | si la categoría es "Préstamo" |
| `transfer` | cuenta `wallet` | otra cuenta `wallet`, misma moneda | null | null |
| `card_payment` | cuenta `wallet` | cuenta `credit_card`, misma moneda | null | null |
| `opening` | `credit_card` (consumo previo) o null | `wallet` (saldo inicial) o null | null | null (exactamente un tramo) |
| `adjustment` | `wallet` (si baja) o null | `wallet` (si sube) o null | null | null (exactamente un tramo) |

Índices: `(source_account_id, occurred_on)`, `(dest_account_id, occurred_on)`, `(user_id, occurred_on)`, `(debt_id)`.

### financial_periods
| columna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| month | text | `YYYY-MM` del mes sugerido |
| started_on | date null | día de inicio del periodo al confirmar (por defecto, el día 1) |
| confirmed_at | timestamptz null | |
| dismissed_at | timestamptz null | último descarte; la sugerencia vuelve a aparecer después |

Periodo activo = el último confirmado; va desde su `started_on` hasta hoy.

### balance_thresholds
| columna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| currency | text | |
| amount_minor | bigint | > 0 |
| wallet_id | uuid null FK → wallets | null = global (Saldo general de esa moneda) |

Restricción: único `(user_id, currency, wallet_id)`.

### device_settings (solo local, no se sincroniza)
| columna | notas |
|---|---|
| hide_amounts | ojo abierto/cerrado de Inicio |
| show_projection | switch de saldo proyectado |
| home_scope | `general` o el `wallet_id` elegido en Inicio |

## Cálculos derivados (no se almacenan)
- Saldo de una cuenta = Σ `amount_minor` donde `dest_account_id` = cuenta − Σ `amount_minor` donde `source_account_id` = cuenta.
- Saldo de una billetera = saldo de sus cuentas, por moneda.
- Consumido de una tarjeta = −saldo; disponible = línea − consumido.
- Pendiente de una deuda:
  - `receivable` = `initial_pending_minor` + Σ gastos vinculados − Σ ingresos vinculados.
  - `payable` = `initial_pending_minor` + Σ ingresos vinculados − Σ gastos vinculados.
  - Estado: pendiente si es > 0, pagada si es = 0.
- Gastos/ingresos de un periodo = movimientos `expense` / `income` con `occurred_on` dentro del periodo (incluye la categoría "Préstamo").
- Resumen de Inicio, para el alcance elegido:
  - restante = saldo actual
  - gastado = gastos del periodo activo
  - disponible = restante + gastado
- Proyectado (solo Saldo general) = restante − consumido de las tarjetas en esa moneda − cuotas de deudas `payable` con `next_due_on` antes del fin del mes.

## Validación en el tiempo (dominio, en el dispositivo)
Antes de confirmar una creación, edición o eliminación:
1. Se identifican las cuentas y deudas afectadas (antes y después del cambio).
2. Para cada una, se calcula el saldo al cierre de cada día desde la fecha más antigua afectada hasta hoy, aplicando el cambio propuesto.
3. Si alguna viola su regla en algún día, se bloquea la operación y se informa el monto faltante y la fecha:
   - billetera ≥ 0
   - tarjeta: consumido entre 0 y la línea
   - deuda: pendiente ≥ 0
4. Las escrituras de un cambio (por ejemplo, crear una deuda nueva y su primer movimiento, o reasignar a "Otros" y borrar la categoría) se hacen en una sola transacción local.

Riesgo conocido: Postgres solo puede validar cada fila por separado. Si se editara el mismo historial desde dos dispositivos sin conexión, la combinación podría dejar un saldo negativo al sincronizar. Para un solo usuario el riesgo es bajo; la app debe detectarlo al sincronizar y avisar.
