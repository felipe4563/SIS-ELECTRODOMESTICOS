# Barcode Label Print Page — Design Spec

**Date:** 2026-06-02  
**Feature:** Reemplazar el modal de etiquetas ZPL por una página de impresión directa tipo comprobante, usando `window.print()` con barcodes visuales renderizados en el navegador.

---

## Goal

Tras recibir mercadería, el sistema navega a una página de impresión `/compras/:id/etiquetas` donde el usuario ajusta copias por producto y hace clic en "Imprimir" para enviar las etiquetas 30mm×20mm directamente a su impresora térmica conectada al PC.

---

## Architecture

Tres archivos modificados, uno nuevo:

- **Nuevo:** `frontend/src/pages/compras/EtiquetasImprimir.jsx` — página de impresión
- **Modifica:** `frontend/src/App.jsx` — agrega ruta `/compras/:id/etiquetas`
- **Modifica:** `frontend/src/pages/compras/CompraDetalle.jsx` — reemplaza ModalEtiquetas por navigate
- **Dependencia:** `jsbarcode` (npm) — renderiza Code 128 como SVG en navegador

Se eliminan: componente `ModalEtiquetas`, estados `modalEtiquetas`/`etiquetas`, función `handleCambiarCopias` de CompraDetalle.

---

## Data Flow

```
handleRecibir (CompraDetalle, tras éxito)
  └─ navigate(`/compras/${id}/etiquetas`, {
       state: { etiquetas: [{ nombre, codigo_barras, copias: 1 }, ...] }
     })

EtiquetasImprimir
  ├─ useLocation().state?.etiquetas
  ├─ si vacío/null → navigate(-1)
  ├─ estado local: items (array con copias editables)
  ├─ useEffect → JsBarcode.render(svgRef, codigo, options) por cada etiqueta
  ├─ botón "← Volver" → navigate(-1)
  └─ botón "Imprimir" → window.print()
```

No se hacen llamadas al backend desde esta página.

---

## Label Layout (30mm × 20mm)

```
┌────────────────────────┐
│  ▐▌▌▐▐▌▌▐▐▌▌▐▐▌▌▐▐▌▌  │  ← Code 128 SVG (~13mm alto, centrado)
│       BC00000042       │  ← texto del código (incluido por JsBarcode)
│   TELEVISOR SAMSUNG    │  ← nombre producto (máx 20 chars, mayúsculas, 6px)
└────────────────────────┘
```

JsBarcode config:
```js
JsBarcode(svgEl, codigo_barras, {
  format: 'CODE128',
  width: 1.2,
  height: 38,
  displayValue: true,
  fontSize: 7,
  margin: 2,
  textMargin: 1,
})
```

Nombre del producto: `nombre.substring(0, 20).toUpperCase()`, renderizado como `<div>` debajo del SVG.

---

## Print CSS

```css
@media print {
  @page { size: 30mm 20mm; margin: 0; }
  .no-print { display: none !important; }
  .etiqueta {
    page-break-after: always;
    width: 30mm;
    height: 20mm;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1mm;
    box-sizing: border-box;
  }
}
```

---

## Vista en Pantalla (no-print)

- Barra superior fija: "← Volver" | título "Etiquetas de productos" | botón "🖨 Imprimir"
- Cuadrícula de tarjetas: una por producto (sin multiplicar por copias en pantalla)
  - Preview visual del SVG del código de barras
  - Nombre del producto
  - Input numérico "Copias" (min 1, max 99, default 1)
- Al imprimir: se repite el bloque `.etiqueta` N veces según `copias` de cada producto

La repetición por copias se hace generando en el JSX tantos `<div className="etiqueta">` como `item.copias` por cada item — no se usa `@page copies`.

---

## EtiquetasImprimir — Estructura del componente

```jsx
export default function EtiquetasImprimir() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!state?.etiquetas?.length) { navigate(-1); return; }
    setItems(state.etiquetas.map(e => ({ ...e, copias: e.copias ?? 1 })));
  }, []); // eslint-disable-line

  // refs SVG: un ref por item para JsBarcode
  // useEffect que re-renderiza JsBarcode cuando items cambia

  const setCopias = (idx, val) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, copias: Math.max(1, val) } : it));

  return (
    <>
      {/* Barra no-print */}
      {/* Cuadrícula de preview con inputs de copias */}
      {/* Zona de impresión: etiquetas repetidas según copias */}
      <style>{`@media print { ... }`}</style>
    </>
  );
}
```

---

## Ruta en App.jsx

```jsx
<Route path="/compras/:id/etiquetas" element={<EtiquetasImprimir />} />
```

Protegida con el mismo `ProtectedRoute` que usa el resto de compras.

---

## Cambios en CompraDetalle

Eliminar:
- Componente `ModalEtiquetas`
- `useState(false)` para `modalEtiquetas`
- `useState([])` para `etiquetas`
- Función `handleCambiarCopias`
- JSX `{modalEtiquetas && <ModalEtiquetas ... />}`

Modificar en `handleRecibir`, reemplazar:
```js
setEtiquetas(productosRecibidos);
setModalEtiquetas(true);
```
Por:
```js
navigate(`/compras/${id}/etiquetas`, {
  state: { etiquetas: productosRecibidos }
});
```

---

## Out of Scope

- Impresión directa sin diálogo del navegador (requiere driver dedicado)
- Vista previa exacta del resultado impreso en pantalla
- Guardar historial de etiquetas impresas
- Reimprimir etiquetas desde la página de producto (se puede agregar después)
