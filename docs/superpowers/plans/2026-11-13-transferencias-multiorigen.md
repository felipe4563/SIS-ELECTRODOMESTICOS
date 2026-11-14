# Transferencias con depósito de origen por ítem — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una transferencia puede contener ítems cuyo depósito de origen
varía ítem a ítem, con un único depósito de destino para todo el
documento, sin romper ninguna transferencia ni reporte existente.

**Architecture:** La columna `id_deposito_origen` se mueve de
`transferencias` (cabecera) a `transferencia_detalle` (por ítem). La
cabecera conserva `id_deposito_origen` como columna nullable de
conveniencia (poblada solo cuando todos los ítems comparten un mismo
origen). Todo backend que movía stock/kardex/series contra el origen de
cabecera pasa a usar el origen de cada línea. El frontend reestructura el
carrito de `TransferenciaForm.jsx` para permitir agregar productos de
distintos depósitos sin perder lo ya agregado, y agrupa visualmente por
depósito de origen tanto ahí como en `TransferenciaDetalle.jsx`.

**Tech Stack:** Node.js/Express + MySQL (mysql2, sin ORM) en el backend;
React + Vite en el frontend. Sin frameworks de test en el proyecto (ni
backend ni frontend) — cada tarea cierra con verificación manual (curl
para endpoints, pasos de UI para pantallas) en vez de tests automatizados.

**Spec:** `docs/superpowers/specs/2026-11-13-transferencias-multiorigen-design.md`

## Global Constraints

- Node.js/Express + MySQL sin ORM; sin librerías nuevas.
- Toda operación que mueve stock/kardex/series corre dentro de una
  transacción (`conn.beginTransaction()` / `commit` / `rollback`) en
  `backend/controllers/inventarioOps.Controller.js` — se mantiene ese
  patrón exactamente igual, solo cambia de qué columna lee el origen.
- `transferencias.id_deposito_origen` queda **nullable**: valor único si
  todos los ítems del documento comparten el mismo depósito de origen,
  `NULL` si los ítems tienen orígenes mixtos.
- Las 4 consultas que hoy hacen `JOIN depositos dor ON dor.id_deposito = t.id_deposito_origen`
  (y las que encadenan `JOIN sucursales sor ON sor.id_sucursal = dor.id_sucursal`
  a partir de ese join) pasan a `LEFT JOIN` — si no, una transferencia con
  `id_deposito_origen = NULL` desaparece de esa consulta en vez de mostrar
  el campo vacío.
- Nombre de columna nueva: `transferencia_detalle.id_deposito_origen`
  (`int(11) NOT NULL` tras el backfill), FK `fk_td_dep_origen` hacia
  `depositos(id_deposito)` — mismo estilo que las FK existentes de este
  proyecto (`fk_td_producto`, `fk_td_transferencia`, `fk_tr_dep_origen`).

## Review Focus

- **Mismo producto, dos orígenes distintos, misma transferencia:** el
  carrito y el guardado deben crear dos líneas separadas de
  `transferencia_detalle`, no fusionarlas — cubierto en Tarea 8.
- **Transferencia con orígenes mixtos recién creada:** abrirla, listarla y
  verla en los 2 reportes de `reportes.Controller.js` no debe dar 404 ni
  desaparecer de la lista — cubierto en Tareas 3 y 7.
- **Envío/recepción/anulación parcial con orígenes mixtos:** mover stock
  de la línea del depósito A no debe tocar stock del depósito B de otra
  línea de la misma transferencia — cubierto en Tareas 4, 5 y 6.
- **Transferencia histórica (pre-migración) de origen único:** después
  del backfill, su único comportamiento visible debe ser idéntico al de
  antes de esta migración — cubierto en Tarea 1 (verificación del
  backfill) y re-chequeado en Tareas 4-6.
- **Edición de un borrador con orígenes mixtos:** reabrir para editar debe
  hidratar el origen de cada línea desde su propio valor, no asumir el de
  cabecera — cubierto en Tarea 8.

---

### Tarea 1: Migración de base de datos

**Files:**
- Create: `bd/migracion_38_transferencia_detalle_origen.sql`

**Interfaces:**
- Produce: columna `transferencia_detalle.id_deposito_origen` (`int(11) NOT NULL`
  tras el backfill), FK `fk_td_dep_origen`, índice `idx_td_dep_origen`.
  Tareas 2-9 leen/escriben esta columna.

- [ ] **Paso 1: Escribir la migración**

```sql
-- ============================================================================
-- Migración 38: depósito de origen por ítem de transferencia
-- ============================================================================
-- Hoy una transferencia tiene un único id_deposito_origen de cabecera:
-- todos sus ítems salen del mismo depósito. El cliente pidió poder armar
-- una sola transferencia con ítems de depósitos de origen distintos hacia
-- un único destino (ver docs/superpowers/specs/2026-11-13-transferencias-
-- multiorigen-design.md). El origen real de cada línea pasa a vivir acá;
-- transferencias.id_deposito_origen queda como columna de conveniencia
-- (NULL cuando los ítems tienen orígenes mixtos).
-- ============================================================================

ALTER TABLE `transferencia_detalle`
  ADD COLUMN `id_deposito_origen` INT(11) NULL AFTER `id_producto`;

UPDATE transferencia_detalle td
  JOIN transferencias t ON t.id_transferencia = td.id_transferencia
  SET td.id_deposito_origen = t.id_deposito_origen
  WHERE td.id_deposito_origen IS NULL;

ALTER TABLE `transferencia_detalle`
  MODIFY COLUMN `id_deposito_origen` INT(11) NOT NULL;

ALTER TABLE `transferencia_detalle`
  ADD CONSTRAINT `fk_td_dep_origen` FOREIGN KEY (`id_deposito_origen`) REFERENCES `depositos` (`id_deposito`);

ALTER TABLE `transferencia_detalle`
  ADD INDEX `idx_td_dep_origen` (`id_deposito_origen`);

ALTER TABLE `transferencias`
  MODIFY COLUMN `id_deposito_origen` INT(11) NULL;
```

- [ ] **Paso 2: Backup antes de aplicar**

Seguir el procedimiento ya establecido en este proyecto: `mysqldump` completo
de la base real a `bd/backups_local/`, restaurar en una copia de prueba,
aplicar la migración ahí primero.

- [ ] **Paso 3: Aplicar en la copia de prueba y verificar el backfill**

```sql
SELECT COUNT(*) FROM transferencia_detalle WHERE id_deposito_origen IS NULL;
-- Esperado: 0

SELECT td.id_detalle, td.id_deposito_origen, t.id_deposito_origen
FROM transferencia_detalle td JOIN transferencias t ON t.id_transferencia = td.id_transferencia
WHERE td.id_deposito_origen <> t.id_deposito_origen;
-- Esperado: 0 filas (todo detalle hereda exactamente el origen de su cabecera)
```

- [ ] **Paso 4: Aplicar en la base real** (tras verificar el Paso 3)

- [ ] **Paso 5: Commit**

```bash
git add -f bd/migracion_38_transferencia_detalle_origen.sql
git commit -m "feat(db): id_deposito_origen por item de transferencia (migracion 38)"
```

---

### Tarea 2: Backend — crear/editar transferencia con origen por ítem

**Files:**
- Modify: `backend/controllers/inventarioOps.Controller.js:190-310` (`createTransferencia`, `updateTransferencia`)

**Interfaces:**
- Consumes: columna `transferencia_detalle.id_deposito_origen` (Tarea 1).
- Produces: el body de `POST /inventario/transferencias` y
  `PUT /inventario/transferencias/:id` pasa a esperar
  `items: [{ id_producto, cantidad, id_deposito_origen, series?, observacion? }]`
  (en vez de un único `id_deposito_origen` a nivel de body). Tareas 8-9
  (frontend) arman el body con esta forma.

- [ ] **Paso 1: Validar por ítem en `createTransferencia` (línea ~196-207)**

Reemplazar la validación única `id_deposito_origen` del body por: cada
`item` debe traer `item.id_deposito_origen`; si
`String(item.id_deposito_origen) === String(id_deposito_destino)` para
algún ítem, `ApiError(400, 'El depósito de origen no puede ser igual al destino')`.
`id_deposito_destino` se sigue exigiendo una sola vez (sigue siendo de
cabecera). Ya no se exige `id_deposito_origen` en el body de nivel
superior.

- [ ] **Paso 2: Calcular el `id_deposito_origen` de cabecera**

Antes del `INSERT INTO transferencias`: si todos los `items` comparten el
mismo `id_deposito_origen`, usar ese valor; si no, `NULL`.

```js
const origenesUnicos = [...new Set(items.map(i => String(i.id_deposito_origen)))];
const idDepositoOrigenCabecera = origenesUnicos.length === 1 ? origenesUnicos[0] : null;
```

- [ ] **Paso 3: Insertar `id_deposito_origen` por línea (línea ~219-233)**

El `INSERT INTO transferencia_detalle` agrega la columna
`id_deposito_origen` con `item.id_deposito_origen`. La llamada a
`asociarSeriesATransferencia` pasa `idDepositoOrigen: item.id_deposito_origen`
(ya no `id_deposito_origen` del body).

- [ ] **Paso 4: Repetir los Pasos 1-3 en `updateTransferencia` (línea ~249-310)**

Misma validación por ítem, mismo cálculo de cabecera, mismo cambio en el
`INSERT` de `transferencia_detalle` y en la llamada a
`asociarSeriesATransferencia`.

- [ ] **Paso 5: Verificación manual**

```bash
curl -X POST http://localhost:3050/api/inventario/transferencias \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id_deposito_destino": 1, "items": [
        {"id_producto": 10, "cantidad": 2, "id_deposito_origen": 2},
        {"id_producto": 11, "cantidad": 1, "id_deposito_origen": 3}
      ]}'
```
Esperado: `201` con `id_transferencia` y `numero`. Confirmar en la base:
```sql
SELECT id_deposito_origen FROM transferencias WHERE id_transferencia = <id>;
-- Esperado: NULL (orígenes mixtos: depósito 2 y 3)
SELECT id_producto, id_deposito_origen FROM transferencia_detalle WHERE id_transferencia = <id>;
-- Esperado: 10→2, 11→3
```

- [ ] **Paso 6: Commit**

```bash
git add backend/controllers/inventarioOps.Controller.js
git commit -m "feat: aceptar deposito de origen por item al crear/editar transferencia"
```

---

### Tarea 3: Backend — lectura (listado, detalle, filtro) sin perder transferencias mixtas

**Files:**
- Modify: `backend/controllers/inventarioOps.Controller.js:76-188` (`getTransferencias`, `getTransferencia`)

**Interfaces:**
- Consumes: columna `transferencia_detalle.id_deposito_origen` (Tarea 1).
- Produces: cada línea de `detalle` en la respuesta de `GET /inventario/transferencias/:id`
  trae `id_deposito_origen`, `deposito_origen_nombre`, `deposito_origen_codigo`.
  Tarea 10 (frontend, detalle) agrupa por `deposito_origen_nombre`.

- [ ] **Paso 1: `LEFT JOIN` en `getTransferencias` (líneas 98 y 112)**

Cambiar `JOIN depositos dor ON dor.id_deposito = t.id_deposito_origen` por
`LEFT JOIN depositos dor ON dor.id_deposito = t.id_deposito_origen` en las
dos consultas (`COUNT(*)` y el `SELECT` de filas). `dde` (destino) queda
como `JOIN` normal — el destino nunca es `NULL`.

- [ ] **Paso 2: Reescribir el filtro por depósito origen (línea 84)**

Reemplazar `where.push('t.id_deposito_origen = ?')` por una subconsulta
que también encuentre transferencias mixtas que incluyan ese depósito en
alguna línea:

```js
if (id_deposito_origen) {
  where.push('EXISTS (SELECT 1 FROM transferencia_detalle td2 WHERE td2.id_transferencia = t.id_transferencia AND td2.id_deposito_origen = ?)');
  params.push(id_deposito_origen);
}
```

- [ ] **Paso 3: `LEFT JOIN` en `getTransferencia` (línea 139)**

Mismo cambio: `JOIN depositos dor ...` → `LEFT JOIN depositos dor ...`.

- [ ] **Paso 4: Exponer el origen por línea en `getTransferencia` (líneas 148-158)**

Agregar `td.id_deposito_origen` y un join a `depositos` para el nombre al
`SELECT` de `detalle`:

```sql
SELECT td.id_detalle, td.id_producto, td.id_deposito_origen,
       dor.nombre AS deposito_origen_nombre, dor.codigo AS deposito_origen_codigo,
       td.cantidad_enviada, td.cantidad_despachada, td.cantidad_recibida, td.observacion,
       p.producto AS producto_nombre, p.codigo_interno,
       p.modelo, p.color, p.detalle AS producto_detalle, p.capacidad, m.nombre AS marca,
       um.nombre AS unidad_nombre
FROM transferencia_detalle td
JOIN productos p        ON p.id_producto = td.id_producto
JOIN depositos dor       ON dor.id_deposito = td.id_deposito_origen
JOIN marcas    m         ON m.id_marca    = p.id_marca
JOIN unidades_medida um  ON um.id_unidad  = p.id_unidad
WHERE td.id_transferencia = ?
ORDER BY td.id_detalle
```
(este `JOIN depositos dor` es sobre la columna de la línea, que ya es
`NOT NULL` tras la Tarea 1 — no hace falta `LEFT JOIN` acá).

- [ ] **Paso 5: Verificación manual**

Con la transferencia mixta creada en la Tarea 2:
```bash
curl http://localhost:3050/api/inventario/transferencias/<id> -H "Authorization: Bearer $TOKEN"
```
Esperado: `200` (no `404`), `id_deposito_origen: null` en la raíz, y cada
objeto de `detalle` con su propio `id_deposito_origen` y
`deposito_origen_nombre` correctos.
```bash
curl "http://localhost:3050/api/inventario/transferencias?id_deposito_origen=2" -H "Authorization: Bearer $TOKEN"
```
Esperado: la transferencia mixta aparece en el listado (tiene una línea
con depósito 2).

- [ ] **Paso 6: Commit**

```bash
git add backend/controllers/inventarioOps.Controller.js
git commit -m "fix: no perder transferencias de origen mixto en listado/detalle/filtro"
```

---

### Tarea 4: Backend — envío usa el origen de cada línea

**Files:**
- Modify: `backend/controllers/inventarioOps.Controller.js:340-512` (`enviarTransferencia`)

**Interfaces:**
- Consumes: `transferencia_detalle.id_deposito_origen` (Tarea 1); el
  `SELECT td.* ...` de la línea 358-363 ya trae esta columna por el `*`.

- [ ] **Paso 1: Reemplazar `t.id_deposito_origen` por `item.id_deposito_origen`**

En las líneas 389, 403, 409, 418, 457, 466 y 473 (chequeo de stock,
`UPDATE stock`, lectura de costo post-movimiento, `INSERT INTO kardex`,
las dos consultas de series `compra_detalle_series` y la llamada a
`productoSeries.moverATransito`): cambiar cada `t.id_deposito_origen` por
`item.id_deposito_origen` (el `item` del loop `for (const item of aEnviar)`,
que ya trae esta columna heredada de `detalle`).

- [ ] **Paso 2: Verificación manual**

Enviar la transferencia mixta de la Tarea 2:
```bash
curl -X POST http://localhost:3050/api/inventario/transferencias/<id>/enviar \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
```
Esperado: `200 { ok: true, completo: true }`. Verificar en la base que el
stock bajó en el depósito 2 para el producto 10 y en el depósito 3 para
el producto 11 (no al revés, y no ambos del mismo depósito):
```sql
SELECT id_producto, id_deposito, cantidad FROM stock WHERE id_producto IN (10, 11);
SELECT id_producto, id_deposito, cantidad FROM kardex WHERE documento_tipo = 'TRANSFERENCIA' AND documento_id = <id>;
```

- [ ] **Paso 3: Commit**

```bash
git add backend/controllers/inventarioOps.Controller.js
git commit -m "fix: enviar transferencia mueve stock del origen de cada linea, no de cabecera"
```

---

### Tarea 5: Backend — recepción usa el origen de cada línea (costo promedio)

**Files:**
- Modify: `backend/controllers/inventarioOps.Controller.js:514-665` (`recibirTransferencia`)

**Interfaces:**
- Consumes: `transferencia_detalle.id_deposito_origen` (Tarea 1); el
  `SELECT * FROM transferencia_detalle WHERE id_detalle = ?` (línea
  539-542) ya trae esta columna.

- [ ] **Paso 1: Reemplazar `t.id_deposito_origen` por `det.id_deposito_origen`**

Única referencia a cambiar: línea 554-558 (`stOrig`, lectura de
`costo_promedio` del depósito de origen para el cálculo de costo promedio
ponderado en destino). `t.id_deposito_destino` (línea 552) **no** cambia —
el destino sigue siendo único de cabecera.

- [ ] **Paso 2: Verificación manual**

Recibir la transferencia mixta enviada en la Tarea 4:
```bash
curl -X POST http://localhost:3050/api/inventario/transferencias/<id>/recibir \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"items":[{"id_detalle": <id_detalle_10>, "cantidad_a_recibir": 2}, {"id_detalle": <id_detalle_11>, "cantidad_a_recibir": 1}]}'
```
Esperado: `200 { ok: true, estado: "RECIBIDA" }`. Verificar que el costo
promedio en destino para el producto 10 se calculó con el costo del
depósito 2, y para el producto 11 con el del depósito 3:
```sql
SELECT id_producto, costo_promedio FROM stock WHERE id_deposito = <destino> AND id_producto IN (10, 11);
```

- [ ] **Paso 3: Commit**

```bash
git add backend/controllers/inventarioOps.Controller.js
git commit -m "fix: recepcion calcula costo promedio contra el origen de cada linea"
```

---

### Tarea 6: Backend — anulación devuelve stock al origen de cada línea

**Files:**
- Modify: `backend/controllers/inventarioOps.Controller.js:667-760` (`anularTransferencia`)

**Interfaces:**
- Consumes: `transferencia_detalle.id_deposito_origen` (Tarea 1); el
  `SELECT * FROM transferencia_detalle WHERE id_transferencia = ?` (línea
  687-689) ya trae esta columna.

- [ ] **Paso 1: Reemplazar `t.id_deposito_origen` por `item.id_deposito_origen`**

Líneas 699, 714, 721 y 729 (`productoSeries.revertirATransito`, `UPDATE
stock` de devolución, lectura de costo post-reversión, `INSERT INTO
kardex`): cambiar cada `t.id_deposito_origen` por `item.id_deposito_origen`.

- [ ] **Paso 2: Verificación manual**

Con una transferencia mixta en estado `EN_TRANSITO` (crear y enviar otra
igual a la de la Tarea 2/4), anularla:
```bash
curl -X POST http://localhost:3050/api/inventario/transferencias/<id>/anular \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"motivo": "prueba de anulacion mixta"}'
```
Esperado: `200 { ok: true }`. Verificar que el stock del producto 10
volvió al depósito 2 y el del producto 11 al depósito 3 (no cruzado):
```sql
SELECT id_producto, id_deposito, cantidad FROM stock WHERE id_producto IN (10, 11);
```

- [ ] **Paso 3: Commit**

```bash
git add backend/controllers/inventarioOps.Controller.js
git commit -m "fix: anular transferencia devuelve stock al origen de cada linea"
```

---

### Tarea 7: Backend — reportes no pierden transferencias mixtas

**Files:**
- Modify: `backend/controllers/reportes.Controller.js:1485-1488` y `:2726-2729`

**Interfaces:**
- Consumes: ninguna columna nueva — solo corrige el tipo de `JOIN`.

- [ ] **Paso 1: `LEFT JOIN` encadenado en el primer reporte (líneas 1485-1486)**

```sql
LEFT JOIN depositos dor  ON dor.id_deposito = t.id_deposito_origen
LEFT JOIN sucursales sor ON sor.id_sucursal  = dor.id_sucursal
```
(`dde`/`sde`, destino, quedan como `JOIN` normal).

- [ ] **Paso 2: Mismo cambio en el segundo reporte (líneas 2726-2727)**

```sql
LEFT JOIN depositos dor ON dor.id_deposito=t.id_deposito_origen
LEFT JOIN sucursales sor ON sor.id_sucursal=dor.id_sucursal
```

- [ ] **Paso 3: Verificación manual**

Ejecutar ambos reportes (vía la pantalla de Reportes o el endpoint
correspondiente) cubriendo el rango de fechas de la transferencia mixta
creada en la Tarea 2. Esperado: la transferencia aparece en ambos
reportes, con `deposito_origen`/`sucursal_origen` en blanco (no con una
fila faltante).

- [ ] **Paso 4: Commit**

```bash
git add backend/controllers/reportes.Controller.js
git commit -m "fix: reportes de transferencias no pierden filas de origen mixto"
```

---

### Tarea 8: Frontend — carrito con origen por ítem en `TransferenciaForm.jsx`

**Files:**
- Modify: `frontend/src/pages/inventario/TransferenciaForm.jsx`

**Interfaces:**
- Consumes: la API de Tarea 2 (`items` con `id_deposito_origen` por
  línea) y de Tarea 3 (`detalle` con `id_deposito_origen`/
  `deposito_origen_nombre` al editar un borrador).
- Produces: la forma de `items` en estado (`{ id_producto, cantidad,
  id_deposito_origen, series }`) y de `stockPorDeposito` (`{ [idDeposito]:
  { [idProducto]: disponible } }`) que consume la Tarea 9 (agrupación
  visual del carrito).

- [ ] **Paso 1: Agregar `id_deposito_origen` a cada fila del carrito**

`items` inicial (línea 290) y toda fila nueva creada por `addItem` (línea
402) y `agregarProducto` (línea 418-431) pasan a incluir
`id_deposito_origen: form.id_deposito_origen` (el depósito que se está
mirando en el momento de agregar).

- [ ] **Paso 2: Identificar filas por el par `(id_producto, id_deposito_origen)`**

En `agregarProducto` (línea 418-431), `quitarUnidadProducto` (línea
474-482) y `cantidadesSeleccionadas` (línea 581-584): el `findIndex`/
`reduce` que hoy compara solo `id_producto` pasa a comparar también
`id_deposito_origen`, para que el mismo producto agregado desde dos
depósitos distintos quede en dos filas separadas.

- [ ] **Paso 3: Cachear stock por depósito en vez de un único mapa**

Reemplazar `stockOrigen` (único mapa) por
`stockPorDeposito: { [idDeposito]: { [idProducto]: disponible } }`.
`handleOrigenChange` (línea 356-375) deja de pisar el mapa anterior: si
`stockPorDeposito[id]` ya existe, lo reutiliza; si no, lo carga y lo
agrega al objeto (sin borrar las entradas de otros depósitos). Todo lugar
que leía `stockOrigen[idProducto]` (líneas 409, 422, 455, 487-488, 524)
pasa a leer `stockPorDeposito[it.id_deposito_origen]?.[idProducto]`
(usando el origen de la fila, no el `form.id_deposito_origen` actual).

- [ ] **Paso 4: Desacoplar destino de origen**

El `<select>` de Depósito Destino (línea 710-725) deja de estar
`disabled={!form.id_deposito_origen}` ni de filtrar por el origen
actualmente mirado — se puede elegir en cualquier momento,
independiente. Al elegir destino, validar únicamente que ningún
`id_deposito_origen` ya presente en el carrito sea igual al destino
elegido (si lo es, mostrar error y no permitir el cambio). El cambio de
origen (`handleOrigenChange`) deja de tocar `form.id_deposito_destino`
(línea 357) — el destino, una vez elegido, no se vuelve a resetear.

- [ ] **Paso 5: Validar por ítem al guardar**

`guardar` (línea 491-516): la validación
`form.id_deposito_origen === form.id_deposito_destino` (línea 495-496)
pasa a validar que ningún ítem del carrito tenga
`item.id_deposito_origen === form.id_deposito_destino`. `hayExcesos`
(línea 486-489) compara contra `stockPorDeposito[it.id_deposito_origen]`
en vez de `stockOrigen` plano. El payload enviado
(`transferenciasService.create`/`update`, líneas 505 y 508) manda
`items: itemsValidos` donde cada ítem ya trae su propio
`id_deposito_origen` (heredado del Paso 1) — ya no hace falta mandar
`id_deposito_origen` suelto en el body de nivel superior; solo
`id_deposito_destino`.

- [ ] **Paso 6: Hidratar orígenes por línea al editar un borrador**

En el `useEffect` de edición (línea 322-353): `setItems` (línea 340-344)
pasa a tomar `id_deposito_origen: String(d.id_deposito_origen)` de cada
línea de `t.detalle` (ya expuesto por la Tarea 3), en vez de asumir el
origen de cabecera. La carga de stock inicial (línea 345-349) pasa a
precargar `stockPorDeposito` para **cada** depósito distinto presente en
`t.detalle`, no solo el de cabecera.

- [ ] **Paso 7: Verificación manual (UI)**

1. Abrir `/inventario/transferencias/nueva`.
2. Elegir depósito Destino.
3. Elegir depósito Origen "A", agregar un producto.
4. Cambiar el selector de Origen a "B" sin tocar el carrito — confirmar
   que el producto agregado en el paso 3 sigue en el carrito.
5. Agregar otro producto (puede ser el mismo id que el del paso 3) desde
   "B" — confirmar que queda como una fila separada, no sumada a la del
   paso 3.
6. Guardar. Confirmar que la transferencia se crea sin error y que, al
   reabrirla para editar, cada fila conserva su depósito de origen
   correcto (repetir pasos 1-2 de la verificación de la Tarea 2 contra
   el `id_transferencia` resultante).

- [ ] **Paso 8: Commit**

```bash
git add frontend/src/pages/inventario/TransferenciaForm.jsx
git commit -m "feat: permitir origen por item al cargar una transferencia"
```

---

### Tarea 9: Frontend — carrito agrupado visualmente por depósito de origen

**Files:**
- Modify: `frontend/src/pages/inventario/TransferenciaForm.jsx`

**Interfaces:**
- Consumes: `items` con `id_deposito_origen` por fila y `depositos` (ya
  cargado por `inventarioService.getFormData()`) — ambos de la Tarea 8.

- [ ] **Paso 1: Agrupar las filas del carrito por `id_deposito_origen`**

En la vista del carrito (resumen / bottom-sheet móvil — buscar el bloque
que renderiza `items` para revisión antes de guardar), construir los
grupos:

```js
const gruposPorOrigen = itemsValidos.reduce((acc, it) => {
  const k = it.id_deposito_origen;
  (acc[k] ??= []).push(it);
  return acc;
}, {});
```

- [ ] **Paso 2: Renderizar un encabezado de grupo por depósito**

Cada grupo se muestra con el nombre del depósito
(`depositos.find(d => String(d.id_deposito) === k)?.nombre`) como
encabezado, seguido de sus filas — mismo estilo visual que ya usa la
pantalla para separar secciones (reutilizar las clases Tailwind
existentes en el archivo, no introducir un patrón nuevo).

- [ ] **Paso 3: Verificación manual (UI)**

Repetir los pasos 1-5 de la verificación de la Tarea 8 y confirmar que el
carrito muestra dos encabezados de grupo ("Depósito A" / "Depósito B"),
cada uno con su producto debajo — igual que el ejemplo de notas del
cliente (`-Pemosur` / `1 Ref.ERTS-12`, etc.).

- [ ] **Paso 4: Commit**

```bash
git add frontend/src/pages/inventario/TransferenciaForm.jsx
git commit -m "feat: agrupar el carrito de transferencia por deposito de origen"
```

---

### Tarea 10: Frontend — detalle de transferencia agrupado por origen

**Files:**
- Modify: `frontend/src/pages/inventario/TransferenciaDetalle.jsx`

**Interfaces:**
- Consumes: `detalle[].id_deposito_origen` / `deposito_origen_nombre` de
  la Tarea 3.

- [ ] **Paso 1: Agrupar la lista de ítems por `deposito_origen_nombre`**

En el listado principal de ítems de la transferencia (la lista plana
actual), agrupar por `d.deposito_origen_nombre` con el mismo patrón de
`reduce` de la Tarea 9 (Paso 1), y un encabezado de grupo por depósito.

- [ ] **Paso 2: Mostrar el origen por ítem en los modales de envío/recepción**

En `ModalRecibir` (y el modal de envío, si existe uno análogo en este
archivo) agregar, junto a cada producto, una etiqueta con
`d.deposito_origen_nombre` — relevante ahora que una transferencia puede
tener ítems de depósitos distintos.

- [ ] **Paso 3: Verificación manual (UI)**

Abrir el detalle de la transferencia mixta creada en la Tarea 2 (o la
creada en la Tarea 8). Confirmar que la lista de ítems aparece agrupada
por depósito de origen, y que el modal de recepción muestra el depósito
de origen de cada línea.

- [ ] **Paso 4: Commit**

```bash
git add frontend/src/pages/inventario/TransferenciaDetalle.jsx
git commit -m "feat: mostrar deposito de origen por item en el detalle de transferencia"
```
