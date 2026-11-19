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

## Fase 6 (en código; pendiente de tu verificación visual)
- [x] Plan `2026-11-19-fase6-navegacion-y-tokens.md` ejecutado (tareas 1–3).
- [ ] **Verificación visual (usuario)** — con `npx expo start` y la app abierta en el emulador:
  - fondo `#F5F5F7` con círculos suaves de color detrás del contenido;
  - barra flotante con 5 íconos (inicio, reloj, "+" verde elevado, billetera, cuadrícula), sin texto;
  - el ítem activo con círculo verde claro; al tocar otro ítem cambia la pestaña;
  - el "+" abre "Registrar movimiento" con la barra visible;
  - botón/gesto atrás desde Registrar vuelve a la pestaña anterior;
  - Inicio empieza con "Hola!" y sin título superior; la letra se ve como Inter;
  - si cambias algo en `app.json` (ya se cambió `userInterfaceStyle` y se agregó el plugin `expo-font`), recompila con `npx expo run:android --no-bundler`.
- [ ] Anotar aquí las diferencias con Stitch que veas (no se corrigen en la Fase 6 salvo errores de funcionamiento).
- [ ] Confirmar D41–D42.

## Fase 7A (en código; pendiente de tu verificación visual)
- [x] Plan `2026-11-19-fase7a-categorias-y-billeteras.md` ejecutado (tareas 1–5).
- [ ] **Verificación visual (usuario)** — con `npx expo start` (un solo Metro en 8081) y la app abierta:
  - Categorías: se ven las 6 sembradas; "+" abre "Nueva categoría" (tipo, nombre, color, ícono); al guardar aparece en la lista sin recargar; editar cambia nombre/color; eliminar pide confirmación con el conteo "pasarán a «Otros»"; "Otros" y "Préstamo" no tienen botón de eliminar.
  - Billeteras: "+ Agregar billetera" crea "Yape" con PEN y USD y saldos iniciales, y se ve en la grilla con un saldo por moneda; un monto como "24,50" muestra error; tocar la tarjeta abre el detalle.
  - Detalle: saldos, movimientos de esa billetera, "Arreglo de billetera" (probar con saldo real 0 y con un valor distinto), "Ocultar billetera" (con confirmación) y que aparezca en "Billeteras ocultas" al volver; "Transferir" abre Registrar (aún esqueleto).
  - Cerrar y reabrir la app: los datos siguen ahí (base real de PowerSync).
- [ ] Anotar aquí las diferencias con Stitch que veas.
- [ ] Confirmar D43–D44.

## Fase 7B (en código; pendiente de tu verificación visual)
- [x] Plan `2026-11-19-fase7b-registrar-e-historial.md` ejecutado (tareas 1–5).
- [ ] **Verificación visual (usuario)** — con `npx expo start` y la app abierta en el emulador (ver "Cómo ver los cambios" abajo):
  - Registrar: un gasto con categoría y billetera; un ingreso; una transferencia entre dos billeteras (y ver los saldos en Billeteras); el prefijo cambia de "S/" a "$" con una cuenta en dólares; desactivar "¿Es de hoy?" y elegir otro día en el calendario.
  - Un gasto mayor al saldo: aviso "Saldo insuficiente" con el día y el faltante, y la sugerencia de registrar antes un ingreso "Otros".
  - "Préstamo": elegir una deuda existente y probar "+ Nueva deuda"; verla en Billeteras → "Me deben" (o "Debo").
  - Desde el detalle de una billetera, "Transferir" llega a Registrar en modo Transferencia con "Desde" elegida.
  - Historial: grupos Hoy/Ayer/fecha sin hora; filtros Fecha, Categoría y Billetera; el lápiz muestra "Editar" y "Eliminar"; editar un movimiento (incluido mover la fecha antes del ingreso que lo cubría: debe bloquearse) y eliminar uno (también uno bloqueado por saldo).
- [ ] Anotar aquí las diferencias con Stitch que veas.
- [ ] Confirmar D45–D46.

### Cómo ver los cambios en el emulador
1. Abrir el emulador `Medium_Phone_API_37.0` (Android Studio → Device Manager, o `emulator -avd Medium_Phone_API_37.0`).
2. En una terminal, en `C:\dev\finkash`: `npx expo start` (un solo Metro; si el 8081 está ocupado, cerrar el anterior).
3. Abrir la app "finkash" en el emulador (o pulsar `a` en la terminal de Expo). Los cambios de JavaScript/TypeScript se ven solos (Fast Refresh) mientras Metro está abierto.
4. Los cambios nativos (`app.json`, nuevos módulos nativos) requieren recompilar: `npx expo run:android --no-bundler`.

## Siguiente
- [ ] Config plugin de Expo para fijar `cmake.dir` (hoy en `android/local.properties`, local).
- [ ] Aprobar o corregir D36 (detalles de implementación del dominio).
- [ ] Plan 7C (Inicio con resumen, selector de alcance, dona y gráfico de flujo).

## Pendientes de diseño
- [ ] Decidir si el nuevo Registrar (3 opciones) y las pantallas faltantes (`DESIGN_SYSTEM.md` §8) se diseñan antes en Stitch o se construyen con los componentes existentes. Debe estar resuelto antes del plan de interfaz (Fases 6–7).
- [ ] Confirmar estilos (tokens + `StyleSheet`), gráficos (`react-native-svg`) y paquete de íconos (Material Symbols), antes de la Fase 6.

## Planes siguientes
- [x] Fase 5: base local PowerSync y repositorios (ver arriba).
- [ ] Fases 6–8: navegación, pantallas y periodos.
- [ ] Fases 9–11: Supabase, sincronización, EAS.

Ver `DEVELOPMENT_ROADMAP.md`.
