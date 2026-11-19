# FinKash — Hoja de ruta de desarrollo

Cada fase termina con las pruebas en verde, la documentación actualizada y (solo con autorización explícita) un commit.

| Fase | Alcance | Criterio de salida |
|---|---|---|
| 0 | Auditoría del entorno, intento de exploración de Stitch, plan de arquitectura | ✅ Reporte aprobado (2026-11-16) |
| 1 | El usuario instala las herramientas; Stitch MCP + Context7 conectados; documentación del proyecto creada | Herramientas verificadas; Stitch accesible; docs en el repositorio |
| 1b | Exploración del diseño en Stitch | ✅ Pantallas, tokens, componentes y pantallas faltantes documentados en `docs/DESIGN_SYSTEM.md` (2026-11-16) |
| 2 | Resolver las preguntas financieras abiertas | ✅ `FINANCIAL_RULES.md`, `DATABASE_SCHEMA.md` y `DESIGN_SYSTEM.md` §10 aprobados (2026-11-17). Plan de Fases 3–4: `docs/superpowers/plans/2026-11-17-fundacion-y-dominio.md` |
| 3 | Inicializar el proyecto Expo (SDK 58, TS strict, Expo Router), linter, Jest, estructura de carpetas, design tokens | El development build corre en el emulador. **Parcial (2026-11-17):** proyecto, Jest, lint y `expo-dev-client` listos; la compilación nativa de Android sigue bloqueada por rutas largas de Ninja (ver `CURRENT_STATUS.md` §6). Design tokens: pendiente (Fase 6) |
| 4 | Núcleo de dominio con TDD: dinero, reglas de movimientos, saldos, reportes | ✅ Tareas 3–11 del plan: 168 pruebas en verde, typecheck y lint limpios, `src/domain/` sin imports de React Native/Expo/PowerSync/Supabase (2026-11-17) |
| 5 | Base local de PowerSync (sin servidor) + repositorios | ✅ Repositorios probados con SQLite real (320 pruebas). Pendiente: confirmación visual en el emulador de la base real de PowerSync (2026-11-19) |
| 6 | Estructura de navegación: pestañas + botón "+" elevado según Stitch | ✅ en código (365 pruebas, bundle OK). Pendiente: coincidencia visual con Stitch en el emulador, verificada por el usuario (2026-11-19) |
| 7 | Pantallas: Categorías → Billeteras + transferencias → Registrar movimiento → Historial (editar/eliminar) → Dashboard de Inicio | Dividida en 7A (✅ en código: datos en vivo, Categorías, Billeteras con detalle y arreglo; falta verificación visual), 7B (Registrar + Historial) y 7C (Inicio con gráficos). Cada pantalla debe coincidir con Stitch; flujos probados |
| 8 | Periodos financieros mensuales | Flujos de sugerencia, confirmación y descarte probados |
| 9 | Proyecto de desarrollo en Supabase, migraciones, RLS, Auth, sincronización con PowerSync | Sincronización entre dos dispositivos verificada; RLS verificado |
| 10 | Deudas y tarjetas de crédito | Reglas contables probadas de punta a punta |
| 11 | APK de preview con EAS, QA, exportación CSV/JSON | APK instalable |
| Después | iOS, Web | |
