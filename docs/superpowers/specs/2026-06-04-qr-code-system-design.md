# Sistema de Códigos QR — Especificación de Diseño

**Fecha:** 2026-06-04  
**Estado:** Aprobado

---

## Resumen

Reemplazar el sistema de etiquetas de código de barras por códigos QR que encodifican una URL pública del producto. El sistema tiene tres partes interconectadas:

1. **Etiquetas QR** — Reescribir `EtiquetasImprimir.jsx` para imprimir etiquetas de 40mm×40mm con QR en lugar de códigos CODE128 de 30mm×20mm.
2. **Página pública de producto** — Nueva ruta no autenticada `/p/:codigo` que muestra información segura del producto.
3. **Escáner QR en VentaForm** — Campo de entrada en el formulario de venta que lee la URL de una pistola QR USB y agrega el producto automáticamente.

---

## Parte 1 — Etiquetas QR (EtiquetasImprimir.jsx)

### Qué cambia

- Eliminar dependencia `JsBarcode` completamente.
- Instalar paquete npm `qrcode` en `frontend/`.
- Usar `QRCode.toDataURL(url, options)` (cliente, basado en canvas) para generar imágenes QR.
- Formato de URL del QR: `${import.meta.env.VITE_APP_URL}/p/{codigo_interno}`
- Tamaño de etiqueta: **40mm × 40mm** (antes 30mm × 20mm).
- Agregar `VITE_APP_URL` a `frontend/.env` (valor: `https://megaelectra.rusoft.dev`).

### Layout de la etiqueta (zona de impresión)

```
┌────────────────────────┐  40mm ancho
│                        │
│    ┌──────────────┐    │
│    │   CÓDIGO QR  │    │  ~32mm imagen QR
│    │              │    │
│    └──────────────┘    │
│  Nombre del producto   │  truncado, ~9pt
└────────────────────────┘  40mm alto
```

### Vista previa en pantalla

Cada tarjeta de producto muestra:
- Imagen QR renderizada (`<img src={qrDataUrl} />`)
- Nombre del producto y `codigo_interno`
- Input de copias (sin cambios)

### Flujo de datos

El arreglo `state.etiquetas` ya contiene `codigo_interno`. Cada URL QR se genera con:

```js
import QRCode from 'qrcode';
const url = `${import.meta.env.VITE_APP_URL}/p/${item.codigo_interno}`;
const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 1, errorCorrectionLevel: 'M' });
```

La generación ocurre en un `useEffect` sobre `items`, produciendo un mapa `qrUrls` con clave `codigo_interno`.

---

## Parte 2 — Página Pública de Producto

### Backend

**Nuevo archivo:** `backend/routes/public.Routes.js`  
**Nuevo archivo:** `backend/controllers/public.Controller.js`  
**Montar en `backend/app.js`:** `app.use('/api/public', publicRoutes)` — **sin** `authMiddleware`.

**Endpoint:** `GET /api/public/producto/:codigo`

Consulta SQL (MariaDB):

```sql
SELECT
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
GROUP BY p.id_producto
```

Respuesta:
```json
{
  "codigo_interno": "MEG-001",
  "producto": "Lavadora",
  "imagen_url": "/uploads/...",
  "marca": "Samsung",
  "categoria": "Lavadoras",
  "modelo": "WF45R6100AW",
  "color": "Blanco",
  "capacidad": "20 kg",
  "caracteristicas": "...",
  "detalle": "...",
  "precio_publico": 1850.00,
  "disponibilidad": "Disponible"
}
```

`disponibilidad` se calcula en el servidor:
- `stock_total > 5` → `"Disponible"`
- `stock_total > 0` → `"Stock limitado"`
- `stock_total = 0` → `"Sin stock"`

Si el producto no existe o `activo = 0`: retornar `404 { error: "Producto no encontrado" }`.

**No se expone:** `precio_real`, `precio_mayor`, `costo_*`, `utilidad`, `bono`, `estado`, `stock_minimo`, `stock_maximo`, `id_proveedor_default`, `notas`, `unidades_medida`.

### Frontend

**Archivo ya creado:** `frontend/src/pages/public/ProductoPublico.jsx`

**Ruta:** `/p/:codigo` — agregada en `App.jsx` **fuera** de `ProtectedRoute` y **fuera** de `AppLayout` (sin sidebar, sin autenticación).

```jsx
// En App.jsx, antes del bloque ProtectedRoute:
<Route path="/p/:codigo" element={<ProductoPublico />} />
```

#### Diseño visual implementado

Dirección estética: **catálogo de producto premium**. Diseño mobile-first, autónomo (sin dependencias del sistema de autenticación).

- **Tipografía:** "Lora" (serif, elegante) para nombre del producto. "DM Sans" (geométrica) para detalles y texto.
- **Colores:** Fondo `#f8f7f4` (crema suave), navy `#0f172a`, ámbar `#f59e0b` para accentos, precio en `#b45309`.
- **Layout:** Grid de dos columnas en desktop (380px imagen + info). Una columna en móvil.
- **Barra superior:** Navy oscuro con franja ámbar de 3px en la parte superior. Logo "M" en cuadro ámbar.
- **Panel imagen:** Fondo `#f1f5f9`, imagen con padding, placeholder SVG si no hay imagen o falla la carga.
- **Badge de disponibilidad:** Pastilla con punto pulsante animado (verde/ámbar/rojo según estado).
- **Precio:** Tipografía Lora, color ámbar oscuro, moneda "Bs" como prefijo.
- **Estados:** Loading (skeleton animado), 404 (mensaje amigable), error genérico.
- **Animación de entrada:** `fadeUp` suave (0.5s) en el card.

No muestra: `bono`, `estado`, `unidades_medida`, precios internos, costos.

---

## Parte 3 — Escáner QR en VentaForm

### Cómo funcionan las pistolas QR USB

Una pistola QR USB actúa como teclado: al leer un QR, escribe el texto completo (en este caso una URL como `https://megaelectra.rusoft.dev/p/MEG-001`) seguido de Enter. Todo el texto llega en milisegundos.

### Implementación

Agregar un campo de entrada dedicado para el escáner cerca de la parte superior de la sección de ítems en `VentaForm.jsx`.

```
[🔍 Escanear código QR  ____________________________________]
```

- El input es siempre visible y puede enfocarse manualmente.
- Al `onChange`: iniciar un temporizador de debounce de 300ms.
- Cuando el debounce se dispara: parsear el valor para extraer `codigo_interno`.
  - Si el valor coincide con `{anything}/p/{codigo}` → extraer `codigo`.
  - Si no → tratar el valor como `codigo_interno` directo.
- Buscar el producto en el arreglo `productos` ya cargado.
- Si se encuentra:
  - Si el producto ya está en `items` → incrementar `cantidad` en 1.
  - Si no → agregar nueva fila con el producto seleccionado y `cantidad: 1`.
- Limpiar el input.
- Si el producto no se encuentra: mostrar error inline breve "Producto no encontrado: {codigo}" que desaparece en 3 segundos.

### Casos borde

- Si la lista `productos` no ha cargado cuando se dispara el escaneo: mostrar "Cargando productos…".
- El input del escáner **no** envía el formulario (prevenir default en Enter).
- El temporizador de debounce se reinicia en cada pulsación, evitando disparos prematuros con URLs parciales.

---

## Variables de Entorno

**`frontend/.env`** — agregar:
```
VITE_APP_URL=https://megaelectra.rusoft.dev
```

Usada en: generación de URL del QR en `EtiquetasImprimir.jsx`.

---

## Archivos Creados / Modificados

| Archivo | Acción |
|---|---|
| `frontend/.env` | Agregar `VITE_APP_URL` |
| `frontend/src/pages/compras/EtiquetasImprimir.jsx` | Reescribir: QR codes, 40mm×40mm |
| `frontend/src/pages/public/ProductoPublico.jsx` | **Ya creado** — página pública de producto |
| `frontend/src/App.jsx` | Agregar ruta `/p/:codigo` fuera de ProtectedRoute |
| `backend/routes/public.Routes.js` | Crear: ruta sin autenticación |
| `backend/controllers/public.Controller.js` | Crear: controlador de consulta de producto |
| `backend/app.js` | Montar `/api/public` (sin authMiddleware) |
| `frontend/src/pages/ventas/VentaForm.jsx` | Agregar campo de escáner QR |

**Paquetes:**
- `frontend`: instalar `qrcode` (`npm install qrcode`)

---

## Fuera de Alcance

- Realizar ventas desde la página pública (solo lectura de información).
- Escáner QR por cámara (solo pistola USB).
- Generación de QR en el backend.
- Cambios a los endpoints existentes de código de barras.
