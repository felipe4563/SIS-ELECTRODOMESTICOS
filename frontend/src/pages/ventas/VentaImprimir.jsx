import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ventasService } from '../../services/ventas.service';

const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fmtFecha = s => s ? new Date(s).toLocaleString('es-BO') : '—';

export default function VentaImprimir() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(true);
  const printRef   = useRef(null);

  useEffect(() => {
    ventasService.ticket(id)
      .then(r => setData(r.data))
      .catch(() => navigate('/ventas'))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  const imprimir = () => window.print();

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!data)    return null;

  const clienteNombre = data.cliente_razon || `${data.cliente_nombres ?? ''} ${data.cliente_apellidos ?? ''}`.trim();
  const empresa = data.empresa_comercial || data.empresa_razon || 'MEGAELECTRA';

  return (
    <>
      {/* Botones — se ocultan al imprimir */}
      <div className="no-print flex gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <button onClick={imprimir}
          className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors">
          🖨️ Imprimir
        </button>
        <button onClick={() => navigate(`/ventas/${id}`)}
          className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors">
          ← Volver
        </button>
      </div>

      {/* Ticket — optimizado para 80mm */}
      <div className="flex justify-center p-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        <div
          ref={printRef}
          id="ticket"
          style={{ width: '80mm', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.4', background: 'white', color: '#000', padding: '4mm' }}
        >
          {/* Empresa */}
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{empresa}</div>
            {data.empresa_nit && <div>NIT: {data.empresa_nit}</div>}
            {data.sucursal_nombre && <div>{data.sucursal_nombre}</div>}
            {data.sucursal_direccion && <div style={{ fontSize: '10px' }}>{data.sucursal_direccion}</div>}
            {data.sucursal_telefono && <div>Tel: {data.sucursal_telefono}</div>}
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

          {/* Info venta */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>FACTURA / RECIBO</span>
              <span>{data.numero}</span>
            </div>
            {data.numero_factura && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>N° Factura:</span>
                <span>{data.numero_factura}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Fecha:</span>
              <span>{fmtFecha(data.fecha)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Vendedor:</span>
              <span>{data.vendedor_nombre}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

          {/* Cliente */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold' }}>CLIENTE</div>
            <div>{clienteNombre}</div>
            {data.cliente_documento && <div>{data.tipo_documento}: {data.cliente_documento}</div>}
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

          {/* Detalle productos */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>DETALLE</div>
            {(data.detalle ?? []).map((d, i) => {
              const base = Number(d.cantidad) * Number(d.precio_unitario);
              const desc = base * (Number(d.descuento_porc ?? 0) / 100);
              const sub  = base - desc;
              return (
                <div key={i} style={{ marginBottom: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ maxWidth: '55mm', wordBreak: 'break-word' }}>{d.producto}</span>
                    <span style={{ fontWeight: 'bold' }}>Bs {fmtMonto(sub)}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#444', paddingLeft: '4px' }}>
                    {fmtMonto(d.cantidad)} x Bs {fmtMonto(d.precio_unitario)}
                    {Number(d.descuento_porc) > 0 && ` (-${d.descuento_porc}%)`}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

          {/* Totales */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>Bs {fmtMonto(data.subtotal)}</span>
            </div>
            {Number(data.descuento_monto) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Descuento ({data.descuento_porc}%):</span>
                <span>-Bs {fmtMonto(data.descuento_monto)}</span>
              </div>
            )}
            {Number(data.impuesto) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Impuesto:</span>
                <span>Bs {fmtMonto(data.impuesto)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>
              <span>TOTAL:</span>
              <span>Bs {fmtMonto(data.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Condición:</span>
              <span>{data.condicion_pago === 'CREDITO' ? `Crédito (${data.dias_credito} días)` : 'Contado'}</span>
            </div>
            {Number(data.saldo_pendiente) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>SALDO PENDIENTE:</span>
                <span>Bs {fmtMonto(data.saldo_pendiente)}</span>
              </div>
            )}
          </div>

          {/* Entrega */}
          {data.requiere_entrega && data.direccion_entrega && (
            <>
              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
              <div style={{ fontSize: '10px' }}>
                <div style={{ fontWeight: 'bold' }}>ENTREGA:</div>
                <div>{data.direccion_entrega}</div>
                {data.fecha_entrega && <div>Fecha: {fmtFecha(data.fecha_entrega)}</div>}
              </div>
            </>
          )}

          <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

          {/* Pie */}
          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px' }}>
            <div>Gracias por su compra</div>
            <div style={{ marginTop: '2px' }}>Conserve su comprobante</div>
          </div>
        </div>
      </div>

      {/* CSS de impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
          #ticket {
            width: 80mm !important;
            margin: 0 auto;
            padding: 2mm !important;
            font-size: 11px !important;
          }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>
    </>
  );
}
