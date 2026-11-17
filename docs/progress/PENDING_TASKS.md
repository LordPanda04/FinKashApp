# FinKash — Tareas pendientes

## Configuración (usuario)
- [x] Node.js 26.13.1, JDK 17 (`JAVA_HOME`), `ANDROID_HOME` y PATH.
- [x] MCP de Stitch y Context7 conectados.
- [x] Android SDK Command-line Tools presentes (`cmdline-tools/latest`).
- [ ] **Decidir cómo desbloquear la compilación nativa de Android** (ver `CURRENT_STATUS.md` §6): instalar un CMake más nuevo (con Ninja ≥ 1.12) desde el SDK Manager, u otra alternativa. Requiere descargar un componente del SDK, por eso espera tu autorización.

## Plan actual — `docs/superpowers/plans/2026-11-17-fundacion-y-dominio.md`
- [x] Revisión del plan y método de ejecución (en la sesión principal, D34).
- [x] "Decisiones de este plan" confirmadas (D32, D33).
- [x] Tarea 1: inicializar el proyecto Expo (commit `48fee13`).
- [~] Tarea 2: development build en el emulador `Medium_Phone_API_37.0`. `expo-dev-client` y `android.package` hechos (commit `d139451`); **falta compilar e instalar** (bloqueada por rutas largas de Ninja, incluso en `C:\dev\finkash`).
- [x] `android.package` definitivo: `com.lordpanda.finkash` (D35).
- [x] Tareas 3–11: núcleo de dominio con TDD (commits `eb376cf` … Tarea 11; ver `COMPLETED_TASKS.md`).
- [ ] Revisión final del plan (`agent-skills:code-review-and-quality`) y confirmación del usuario de D36.

## Siguiente
- [ ] Cerrar la Tarea 2 (compilar e instalar el development build) cuando se resuelva el bloqueo de Ninja.
- [ ] Aprobar o corregir D36 (detalles de implementación del dominio).
- [ ] Escribir el plan de la Fase 5: base local PowerSync (tablas solo locales + `viewName`) y repositorios que usen `checkChange` antes de escribir.

## Pendientes de diseño
- [ ] Decidir si el nuevo Registrar (3 opciones) y las pantallas faltantes (`DESIGN_SYSTEM.md` §8) se diseñan antes en Stitch o se construyen con los componentes existentes. Debe estar resuelto antes del plan de interfaz (Fases 6–7).
- [ ] Confirmar estilos (tokens + `StyleSheet`), gráficos (`react-native-svg`) y paquete de íconos (Material Symbols), antes de la Fase 6.

## Planes siguientes
- [ ] Fase 5: base local PowerSync y repositorios.
- [ ] Fases 6–8: navegación, pantallas y periodos.
- [ ] Fases 9–11: Supabase, sincronización, EAS.

Ver `DEVELOPMENT_ROADMAP.md`.
