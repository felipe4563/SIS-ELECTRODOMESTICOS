import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cobrosService } from '../../services/cobros.service';
import { useEmpresa } from '../../contexts/EmpresaContext';

const FMT    = (n) => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FMT_DT = (d) => d ? new Date(d).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export default function CobroRecibo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recibo, setRecibo] = useState(null);
  const [error, setError]   = useState('');
  const { logoUrl } = useEmpresa() ?? {};

  useEffect(() => {
    cobrosService.getRecibo(id)
      .then(r => setRecibo(r.data))
      .catch(e => setError(e.response?.data?.error ?? 'Error al cargar recibo'));
  }, [id]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center p-8">
        <p className="text-red-500 font-medium text-sm">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline transition-colors">
          ← Volver
        </button>
      </div>
    </div>
  );

  if (!recibo) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-400">Cargando recibo…</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Barra de acciones — solo pantalla */}
      <div className="no-print flex gap-3 p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 items-center justify-between shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        <span className="font-semibold text-zinc-900 dark:text-white text-sm">Recibo de Cobro</span>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 text-zinc-900 text-sm font-semibold hover:bg-yellow-500 active:scale-95 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
      </div>

      {/* Fondo pantalla */}
      <div className="flex justify-center p-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">

        {/* Tarjeta — pantalla: Tailwind con identidad del sistema | impresión: controlado por CSS */}
        <div
          id="ticket"
          className="w-full max-w-xs sm:max-w-sm mx-auto bg-white dark:bg-zinc-900 shadow-xl rounded-2xl overflow-hidden self-start"
          style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.45' }}
        >
          {/* Franja amarilla top — solo pantalla */}
          <div className="no-print h-1.5 bg-yellow-400" />

          <div className="px-5 py-5" id="ticket-body">

            {/* Encabezado empresa */}
            <div style={{ textAlign: 'center', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dashed #d4d4d8' }}>
              {logoUrl && logoUrl !== '/logo.png' && (
                <img src={logoUrl} alt="Logo" style={{ maxHeight: '60px', maxWidth: '100%', margin: '0 auto 6px', display: 'block', objectFit: 'contain' }} />
              )}
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{recibo.nombre_comercial || recibo.empresa_razon}</div>
              {recibo.empresa_nit      && <div>NIT: {recibo.empresa_nit}</div>}
              {recibo.sucursal_nombre  && <div>{recibo.sucursal_nombre}</div>}
              {recibo.empresa_telefono && <div>Tel: {recibo.empresa_telefono}</div>}
            </div>

            {/* Identificación recibo */}
            <div style={{ textAlign: 'center', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dashed #d4d4d8' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#71717a' }}>Recibo de Pago</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '2px' }}>{recibo.numero}</div>
              <div style={{ fontSize: '10px', color: '#71717a', marginTop: '2px' }}>{FMT_DT(recibo.fecha)}</div>
            </div>

            {/* Datos del cobro */}
            <div style={{ marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dashed #d4d4d8' }}>
              <FilaTicket label="N° Venta"   value={recibo.numero_venta} />
              <FilaTicket label="Tipo"       value={recibo.condicion_pago} />
              {recibo.numero_cuota && (
                <FilaTicket
                  label="Cuota"
                  value={`N° ${recibo.numero_cuota} — ${recibo.moneda_simbolo} ${FMT(recibo.cuota_monto)}`}
                />
              )}
              <FilaTicket label="Método"     value={recibo.metodo_pago?.replace('_', ' ')} />
              {recibo.numero_referencia && (
                <FilaTicket label="Referencia" value={recibo.numero_referencia} />
              )}
            </div>

            {/* Cliente */}
            <div style={{ marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dashed #d4d4d8' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#71717a', marginBottom: '3px' }}>Cliente</div>
              <div style={{ fontWeight: 'bold' }}>{recibo.razon_social || recibo.cliente_nombre}</div>
              {recibo.documento && (
                <div style={{ fontSize: '10px', color: '#52525b' }}>{recibo.tipo_documento}: {recibo.documento}</div>
              )}
              {recibo.celular && (
                <div style={{ fontSize: '10px', color: '#52525b' }}>Cel: {recibo.celular}</div>
              )}
            </div>

            {/* Montos */}
            <div style={{ marginBottom: '6px' }}>
              <FilaTicket label="Total venta"   value={`${recibo.moneda_simbolo} ${FMT(recibo.total_venta)}`} />
              <FilaTicket label="Saldo restante" value={`${recibo.moneda_simbolo} ${FMT(recibo.saldo_post)}`} />
              <div style={{ borderTop: '2px dashed #000', marginTop: '5px', paddingTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monto Cobrado</span>
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{recibo.moneda_simbolo} {FMT(recibo.monto)}</span>
              </div>
            </div>

            {/* Pie */}
            <div style={{ borderTop: '1px dashed #d4d4d8', paddingTop: '6px', textAlign: 'center', fontSize: '10px', color: '#71717a' }}>
              <div>Cobrador: <span style={{ fontWeight: '600', color: '#3f3f46' }}>{recibo.cobrador}</span></div>
              {recibo.observaciones && (
                <div style={{ marginTop: '2px', fontStyle: 'italic' }}>{recibo.observaciones}</div>
              )}
              <div style={{ marginTop: '6px', letterSpacing: '0.05em' }}>— Documento válido como recibo de pago —</div>
            </div>

          </div>

          {/* Franja amarilla bottom — solo pantalla */}
          <div className="no-print h-1.5 bg-yellow-400 mt-1" />
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #ticket, #ticket * { visibility: visible !important; }
          #ticket {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 74mm !important;
            margin: 0 !important;
            padding: 3mm !important;
            font-size: 11px !important;
            background: white !important;
            color: #000 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          #ticket-body {
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          @page { size: 80mm auto; margin: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-spin { animation: none; }
        }
      `}</style>
    </>
  );
}

function FilaTicket({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
      <span style={{ color: '#71717a', flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: '500', textAlign: 'right' }}>{value}</span>
    </div>
  );
}
