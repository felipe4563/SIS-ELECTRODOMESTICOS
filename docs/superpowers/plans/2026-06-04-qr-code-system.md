# Sistema de Códigos QR — Plan de Implementación

> **Para trabajadores agentes:** SUB-SKILL REQUERIDO: Usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Objetivo:** Reemplazar códigos de barras CODE128 por códigos QR con URL pública, agregar página pública de producto sin login y escáner QR en el formulario de ventas.

**Arquitectura:** Backend Express agrega ruta pública `/api/public/producto/:codigo` sin authMiddleware. Frontend React agrega ruta standalone `/p/:codigo` fuera de ProtectedRoute. Las etiquetas generan QR con URL `${VITE_APP_URL}/p/{codigo_interno}`. VentaForm detecta URLs de QR escaneadas por pistola USB con debounce 300ms.

**Tech Stack:** Node.js/Express + MariaDB (backend), React + React Router v6 + Tailwind CSS (frontend), librería `qrcode` npm (generación QR cliente), `axios` plano sin interceptor de auth (página pública).

**Nota:** `frontend/src/pages/public/ProductoPublico.jsx` **ya está creado**. No modificar ese archivo en este plan.

---

## Estructura de archivos

| Archivo | Acción |
|---|---|
| `frontend/.env` | Modificar — agregar `VITE_APP_URL` |
| `backend/controllers/public.Controller.js` | Crear |
| `backend/routes/public.Routes.js` | Crear |
| `backend/app.js` | Modificar — montar ruta pública |
| `frontend/src/App.jsx` | Modificar — agregar ruta `/p/:codigo` |
| `frontend/src/pages/compras/EtiquetasImprimir.jsx` | Reescribir — QR 40mm×40mm |
| `frontend/src/pages/ventas/VentaForm.jsx` | Modificar — agregar escáner QR |

---

## Tarea 1: Instalar dependencia y configurar variable de entorno

**Archivos:**
- Modificar: `frontend/.env`

- [ ] **Paso 1: Instalar `qrcode` en el frontend**

```bash
cd frontend && npm install qrcode
```

Salida esperada: `added 1 package` (o similar, sin errores).

- [ ] **Paso 2: Verificar que instaló correctamente**

```bash
cd frontend && node -e "require('qrcode'); console.log('OK')"
```

Salida esperada: `OK`

- [ ] **Paso 3: Agregar `VITE_APP_URL` a `frontend/.env`**

El archivo actual contiene:
```
VITE_API_URL=http://localhost:3000/api
```

Agregar al final:
```
VITE_APP_URL=https://megaelectra.rusoft.dev
```

Resultado final del archivo:
```
VITE_API_URL=http://localhost:3000/api
VITE_APP_URL=https://megaelectra.rusoft.dev
```

- [ ] **Paso 4: Verificar en el servidor de desarrollo que la variable está disponible**

Con el servidor Vite corriendo (`npm run dev` en `frontend/`), abrir consola del navegador y ejecutar:
```js
import.meta.env.VITE_APP_URL
```
Salida esperada: `"https://megaelectra.rusoft.dev"`

---

## Tarea 2: Backend — controlador público de producto

**Archivos:**
- Crear: `backend/controllers/public.Controller.js`

- [ ] **Paso 1: Crear el archivo del controlador**

Crear `backend/controllers/public.Controller.js` con el contenido:

```js
const db = require('../config/db');

exports.getProductoPorCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;

    const [[producto]] = await db.promise().query(
      `SELECT
         p.codigo_interno,
         p.producto,
         p.imagen_url,
         p.modelo,
         p.color,
         p.capacidad,
         p.caracteristicas,
         p.detalle,
         p.precio_publico,
         m.nombre  AS marca,
         c.nombre  AS categoria,
         COALESCE(SUM(s.cantidad), 0) AS stock_total
       FROM productos p
       LEFT JOIN marcas      m ON m.id_marca     = p.id_marca
       LEFT JOIN categorias  c ON c.id_categoria = p.id_categoria
       LEFT JOIN stock       s ON s.id_producto  = p.id_producto
       WHERE p.codigo_interno = ? AND p.activo = 1
       GROUP BY p.id_producto`,
      [codigo]
    );

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const stockTotal = Number(producto.stock_total);
    let disponibilidad;
    if (stockTotal > 5)      disponibilidad = 'Disponible';
    else if (stockTotal > 0) disponibilidad = 'Stock limitado';
    else                     disponibilidad = 'Sin stock';

    const { stock_total, ...datos } = producto;
    res.json({ ...datos, disponibilidad });
  } catch (err) {
    console.error('[public] Error al obtener producto:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
```

- [ ] **Paso 2: Verificar que el archivo fue creado**

```bash
ls backend/controllers/public.Controller.js
```

Salida esperada: el archivo existe (no hay error "No such file").

---

## Tarea 3: Backend — ruta pública y montaje en app.js

**Archivos:**
- Crear: `backend/routes/public.Routes.js`
- Modificar: `backend/app.js` (líneas 7-36 import section, línea 54+ mount section)

- [ ] **Paso 1: Crear el archivo de rutas públicas**

Crear `backend/routes/public.Routes.js`:

```js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/public.Controller');

router.get('/producto/:codigo', ctrl.getProductoPorCodigo);

module.exports = router;
```

- [ ] **Paso 2: Agregar el import de publicRoutes en `backend/app.js`**

Buscar la línea:
```js
const herramientasRoutes  = require('./routes/herramientas.Routes');
```

Agregar inmediatamente después:
```js
const publicRoutes        = require('./routes/public.Routes');
```

- [ ] **Paso 3: Montar la ruta pública en `backend/app.js`**

Buscar la línea:
```js
app.use('/api/herramientas',  herramientasRoutes);
```

Agregar inmediatamente después — **sin** authMiddleware:
```js
app.use('/api/public',        publicRoutes);
```

- [ ] **Paso 4: Verificar que el endpoint responde**

Con el servidor backend corriendo (`node backend/app.js` o `npm run dev` en `backend/`), usar curl o el navegador:

```bash
curl http://localhost:3000/api/public/producto/CODIGO-VALIDO
```

Reemplazar `CODIGO-VALIDO` por un `codigo_interno` real de la BD.

Salida esperada (ejemplo):
```json
{
  "codigo_interno": "MEG-001",
  "producto": "Lavadora Samsung",
  "imagen_url": "/uploads/...",
  "marca": "Samsung",
  "categoria": "Lavadoras",
  "modelo": "WF45",
  "color": "Blanco",
  "capacidad": "20 kg",
  "caracteristicas": "...",
  "detalle": "...",
  "precio_publico": 1850,
  "disponibilidad": "Disponible"
}
```

Si el código no existe:
```bash
curl http://localhost:3000/api/public/producto/INEXISTENTE
```
Salida esperada: `{"error":"Producto no encontrado"}` con status 404.

---

## Tarea 4: Frontend — registrar ruta pública en App.jsx

**Archivos:**
- Modificar: `frontend/src/App.jsx`

- [ ] **Paso 1: Agregar el import de `ProductoPublico` en `App.jsx`**

Buscar la sección de rutas públicas (alrededor de la línea 9):
```js
// ── Páginas públicas ─────────────────────────────────────────────────────
import Login              from './pages/Login';
import SinPermiso         from './pages/SinPermiso';
import CambiarContrasena  from './pages/CambiarContrasena';
import SelectorSucursal   from './pages/SelectorSucursal';
```

Agregar al final de ese bloque:
```js
import ProductoPublico    from './pages/public/ProductoPublico';
```

- [ ] **Paso 2: Agregar la ruta `/p/:codigo` en el bloque de rutas públicas**

Buscar:
```jsx
{/* Rutas públicas */}
<Route path="/login"       element={<Login />} />
<Route path="/sin-permiso" element={<SinPermiso />} />
```

Agregar inmediatamente después:
```jsx
{/* Producto público — sin login */}
<Route path="/p/:codigo" element={<ProductoPublico />} />
```

Resultado:
```jsx
{/* Rutas públicas */}
<Route path="/login"       element={<Login />} />
<Route path="/sin-permiso" element={<SinPermiso />} />

{/* Producto público — sin login */}
<Route path="/p/:codigo" element={<ProductoPublico />} />
```

- [ ] **Paso 3: Verificar la ruta en el navegador**

Con el frontend corriendo (`npm run dev` en `frontend/`), navegar a:
```
http://localhost:5173/p/CODIGO-VALIDO
```

Verificar:
- La página carga sin redirigir al login.
- Se muestra la información del producto (nombre, precio, imagen si existe, badge de disponibilidad).
- No hay sidebar ni navegación del sistema.

Navegar también a:
```
http://localhost:5173/p/INEXISTENTE
```

Verificar: aparece el mensaje "Producto no encontrado" con ícono 🔍.

---

## Tarea 5: Reescribir EtiquetasImprimir.jsx con códigos QR

**Archivos:**
- Reescribir: `frontend/src/pages/compras/EtiquetasImprimir.jsx`

El archivo actual usa `JsBarcode` con etiquetas 30mm×20mm. Se reescribe completamente para usar `qrcode` con etiquetas 40mm×40mm.

- [ ] **Paso 1: Reemplazar el contenido completo del archivo**

Escribir `frontend/src/pages/compras/EtiquetasImprimir.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://megaelectra.rusoft.dev';

export default function EtiquetasImprimir() {
  const navigate     = useNavigate();
  const { state }    = useLocation();
  const [items, setItems]   = useState([]);
  const [qrUrls, setQrUrls] = useState({});

  useEffect(() => {
    if (!state?.etiquetas?.length) { navigate(-1); return; }
    setItems(state.etiquetas.map(e => ({ ...e, copias: e.copias ?? 1 })));
  }, []); // eslint-disable-line

  useEffect(() => {
    if (items.length === 0) return;
    const generar = async () => {
      const urls = {};
      for (const item of items) {
        if (!item.codigo_interno || urls[item.codigo_interno]) continue;
        try {
          urls[item.codigo_interno] = await QRCode.toDataURL(
            `${APP_URL}/p/${item.codigo_interno}`,
            { width: 320, margin: 1, errorCorrectionLevel: 'M' }
          );
        } catch { /* código inválido — se ignora */ }
      }
      setQrUrls(urls);
    };
    generar();
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
          Etiquetas QR de productos
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
            Etiquetas 40mm × 40mm — Código QR con enlace al producto. Ajusta las copias por producto.
          </p>
          {items.map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-4"
            >
              <div className="shrink-0 bg-white p-1 rounded">
                {qrUrls[item.codigo_interno] ? (
                  <img
                    src={qrUrls[item.codigo_interno]}
                    alt={item.codigo_interno}
                    className="w-16 h-16"
                  />
                ) : (
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {item.nombre}
                </p>
                <p className="text-xs font-mono text-zinc-500">{item.codigo_interno}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                  {APP_URL}/p/{item.codigo_interno}
                </p>
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
          <div key={`${item.codigo_interno ?? ''}-${idx}`} className="etiqueta">
            {qrUrls[item.codigo_interno] && (
              <img
                src={qrUrls[item.codigo_interno]}
                alt={item.codigo_interno}
                style={{ width: '34mm', height: '34mm', display: 'block' }}
              />
            )}
            <p style={{
              fontSize: '7pt',
              textAlign: 'center',
              margin: '1mm 0 0 0',
              maxWidth: '38mm',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              fontFamily: 'sans-serif',
            }}>
              {item.nombre}
            </p>
          </div>
        ))}
      </div>

      {/* ── CSS de impresión ───────────────────────────────────────────── */}
      <style>{`
        .print-zone { display: none; }
        .etiqueta:last-child { page-break-after: avoid; }
        @media print {
          @page { size: 40mm 40mm; margin: 0; }
          .no-print  { display: none !important; }
          .print-zone { display: block !important; }
          .etiqueta {
            page-break-after: always;
            width: 40mm;
            height: 40mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2mm;
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

- [ ] **Paso 2: Verificar que el componente compila sin errores**

Con el servidor Vite corriendo, verificar en la consola que no hay errores de compilación relacionados con `EtiquetasImprimir.jsx`.

- [ ] **Paso 3: Verificar que la pantalla de etiquetas funciona**

Ir a cualquier compra o producto que tenga acceso a "Imprimir etiquetas". Verificar:
- Las tarjetas de vista previa muestran un QR cuadrado (no un código de barras).
- El QR es legible (escanearlo con el teléfono debería mostrar la URL del producto).
- El texto debajo del QR muestra la URL en pequeño.
- El input de copias sigue funcionando.
- El botón "Imprimir" abre el diálogo de impresión.

---

## Tarea 6: Agregar escáner QR en VentaForm.jsx

**Archivos:**
- Modificar: `frontend/src/pages/ventas/VentaForm.jsx`

- [ ] **Paso 1: Agregar `useRef` a los imports de React**

Buscar la línea:
```js
import { useState, useEffect, useCallback } from 'react';
```

Reemplazar por:
```js
import { useState, useEffect, useCallback, useRef } from 'react';
```

- [ ] **Paso 2: Agregar estado y ref del escáner en `VentaForm`**

Dentro de `export default function VentaForm()`, buscar el bloque de estados que comienza con:
```js
// Modal producto rápido
const [modalRapido, setModalRapido] = useState(false);
```

Agregar antes de ese bloque:
```js
// Escáner QR
const [qrInput, setQrInput] = useState('');
const [qrError, setQrError] = useState('');
const qrTimerRef = useRef(null);
```

- [ ] **Paso 3: Agregar la función `handleQrScan`**

Buscar la línea:
```js
const addItem    = () => setItems(p => [...p, { id_producto: '', cantidad: 1, precio_unitario: 0, descuento_porc: 0 }]);
```

Agregar inmediatamente antes de esa línea:
```js
const handleQrScan = (val) => {
  clearTimeout(qrTimerRef.current);
  qrTimerRef.current = setTimeout(() => {
    const trimmed = val.trim();
    if (!trimmed) return;

    const match   = trimmed.match(/\/p\/([^/?#\s]+)$/);
    const codigo  = match ? decodeURIComponent(match[1]) : trimmed;

    const prod = productos.find(p => p.codigo_interno === codigo);
    if (!prod) {
      setQrError(`No encontrado: ${codigo}`);
      setTimeout(() => setQrError(''), 3000);
      setQrInput('');
      return;
    }

    const precio = form.tipo_venta === 'MAYOR'
      ? (prod.precio_mayor ?? 0)
      : (prod.precio_publico ?? 0);

    setItems(prev => {
      const idx = prev.findIndex(it => String(it.id_producto) === String(prod.id_producto));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      return [...prev, {
        id_producto:     String(prod.id_producto),
        cantidad:        1,
        precio_unitario: precio,
        descuento_porc:  0,
      }];
    });
    setQrInput('');
    setQrError('');
  }, 300);
};
```

- [ ] **Paso 4: Agregar el campo de escáner en el JSX**

Buscar (alrededor de la línea 561):
```jsx
          <button onClick={addItem}
            className="text-xs px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold transition-colors">
            + Agregar fila
          </button>
        </div>
        <div className="overflow-x-auto">
```

Agregar entre el `</div>` del header y el `<div className="overflow-x-auto">`:
```jsx
        {/* Escáner QR */}
        <div className="px-5 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-800/20 flex items-center gap-3">
          <span className="text-xs text-zinc-400 flex-shrink-0 select-none">🔍 QR</span>
          <input
            type="text"
            value={qrInput}
            onChange={e => { setQrInput(e.target.value); handleQrScan(e.target.value); }}
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
            placeholder="Escanee un código QR con la pistola…"
            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
          {qrError && (
            <span className="text-xs text-red-500 flex-shrink-0">{qrError}</span>
          )}
        </div>
```

- [ ] **Paso 5: Verificar en el navegador**

Ir a `/ventas/nueva`. Verificar:
- Aparece la franja del escáner QR debajo de los botones "Agregar fila" / "Limpiar".
- Al escribir manualmente un `codigo_interno` válido en el campo y esperar 300ms, el producto se agrega a la tabla de ítems.
- Al escribir una URL completa (ej: `https://megaelectra.rusoft.dev/p/MEG-001`) y esperar 300ms, extrae el código y agrega el producto.
- Si el código no existe, aparece el error en rojo que desaparece en 3 segundos.
- Si el producto ya está en la lista, incrementa la cantidad en 1 en lugar de agregar una fila nueva.
- La tecla Enter no envía el formulario al escribir en el campo QR.

---

## Verificación final del sistema completo

- [ ] **Verificar flujo completo de etiquetas → escaneo → venta**

1. Ir a Herramientas → Etiquetas (o desde una compra).
2. Verificar que las etiquetas muestran QR en lugar de código de barras.
3. Escanear el QR con el teléfono: debe abrir `https://megaelectra.rusoft.dev/p/{codigo}`.
4. La página pública debe cargar con el diseño premium (sin sidebar, con imagen, precio, badge de disponibilidad).
5. Con la pistola QR USB: abrir VentaForm, enfocar el campo escáner, escanear una etiqueta.
6. Verificar que el producto se agrega automáticamente a la lista de ítems de la venta.
7. Escanear el mismo producto nuevamente: verificar que la cantidad aumenta a 2 (no se crea fila duplicada).
