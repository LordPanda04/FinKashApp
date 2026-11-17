# FinKash — Tareas pendientes

## Configuración (usuario)
- [x] Node.js 26.13.1, JDK 17 (`JAVA_HOME`), `ANDROID_HOME` y PATH.
- [x] MCP de Stitch y Context7 conectados.
- [ ] Android Studio → SDK Manager → SDK Tools → "Android SDK Command-line Tools (latest)" (recomendado; podría necesitarse en la Tarea 2).

## Plan actual — `docs/superpowers/plans/2026-11-17-fundacion-y-dominio.md`
- [ ] Revisión del plan por el usuario y elección del método de ejecución.
- [ ] Confirmar las "Decisiones de este plan" (Tareas 9 y 10).
- [ ] Tarea 1: inicializar el proyecto Expo (plantilla SDK 58 en el scratchpad, copiar sin sobrescribir, Jest, TS estricto, `.gitignore` con `.env*`).
- [ ] Tarea 2: development build en el emulador `Pixel_8_Pro`.
- [ ] Tareas 3–11: núcleo de dominio con TDD (dinero y fechas, validación de movimientos, saldos, deudas, validación en el tiempo, apertura y arreglo, reportes de Inicio, periodos, eliminación de categorías).

## Pendientes de diseño
- [ ] Decidir si el nuevo Registrar (3 opciones) y las pantallas faltantes (`DESIGN_SYSTEM.md` §8) se diseñan antes en Stitch o se construyen con los componentes existentes. Debe estar resuelto antes del plan de interfaz (Fases 6–7).
- [ ] Confirmar estilos (tokens + `StyleSheet`), gráficos (`react-native-svg`) y paquete de íconos (Material Symbols), antes de la Fase 6.

## Planes siguientes
- [ ] Fase 5: base local PowerSync (tablas solo locales + `viewName`) y repositorios que usen `checkChange`.
- [ ] Fases 6–8: navegación, pantallas y periodos.
- [ ] Fases 9–11: Supabase, sincronización, EAS.

Ver `DEVELOPMENT_ROADMAP.md`.
