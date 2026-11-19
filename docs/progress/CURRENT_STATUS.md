# FinKash — Estado actual

Última actualización: 2026-11-19

## 1. Fase de desarrollo actual
Fases 3, 4 y 5 completas (con un pendiente de verificación visual, ver §7). Siguiente: **Fase 6** (navegación y tokens de diseño); su plan se redactó en `docs/superpowers/plans/2026-11-19-fase6-navegacion-y-tokens.md` y espera aprobación.

## 2. Tarea actual
Cerrada la Fase 5 (plan `2026-11-19-fase5-base-local-y-repositorios.md`, 10 tareas, un commit local por tarea). No hay tarea de implementación en curso; falta aprobar el plan de la Fase 6.

## 3. Trabajo completado
- Dominio (Fase 4): dinero, fechas, validación de movimientos, saldos, deudas, validación en el tiempo (`checkChange`), apertura y arreglo, reportes de Inicio, periodos, categorías.
- Fase 5: `src/data/` con interfaz `LocalDb`, esquema cliente declarativo (`schema.ts`) y su traducción a PowerSync (`powersyncSchema.ts`), semilla idempotente, lectura validada del libro, validación Zod y seis repositorios (categorías, billeteras/tarjetas, deudas, movimientos, periodos, ajustes/umbrales). Cada escritura es una transacción que valida con `checkChange`.
- `RepositoriesProvider` abre la base real (op-sqlite), siembra y muestra una pantalla provisional con los conteos.
- Development build recompilado con `@op-engineering/op-sqlite` (BUILD SUCCESSFUL).
- Decisiones D32–D40 registradas (D36 y D38–D40 pendientes de confirmación).

## 4. Archivos creados o modificados
- `src/data/{local,repositories}/*`, `src/data/{index,RepositoriesProvider}`, `src/validation/inputs.ts`, `src/lib/id.ts`, `jest.setup.ts`.
- `src/app/_layout.tsx` (provider) y `src/app/index.tsx` (pantalla provisional).
- `package.json`/`package-lock.json` (`@powersync/react-native`, `@op-engineering/op-sqlite`, `zod`, `expo-crypto`, `@types/node`), `tsconfig.json` (`types` incluye `node`).
- Documentos de progreso y `DEVELOPMENT_ROADMAP.md`.

## 5. Pruebas ejecutadas y resultados
- `npm test` → **320/320 pruebas** (24 suites); `npm run typecheck` y `npx expo lint` limpios.
- Pureza: `src/domain/` sin imports de `@/data`, React Native, Expo, PowerSync ni Supabase.
- Las pruebas de datos usan SQLite real (`node:sqlite`), no las vistas de PowerSync (D38).
- Metro empaqueta el proyecto sin errores (1434 módulos). **La pantalla con la base real no se verificó visualmente**: el emulador se colgó dos veces durante la verificación y el usuario pidió suspenderla; `logcat` no mostró un fallo fatal.

## 6. Errores conocidos
- Un proceso `expo start` antiguo en el puerto 8081 dejó de responder al empaquetar (ya detenido). Para desarrollo, usar un solo Metro.
- `android/local.properties` (con `cmake.dir`) es local; si se regenera `android/` hay que recrearlo (pendiente: config plugin).
- `npm` avisa del script de `@parcel/watcher` no aprobado; `npm audit` reporta 22 vulnerabilidades moderadas en herramientas (sin revisar).
- El emulador `Medium_Phone_API_37.0` se cuelga si se acumulan capturas/relanzamientos; reiniciarlo en frío lo recupera.

## 7. Trabajo pendiente
- **Verificación visual (usuario):** abrir la app y comprobar "Categorías: 6 · Movimientos: 0"; cerrar, reabrir y confirmar que siguen 6.
- Aprobar el plan de la Fase 6 y decidir lo pendiente de diseño (estilos, íconos, gráficos, "Registrar").
- Confirmar D36 y D38–D40; config plugin para `cmake.dir`.

## 8. Siguiente acción recomendada
Revisar y aprobar `2026-11-19-fase6-navegacion-y-tokens.md`; luego ejecutarlo.

## 9. Configuración o preparación externa pendiente
- Más adelante: cuenta de Expo + EAS CLI (Fase 11); proyecto de desarrollo en Supabase y cuenta de PowerSync (Fase 9).

### Foto del entorno (2026-11-19)
- Git: rama `main`, remoto `origin` → `github.com/LordPanda04/FinKashApp.git`; **sin push** de ningún commit.
- Node.js 26.13.1, npm 11.20.0; JDK 17.0.21. Android SDK con CMake 3.31.6 (Ninja 1.12.1).
- MCP de Stitch y Context7 conectados.
