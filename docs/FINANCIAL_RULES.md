# FinKash — Reglas financieras

Estado: **Borrador final para aprobación (2026-11-17).** Incorpora las definiciones del usuario del 2026-11-17 y sus respuestas a P1–P5.
Convenciones:
- **[Usuario]** = definido por el usuario.
- **[Propuesta]** = completado por Claude para que el modelo sea consistente; el usuario puede corregirlo.

## 1. Dinero y monedas
- **[Usuario]** Monedas soportadas: Soles (`PEN`, símbolo `S/`) y Dólares (`USD`, símbolo `$`).
- **[Usuario]** No existe conversión de divisas. Nunca se suman montos de monedas distintas; todo total se muestra por moneda.
- Los montos se guardan como enteros en la unidad mínima (céntimos / centavos) junto con el código de moneda. Nunca punto flotante.
- Formato de pantalla: `S/ 1,840.00` y `$ 1,840.00`; con signo: `- S/ 24.50`, `+ $ 500.00`.

## 2. Billeteras y cuentas
- **[Usuario]** Cada billetera (Efectivo, Yape, Plin, BCP…) puede tener hasta **2 cuentas independientes: una en `PEN` y otra en `USD`**.
- **[Usuario]** Al registrar un movimiento, la moneda se hereda de la cuenta de billetera elegida; el usuario nunca elige la moneda por separado.
- **[Usuario]** Las billeteras **no se eliminan ni se archivan**; solo se pueden **ocultar** en la interfaz. Siguen existiendo en la base de datos y en el historial.
- **[Propuesta]** Una billetera oculta no aparece en los selectores ni en el "Saldo general"; sus movimientos sí aparecen en el Historial. Para volver a usarla hay que mostrarla de nuevo.
- **[Propuesta]** La selección de billeteras del "Saldo general" en Inicio (§9) reemplaza la clasificación "disponible / ahorro" del requisito original: una billetera de ahorro simplemente se deja sin marcar.

## 3. Saldo inicial y "Arreglo de billetera"
- **[Usuario]** Toda cuenta nueva empieza en `0`. El saldo inicial se registra con un movimiento de **apertura** (`opening`) que **no** cuenta como ingreso.
- **[Usuario]** El saldo se calcula siempre a partir de los movimientos; nunca se guarda como un contador.
- **[Usuario]** Cada billetera tiene la opción **"Arreglo de billetera"**: el usuario declara el monto real y la app registra un movimiento de ajuste (`adjustment`) por la diferencia. No cuenta como ingreso ni gasto.
- **[Propuesta]** Una sola apertura por cuenta; las correcciones posteriores se hacen con "Arreglo de billetera".
- **[Propuesta]** El arreglo usa la fecha de hoy por defecto (se puede elegir otra con el calendario). Se guarda la diferencia calculada en ese momento y también el monto declarado, como referencia. Si después se editan movimientos anteriores, la diferencia guardada no se recalcula.
- **[Propuesta]** Una tarjeta de crédito con consumo previo también se registra con una apertura (§6).

## 4. Tipos de movimiento

| Tipo | Origen | Destino | ¿Cuenta en reportes? | Categoría |
|---|---|---|---|---|
| Gasto (`expense`) | cuenta de billetera **o tarjeta de crédito** | — | Sí, como gasto | Obligatoria (de gasto) |
| Ingreso (`income`) | — | cuenta de billetera | Sí, como ingreso | Obligatoria (de ingreso) |
| Transferencia (`transfer`) | cuenta de billetera | otra cuenta de billetera, misma moneda | No (neutro) | — |
| Pago de tarjeta (`card_payment`) | cuenta de billetera | tarjeta de crédito, misma moneda | No (neutro) | — |
| Apertura (`opening`) | tarjeta (consumo previo) | cuenta de billetera (saldo inicial) | No (neutro) | — |
| Arreglo (`adjustment`) | billetera (si baja el saldo) | billetera (si sube el saldo) | No (neutro) | — |

- **[Usuario]** Todo dinero enviado a otra persona o recibido de un tercero se registra como **Gasto** o **Ingreso** normal. Los préstamos también (§7).
- **[Usuario]** Las devoluciones y reembolsos se registran con la categoría **"Devolución / Reembolso"**, como ingreso o como gasto según indique el usuario.
- **[Propuesta]** Una compra con tarjeta de crédito se registra como **Gasto** eligiendo la tarjeta en el selector de billetera.
- Solo `expense` e `income` cuentan en los reportes. Así nunca se cuentan dos veces las transferencias, los pagos de tarjeta, las aperturas ni los arreglos.

## 5. Transferencias entre mis billeteras
- **[Usuario]** Una transferencia mueve dinero **entre billeteras propias ya creadas** (incluido Efectivo), en la misma moneda. De forma automática **se resta en la billetera de origen y se suma en la de destino**.
- **[Usuario]** La interfaz debe dejar claro que es una **transferencia entre mis billeteras**, no un pago a terceros. El diseño se modifica para incluirla (ver `DESIGN_SYSTEM.md` §10.3).
- **[Propuesta]** Origen y destino deben ser distintos y de la misma moneda. Al elegir el origen, el selector de destino muestra solo las cuentas compatibles.
- **[Propuesta]** Pagar una tarjeta de crédito no es una transferencia: se hace desde el detalle de la tarjeta ("Pagar tarjeta").

## 6. Saldo nunca negativo y validación en el tiempo
- **[Usuario]** Ninguna cuenta de billetera puede quedar con saldo negativo, en ningún momento.
- **[Usuario]** Si un egreso supera el saldo, la app lo **bloquea** y avisa que primero hay que registrar un ingreso (sugiriendo la categoría "Otros" si no se quiere detallar el origen).
- **[Usuario]** Se pueden **editar o eliminar físicamente** movimientos de cualquier fecha, **sin deshacer**, siempre que el resultado no deje ningún saldo negativo.
- **[Usuario]** Antes de crear un egreso, editar un monto o una fecha, o eliminar un ingreso o una transferencia, el dominio **simula toda la línea de tiempo** de las cuentas afectadas. Si el saldo cae bajo `0` en algún punto del historial o en el saldo actual, la operación se bloquea, se muestra el monto faltante y se indica qué egresos hay que editar o eliminar primero.
- **[Propuesta]** Como los movimientos solo tienen fecha (sin hora), la simulación revisa el **saldo al cierre de cada día**. Dentro de un mismo día no importa el orden.
- **[Propuesta]** La misma idea se extiende a:
  - Tarjeta de crédito: el consumo nunca supera la línea, y un pago nunca supera lo consumido.
  - Préstamo: lo devuelto nunca supera el saldo pendiente (§7).

## 7. Préstamos y deudas
- **[Usuario]** **Prestar mi dinero es un Gasto** que pronto será devuelto. **Que me presten dinero es un Ingreso** que pronto tendré que devolver.
- **[Usuario]** Ambos se registran con la categoría **"Préstamo"**, elegida al momento de registrarlos.
- **[Usuario]** Si una deuda ya está en curso (por ejemplo, de 6 meses de los que quedan 2), se registra solo el **saldo o las cuotas pendientes reales** desde ese momento.
- **[Usuario]** En Billeteras hay una sección de **Deudas personales**: "Me deben" y "Debo".
- **[Propuesta]** Cada préstamo es una **deuda** con: persona o institución, moneda, fecha de vencimiento opcional y, si es en cuotas, monto de cuota, cuotas restantes y próximo pago (mensual). Sin intereses.
- **[Propuesta]** Al registrar un Gasto o Ingreso con categoría "Préstamo" se elige **a qué deuda corresponde** (o se crea una nueva):

| Movimiento | Deuda nueva | Deuda existente "Me deben" | Deuda existente "Debo" |
|---|---|---|---|
| Gasto · Préstamo | Crea "Me deben" (presto dinero) | Aumenta lo que me deben (presto más) | Reduce lo que debo (pago una cuota o devuelvo) |
| Ingreso · Préstamo | Crea "Debo" (me prestan) | Reduce lo que me deben (me devuelven) | Aumenta lo que debo (me prestan más) |

- **[Propuesta]** Saldo pendiente de una deuda = saldo pendiente inicial (solo para deudas que ya existían al registrarlas) + lo que la aumenta − lo que la reduce. Nunca es negativo. Estado: "pendiente" si es mayor que 0 y "pagada" cuando llega a 0.
- **[Propuesta]** Una deuda que ya existía se registra con su saldo pendiente inicial y sin mover ninguna billetera (el dinero salió o entró antes de usar la app).
- **[Propuesta]** Las deudas con instituciones (por ejemplo, "Préstamo Interbank") usan el mismo modelo y aparecen en "Deudas con bancos" junto con las tarjetas de crédito.
- Consecuencia aceptada: los préstamos y sus devoluciones **sí aparecen** en los reportes de gastos e ingresos, bajo la categoría "Préstamo". Esto reemplaza el requisito original que los excluía.

## 8. Tarjetas de crédito
- **[Usuario]** Sin tarjetas bimoneda con línea compartida, sin cuotas, intereses ni pago mínimo.
- **[Usuario]** Un consumo descuenta de inmediato la línea disponible y cuenta como gasto ya realizado.
- La app calcula el **crédito consumido** (= lo adeudado) y el **crédito disponible** (= línea − consumido).
- Pagar la tarjeta desde una billetera es un `card_payment`: baja la billetera y el consumido, y **no** genera un segundo gasto.
- **[Propuesta]** Cada tarjeta tiene una sola moneda. Si el usuario tiene una tarjeta en PEN y otra en USD, se registran como dos tarjetas.
- **[Propuesta]** Se guardan el día de cierre y el día de pago como información y para la proyección (§9). No se calcula el saldo del estado de cuenta por ciclos.
- No se incluyen préstamos bancarios complejos.

## 9. Inicio: resumen de saldos
- **[Usuario]** Bloque con **Saldo disponible**, **Saldo gastado** y **Saldo restante**.
- **[Usuario]** Un menú desplegable permite ver una billetera específica o el **Saldo general**. En el Saldo general, el usuario marca con casillas qué billeteras sumar (por ejemplo, Plin + Efectivo sin Yape).
- **[Usuario]** Botón de ojo para mostrar u ocultar los montos (`****`).
- **[Usuario]** Fórmula aceptada (P2), para las billeteras del alcance elegido y el periodo activo:
  - **Saldo restante** = saldo actual.
  - **Saldo gastado** = gastos del periodo.
  - **Saldo disponible** = restante + gastado (lo que hubo para gastar en el periodo).

  Las tres cifras siempre cuadran, aunque haya transferencias entre billeteras marcadas y no marcadas.
- **[Usuario]** Saldo proyectado aceptado (P4): por defecto se muestra el saldo real. Un switch opcional muestra el saldo real **menos** el consumo pendiente de las tarjetas en esa moneda y **menos** las cuotas de deudas "Debo" que vencen antes del fin del mes. Solo aplica al Saldo general, porque las tarjetas no pertenecen a una billetera.
- Todo se muestra por moneda (PEN primero; USD solo si existe).

## 10. Periodos financieros mensuales
- Al inicio de cada mes la app sugiere iniciar un nuevo periodo; el usuario confirma manualmente.
- La app nunca reinicia ni borra datos.
- **[Usuario]** Comportamiento aceptado (P3):
  - El periodo activo empieza el día en que el usuario confirma (por defecto, el día 1 del mes).
  - Al confirmar se muestra la lista de billeteras visibles con su saldo calculado, para que el usuario lo valide o lo corrija con "Arreglo de billetera".
  - Si el usuario descarta la sugerencia, el periodo anterior sigue activo y la sugerencia vuelve a aparecer después.
  - Inicio muestra el periodo activo. El Historial y los reportes permiten ver cualquier mes.

## 11. Categorías, fechas, umbrales y acceso
- **[Usuario]** Existe la categoría de sistema protegida **"Otros"**, que no se puede eliminar.
- **[Usuario]** Al eliminar una categoría personalizada, todos sus movimientos pasan automáticamente a "Otros".
- **[Usuario]** (2026-11-19) **Las categorías no tienen tipo.** Existe una sola categoría "Otros", una sola "Préstamo", etc. Que un movimiento sea gasto o ingreso lo define el movimiento al registrarlo, no la categoría; el usuario solo ve la categoría, nunca "gasto" o "ingreso" en ella. Cualquier categoría se puede usar en un gasto o en un ingreso.
- **[Propuesta]** Categorías de sistema (una sola de cada una):
  - **"Otros"**: protegida.
  - **"Préstamo"**: también protegida, porque la usan las deudas (§7).

  Se puede cambiar su color e ícono, pero no su nombre ni eliminarlas.
- **[Propuesta]** "Devolución / Reembolso" viene creada por defecto, pero sí se puede eliminar.
- **[Propuesta]** Las transferencias, pagos de tarjeta, aperturas y arreglos no llevan categoría.
- **[Usuario]** Fechas: solo día/mes/año, zona horaria `America/Lima`, sin hora. En el formulario, el switch **"¿Es de hoy?"** viene activado; al desactivarlo aparece un calendario.
- **[Usuario]** Umbral mínimo: opcional, por moneda, global o por billetera. Es solo una alerta visual cuando el saldo baja del límite; **nunca bloquea gastos**.
- **[Propuesta]** El umbral "global" se compara con el Saldo general (las billeteras marcadas) de esa moneda.
- **[Usuario]** La app funciona completa **sin crear cuenta**. Iniciar sesión y sincronizar con la nube es opcional.

## 12. Requisitos originales reemplazados por decisiones del usuario
| Requisito original | Reemplazo (2026-11-17) |
|---|---|
| Prestar no es gasto; recibir un préstamo no es ingreso | Son Gasto / Ingreso con categoría "Préstamo" (§7) |
| Archivar categorías | Eliminar y reasignar a "Otros" (§11) |
| Clasificación de billetera "disponible / ahorro" | Casillas del Saldo general en Inicio (§9) — **[Propuesta]**, pendiente de tu confirmación |
| Fecha con posible hora | Solo fecha (§11) |
