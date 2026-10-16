# Depósito destino por evento de recepción — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir elegir a qué depósito/sucursal va cada evento de recepción de una compra, en vez de que toda la compra tenga un único destino fijo.

**Architecture:** Se agrega una columna `id_deposito` a `compra_recepciones` (un depósito por evento de recepción, no por línea de producto). `compras.id_deposito_destino` sigue existiendo como valor sugerido por defecto. `recibirMercaderia` pasa a escribir stock/kardex en el `id_deposito` de la recepción puntual en vez de en el de la compra. El frontend agrega un selector de depósito al modal "Recibir mercadería" y muestra el depósito de cada evento ya registrado en la pestaña "Recepciones".

**Tech Stack:** Node.js/Express + MySQL (backend), React + Vite (frontend, `frontend/src`).

**Spec:** `docs/superpowers/specs/2026-10-15-recepcion-deposito-por-evento-design.md`

## Global Constraints

- Ningún dato existente se borra ni cambia de significado — la migración es puramente aditiva (columna nueva + backfill), revertible con un `DROP COLUMN`.
- La migración debe poder aplicarse contra producción sin downtime: primero los 3 pasos SQL, recién después el deploy del backend nuevo.
- No se agrega ningún permiso nuevo — se reutilizan `compras.recibir` / `compras.recibir_parcial` tal cual existen hoy.
- El selector de depósito en el modal de recepción usa la misma lista sin restricciones adicionales que ya usa el selector de depósito al crear la compra (`comprasService.getFormData()` → `depositos`) — no se inventa una regla de scoping por sucursal que no existe hoy en ningún otro selector de depósito de este módulo.
- Fuera de alcance (decidido en el spec): repartir una misma línea de producto entre varios depósitos dentro de un mismo evento de recepción; vincular número de serie a depósito; deshacer una recepción puntual ya confirmada.

## Review Focus

- `id_deposito` ausente o inválido en el body de `POST /compras/:id/recibir` — el backend debe rechazar con 400 antes de insertar nada, no debe crear una recepción a medias (fila en `compra_recepciones` sin stock/kardex escrito). Cubierto en Task 2.
- `id_deposito` de un depósito inactivo (`activo = 0`) — el backend es la última línea de defensa aunque el selector del frontend no los liste; un request directo a la API no debe poder usarlo. Cubierto en Task 2.
- Migración: no puede haber una fila de `compra_recepciones` que quede con `id_deposito` NULL tras el `UPDATE` de relleno (lo que tronaría el `ALTER ... NOT NULL` del paso 3) — se verifica explícitamente antes de aplicar el paso 3. Cubierto en Task 1.
- Un mismo producto recibido en dos recepciones con depósitos distintos — `compra_detalle.cantidad_recibida` debe seguir acumulando igual, y el estado de la compra (`PARCIAL` → `RECIBIDO`) debe seguir calculándose por cantidad total, sin importar a cuántos depósitos distintos se repartió. Cubierto en Task 2.
- El selector del modal "Recibir mercadería" debe arrancar siempre preseleccionado con `compra.id_deposito_destino` (el sugerido de la cabecera), no con el último depósito usado en una recepción anterior de esa misma compra. Cubierto en Task 4.

---

### Task 1: Migración SQL (`compra_recepciones.id_deposito`)

**Files:**
- Create: `bd/migracion_33_deposito_por_recepcion.sql`

**Interfaces:**
- Produces: columna `compra_recepciones.id_deposito` (bigint NOT NULL, FK a `depositos.id_deposito`), consumida por Task 2 y Task 3.

- [ ] **Step 1: Escribir el script de migración**

```sql
-- Migración: depósito destino por evento de recepción de compra
-- Antes, toda la mercadería recibida de una compra iba al mismo depósito
-- fijo de la cabecera (compras.id_deposito_destino), sin importar cuántas
-- tandas de recepción se registraran. Ahora cada evento de recepción
-- (compra_recepciones) elige su propio depósito destino, para poder
-- repartir un mismo pedido entre varias sucursales a medida que va
-- llegando la mercadería. compras.id_deposito_destino se mantiene como
-- valor sugerido por defecto para la primera recepción.
-- Ejecutar una sola vez en producción, ANTES de desplegar el backend
-- que empieza a usar esta columna (ver spec para el detalle de orden
-- de despliegue sin downtime).

START TRANSACTION;

-- 1. Columna opcional primero — el backend viejo la ignora por completo.
ALTER TABLE compra_recepciones ADD COLUMN id_deposito BIGINT NULL AFTER id_compra;

-- 2. Relleno del historial: cada recepción ya existente hereda el
--    depósito que tenía su compra en ese momento.
UPDATE compra_recepciones cr
JOIN compras c ON c.id_compra = cr.id_compra
SET cr.id_deposito = c.id_deposito_destino
WHERE cr.id_deposito IS NULL;

COMMIT;

-- 3. Verificación manual antes del paso 4: no debe haber ninguna fila sin
--    completar (si la hay, el ALTER de abajo falla y hay que investigar
--    antes de continuar en vez de forzarlo).
--    SELECT COUNT(*) FROM compra_recepciones WHERE id_deposito IS NULL;
--    (debe devolver 0)

START TRANSACTION;

-- 4. Recién con el historial completo, obligatoria + relación formal.
ALTER TABLE compra_recepciones
  MODIFY id_deposito BIGINT NOT NULL,
  ADD CONSTRAINT fk_crec_deposito FOREIGN KEY (id_deposito) REFERENCES depositos(id_deposito);

COMMIT;
```

- [ ] **Step 2: Correr la migración contra la base local y verificar el resultado**

Run:
```bash
mysql -h127.0.0.1 -uroot bd_electrodomesticos < bd/migracion_33_deposito_por_recepcion.sql
mysql -h127.0.0.1 -uroot bd_electrodomesticos -e "
  SELECT COUNT(*) AS huerfanas FROM compra_recepciones WHERE id_deposito IS NULL;
  SHOW CREATE TABLE compra_recepciones\G
"
```
Expected: `huerfanas` = 0 (si el script llegó hasta el paso 4 sin error, ya es 0 por construcción); `SHOW CREATE TABLE` muestra `id_deposito` como `bigint(20) NOT NULL` y la constraint `fk_crec_deposito`.

- [ ] **Step 3: Confirmar que al menos una recepción histórica quedó con el depósito correcto**

Run:
```bash
mysql -h127.0.0.1 -uroot bd_electrodomesticos -e "
  SELECT cr.id_recepcion, cr.id_compra, cr.id_deposito, c.id_deposito_destino
  FROM compra_recepciones cr JOIN compras c ON c.id_compra = cr.id_compra
  LIMIT 5;
"
```
Expected: en cada fila, `cr.id_deposito` coincide con `c.id_deposito_destino` (porque antes de este cambio esa era la única fuente posible).

- [ ] **Step 4: Commit**

```bash
git add bd/migracion_33_deposito_por_recepcion.sql
git commit -m "db: agregar id_deposito a compra_recepciones (migración 33)"
```

---

### Task 2: Backend — `recibirMercaderia` usa el depósito de la recepción puntual

**Files:**
- Modify: `backend/controllers/compras.Controller.js:725-833` (función `recibirMercaderia`)

**Interfaces:**
- Consumes: columna `compra_recepciones.id_deposito` de Task 1.
- Produces: `POST /compras/:id/recibir` ahora requiere `id_deposito` (número) en el body, junto a los campos existentes (`recepciones`, `observaciones`, `codigos_barras`). Devuelve 400 si falta o es inválido. Consumido por Task 4 (frontend).

- [ ] **Step 1: Agregar la validación de `id_deposito` al inicio de la función**

En `backend/controllers/compras.Controller.js`, la función actual arranca así (línea 725-738):

```js
const recibirMercaderia = async (req, res) => {
  try {
    const { id } = req.params;
    const { recepciones, observaciones, codigos_barras } = req.body;

    if (!Array.isArray(recepciones) || !recepciones.length)
      return res.status(400).json({ error: 'Debe indicar las cantidades recibidas' });

    const [[comp]] = await db.promise().query(
      `SELECT * FROM compras WHERE id_compra = ?`, [id]
    );
    if (!comp) return res.status(404).json({ error: 'Compra no encontrada' });
    if (!['POR_LLEGAR', 'PARCIAL'].includes(comp.estado))
      return res.status(409).json({ error: 'Solo se puede recibir en estado POR_LLEGAR o PARCIAL' });
```

Reemplazar por:

```js
const recibirMercaderia = async (req, res) => {
  try {
    const { id } = req.params;
    const { recepciones, observaciones, codigos_barras, id_deposito } = req.body;

    if (!Array.isArray(recepciones) || !recepciones.length)
      return res.status(400).json({ error: 'Debe indicar las cantidades recibidas' });
    if (!id_deposito)
      return res.status(400).json({ error: 'Debe indicar el depósito destino de la recepción' });

    const [[depositoRow]] = await db.promise().query(
      `SELECT id_deposito FROM depositos WHERE id_deposito = ? AND activo = 1`, [id_deposito]
    );
    if (!depositoRow) return res.status(400).json({ error: 'Depósito destino inválido o inactivo' });

    const [[comp]] = await db.promise().query(
      `SELECT * FROM compras WHERE id_compra = ?`, [id]
    );
    if (!comp) return res.status(404).json({ error: 'Compra no encontrada' });
    if (!['POR_LLEGAR', 'PARCIAL'].includes(comp.estado))
      return res.status(409).json({ error: 'Solo se puede recibir en estado POR_LLEGAR o PARCIAL' });
```

- [ ] **Step 2: Guardar el depósito en la fila de `compra_recepciones`**

Ubicar (línea ~767-771):

```js
    const [recepcionRes] = await db.promise().query(
      `INSERT INTO compra_recepciones (id_compra, id_usuario, observaciones) VALUES (?,?,?)`,
      [id, req.user.id_usuario, observaciones || null]
    );
```

Reemplazar por:

```js
    const [recepcionRes] = await db.promise().query(
      `INSERT INTO compra_recepciones (id_compra, id_usuario, observaciones, id_deposito) VALUES (?,?,?,?)`,
      [id, req.user.id_usuario, observaciones || null, id_deposito]
    );
```

- [ ] **Step 3: Usar `id_deposito` en vez de `comp.id_deposito_destino` en stock/kardex**

Dentro del `for (const rec of recepciones)` hay 4 usos de `comp.id_deposito_destino` (líneas ~792-832). Reemplazar cada uno por `id_deposito`:

```js
      const [[stockRow]] = await db.promise().query(
        `SELECT cantidad, costo_promedio FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [detalle.id_producto, id_deposito]
      );

      const cantActual  = stockRow ? +Number(stockRow.cantidad) : 0;
      const costoActual = stockRow ? +Number(stockRow.costo_promedio) : 0;
      const costoNuevo  = +Number(detalle.precio_unitario);
      const costoPromNuevo = (cantActual + cantReal) > 0
        ? +((cantActual * costoActual + cantReal * costoNuevo) / (cantActual + cantReal)).toFixed(4)
        : costoNuevo;

      await db.promise().query(
        `INSERT INTO stock (id_producto, id_deposito, cantidad, costo_promedio, fecha_ult_movimiento)
         VALUES (?,?,?,?,NOW())
         ON DUPLICATE KEY UPDATE
           cantidad             = cantidad + ?,
           costo_promedio       = ?,
           fecha_ult_movimiento = NOW()`,
        [detalle.id_producto, id_deposito, cantReal, costoPromNuevo,
         cantReal, costoPromNuevo]
      );

      const [[stockNuevo]] = await db.promise().query(
        `SELECT cantidad, costo_promedio FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [detalle.id_producto, id_deposito]
      );

      await db.promise().query(
        `INSERT INTO kardex
           (id_producto, id_deposito, id_tipo_movimiento, fecha, cantidad, costo_unitario,
            saldo_cantidad, saldo_costo,
            documento_tipo, documento_id, documento_numero, id_usuario, observaciones)
         VALUES (?,?,?,NOW(), ?,?, ?,?, 'COMPRA',?,?,?,?)`,
        [detalle.id_producto, id_deposito, tipoMov.id_tipo_movimiento,
         cantReal, costoNuevo,
         stockNuevo.cantidad,
         +(Number(stockNuevo.cantidad) * Number(stockNuevo.costo_promedio)).toFixed(4),
         comp.id_compra, comp.numero,
         req.user.id_usuario, observaciones || null]
      );
```

(`comp.id_compra` y `comp.numero` siguen usando `comp` — esos no cambian, solo el `id_deposito` de las 4 consultas de stock/kardex.)

- [ ] **Step 4: Reiniciar el backend y probar manualmente contra un producto con stock conocido**

El backend es un proceso `node app.js` plano sin autoreload — hay que matar el proceso en el puerto 3000 y volver a levantarlo para que tome el cambio:

```bash
PID=$(netstat -ano | grep ":3000 " | grep LISTENING | awk '{print $5}' | head -1)
powershell -Command "Stop-Process -Id $PID -Force"
cd backend && nohup node app.js > /tmp/backend.log 2>&1 & disown
```

Luego, con una compra real en estado `POR_LLEGAR` o `PARCIAL` y un token de admin (login contra `/api/auth/login` con `identificador`/`contrasena`), probar primero el caso de error:

```bash
curl -s -X POST http://localhost:3000/api/compras/<ID>/recibir \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"recepciones":[{"id_detalle":<ID_DETALLE>,"cantidad_recibida":1}]}'
```
Expected: `400 {"error":"Debe indicar el depósito destino de la recepción"}` — sin `id_deposito` no debe crear nada (verificar con `SELECT COUNT(*) FROM compra_recepciones WHERE id_compra=<ID>` que no aumentó).

Luego probar con `id_deposito` inactivo (buscar uno con `SELECT id_deposito FROM depositos WHERE activo=0 LIMIT 1`; si no hay ninguno, desactivar uno de prueba temporalmente) y confirmar `400 {"error":"Depósito destino inválido o inactivo"}`.

Por último, probar el caso válido con un `id_deposito` activo **distinto** al `id_deposito_destino` de la compra, y verificar que el stock se escribió en el depósito nuevo (no en el de la compra):

```bash
curl -s -X POST http://localhost:3000/api/compras/<ID>/recibir \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"id_deposito":<ID_DEPOSITO_DISTINTO>,"recepciones":[{"id_detalle":<ID_DETALLE>,"cantidad_recibida":1}]}'
mysql -h127.0.0.1 -uroot bd_electrodomesticos -e "
  SELECT id_deposito FROM compra_recepciones ORDER BY id_recepcion DESC LIMIT 1;
  SELECT id_producto, id_deposito, cantidad FROM stock WHERE id_producto=<ID_PRODUCTO>;
"
```
Expected: la recepción nueva tiene el `id_deposito` indicado, y la fila de `stock` para ese producto en `<ID_DEPOSITO_DISTINTO>` aumentó en 1 (sin tocar el stock del depósito original de la compra).

- [ ] **Step 5: Confirmar que recibir el mismo producto en dos depósitos distintos no rompe el acumulado**

Repetir el Step 4 con otra recepción del mismo `id_detalle` pero apuntando al `id_deposito_destino` original de la compra, y verificar:

```bash
mysql -h127.0.0.1 -uroot bd_electrodomesticos -e "
  SELECT cantidad, cantidad_recibida FROM compra_detalle WHERE id_detalle=<ID_DETALLE>;
  SELECT estado FROM compras WHERE id_compra=<ID>;
"
```
Expected: `cantidad_recibida` es la suma de ambas recepciones (sin importar que fueron a depósitos distintos), y `estado` pasa a `RECIBIDO` si con eso se cubrió todo lo pedido, o sigue `PARCIAL` si no — igual que el comportamiento de hoy.

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/compras.Controller.js
git commit -m "feat: recibirMercaderia usa el depósito de cada recepción en vez del fijo de la compra"
```

---

### Task 3: Backend — `getCompra` expone el depósito de cada recepción

**Files:**
- Modify: `backend/controllers/compras.Controller.js:366-373` (dentro de la función que arma la respuesta de `GET /compras/:id`)

**Interfaces:**
- Consumes: columna `compra_recepciones.id_deposito` de Task 1.
- Produces: cada objeto de `recepciones[]` en la respuesta de `GET /compras/:id` ahora incluye `id_deposito`, `deposito_nombre`, `sucursal_nombre`. Consumido por Task 4 (pestaña "Recepciones" del frontend).

- [ ] **Step 1: Ampliar la consulta de recepciones**

Ubicar (línea 366-373):

```js
    const [recepciones] = await db.promise().query(
      `SELECT cr.id_recepcion, cr.fecha, cr.observaciones,
              u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos
       FROM compra_recepciones cr
       JOIN usuarios u ON u.id_usuario = cr.id_usuario
       WHERE cr.id_compra = ?
       ORDER BY cr.fecha DESC`, [id]
    );
```

Reemplazar por:

```js
    const [recepciones] = await db.promise().query(
      `SELECT cr.id_recepcion, cr.fecha, cr.observaciones, cr.id_deposito,
              d.nombre AS deposito_nombre, s.nombre AS sucursal_nombre,
              u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos
       FROM compra_recepciones cr
       JOIN usuarios u ON u.id_usuario = cr.id_usuario
       JOIN depositos d ON d.id_deposito = cr.id_deposito
       JOIN sucursales s ON s.id_sucursal = d.id_sucursal
       WHERE cr.id_compra = ?
       ORDER BY cr.fecha DESC`, [id]
    );
```

- [ ] **Step 2: Reiniciar el backend y verificar con curl**

```bash
PID=$(netstat -ano | grep ":3000 " | grep LISTENING | awk '{print $5}' | head -1)
powershell -Command "Stop-Process -Id $PID -Force"
cd backend && nohup node app.js > /tmp/backend.log 2>&1 & disown
sleep 2
curl -s http://localhost:3000/api/compras/<ID> -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['recepciones'][0] if d['recepciones'] else 'sin recepciones')"
```
Expected: el objeto impreso incluye `id_deposito`, `deposito_nombre` y `sucursal_nombre` con valores no nulos (usando una compra que ya tenga al menos una recepción registrada, por ejemplo la usada en el Task 2).

- [ ] **Step 3: Commit**

```bash
git add backend/controllers/compras.Controller.js
git commit -m "feat: getCompra expone el depósito de cada evento de recepción"
```

---

### Task 4: Frontend — selector de depósito en "Recibir mercadería" + mostrarlo en "Recepciones"

**Files:**
- Modify: `frontend/src/pages/compras/CompraDetalle.jsx:604-693` (`ModalRecibir`)
- Modify: `frontend/src/pages/compras/CompraDetalle.jsx:845-868` (estado + carga de `depositos`)
- Modify: `frontend/src/pages/compras/CompraDetalle.jsx:912-927` (`handleRecibir` — sin cambios de lógica, solo contexto para ubicar `ModalRecibir`)
- Modify: `frontend/src/pages/compras/CompraDetalle.jsx:1053-1056` (invocación de `ModalRecibir`)
- Modify: `frontend/src/pages/compras/CompraDetalle.jsx:1477-1499` (pestaña "Recepciones")

**Interfaces:**
- Consumes: `POST /compras/:id/recibir` ahora requiere `id_deposito` (Task 2); `GET /compras/:id` ahora incluye `deposito_nombre`/`sucursal_nombre` por recepción (Task 3); `comprasService.getFormData()` ya devuelve `depositos: [{id_deposito, nombre, codigo, id_sucursal, sucursal_nombre, activo}]` (sin cambios, endpoint ya existente).

- [ ] **Step 1: Cargar la lista de depósitos junto con las monedas**

Ubicar (línea 845-868):

```js
  const [data,         setData]        = useState(null);
  const [monedas,      setMonedas]     = useState([]);
```

Agregar debajo de `monedas`:

```js
  const [data,         setData]        = useState(null);
  const [monedas,      setMonedas]     = useState([]);
  const [depositos,    setDepositos]   = useState([]);
```

Y ubicar (línea 866-869):

```js
  useEffect(() => {
    cargar();
    comprasService.getFormData().then(r => setMonedas(r.data.monedas ?? [])).catch(() => {});
  }, []); // eslint-disable-line
```

Reemplazar por:

```js
  useEffect(() => {
    cargar();
    comprasService.getFormData().then(r => {
      setMonedas(r.data.monedas ?? []);
      setDepositos(r.data.depositos ?? []);
    }).catch(() => {});
  }, []); // eslint-disable-line
```

- [ ] **Step 2: Agregar el selector de depósito a `ModalRecibir`**

Ubicar la firma y el estado inicial de `ModalRecibir` (línea 604-615):

```js
function ModalRecibir({ detalle, onConfirm, onClose, loading, error }) {
  const pendientes = detalle.filter(d => Number(d.cantidad_recibida) < Number(d.cantidad));
  const [recs, setRecs] = useState(() =>
    pendientes.map(d => ({
      id_detalle: d.id_detalle,
      id_producto: d.id_producto,
      cantidad_recibida: +(Number(d.cantidad) - Number(d.cantidad_recibida)).toFixed(4),
      codigo_barras: d.codigo_barras || (d.id_producto != null ? `BC${String(d.id_producto).padStart(8, '0')}` : ''),
      barras_existente: !!d.codigo_barras,
    }))
  );
  const [obs, setObs] = useState('');
```

Reemplazar por:

```js
function ModalRecibir({ detalle, depositos, idDepositoSugerido, onConfirm, onClose, loading, error }) {
  const pendientes = detalle.filter(d => Number(d.cantidad_recibida) < Number(d.cantidad));
  const [recs, setRecs] = useState(() =>
    pendientes.map(d => ({
      id_detalle: d.id_detalle,
      id_producto: d.id_producto,
      cantidad_recibida: +(Number(d.cantidad) - Number(d.cantidad_recibida)).toFixed(4),
      codigo_barras: d.codigo_barras || (d.id_producto != null ? `BC${String(d.id_producto).padStart(8, '0')}` : ''),
      barras_existente: !!d.codigo_barras,
    }))
  );
  const [obs, setObs] = useState('');
  const [idDeposito, setIdDeposito] = useState(idDepositoSugerido ? String(idDepositoSugerido) : '');
```

Luego ubicar, dentro del JSX, justo antes del bloque de Observaciones (línea 666-670):

```js
        )}
        <div>
          <label className={labelCls}>Observaciones</label>
          <input type="text" value={obs} onChange={e => setObs(e.target.value)} className={fieldCls} />
        </div>
```

Reemplazar por:

```js
        )}
        <div>
          <label className={labelCls}>Depósito destino de esta recepción</label>
          <select value={idDeposito} onChange={e => setIdDeposito(e.target.value)} className={fieldCls}>
            <option value="">— Seleccionar —</option>
            {depositos.filter(d => d.activo).map(d => (
              <option key={d.id_deposito} value={d.id_deposito}>
                {d.sucursal_nombre} — {d.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Observaciones</label>
          <input type="text" value={obs} onChange={e => setObs(e.target.value)} className={fieldCls} />
        </div>
```

Y ubicar el botón de confirmar (línea 677-688):

```js
          <button
            onClick={() => onConfirm({
              recepciones: recs.map(({ id_detalle, cantidad_recibida }) => ({ id_detalle, cantidad_recibida })),
              observaciones: obs,
              codigos_barras: recs
                .filter(r => r.id_producto != null && r.codigo_barras?.trim())
                .map(({ id_producto, codigo_barras }) => ({ id_producto, codigo_barras })),
            })}
            disabled={loading || pendientes.length === 0}
            className="flex-1 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Guardando…' : 'Confirmar recepción'}
          </button>
```

Reemplazar por:

```js
          <button
            onClick={() => onConfirm({
              id_deposito: idDeposito,
              recepciones: recs.map(({ id_detalle, cantidad_recibida }) => ({ id_detalle, cantidad_recibida })),
              observaciones: obs,
              codigos_barras: recs
                .filter(r => r.id_producto != null && r.codigo_barras?.trim())
                .map(({ id_producto, codigo_barras }) => ({ id_producto, codigo_barras })),
            })}
            disabled={loading || pendientes.length === 0 || !idDeposito}
            className="flex-1 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Guardando…' : 'Confirmar recepción'}
          </button>
```

- [ ] **Step 3: Pasar `depositos` e `idDepositoSugerido` desde donde se invoca el modal**

Ubicar (línea 1053-1056):

```js
      {modal === 'recibir' && (
        <ModalRecibir detalle={detalle} loading={saving} error={modalErr}
          onClose={closeModal} onConfirm={handleRecibir} />
      )}
```

Reemplazar por:

```js
      {modal === 'recibir' && (
        <ModalRecibir detalle={detalle} depositos={depositos} idDepositoSugerido={compra.id_deposito_destino}
          loading={saving} error={modalErr}
          onClose={closeModal} onConfirm={handleRecibir} />
      )}
```

- [ ] **Step 4: Mostrar el depósito de cada evento en la pestaña "Recepciones"**

Ubicar (línea 1477-1482):

```js
              {recepciones.map(r => (
                <div key={r.id_recepcion} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{fmtDT(r.fecha)}</p>
                    <p className="text-xs text-zinc-400">{r.usuario_nombres} {r.usuario_apellidos}</p>
                  </div>
```

Reemplazar por:

```js
              {recepciones.map(r => (
                <div key={r.id_recepcion} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{fmtDT(r.fecha)}</p>
                    <p className="text-xs text-zinc-400">{r.usuario_nombres} {r.usuario_apellidos}</p>
                  </div>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mb-2">
                    📍 {r.sucursal_nombre} — {r.deposito_nombre}
                  </p>
```

- [ ] **Step 5: Lint**

Run: `cd frontend && npx eslint src/pages/compras/CompraDetalle.jsx`
Expected: solo el warning pre-existente de `react-hooks/set-state-in-effect` ya conocido en este archivo (línea ~867, el `useEffect` de carga inicial) — ningún error nuevo relacionado a este cambio.

- [ ] **Step 6: Probar manualmente en el navegador**

Con backend y frontend corriendo (`cd backend && node app.js` / `cd frontend && npm run dev`), abrir una compra en estado `POR_LLEGAR` o `PARCIAL`, hacer clic en "Recibir mercadería" y verificar:
- El selector "Depósito destino de esta recepción" aparece preseleccionado con el mismo depósito que figura en "Depósito dest." de la cabecera de la compra.
- Cambiarlo a otro depósito y confirmar la recepción — no debe tirar error.
- El botón "Confirmar recepción" queda deshabilitado si se borra la selección de depósito.
- Entrar a la pestaña "Recepciones" y confirmar que la recepción recién hecha muestra la línea `📍 <Sucursal> — <Depósito>` con el depósito elegido (no el de la cabecera, si se cambió).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/compras/CompraDetalle.jsx
git commit -m "feat: selector de depósito por recepción en el modal de recibir mercadería"
```
