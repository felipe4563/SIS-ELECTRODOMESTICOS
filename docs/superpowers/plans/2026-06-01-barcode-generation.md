# Barcode Generation at Purchase Reception — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al confirmar la recepción de una compra, el sistema asigna un código de barras Code 128 a cada producto (usando el del proveedor si ya existe, o generando uno interno) y permite descargar un archivo `.zpl` para impresora térmica 30mm × 20mm.

**Architecture:** Se extiende el backend para exponer `codigo_barras` e `id_producto` en el detalle de compra y para persistir códigos de barras en `productos` al recibir. En el frontend se añaden campos de barras al `ModalRecibir` existente y un nuevo `ModalEtiquetas` que genera ZPL puro sin librerías externas.

**Tech Stack:** Express.js + MariaDB (backend), React 18 (frontend), ZPL II (lenguaje de impresora térmica)

---

## File Map

| Archivo | Cambio |
|---|---|
| `backend/controllers/compras.Controller.js` | Agregar `p.id_producto, p.codigo_barras` al SELECT de detalle en `getCompra`; aceptar y persistir `codigos_barras` en `recibirMercaderia` |
| `frontend/src/pages/compras/CompraDetalle.jsx` | Extender `ModalRecibir` con campos de barras; agregar `ModalEtiquetas`; agregar `handleRecibir` y estado de etiquetas en `CompraDetalle` |

---

## Task 1: Backend — exponer barras en detalle y persistirlas al recibir

**Files:**
- Modify: `backend/controllers/compras.Controller.js:116-126` (getCompra detalle query)
- Modify: `backend/controllers/compras.Controller.js:310,387-389` (recibirMercaderia)

- [ ] **Step 1: Agregar `p.id_producto` y `p.codigo_barras` al SELECT del detalle en `getCompra`**

En la línea 116-119, el query del detalle actualmente es:
```js
const [detalle] = await db.promise().query(
  `SELECT cd.*,
          p.codigo_interno, p.producto, p.detalle AS producto_detalle,
          m.nombre AS marca_nombre,
          u.nombre AS unidad_nombre, u.codigo AS unidad_codigo
   FROM compra_detalle cd
   JOIN productos     p ON p.id_producto = cd.id_producto
   JOIN marcas        m ON m.id_marca    = p.id_marca
   JOIN unidades_medida u ON u.id_unidad = p.id_unidad
   WHERE cd.id_compra = ?
   ORDER BY cd.id_detalle`, [id]
);
```

Cambiar por:
```js
const [detalle] = await db.promise().query(
  `SELECT cd.*,
          p.id_producto, p.codigo_interno, p.codigo_barras, p.producto, p.detalle AS producto_detalle,
          m.nombre AS marca_nombre,
          u.nombre AS unidad_nombre, u.codigo AS unidad_codigo
   FROM compra_detalle cd
   JOIN productos     p ON p.id_producto = cd.id_producto
   JOIN marcas        m ON m.id_marca    = p.id_marca
   JOIN unidades_medida u ON u.id_unidad = p.id_unidad
   WHERE cd.id_compra = ?
   ORDER BY cd.id_detalle`, [id]
);
```

- [ ] **Step 2: Aceptar `codigos_barras` en `recibirMercaderia` (línea 310)**

Cambiar:
```js
const { recepciones, observaciones } = req.body;
```

Por:
```js
const { recepciones, observaciones, codigos_barras } = req.body;
```

- [ ] **Step 3: Persistir códigos de barras después del loop de recepciones**

El loop de recepciones termina en la línea 387 (`}`). Después del cierre del loop y antes de `const [detRefresh]` (línea 389), insertar:

```js
    if (Array.isArray(codigos_barras) && codigos_barras.length > 0) {
      for (const { id_producto, codigo_barras } of codigos_barras) {
        if (id_producto && codigo_barras?.trim()) {
          await db.promise().query(
            `UPDATE productos SET codigo_barras = ?
             WHERE id_producto = ? AND (codigo_barras IS NULL OR codigo_barras = '')`,
            [codigo_barras.trim(), id_producto]
          );
        }
      }
    }
```

La condición `AND (codigo_barras IS NULL OR codigo_barras = '')` garantiza que nunca sobreescriba un código de barras preexistente del proveedor.

- [ ] **Step 4: Verificar manualmente el endpoint**

Arrancar el backend: `cd backend && node app.js`

Con un cliente HTTP (Postman o Thunder Client), hacer:
```
GET http://localhost:3000/api/compras/<id_compra_existente>
```

Verificar que la respuesta incluye en `detalle[0]`: `id_producto` (número) y `codigo_barras` (string o null).

---

## Task 2: Frontend — extender ModalRecibir con campos de código de barras

**Files:**
- Modify: `frontend/src/pages/compras/CompraDetalle.jsx:92-161` (ModalRecibir)

- [ ] **Step 1: Ampliar el estado `recs` con campos de barras (líneas 97-107)**

Cambiar el bloque de estado y helpers de `ModalRecibir`:
```js
const [recs, setRecs] = useState(() =>
  pendientes.map(d => ({
    id_detalle: d.id_detalle,
    cantidad_recibida: +(Number(d.cantidad) - Number(d.cantidad_recibida)).toFixed(4),
  }))
);
const [obs, setObs] = useState('');

const setRec = (idx, val) => setRecs(prev =>
  prev.map((r, i) => i === idx ? { ...r, cantidad_recibida: val } : r)
);
```

Por:
```js
const [recs, setRecs] = useState(() =>
  pendientes.map(d => ({
    id_detalle: d.id_detalle,
    id_producto: d.id_producto,
    cantidad_recibida: +(Number(d.cantidad) - Number(d.cantidad_recibida)).toFixed(4),
    codigo_barras: d.codigo_barras || `BC${String(d.id_producto).padStart(8, '0')}`,
    barras_existente: !!d.codigo_barras,
  }))
);
const [obs, setObs] = useState('');

const setRec = (idx, val) => setRecs(prev =>
  prev.map((r, i) => i === idx ? { ...r, cantidad_recibida: val } : r)
);
const setBarras = (idx, val) => setRecs(prev =>
  prev.map((r, i) => i === idx ? { ...r, codigo_barras: val } : r)
);
```

- [ ] **Step 2: Agregar el campo de código de barras a cada tarjeta de producto (líneas 119-137)**

Cambiar la tarjeta de cada producto pendiente. Encontrar el bloque:
```jsx
<div key={d.id_detalle} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
  <p className="text-sm font-medium text-zinc-900 dark:text-white">{d.producto}</p>
  <p className="text-xs text-zinc-500 mb-2 font-mono">{d.codigo_interno}</p>
  <div className="flex items-center gap-3">
    <div className="flex-1">
      <p className="text-[11px] text-zinc-500 mb-1">
        Pedido: {fmtNum(d.cantidad)} — Ya recibido: {fmtNum(d.cantidad_recibida)} — Pendiente: <span className="font-semibold text-orange-600">{fmtNum(maxPend)}</span>
      </p>
      <input
        type="number" min="0" max={maxPend} step="0.01"
        value={recs[idx]?.cantidad_recibida ?? 0}
        onChange={e => setRec(idx, Number(e.target.value))}
        className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
    </div>
    <span className="text-xs text-zinc-400 whitespace-nowrap">{d.unidad_codigo}</span>
  </div>
</div>
```

Reemplazar por:
```jsx
<div key={d.id_detalle} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
  <p className="text-sm font-medium text-zinc-900 dark:text-white">{d.producto}</p>
  <p className="text-xs text-zinc-500 mb-2 font-mono">{d.codigo_interno}</p>
  <div className="flex items-center gap-3">
    <div className="flex-1">
      <p className="text-[11px] text-zinc-500 mb-1">
        Pedido: {fmtNum(d.cantidad)} — Ya recibido: {fmtNum(d.cantidad_recibida)} — Pendiente: <span className="font-semibold text-orange-600">{fmtNum(maxPend)}</span>
      </p>
      <input
        type="number" min="0" max={maxPend} step="0.01"
        value={recs[idx]?.cantidad_recibida ?? 0}
        onChange={e => setRec(idx, Number(e.target.value))}
        className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
    </div>
    <span className="text-xs text-zinc-400 whitespace-nowrap">{d.unidad_codigo}</span>
  </div>
  <div className="mt-2">
    <p className="text-[11px] text-zinc-500 mb-1">Código de barras</p>
    {recs[idx]?.barras_existente ? (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
          {recs[idx].codigo_barras}
        </span>
        <span className="text-[10px] text-blue-500">del proveedor</span>
      </div>
    ) : (
      <input
        type="text"
        value={recs[idx]?.codigo_barras ?? ''}
        onChange={e => setBarras(idx, e.target.value)}
        placeholder="Escanear o dejar generado"
        className="w-full px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
    )}
  </div>
</div>
```

- [ ] **Step 3: Cambiar el payload del botón Confirmar recepción (línea 152)**

Cambiar:
```jsx
<button onClick={() => onConfirm({ recepciones: recs, observaciones: obs })}
```

Por:
```jsx
<button onClick={() => onConfirm({
  recepciones: recs.map(({ id_detalle, cantidad_recibida }) => ({ id_detalle, cantidad_recibida })),
  observaciones: obs,
  codigos_barras: recs.map(({ id_producto, codigo_barras }) => ({ id_producto, codigo_barras })),
})}
```

- [ ] **Step 4: Verificar visualmente en el navegador**

Ir a una compra en estado `POR_LLEGAR` o `PARCIAL`. Abrir "Recibir mercadería". Verificar:
- Productos sin `codigo_barras` muestran un campo editable pre-llenado con `BC00000042` (o el id del producto en 8 dígitos)
- Productos que ya tienen `codigo_barras` muestran el código en gris con badge "del proveedor"
- El campo es editable (se puede escanear o escribir un código distinto)

---

## Task 3: Frontend — ModalEtiquetas + handleRecibir + estado

**Files:**
- Modify: `frontend/src/pages/compras/CompraDetalle.jsx:161-161` (insertar ModalEtiquetas después de ModalRecibir)
- Modify: `frontend/src/pages/compras/CompraDetalle.jsx:262-268` (estado del componente principal)
- Modify: `frontend/src/pages/compras/CompraDetalle.jsx:299-299` (insertar handleRecibir)
- Modify: `frontend/src/pages/compras/CompraDetalle.jsx:326-332` (cambiar onConfirm de ModalRecibir)
- Modify: `frontend/src/pages/compras/CompraDetalle.jsx:319-319` (insertar render de ModalEtiquetas)

- [ ] **Step 1: Insertar el componente `ModalEtiquetas` entre `ModalRecibir` y `ModalPagar` (después de la línea 161)**

Insertar el siguiente bloque después del cierre de `ModalRecibir` (línea 161) y antes del comentario `// ── Modal Pagar` (línea 163):

```jsx
// ── Modal Etiquetas ───────────────────────────────────────────────────────────
function ModalEtiquetas({ items, onChange, onClose }) {
  const generarZPL = () => {
    let zpl = '';
    for (const item of items) {
      const nombre = (item.nombre || '').substring(0, 22).toUpperCase();
      const copias = Math.max(1, Number(item.copias) || 1);
      for (let i = 0; i < copias; i++) {
        zpl += `^XA\n^PW240\n^LL160\n`;
        zpl += `^FO15,8^BCN,55,Y,N,N^FD${item.codigo_barras}^FS\n`;
        zpl += `^FO15,115^A0N,16,16^FD${nombre}^FS\n`;
        zpl += `^XZ\n`;
      }
    }
    const blob = new Blob([zpl], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etiquetas_${new Date().toISOString().slice(0, 10)}.zpl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal titulo="Imprimir etiquetas" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-zinc-500">Etiquetas 30mm × 20mm — Code 128. Ajusta las copias por producto.</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{item.nombre}</p>
                <p className="text-xs font-mono text-zinc-500">{item.codigo_barras}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <label className="text-xs text-zinc-500">Copias</label>
                <input
                  type="number" min="1" max="99"
                  value={item.copias}
                  onChange={e => onChange(idx, Number(e.target.value))}
                  className="w-14 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Cerrar
          </button>
          <button onClick={generarZPL}
            className="flex-1 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-white text-sm font-semibold transition-colors">
            Descargar ZPL
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Agregar estado de etiquetas al componente `CompraDetalle` (después de línea 268)**

Encontrar el bloque de estado (líneas 262-268):
```js
const [data,     setData]     = useState(null);
const [monedas,  setMonedas]  = useState([]);
const [cargando, setCargando] = useState(true);
const [tab,      setTab]      = useState('productos');
const [modal,    setModal]    = useState(null);
const [saving,   setSaving]   = useState(false);
const [modalErr, setModalErr] = useState('');
```

Reemplazar por:
```js
const [data,           setData]           = useState(null);
const [monedas,        setMonedas]        = useState([]);
const [cargando,       setCargando]       = useState(true);
const [tab,            setTab]            = useState('productos');
const [modal,          setModal]          = useState(null);
const [saving,         setSaving]         = useState(false);
const [modalErr,       setModalErr]       = useState('');
const [modalEtiquetas, setModalEtiquetas] = useState(false);
const [etiquetas,      setEtiquetas]      = useState([]);
```

- [ ] **Step 3: Insertar `handleRecibir` y `handleCambiarCopias` después de `runAction` (después de línea 299)**

Encontrar el cierre de `runAction` (línea 298-299):
```js
  };
```
(el bloque que termina `runAction`)

Insertar después:
```js
  const handleRecibir = async (payload) => {
    setSaving(true);
    setModalErr('');
    try {
      await comprasService.recibir(id, payload);
      setModal(null);
      await cargar();
      const productosRecibidos = payload.recepciones
        .filter(r => Number(r.cantidad_recibida) > 0)
        .map(r => {
          const det = detalle.find(d => d.id_detalle === r.id_detalle);
          const barras = payload.codigos_barras?.find(b => b.id_producto === det?.id_producto);
          return {
            nombre: det?.producto || '',
            codigo_barras: barras?.codigo_barras || '',
            copias: 1,
          };
        })
        .filter(p => p.codigo_barras);
      if (productosRecibidos.length > 0) {
        setEtiquetas(productosRecibidos);
        setModalEtiquetas(true);
      }
    } catch (e) {
      setModalErr(e?.response?.data?.error ?? 'Error al recibir mercadería');
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarCopias = (idx, val) =>
    setEtiquetas(prev => prev.map((e, i) => i === idx ? { ...e, copias: val } : e));
```

Nota importante: `handleRecibir` usa `detalle` capturado por cierre. En el momento que se llama, `detalle` proviene de `const { compra, detalle, cuotas, pagos } = data;` y tiene los valores PRE-recepción — exactamente los que necesitamos para mapear `id_detalle` → nombre del producto.

- [ ] **Step 4: Cambiar el `onConfirm` del `ModalRecibir` para usar `handleRecibir` (líneas 326-332)**

Encontrar:
```jsx
{modal === 'recibir' && (
  <ModalRecibir
    detalle={detalle} loading={saving} error={modalErr}
    onClose={closeModal}
    onConfirm={form => runAction(() => comprasService.recibir(id, form))}
  />
)}
```

Reemplazar por:
```jsx
{modal === 'recibir' && (
  <ModalRecibir
    detalle={detalle} loading={saving} error={modalErr}
    onClose={closeModal}
    onConfirm={handleRecibir}
  />
)}
```

- [ ] **Step 5: Agregar el render de `ModalEtiquetas` al JSX (dentro del bloque de modales, después de la línea 365)**

Encontrar el bloque de anular (que termina `</Modal>` y `}`), alrededor de la línea 365. Agregar después:

```jsx
{modalEtiquetas && (
  <ModalEtiquetas
    items={etiquetas}
    onChange={handleCambiarCopias}
    onClose={() => setModalEtiquetas(false)}
  />
)}
```

- [ ] **Step 6: Verificar el flujo completo en el navegador**

1. Ir a una compra en estado `POR_LLEGAR`
2. Click "Recibir mercadería"
3. Confirmar que cada producto muestra su campo de código de barras pre-generado
4. Ingresar cantidad y dejar o editar el código de barras
5. Click "Confirmar recepción"
6. Verificar que el modal de recepción se cierra
7. Verificar que aparece el `ModalEtiquetas` con la lista de productos recibidos
8. Ajustar las copias de cada producto
9. Click "Descargar ZPL"
10. Verificar que se descarga un archivo `.zpl` con nombre `etiquetas_2026-06-01.zpl`
11. Abrir el archivo con un editor de texto y verificar su estructura:
    ```
    ^XA
    ^PW240
    ^LL160
    ^FO15,8^BCN,55,Y,N,N^BC00000042^FS
    ^FO15,115^A0N,16,16^FDTELEVISOR SAMSUNG^FS
    ^XZ
    ```
12. Verificar en la BD que `productos.codigo_barras` fue actualizado para los productos que no tenían uno previo:
    ```sql
    SELECT id_producto, codigo_interno, codigo_barras FROM productos WHERE codigo_barras IS NOT NULL;
    ```
