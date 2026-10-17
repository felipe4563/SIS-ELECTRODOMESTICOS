# Trazabilidad de Números de Serie — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que un número de serie sea una unidad física rastreada por el sistema (dónde está, si se vendió, de dónde salió), y ofrecer esa trazabilidad — siempre opcional — en el detalle de producto (carga de stock antiguo), Transferencias y Ventas.

**Architecture:** Se extiende la tabla `compra_detalle_series` ya existente (no se renombra: sigue siendo el lugar donde vive cada serie) con columnas de ubicación/estado/origen, para que pueda representar tanto series que vinieron de una compra como series cargadas a mano. Un módulo de queries compartido (`backend/models/productoSeries.js`) concentra las operaciones (listar disponibles, cargar manual, mover a tránsito, confirmar recepción, marcar vendida, revertir) y lo usan los controllers de compras, productos, transferencias (vía inventarioOps) y ventas. El frontend agrega un botón opcional "Elegir series" en los carritos ya existentes de Transferencias y Ventas, y una columna de carga en la pestaña "Stock" del detalle de producto (`ProductoDetalle.jsx`).

**Tech Stack:** Node.js/Express + MySQL (mysql2) en el backend, React + Tailwind en el frontend. Sin framework de tests instalado (`npm test` no existe en este proyecto) — la verificación de cada tarea se hace con `node --check` para sintaxis, llamadas `curl` contra el backend local para los endpoints, y una pasada manual en el navegador para la UI, siguiendo el patrón ya usado en el resto del proyecto.

**Spec:** `docs/superpowers/specs/2026-10-17-numeros-serie-trazabilidad-design.md`

## Global Constraints

- Elegir una serie es **siempre opcional** en transferencias y ventas — el flujo actual por cantidad debe seguir funcionando sin tocar ninguna serie.
- Todo producto puede tener series — no hay flag por producto.
- No se toca `Productos.jsx` ni el catálogo.
- No hay carga masiva (Excel) de series para stock antiguo — es manual, unidad por unidad.
- El campo `venta_detalle.numero_serie` (ya existente, varchar) es el que se sigue imprimiendo en factura/PDF — los flujos nuevos lo completan, no lo reemplazan.
- Las series de compras recibidas en más de un depósito a la vez quedan `id_deposito_actual = NULL` ("sin depósito confirmado"), nunca se adivina.
- Una serie `EN_TRANSITO` o `VENDIDA` no se ofrece nunca como disponible.

## Review Focus

- **Compra con `compra_detalle_series` ya cargadas antes de esta migración, pero cuya compra nunca tuvo fila en `compra_recepciones`** (datos viejos previos a esa función): la migración debe caer al depósito de `compras.id_deposito_destino` en vez de quedar `NULL` por falta de filas de recepción — si no, se pierde ubicación de series que en realidad sí se sabían (Task 1).
- **Elegir más series de las que caben en la cantidad del carrito** (ej. cantidad 2 en el carrito, el usuario marca 3 series): el backend debe rechazar la venta/transferencia, no truncar en silencio (Tasks 4 y 6).
- **Elegir una serie que en el momento de confirmar ya no está `EN_STOCK`** (otro usuario la vendió/transfirió primero, condición de carrera): el backend debe rechazar esa venta/transferencia puntual con un mensaje claro, no marcar dos veces la misma serie como vendida (Tasks 4 y 6).
- **Anular una transferencia que ya tiene series en tránsito**: las series deben volver a `EN_STOCK` en el depósito de origen, no quedar huérfanas en `EN_TRANSITO` (Task 4).
- **Cargar una serie manual desde el detalle de producto con un número que ya existe para ese mismo producto**: debe rechazarse con un mensaje claro en vez de guardar un duplicado silencioso (Task 2).

---

## Task 1: Migración de base de datos + módulo de queries compartido

**Files:**
- Create: `bd/migracion_34_series_trazabilidad.sql`
- Create: `backend/models/productoSeries.js`
- Modify: `backend/controllers/compras.Controller.js:1106-1138` (`agregarSerieDetalle` — agregar `id_producto` e `id_deposito_actual` al insertar)

**Interfaces:**
- Produces (usado por Tasks 2, 4, 6):
  - `listarDisponibles(db, { id_producto, id_deposito }) → Promise<Array<{id_serie, numero_serie, imagen_url}>>` — series `EN_STOCK` en ese depósito para ese producto.
  - `cargarManual(db, { id_producto, id_deposito, numero_serie, imagen_url, id_usuario }) → Promise<{id_serie}>` — inserta con `origen='MANUAL'`, `estado='EN_STOCK'`. Lanza `Error('DUPLICADO')` si ya existe `numero_serie` para ese `id_producto`.
  - `moverATransito(db, idsSerie, { id_transferencia_detalle }) → Promise<void>` — valida que todas estén `EN_STOCK` en el mismo depósito de origen esperado; si alguna no lo está, lanza `Error('SERIE_NO_DISPONIBLE')`. Pone `estado='EN_TRANSITO'`.
  - `confirmarRecepcion(db, idsSerie, { id_deposito_destino }) → Promise<void>` — pone `estado='EN_STOCK'`, `id_deposito_actual=id_deposito_destino`.
  - `revertirATransito(db, idsSerie, { id_deposito_origen }) → Promise<void>` — pone `estado='EN_STOCK'`, `id_deposito_actual=id_deposito_origen` (anulación de transferencia antes de recibir).
  - `marcarVendida(db, idsSerie, { id_venta_detalle }) → Promise<void>` — valida `EN_STOCK`; si no, lanza `Error('SERIE_NO_DISPONIBLE')`. Pone `estado='VENDIDA'`, `id_deposito_actual=NULL`, `id_venta_detalle`.
  - Todas reciben `db` (la conexión/pool `mysql2` ya usada en el resto del proyecto, vía `db.promise()`) y se usan dentro de la transacción del llamador — ninguna abre o cierra su propia transacción.

- [ ] **Step 1: Escribir `bd/migracion_34_series_trazabilidad.sql`**

Seguir el patrón de dos fases ya usado en `migracion_33_deposito_por_recepcion.sql` (columna nullable → backfill → verificación manual → constraint obligatoria), con este contenido:

```sql
START TRANSACTION;

ALTER TABLE compra_detalle_series
  ADD COLUMN id_producto INT NULL AFTER id_detalle,
  ADD COLUMN id_deposito_actual INT NULL AFTER numero_serie,
  ADD COLUMN estado ENUM('EN_STOCK','EN_TRANSITO','VENDIDA') NOT NULL DEFAULT 'EN_STOCK' AFTER id_deposito_actual,
  ADD COLUMN origen ENUM('COMPRA','MANUAL') NOT NULL DEFAULT 'COMPRA' AFTER estado,
  ADD COLUMN id_venta_detalle BIGINT NULL AFTER origen,
  MODIFY id_detalle BIGINT NULL;

-- Backfill id_producto desde compra_detalle (todas las filas existentes vienen de COMPRA)
UPDATE compra_detalle_series s
JOIN compra_detalle cd ON cd.id_detalle = s.id_detalle
SET s.id_producto = cd.id_producto
WHERE s.id_producto IS NULL;

-- Backfill id_deposito_actual: solo cuando todas las recepciones de ese
-- detalle comparten un único depósito (sin ambigüedad).
UPDATE compra_detalle_series s
JOIN (
  SELECT crd.id_detalle, MIN(cr.id_deposito) AS id_deposito_unico
  FROM compra_recepcion_detalle crd
  JOIN compra_recepciones cr ON cr.id_recepcion = crd.id_recepcion
  GROUP BY crd.id_detalle
  HAVING COUNT(DISTINCT cr.id_deposito) = 1
) r ON r.id_detalle = s.id_detalle
SET s.id_deposito_actual = r.id_deposito_unico
WHERE s.id_deposito_actual IS NULL;

-- Fallback para compras viejas sin ninguna fila en compra_recepciones
-- (anteriores a esa función): usan el depósito destino de la cabecera.
UPDATE compra_detalle_series s
JOIN compra_detalle cd ON cd.id_detalle = s.id_detalle
JOIN compras c ON c.id_compra = cd.id_compra
SET s.id_deposito_actual = c.id_deposito_destino
WHERE s.id_deposito_actual IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM compra_recepcion_detalle crd WHERE crd.id_detalle = s.id_detalle
  );

COMMIT;

-- Verificación manual antes de seguir (no bloquea el deploy, es informativa):
--   SELECT COUNT(*) FROM compra_detalle_series WHERE id_deposito_actual IS NULL;
--   (las que queden en NULL son "sin depósito confirmado": compras con
--    recepciones repartidas en más de un depósito — a revisar a mano)

START TRANSACTION;

ALTER TABLE compra_detalle_series
  MODIFY id_producto INT NOT NULL,
  ADD CONSTRAINT fk_cds_producto FOREIGN KEY (id_producto) REFERENCES productos (id_producto),
  ADD CONSTRAINT fk_cds_deposito FOREIGN KEY (id_deposito_actual) REFERENCES depositos (id_deposito),
  ADD CONSTRAINT fk_cds_venta_detalle FOREIGN KEY (id_venta_detalle) REFERENCES venta_detalle (id_detalle),
  ADD UNIQUE KEY uq_cds_producto_numero (id_producto, numero_serie);

COMMIT;
```

Nota: si el `ADD UNIQUE KEY` del último bloque falla por datos sucios
existentes (dos filas con el mismo `numero_serie` para el mismo
producto), correr antes
`SELECT id_producto, numero_serie, COUNT(*) FROM compra_detalle_series GROUP BY id_producto, numero_serie HAVING COUNT(*) > 1;`
y resolver esas filas a mano (son pocas, dato real de producción) antes
de reintentar el `ALTER`.

- [ ] **Step 2: Correr la migración en local y verificar**

Run: `mysql -u root bd_electrodomesticos < bd/migracion_34_series_trazabilidad.sql`
Expected: sin errores. Luego `SELECT id_serie, id_producto, id_deposito_actual, estado, origen FROM compra_detalle_series LIMIT 5;` debe mostrar las columnas nuevas pobladas.

**Caso borde a verificar:** si en esta base hay alguna `compra_detalle_series` cuya compra nunca tuvo fila en `compra_recepciones` (dato previo a esa función), confirmar que el fallback la ubicó igual:
Run: `SELECT COUNT(*) FROM compra_detalle_series s JOIN compra_detalle cd ON cd.id_detalle=s.id_detalle WHERE NOT EXISTS (SELECT 1 FROM compra_recepcion_detalle crd WHERE crd.id_detalle=s.id_detalle) AND s.id_deposito_actual IS NULL;`
Expected: `0` (si hay compras así, deben haber caído al fallback de `compras.id_deposito_destino`, no quedar en `NULL`).

- [ ] **Step 3: Crear `backend/models/productoSeries.js` con las 5 funciones del bloque Interfaces**

Cada función es una query o un pequeño grupo de queries sobre
`compra_detalle_series`, sin abrir transacción propia (reciben `db` ya
dentro de la transacción del caller, igual que el resto de controllers
de este proyecto). `listarDisponibles` filtra
`WHERE id_producto = ? AND id_deposito_actual = ? AND estado = 'EN_STOCK'`.
`cargarManual` inserta con `origen='MANUAL'`, `id_detalle=NULL`, y
atrapa el error de `ER_DUP_ENTRY` de la constraint única para relanzar
como `Error('DUPLICADO')`. Las demás son `UPDATE ... WHERE id_serie IN (?)`
con el `estado` esperado en el `WHERE` (para que una fila que ya cambió
de estado no se pise) — si `affectedRows` no coincide con la cantidad de
ids pedida, lanzan `Error('SERIE_NO_DISPONIBLE')`.

- [ ] **Step 4: Verificar sintaxis**

Run: `node --check backend/models/productoSeries.js`
Expected: sin salida (sin errores).

- [ ] **Step 5: Actualizar `agregarSerieDetalle` en `compras.Controller.js` para poblar las columnas nuevas**

En el `INSERT` existente (línea ~1128), agregar `id_producto` (ya
disponible en `detalle.id_producto` — ampliar el `SELECT` de la línea
~1113 para traerlo) e `id_deposito_actual` (del depósito real de esa
compra — mismo criterio que el backfill: si la compra tiene una sola
recepción/depósito, usarlo; si no, `NULL`). `origen` queda `'COMPRA'`
por el `DEFAULT` de la columna, no hace falta tocarlo.

- [ ] **Step 6: Verificar con curl contra el backend local**

Con el backend corriendo y una compra+detalle real de prueba:
Run: `curl -X POST http://localhost:3000/api/compras/<id>/detalle/<idDetalle>/series -H "Authorization: Bearer <token>" -F numero_serie=TEST-001`
Expected: `201` con el `id_serie` creado. Luego
`SELECT id_producto, id_deposito_actual, estado, origen FROM compra_detalle_series WHERE numero_serie='TEST-001';`
debe mostrar `id_producto` poblado y `estado='EN_STOCK'`.

- [ ] **Step 7: Commit**

```bash
git add bd/migracion_34_series_trazabilidad.sql backend/models/productoSeries.js backend/controllers/compras.Controller.js
git commit -m "feat: extender compra_detalle_series a unidad central de trazabilidad"
```

---

## Task 2: Detalle de producto — cargar series de stock antiguo (backend)

**Files:**
- Modify: `backend/controllers/productos.Controller.js` (agregar funciones nuevas junto a `getStock`, línea ~414)
- Modify: `backend/routes/productos.Routes.js` (agregar rutas nuevas)

**Interfaces:**
- Consumes: `productoSeries.js` (Task 1) — `listarDisponibles`, `cargarManual`.
- Produces (usado por Task 3):
  - `GET /api/productos/:id/series/:id_deposito` → `{ cantidad_stock, series: [{ id_serie, numero_serie, imagen_url }] }` — `cantidad_stock` sale de `stock.cantidad` para ese producto+depósito, `series` son las `EN_STOCK` ya cargadas ahí.
  - `POST /api/productos/:id/series` body `{ id_deposito, numero_serie }` + multipart `imagen` opcional → `201 { id_serie, numero_serie }`, o `409 { mensaje: 'Ya existe ese número de serie para este producto' }` si `cargarManual` lanza `DUPLICADO`.

- [ ] **Step 1: Implementar `GET /api/productos/:id/series/:id_deposito`**

Usa `listarDisponibles` de Task 1 para `series` (con `id_producto = req.params.id`), y una query simple a `stock` para `cantidad_stock`.

- [ ] **Step 2: Verificar con curl**

Run: `curl http://localhost:3000/api/productos/5/series/1 -H "Authorization: Bearer <token>"`
Expected: `200` con `cantidad_stock` y el array `series` (puede estar vacío).

- [ ] **Step 3: Implementar `POST /api/productos/:id/series`**

Valida `id_deposito`, `numero_serie` requeridos. Llama `cargarManual`
con `id_producto = req.params.id`. Captura `Error('DUPLICADO')` → `409`.
Sube la imagen con el mismo patrón `multer` + `validateMagic(IMAGES_ONLY)`
ya usado en `compras.Routes.js` para `agregarSerieDetalle`.

- [ ] **Step 4: Verificar con curl — caso éxito y caso duplicado**

Run: `curl -X POST http://localhost:3000/api/productos/5/series -H "Authorization: Bearer <token>" -F id_deposito=1 -F numero_serie=ANT-001`
Expected: `201` con `id_serie`.

Run (repetir el mismo `numero_serie` para el mismo producto): mismo comando otra vez.
Expected: `409 { mensaje: 'Ya existe ese número de serie para este producto' }`.

- [ ] **Step 5: Registrar las 2 rutas en `productos.Routes.js`**

```js
router.get ('/:id/series/:id_deposito', authMiddleware, checkPermission('ver', 'productos'), ctrl.getSeriesProducto);
router.post('/:id/series', authMiddleware, checkPermission('editar', 'productos'), upload.single('imagen'), validateMagic(IMAGES_ONLY), ctrl.cargarSerieManual);
```

(Reusar el `upload`/`multer` ya configurado en este archivo de rutas si
existe uno equivalente para imágenes de producto; si no, replicar el de
`compras.Routes.js`.)

- [ ] **Step 6: Verificar sintaxis**

Run: `node --check backend/controllers/productos.Controller.js && node --check backend/routes/productos.Routes.js`
Expected: sin salida.

- [ ] **Step 7: Commit**

```bash
git add backend/controllers/productos.Controller.js backend/routes/productos.Routes.js
git commit -m "feat: endpoints para cargar series de stock antiguo desde el detalle de producto"
```

---

## Task 3: Detalle de producto — cargar series de stock antiguo (frontend)

**Files:**
- Modify: `frontend/src/pages/productos/ProductoDetalle.jsx` (`TabStock`, línea ~415-487)
- Modify: `frontend/src/services/productos.service.js` (agregar `getSeriesProducto`, `cargarSerieManual`)

**Interfaces:**
- Consumes: los 2 endpoints de Task 2.

- [ ] **Step 1: Agregar los 2 métodos nuevos a `productos.service.js`**

```js
getSeriesProducto: (id_producto, id_deposito) => api.get(`/productos/${id_producto}/series/${id_deposito}`),
cargarSerieManual: (id_producto, id_deposito, numero_serie, file) => {
  const form = new FormData();
  form.append('id_deposito', id_deposito);
  form.append('numero_serie', numero_serie);
  if (file) form.append('imagen', file);
  return api.post(`/productos/${id_producto}/series`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
},
```

- [ ] **Step 2: Agregar columna "Series" a la tabla de `TabStock` en `ProductoDetalle.jsx`**

Nueva columna al final de la tabla (junto a "Últ. Movimiento"). Por cada
fila de depósito con `cantidad_disponible > 0`: traer, al cargar la
tabla, cuántas series `EN_STOCK` tiene ese producto en ese `id_deposito`
(vía `getSeriesProducto` — se puede pedir en paralelo para cada fila
`Promise.all` al terminar `cargar()`), y mostrar un badge "X/Y sin
serie" en ámbar si `X < Y`, o "Completo" si `X === Y`, con un botón
"Cargar series" que abre un panel lateral — mismo patrón que el mockup
aprobado (https://claude.ai/artifact/RjKJ5yCDvGJYkjH8vAEtCE): una fila
de texto+foto por unidad faltante, usando `getSeriesProducto` para
listar lo ya cargado en ese depósito y `cargarSerieManual` para cada
fila nueva. Guardado parcial: cada fila se guarda con su propio llamado
al confirmar esa fila (mismo patrón ya usado en `CompraDetalle.jsx` →
`SeriesDetalle`), no hay un botón "Guardar todo". Al cerrar el panel,
refrescar el badge de esa fila sin recargar toda la tabla.

- [ ] **Step 3: Verificar sintaxis**

Run: `cd frontend && npx eslint src/pages/productos/ProductoDetalle.jsx src/services/productos.service.js`
Expected: sin errores nuevos (los preexistentes del archivo, si los hay, no cuentan).

- [ ] **Step 4: Verificación manual en navegador**

Con backend y frontend locales corriendo: entrar al detalle de un
producto con stock en más de un depósito, pestaña "Stock", confirmar que
aparece el badge por fila, abrir el panel de un depósito, cargar una
serie con foto, confirmar que el badge de esa fila baja de contador sin
recargar la página.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/productos/ProductoDetalle.jsx frontend/src/services/productos.service.js
git commit -m "feat: cargar números de serie de stock antiguo desde el detalle de producto"
```

---

## Task 4: Transferencias — elegir series al mover stock (backend)

**Files:**
- Modify: `backend/controllers/inventarioOps.Controller.js` (funciones de crear/editar, enviar, recibir, anular transferencias)
- Modify: `bd/migracion_34_series_trazabilidad.sql` → **no**; en vez de eso, crear `bd/migracion_35_series_transferencia_detalle.sql` para la columna puente descrita abajo.

**Interfaces:**
- Consumes: `productoSeries.js` (Task 1) — `listarDisponibles`, `moverATransito`, `confirmarRecepcion`, `revertirATransito`.
- Produces (usado por Task 5): el body de crear/editar transferencia acepta,
  por línea, un array opcional `series: [id_serie, ...]` — si está
  presente y no vacío, su longitud debe ser `<= cantidad_enviada` de esa
  línea (si es mayor, `400 { mensaje: 'Elegiste más series de las que caben en la cantidad' }`).

- [ ] **Step 1: Migración puente — relacionar series con su línea de transferencia**

`bd/migracion_35_series_transferencia_detalle.sql`:
```sql
START TRANSACTION;
ALTER TABLE compra_detalle_series
  ADD COLUMN id_transferencia_detalle BIGINT NULL AFTER id_venta_detalle,
  ADD CONSTRAINT fk_cds_transferencia_detalle FOREIGN KEY (id_transferencia_detalle) REFERENCES transferencia_detalle (id_detalle);
COMMIT;
```
Run: `mysql -u root bd_electrodomesticos < bd/migracion_35_series_transferencia_detalle.sql`
Expected: sin errores.

- [ ] **Step 2: Guardar `series` elegidas al crear/editar una transferencia en `BORRADOR`**

En la función que crea/edita el detalle de una transferencia (estado
`BORRADOR`), si la línea trae `series`, validar
`series.length <= cantidad_enviada` (si no, `400` como se describe
arriba) y guardar esos `id_serie` asociados a esa
`id_transferencia_detalle` vía `UPDATE compra_detalle_series SET id_transferencia_detalle = ? WHERE id_serie IN (?)`
— sin cambiar `estado` todavía (eso pasa recién al enviar).

- [ ] **Step 3: Verificar con curl — caso válido y caso de exceso**

Run: `curl -X PUT http://localhost:3000/api/inventario/transferencias/<id> -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"detalle":[{"id_producto":5,"cantidad_enviada":2,"series":[101,102]}]}'`
Expected: `200`. Luego `SELECT id_serie, id_transferencia_detalle FROM compra_detalle_series WHERE id_serie IN (101,102);` muestra el `id_transferencia_detalle` asignado.

Run (mismo pedido pero `cantidad_enviada:2` con 3 series): `curl -X PUT ... -d '{"detalle":[{"id_producto":5,"cantidad_enviada":2,"series":[101,102,103]}]}'`
Expected: `400 { mensaje: 'Elegiste más series de las que caben en la cantidad' }`.

- [ ] **Step 4: Al enviar (`POST .../enviar`), mover a tránsito las series de cada línea**

Para cada línea con `id_transferencia_detalle` que tenga series
asociadas (`WHERE id_transferencia_detalle = ?`), llamar
`moverATransito` con esos ids. Si lanza `SERIE_NO_DISPONIBLE` (alguien
más la movió/vendió entretanto), abortar la transacción completa y
devolver `409 { mensaje: 'Una de las series elegidas ya no está disponible, volvé a elegir' }`.

- [ ] **Step 5: Verificar con curl — caso normal y condición de carrera**

Run: `curl -X POST http://localhost:3000/api/inventario/transferencias/<id>/enviar -H "Authorization: Bearer <token>"`
Expected: `200`. `SELECT estado FROM compra_detalle_series WHERE id_serie IN (101,102);` → `EN_TRANSITO` en ambas.

Run (crear otra transferencia con una serie que mientras tanto se marca `VENDIDA` a mano: `UPDATE compra_detalle_series SET estado='VENDIDA' WHERE id_serie=104;`, luego intentar enviar esa transferencia): `curl -X POST .../enviar ...`
Expected: `409 { mensaje: 'Una de las series elegidas ya no está disponible, volvé a elegir' }`, y la transferencia se queda en `SOLICITADA` (no queda a medio enviar).

- [ ] **Step 6: Al recibir (`POST .../recibir`), confirmar recepción de las series de las líneas recibidas**

Para cada línea recibida en ese evento, llamar `confirmarRecepcion` con
las series de esa `id_transferencia_detalle` y el
`id_deposito_destino` de la transferencia.

- [ ] **Step 7: Verificar con curl**

Run: `curl -X POST http://localhost:3000/api/inventario/transferencias/<id>/recibir -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"detalle":[{"id_detalle":<idLinea>,"cantidad_recibida":2}]}'`
Expected: `200`. `SELECT estado, id_deposito_actual FROM compra_detalle_series WHERE id_serie IN (101,102);` → `EN_STOCK`, `id_deposito_actual` = depósito destino.

- [ ] **Step 8: Al anular (`POST .../anular`) antes de recibir, revertir las series en tránsito**

Para transferencias en `EN_TRANSITO` que se anulan, buscar todas las
series con `id_transferencia_detalle IN (...)` y `estado='EN_TRANSITO'`,
llamar `revertirATransito` con el `id_deposito_origen` de la
transferencia.

- [ ] **Step 9: Verificar con curl**

Repetir Steps 3+5 con una transferencia nueva, luego:
Run: `curl -X POST http://localhost:3000/api/inventario/transferencias/<id>/anular -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"motivo":"prueba"}'`
Expected: `200`. `SELECT estado, id_deposito_actual FROM compra_detalle_series WHERE id_serie IN (...);` → `EN_STOCK`, de vuelta en el depósito de origen.

- [ ] **Step 10: Verificar sintaxis**

Run: `node --check backend/controllers/inventarioOps.Controller.js`
Expected: sin salida.

- [ ] **Step 11: Commit**

```bash
git add bd/migracion_35_series_transferencia_detalle.sql backend/controllers/inventarioOps.Controller.js
git commit -m "feat: elegir series al transferir stock entre depósitos"
```

---

## Task 5: Transferencias — elegir series al mover stock (frontend)

**Files:**
- Modify: `frontend/src/pages/inventario/TransferenciaForm.jsx` (`CartItemRow`, línea ~74-200)
- Modify: `frontend/src/services/transferencias.service.js`

**Interfaces:**
- Consumes: el endpoint `GET /api/productos/:id/series/:id_deposito` de Task 2 (reutilizado tal cual, llamando a `productosService.getSeriesProducto` — no hace falta un endpoint nuevo bajo transferencias) y el body `series` que Task 4 agregó a crear/editar transferencia.

- [ ] **Step 1: Agregar botón opcional "Elegir series" a `CartItemRow`**

Visible solo cuando `fila.id_producto` y `stockOrigen` están definidos.
Al tocarlo, abre un selector (checkboxes) con las series `EN_STOCK` del
depósito de origen para ese producto (vía `getSeriesProducto`), limitado
a `fila.cantidad` casillas marcables — si ya hay `fila.cantidad` marcadas
y se intenta marcar una más, las demás quedan deshabilitadas hasta
desmarcar alguna. Si `fila.cantidad` baja después de elegir series, la
selección se recorta a la nueva cantidad automáticamente (`useEffect`
sobre `fila.cantidad`).

- [ ] **Step 2: Guardar `fila.series` (array de `id_serie`) en el estado del carrito y enviarlo en el payload de crear/editar**

- [ ] **Step 3: Verificar sintaxis**

Run: `cd frontend && npx eslint src/pages/inventario/TransferenciaForm.jsx src/services/transferencias.service.js`
Expected: sin errores nuevos.

- [ ] **Step 4: Verificación manual en navegador**

Crear una transferencia, elegir series en una línea, guardar, enviarla,
y confirmar en `TransferenciaDetalle.jsx` (o vía `curl` a la base) que
quedaron en tránsito; recibirla y confirmar que pasaron al depósito
destino.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/inventario/TransferenciaForm.jsx frontend/src/services/transferencias.service.js
git commit -m "feat: selector de series en el carrito de transferencias"
```

---

## Task 6: Ventas — elegir series al vender + completar serie después (backend)

**Files:**
- Modify: `backend/controllers/ventas.Controller.js` (`createVenta` — ambos bloques de `INSERT INTO venta_detalle`, líneas ~526 y ~647; `actualizarSerie`, línea ~1504)

**Interfaces:**
- Consumes: `productoSeries.js` (Task 1) — `listarDisponibles`, `marcarVendida`. El listado de series disponibles para elegir no necesita endpoint propio: Task 7 reutiliza `GET /api/productos/:id/series/:id_deposito` de Task 2 (mismo que ya reutiliza Task 5 para transferencias).
- Produces (usado por Task 7):
  - El body de cada item en `createVenta` acepta `series: [id_serie, ...]` opcional. Si `series.length > 1`, esa línea se graba como `series.length` filas de `venta_detalle` (cantidad 1 cada una, mismo precio/descuento/impuesto que la línea original) más, si `cantidad > series.length`, una fila final con la cantidad restante y `numero_serie=NULL`. Si `series.length <= 1`, se graba como una sola fila (comportamiento actual, sin cambios). `createVenta` devuelve, junto a lo que ya devuelve hoy, el `id_detalle` de cada fila creada (para que Task 7 pueda subir la foto de cada una después).
  - `PUT /api/ventas/detalle/:id_detalle/serie` (la ruta de `actualizarSerie` ya existente) acepta además, en el body, `id_serie` opcional junto al `numero_serie` de texto ya existente — cuando viene `id_serie`, además de guardar el texto llama `marcarVendida([id_serie], { id_venta_detalle: id_detalle })`.
  - `POST /api/ventas/detalle/:id_detalle/imagen-serie` (`subirImagenSerie`, ya existente) no cambia — Task 7 lo reutiliza tal cual, llamándolo justo después de crear la venta para cada línea que tenga una foto adjunta en el carrito.

- [ ] **Step 1: Validar `series` contra `cantidad` en `createVenta`**

Antes de insertar, por cada item con `series` no vacío: si
`series.length > item.cantidad`, `400 { mensaje: 'Elegiste más series de las que caben en la cantidad' }`.

- [ ] **Step 2: Implementar el split de línea al insertar (ambos bloques de `INSERT INTO venta_detalle`)**

Para un item con `series.length >= 1`: en vez de un solo `INSERT`, hacer
un `INSERT` por cada `id_serie` elegido (con `cantidad=1` y el
`numero_serie` de texto tomado de la fila real de
`compra_detalle_series` para ese `id_serie`, no del input del usuario —
así queda consistente), más un `INSERT` final con
`cantidad = item.cantidad - series.length` si ese resto es `> 0`. Después
de cada `INSERT` de una fila con serie, llamar `marcarVendida([id_serie], { id_venta_detalle: <id recién insertado> })` —
si lanza `SERIE_NO_DISPONIBLE`, abortar toda la transacción de la venta
y devolver `409 { mensaje: 'Una de las series elegidas ya no está disponible, volvé a elegir' }`.

Además, la respuesta de `createVenta` hoy es solo
`{ id_venta, numero, mensaje }` — no incluye los `id_detalle` insertados.
Agregar, juntando el `insertId` de cada `INSERT` (incluida la fila sin
serie si existe), un array `detalle: [{ id_detalle, numero_serie }]` en
el `res.status(201).json({ id_venta, numero, detalle, mensaje })`, para
que Task 7 pueda subir la foto de cada línea después de crear la venta.

- [ ] **Step 3: Verificar con curl — caso normal, exceso de series y condición de carrera**

Run: `curl -X POST http://localhost:3000/api/ventas -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"...": "...", "items":[{"id_producto":5,"cantidad":3,"series":[201,202],"precio_unitario":100}]}'`
Expected: `201`. `SELECT cantidad, numero_serie FROM venta_detalle WHERE id_venta=<id>;` → 3 filas: dos con `cantidad=1` y su serie, una con `cantidad=1` sin serie. `SELECT estado FROM compra_detalle_series WHERE id_serie IN (201,202);` → `VENDIDA` en ambas.

Run (mismo payload pero `cantidad:2` con 3 series): `curl -X POST ... -d '{"items":[{"id_producto":5,"cantidad":2,"series":[203,204,205],"precio_unitario":100}]}'`
Expected: `400 { mensaje: 'Elegiste más series de las que caben en la cantidad' }`.

Run (una serie `EN_STOCK` que mientras tanto se marca `VENDIDA` a mano antes de confirmar esta venta): `UPDATE compra_detalle_series SET estado='VENDIDA' WHERE id_serie=206;` y luego la venta con `series:[206]`.
Expected: `409 { mensaje: 'Una de las series elegidas ya no está disponible, volvé a elegir' }`, y no queda ninguna fila nueva en `venta_detalle` de esa venta (la transacción completa se revierte).

- [ ] **Step 4: Extender `actualizarSerie` para aceptar `id_serie` opcional**

```js
const actualizarSerie = async (req, res) => {
  const { id_detalle } = req.params;
  const { numero_serie, id_serie } = req.body;
  // ...guarda numero_serie como ya hace hoy...
  // si viene id_serie, además: productoSeries.marcarVendida(db, [id_serie], { id_venta_detalle: id_detalle })
  //   captura SERIE_NO_DISPONIBLE -> 409
};
```

- [ ] **Step 5: Verificar con curl**

Run (venta con una línea de cantidad 1 sin serie, creada previamente, y una serie `EN_STOCK` en el depósito de esa venta): `curl -X PUT http://localhost:3000/api/ventas/detalle/<id_detalle>/serie -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"numero_serie":"RF420-0005","id_serie":203}'`
Expected: `200`. `SELECT estado, id_venta_detalle FROM compra_detalle_series WHERE id_serie=203;` → `VENDIDA`, `id_venta_detalle` apuntando a esa línea.

- [ ] **Step 6: Verificar sintaxis**

Run: `node --check backend/controllers/ventas.Controller.js`
Expected: sin salida.

- [ ] **Step 7: Commit**

```bash
git add backend/controllers/ventas.Controller.js
git commit -m "feat: elegir series al vender y completar serie después de la venta"
```

---

## Task 7: Ventas — elegir series al vender + completar serie después (frontend)

**Files:**
- Modify: `frontend/src/pages/ventas/VentaForm.jsx` (carrito, línea ~300 y aledañas)
- Modify: `frontend/src/pages/ventas/VentaDetalle.jsx` (edición post-venta, línea ~100-120 y ~570-610)
- Modify: `frontend/src/services/ventas.service.js`

**Interfaces:**
- Consumes: `GET /api/productos/:id/series/:id_deposito` (Task 2, reutilizado — mismo que Task 5), el `series`/`detalle` que Task 6 agregó a `createVenta`, el `id_serie` opcional de `actualizarSerie`, y `subirImagenSerie` (ya existente, sin cambios).

- [ ] **Step 1: Extender `actualizarSerie` en `ventas.service.js`**

```js
actualizarSerie: (id_detalle, numero_serie, id_serie) =>
  api.put(`/ventas/detalle/${id_detalle}/serie`, { numero_serie, id_serie }),
```

(`getSeriesProducto` no se agrega acá — se usa `productosService.getSeriesProducto` de Task 2, mismo import que hace Task 5 en `TransferenciaForm.jsx`.)

- [ ] **Step 2: Agregar botón opcional "Elegir series" + foto en el carrito de `VentaForm.jsx`**

Mismo patrón que Task 5 en Transferencias: checkboxes limitados a
`fila.cantidad`, usando el depósito de la venta (`id_deposito`
seleccionado en el formulario) y `productosService.getSeriesProducto`.
Al elegir una serie, se guarda el `id_serie` en el estado de esa fila
del carrito (no reemplaza el campo de texto visible — ese sigue siendo
de solo lectura cuando viene de una serie elegida, mostrando el
`numero_serie` correspondiente). Además, junto a cada serie elegida (o
tipeada a mano), un botón "+ Foto" opcional guarda el `File` en el
estado de esa fila del carrito (`fila.fotoSerie`) — todavía no se sube a
ningún lado, solo queda en memoria del navegador mientras se arma la
venta. El payload de `createVenta` manda `series: [...]` por línea como
espera Task 6 (la foto no va en este payload).

- [ ] **Step 3: Subir las fotos pendientes justo después de crear la venta**

En el `onClick`/`onSubmit` que llama a `ventasService.create(...)`:
tras recibir la respuesta (`{ id_venta, numero, detalle }` — `detalle`
viene de Task 6), para cada fila del carrito que tenía `fila.fotoSerie`,
encontrar la entrada de `detalle` cuyo `numero_serie` coincide con la de
esa fila y llamar `ventasService.subirImagenSerie(id_detalle, fila.fotoSerie)`.
Si alguna subida falla, no revertir la venta (ya está creada) — mostrar
un aviso indicando qué línea quedó sin foto, para completarla después
desde `VentaDetalle.jsx` (Step 4).

- [ ] **Step 4: En `VentaDetalle.jsx`, ofrecer elegir de una lista además de tipear a mano**

En el bloque de edición de serie ya existente (línea ~100-120), agregar
un `<select>` opcional con las series `EN_STOCK` del depósito de esa
venta (vía `getSeriesProducto`) que, al elegir una, llena el input de
texto y guarda el `id_serie` para mandarlo junto con `numero_serie` al
llamar `actualizarSerie`. Si el usuario prefiere tipear a mano (como ya
funciona hoy), se manda sin `id_serie` — comportamiento actual sin
cambios.

- [ ] **Step 5: Verificar sintaxis**

Run: `cd frontend && npx eslint src/pages/ventas/VentaForm.jsx src/pages/ventas/VentaDetalle.jsx src/services/ventas.service.js`
Expected: sin errores nuevos.

- [ ] **Step 6: Verificación manual en navegador**

Crear una venta de cantidad 3 eligiendo 2 series con foto para una de
ellas, confirmar que en el detalle aparecen 3 líneas (2 con serie, 1
sin) y que la que tenía foto la muestra sin tener que subirla a mano.
Crear otra venta sin elegir series, entrar al detalle y completar una
serie desde el selector nuevo, confirmar que queda guardada y que
`compra_detalle_series` marca esa unidad como vendida.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ventas/VentaForm.jsx frontend/src/pages/ventas/VentaDetalle.jsx frontend/src/services/ventas.service.js
git commit -m "feat: selector de series en ventas y edición de serie post-venta"
```
