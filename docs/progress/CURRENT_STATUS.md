# FinKash — Estado actual

Última actualización: 2026-11-17

## 1. Fase de desarrollo actual
Fases 3–4 del plan `docs/superpowers/plans/2026-11-17-fundacion-y-dominio.md` (ejecutado en la sesión principal, D34). **Fase 4 (núcleo de dominio) completa. Fase 3 parcial:** falta compilar e instalar el development build en el emulador.

## 2. Tarea actual
**Tarea 2 (development build en el emulador): bloqueada por rutas largas de Ninja.** Tareas 3–11 terminadas con commit local cada una.

Para cerrar la Tarea 2, una vez resuelto el bloqueo (§6 y §8):
1. Emulador `Medium_Phone_API_37.0` (`-no-snapshot-load`), esperar `sys.boot_completed`.
2. `JAVA_HOME` en JDK 17, luego `npx expo run:android --device emulator-5554`.
3. Esperado: `BUILD SUCCESSFUL` y la app abierta en el emulador.

El registro de avance del plan está en `.superpowers/sdd/2026-11-17-fundacion-y-dominio/progress.md` (ignorado por git).

## 3. Trabajo completado
- Commits locales (ninguno enviado con `push`), de más antiguo a más reciente:
  - `511fe93` documentación inicial
  - `48fee13` Tarea 1: proyecto Expo SDK 58
  - `d139451` Tarea 2 (parcial): `expo-dev-client` y `android.package` = `com.lordpanda.finkash` (D35)
  - `eb376cf` T3: dinero y fechas
  - `c476260` T4: tipos del libro y validación de movimientos
  - `041bc90` T5: saldos y saldos diarios
  - `bd09f80` T6: deudas y préstamos
  - `bbdf6c4` T7: validación de saldo en el tiempo
  - `fa7ae24` T8: apertura y arreglo de billetera
  - `600aa66` T9: reportes de Inicio
  - `845295e` T10: periodos mensuales
  - T11: eliminación de categorías (commit `feat(domain): eliminación de categorías`, incluye esta actualización de documentos)
- Repositorio trasladado a `C:\dev\finkash`; `npm install` limpio.
- Decisiones D32–D36 registradas (D36 pendiente de confirmación).

## 4. Archivos creados o modificados
- `app.json` (`android.package`), `package.json` y `package-lock.json` (`expo-dev-client`).
- `src/lib/`: `result.ts`, `dates.ts` (+ prueba).
- `src/domain/money/money.ts` (+ prueba).
- `src/domain/ledger/`: `types.ts`, `validateMovement.ts`, `balances.ts`, `timeline.ts`, `builders.ts` (+ pruebas).
- `src/domain/debts/debts.ts`, `src/domain/reports/home.ts`, `src/domain/periods/periods.ts`, `src/domain/categories/categories.ts` (+ pruebas).
- `docs/progress/*` y `docs/DEVELOPMENT_ROADMAP.md`.
- `android/` (generada por prebuild; ignorada por git).

## 5. Pruebas ejecutadas y resultados
- `npm test` → **168/168 pruebas pasan** (11 suites).
- `npm run typecheck` → sin errores.
- `npx expo lint` → sin problemas.
- Pureza: `grep -rE "from '(react-native|expo|@powersync|@supabase)" src/domain` → sin resultados.
- `npx expo run:android` → **BUILD FAILED** (3 min 25 s), ver §6.
- Emulador `Medium_Phone_API_37.0`: arranca bien (`boot_completed`, visible en `adb devices`).

## 6. Errores conocidos
- **Compilación nativa de Android bloqueada por rutas largas (persiste en `C:\dev\finkash`).** Ninja 1.10.2 (de CMake 3.22.1 del SDK) falla con `Filename longer than 260 characters` en `:app:buildCMakeDebug[x86_64]`. Ruta que falló (317 caracteres): `C:\dev\finkash\android\app\.cxx\Debug\32325o4f\x86_64\rngesturehandler_codegen_autolinked_build\CMakeFiles\react_codegen_rngesturehandler_codegen.dir\C_\dev\finkash\node_modules\react-native-gesture-handler\shared\shadowNodes\...\RNGestureHandlerDetectorShadowNode.cpp.o`. Mover el repo a `C:\dev\finkash` no basta: antes fallaba en `react-native-reanimated`, ahora en `react-native-gesture-handler`, y es la ruta *relativa* dentro de `.cxx` la que se alarga. `LongPathsEnabled` ya vale 1, pero Ninja < 1.12 no lo aprovecha.
  - **Opción B (recomendada):** instalar un CMake ≥ 3.31 (con Ninja ≥ 1.12) desde el SDK Manager o con `sdkmanager "cmake;<versión>"` (ya existe `cmdline-tools/latest`) y fijarlo en `android/app/build.gradle` (`externalNativeBuild.cmake.version`). Requiere descargar un componente: espera autorización.
  - **Alternativa sin descarga (no garantizada):** reducir la ruta con `subst` y/o `buildStagingDirectory` corto; ahorraría unos 40–60 caracteres sobre los 57 que sobran, con poco margen.
  - Como `android/` es generada por `prebuild`, cualquier cambio dentro de ella se pierde al regenerarla; si se adopta la opción B conviene hacerla con un config plugin de Expo.
- `npm` avisa que el script de instalación de `@parcel/watcher` no está aprobado (`allowScripts` de npm 11). No afecta pruebas, lint ni typecheck.
- `npm audit`: 22 vulnerabilidades moderadas en dependencias de desarrollo/herramientas (sin revisar aún).
- Git avisa de conversión LF→CRLF en archivos nuevos (sin impacto; sin `.gitattributes`).

## 7. Trabajo pendiente
- Cerrar la Tarea 2 (compilar e instalar el development build).
- Confirmar o corregir D36.
- Revisión final del plan con `agent-skills:code-review-and-quality`.
- Plan de la Fase 5 (base local PowerSync y repositorios con `checkChange`).
- Pendientes de diseño (`PENDING_TASKS.md`).

## 8. Siguiente acción recomendada
Autorizar la opción B del §6 (instalar CMake ≥ 3.31 desde el SDK) para cerrar la Tarea 2; después, revisión final del dominio y redacción del plan de la Fase 5.

## 9. Configuración o preparación externa pendiente
- Autorización para descargar CMake más nuevo (o elegir otra alternativa del §6).
- Más adelante: cuenta de Expo + EAS CLI (Fase 11); proyecto de desarrollo en Supabase y cuenta de PowerSync (Fase 9).

### Foto del entorno (2026-11-17)
- Git 2.56.0; rama `main`, remoto `origin` → `github.com/LordPanda04/FinKashApp.git`; **sin push** de ninguno de los commits anteriores.
- Node.js 26.13.1, npm 11.20.0; JDK 17.0.21 (`JAVA_HOME`).
- Android SDK: android-37.0, build-tools 36.0.0, CMake 3.22.1 (ninja 1.10.2), emulador 37.2.12, cmdline-tools `latest`.
- MCP de Stitch y Context7: conectados.
