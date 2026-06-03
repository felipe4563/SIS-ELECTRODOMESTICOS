# Barcode Label Print Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el modal de descarga ZPL por una página de impresión directa `/compras/:id/etiquetas` que renderiza barcodes Code 128 visualmente y usa `window.print()` para enviar a la impresora térmica.

**Architecture:** Página nueva `EtiquetasImprimir.jsx` siguiendo el patrón de `VentaImprimir`/`CobroRecibo`. Recibe datos vía React Router `state` (no fetch al backend). JsBarcode genera SVG data-URLs por código, reutilizados en preview de pantalla y en la zona de impresión repetida por copias.

**Tech Stack:** React 18, React Router v6, JsBarcode (npm), Tailwind CSS, `window.print()` + `@media print`

> **IMPORTANTE:** Los commits se hacen manualmente. No ejecutes ningún comando `git commit`.

---

## Archivos

| Acción   | Archivo |
|----------|---------|
| Crear    | `frontend/src/pages/compras/EtiquetasImprimir.jsx` |
| Modificar | `frontend/src/App.jsx` |
| Modificar | `frontend/src/pages/compras/CompraDetalle.jsx` |

---

### Task 1: Instalar JsBarcode y crear EtiquetasImprimir.jsx

**Files:**
- Modify: `frontend/package.json` (vía npm install)
- Create: `frontend/src/pages/compras/EtiquetasImprimir.jsx`

- [ ] **Step 1: Instalar jsbarcode**

Ejecutar desde `frontend/`:
```
npm install jsbarcode
```
Salida esperada: línea con `added 1 package` (o similar). No hay output de error.

- [ ] **Step 2: Verificar instalación**

Verificar que existe `frontend/node_modules/jsbarcode/dist/JsBarcode.all.min.js`. Si no existe, el install falló.

- [ ] **Step 3: Crear EtiquetasImprimir.jsx**

Crear `frontend/src/pages/compras/EtiquetasImprimir.jsx` con el siguiente contenido completo:

```jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';

export default function EtiquetasImprimir() {
  const navigate        = useNavigate();
  const { state }       = useLocation();
  const [items, setItems]             = useState([]);
  const [barcodeUrls, setBarcodeUrls] = useState({});

  useEffect(() => {
    if (!state?.etiquetas?.length) { navigate(-1); return; }
    setItems(state.etiquetas.map(e => ({ ...e, copias: e.copias ?? 1 })));
  }, []); // eslint-disable-line

  useEffect(() => {
    if (items.length === 0) return;
    const urls = {};
    for (const item of items) {
      if (!item.codigo_barras || urls[item.codigo_barras]) continue;
      try {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        JsBarcode(svg, item.codigo_barras, {
          format:       'CODE128',
          width:        1.2,
          height:       38,
          displayValue: true,
          fontSize:     7,
          margin:       2,
          textMargin:   1,
        });
        const svgStr = new XMLSerializer().serializeToString(svg);
        urls[item.codigo_barras] =
          'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
      } catch { /* código inválido — se ignora */ }
    }
    setBarcodeUrls(urls);
  }, [items]);

  const setCopias = (idx, val) =>
    setItems(prev => prev.map((it, i) =>
      i === idx ? { ...it, copias: Math.max(1, Math.min(99, Number(val) || 1)) } : it
    ));

  const printLabels = items.flatMap(item =>
    Array.from({ length: item.copias }, () => item)
  );

  return (
    <>
      {/* ── Barra acciones (solo pantalla) ─────────────────────────────── */}
      <div className="no-print fixed top-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          ← Volver
        </button>
        <span className="font-semibold text-zinc-900 dark:text-white text-sm">
          Etiquetas de productos
        </span>
        <button
          onClick={() => window.print()}
          className="px-4 py-1.5 rounded-xl bg-yellow-400 text-zinc-900 text-sm font-semibold hover:bg-yellow-500 transition-colors"
        >
          🖨 Imprimir
        </button>
      </div>

      {/* ── Vista previa (solo pantalla) ───────────────────────────────── */}
      <div className="no-print pt-16 pb-8 px-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        <div className="max-w-2xl mx-auto space-y-3 pt-4">
          <p className="text-xs text-zinc-500 mb-2">
            Etiquetas 30mm × 20mm — Code 128. Ajusta las copias por producto.
          </p>
          {items.map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-4"
            >
              <div className="shrink-0 bg-white p-1 rounded">
                {barcodeUrls[item.codigo_barras] ? (
                  <img
                    src={barcodeUrls[item.codigo_barras]}
                    alt={item.codigo_barras}
                    className="h-12 w-auto"
                  />
                ) : (
                  <div className="h-12 w-24 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {item.nombre}
                </p>
                <p className="text-xs font-mono text-zinc-500">{item.codigo_barras}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs text-zinc-500">Copias</label>
                <input
                  type="number" min="1" max="99"
                  value={item.copias}
                  onChange={e => setCopias(idx, e.target.value)}
                  className="w-16 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Zona de impresión (solo al imprimir) ───────────────────────── */}
      <div className="print-zone">
        {printLabels.map((item, idx) => (
          <div key={idx} className="etiqueta">
            {barcodeUrls[item.codigo_barras] && (
              <img
                src={barcodeUrls[item.codigo_barras]}
                alt={item.codigo_barras}
                style={{ width: '28mm', height: 'auto', display: 'block' }}
              />
            )}
            <div style={{
              fontSize: '5.5px',
              textAlign: 'center',
              fontFamily: 'monospace',
              marginTop: '0.5mm',
              width: '28mm',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: '#000',
            }}>
              {item.nombre.substring(0, 20).toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* ── CSS de impresión ───────────────────────────────────────────── */}
      <style>{`
        .print-zone { display: none; }
        @media print {
          @page { size: 30mm 20mm; margin: 0; }
          .no-print  { display: none !important; }
          .print-zone { display: block !important; }
          .etiqueta {
            page-break-after: always;
            width: 30mm;
            height: 20mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1mm;
            box-sizing: border-box;
            overflow: hidden;
            background: white;
          }
        }
      `}</style>
    </>
  );
}
```

- [ ] **Step 4: Verificar que el archivo existe**

Leer `frontend/src/pages/compras/EtiquetasImprimir.jsx` y confirmar que tiene al menos 100 líneas y contiene `JsBarcode`, `window.print()`, y `print-zone`.

---

### Task 2: Registrar la ruta en App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

El archivo está en `frontend/src/App.jsx`. La ruta de compras actualmente termina así (líneas ~288–299):

```jsx
{/* Compras */}
<Route path="/compras" element={
  <PageRoute action="ver" subject="compras"><Compras /></PageRoute>
} />
<Route path="/compras/nueva" element={
  <PageRoute action="crear_pre_pedido" subject="compras"><CompraForm /></PageRoute>
} />
<Route path="/compras/:id" element={
  <PageRoute action="ver" subject="compras"><CompraDetalle /></PageRoute>
} />
<Route path="/compras/:id/editar" element={
  <PageRoute action="editar_pre_pedido" subject="compras"><CompraForm /></PageRoute>
} />
```

- [ ] **Step 1: Agregar import de EtiquetasImprimir**

En `frontend/src/App.jsx`, después del bloque de imports de Compras (línea ~54):

```jsx
// Compras
import Compras          from './pages/compras/Compras';
import CompraForm       from './pages/compras/CompraForm';
import CompraDetalle    from './pages/compras/CompraDetalle';
import EtiquetasImprimir from './pages/compras/EtiquetasImprimir';
```

Reemplazar el bloque existente:
```jsx
// Compras
import Compras       from './pages/compras/Compras';
import CompraForm    from './pages/compras/CompraForm';
import CompraDetalle from './pages/compras/CompraDetalle';
```

Por:
```jsx
// Compras
import Compras           from './pages/compras/Compras';
import CompraForm        from './pages/compras/CompraForm';
import CompraDetalle     from './pages/compras/CompraDetalle';
import EtiquetasImprimir from './pages/compras/EtiquetasImprimir';
```

- [ ] **Step 2: Agregar la ruta `/compras/:id/etiquetas`**

Después de la ruta `/compras/:id/editar` (buscar ese bloque exacto):

```jsx
<Route path="/compras/:id/editar" element={
  <PageRoute action="editar_pre_pedido" subject="compras"><CompraForm /></PageRoute>
} />
```

Reemplazar por:
```jsx
<Route path="/compras/:id/editar" element={
  <PageRoute action="editar_pre_pedido" subject="compras"><CompraForm /></PageRoute>
} />
<Route path="/compras/:id/etiquetas" element={
  <PageRoute action="ver" subject="compras"><EtiquetasImprimir /></PageRoute>
} />
```

- [ ] **Step 3: Verificar el archivo**

Leer `frontend/src/App.jsx` y confirmar que contiene `EtiquetasImprimir` tanto en el import como en la Route.

---

### Task 3: Actualizar CompraDetalle.jsx

**Files:**
- Modify: `frontend/src/pages/compras/CompraDetalle.jsx`

El archivo actual tiene:
- `ModalEtiquetas` componente en líneas ~194–256
- Estados `modalEtiquetas` y `etiquetas` en líneas ~364–365
- `handleCambiarCopias` función en líneas ~428–429
- `handleRecibir` que llama `setModalEtiquetas(true)` en líneas ~398–426
- JSX `{modalEtiquetas && <ModalEtiquetas .../>}` en líneas ~496–502

- [ ] **Step 1: Agregar `useNavigate` al destructuring (ya importado, verificar)**

En línea 2 el import ya tiene `useNavigate`:
```jsx
import { useNavigate, useParams } from 'react-router-dom';
```
No se necesita cambio aquí.

- [ ] **Step 2: Eliminar el componente ModalEtiquetas completo**

Eliminar el bloque completo (desde el comentario hasta el cierre de la función):

```jsx
// ── Modal Etiquetas ───────────────────────────────────────────────────────────
function ModalEtiquetas({ items, onChange, onClose }) {
  const generarZPL = () => {
    if (items.length === 0) return;
    let zpl = '';
    for (const item of items) {
      const nombre = (item.nombre || '').substring(0, 22).toUpperCase();
      const copias = Math.max(1, Number(item.copias) || 1);
      const safeCodigo = (item.codigo_barras || '').replace(/\^/g, '');
      if (!safeCodigo) continue;
      for (let i = 0; i < copias; i++) {
        zpl += `^XA\n^PW240\n^LL160\n`;
        zpl += `^FO15,8^BCN,55,Y,N,N^FD${safeCodigo}^FS\n`;
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

Reemplazar todo ese bloque por nada (eliminarlo completamente).

- [ ] **Step 3: Eliminar estados modalEtiquetas y etiquetas**

Buscar en la función `CompraDetalle`:
```jsx
  const [modalEtiquetas, setModalEtiquetas] = useState(false);
  const [etiquetas,      setEtiquetas]      = useState([]);
```
Eliminar esas dos líneas.

- [ ] **Step 4: Reemplazar handleRecibir para usar navigate**

Buscar el `handleRecibir` actual:
```jsx
  const handleRecibir = async (payload) => {
    setSaving(true);
    setModalErr('');
    try {
      await comprasService.recibir(id, payload);
      setModal(null);
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
      cargar();
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
```

Reemplazar por:
```jsx
  const handleRecibir = async (payload) => {
    setSaving(true);
    setModalErr('');
    try {
      await comprasService.recibir(id, payload);
      setModal(null);
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
      cargar();
      if (productosRecibidos.length > 0) {
        navigate(`/compras/${id}/etiquetas`, { state: { etiquetas: productosRecibidos } });
      }
    } catch (e) {
      setModalErr(e?.response?.data?.error ?? 'Error al recibir mercadería');
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 5: Eliminar handleCambiarCopias**

Buscar y eliminar:
```jsx
  const handleCambiarCopias = (idx, val) =>
    setEtiquetas(prev => prev.map((e, i) => i === idx ? { ...e, copias: val } : e));
```

- [ ] **Step 6: Eliminar el JSX de ModalEtiquetas**

Buscar en el bloque de modales:
```jsx
      {modalEtiquetas && (
        <ModalEtiquetas
          items={etiquetas}
          onChange={handleCambiarCopias}
          onClose={() => setModalEtiquetas(false)}
        />
      )}
```

Eliminar ese bloque.

- [ ] **Step 7: Verificar el archivo resultante**

Leer `frontend/src/pages/compras/CompraDetalle.jsx` y confirmar:
- No contiene `ModalEtiquetas`, `modalEtiquetas`, `etiquetas`, `handleCambiarCopias`, ni `generarZPL`
- Contiene `navigate(\`/compras/${id}/etiquetas\``
- El archivo compila sin referencias a variables eliminadas

---

### Task 4: Verificación final en navegador

**Files:** ninguno (solo prueba manual)

- [ ] **Step 1: Iniciar el servidor de desarrollo**

Desde `frontend/`:
```
npm run dev
```
Verificar que no hay errores de compilación (TypeScript/Vite). Si hay error de import o variable no definida, corregirlo en el archivo correspondiente.

- [ ] **Step 2: Navegar a una compra en estado POR_LLEGAR o PARCIAL**

Abrir `http://localhost:5173/compras` (o el puerto que use Vite), encontrar una compra en estado POR_LLEGAR o PARCIAL, hacer clic para abrir el detalle.

- [ ] **Step 3: Abrir modal Recibir mercadería**

Hacer clic en "Recibir mercadería". Verificar que el modal se abre y muestra los campos de código de barras (existente como badge azul, o editable si es auto-generado).

- [ ] **Step 4: Confirmar recepción**

Confirmar la recepción. Verificar que el navegador navega a `/compras/:id/etiquetas`.

- [ ] **Step 5: Verificar la página de etiquetas**

En la página `/compras/:id/etiquetas`:
- Se ven los barcodes Code 128 renderizados visualmente (imágenes SVG)
- Se ve el nombre del producto debajo de cada barcode
- Hay inputs de "Copias" por producto
- Hay botones "← Volver" e "🖨 Imprimir"

- [ ] **Step 6: Probar el botón Volver**

Clic en "← Volver" — debe regresar al detalle de la compra.

- [ ] **Step 7: Navegar directo a /compras/1/etiquetas sin state**

Abrir directamente `http://localhost:5173/compras/1/etiquetas` en una nueva pestaña. Debe redirigir automáticamente (`navigate(-1)` o al inicio).

- [ ] **Step 8: Probar impresión (opcional si hay impresora configurada)**

Clic en "🖨 Imprimir". Debe abrir el diálogo del navegador. En la vista previa de impresión, verificar que solo aparecen las etiquetas (sin la barra de acciones ni la cuadrícula de preview).
