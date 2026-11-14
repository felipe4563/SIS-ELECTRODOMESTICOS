# Transferencias con depósito de origen por ítem — Diseño

> **Para el ejecutor:** después de aprobado este diseño, el siguiente paso es
> superpowers:writing-plans — ningún otro skill.

## Intención y por qué

Hoy una transferencia tiene **un único depósito de origen** a nivel de
cabecera: todos sus ítems salen obligatoriamente del mismo depósito. En la
práctica, cuando un traslado grande reúne productos de varios depósitos
distintos hacia una sola sucursal de destino (el caso que trajo el cliente:
5 productos, 5 depósitos de origen distintos, 1 sola sucursal destino), hoy
hace falta crear una transferencia separada por cada depósito de origen.

El cliente pidió explícitamente evitar eso: quiere armar **una sola
transferencia**, con un **destino único**, donde **cada producto pueda
declarar su propio depósito de origen**. Esto pasa a ser el comportamiento
normal de todas las transferencias de ahora en más, no un modo especial.

## Goals

- Una transferencia puede contener ítems cuyo depósito de origen varíe de
  ítem a ítem, con un único depósito de destino para todo el documento.
- El flujo de carga (`TransferenciaForm.jsx`) permite elegir depósito
  destino una vez, y después alternar libremente el depósito "que se está
  mirando" para agregar productos, sin perder lo ya agregado de otros
  depósitos.
- Enviar, recibir y anular una transferencia mueven el stock, kardex y
  series contra el depósito de origen **de cada ítem**, no contra un
  origen único de cabecera.
- La vista de detalle de una transferencia agrupa visualmente los ítems
  por depósito de origen (como en el ejemplo del cliente).
- Las transferencias existentes (con origen único de cabecera) siguen
  funcionando sin migrar datos a mano ni romper reportes existentes.

## Non-goals

- No se rediseña el flujo de búsqueda global de producto (Opción B,
  descartada por el cliente a favor de la Opción A).
- No se toca el flujo de compras, ventas, ni ningún otro módulo que no
  sea transferencias.
- No se agrega la posibilidad de **múltiples destinos** en una misma
  transferencia — el destino sigue siendo único por documento; solo el
  origen pasa a ser por ítem.

## Anti-goals

- Que una transferencia con múltiples orígenes rompa el cálculo de costo
  promedio ponderado al recibir en destino (hoy ya mezcla costos de
  orígenes distintos correctamente línea por línea — ver más abajo, hay
  que preservar esa lógica por ítem, no por cabecera).
- Que los reportes existentes que listan "depósito origen" de una
  transferencia queden rotos o muestren un valor engañoso cuando los
  ítems tienen orígenes mixtos.

## Constraints

- Node.js/Express + MySQL (sin ORM) en el backend; React + Vite en el
  frontend — mismo stack existente, sin librerías nuevas.
- Toda la lógica de movimiento de stock/kardex/series ya corre dentro de
  transacciones (`conn.beginTransaction()` / `commit` / `rollback`) en
  `inventarioOps.Controller.js` — se mantiene ese patrón.
- Las series de producto (`compra_detalle_series`) ya se asocian por
  línea de detalle (`id_transferencia_detalle`), no por transferencia —
  esa parte no cambia de forma, pero las consultas que hoy usan
  `t.id_deposito_origen` para filtrar/validar series pasan a usar el
  origen de la línea.

## Approaches (decidido en la conversación)

- **A — cambiar de depósito origen sobre la marcha (elegida).** El
  destino se fija una vez; el selector de origen se vuelve "qué depósito
  estoy mirando ahora" y se puede cambiar sin perder el carrito. Reutiliza
  casi toda la pantalla actual.
- **B — búsqueda global de producto.** Más potente (stock de todos los
  depósitos a la vez por producto) pero requiere una pantalla de búsqueda
  nueva. Descartada por costo/alcance mayor al necesario.
- **C — "paquete" de transferencias vinculadas.** No toca el esquema de
  base de datos, pero sigue generando una transferencia por depósito de
  origen — contradice el pedido explícito del cliente de no hacerlo
  transferencia por transferencia. Descartada.

## El cómo (decisiones)

### Esquema de base de datos

- **Nueva migración** `bd/migracion_38_transferencia_detalle_origen.sql`:
  - `ALTER TABLE transferencia_detalle ADD COLUMN id_deposito_origen INT NULL AFTER id_producto;`
  - Backfill: `UPDATE transferencia_detalle td JOIN transferencias t ON t.id_transferencia = td.id_transferencia SET td.id_deposito_origen = t.id_deposito_origen WHERE td.id_deposito_origen IS NULL;`
  - Después del backfill, `ALTER TABLE transferencia_detalle MODIFY id_deposito_origen INT NOT NULL;` (toda fila, vieja o nueva, siempre tiene un origen propio desde acá en adelante).
  - `FOREIGN KEY (id_deposito_origen) REFERENCES depositos(id_deposito)`.
- **`transferencias.id_deposito_origen`** (cabecera): pasa a ser
  **nullable** y deja de ser la fuente de verdad para el movimiento de
  stock. Se seguirá escribiendo con un valor **solo cuando todos los
  ítems del documento comparten el mismo origen** (caso más común, para
  no romper filtros/reportes existentes que filtran "por depósito
  origen" de una transferencia); queda `NULL` cuando los ítems tienen
  orígenes mixtos. Esta es mi decisión — no hace falta volver a
  preguntarle al cliente, es un detalle de implementación transparente
  para él.
- **Corrección post-revisión (importante):** las consultas que hoy
  asumen que `t.id_deposito_origen` siempre tiene valor usan
  `JOIN depositos dor ON dor.id_deposito = t.id_deposito_origen`
  (INNER JOIN). Con el campo en `NULL` para transferencias mixtas, un
  INNER JOIN no deja ese campo vacío: **elimina la fila entera** del
  resultado. Eso rompería `getTransferencias` y `getTransferencia` en
  `inventarioOps.Controller.js` (líneas 98, 112, 139 — esta última
  haría que la transferencia recién creada devuelva 404 en su propia
  pantalla de detalle) y los dos reportes de `reportes.Controller.js`
  (líneas 1485 y 2726). Las 4 consultas pasan a `LEFT JOIN`, con
  `COALESCE(dor.nombre, 'Varios depósitos')` donde se muestre el nombre
  del depósito origen.
- El filtro `id_deposito_origen` de `getTransferencias` (hoy
  `t.id_deposito_origen = ?`) deja de encontrar una transferencia mixta
  aunque uno de sus ítems sea de ese depósito. Pasa a
  `EXISTS (SELECT 1 FROM transferencia_detalle td WHERE td.id_transferencia = t.id_transferencia AND td.id_deposito_origen = ?)`.

### Backend (`inventarioOps.Controller.js`)

- `createTransferencia` / `updateTransferencia`: `items` ahora trae
  `id_deposito_origen` por ítem (en vez de uno solo en el body). Se valida
  que cada `item.id_deposito_origen !== id_deposito_destino` (el chequeo
  que hoy es "origen !== destino" a nivel de body pasa a hacerse por
  ítem). La cabecera sigue guardando `id_deposito_destino` siempre, e
  `id_deposito_origen` según la regla de arriba (único valor si todos los
  ítems coinciden, `NULL` si no).
- `enviarTransferencia`, `recibirTransferencia`, `anularTransferencia`:
  todo uso de `t.id_deposito_origen` para `stock`, `kardex` y las
  consultas/llamadas de `productoSeries` (`moverATransito`,
  `revertirATransito`) pasa a usar `item.id_deposito_origen` /
  `det.id_deposito_origen` (el de la línea, ya presente en el SELECT de
  `transferencia_detalle` porque la columna existe en esa tabla). El
  cálculo de costo promedio ponderado en `recibirTransferencia` (líneas
  554-565) ya es por ítem — solo cambia de dónde lee el origen para
  buscar `costo_promedio`.
- `asociarSeriesATransferencia`: recibe `idDepositoOrigen` por llamada
  (ya lo hace) — ahora ese valor viene del ítem, no del body global.

### Frontend (`TransferenciaForm.jsx`)

- El carrito (`items`) deja de indexarse solo por `id_producto`: una fila
  se identifica por el par `(id_producto, id_deposito_origen)`, porque el
  mismo producto puede venir de dos depósitos distintos en la misma
  transferencia. `agregarProducto` busca coincidencia por ese par, no
  solo por producto.
- `stockOrigen` dejade ser un mapa único que se pisa al cambiar de
  depósito: pasa a cachearse por depósito
  (`stockPorDeposito: { [idDeposito]: { [idProducto]: disponible } }`),
  para poder mostrar/validar cantidades de ítems ya agregados de otros
  depósitos sin perder esa información al cambiar el que se está
  mirando.
- El selector "Depósito Origen" dej de bloquear/resetear el destino; pasa
  a ser "depósito que estoy mirando ahora" y el destino se elige
  independiente (una vez fijado, ya no se vuelve a tocar). El catálogo de
  stock disponible siempre refleja el depósito actualmente seleccionado
  en ese selector.
- El carrito (vista resumen / bottom-sheet) agrupa visualmente los ítems
  por depósito de origen, con el nombre del depósito como encabezado de
  grupo — igual que el ejemplo de notas del cliente.
- Al enviar el formulario, cada ítem manda su propio `id_deposito_origen`
  en el payload.

### Vista de detalle (`TransferenciaDetalle.jsx`) y recepción

- La lista de ítems de la transferencia se agrupa por depósito de origen
  (encabezado de grupo con el nombre del depósito, igual que en el
  formulario de carga), en vez de una lista plana.
- El modal de envío/recepción muestra, por ítem, de qué depósito sale o a
  qué depósito corresponde ese origen — útil cuando hay varios.

## Review Focus

- **Mismo producto en dos orígenes distintos, misma transferencia:** el
  carrito y el guardado no deben fusionarlos en una sola línea — deben
  quedar como dos líneas separadas de `transferencia_detalle`, cada una
  con su propio `id_deposito_origen`.
- **Edición de una transferencia en BORRADOR con orígenes mixtos:** al
  reabrir para editar, cada ítem debe recargar su propio depósito de
  origen (no asumir el de cabecera), y el selector de "depósito que estoy
  mirando" debe partir de uno razonable (p.ej. el del primer ítem) sin
  romper los demás.
- **Envío parcial con orígenes mixtos:** despachar parcialmente un ítem
  del depósito A no debe tocar stock/kardex del depósito B de otro ítem
  de la misma transferencia.
- **Anulación con orígenes mixtos:** la devolución de stock en tránsito
  debe volver a **cada** depósito de origen correspondiente, no todo al
  mismo.
- **Transferencia recién creada con orígenes mixtos:** abrirla
  (`getTransferencia`), listarla (`getTransferencias`) y verla en los dos
  reportes afectados debe funcionar igual que una de origen único —
  confirmar que los 4 `LEFT JOIN` corregidos no la hacen desaparecer ni
  tira 404.
- **Transferencia histórica (pre-migración) de origen único:** después
  del backfill, enviar/recibir/anular una transferencia vieja debe seguir
  funcionando exactamente igual que antes (todas sus líneas apuntan al
  mismo origen que tenía la cabecera).

## Qué queda a cargo de quien ejecute

- El SQL exacto de la migración 38 (collation/engine igual que las tablas
  vecinas, revisar si `transferencia_detalle` usa `bigint`/`int` para
  `id_deposito` consistente con `depositos.id_deposito`).
- El detalle de componentes React para la agrupación visual por depósito
  (reutilizar el patrón de agrupación que ya exista en la base de código
  si hay alguno similar; si no, uno nuevo simple).
- Mensajes de validación exactos en español para los nuevos casos de
  error (p. ej. "El depósito de origen no puede ser igual al destino" ya
  existe pero pasa a evaluarse por ítem).
