import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cobrosService } from '../../services/cobros.service';
import { useEmpresa } from '../../contexts/EmpresaContext';

const FMT    = (n) => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FMT_DT = (d) => d ? new Date(d).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
const FMT_D  = (d) => d ? new Date(d).toLocaleDateString('es-BO') : '-';

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
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500">{error}</p>
    </div>
  );

  if (!recibo) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-zinc-400">Cargando recibo…</p>
    </div>
  );

  return (
    <>
      {/* Barra de acciones — solo pantalla */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
          ← Volver
        </button>
        <span className="font-semibold text-zinc-900 dark:text-white text-sm">Recibo de Cobro</span>
        <button
          onClick={() => window.print()}
          className="px-4 py-1.5 rounded-xl bg-yellow-400 text-zinc-900 text-sm font-semibold hover:bg-yellow-500 transition-colors"
        >
          🖨 Imprimir
        </button>
      </div>

      {/* Recibo */}
      <div className="pt-16 print:pt-0 flex justify-center bg-gray-100 dark:bg-zinc-950 min-h-screen print:bg-white print:min-h-0">
        <div className="bg-white shadow-lg print:shadow-none w-full max-w-sm mx-auto p-6 print:p-4 my-6 print:my-0 rounded-2xl print:rounded-none">

          {/* Encabezado empresa */}
          <div className="text-center mb-5 border-b border-dashed border-zinc-300 pb-4">
            {logoUrl && logoUrl !== '/logo.png' && (
              <img src={logoUrl} alt="Logo" className="h-10 object-contain mx-auto mb-2" />
            )}
            <p className="font-bold text-lg text-zinc-900">{recibo.nombre_comercial || recibo.empresa_razon}</p>
            {recibo.empresa_nit && <p className="text-xs text-zinc-500">NIT: {recibo.empresa_nit}</p>}
            {recibo.sucursal_nombre && <p className="text-xs text-zinc-500">{recibo.sucursal_nombre}</p>}
            {recibo.empresa_telefono && <p className="text-xs text-zinc-500">Tel: {recibo.empresa_telefono}</p>}
          </div>

          {/* Título */}
          <div className="text-center mb-4">
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-700">Recibo de Pago</p>
            <p className="font-mono text-lg font-bold text-zinc-900 mt-1">{recibo.numero}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{FMT_DT(recibo.fecha)}</p>
          </div>

          {/* Datos cobro */}
          <div className="space-y-2 text-sm mb-5 border-t border-dashed border-zinc-300 pt-4">
            <Row label="Venta" value={recibo.numero_venta} />
            <Row label="Tipo"  value={recibo.condicion_pago} />
            {recibo.numero_cuota && <Row label="Cuota" value={`N° ${recibo.numero_cuota} — ${recibo.moneda_simbolo} ${FMT(recibo.cuota_monto)}`} />}
            <Row label="Método" value={recibo.metodo_pago?.replace('_', ' ')} />
            {recibo.numero_referencia && <Row label="Referencia" value={recibo.numero_referencia} />}
          </div>

          {/* Cliente */}
          <div className="space-y-1.5 text-sm mb-5 border-t border-dashed border-zinc-300 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Cliente</p>
            <p className="font-semibold text-zinc-900">{recibo.razon_social || recibo.cliente_nombre}</p>
            {recibo.documento && <p className="text-xs text-zinc-500">{recibo.tipo_documento}: {recibo.documento}</p>}
            {recibo.celular    && <p className="text-xs text-zinc-500">Cel: {recibo.celular}</p>}
          </div>

          {/* Montos */}
          <div className="border-t-2 border-dashed border-zinc-400 pt-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-zinc-600">Total venta</span>
              <span className="text-sm text-zinc-900">{recibo.moneda_simbolo} {FMT(recibo.total_venta)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-zinc-600">Saldo restante</span>
              <span className="text-sm text-zinc-900">{recibo.moneda_simbolo} {FMT(recibo.saldo_post)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-dashed border-zinc-400 pt-3 mt-2">
              <span className="font-bold text-zinc-900">MONTO COBRADO</span>
              <span className="font-bold text-xl text-zinc-900">{recibo.moneda_simbolo} {FMT(recibo.monto)}</span>
            </div>
          </div>

          {/* Cobrador */}
          <div className="border-t border-dashed border-zinc-300 pt-3 text-center">
            <p className="text-xs text-zinc-500">Cobrador: <span className="font-medium text-zinc-700">{recibo.cobrador}</span></p>
            {recibo.observaciones && <p className="text-xs text-zinc-500 mt-1 italic">{recibo.observaciones}</p>}
            <p className="text-xs text-zinc-400 mt-3">— Documento válido como recibo de pago —</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { background: white !important; }
        }
      `}</style>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className="font-medium text-zinc-900 text-right">{value}</span>
    </div>
  );
}
