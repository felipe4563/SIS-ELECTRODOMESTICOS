# Trazabilidad de números de serie — Diseño

## Intención y por qué

Hoy el sistema ya registra números de serie, pero solo en un punto: cuando
se recibe una compra (`compra_detalle_series`). Esa serie queda "colgada"
de esa compra para siempre — no sabe en qué depósito está ahora mismo, no
se puede elegir al transferir stock entre sucursales, y no se puede elegir
al vender. Además, todo el stock que ya existía **antes** de que existiera
esta función no tiene número de serie cargado.

El objetivo es que un número de serie deje de ser "un dato de la compra" y
pase a ser **una unidad física que el sistema rastrea**: dónde está ahora,
si se vendió y en qué venta, y su historial completo (quién la cargó, de
qué compra vino si vino de una, a qué depósitos pasó, en qué venta salió).
Esto habilita, a futuro, buscar "¿a quién le vendimos la serie X?" para
garantías y servicio técnico — pero esa búsqueda queda fuera de este
proyecto; este proyecto solo deja los datos registrados para que exista.

## Alcance de este proyecto

Tres puntos de entrada/movimiento se agregan sobre lo que ya existe:

1. **Detalle de producto → cargar series de stock antiguo**, en
   `ProductoDetalle.jsx` (pestaña "Stock", que ya muestra el desglose de
   stock por depósito — no se toca `Productos.jsx`, el catálogo), unidad
   por unidad, un depósito a la vez (mismo panel que el mockup aprobado:
   https://claude.ai/artifact/RjKJ5yCDvGJYkjH8vAEtCE, pero abierto desde
   la fila del depósito en vez de desde una lista de productos).
2. **Transferencias → elegir qué series viajan**, opcional, en el carrito
   que ya existe en `TransferenciaForm.jsx`.
3. **Ventas → elegir qué series salen**, opcional, en el carrito que ya
   existe en `VentaForm.jsx`.

## Goals

- Todo producto puede tener unidades con número de serie — no hace falta
  marcarlo por producto, es universal.
- Elegir una serie es **siempre opcional** en transferencias y ventas: el
  flujo actual (por cantidad, sin tocar series) debe seguir funcionando
  exactamente igual si el usuario no elige ninguna.
- Una serie "vive" en un depósito concreto en todo momento (salvo cuando
  está en tránsito o vendida) — eso es lo que permite ofrecerla para
  transferir o vender solo desde el lugar correcto.
- Se conserva el historial de quién cargó cada serie y de dónde salió
  (compra, carga manual, transferencia, venta).

## Non-goals (fuera de este proyecto)

- Búsqueda de "historial de una serie" para servicio técnico/garantías —
  los datos quedan grabados, pero la pantalla de búsqueda es un proyecto
  aparte.
- Hacer obligatoria la carga de series en ningún flujo.
- Tocar `Productos.jsx` (la lista/catálogo) — confirmado explícitamente
  por el usuario que no se toca. `ProductoDetalle.jsx` (la página de
  detalle de un producto, archivo distinto) sí se modifica — ver Flujo 1.
- Carga masiva (Excel) de series para stock antiguo — se decidió que la
  carga es manual, producto por producto, unidad por unidad.
- Reportes o dashboards nuevos sobre series.

## Anti-goals

- Que cargar una serie se sienta obligatorio o bloquee una venta/
  transferencia cuando el vendedor tiene apuro.
- Que el modelo de datos quede atado a "viene de una compra" — tiene que
  poder representar una serie cargada manualmente sin compra de origen.

## Decisiones tomadas con el usuario (chequeo de constructor)

Antes de pasar al plan, se hizo una revisión del documento con ojos de
"quién lo va a construir", que encontró dos contradicciones reales con
código ya en producción. Se resolvieron así:

**A. `VentaForm.jsx` ya tiene un campo de texto libre `numero_serie` +
foto por línea, ya guardado en `venta_detalle` y ya impreso en factura/
PDF (`VentaDetalle.jsx`, `VentaPDF.jsx`, `VentaImprimir.jsx`).** El
selector nuevo de Flujo 3 no lo reemplaza: **lo completa automáticamente**.
Al elegir una o más series del selector, el sistema llena ese campo que
ya existe — no se toca nada de lo que ya imprime.

Límite técnico encontrado: ese campo guarda **una sola serie por línea**
de `venta_detalle`. Si se eligen varias series para una línea con
cantidad > 1 (ej. cantidad 3, se eligen 2 series), esa línea se separa
automáticamente, al confirmar la venta, en varias líneas de cantidad 1:
una por cada serie elegida (con su propio `numero_serie`), más una línea
sin serie por la cantidad restante si no se completaron todas. Mismo
precio unitario, descuento e impuesto en cada línea resultante — el
total de la venta no cambia, y el vendedor nunca arma esto a mano, lo
hace el sistema al guardar.

**B. Series de compras recibidas en más de un depósito a la vez** (función
ya existente desde el diseño del 15/10 — ver
`docs/superpowers/specs/2026-10-15-recepcion-deposito-por-evento-design.md`,
que ya documenta como no-goal que no queda registrado qué serie fue a qué
depósito en ese caso): esas filas migradas quedan marcadas **"sin
depósito confirmado"** en vez de adivinar un depósito. No aparecen como
disponibles para elegir en transferencias/ventas hasta que alguien las
revise y asigne manualmente el depósito correcto (pantalla simple de
"series pendientes de ubicar", a definir en el plan).

**C. Cargar/elegir la serie también puede hacerse *después* de confirmada
la venta**, no solo al armar el carrito — para el caso del vendedor
apurado. Desde `VentaDetalle.jsx` (pantalla de una venta ya guardada), se
agrega el mismo patrón "Editar" ya construido en compras: por cada línea
sin serie, se puede elegir una de las series `EN_STOCK` en el depósito de
esa venta, o escribirla a mano. Al guardarla ahí, esa serie puntual pasa
a `VENDIDA` ligada a esa venta — el stock ya se descontó en el momento de
la venta (eso no cambia), esto solo completa el dato de cuál unidad
puntual fue.

## Decisiones de modelo de datos (llamada mía, a confirmar)

**Elevar `compra_detalle_series` a una tabla central de unidades**, en vez
de dejarla colgada solo de compras. Propuesta de forma (nombre y columnas
exactas los define el plan de implementación, esto es la forma
conceptual):

- Cada fila = una unidad física con número de serie.
- `id_producto` — a qué producto pertenece.
- `id_deposito_actual` — en qué depósito está *ahora* (NULL si está
  vendida). Esto es lo que ya existe hoy como `stock.id_deposito`, mismo
  concepto.
- `estado` — `EN_STOCK` / `EN_TRANSITO` / `VENDIDA`.
- `origen` — de dónde salió esta fila: `COMPRA` (con `id_detalle_compra`),
  o `MANUAL` (carga de stock antiguo, con `id_usuario` y fecha).
- Las fotos (`imagen_url`) se conservan igual que hoy.
- Las filas ya existentes en `compra_detalle_series` se migran a este
  modelo conservando su `id_deposito_actual` igual al depósito donde
  entró la compra (dato que hoy se puede derivar vía
  `compra_detalle → compra`), **excepto** las que vienen de una compra
  recibida en más de un depósito a la vez — esas quedan "sin depósito
  confirmado" (ver decisión B más abajo).

**Reglas de movimiento (llamada mía):**

- *Transferencia*: al **enviar** (pasa a `EN_TRANSITO`), la serie elegida
  deja de estar disponible en el depósito de origen. Al **recibir**, pasa
  a `EN_STOCK` con `id_deposito_actual` = depósito destino. Si la
  transferencia se **anula** antes de recibir, la serie vuelve a
  `EN_STOCK` en el depósito de origen.
- *Venta*: al confirmarse la venta, la serie elegida pasa a `VENDIDA` y
  guarda a qué venta pertenece. (Si una venta se anula, fuera de alcance
  decidir el detalle exacto de reversión — el plan lo resuelve siguiendo
  el mismo patrón que ya usa el sistema para anular compras/transferencias.)
- Una serie nunca se ofrece dos veces: si está `EN_TRANSITO` o `VENDIDA`
  no aparece como elegible en ningún selector.

## Flujo 1 — Detalle de producto: cargar series de stock antiguo

En `ProductoDetalle.jsx`, pestaña "Stock" (la que ya existe, con la
tabla "Stock por depósito": depósito, disponible, reservada, total,
último movimiento). Cada fila de depósito con stock disponible > 0
muestra cuántas unidades le faltan serie (ej. "5/8 sin serie") y un
link/botón para cargarlas. Al tocarlo, un panel lateral muestra una fila
por cada unidad en stock sin serie **de ese depósito**, con input de
texto + foto opcional por fila (igual patrón que ya existe en compras).
Se puede guardar parcialmente — no hace falta completar todas las filas
de una. Mockup aprobado (el panel lateral es el mismo; cambia desde
dónde se abre): https://claude.ai/artifact/RjKJ5yCDvGJYkjH8vAEtCE

## Flujo 2 — Transferencias: elegir series al mover stock

En `TransferenciaForm.jsx`, cada línea del carrito (producto + cantidad)
gana un botón opcional "Elegir series" que abre la lista de series
`EN_STOCK` en el depósito de origen para ese producto, limitada a la
cantidad puesta en el carrito. Si el usuario no abre ese selector, la
transferencia se comporta exactamente igual que hoy (solo por cantidad,
sin tocar ninguna serie puntual).

## Flujo 3 — Ventas: elegir series al vender

Mismo patrón en `VentaForm.jsx`: botón opcional "Elegir series" por línea
del carrito, mostrando las series `EN_STOCK` en el depósito desde el que
se vende. Opcional, no bloquea la venta si no se elige ninguna. Al
confirmar, completa automáticamente el campo `numero_serie` que ya existe
en `venta_detalle`, partiendo la línea en varias de cantidad 1 si se
eligió más de una serie (ver "Decisiones tomadas con el usuario" arriba).

También se puede adjuntar la foto de la serie ahí mismo, en el carrito
(hoy esa foto solo se puede subir después, desde el detalle de la
venta ya guardada). Técnicamente sigue siendo en dos pasos — la foto se
sube recién cuando la venta ya existe, reusando el endpoint que ya hay
para eso — pero para quien vende es un solo paso, igual que en compras.

**Además**, ya confirmada la venta, se puede completar la serie después
desde `VentaDetalle.jsx` — mismo patrón "Editar" ya construido en
compras, para el caso de una venta hecha con apuro.

## Qué queda para el plan de implementación

- Nombre final de tabla(s) y migración exacta desde `compra_detalle_series`.
- Cómo quedan marcadas y dónde se revisan las series "sin depósito
  confirmado" (pantalla simple de asignación manual).
- Endpoints nuevos: listar series disponibles por producto+depósito, cargar
  serie manual (Inventario), asociar series a una transferencia, asociar
  series a una venta (con el split de línea descrito arriba), editar serie
  de una venta ya confirmada.
- Ajustes a `editarSerieDetalle`/`agregarSerieDetalle`/`eliminarSerieDetalle`
  (ya existentes en `compras.Controller.js`) para operar sobre el modelo
  nuevo sin romper el flujo de compras actual.
- Detalle de UI de los botones "Elegir series" dentro de `CartItemRow` en
  `TransferenciaForm.jsx` y el componente equivalente en `VentaForm.jsx`,
  y del botón "Editar" en `VentaDetalle.jsx`.
- Si `numero_serie` debe ser único por producto hacia adelante (sin forzar
  limpieza retroactiva de datos existentes).
- Que el contador "faltan X de Y series" en Inventario se calcule como
  `stock.cantidad − series cargadas en ese depósito`, sin modificar cómo
  se calcula `stock.cantidad` hoy.
- Cómo se revierte una serie `VENDIDA` si se anula una venta (seguir el
  patrón ya usado para anular compras/transferencias).
