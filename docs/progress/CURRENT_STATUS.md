# FinKash — Estado actual

Última actualización: 2026-11-19 (cierre de la Fase 7B en código)

## 1. Fase de desarrollo actual
Fases 3 a 7B completas en código. Esperan tu **verificación visual** las Fases 5, 6, 7A y 7B (listas en `PENDING_TASKS.md`). Siguiente: plan **7C** (Inicio con gráficos).

## 2. Tarea actual
Ninguna en curso. Cerrada la Fase 7B (plan `2026-11-19-fase7b-registrar-e-historial.md`, un commit local por tarea). Falta tu verificación visual y redactar el plan 7C.

## 3. Trabajo completado
- Dominio (Fase 4): dinero, fechas, validación de movimientos, saldos, deudas, validación en el tiempo (`checkChange`), apertura y arreglo, reportes de Inicio, periodos, categorías.
- Fase 5: `src/data/` con interfaz `LocalDb`, esquema cliente declarativo (`schema.ts`) y su traducción a PowerSync (`powersyncSchema.ts`), semilla idempotente, lectura validada del libro, validación Zod y seis repositorios (categorías, billeteras/tarjetas, deudas, movimientos, periodos, ajustes/umbrales). Cada escritura es una transacción que valida con `checkChange`.
- `RepositoriesProvider` abre la base real (op-sqlite) y siembra al arrancar (la pantalla provisional con conteos se retiró en la Fase 6).
- Development build recompilado con `@op-engineering/op-sqlite` (BUILD SUCCESSFUL).
- Fase 6: tokens de Stitch, fuente Inter con respaldo, íconos Material Symbols (`expo-symbols`), componentes base de vidrio, barra flotante solo con íconos con "+" elevado (`expo-router/ui`) y 5 esqueletos de pantalla.
- Fase 7A: notificador de cambios y `useQuery`, repositorio `ledger`, componentes de lista/formulario/hojas, pantallas de Categorías y Billeteras (grilla con saldo por moneda, ocultas, deudas y bancos en lectura), detalle de billetera (movimientos, arreglo de saldo, ocultar, transferir) y `parseBalanceInput` en el dominio.
- Fase 7B: Registrar movimiento (gasto, ingreso, transferencia, fecha, préstamo con deuda existente o nueva atómica, aviso de saldo insuficiente), Historial (grupos por día sin hora, filtros, modo de edición) y edición/eliminación de movimientos con validación de saldo en el tiempo.
- Decisiones D32–D46 registradas (D36 y D38–D46 pendientes de confirmación).

## 4. Archivos creados o modificados
- `src/data/{local,repositories}/*`, `src/data/{index,RepositoriesProvider}`, `src/validation/inputs.ts`, `src/lib/id.ts`, `jest.setup.ts`.
- `src/app/_layout.tsx` (fuentes, tema claro, provider) y `src/app/(tabs)/*` (5 esqueletos); `src/ui/*` (tokens, componentes, barra de pestañas); `app.json` (`userInterfaceStyle`, plugin `expo-font`).
- `package.json`/`package-lock.json` (`@powersync/react-native`, `@op-engineering/op-sqlite`, `zod`, `expo-crypto`, `@types/node`), `tsconfig.json` (`types` incluye `node`).
- Documentos de progreso y `DEVELOPMENT_ROADMAP.md`.

## 5. Pruebas ejecutadas y resultados
- `npm test` → **617/617 pruebas** (46 suites); `npm run typecheck` y `npx expo lint` limpios; Metro empaqueta el bundle de Android (HTTP 200).
- Pureza: `src/domain/` sin imports de `@/data`, React Native, Expo, PowerSync ni Supabase.
- Las pruebas de datos usan SQLite real (`node:sqlite`), no las vistas de PowerSync (D38).
- La base real y la interfaz de las Fases 5–7B **no se verificaron visualmente**: el emulador se colgó dos veces el 2026-11-19 y el usuario pidió suspender la verificación del agente; `logcat` no mostró un fallo fatal.

## 6. Errores conocidos
- Un proceso `expo start` antiguo en el puerto 8081 dejó de responder al empaquetar (ya detenido). Usar un solo Metro. Hay cambios nativos sin compilar (`app.json`: `userInterfaceStyle` y plugin `expo-font`); recompilar con `npx expo run:android --no-bundler` cuando quieras.
- `android/local.properties` (con `cmake.dir`) es local; si se regenera `android/` hay que recrearlo (pendiente: config plugin).
- `npm` avisa del script de `@parcel/watcher` no aprobado; `npm audit` reporta 22 vulnerabilidades moderadas en herramientas (sin revisar).
- El emulador `Medium_Phone_API_37.0` se cuelga si se acumulan capturas/relanzamientos; reiniciarlo en frío lo recupera.

## 7. Trabajo pendiente
- **Verificación visual (usuario):** lista de comprobación de la Fase 6 en `PENDING_TASKS.md`; además, la base real de la Fase 5 (el contador provisional se quitó de Inicio: la base se abre en el arranque; si falla se mostrará "No se pudo abrir la base de datos").
- Plan 7C (Inicio con resumen, selector de alcance, dona y gráfico de flujo con `react-native-svg`); decidir el diseño previo en Stitch de las pantallas faltantes.
- Confirmar D36 y D38–D46; config plugin para `cmake.dir`.

## 8. Siguiente acción recomendada
Verificar las pantallas en el emulador (lista y pasos en `PENDING_TASKS.md`) y pedir el plan 7C.

## 9. Configuración o preparación externa pendiente
- Más adelante: cuenta de Expo + EAS CLI (Fase 11); proyecto de desarrollo en Supabase y cuenta de PowerSync (Fase 9).

- **Git:** todos los commits son locales. La rama `main` apunta a `origin/main`, pero esa rama **no existe en GitHub** (nunca se hizo `push`, por regla del proyecto). Al mover la carpeta a `C:devinkash` no se perdió el remoto (`origin` → `github.com/LordPanda04/FinKashApp.git`); GitHub Desktop debe apuntar a la nueva carpeta (File → Add local repository). Publicar requiere autorización explícita.

### Foto del entorno (2026-11-19)
- Git: rama `main`, remoto `origin` → `github.com/LordPanda04/FinKashApp.git`; **sin push** de ningún commit.
- Node.js 26.13.1, npm 11.20.0; JDK 17.0.21. Android SDK con CMake 3.31.6 (Ninja 1.12.1).
- MCP de Stitch y Context7 conectados.
