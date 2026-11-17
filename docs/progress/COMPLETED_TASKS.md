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
- **Plan — Tarea 2 (parcial): `expo-dev-client` y `android.package`** = `com.lordpanda.finkash` (commit `d139451`, D35). El development build **no** pudo compilarse todavía (rutas largas de Ninja, ver `CURRENT_STATUS.md` §6); sigue pendiente su instalación en el emulador.
- **Plan — Tarea 3: dinero y fechas** (`eb376cf`).
- **Plan — Tarea 4: tipos del libro y validación de movimientos** (`c476260`).
- **Plan — Tarea 5: saldos y saldos diarios** (`041bc90`).
- **Plan — Tarea 6: deudas y préstamos** (`bd09f80`).
- **Plan — Tarea 7: validación de saldo en el tiempo (`checkChange`)** (`bbdf6c4`).
- **Plan — Tarea 8: apertura y arreglo de billetera** (`fa7ae24`).
- **Plan — Tarea 9: reportes de Inicio** (`600aa66`).
- **Plan — Tarea 10: periodos mensuales** (`845295e`).
- **Plan — Tarea 11: eliminación de categorías.** Con esto queda completo el núcleo de dominio (Fase 4): 168 pruebas, typecheck y lint en verde; `src/domain/` sin dependencias de React Native, Expo, PowerSync ni Supabase. Los puntos de atención 1–5 del plan tienen prueba.
