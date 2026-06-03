# Barcode Generation at Purchase Reception — Design Spec

**Date:** 2026-06-01  
**Feature:** Generar código de barras Code 128 al recibir mercadería y descargar etiquetas ZPL para impresora térmica 30mm × 20mm

---

## Goal

Al registrar la recepción de una compra, el sistema asigna un código de barras Code 128 a cada producto recibido (usando el del proveedor si ya existe, o generando uno interno automáticamente). Tras confirmar la recepción, el usuario puede descargar un archivo `.zpl` para imprimir etiquetas adhesivas 30mm × 20mm en impresora térmica.

---

## Architecture

Dos archivos modificados únicamente:

- `backend/controllers/compras.Controller.js` — expone `codigo_barras` e `id_producto` en el detalle de compra; acepta y persiste códigos de barras al recibir
- `frontend/src/pages/compras/CompraDetalle.jsx` — extiende `ModalRecibir` con campos de barras; agrega `ModalEtiquetas` nuevo

No se crean archivos nuevos. No se toca ningún otro módulo.

---

## Data Flow

```
getCompra (GET /api/compras/:id)
  └─ detalle incluye: id_producto, codigo_barras (de productos)

ModalRecibir (frontend)
  ├─ para cada producto pendiente:
  │   ├─ si codigo_barras existe → mostrar como solo-lectura (badge "del proveedor")
  │   └─ si es null → auto-generar BC{id_producto padded 8}, editable por usuario
  └─ al confirmar → payload incluye codigos_barras: [{id_detalle, id_producto, codigo_barras}]

recibirMercaderia (POST /api/compras/:id/recibir)
  ├─ lógica existente: actualiza compra_detalle, stock, kardex
  └─ nuevo: UPDATE productos SET codigo_barras = ? WHERE id_producto = ?
            AND (codigo_barras IS NULL OR codigo_barras = '')
            (solo si producto no tenía barras previo)

handleRecibir (frontend, éxito)
  ├─ cierra ModalRecibir
  └─ abre ModalEtiquetas con lista de productos recibidos + sus barras

ModalEtiquetas
  ├─ tabla: nombre producto | codigo_barras | copias (input number, default 1)
  └─ "Descargar ZPL" → genera blob .zpl y dispara descarga
```

---

## Backend Changes

### `getCompra` — agregar campos al SELECT del detalle

El query que retorna `compra_detalle` debe incluir:
```sql
p.id_producto,
p.codigo_barras
```
Junto a los campos que ya trae (`d.codigo_interno`, `d.producto`, etc.).

### `recibirMercaderia` — persistir códigos de barras

Firma del body ampliada:
```js
const { recepciones, observaciones, codigos_barras } = req.body;
// codigos_barras: [{ id_producto: number, codigo_barras: string }]
```

Después del loop de recepciones existente, antes de `res.json`:
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

Regla: solo actualiza si el producto NO tenía barras previo. Si ya tenía uno (del proveedor), no lo sobreescribe.

---

## Frontend Changes

### `ModalRecibir` — estado inicial ampliado

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
```

### `ModalRecibir` — UI por producto

Cada tarjeta de producto agrega debajo del input de cantidad:

```jsx
<div className="mt-2">
  <p className="text-[11px] text-zinc-500 mb-1">Código de barras</p>
  {recs[idx].barras_existente ? (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
        {recs[idx].codigo_barras}
      </span>
      <span className="text-[10px] text-blue-500">del proveedor</span>
    </div>
  ) : (
    <input
      type="text"
      value={recs[idx].codigo_barras}
      onChange={e => setBarras(idx, e.target.value)}
      placeholder="Escanear o dejar generado"
      className="w-full px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
    />
  )}
</div>
```

### `ModalRecibir` — payload al confirmar

```js
onConfirm({
  recepciones: recs.map(({ id_detalle, cantidad_recibida }) => ({ id_detalle, cantidad_recibida })),
  observaciones: obs,
  codigos_barras: recs.map(({ id_producto, codigo_barras }) => ({ id_producto, codigo_barras })),
})
```

### `handleRecibir` — abrir etiquetas después de éxito

```js
const handleRecibir = async (payload) => {
  setRecLoading(true); setRecError(null);
  try {
    await comprasService.recibir(compra.id_compra, payload);
    setModalRecibir(false);
    await cargarCompra();
    // Preparar datos para etiquetas
    const productosRecibidos = payload.recepciones
      .filter(r => Number(r.cantidad_recibida) > 0)
      .map(r => {
        const det = compra.detalle.find(d => d.id_detalle === r.id_detalle);
        const barras = payload.codigos_barras.find(b => b.id_producto === det?.id_producto);
        return {
          nombre: det?.producto || '',
          codigo_barras: barras?.codigo_barras || '',
          copias: 1,
        };
      })
      .filter(p => p.codigo_barras);
    setEtiquetas(productosRecibidos);
    setModalEtiquetas(true);
  } catch (err) {
    setRecError(err.response?.data?.error || 'Error al recibir');
  } finally {
    setRecLoading(false);
  }
};
```

### `ModalEtiquetas` — componente nuevo (mismo archivo)

```jsx
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
    a.download = `etiquetas_${new Date().toISOString().slice(0,10)}.zpl`;
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

### Estado adicional en `CompraDetalle`

```js
const [modalEtiquetas, setModalEtiquetas] = useState(false);
const [etiquetas, setEtiquetas] = useState([]);
const handleCambiarCopias = (idx, val) =>
  setEtiquetas(prev => prev.map((e, i) => i === idx ? { ...e, copias: val } : e));
```

Y en el JSX, junto a los otros modales:
```jsx
{modalEtiquetas && (
  <ModalEtiquetas
    items={etiquetas}
    onChange={handleCambiarCopias}
    onClose={() => setModalEtiquetas(false)}
  />
)}
```

---

## Auto-code Format

- Formato: `BC{id_producto padded a 8 dígitos}`
- Ejemplo: producto con `id_producto = 42` → `BC00000042`
- Compatible con Code 128, único por producto, legible por cualquier lector USB

---

## ZPL Label Spec

| Parámetro | Valor |
|---|---|
| Tamaño | 30mm × 20mm |
| DPI | 203 |
| Ancho en dots | 240 |
| Alto en dots | 160 |
| Barcode | `^BCN` (Code 128, altura 55 dots) |
| Texto nombre | `^A0N,16,16` — máx 22 chars, mayúsculas |
| Copias | 1 por defecto, configurable 1–99 |

---

## Permissions

El permiso `codigo_barras.generar` (id 210, módulo 20) ya existe en la BD. El botón "Recibir mercadería" ya requiere `compras.recibir` — no se añade nueva verificación de permiso para la generación de barras ya que es parte integral del flujo de recepción.

---

## Out of Scope

- Impresión directa vía Zebra BrowserPrint SDK (requiere software adicional del fabricante)
- Vista previa visual de la etiqueta en el navegador
- Edición de etiquetas ya emitidas desde Productos.jsx (se puede agregar después)
- Generación masiva de etiquetas fuera del flujo de compra
