# FinKash — Tareas completadas

## 2026-11-16
- **Fase 0 — Auditoría del entorno.** Se inspeccionaron herramientas, Android SDK, Git, plugins y conexiones MCP (sin instalar nada).
- **Fase 0 — Intento de exploración de Stitch.** Bloqueado: MCP de Stitch sin configurar; el acceso web requiere iniciar sesión con Google.
- **Fase 0 — Arquitectura y evaluación de sincronización.** Se eligió PowerSync + Supabase frente a RxDB, Legend-State, TinyBase y sincronización propia. Reporte aprobado por el usuario.
- **Fase 1 — Documentación del proyecto.** Se crearon `CLAUDE.md` y todos los documentos permanentes en `docs/`; luego se tradujeron al español por pedido del usuario.
- **Fase 1 — MCP de Stitch.** Se agregó la entrada `stitch` a `~/.claude.json` (con respaldo previo), usando `${STITCH_API_KEY}` para no guardar la clave en el archivo.
- **Fase 1 — Verificación del entorno.** El usuario instaló Node.js 26.13.1 y JDK 25.0.5; verificados. Variables de Android aún pendientes.
- **Fase 1b — Exploración de Stitch.** Conexión verificada; se leyeron el proyecto, las 5 pantallas (HTML) y el design system. Resultado en `docs/DESIGN_SYSTEM.md`; `ARCHITECTURE.md` ajustado al diseño.

## 2026-11-17
- **Fase 2 — Borradores de reglas y esquema.** Con las definiciones consolidadas del usuario se reescribieron `FINANCIAL_RULES.md` y `DATABASE_SCHEMA.md`, se agregó la §10 a `DESIGN_SYSTEM.md` y se registraron D15–D26. Quedaban 5 decisiones pendientes (P1–P5).
- **Fase 2 — Decisiones P1–P5.** El usuario las respondió (préstamos como gasto/ingreso con categoría "Préstamo"; fórmula del resumen, periodo y proyección aceptados; transferencia como tercera opción de Registrar). Documentos actualizados; D27–D31 registradas.
- **Fase 2 — Aprobación.** El usuario aprobó `FINANCIAL_RULES.md`, `DATABASE_SCHEMA.md` y `DESIGN_SYSTEM.md` §10.
- **Fase 1 — Android.** Entorno verificado: JDK 17 en `JAVA_HOME`, `ANDROID_HOME` y PATH configurados; adb, emulador y AVDs responden.
- **Plan — Tarea 1: inicializar el proyecto Expo** (commit `48fee13`). Plantilla SDK 58, Jest, TypeScript estricto, ESLint y `.gitignore` con `.env*`. Pruebas, typecheck, lint y expo-doctor en verde.
- **Plan de implementación.** `docs/superpowers/plans/2026-11-17-fundacion-y-dominio.md` (Fases 3–4, 11 tareas); rutas movidas a `src/app/` en la documentación según la plantilla de SDK 58.
- **Traslado del repo a `C:\dev\finkash`** (rutas más cortas); `npm install` limpio y verificación de pruebas/typecheck tras el traslado.
- **Plan — Tarea 2 (parcial): `expo-dev-client` y `android.package`** = `com.lordpanda.finkash` (commit `d139451`, D35). Development build compilado e instalado en el emulador tras instalar CMake 3.31.6 (D37).
- **Plan — Tarea 3: dinero y fechas** (`eb376cf`).
- **Plan — Tarea 4: tipos del libro y validación de movimientos** (`c476260`).
- **Plan — Tarea 5: saldos y saldos diarios** (`041bc90`).
- **Plan — Tarea 6: deudas y préstamos** (`bd09f80`).
- **Plan — Tarea 7: validación de saldo en el tiempo (`checkChange`)** (`bbdf6c4`).
- **Plan — Tarea 8: apertura y arreglo de billetera** (`fa7ae24`).
- **Plan — Tarea 9: reportes de Inicio** (`600aa66`).
- **Plan — Tarea 10: periodos mensuales** (`845295e`).
- **Plan — Tarea 11: eliminación de categorías.** Con esto queda completo el núcleo de dominio (Fase 4): 168 pruebas, typecheck y lint en verde; `src/domain/` sin dependencias de React Native, Expo, PowerSync ni Supabase. Los puntos de atención 1–5 del plan tienen prueba.
- **Fase 5 — Base local PowerSync y repositorios** (plan `2026-11-19-fase5-base-local-y-repositorios.md`, 10 tareas, un commit local por tarea):
  - T1 dependencias y arnés con SQLite real (`1c3078c`), T2 esquema cliente (`8d5775e`), T3 semilla y lectura del libro (`59c44d9`), T4 validación Zod, T5 categorías, T6 billeteras y tarjetas, T7 deudas, T8 movimientos con `checkChange`, T9 periodos/umbrales/ajustes, T10 arranque con base local (`da7df62`).
  - 320 pruebas en verde, typecheck y lint limpios, `src/domain/` sin dependencias de `src/data` ni de React Native/Expo/PowerSync/Supabase.
  - Development build recompilado con `op-sqlite` (BUILD SUCCESSFUL).
  - **No verificado todavía:** la pantalla provisional con la base real en el emulador (la verificación visual quedó a cargo del usuario).
- **Fase 6 — Navegación, tokens y base visual** (plan `2026-11-19-fase6-navegacion-y-tokens.md`, tareas 1–3 con commit local; la 4 es este cierre):
  - T1 tokens de Stitch y fuente Inter con respaldo (`b920edc`), T2 íconos y componentes base de vidrio (`f858406`), T3 barra flotante con "+" elevado y 5 esqueletos de pantalla (`c013568`).
  - 365 pruebas en verde (29 suites), typecheck y lint limpios; Metro empaqueta sin errores.
  - **No verificado visualmente** (queda a cargo del usuario, ver `PENDING_TASKS.md`).
- **Fase 7A — Datos en vivo, Categorías y Billeteras** (plan `2026-11-19-fase7a-categorias-y-billeteras.md`, tareas 1–5 con commit local; la 6 es este cierre):
  - T1 notificador de cambios, repositorio `ledger` y `useQuery` (`4c0505f`), T2 componentes de lista, formulario y hojas (`d7eeb19`), T3 pantalla de Categorías (`8f9e960`), T4 pantalla de Billeteras con deudas y tarjetas (`6d61762`), T5 detalle de billetera y arreglo de saldo (`ba7ec71`).
  - 472 pruebas en verde (39 suites), typecheck y lint limpios; Metro empaqueta sin errores.
  - **No verificado visualmente** (a cargo del usuario, ver `PENDING_TASKS.md`).
