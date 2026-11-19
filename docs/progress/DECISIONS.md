# FinKash — Registro de decisiones

Formato: fecha · decisión · motivo · estado.

| # | Fecha | Decisión | Motivo | Estado |
|---|---|---|---|---|
| D1 | 2026-11-16 | Expo (SDK 58) + React Native + TypeScript strict + Expo Router | Preferencia del usuario; un solo código para Android, iOS y Web | Aceptada |
| D2 | 2026-11-16 | PowerSync para sincronización offline-first con Supabase | SQLite relacional en el dispositivo, integración con Supabase Auth, cola de subida, modo solo local, SDK web | Aceptada (dirección) |
| D3 | 2026-11-16 | No usar `expo-sqlite` junto con PowerSync | Evitar dos bases de datos locales | Aceptada |
| D4 | 2026-11-16 | Development build en lugar de Expo Go | El SQLite nativo de PowerSync lo requiere | Aceptada |
| D5 | 2026-11-16 | Dinero en unidades mínimas enteras + código de moneda ISO | Evitar errores de punto flotante | Aceptada |
| D6 | 2026-11-16 | Saldos derivados de los movimientos, nunca contadores guardados | Las ediciones y eliminaciones se mantienen consistentes automáticamente | Aceptada |
| D7 | 2026-11-16 | Modelo de movimiento de dos tramos en una sola fila | Sincronización atómica de transferencias, pagos de tarjeta y deudas; evita contar dos veces | Aceptada (dirección) |
| D8 | 2026-11-16 | Capa de dominio en TypeScript puro sin dependencias de RN | Reutilización en iOS/Web; fácil de probar | Aceptada |
| D9 | 2026-11-16 | Construir todo en local primero (Fases 3–8) y activar la sincronización en la Fase 9 | Menos complejidad al inicio; PowerSync lo permite | Aceptada |
| D10 | 2026-11-16 | Los commits requieren autorización explícita; los push, una autorización aparte | Regla del usuario | Aceptada |
| D11 | 2026-11-16 | Todo en español (respuestas, reportes, comentarios de código, docs); nombres técnicos en inglés | Pedido del usuario | Aceptada |
| D12 | 2026-11-16 | MCP de Stitch configurado a nivel de usuario (`~/.claude.json`) con `${STITCH_API_KEY}` | Mantener la clave fuera del repositorio y de cualquier archivo | Aceptada |
| D13 | 2026-11-16 | Registrar movimiento es una pantalla de pestaña, no un modal | En Stitch la barra de pestañas sigue visible en esa pantalla | Aceptada (según diseño) |
| D14 | 2026-11-16 | Deudas y tarjetas de crédito se muestran dentro de Billeteras ("Deudas y Préstamos") | Así aparece en Stitch; no hay pestaña propia | Aceptada (según diseño) |

| D15 | 2026-11-17 | Saldo inicial con movimiento de apertura (`opening`) y corrección con "Arreglo de billetera" (`adjustment`); ninguno cuenta como ingreso ni gasto | Definición del usuario | Aceptada (usuario) |
| D16 | 2026-11-17 | Monedas PEN y USD; hasta una cuenta por moneda en cada billetera; sin conversión de divisas; moneda heredada de la cuenta | Definición del usuario | Aceptada (usuario) |
| D17 | 2026-11-17 | Dinero con terceros = gasto/ingreso; devoluciones con la categoría "Devolución / Reembolso" | Definición del usuario | Aceptada (usuario) |
| D18 | 2026-11-17 | Saldo de billetera nunca negativo; validación de toda la línea de tiempo al crear, editar o eliminar; eliminación física sin deshacer | Definición del usuario | Aceptada (usuario) |
| D19 | 2026-11-17 | Tarjetas sin bimoneda, cuotas, intereses ni pago mínimo; sin préstamos bancarios complejos | Definición del usuario | Aceptada (usuario) |
| D20 | 2026-11-17 | Deudas en curso se registran por su saldo/cuotas pendientes reales; saldo proyectado opcional con switch | Definición del usuario | Aceptada (usuario) |
| D21 | 2026-11-17 | Categoría de sistema "Otros" protegida; eliminar una categoría reasigna sus movimientos a "Otros" (reemplaza "archivar") | Definición del usuario | Aceptada (usuario) |
| D22 | 2026-11-17 | Billeteras no se eliminan ni archivan, solo se ocultan | Definición del usuario | Aceptada (usuario) |
| D23 | 2026-11-17 | Solo fecha (sin hora), zona `America/Lima`; umbral informativo por moneda, global o por billetera | Definición del usuario | Aceptada (usuario) |
| D24 | 2026-11-17 | Uso completo sin cuenta; inicio de sesión y sincronización opcionales (tablas solo locales de PowerSync) | Definición del usuario; patrón verificado con Context7 | Aceptada (usuario) |
| D25 | 2026-11-17 | Inicio: bloque de resumen (disponible/gastado/restante), selector de billetera o Saldo general con casillas, ojo para ocultar montos | Definición del usuario | Aceptada (usuario) |
| D26 | 2026-11-17 | Modelo de datos: `wallets` (agrupación) + `accounts` (`wallet` / `credit_card`, una moneda cada una) + `debts` + movimientos con un solo monto | Consecuencia de D16 (sin conversión) y D27 | Propuesta, en aprobación |
| D27 | 2026-11-17 | P1: prestar dinero = Gasto y que me presten = Ingreso, con la categoría de sistema "Préstamo", vinculados a una deuda ("Me deben" / "Debo") | Definición del usuario; reemplaza el requisito original que excluía los préstamos de los reportes | Aceptada (usuario) |
| D28 | 2026-11-17 | P2: restante = saldo actual; gastado = gastos del periodo; disponible = restante + gastado | Propuesta aceptada por el usuario | Aceptada (usuario) |
| D29 | 2026-11-17 | P3: el periodo empieza al confirmar (por defecto, el día 1); al confirmar se validan los saldos con "Arreglo de billetera"; descartar mantiene el periodo anterior | Propuesta aceptada por el usuario | Aceptada (usuario) |
| D30 | 2026-11-17 | P4: proyectado = saldo real − consumo de tarjetas − cuotas "Debo" que vencen antes de fin de mes; solo en Saldo general | Propuesta aceptada por el usuario | Aceptada (usuario) |
| D31 | 2026-11-17 | P5: transferencia entre mis billeteras como tercera opción de Registrar ("Gasto \| Ingreso \| Transferencia") y botón "Transferir" en el detalle de billetera; resta en origen y suma en destino | Definición del usuario; modifica el diseño de Stitch | Aceptada (usuario) |

| D32 | 2026-11-17 | "Saldo gastado" de Inicio cuenta solo egresos desde billeteras; las compras con tarjeta aparecen en "Gastos del mes" y en el saldo proyectado | Decisión del plan confirmada por el usuario | Aceptada (usuario) |
| D33 | 2026-11-17 | Si se descarta el aviso de nuevo periodo, reaparece al día siguiente; sin periodo confirmado, el activo empieza el día 1 del mes | Decisión del plan confirmada por el usuario | Aceptada (usuario) |
| D34 | 2026-11-17 | Ejecución del plan en la sesión principal (sin subagentes) con revisión final; commit local autorizado al terminar cada tarea si sus pruebas pasan; push sigue requiriendo autorización explícita | Instrucción del usuario | Aceptada (usuario) |
| D35 | 2026-11-17 | Identificador definitivo de la app Android: `com.lordpanda.finkash` (no cambiar tras publicar en Google Play) | Instrucción del usuario | Aceptada (usuario) |
| D36 | 2026-11-17 | Dominio (Tareas 3–11), detalles que la especificación no fijaba: (a) códigos extra `CATEGORY_NOT_FOUND`, `DEBT_NOT_FOUND`, `MOVEMENT_NOT_FOUND`, `MOVEMENT_ID_DUPLICATE`; (b) `validateMovement` revisa en este orden: monto, presencia de tramos, existencia de cuentas, tipo de cuenta, moneda, misma cuenta, categoría/deuda, apertura duplicada, saldo declarado; (c) `projectedRemaining` usa saldos hasta `today` y **no resta** cuotas de deudas "Debo" sin monto de cuota; (d) `dismissedAt` (UTC) se convierte a día de Lima para decidir cuándo reaparece la sugerencia de periodo; (e) `activePeriodRange` ignora periodos confirmados con inicio futuro | Decisión de implementación de la sesión | Propuesta, pendiente de confirmación del usuario |
| D37 | 2026-11-19 | Compilación Android: CMake 3.31.6 (Ninja 1.12.1) fijado con `cmake.dir` en `android/local.properties` para evitar el límite de 260 caracteres de Ninja < 1.12 | Autorizado por el usuario | Aceptada (usuario) |
| D38 | 2026-11-19 | Pruebas de la capa de datos con SQLite real vía `node:sqlite` (Node 26) y DDL generado desde la definición declarativa del esquema; `@powersync/*` son ESM (.mjs) y no cargan bajo `jest-expo`. Se agregó `@types/node` y `"node"` a `tsconfig.json` → `types`. Costo: las vistas/`viewName` reales de PowerSync no se prueban en Jest, solo en el emulador | Decisión de implementación (Fase 5) | Propuesta, pendiente de confirmación |
| D39 | 2026-11-19 | Esquema cliente dividido: `schema.ts` (plan declarativo puro) y `powersyncSchema.ts` (traduce a `Schema` de PowerSync). La tabla sincronizable se llama siempre `<nombre>` (coincide con el servidor), la local `local_<nombre>`; solo cambian los `viewName` entre modo local y sincronizado | Decisión de implementación (Fase 5) | Propuesta, pendiente de confirmación |
| D40 | 2026-11-19 | Repositorios: cada escritura es una `writeTransaction` que lee el libro dentro de la transacción y valida con `checkChange`; los errores de dominio abortan y revierten vía `transact`/`unwrap`/`abort` (`repositories/shared.ts`). `credit_cards.id` = id de la cuenta. `@powersync/react` (consultas en vivo) no se instala todavía: se agrega con la Fase 6/7 | Decisión de implementación (Fase 5) | Propuesta, pendiente de confirmación |

## Decisiones pendientes
- Aprobación final de `FINANCIAL_RULES.md`, `DATABASE_SCHEMA.md` y `DESIGN_SYSTEM.md` §10 (incluidas las **[Propuesta]**).
- Si el cambio de Registrar (3 opciones) y las pantallas faltantes se diseñan antes en Stitch o se construyen con los componentes existentes.
- Capa de consultas: Drizzle vs. Kysely vs. SQL directo (Fase 3).
- Estilos: tokens + `StyleSheet` (recomendado) vs. NativeWind.
- Gráficos: `react-native-svg` con componentes propios (recomendado).
- Paquete de íconos para Material Symbols.
- Desenfoque de fondo en Android (`expo-blur` vs. fondo translúcido sin desenfoque).
- JDK 17 vs. JDK 25 para compilaciones locales.
- Diferencias entre diseño y requisitos (`DESIGN_SYSTEM.md` §7) y pantallas faltantes (§8).
- Confirmar la política de conflictos (gana la última escritura por fila).
- Almacenamiento de la sesión de Auth en el dispositivo.
- PowerSync Cloud vs. Open Edition autoalojada.
- Todas las preguntas financieras abiertas de `FINANCIAL_RULES.md` §9.
