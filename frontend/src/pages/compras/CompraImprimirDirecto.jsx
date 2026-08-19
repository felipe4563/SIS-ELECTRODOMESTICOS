import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { comprasService } from '../../services/compras.service';
import { useEmpresa } from '../../contexts/EmpresaContext';

/* ─── Helpers (mismos que CompraImprimir.jsx) ─────────────────────────────── */
const fmt   = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN  = n => Number(n ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 4 });
const fecha = s => s ? new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const ESTADO_COLOR = {
  PRE_PEDIDO: { bg: '#f4f4f5', fg: '#52525b' },
  CONFIRMADO: { bg: '#eef2ff', fg: '#4338ca' },
  POR_LLEGAR: { bg: '#dbeafe', fg: '#1d4ed8' },
  PARCIAL:    { bg: '#fffbeb', fg: '#b45309' },
  RECIBIDO:   { bg: '#dcfce7', fg: '#15803d' },
  ANULADO:    { bg: '#fee2e2', fg: '#b91c1c' },
};
const ESTADO_LABEL = {
  PRE_PEDIDO: 'Pre-Pedido', CONFIRMADO: 'Confirmado', POR_LLEGAR: 'Por Llegar',
  PARCIAL: 'Parcial', RECIBIDO: 'Recibido', ANULADO: 'Anulado',
};

/* ─── Documento (mismo layout que CompraImprimir.jsx, en HTML) ───────────── */
function CompraDoc({ compra: c, detalle = [], cuotas = [], pagos = [], empresa: e, logoUrl }) {
  const sym  = c.moneda_simbolo ?? c.moneda_codigo ?? '';
  const fmtM = n => `${sym} ${fmt(n)}`;
  const est  = ESTADO_COLOR[c.estado] ?? ESTADO_COLOR.ANULADO;
  const pagosActivos = pagos.filter(p => p.estado !== 'ANULADO');

  return (
    <div id="documento" style={{ width: '210mm', minHeight: '297mm', background: '#fff', color: '#111827', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '10px', padding: '14mm 16mm', boxSizing: 'border-box' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #facc15', paddingBottom: '12px', marginBottom: '14px' }}>
        <div>
          {logoUrl && logoUrl !== '/logo.png' && (
            <img src={logoUrl} alt="Logo" style={{ width: '64px', height: '44px', objectFit: 'contain', marginBottom: '4px' }} />
          )}
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', marginBottom: '2px' }}>{e?.nombre_comercial || e?.razon_social || ''}</div>
          {e?.nit       && <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '1px' }}>NIT: {e.nit}</div>}
          {e?.telefono  && <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '1px' }}>Tel: {e.telefono}</div>}
          {e?.direccion && <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '1px' }}>{e.direccion}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ backgroundColor: '#facc15', color: '#1c1917', fontSize: '8px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px' }}>ORDEN DE COMPRA</span>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px', marginBottom: '4px', letterSpacing: '0.5px' }}>{c.numero}</div>
          <span style={{ fontSize: '8px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px', backgroundColor: est.bg, color: est.fg }}>
            {ESTADO_LABEL[c.estado] ?? c.estado}
          </span>
          {c.numero_factura && <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '4px' }}>Factura: {c.numero_factura}</div>}
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Proveedor</div>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#111827', marginBottom: '1px' }}>{c.proveedor_nombre}</div>
          {c.proveedor_codigo   && <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>Cód: {c.proveedor_codigo}</div>}
          {c.proveedor_telefono && <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>Tel: {c.proveedor_telefono}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Destino</div>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#111827', marginBottom: '1px' }}>{c.sucursal_nombre}</div>
          <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>Depósito: {c.deposito_nombre}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Fechas</div>
          <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>Pedido: <span style={{ fontWeight: 'bold' }}>{fecha(c.fecha_pedido)}</span></div>
          {c.fecha_estim_llegada && <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>Est. llegada: <span style={{ fontWeight: 'bold' }}>{fecha(c.fecha_estim_llegada)}</span></div>}
          {c.fecha_recepcion && <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>Recepción: <span style={{ fontWeight: 'bold' }}>{fecha(c.fecha_recepcion)}</span></div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Pago</div>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#111827', marginBottom: '1px' }}>{c.condicion_pago === 'CONTADO' ? 'Contado' : 'Crédito'}</div>
          {c.condicion_pago === 'CREDITO' && Number(c.dias_credito) > 0 && <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>{c.dias_credito} días</div>}
          <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>Moneda: {c.moneda_codigo}</div>
          {Number(c.tipo_cambio) !== 1 && <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>T.C.: {c.tipo_cambio}</div>}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '12px' }} />

      {/* Tabla productos */}
      <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Detalle de Productos</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
            <th style={{ width: '20px', textAlign: 'left', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>#</th>
            <th style={{ width: '70px', textAlign: 'left', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Código</th>
            <th style={{ textAlign: 'left', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Producto</th>
            <th style={{ width: '55px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Cant.</th>
            <th style={{ width: '30px', textAlign: 'left', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>U.M.</th>
            <th style={{ width: '82px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Precio unit.</th>
            <th style={{ width: '88px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {detalle.map((d, i) => (
            <tr key={d.id_detalle} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ fontSize: '8px', color: '#9ca3af', padding: '5px' }}>{i + 1}</td>
              <td style={{ fontSize: '7px', fontFamily: 'Courier, monospace', padding: '5px' }}>{d.codigo_interno}</td>
              <td style={{ padding: '5px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '8px', color: '#111827' }}>{d.producto}</div>
                {d.marca_nombre && <div style={{ fontSize: '7px', color: '#9ca3af', marginTop: '1px' }}>{d.marca_nombre}</div>}
              </td>
              <td style={{ fontSize: '8px', color: '#374151', padding: '5px', textAlign: 'right' }}>{fmtN(d.cantidad)}</td>
              <td style={{ fontSize: '7px', color: '#9ca3af', padding: '5px' }}>{d.unidad_codigo}</td>
              <td style={{ fontSize: '8px', color: '#374151', fontFamily: 'Courier, monospace', padding: '5px', textAlign: 'right' }}>{fmtM(d.precio_unitario)}</td>
              <td style={{ fontSize: '8px', color: '#374151', fontFamily: 'Courier, monospace', fontWeight: 'bold', padding: '5px', textAlign: 'right' }}>{fmtM(d.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', marginBottom: '14px' }}>
        <div style={{ width: '210px' }}>
          {Number(c.descuento) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #f3f4f6' }}>
              <span style={{ fontSize: '8px', color: '#4b5563' }}>Descuento</span>
              <span style={{ fontSize: '8px', color: '#ef4444', fontFamily: 'Courier, monospace' }}>- {fmtM(c.descuento)}</span>
            </div>
          )}
          {Number(c.impuesto) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #f3f4f6' }}>
              <span style={{ fontSize: '8px', color: '#4b5563' }}>Impuesto</span>
              <span style={{ fontSize: '8px', color: '#374151', fontFamily: 'Courier, monospace' }}>{fmtM(c.impuesto)}</span>
            </div>
          )}
          {Number(c.flete) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #f3f4f6' }}>
              <span style={{ fontSize: '8px', color: '#4b5563' }}>Flete</span>
              <span style={{ fontSize: '8px', color: '#374151', fontFamily: 'Courier, monospace' }}>{fmtM(c.flete)}</span>
            </div>
          )}
          {Number(c.otros_costos) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #f3f4f6' }}>
              <span style={{ fontSize: '8px', color: '#4b5563' }}>Otros costos</span>
              <span style={{ fontSize: '8px', color: '#374151', fontFamily: 'Courier, monospace' }}>{fmtM(c.otros_costos)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #111827', paddingTop: '5px', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#111827' }}>TOTAL</span>
            <span style={{ fontSize: '11px', fontFamily: 'Courier, monospace', color: '#111827' }}>{fmtM(c.total)}</span>
          </div>
          {Number(c.saldo_pendiente) > 0 && Number(c.saldo_pendiente) !== Number(c.total) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
              <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#dc2626' }}>Saldo pendiente</span>
              <span style={{ fontSize: '8px', fontFamily: 'Courier, monospace', color: '#dc2626' }}>{fmtM(c.saldo_pendiente)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Observaciones */}
      {c.observaciones && (
        <>
          <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '12px' }} />
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Observaciones</div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '8px', marginBottom: '12px' }}>
            <div style={{ fontSize: '8px', color: '#374151', marginTop: '2px' }}>{c.observaciones}</div>
          </div>
        </>
      )}

      {/* Cuotas */}
      {cuotas.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '12px' }} />
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Plan de Cuotas</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                <th style={{ width: '40px', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Cuota</th>
                <th style={{ textAlign: 'left', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Vencimiento</th>
                <th style={{ width: '100px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Monto</th>
                <th style={{ width: '70px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cuotas.map(cu => (
                <tr key={cu.id_cuota} style={{ borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ textAlign: 'center', fontSize: '8px', color: '#6b7280', padding: '5px' }}>{cu.numero_cuota}</td>
                  <td style={{ fontSize: '8px', color: '#374151', padding: '5px' }}>{fecha(cu.fecha_vencimiento)}</td>
                  <td style={{ textAlign: 'right', fontSize: '8px', color: '#374151', fontFamily: 'Courier, monospace', padding: '5px' }}>{fmtM(cu.monto)}</td>
                  <td style={{ textAlign: 'right', fontSize: '7px', color: '#6b7280', padding: '5px' }}>{cu.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Pagos */}
      {pagosActivos.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '12px', marginTop: '12px' }} />
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Pagos Registrados</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                <th style={{ width: '90px', textAlign: 'left', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>N° Pago</th>
                <th style={{ textAlign: 'left', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Método</th>
                <th style={{ width: '70px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Fecha</th>
                <th style={{ width: '100px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {pagosActivos.map(p => (
                <tr key={p.id_pago} style={{ borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ fontSize: '7px', fontFamily: 'Courier, monospace', padding: '5px' }}>{p.numero}</td>
                  <td style={{ fontSize: '8px', color: '#374151', padding: '5px' }}>{p.metodo_pago}</td>
                  <td style={{ textAlign: 'right', fontSize: '8px', color: '#374151', padding: '5px' }}>{fecha(p.fecha?.slice(0, 10))}</td>
                  <td style={{ textAlign: 'right', fontSize: '8px', color: '#374151', fontFamily: 'Courier, monospace', padding: '5px' }}>{fmtM(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Firmas */}
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: '20px', marginTop: '40px' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #111827', width: '90%', margin: '0 auto 5px' }} />
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#4b5563' }}>Elaborado por</div>
          <div style={{ fontSize: '8px', color: '#111827', marginTop: '2px' }}>{c.crea_nombres} {c.crea_apellidos}</div>
        </div>
        {(c.aprueba_nombres || c.aprueba_apellidos) && (
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #111827', width: '90%', margin: '0 auto 5px' }} />
            <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#4b5563' }}>Aprobado por</div>
            <div style={{ fontSize: '8px', color: '#111827', marginTop: '2px' }}>{c.aprueba_nombres} {c.aprueba_apellidos}</div>
          </div>
        )}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #111827', width: '90%', margin: '0 auto 5px' }} />
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#4b5563' }}>Conformidad proveedor</div>
          <div style={{ fontSize: '8px', color: '#111827', marginTop: '2px' }}>&nbsp;</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '7px', color: '#9ca3af' }}>Generado el {new Date().toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</span>
        <span style={{ fontSize: '7px', color: '#9ca3af' }}>{e?.razon_social ?? ''}</span>
      </div>
    </div>
  );
}

/* ─── Página principal ────────────────────────────────────────────────────── */
export default function CompraImprimirDirecto() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [data,      setData]     = useState(null);
  const [cargando,  setCargando] = useState(true);
  const { empresa, logoUrl } = useEmpresa() ?? {};

  useEffect(() => {
    comprasService.getOne(id)
      .then(r => setData(r.data))
      .catch(() => navigate(`/compras/${id}`))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!data)    return null;

  const { compra, detalle, cuotas, pagos } = data;

  return (
    <>
      <div className="no-print flex flex-wrap items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <button
          onClick={() => window.print()}
          className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={() => navigate(`/compras/${id}`)}
          className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
        >
          ← Volver
        </button>
      </div>

      <div className="flex justify-center p-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        <CompraDoc compra={compra} detalle={detalle} cuotas={cuotas} pagos={pagos} empresa={empresa} logoUrl={logoUrl} />
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          #documento, #documento * { visibility: visible !important; }
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
