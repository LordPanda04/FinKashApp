# FinKash — Tareas pendientes

## Configuración (usuario)
- [x] Node.js 26.13.1, JDK 17 (`JAVA_HOME`), `ANDROID_HOME` y PATH.
- [x] MCP de Stitch y Context7 conectados.
- [x] Android SDK Command-line Tools presentes (`cmdline-tools/latest`).

## Plan actual — `docs/superpowers/plans/2026-11-17-fundacion-y-dominio.md`
- [x] Revisión del plan y método de ejecución (en la sesión principal, D34).
- [x] "Decisiones de este plan" confirmadas (D32, D33).
- [x] Tarea 1: inicializar el proyecto Expo (commit `48fee13`).
- [x] Tarea 2: development build instalado y abierto en `Medium_Phone_API_37.0` (CMake 3.31.6).
- [x] `android.package` definitivo: `com.lordpanda.finkash` (D35).
- [x] Tareas 3–11: núcleo de dominio con TDD (commits `eb376cf` … Tarea 11; ver `COMPLETED_TASKS.md`).
- [x] Revisión final del dominio (`agent-skills:code-review-and-quality`, 2026-11-19): corregido `parseAmountInput` (la coma solo agrupa miles; `"24,50"` ahora se rechaza) y añadida prueba de borde de saldo en 0. Falta solo la confirmación del usuario de D36.

## Fase 5 (cerrada, con un pendiente)
- [x] Plan `2026-11-19-fase5-base-local-y-repositorios.md` ejecutado (10 tareas).
- [ ] **Verificación visual (usuario):** abrir la app en el emulador y comprobar que muestra "Categorías: 6 · Movimientos: 0", cerrarla y reabrirla (siguen 6). Si falla, revisar `openLocalDatabase` y las vistas `viewName` de PowerSync.
- [ ] Confirmar D38–D40.

## Siguiente
- [ ] Config plugin de Expo para fijar `cmake.dir` (hoy en `android/local.properties`, local).
- [ ] Aprobar o corregir D36 (detalles de implementación del dominio).
- [ ] Escribir el plan de la Fase 6 (navegación y pantallas de Stitch).

## Pendientes de diseño
- [ ] Decidir si el nuevo Registrar (3 opciones) y las pantallas faltantes (`DESIGN_SYSTEM.md` §8) se diseñan antes en Stitch o se construyen con los componentes existentes. Debe estar resuelto antes del plan de interfaz (Fases 6–7).
- [ ] Confirmar estilos (tokens + `StyleSheet`), gráficos (`react-native-svg`) y paquete de íconos (Material Symbols), antes de la Fase 6.

## Planes siguientes
- [x] Fase 5: base local PowerSync y repositorios (ver arriba).
- [ ] Fases 6–8: navegación, pantallas y periodos.
- [ ] Fases 9–11: Supabase, sincronización, EAS.

Ver `DEVELOPMENT_ROADMAP.md`.
