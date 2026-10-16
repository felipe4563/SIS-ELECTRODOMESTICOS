# Depósito destino por evento de recepción (compras)

Fecha: 2026-10-15

## Contexto y objetivo

Hoy una orden de compra (`compras`) tiene un único `id_deposito_destino`
fijo para toda la orden. `recibirMercaderia` usa ese mismo valor
(`comp.id_deposito_destino`) para absolutamente todo lo que se reciba de esa
compra, sin importar el producto ni cuántas tandas de mercadería lleguen.

El dueño necesita comprar productos a un proveedor (ej. 10 heladeras + 10
lavadoras + 10 licuadoras) sin saber de antemano a qué sucursal va cada
unidad, y decidir el destino **a medida que la mercadería llega
físicamente**, pudiendo repartir un mismo producto entre varias sucursales
(ej. de 10 heladeras, 6 a Sucursal Centro y 4 a Sucursal Norte).

El sistema ya está en producción con datos reales, así que el cambio tiene
que ser aditivo: ninguna fila ni columna existente se borra ni cambia de
significado, y la migración debe poder aplicarse sin downtime.

Fuera de alcance (decidido explícitamente con el dueño):

- **Reparto dentro de un mismo evento de recepción.** No hace falta que una
  sola pantalla de "recibir mercadería" permita partir una línea de producto
  en varios destinos a la vez. Alcanza con poder hacer varias recepciones
  parciales, cada una con su propio depósito destino — así, "6 a Centro + 4
  a Norte" son dos recepciones separadas, no una con reparto interno.
- **Relación número de serie ↔ depósito/sucursal.** Las series
  (`compra_detalle_series`) se siguen registrando por producto de la
  compra, no por depósito. No va a quedar registrado "este número de serie
  específico terminó en Sucursal Norte". Motivo: generalmente no se sabe
  qué número de serie es cuál hasta el momento de recibir, así que ligarlo
  al depósito de esa recepción puntual sería una mejora más grande,
  pendiente para una fase posterior si se necesita.
- **Deshacer/anular una recepción puntual.** Ya es una limitación existente
  hoy (solo se puede anular la compra completa, y solo si no llegó a
  RECIBIDO) — este cambio no la agrava ni la resuelve, queda documentada
  como limitación conocida.

## Modelo de datos

### `compra_recepciones` (ALTER)

- `id_deposito` bigint NOT NULL (tras la migración) — FK a
  `depositos.id_deposito`. Depósito al que fue **esa** recepción puntual.

`compras.id_deposito_destino` no se toca: sigue siendo obligatorio al crear
la compra (como hoy) y pasa a cumplir el rol de **valor sugerido por
defecto** — la primera recepción arranca con ese depósito preseleccionado,
editable antes de confirmar. Para una compra que va entera a una sola
sucursal (el caso más común), el flujo no cambia en nada.

## Migración (producción, sin downtime)

En tres pasos, cada uno seguro de aplicar solo:

```sql
-- 1. Columna opcional primero — el código viejo la ignora por completo.
ALTER TABLE compra_recepciones ADD COLUMN id_deposito INT NULL;

-- 2. Relleno del historial: cada recepción ya existente hereda el depósito
--    que tenía su compra en ese momento, para que el historial de
--    stock/kardex siga siendo coherente con lo que realmente pasó.
UPDATE compra_recepciones cr
JOIN compras c ON c.id_compra = cr.id_compra
SET cr.id_deposito = c.id_deposito_destino
WHERE cr.id_deposito IS NULL;

-- 3. Recién ahí, obligatoria + relación formal.
ALTER TABLE compra_recepciones
  MODIFY id_deposito INT NOT NULL,
  ADD CONSTRAINT fk_crec_deposito FOREIGN KEY (id_deposito) REFERENCES depositos(id_deposito);
```

Orden de despliegue: correr los 3 pasos contra producción primero, recién
después desplegar el backend nuevo. Mientras la migración ya corrió pero el
backend viejo sigue activo, no pasa nada (la columna nueva se ignora). No
hace falta coordinar un instante exacto ni downtime.

Rollback: al ser puramente aditivo, revertir es `ALTER TABLE
compra_recepciones DROP COLUMN id_deposito` — ninguna fila existente se
pierde. Se recomienda backup del dump antes de correr la migración, como
cualquier cambio sobre producción.

Nota (corrección hecha durante la implementación): la columna es `INT`, no
`BIGINT` — `depositos.id_deposito` es `int(11)`, y un FK entre tipos
distintos lo rechaza InnoDB (errno 150). Se detectó antes de tocar la base
real, corriendo primero contra una copia de prueba.

## Backend

### `recibirMercaderia` (`compras.Controller.js`)

- El body pasa a incluir `id_deposito` (obligatorio) junto con
  `recepciones`, `observaciones`, `codigos_barras`.
- Validar que `id_deposito` exista y esté `activo = 1`. **Corrección hecha
  durante la implementación, confirmada con el usuario:** no se agrega
  scoping por sucursal — cualquier usuario con permiso de recibir compras
  puede elegir cualquier depósito activo de cualquier sucursal, igual que
  ya funciona hoy el selector de depósito al crear la compra (ese selector
  tampoco está restringido por sucursal). Agregar una restricción nueva acá
  sin tocarla en el resto del módulo sería inconsistente, y además
  bloquearía justo el caso de uso que motiva este cambio (repartir una
  compra entre sucursales sin que el usuario que recibe tenga
  necesariamente acceso de "ver" esa otra sucursal).
- El INSERT a `compra_recepciones` pasa a incluir `id_deposito`.
- Los 4 puntos del loop que hoy usan `comp.id_deposito_destino` (lectura de
  `stock`, `INSERT ... ON DUPLICATE KEY UPDATE` de `stock`, relectura de
  `stock`, INSERT a `kardex`) pasan a usar el `id_deposito` de esa
  recepción puntual en vez del de la compra. El resto de la lógica (cálculo
  de costo promedio, acumulación de `cantidad_recibida`, armado del
  kardex, chequeo de recepción total vs. parcial) no cambia — ese chequeo
  sigue siendo por cantidad total del producto en la compra, sin importar a
  qué depósito fue cada parte.

### Permisos

Ninguno nuevo. Se reutilizan `compras.recibir` / `compras.recibir_parcial`
tal como existen hoy.

## Frontend (`CompraDetalle.jsx`, modal "Recibir mercadería")

- Selector de "Depósito destino" nuevo en el modal, uno por evento de
  recepción (no por línea de producto). Precargado con
  `compra.id_deposito_destino`, editable, listando los depósitos activos
  (sin restricción por sucursal — ver nota de Permisos arriba).
- El resto del modal (cantidades por producto, fotos, código de barras) no
  cambia.
- En la pestaña "Recepciones", cada evento ya listado debería mostrar a qué
  depósito fue, para que quede trazable cuál tanda fue a cuál sucursal.

## Testing

- Migración: correr los 3 pasos sobre una copia de la base de producción,
  confirmar que toda fila de `compra_recepciones` existente queda con un
  `id_deposito` coherente con la compra a la que pertenecía, y que el
  `ALTER ... NOT NULL` final no falla por nulos remanentes.
- Backend: recibir una compra en dos tandas con depósitos distintos y
  confirmar que el `stock` y el `kardex` quedan correctamente repartidos
  entre ambos depósitos, que `compra_detalle.cantidad_recibida` acumula
  igual que antes, y que el estado de la compra (`PARCIAL`/`RECIBIDO`) se
  calcula igual que hoy.
- Frontend: confirmar que el selector arranca con el depósito sugerido, que
  se puede cambiar antes de confirmar, y que una compra que se recibe
  entera de una sola vez (caso común) no agrega pasos extra.
