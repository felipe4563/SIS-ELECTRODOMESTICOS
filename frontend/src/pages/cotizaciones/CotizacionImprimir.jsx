import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cotizacionesService } from '../../services/cotizaciones.service';
import { useEmpresa } from '../../contexts/EmpresaContext';

/* ─── Helpers (mismos que CotizacionPDF.jsx) ─────────────────────────────── */
const fmt   = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fecha = s => s ? new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const ESTADO_COLOR = {
  APROBADA:   { bg: '#dcfce7', fg: '#15803d' },
  EMITIDA:    { bg: '#dbeafe', fg: '#1d4ed8' },
  VENCIDA:    { bg: '#ffedd5', fg: '#c2410c' },
  RECHAZADA:  { bg: '#fee2e2', fg: '#b91c1c' },
  CONVERTIDA: { bg: '#f5f3ff', fg: '#6d28d9' },
  BORRADOR:   { bg: '#f3f4f6', fg: '#6b7280' },
};

const PRODUCTOS_POR_HOJA_A4 = 8;
const chunkArray = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out.length ? out : [[]];
};
const sumarSubtotalesCot = detalle => (detalle ?? []).reduce((s, d) => s + Number(d.subtotal ?? 0), 0);

/* ─── Documento (mismo layout que CotizacionPDF.jsx, en HTML) ────────────────
   Si hay muchos productos, se pagina en hojas de PRODUCTOS_POR_HOJA_A4 ítems;
   cada hoja repite la cabecera completa (mismo número de cotización) — una
   sola copia por hoja, sin doble copia. */
function CotizacionDoc({ cotizacion: c, empresa: e, logoUrl }) {
  const clienteNombre = c.cliente_razon || `${c.cliente_nombres ?? ''} ${c.cliente_apellidos ?? ''}`.trim();
  const est = ESTADO_COLOR[c.estado] ?? ESTADO_COLOR.BORRADOR;
  const paginas = chunkArray(c.detalle ?? [], PRODUCTOS_POR_HOJA_A4);

  return (
    <div id="documento" style={{ width: '210mm', background: '#fff' }}>
      {paginas.map((detalleHoja, i) => (
        <div key={i} style={{ pageBreakAfter: i < paginas.length - 1 ? 'always' : 'auto' }}>
          <CotizacionHoja
            c={c} e={e} logoUrl={logoUrl}
            clienteNombre={clienteNombre} est={est}
            detalleHoja={detalleHoja} pagina={i + 1} totalPaginas={paginas.length}
          />
        </div>
      ))}
    </div>
  );
}

function CotizacionHoja({ c, e, logoUrl, clienteNombre, est, detalleHoja, pagina, totalPaginas }) {
  return (
    <div style={{ minHeight: '297mm', color: '#111827', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '10px', padding: '15mm', boxSizing: 'border-box' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #facc15', paddingBottom: '12px', marginBottom: '16px' }}>
        <div>
          {logoUrl && logoUrl !== '/logo.png' && (
            <img src={logoUrl} alt="Logo" style={{ width: '60px', height: '40px', objectFit: 'contain', marginBottom: '4px' }} />
          )}
          <div style={{ fontSize: '14px', fontFamily: 'Helvetica-Bold, Arial, sans-serif', fontWeight: 'bold', color: '#111827', marginBottom: '2px' }}>
            {e?.nombre_comercial || e?.razon_social}
          </div>
          {e?.direccion && <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '1px' }}>{e.direccion}</div>}
          {e?.telefono  && <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '1px' }}>Tel: {e.telefono}</div>}
          {e?.nit       && <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '1px' }}>NIT: {e.nit}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ backgroundColor: '#facc15', color: '#1c1917', fontSize: '8px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
            COTIZACIÓN
          </span>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px', marginBottom: '2px' }}>{c.numero}</div>
          <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '1px' }}>Fecha: {fecha(c.fecha)}</div>
          {totalPaginas > 1 && <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '1px' }}>Página: {pagina} de {totalPaginas}</div>}
          {c.fecha_vencimiento && <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '1px' }}>Válida hasta: {fecha(c.fecha_vencimiento)}</div>}
          <span style={{ fontSize: '8px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px', marginTop: '3px', backgroundColor: est.bg, color: est.fg }}>
            {c.estado}
          </span>
        </div>
      </div>

      {/* Cliente / Sucursal */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Cliente</div>
          <div style={{ fontWeight: 'bold', fontSize: '9px', color: '#111827', marginBottom: '1px' }}>{clienteNombre}</div>
          {c.cliente_documento && <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>{c.tipo_documento}: {c.cliente_documento}</div>}
          {c.cliente_telefono  && <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>Tel: {c.cliente_telefono}</div>}
          {c.cliente_email     && <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>{c.cliente_email}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Sucursal</div>
          <div style={{ fontWeight: 'bold', fontSize: '9px', color: '#111827', marginBottom: '1px' }}>{c.sucursal_nombre}</div>
          {c.sucursal_direccion && <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>{c.sucursal_direccion}</div>}
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '6px', marginBottom: '3px' }}>Atendido por</div>
          <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>{c.vendedor_nombre}</div>
          <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>Pago: {c.tipo_cotizacion === 'CREDITO' ? 'Crédito' : 'Contado'}</div>
        </div>
      </div>

      {/* Tabla */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
            <th style={{ width: '22px', textAlign: 'left', fontSize: '8px', fontWeight: 'bold', color: '#4b5563', padding: '5px 6px' }}>#</th>
            <th style={{ textAlign: 'left', fontSize: '8px', fontWeight: 'bold', color: '#4b5563', padding: '5px 6px' }}>Producto</th>
            <th style={{ width: '60px', textAlign: 'right', fontSize: '8px', fontWeight: 'bold', color: '#4b5563', padding: '5px 6px' }}>Cant.</th>
            <th style={{ width: '72px', textAlign: 'right', fontSize: '8px', fontWeight: 'bold', color: '#4b5563', padding: '5px 6px' }}>Precio unit.</th>
            <th style={{ width: '44px', textAlign: 'right', fontSize: '8px', fontWeight: 'bold', color: '#4b5563', padding: '5px 6px' }}>Desc %</th>
            <th style={{ width: '72px', textAlign: 'right', fontSize: '8px', fontWeight: 'bold', color: '#4b5563', padding: '5px 6px' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {detalleHoja.map((d, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ fontSize: '8px', color: '#9ca3af', padding: '5px 6px', verticalAlign: 'top' }}>{(pagina - 1) * PRODUCTOS_POR_HOJA_A4 + i + 1}</td>
              <td style={{ padding: '5px 6px', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 'bold', fontSize: '8px', color: '#111827' }}>{d.producto}</div>
                {d.codigo_interno && <div style={{ fontSize: '7px', color: '#9ca3af', marginTop: '1px' }}>{d.codigo_interno}</div>}
                {d.producto_detalle && <div style={{ fontSize: '7px', color: '#6b7280', marginTop: '1px' }}>{d.producto_detalle}</div>}
                {d.marca     && <div style={{ fontSize: '7px', color: '#6b7280', marginTop: '1px' }}><span style={{ fontWeight: 'bold', color: '#9ca3af' }}>Marca: </span>{d.marca}</div>}
                {d.modelo    && <div style={{ fontSize: '7px', color: '#6b7280', marginTop: '1px' }}><span style={{ fontWeight: 'bold', color: '#9ca3af' }}>Modelo: </span>{d.modelo}</div>}
                {d.color     && <div style={{ fontSize: '7px', color: '#6b7280', marginTop: '1px' }}><span style={{ fontWeight: 'bold', color: '#9ca3af' }}>Color: </span>{d.color}</div>}
                {d.capacidad && <div style={{ fontSize: '7px', color: '#6b7280', marginTop: '1px' }}><span style={{ fontWeight: 'bold', color: '#9ca3af' }}>Capacidad: </span>{d.capacidad}</div>}
                {d.garantia_anos && <div style={{ fontSize: '7px', color: '#6b7280', marginTop: '1px' }}><span style={{ fontWeight: 'bold', color: '#9ca3af' }}>Garantía: </span>{d.garantia_anos} año{d.garantia_anos > 1 ? 's' : ''}</div>}
              </td>
              <td style={{ fontSize: '8px', color: '#374151', padding: '5px 6px', textAlign: 'right', verticalAlign: 'top' }}>{fmt(d.cantidad)} {d.unidad_nombre}</td>
              <td style={{ fontSize: '8px', color: '#374151', padding: '5px 6px', textAlign: 'right', verticalAlign: 'top' }}>Bs {fmt(d.precio_unitario)}</td>
              <td style={{ fontSize: '8px', color: '#374151', padding: '5px 6px', textAlign: 'right', verticalAlign: 'top' }}>
                {Number(d.descuento_porc) > 0 ? `${d.descuento_porc}%` : '—'}
              </td>
              <td style={{ fontSize: '8px', color: '#374151', fontWeight: 'bold', padding: '5px 6px', textAlign: 'right', verticalAlign: 'top' }}>Bs {fmt(d.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', marginBottom: '14px' }}>
        <div style={{ width: '200px' }}>
          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ fontSize: '8px', color: '#4b5563' }}>Subtotal (esta hoja):</span>
              <span style={{ fontSize: '8px', color: '#374151' }}>Bs {fmt(sumarSubtotalesCot(detalleHoja))}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ fontSize: '8px', color: '#4b5563' }}>{totalPaginas > 1 ? 'Subtotal (total):' : 'Subtotal:'}</span>
            <span style={{ fontSize: '8px', color: '#374151' }}>Bs {fmt(c.subtotal)}</span>
          </div>
          {Number(c.descuento_porc) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ fontSize: '8px', color: '#4b5563' }}>Descuento ({c.descuento_porc}%):</span>
              <span style={{ fontSize: '8px', color: '#ef4444' }}>-Bs {fmt(c.descuento_monto)}</span>
            </div>
          )}
          {Number(c.impuesto) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ fontSize: '8px', color: '#4b5563' }}>Impuesto:</span>
              <span style={{ fontSize: '8px', color: '#374151' }}>Bs {fmt(c.impuesto)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #111827', paddingTop: '5px', marginTop: '3px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#111827' }}>TOTAL:</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#111827' }}>Bs {fmt(c.total)}</span>
          </div>
        </div>
      </div>

      {/* Observaciones */}
      {c.observaciones && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '8px', marginBottom: '14px' }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Observaciones / Condiciones</div>
          <div style={{ fontSize: '8px', color: '#374151', marginTop: '2px' }}>{c.observaciones}</div>
        </div>
      )}

      {/* Pie */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '7px', color: '#9ca3af', marginTop: '1px' }}>
          Esta cotización es válida hasta {c.fecha_vencimiento ? fecha(c.fecha_vencimiento) : 'la fecha indicada'}.
          Precios sujetos a disponibilidad de stock.
        </div>
        <div style={{ fontSize: '7px', color: '#9ca3af', marginTop: '1px' }}>{e?.razon_social} · {e?.telefono}</div>
      </div>

    </div>
  );
}

/* ─── Página principal ────────────────────────────────────────────────────── */
export default function CotizacionImprimir() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [data,      setData]     = useState(null);
  const [cargando,  setCargando] = useState(true);
  const { logoUrl } = useEmpresa() ?? {};

  useEffect(() => {
    cotizacionesService.getPDF(id)
      .then(r => setData(r.data))
      .catch(() => navigate(`/cotizaciones/${id}`))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!data)    return null;

  const { cotizacion: c, empresa: e } = data;

  return (
    <>
      {/* Barra de acciones */}
      <div className="no-print flex flex-wrap items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <button
          onClick={() => window.print()}
          className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={() => navigate(`/cotizaciones/${id}`)}
          className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
        >
          ← Volver
        </button>
      </div>

      {/* Preview del documento */}
      <div className="flex justify-center p-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        <CotizacionDoc cotizacion={c} empresa={e} logoUrl={logoUrl} />
      </div>

      {/* CSS de impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          #documento, #documento * { visibility: visible !important; }
          html, body, #root {
            height: auto !important;
            overflow: visible !important;
          }
          .overflow-hidden, .overflow-y-auto {
            overflow: visible !important;
          }
          .h-screen {
            height: auto !important;
          }
          .min-h-screen {
            min-height: auto !important;
          }
          #documento {
            position: static !important;
            margin: 0 !important;
            background: white !important;
            color: #000 !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </>
  );
}
