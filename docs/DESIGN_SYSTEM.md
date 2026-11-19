# FinKash — Sistema de diseño (extraído de Google Stitch)

Fuente: proyecto de Stitch `1937416366290885386` ("Liquid Glass Finance Tracker"), leído mediante el MCP de Stitch el 2026-11-16 (solo lectura; no se modificó nada en Stitch).
**Este diseño es la fuente de verdad visual. No rediseñar.** Si algo no está en Stitch, se lista en la §8 como faltante en lugar de inventarlo.
Los ajustes funcionales pedidos por el usuario el 2026-11-17 están en la §10 (borrador para aprobación).

## 1. Inventario del proyecto

| Elemento | ID en Stitch | Tamaño (px) |
|---|---|---|
| Design system "Finanzas — Design System" | `assets/canvas_node_node_13395358341331713513` | 960 × 1440 |
| Pantalla **Inicio** | `node_3969678783142992886` | 390 × 999 |
| Pantalla **Historial** | `node_4200789216622477651` | 390 × 884 |
| Pantalla **Registrar movimiento** | `node_2190975268700779264` | 390 × 884 |
| Pantalla **Billeteras** | `node_1283166990640699246` | 390 × 969 |
| Pantalla **Categorías** | `node_7776149188530680922` | 390 × 884 |

- Todas las pantallas son `MOBILE`, ancho 390 px, con HTML disponible (`projects/1937416366290885386/files/<id>`; se descarga con `mcp__stitch__download_file`).
- El MCP no devolvió capturas (el campo `screenshot` viene vacío); el HTML es la referencia precisa.
- El proyecto en Stitch tiene visibilidad **pública** (cualquiera con el enlace puede verlo).

## 2. Identidad
- Estética "Liquid Glass" (glassmorphism) inspirada en Apple Wallet / Apple Health, **solo modo claro**.
- Todo el texto visible en español; montos en Soles (`S/`).
- Reglas explícitas del diseño:
  - Usar números tabulares (`tabular-nums`) en todos los montos y fechas.
  - La barra de pestañas inferior lleva **solo íconos, sin texto**.
  - La pantalla **Inicio no tiene título superior** (empieza con el saludo).

## 3. Tokens

### 3.1 Colores
| Token | Valor | Uso |
|---|---|---|
| `primary` | `#1C9C4D` | Botón "+", CTA, ingresos, ítem activo, línea del gráfico |
| `on-primary` | `#FFFFFF` | Texto/ícono sobre `primary` |
| `primary-container` | `#E6F5EC` | Fondo del ítem activo, círculos de ícono, fila seleccionada |
| `on-primary-container` | `#0E5A2B` | Texto sobre `primary-container` |
| `background` | `#F5F5F7` | Lienzo de todas las pantallas |
| `on-background` | `#1D1D1F` | Títulos |
| `surface` | `rgba(255,255,255,0.72)` | Tarjetas de vidrio, barra de pestañas, chips |
| `surface-solid` | `#FFFFFF` | Perilla del switch |
| `surface-subtle` | `rgba(255,255,255,0.52)` | Píldora de mes, tarjeta "+ Agregar", hover |
| `on-surface` | `#1D1D1F` | Texto principal |
| `on-surface-muted` | `#86868B` | Texto secundario, íconos inactivos |
| `outline` | `rgba(255,255,255,0.85)` | Borde de 1 px de las superficies de vidrio |
| `outline-subtle` | `rgba(29,29,31,0.08)` | Separadores de filas, fondo neutro de íconos/badges |
| `danger` | `#E5484D` | Gastos, deudas por pagar, línea de umbral |
| `danger-container` | `#FDECEC` | Fondo de badges/íconos de peligro, etiqueta del umbral |
| `warning` | `#F5A623` | Definido, aún no usado en las pantallas |
| `yape` / `yape-container` | `#742384` / `rgba(116,35,132,0.10)` | Marca de la billetera Yape |
| `plin` / `plin-container` | `#00D1A0` / `rgba(0,209,160,0.12)` | Marca de la billetera Plin |

Colores de categoría en los ejemplos (fuera de los tokens):
- Gráfico de dona: Comida `#1C9C4D`, Servicios `#F59E0B`, Transporte `#3B82F6`, Entretenimiento `#AF52DE`.
- Íconos de categoría en las listas: color de Tailwind al 10 % de opacidad de fondo + tono 600 para el ícono (azul, ámbar, púrpura) o los tokens `primary`/`danger`.
- ⚠️ Inconsistencia menor: el púrpura de la dona (`#AF52DE`) no es el mismo que el de los íconos (`purple-500/600`). Propuesta: cada categoría guarda **un solo color hex**; el fondo del círculo se deriva con ese color al 10 % de opacidad.

### 3.2 Tipografía
Fuente **Inter** (pesos 400, 500, 600, 700) para títulos y cuerpo. Conversión a píxeles (1 rem = 16 px; el letter-spacing en em se convierte a px para React Native):

| Token | Tamaño | Interlineado | Peso | Letter-spacing |
|---|---|---|---|---|
| `display-lg-mobile` | 36 | 1.1 (≈40) | 700 | −1.08 |
| `headline-lg-mobile` | 28 | 1.2 (≈34) | 700 | −0.7 |
| `headline-md-mobile` | 20 | 1.25 (25) | 600 | −0.3 |
| `title-md-mobile` | 17 | 1.3 (≈22) | 600 | −0.17 |
| `body-md-mobile` | 15 | 1.45 (≈22) | 400 | 0 |
| `label-lg` | 14 | 1.25 (≈18) | 600 | 0 |
| `label-md` | 13 | 1.25 (≈16) | 500 | 0 |
| `label-sm` | 12 | 1.2 (≈14) | 500 | 0 |

Usos: `headline-lg` = títulos de pantalla y saludo; `display-lg` = monto grande al registrar; `headline-md` = saldos de billetera y total de la dona; `title-md` = títulos de tarjeta y CTA.

### 3.3 Radios
| Token | Valor |
|---|---|
| `card` | 24 px |
| `row` | 16 px |
| `badge` | 12 px |
| `pill` | 9999 (completamente redondeado) |

### 3.4 Sombras
| Token | Valor |
|---|---|
| `glass` | `0 8px 32px rgba(29,29,31,0.06)` + interior `0 1px 0 rgba(255,255,255,0.9)` |
| `glass-sm` | `0 4px 16px rgba(29,29,31,0.04)` + interior `0 1px 0 rgba(255,255,255,0.85)` |
| `fab` | `0 8px 20px rgba(28,156,77,0.35)` |

### 3.5 Espaciado (valores observados)
| Elemento | Valor |
|---|---|
| Margen lateral de pantalla | 20 px |
| Margen superior del contenido | 48 px |
| Margen inferior (espacio para la barra flotante) | 128 px |
| Separación entre secciones | 20–24 px |
| Relleno de tarjeta | 20 px (dona, flujo) / 16 px (billeteras, deudas) |
| Relleno de fila en listas | 16 px horizontal × 14 px vertical |
| Separación ícono–texto en filas | 12–14 px |
| Círculo de ícono | 40 px en listas, 36 px en formulario y deudas |
| Botón de ícono en cabecera | 40 px |
| Grilla de billeteras | 2 columnas, separación 14 px |

## 4. Componentes

| Componente | Descripción | Dónde aparece |
|---|---|---|
| `GlassCard` | `surface` + desenfoque de fondo + borde `outline` 1 px + radio `card` + sombra `glass` | Todas |
| `GroupedList` | `GlassCard` con filas separadas por líneas `outline-subtle` (estilo Ajustes de iOS) | Historial, Registrar, Categorías |
| `TabBar` | Píldora de vidrio flotante a 20 px del borde inferior, ancho = pantalla − 40 px, 5 ítems de 44 px solo con íconos | Todas |
| `TabBarFab` | Botón central "+" `primary`, ≈56 px, sombra `fab`, sobresale de la barra (margen vertical negativo de 12 px), escala 0.95 al presionar | Todas |
| Ítem activo de la barra | Círculo `primary-container`, ícono `primary` relleno (FILL 1); inactivos en `on-surface-muted` sin relleno | Todas |
| `IconCircle` | Círculo de 36/40 px con fondo de color al 10 % e ícono de 20 px | Listas, formulario |
| `HeaderIconButton` | Botón de vidrio de 40 px con sombra `glass-sm` (editar, agregar) | Historial, Categorías |
| `FilterChip` | Píldora de vidrio con texto `label-md` + chevron `expand_more` | Historial |
| `WalletBadge` | Etiqueta pequeña (`label-sm`, radio `badge`) con el color de la billetera: Yape púrpura, Plin turquesa, Efectivo neutro | Historial |
| `AmountText` | Números tabulares; gasto `danger` con "- S/", ingreso `primary` con "+ S/" | Historial, Billeteras, Inicio |
| `SegmentedControl` | Píldora de vidrio de 2 opciones; la activa en `primary` con texto blanco | Registrar |
| `AmountInput` | "S/" en `headline-md` gris + monto en `display-lg` centrado, teclado decimal | Registrar |
| `FormRow` | Fila con `IconCircle` + etiqueta + valor + `chevron_right` | Registrar |
| `Switch` | Estilo iOS: 48 × 28 px, encendido en `primary`, perilla blanca de 24 px | Registrar |
| `PrimaryButton` | Píldora de ancho completo, `primary`, texto `title-md`, sombra `fab` | Registrar |
| `WalletCard` | Tarjeta de vidrio (o con el color de marca de la billetera) con ícono, etiqueta de tipo ("Principal", "Digital"), nombre y saldo | Billeteras |
| `AddWalletCard` | Tarjeta `surface-subtle` con borde discontinuo de 2 px, `add_circle` + "+ Agregar billetera" | Billeteras |
| `CountBadge` | Píldora pequeña: "2 pendientes" (`primary-container`) / "Por pagar" (`danger-container`) | Billeteras |
| `InitialAvatar` | Círculo de 36 px con la inicial de la persona | Billeteras (deudas) |
| `DonutChart` | Anillo (radio 76, grosor 24); el segmento seleccionado es más grueso (28), se desplaza hacia afuera y tiene brillo verde; total al centro; leyenda vertical con la fila activa resaltada | Inicio |
| `FlowLineChart` | Curva suave `primary` de 3 px con relleno degradado (22 % → 0 %), 2 líneas de grilla tenues, línea de umbral discontinua `danger` con etiqueta en píldora, punto del día actual, eje X con 5 fechas | Inicio |
| `AmbientBackdrop` | 1–2 círculos grandes desenfocados detrás del contenido (`primary-container`, `plin-container`, `yape-container`), distintos por pantalla | Todas |

## 5. Íconos
**Material Symbols Outlined** (variante con relleno para el ítem activo de la barra). Íconos usados:
`home`, `schedule`, `add`, `account_balance_wallet`, `grid_view`, `restaurant`, `directions_car`, `payments`, `bolt`, `movie`, `favorite`, `edit`, `delete`, `expand_more`, `category`, `chevron_right`, `notes`, `calendar_today`, `smartphone`, `qr_code_2`, `add_circle`, `credit_card`, `account_balance`.
Tamaños: 24 px en la barra (28 px el "+"), 20 px en círculos, 18 px en acciones de fila.

## 6. Pantallas

### 6.1 Inicio
1. Saludo (`headline-lg`), sin título de pantalla. Stitch muestra "Hola, Leonardo!"; **por instrucción del usuario (2026-11-19, D50) el formato es `Hola!, <nombre>`**, con el nombre pedido en el primer arranque (§10.6).
2. Tarjeta **"Gastos del mes"**: píldora con el mes ("Noviembre"), dona por categoría con "Total gastado" y el monto al centro, leyenda con la categoría seleccionada resaltada.
3. Tarjeta **"Flujo del mes"**: variación neta arriba a la derecha ("+ S/ 1,015.50" en verde), gráfico de línea con línea de umbral "Límite: S/ 300.00" y eje X del 1 al 30 del mes.

### 6.2 Historial
1. Título "Historial" + botón de lápiz ("Editar historial").
2. Chips de filtro desplazables: **Fecha**, **Categoría**, **Billetera**.
3. Grupos por día ("Hoy", "Ayer", "14 Nov"), cada uno en una `GroupedList`.
4. Fila: ícono de categoría, descripción, `WalletBadge`, hora ("1:15 PM") y monto con signo y color.

### 6.3 Registrar movimiento
1. Título "Registrar movimiento".
2. `SegmentedControl`: **Gasto | Ingreso**.
3. Monto grande "S/ 0.00".
4. Formulario: **Categoría** (selector), **Billetera** (selector), **Descripción** (texto), **"¿Es de hoy?"** (switch con la fecha debajo).
5. CTA "Guardar movimiento".
- La barra de pestañas sigue visible: es una pantalla de pestaña, no un modal.

### 6.4 Billeteras
1. Título "Billeteras".
2. **"Mis Billeteras"**: grilla de 2 columnas (Efectivo "Principal", Yape "Digital", Plin "Digital") + tarjeta "+ Agregar billetera".
3. **"Deudas y Préstamos"**:
   - Tarjeta **"Me deben"** con contador ("2 pendientes"), personas con avatar de inicial y "+ S/".
   - Tarjeta **"Deudas con bancos"** ("Por pagar") con "Tarjeta BCP" (ícono `credit_card`) y "Préstamo Interbank" (ícono `account_balance`) en "- S/".
- Conclusión: **las deudas y las tarjetas de crédito viven dentro de Billeteras**, no en una pestaña propia.

### 6.5 Categorías
1. Título "Categorías" + botón "+" (agregar).
2. Una sola lista agrupada de categorías; cada fila muestra ícono, nombre y botones **editar** y **eliminar**. (Stitch mostraba además el tipo "Gasto"/"Ingreso" por fila: **reemplazado el 2026-11-19**, las categorías no tienen tipo; `FINANCIAL_RULES.md` §11.)

### 6.6 Formatos observados
- Montos: `S/ 1,840.00` (coma para miles, punto para decimales, espacio después de `S/`); con signo: `- S/ 24.50`, `+ S/ 500.00`. Dólares con el mismo formato: `$ 1,840.00`.
- Fechas: "16 Nov 2026", "14 Nov", "Hoy", "Ayer". Las horas de Stitch ("1:15 PM") **no se usan**: los movimientos solo tienen fecha (ver §10).

## 7. Diferencias entre el diseño y los requisitos (estado al 2026-11-17)
| # | Diferencia | Estado |
|---|---|---|
| 1 | Inicio no muestra el "Saldo disponible" | ✅ Resuelta: nuevo bloque de resumen (§10.1) |
| 2 | Inicio no tiene selector de billetera para el gráfico de flujo | ✅ Resuelta: el selector del resumen aplica a todo Inicio (§10.1, propuesta) |
| 3 | El umbral se rotula "Límite" aunque solo es una alerta | ✅ Se mantiene el texto de Stitch; la regla dice que nunca bloquea gastos |
| 4 | Registrar solo ofrece Gasto \| Ingreso | ✅ Resuelta: se agrega "Transferencia" (cambio de diseño aprobado por el usuario); compra con tarjeta = Gasto eligiendo la tarjeta (§10.3) |
| 5 | No hay selector de moneda | ✅ Resuelta: la moneda se hereda de la cuenta elegida (§10.3) |
| 6 | Billeteras no tiene acción de transferencia | ✅ Resuelta: botón "Transferir" en el detalle de billetera (§10.2) |
| 7 | Faltan las deudas personales que el usuario debe | ✅ Resuelta: sección "Deudas personales" con "Me deben" y "Debo" (§10.2) |
| 8 | Las tarjetas de billetera no muestran USD ni si son ahorro | ✅ Resuelta: muestran PEN y USD; el ahorro se excluye desmarcándolo en Inicio |
| 9 | Categorías muestra "Eliminar" en vez de "Archivar" | ✅ Resuelta: se elimina y los movimientos pasan a "Otros" (§10.5) |
| 10 | Faltan línea, disponible, cierre y pago de la tarjeta | ⚠️ Requiere pantalla de detalle de tarjeta (§8) |
| 11 | El Historial muestra la hora | ✅ Resuelta: solo fecha; la hora se quita de las filas (§10.4) |

## 8. Pantallas e interacciones faltantes en Stitch (no inventar; diseñarlas en Stitch o acordarlas)
Con los ajustes del 2026-11-17, la lista queda así (✳️ = ahora definida a nivel funcional en §10, aún sin diseño visual en Stitch):
1. Inicio de sesión y registro (opcionales, la app funciona sin cuenta) y onboarding (✳️ el paso del nombre en el primer arranque está definido en §10.6; falta el resto).
2. Selector de categoría y selector de billetera/cuenta (desde Registrar).
3. ✳️ Selector de fecha (calendario al desactivar "¿Es de hoy?").
4. ✳️ Formulario de transferencia entre mis billeteras (§10.3).
5. Crear/editar billetera (nombre, tipo, ícono/color, cuentas PEN/USD, apertura).
6. ✳️ Detalle de billetera (saldos, historial filtrado, "Arreglo de billetera", ocultar).
7. Crear/editar categoría (selector de color e ícono).
8. Detalle, edición y confirmación de eliminación de un movimiento; qué hace el lápiz del Historial.
9. Contenido de los filtros del Historial.
10. ✳️ Selector de deuda al registrar un movimiento con categoría "Préstamo" (§10.3); detalle de deuda.
11. Crear/detalle de tarjeta de crédito (línea, consumido, disponible, cierre, pago).
12. ✳️ Aviso de inicio de periodo mensual y confirmación con la lista de saldos por billetera (`FINANCIAL_RULES.md` §10; construidos en la Fase 8 según §10.7, sin diseño en Stitch).
13. Ajustes: umbrales, perfil, exportación, iniciar/cerrar sesión.
14. Interacción de la dona (selección de segmento) y del gráfico de flujo.
15. ✳️ Hoja de selección de billeteras con casillas (Saldo general).
16. ✳️ Aviso de operación bloqueada por saldo insuficiente.
17. Estados vacío, de carga y de error; indicador sin conexión / sincronización.
18. Modo oscuro (el diseño es solo claro).

**Propuesta para todas las faltantes:** construirlas con los componentes y tokens existentes (§3–§4), sin estilos nuevos. Si prefieres diseñarlas antes en Stitch, se espera a que estén listas.

## 9. Notas de implementación en React Native (Android primero)
- **Desenfoque de fondo:** `backdrop-blur-xl` es costoso y menos fiel en Android. Opciones: `expo-blur` (en Android requiere su método experimental) o un fondo blanco translúcido sin desenfoque como alternativa. Validar rendimiento en el emulador antes de decidir.
- **Sombras:** React Native ≥ 0.76 soporta la propiedad de estilo `boxShadow` (incluidas sombras interiores) en la nueva arquitectura; verificar el soporte de `inset` en Android con Context7 antes de usarla.
- **Fondo ambiental:** usar gradientes radiales en SVG o una imagen pre-renderizada en lugar de desenfoque en tiempo real.
- **Gráficos:** dona y curva son simples; se recomienda `react-native-svg` con componentes propios para igualar el diseño con precisión (pendiente de decisión).
- **Íconos:** el diseño usa Material Symbols (con eje de relleno). Verificar con Context7 qué paquete los provee en React Native; los Material Icons clásicos de `@expo/vector-icons` no son idénticos.
- **Fuente:** Inter mediante `expo-font` / `@expo-google-fonts/inter`.
- **Números:** activar `fontVariant: ['tabular-nums']` en todos los montos y fechas.
- **Estilos:** el HTML usa Tailwind; NativeWind podría reutilizar las clases, pero el desenfoque y las sombras interiores no se traducen directamente. Recomendación: tokens en TypeScript (`src/ui/tokens.ts`) + `StyleSheet`. Pendiente de decisión.
- La barra de pestañas y el botón "+" se implementan como una barra personalizada de Expo Router (no la barra por defecto).

## 10. Ajustes de interfaz definidos por el usuario (2026-11-17, borrador final para aprobación)
Son requisitos funcionales que se agregan al diseño de Stitch usando sus mismos componentes y tokens. Las reglas de negocio están en `FINANCIAL_RULES.md`.
- **[Usuario]** = definido por el usuario.
- **[Propuesta]** = completado por Claude; se puede corregir.

### 10.1 Inicio — bloque de resumen de saldos
- **[Usuario]** Nuevo bloque con **Saldo disponible**, **Saldo gastado** y **Saldo restante** (fórmula aceptada: `FINANCIAL_RULES.md` §9).
- **[Usuario]** Menú desplegable dentro del bloque: una billetera específica o **Saldo general**.
- **[Usuario]** En Saldo general, casillas para elegir qué billeteras se suman. Por ejemplo, Plin + Efectivo sin Yape.
- **[Usuario]** Botón de **ojo abierto/cerrado** que cambia los montos por `****`.
- **[Usuario]** Switch opcional de **saldo proyectado**: solo en Saldo general; definición aceptada en `FINANCIAL_RULES.md` §9.
- **[Propuesta]** Ubicación: justo debajo del saludo, antes de "Gastos del mes".
- **[Propuesta]** El alcance elegido (billetera o Saldo general) aplica a **todo Inicio**: resumen, dona y gráfico de flujo. Así se cumple el requisito del selector del gráfico.
- **[Propuesta]** El ojo oculta todos los montos de Inicio. Su estado y el alcance elegido se recuerdan en el dispositivo (`device_settings`).
- **[Propuesta]** Si hay saldos en USD, cada cifra muestra una segunda línea en `$`.
- **[Propuesta]** Componentes:
  - `GlassCard` como contenedor.
  - `FilterChip` para el desplegable.
  - `HeaderIconButton` para el ojo (íconos `visibility` / `visibility_off`).
  - `Switch` para la proyección.
  - Hoja inferior de vidrio con filas de casillas para elegir billeteras. La casilla es un componente nuevo: `primary` cuando está marcada y borde `outline-subtle` cuando no.

Boceto en texto:
```
┌───────────────────────────────────────┐
│ [Saldo general ▾]               (👁)  │
│ Disponible        S/ 2,855.50         │
│ Gastado           S/ 1,840.00         │
│ Restante          S/ 1,015.50         │
│ Ver proyectado                 [ ●○ ] │
└───────────────────────────────────────┘
```

### 10.2 Billeteras
- **[Usuario]** Cada `WalletCard` muestra el saldo actual. Si la billetera tiene cuentas en PEN y USD, muestra **ambos saldos**.
- **[Usuario]** Al tocar una tarjeta se abre el **Detalle de billetera**, con:
  - saldos
  - historial filtrado por esa billetera
  - **"Arreglo de billetera"**
  - **"Ocultar billetera"**
- **[Usuario]** (2026-11-19, D52) **Cuentas PEN/USD:** el formulario "Nueva billetera" arranca con Soles (`PEN`) seleccionada y deja elegir `PEN`, `USD` o ambas. La grilla "Mis billeteras" **no** muestra subcuentas `USD` inexistentes ni botones para agregarlas. En el Detalle de billetera, si la billetera no tiene cuenta en `USD`, aparece la fila **"Habilitar cuenta en dólares"** (ícono `payments`), que abre una hoja con saldo inicial opcional; es la única forma de agregar `USD` a una billetera existente. Una vez habilitada, la tarjeta muestra los dos saldos.
- **[Usuario]** Sección **Deudas personales**: "Me deben" y "Debo".
- **[Propuesta]** "Debo" reutiliza el estilo de la tarjeta "Me deben" con la paleta `danger`, como "Deudas con bancos".
- **[Propuesta]** "Deudas con bancos" se mantiene para tarjetas de crédito y deudas con instituciones.
- **[Propuesta]** "Arreglo de billetera" abre un formulario con:
  1. el saldo calculado
  2. un campo para el monto real
  3. la diferencia resultante
  4. la fecha (hoy por defecto)
- **[Usuario]** El detalle de billetera tiene un botón **"Transferir"** que abre el formulario de transferencia entre mis billeteras (§10.3), con esta billetera ya elegida como origen.
- **[Propuesta]** Las billeteras ocultas se ven en una sección plegable "Billeteras ocultas" al final, para poder mostrarlas de nuevo.

### 10.3 Registrar movimiento
- **[Usuario]** No hay selector de moneda. El selector de billetera lista **cuentas**: "Yape · S/", "Yape · $" y las tarjetas de crédito (para los gastos).
- **[Propuesta]** El prefijo del monto ("S/" o "$") cambia según la cuenta elegida.
- **[Usuario]** "¿Es de hoy?" viene activado. Al desactivarlo aparece un calendario para elegir el día.
- **[Usuario]** Si el egreso deja un saldo negativo, se bloquea y se muestra un aviso con el monto faltante. El aviso sugiere registrar antes un ingreso (categoría "Otros").
- **[Propuesta]** El aviso es una tarjeta de vidrio con un ícono en `danger`.

**Transferencia entre mis billeteras** (cambio de diseño aprobado por el usuario):
- **[Usuario]** El `SegmentedControl` pasa de 2 a 3 opciones: **Gasto | Ingreso | Transferencia**.
- **[Usuario]** La interfaz debe dejar claro que es una transferencia **entre mis billeteras**. Al guardar, se resta en la de origen y se suma en la de destino.
- **[Propuesta]** Con "Transferencia" activa:
  - Un subtítulo `label-md` en `on-surface-muted` bajo el monto dice "Entre mis billeteras".
  - El formulario cambia "Categoría / Billetera" por **"Desde"** y **"Hacia"**, ambos con `FormRow` e íconos `account_balance_wallet` y `swap_horiz`.
  - "Hacia" muestra solo cuentas de la misma moneda que "Desde" y distintas de ella.
  - Se mantienen Descripción y "¿Es de hoy?".
  - El CTA dice "Guardar transferencia".
- Este cambio no existe todavía en Stitch. No se modifica Stitch desde Claude: tú puedes actualizarlo allí, o se implementa con los componentes existentes según esta especificación.

**Préstamos** (categoría "Préstamo"):
- **[Usuario]** Prestar dinero = Gasto con categoría "Préstamo"; que me presten = Ingreso con categoría "Préstamo".
- **[Propuesta]** Al elegir la categoría "Préstamo" aparece una fila extra **"Deuda"** (`FormRow`, ícono `handshake`). Abre un selector con:
  - las deudas pendientes de la misma moneda ("Me deben" y "Debo")
  - **"+ Nueva deuda"**: pide persona o institución y, opcionalmente, vencimiento y cuotas

  El efecto de cada combinación está en `FINANCIAL_RULES.md` §7.

### 10.4 Historial
- **[Usuario]** Solo fechas. Las filas **no muestran hora**: queda solo el `WalletBadge` bajo la descripción (los grupos por día ya indican la fecha).
- **[Propuesta]** Las transferencias y pagos de tarjeta se muestran con el ícono `swap_horiz`. El monto va en color neutro (`on-surface`) sin signo y el badge dice "Yape → Plin".
- **[Propuesta]** Aperturas y arreglos se muestran con el ícono `tune`, en color neutro y con la etiqueta "Apertura" o "Arreglo".
- **[Propuesta]** Editar o eliminar un movimiento aplica la validación de saldo en el tiempo. La eliminación es definitiva, sin deshacer, y pide confirmación.

### 10.5 Categorías
- **[Usuario]** Crear, editar y eliminar categorías. "Otros" es la categoría base protegida.
- **[Usuario]** (2026-11-19) Las categorías **no muestran ni tienen tipo** (gasto/ingreso): hay una sola "Otros", una sola "Préstamo", etc. El tipo se elige al registrar el movimiento.
- **[Propuesta]** En las filas de las categorías de sistema ("Otros" y "Préstamo") no aparece el botón eliminar.
- **[Propuesta]** Al eliminar otra categoría se pide confirmación indicando cuántos movimientos pasarán a "Otros".

### 10.6 Primer arranque: nombre y billetera "Efectivo" (2026-11-19, D50 y D51)
- **[Usuario]** Si no hay nombre guardado (primer arranque), se pide el nombre para el saludo `Hola!, <nombre>` de Inicio. Se guarda en los ajustes locales del dispositivo y se puede editar después.
- **[Usuario]** La billetera **"Efectivo"** ya existe al abrir la app por primera vez (saldo 0); Inicio no muestra "Crea tu primera billetera" porque ya hay una.
- **[Propuesta]** El nombre se pide en una hoja inferior de vidrio ("¿Cómo te llamas?") con un `TextField`, el CTA "Continuar" y la acción secundaria "Omitir" (el saludo queda en "Hola!"). Sin diseño en Stitch: se construye con `BottomSheet`, `TextField` y `PrimaryButton`.
- **[Propuesta]** Para editarlo, se toca el saludo de Inicio y se abre la misma hoja con el título "Tu nombre" (no existe aún una pantalla de Ajustes, §8 punto 13).

### 10.7 Periodo mensual (Fase 8, 2026-11-19)
- **[Propuesta]** Aviso en Inicio, bajo el saludo: `GlassCard` con ícono `calendar_today`, título "Iniciar nuevo periodo", texto "Es <mes>. Revisa tus saldos y empieza el periodo.", `PrimaryButton` "Iniciar periodo" y acción de texto "Ahora no" (descarta hasta mañana). No se muestra sin billeteras.
- **[Propuesta]** Pantalla `/periodo` (fuera de las pestañas, con botón volver): título "Iniciar periodo de <Mes>"; tarjeta con el interruptor "¿Empieza el día 1?" (al apagarlo, `Calendar` y mensaje de error si el día es futuro o de otro mes); lista (`GroupedList`) de billeteras **visibles** con ícono, nombre, saldo por moneda y la acción "Corregir" (abre el Arreglo de billetera); `PrimaryButton` "Confirmar periodo".
- **[Propuesta]** Resumen de Inicio: línea `label-md` en `on-surface-muted` con "Periodo desde el <día> de <mes>" bajo el selector de alcance.
- **[Propuesta]** Historial: el filtro Fecha suma "Elegir mes…" (lista de meses con movimientos, el actual primero); con un mes elegido, el chip muestra su nombre, por ejemplo "Octubre 2026".
- **[Usuario]** (D52) Detalle de billetera: fila "Habilitar cuenta en dólares" cuando la billetera no tiene cuenta `USD` (ver §10.2).
