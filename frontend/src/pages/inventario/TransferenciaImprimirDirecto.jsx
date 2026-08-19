import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transferenciasService } from '../../services/transferencias.service';
import { useEmpresa } from '../../contexts/EmpresaContext';

/* ─── Helpers (mismos que TransferenciaImprimir.jsx) ──────────────────────── */
const fmtN  = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = s => s ? new Date(s).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const ESTADO_COLOR = {
  SOLICITADA:  { bg: '#dbeafe', fg: '#1d4ed8' },
  EN_TRANSITO: { bg: '#fef9c3', fg: '#a16207' },
  RECIBIDA:    { bg: '#dcfce7', fg: '#15803d' },
  PARCIAL:     { bg: '#ffedd5', fg: '#c2410c' },
  ANULADA:     { bg: '#fee2e2', fg: '#b91c1c' },
};
const ESTADO_LABEL = {
  SOLICITADA: 'Solicitada', EN_TRANSITO: 'En Tránsito', RECIBIDA: 'Recibida',
  PARCIAL: 'Parcial', ANULADA: 'Anulada',
};

/* ─── Documento (mismo layout que TransferenciaImprimir.jsx, en HTML) ─────── */
function TransferenciaDoc({ transferencia: t, detalle = [], empresa: e, logoUrl }) {
  const est = ESTADO_COLOR[t.estado] ?? ESTADO_COLOR.ANULADA;
  const nombreCompleto = (n, a) => [n, a].filter(Boolean).join(' ') || '—';

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
          <span style={{ backgroundColor: '#facc15', color: '#1c1917', fontSize: '8px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px' }}>NOTA DE TRANSFERENCIA</span>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px', marginBottom: '4px', letterSpacing: '0.5px' }}>{t.numero}</div>
          <span style={{ fontSize: '8px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px', backgroundColor: est.bg, color: est.fg }}>
            {ESTADO_LABEL[t.estado] ?? t.estado}
          </span>
        </div>
      </div>

      {/* Flujo origen → destino */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <div style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #fde68a', backgroundColor: '#fffbeb' }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#b45309' }}>ORIGEN · {t.deposito_origen_codigo}</div>
          <div style={{ fontSize: '7px', color: '#b45309', marginTop: '1px' }}>{t.deposito_origen_nombre}</div>
        </div>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>→</span>
        <div style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#1d4ed8' }}>DESTINO · {t.deposito_destino_codigo}</div>
          <div style={{ fontSize: '7px', color: '#1d4ed8', marginTop: '1px' }}>{t.deposito_destino_nombre}</div>
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Fechas</div>
          <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>Solicitud: <span style={{ fontWeight: 'bold' }}>{fecha(t.fecha_solicitud)}</span></div>
          {t.fecha_envio && <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>Envío: <span style={{ fontWeight: 'bold' }}>{fecha(t.fecha_envio)}</span></div>}
          {t.fecha_recepcion && <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: '1px' }}>Recepción: <span style={{ fontWeight: 'bold' }}>{fecha(t.fecha_recepcion)}</span></div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Solicita</div>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#111827' }}>{nombreCompleto(t.solicita_nombres, t.solicita_apellidos)}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Envía</div>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#111827' }}>{nombreCompleto(t.envia_nombres, t.envia_apellidos)}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Recibe</div>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#111827' }}>{nombreCompleto(t.recibe_nombres, t.recibe_apellidos)}</div>
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
            <th style={{ width: '55px', textAlign: 'left', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>U.M.</th>
            <th style={{ width: '75px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Enviada</th>
            <th style={{ width: '75px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Recibida</th>
            <th style={{ width: '75px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Pendiente</th>
          </tr>
        </thead>
        <tbody>
          {detalle.map((d, i) => {
            const pendiente = Number(d.cantidad_enviada ?? 0) - Number(d.cantidad_recibida ?? 0);
            return (
              <tr key={d.id_detalle} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ fontSize: '8px', color: '#9ca3af', padding: '5px' }}>{i + 1}</td>
                <td style={{ fontSize: '7px', fontFamily: 'Courier, monospace', padding: '5px' }}>{d.codigo_interno}</td>
                <td style={{ fontWeight: 'bold', fontSize: '8px', color: '#111827', padding: '5px' }}>{d.producto_nombre}</td>
                <td style={{ fontSize: '7px', color: '#9ca3af', padding: '5px' }}>{d.unidad_nombre}</td>
                <td style={{ fontSize: '8px', fontFamily: 'Courier, monospace', color: '#374151', padding: '5px', textAlign: 'right' }}>{fmtN(d.cantidad_enviada)}</td>
                <td style={{ fontSize: '8px', fontFamily: 'Courier, monospace', color: '#15803d', padding: '5px', textAlign: 'right' }}>{fmtN(d.cantidad_recibida)}</td>
                <td style={{ fontSize: '8px', fontFamily: 'Courier, monospace', color: pendiente > 0 ? '#c2410c' : '#9ca3af', padding: '5px', textAlign: 'right' }}>{fmtN(pendiente)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Observaciones */}
      {t.observaciones && (
        <>
          <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '12px', marginTop: '14px' }} />
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Observaciones</div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '8px', marginBottom: '12px' }}>
            <div style={{ fontSize: '8px', color: '#374151', marginTop: '2px' }}>{t.observaciones}</div>
          </div>
        </>
      )}

      {/* Firmas */}
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: '20px', marginTop: '40px' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #111827', width: '90%', margin: '0 auto 5px' }} />
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#4b5563' }}>Solicitado por</div>
          <div style={{ fontSize: '8px', color: '#111827', marginTop: '2px' }}>{nombreCompleto(t.solicita_nombres, t.solicita_apellidos)}</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #111827', width: '90%', margin: '0 auto 5px' }} />
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#4b5563' }}>Enviado por</div>
          <div style={{ fontSize: '8px', color: '#111827', marginTop: '2px' }}>{nombreCompleto(t.envia_nombres, t.envia_apellidos)}</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #111827', width: '90%', margin: '0 auto 5px' }} />
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#4b5563' }}>Recibido por</div>
          <div style={{ fontSize: '8px', color: '#111827', marginTop: '2px' }}>{nombreCompleto(t.recibe_nombres, t.recibe_apellidos)}</div>
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
export default function TransferenciaImprimirDirecto() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [data,      setData]     = useState(null);
  const [cargando,  setCargando] = useState(true);
  const { empresa, logoUrl } = useEmpresa() ?? {};

  useEffect(() => {
    transferenciasService.getOne(id)
      .then(r => setData(r.data))
      .catch(() => navigate(`/inventario/transferencias/${id}`))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!data)    return null;

  const { detalle, ...transferencia } = data;

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
          onClick={() => navigate(`/inventario/transferencias/${id}`)}
          className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
        >
          ← Volver
        </button>
      </div>

      <div className="flex justify-center p-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        <TransferenciaDoc transferencia={transferencia} detalle={detalle ?? []} empresa={empresa} logoUrl={logoUrl} />
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
