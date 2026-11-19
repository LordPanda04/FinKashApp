# FinKash — Estado actual

Última actualización: 2026-11-19 (cierre de la Fase 8 en código)

## 1. Fase de desarrollo actual
Fases 3 a 8 completas en código (8 = primer arranque con nombre y "Efectivo", periodos mensuales, cuentas PEN/USD). Esperan tu **verificación visual** las Fases 5, 6, 7A, 7B, 7C y 8 (listas en `PENDING_TASKS.md`; antes, recompilar el development build por `react-native-svg`; la Fase 8 no agrega módulos nativos). Siguiente: **Fase 9** (Supabase, RLS, Auth y sincronización con PowerSync); antes conviene tu verificación visual.

## 2. Tarea actual
Ninguna en curso. Cerrada la Fase 8 (plan `2026-11-19-fase8-primer-arranque-y-periodos.md`, 9 tareas: 8 con commit local de código y esta de cierre). Sin revisión de código por un revisor independiente: la revisión final fue una autorrevisión (ver `COMPLETED_TASKS.md`).

## 3. Trabajo completado
- Dominio (Fase 4): dinero, fechas, validación de movimientos, saldos, deudas, validación en el tiempo (`checkChange`), apertura y arreglo, reportes de Inicio, periodos, categorías.
- Fase 5: `src/data/` con interfaz `LocalDb`, esquema cliente declarativo (`schema.ts`) y su traducción a PowerSync (`powersyncSchema.ts`), semilla idempotente, lectura validada del libro, validación Zod y seis repositorios (categorías, billeteras/tarjetas, deudas, movimientos, periodos, ajustes/umbrales). Cada escritura es una transacción que valida con `checkChange`.
- `RepositoriesProvider` abre la base real (op-sqlite) y siembra al arrancar (la pantalla provisional con conteos se retiró en la Fase 6).
- Development build recompilado con `@op-engineering/op-sqlite` (BUILD SUCCESSFUL).
- Fase 6: tokens de Stitch, fuente Inter con respaldo, íconos Material Symbols (`expo-symbols`), componentes base de vidrio, barra flotante solo con íconos con "+" elevado (`expo-router/ui`) y 5 esqueletos de pantalla.
- Fase 7A: notificador de cambios y `useQuery`, repositorio `ledger`, componentes de lista/formulario/hojas, pantallas de Categorías y Billeteras (grilla con saldo por moneda, ocultas, deudas y bancos en lectura), detalle de billetera (movimientos, arreglo de saldo, ocultar, transferir) y `parseBalanceInput` en el dominio.
- Fase 7B: Registrar movimiento (gasto, ingreso, transferencia, fecha, préstamo con deuda existente o nueva atómica, aviso de saldo insuficiente), Historial (grupos por día sin hora, filtros, modo de edición) y edición/eliminación de movimientos con validación de saldo en el tiempo.
- Categorías únicas sin tipo (D47) con fusión automática de duplicados al arrancar.
- Fase 7C: geometría de gráficos, presentador de Inicio, componentes (resumen con selector de alcance, ojo y proyección; dona; flujo con umbral) y la pantalla de Inicio con ajustes persistentes en `device_settings`.
- Fase 8: semilla del primer arranque (billetera "Efectivo" con una cuenta PEN y saldo 0, primer periodo confirmado, marca `default_wallet_seeded`); nombre del usuario (`device_settings.display_name`) con hoja "¿Cómo te llamas?" y saludo `Hola!, <nombre>` editable tocándolo; validación del día de inicio del periodo (`validatePeriodStart`, `PERIOD_START_INVALID`); aviso "Iniciar nuevo periodo" en Inicio con "Ahora no"; ruta `/periodo` (revisión de saldos con "Corregir" y "Confirmar periodo"); etiqueta "Periodo desde el …" en el resumen; "Elegir mes…" en el filtro de fecha del Historial; `wallets.addAccount` y "Habilitar cuenta en dólares" en el detalle de billetera (D52).
- Decisiones D32–D54 registradas (D53 aceptada por el usuario; D54, detalles de implementación de la Fase 8, pendiente de confirmación).

## 4. Archivos creados o modificados
- `src/data/{local,repositories}/*`, `src/data/{index,RepositoriesProvider}`, `src/validation/inputs.ts`, `src/lib/id.ts`, `jest.setup.ts`.
- `src/app/_layout.tsx` (fuentes, tema claro, provider) y `src/app/(tabs)/*` (5 esqueletos); `src/ui/*` (tokens, componentes, barra de pestañas); `app.json` (`userInterfaceStyle`, plugin `expo-font`).
- Fase 8: `src/data/local/{schema,seed,testSeed}.ts`, `src/data/repositories/{settings,periods,wallets}.ts`, `src/data/index.ts`, `src/validation/inputs.ts`, `src/domain/periods/periods.ts`, `src/features/periodos/*` (nuevo), `src/features/inicio/{InicioScreen,NameSheet,SummaryCard,presenter}`, `src/features/historial/{HistorialScreen,presenter}`, `src/features/billeteras/{WalletDetailScreen,EnableUsdForm}`, `src/app/periodo.tsx`, `src/test-utils/fakeRepositories.ts`.
- `package.json`/`package-lock.json` (`@powersync/react-native`, `@op-engineering/op-sqlite`, `zod`, `expo-crypto`, `@types/node`), `tsconfig.json` (`types` incluye `node`).
- Documentos de progreso y `DEVELOPMENT_ROADMAP.md`.

## 5. Pruebas ejecutadas y resultados
- `npm test` → **848/848 pruebas** (52 suites, tres corridas seguidas sin fallos); `npm run typecheck` y `npx expo lint` limpios; `npx expo export --platform android` correcto (compila todas las rutas, incluida `/periodo`).
- Cada protección contra doble toque nueva (hoja de nombre, aviso de periodo, confirmar periodo, habilitar USD) se verificó por mutación: sin el guardia, su prueba falla.
- Pureza: `src/domain/` sin imports de `@/data`, React Native, Expo, PowerSync ni Supabase.
- Las pruebas de datos usan SQLite real (`node:sqlite`), no las vistas de PowerSync (D38).
- La base real y la interfaz de las Fases 5–8 **no se verificaron visualmente**: el emulador se colgó dos veces el 2026-11-19 y el usuario pidió suspender la verificación del agente; `logcat` no mostró un fallo fatal.

## 6. Errores conocidos
- Un proceso `expo start` antiguo en el puerto 8081 dejó de responder al empaquetar (ya detenido). Usar un solo Metro. Hay cambios nativos sin compilar (`app.json`: `userInterfaceStyle` y plugin `expo-font`); recompilar con `npx expo run:android --no-bundler` cuando quieras.
- `android/local.properties` (con `cmake.dir`) es local; si se regenera `android/` hay que recrearlo (pendiente: config plugin).
- `npm` avisa del script de `@parcel/watcher` no aprobado; `npm audit` reporta 22 vulnerabilidades moderadas en herramientas (sin revisar).
- Pruebas inestables detectadas (no corregidas): `ThresholdSheet › doble toque` (`src/features/inicio/components.test.tsx`) falló una vez bajo carga con la suite completa y pasa sola; sus toques son secuenciales con un temporizador de 30 ms. Lo mismo puede ocurrir con pruebas de doble toque parecidas de las Fases 7A–7C.
- Con las pruebas de React Native, `await fireEvent.press(...)` espera la promesa del manejador: para probar un doble toque hay que disparar ambos toques dentro de un solo `act` (`await act(async () => { await Promise.all([press, press]); })`).
- El emulador `Medium_Phone_API_37.0` se cuelga si se acumulan capturas/relanzamientos; reiniciarlo en frío lo recupera.

## 7. Trabajo pendiente
- **Verificación visual (usuario):** listas de las Fases 5, 6, 7A, 7B, 7C y 8 en `PENDING_TASKS.md` (la base real se abre en el arranque; si falla se mostrará "No se pudo abrir la base de datos").
- Confirmar D54 (detalles de implementación de la Fase 8) y decidir los menores diferidos (ver abajo y `COMPLETED_TASKS.md`).
- Pantallas faltantes de `DESIGN_SYSTEM.md` §8 (Ajustes, inicio de sesión, etc.); Fase 9 (Supabase, RLS, Auth y sincronización: la semilla de "Efectivo" no debe duplicar datos al iniciar sesión en un dispositivo cuya cuenta ya tiene billeteras).
- Config plugin para `cmake.dir`.

## 8. Siguiente acción recomendada
Verificar visualmente las Fases 5–8 en el emulador (recompilar antes el development build por `react-native-svg`: `npx expo run:android --no-bundler`) y anotar las diferencias con Stitch. Después, pedir el plan de la Fase 9.

## 9. Configuración o preparación externa pendiente
- Más adelante: cuenta de Expo + EAS CLI (Fase 11); proyecto de desarrollo en Supabase y cuenta de PowerSync (Fase 9).

- **Git:** todos los commits son locales. La rama `main` apunta a `origin/main`, pero esa rama **no existe en GitHub** (nunca se hizo `push`, por regla del proyecto). Al mover la carpeta a `C:devinkash` no se perdió el remoto (`origin` → `github.com/LordPanda04/FinKashApp.git`); GitHub Desktop debe apuntar a la nueva carpeta (File → Add local repository). Publicar requiere autorización explícita.

### Foto del entorno (2026-11-19)
- Git: rama `main`, remoto `origin` → `github.com/LordPanda04/FinKashApp.git`; **sin push** de ningún commit.
- Node.js 26.13.1, npm 11.20.0; JDK 17.0.21. Android SDK con CMake 3.31.6 (Ninja 1.12.1).
- MCP de Stitch y Context7 conectados.
