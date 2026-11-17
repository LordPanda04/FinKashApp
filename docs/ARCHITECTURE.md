# FinKash — Arquitectura

Estado: **Dirección aprobada (2026-11-16)**. Las versiones deben volver a verificarse (Context7 / documentación oficial) al inicializar el proyecto.

## Objetivos
- Primero Android; iOS y Web después, con la misma lógica de negocio.
- Offline-first: la app es totalmente usable sin conexión.
- Exactitud financiera por encima de la comodidad (ver `FINANCIAL_RULES.md`).
- El diseño de Google Stitch es la fuente de verdad visual.

## Stack

| Capa | Elección | Notas |
|---|---|---|
| Runtime de la app | Expo SDK 58 (React Native 0.88, React 19.3) | Node ≥ 22.13. Requiere development build (no Expo Go). |
| Lenguaje | TypeScript, `strict` | |
| Navegación | Expo Router | Los archivos de rutas son delgados; la lógica vive en `src/features`. |
| Dominio | TypeScript puro (`src/domain`) | Sin imports de React Native. Reutilizable en todas las plataformas. |
| Base de datos local | SQLite de PowerSync (`@powersync/react-native` + `@op-engineering/op-sqlite`) | **No** agregar también `expo-sqlite`. |
| Capa de consultas | Drizzle o Kysely (ambos soportados por PowerSync), o SQL directo en repositorios | Se decide en la Fase 3. |
| Reactividad | Consultas en vivo de PowerSync (`@powersync/react`) | No se necesita TanStack Query para datos locales. |
| Validación | Zod | Compartida por formularios, repositorios y subidas de sincronización. |
| Formularios | react-hook-form + resolver de Zod | |
| Backend | Supabase Postgres + Supabase Auth | Esquema mediante migraciones de Supabase CLI. RLS en todas las tablas. |
| Sincronización | Servicio PowerSync (plan gratuito de Cloud para desarrollo, o Open Edition autoalojada) | Los Sync Streams replican las reglas de RLS (`user_id = auth.user_id()`). |
| Estilos | Tokens en TypeScript (`src/ui/tokens.ts`) + `StyleSheet` (recomendado); NativeWind opcional | Ver `DESIGN_SYSTEM.md` §9. Pendiente de confirmar. |
| Gráficos | `react-native-svg` con componentes propios (recomendado) | Dona y curva con umbral, según Stitch. Pendiente de confirmar. |
| Íconos / fuentes | Material Symbols Outlined (paquete por verificar) / Inter | Ver `DESIGN_SYSTEM.md` §5 y §9. |
| Pruebas | Jest (`jest-expo`), React Native Testing Library, `fast-check` para invariantes, Maestro para E2E | |
| Builds | EAS Build: `development`, `preview` (APK), `production` | |

## Capas

```
src/app/ (rutas)  →  src/features/* (pantallas, hooks)  →  src/data/repositories  →  src/data/local (SQLite de PowerSync)
                                  ↘ src/domain (reglas puras, usadas por features y repositorios)
src/data/sync (conector PowerSync)  ⇄  Supabase (PostgREST / RPC)  ⇄  Postgres  ⇄  Servicio PowerSync
```

Reglas:
- Las features nunca consultan la base de datos directamente; pasan por los repositorios.
- Los repositorios validan la entrada con Zod y aplican las reglas de dominio antes de escribir.
- `src/domain` no depende de React Native, PowerSync ni Supabase.

## Offline-first y sincronización
- La app solo lee y escribe en la base SQLite local.
- PowerSync puede funcionar **sin conectarse**: las Fases 3–8 son totalmente locales; la sincronización se activa en la Fase 9.
- **La app se usa completa sin cuenta** (decisión del usuario, 2026-11-17). Se usa el patrón de PowerSync de tablas solo locales (`localOnly: true`) con `viewName`. Al iniciar sesión, los datos se copian a las tablas sincronizadas en una transacción y se cambia el esquema con `updateSchema()`; ver `DATABASE_SCHEMA.md`. Referencia: demo `react-supabase-todolist-optional-sync` de PowerSync.
- Las escrituras van a la cola de subida de PowerSync; la función `uploadData()` del conector las envía a Supabase cuando hay conexión.
- Cada movimiento es una sola fila (ver `DATABASE_SCHEMA.md`), así que cada evento financiero se sincroniza de forma atómica.
- Política de conflictos: gana la última escritura por fila (por confirmar en `DECISIONS.md`).
- Requisitos de Postgres: publicación llamada `powersync`; rol de replicación dedicado con `REPLICATION`, `BYPASSRLS`, `SELECT`.
- Las instancias del plan gratuito de PowerSync Cloud se desactivan tras aproximadamente una semana de inactividad.

## Seguridad
- El cliente usa solo la clave pública (publishable/anon) de Supabase mediante `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY` en un `.env.local` ignorado por git. Los valores `EXPO_PUBLIC_*` quedan incrustados en el bundle: solo valores públicos.
- Las claves `service_role`/secretas nunca van en la app ni en el repositorio; solo en el panel de Supabase / CI / secretos de EAS.
- RLS activado en todas las tablas de usuario antes de que existan datos; las políticas usan `user_id = auth.uid()`.
- Proyectos de Supabase separados para desarrollo y producción.
- Almacenamiento de la sesión de Auth en el dispositivo: decisión pendiente (límites de tamaño de SecureStore vs. AsyncStorage).

## Respaldo y recuperación
- Supabase guarda la copia en la nube (el plan gratuito no tiene recuperación a un punto en el tiempo; los respaldos diarios vienen con Pro).
- Exportación CSV/JSON dentro de la app (Fase 11).
- La base local persiste durante los periodos sin conexión.

## Estructura del proyecto

```
src/
  app/                   # Solo rutas de Expo Router (delgadas). En SDK 58 la plantilla usa src/app/
    _layout.tsx
    (auth)/
    (tabs)/_layout.tsx     # barra de pestañas flotante personalizada con botón "+" verde elevado
    (tabs)/index.tsx       # Inicio
    (tabs)/historial.tsx
    (tabs)/registrar.tsx   # Registrar movimiento (Gasto | Ingreso | Transferencia); la barra sigue visible
    (tabs)/billeteras.tsx  # incluye "Deudas y Préstamos" (deudas y tarjetas, según Stitch)
    (tabs)/categorias.tsx
  domain/                # money/ ledger/ periods/ cards/ debts/ reports/ (+ *.test.ts)
  data/
    local/               # esquema cliente de PowerSync, instancia de la base
    remote/              # cliente de Supabase, auth
    sync/                # conector de PowerSync
    repositories/
  features/              # inicio, historial, movimientos, billeteras, categorias, deudas, tarjetas, periodos, auth
  ui/                    # tokens, componentes base, TabBar, FAB, envoltorios de gráficos
  validation/            # esquemas Zod
  lib/                   # fechas (America/Lima), formato es-PE
supabase/                # migrations/, seed.sql, config.toml
powersync/               # configuración de Sync Streams
tests/e2e/               # flujos de Maestro
docs/
```

## Alternativas de sincronización evaluadas
| Opción | Por qué no se eligió |
|---|---|
| RxDB | Modelo de documentos; exige `_modified`/`_deleted` en cada tabla; el almacenamiento SQLite en RN ha sido históricamente de pago (verificar). |
| Legend-State | Almacén clave-valor observable, débil para reportes relacionales. |
| TinyBase / Turso / ElectricSQL / LiveStore / Jazz | Modelos de backend distintos o sincronización solo de lectura. |
| Sincronización propia (expo-sqlite + Supabase) | Borrados, reintentos y conflictos hechos a mano: alto riesgo para datos financieros. |
