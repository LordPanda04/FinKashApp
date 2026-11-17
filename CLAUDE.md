# FinKash — Guía del proyecto para Claude Code

FinKash es una aplicación de finanzas personales (interfaz en español, enfocada primero en Perú: PEN por defecto, USD soportado).
Primero Android; iOS y Web después, sin reescribir la lógica de negocio.

**El repositorio y `docs/` son la fuente de verdad, no el historial de conversaciones.**

## Idioma
- Responder siempre en **español**: reportes, explicaciones, comentarios de código y toda la documentación en `docs/`.
- Mantener en inglés únicamente los nombres técnicos: variables, funciones, tipos, archivos, carpetas, tablas y columnas.

## Protocolo de sesión

### Al iniciar una sesión
1. Leer este archivo.
2. Leer `docs/progress/CURRENT_STATUS.md`.
3. Leer los documentos relevantes para la tarea (`docs/ARCHITECTURE.md`, `docs/FINANCIAL_RULES.md`, `docs/DATABASE_SCHEMA.md`, `docs/progress/DECISIONS.md`).
4. Inspeccionar el estado real del repositorio (`git status`, `git log`, archivos en disco). Nunca confiar en el resumen de una conversación anterior por encima del código.
5. Verificar que la última tarea completada realmente funciona (ejecutar sus pruebas).
6. Continuar desde el siguiente ítem de `docs/progress/PENDING_TASKS.md`.

### Al terminar una sesión (o al acercarse a los límites de contexto/uso)
- Actualizar `docs/progress/CURRENT_STATUS.md` (las 9 secciones), `COMPLETED_TASKS.md`, `PENDING_TASKS.md` y `DECISIONS.md` si se tomó alguna decisión.
- No apresurarse ni omitir pruebas. No dejar migraciones de base de datos a medio aplicar.
- Terminar la operación segura en curso y documentar el trabajo pendiente y los bloqueos.
- Dejar el repositorio en un estado consistente.

## Reglas de Git y seguridad (estrictas)
- Nunca cambiar la URL del remoto. Nunca cambiar ni crear ramas sin aprobación.
- Nunca sobrescribir ni eliminar archivos existentes sin revisarlos antes y tener un motivo.
- **Nunca hacer commit sin autorización explícita del usuario. Hacer push requiere una autorización explícita aparte.**
- Nunca publicar ni desplegar sin aprobación.
- Nunca colocar secretos en este archivo, en `docs/` ni en ninguna parte del repositorio. Los archivos `.env*` deben estar en `.gitignore`.
- La app cliente solo puede usar la **clave pública (publishable/anon) de Supabase**. La clave `service_role`/secreta nunca aparece en el código cliente, en variables `EXPO_PUBLIC_*` ni en el repositorio.
- Row Level Security debe estar activado en todas las tablas de usuario antes de que exista cualquier dato.

## Stack (ver docs/ARCHITECTURE.md)
Expo SDK 58 (React Native 0.88) · TypeScript strict · Expo Router · PowerSync (SQLite local, offline-first) · Supabase (Postgres + Auth) · Zod · Jest + React Native Testing Library · EAS Build.
- Usar un **development build**, no Expo Go (el SQLite nativo de PowerSync lo requiere).
- No agregar `expo-sqlite` junto con PowerSync.
- Verificar APIs y versiones de paquetes con Context7 (o la documentación oficial) antes de agregar dependencias.

## Reglas financieras innegociables (detalle completo en docs/FINANCIAL_RULES.md)
- El dinero se guarda en **unidades mínimas enteras** + código de moneda ISO. Nunca en punto flotante.
- Nunca sumar monedas distintas sin un movimiento de cambio explícito.
- Los saldos se **derivan de los movimientos**; nunca se guardan como contadores mutables.
- Solo los movimientos de un tramo (gasto, ingreso, compra con tarjeta) cuentan en los reportes de ingresos/gastos. Transferencias, pagos de tarjeta, movimientos de deudas y cambios de moneda son neutros.
- Saldo disponible = billeteras marcadas con `counts_as_available`, por moneda. Nunca mezclar ahorros, deudas de tarjeta, cuentas por cobrar ni dinero prestado.
- Los periodos mensuales nunca reinician ni borran datos automáticamente.
- No inventar respuestas a las preguntas abiertas de `docs/FINANCIAL_RULES.md`: preguntar al usuario.

## Diseño
El proyecto de Google Stitch (id `1937416366290885386`) es la fuente de verdad visual. No rediseñar.
Obtener el contenido real de las pantallas mediante el MCP de Stitch; no generar ni modificar pantallas en Stitch.

## Organización del código
- `src/app/` — solo rutas de Expo Router (delgadas; ubicación por defecto de la plantilla de SDK 58).
- `src/domain/` — lógica de negocio en TypeScript puro, sin imports de React Native, con pruebas unitarias completas.
- `src/data/` — base de datos local, cliente remoto, conector de sincronización y repositorios (las features acceden a los datos solo a través de repositorios).
- `src/features/`, `src/ui/`, `src/validation/`, `src/lib/`.
- `supabase/migrations/` — fuente de verdad del esquema de Postgres.

## Uso de plugins (evitar flujos superpuestos)
- Lluvia de ideas / requisitos: `superpowers:brainstorming`.
- Especificaciones: `agent-skills:spec-driven-development`. Planes: `superpowers:writing-plans`.
- Lógica de dominio: `superpowers:test-driven-development`. Errores: `superpowers:systematic-debugging`.
- Interfaz fiel a Stitch: `frontend-design`.
- Revisiones: `agent-skills:code-review-and-quality`, `agent-skills:security-auditor`.
