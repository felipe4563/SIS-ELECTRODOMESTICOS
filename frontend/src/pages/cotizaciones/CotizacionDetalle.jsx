import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { cotizacionesService }    from '../../services/cotizaciones.service';
import { descargarCotizacionPDF } from './CotizacionPDF';
import { useEmpresa }             from '../../contexts/EmpresaContext';
import { usePermission }          from '../../hooks/usePermission';

const BADGE = {
  BORRADOR:   'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  EMITIDA:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  APROBADA:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  RECHAZADA:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  VENCIDA:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  CONVERTIDA: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  ANULADA:    'bg-red-50 text-red-400 dark:bg-red-900/10 dark:text-red-500',
};

const BORDER_L = {
  BORRADOR:   'border-l-zinc-300',
  EMITIDA:    'border-l-blue-400',
  APROBADA:   'border-l-green-400',
  RECHAZADA:  'border-l-red-400',
  CONVERTIDA: 'border-l-yellow-400',
  VENCIDA:    'border-l-orange-400',
  ANULADA:    'border-l-zinc-200',
};

const fmt      = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fmtFecha = s => s ? new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate  = s => s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-BO') : '—';

const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

function Spinner() {
  return <div className="w-5 h-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-yellow-400 rounded-full animate-spin" />;
}

export default function CotizacionDetalle() {
  const navigate     = useNavigate();
  const { id }       = useParams();
  const { puede }    = usePermission();
  const { logoUrl }  = useEmpresa() ?? {};

  const [cot,         setCot]         = useState(null);
  const [depositos,   setDepositos]   = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [error,       setError]       = useState('');
  const [procesando,  setProcesando]  = useState('');
  const [descargando, setDescargando] = useState(false);

  // Modal convertir
  const [showConvertir,  setShowConvertir] = useState(false);
  const [convertForm,    setConvertForm]   = useState({ id_deposito: '', tipo_venta: 'MENOR', condicion_pago: 'CONTADO' });

  // Flujo anular
  const [showAnular,   setShowAnular]   = useState(false);
  const [motivoAnular, setMotivoAnular] = useState('');

  const cargar = () => {
    setCargando(true);
    cotizacionesService.getOne(id)
      .then(r => setCot(r.data))
      .catch(() => navigate('/cotizaciones'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    cotizacionesService.getFormData().then(r => {
      setDepositos((r.data.depositos ?? []).filter(d => d.permite_venta));
    }).catch(() => {});
  }, [id]); // eslint-disable-line

  const accion = async (fn, label) => {
    if (!confirm(`¿Confirmar: ${label}?`)) return;
    setProcesando(label); setError('');
    try { await fn(); cargar(); }
    catch (err) { setError(err.response?.data?.mensaje ?? `Error: ${label}`); }
    finally { setProcesando(''); }
  };

  const handleAnular = async () => {
    setProcesando('Anulando'); setError('');
    try {
      await cotizacionesService.anular(id, { motivo: motivoAnular });
      setShowAnular(false); setMotivoAnular('');
      cargar();
    } catch (err) { setError(err.response?.data?.mensaje ?? 'Error al anular'); }
    finally { setProcesando(''); }
  };

  const handleConvertir = async () => {
    if (!convertForm.id_deposito) return setError('Seleccione un depósito para descargar stock');
    setProcesando('Convirtiendo'); setError('');
    try {
      const r = await cotizacionesService.convertir(id, convertForm);
      setShowConvertir(false);
      navigate(`/ventas/${r.data.id_venta}`);
    } catch (err) { setError(err.response?.data?.mensaje ?? 'Error al convertir'); }
    finally { setProcesando(''); }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-32 text-zinc-400">
        <Spinner /><span className="text-sm">Cargando...</span>
      </div>
    );
  }
  if (!cot) return null;

  const clienteNombre = cot.cliente_razon || `${cot.cliente_nombres ?? ''} ${cot.cliente_apellidos ?? ''}`.trim();
  const estado = cot.estado;
  const esTerminal = ['CONVERTIDA', 'ANULADA', 'RECHAZADA'].includes(estado);

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Breadcrumb + encabezado */}
      <div>
        <button
          onClick={() => navigate('/cotizaciones')}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mb-2 flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Cotizaciones
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className={`flex items-start gap-3 pl-3 border-l-4 ${BORDER_L[estado] ?? 'border-l-zinc-300'} py-1`}>
            <div>
              <h1 className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">{cot.numero}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${BADGE[estado] ?? ''}`}>{estado}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{cot.tipo_cotizacion}</span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-2">
            {estado === 'BORRADOR' && puede('editar', 'cotizaciones') && (
              <button
                onClick={() => navigate(`/cotizaciones/${id}/editar`)}
                className="px-3 py-2 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Editar
              </button>
            )}
            {estado === 'BORRADOR' && puede('emitir', 'cotizaciones') && (
              <button
                disabled={!!procesando}
                onClick={() => accion(() => cotizacionesService.emitir(id), 'Emitir')}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-60 transition-colors"
              >
                {procesando === 'Emitir' ? 'Emitiendo...' : 'Emitir'}
              </button>
            )}
            {estado === 'EMITIDA' && puede('aprobar', 'cotizaciones') && (
              <button
                disabled={!!procesando}
                onClick={() => accion(() => cotizacionesService.aprobar(id), 'Aprobar')}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-green-500 hover:bg-green-600 text-white disabled:opacity-60 transition-colors"
              >
                {procesando === 'Aprobar' ? 'Aprobando...' : 'Aprobar'}
              </button>
            )}
            {['EMITIDA', 'APROBADA'].includes(estado) && puede('rechazar', 'cotizaciones') && (
              <button
                disabled={!!procesando}
                onClick={() => accion(() => cotizacionesService.rechazar(id), 'Rechazar')}
                className="px-3 py-2 rounded-xl text-sm font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 transition-colors"
              >
                Rechazar
              </button>
            )}
            {estado === 'APROBADA' && !cot.id_venta_generada && puede('convertir_venta', 'cotizaciones') && (
              <button
                disabled={!!procesando}
                onClick={() => setShowConvertir(true)}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-yellow-400 hover:bg-yellow-300 text-zinc-900 disabled:opacity-60 transition-colors"
              >
                Convertir en venta
              </button>
            )}
            {!esTerminal && puede('anular', 'cotizaciones') && (
              <button
                disabled={!!procesando}
                onClick={() => setShowAnular(true)}
                className="px-3 py-2 rounded-xl text-sm font-semibold border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 transition-colors"
              >
                Anular
              </button>
            )}
            {puede('imprimir', 'cotizaciones') && (
              <button
                disabled={descargando}
                onClick={async () => {
                  setDescargando(true);
                  try { await descargarCotizacionPDF(id, logoUrl); }
                  catch { setError('Error al generar el PDF'); }
                  finally { setDescargando(false); }
                }}
                className="px-3 py-2 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60 transition-colors"
              >
                {descargando ? 'Generando...' : 'PDF'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Modal anular */}
      {showAnular && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Anular cotización</h2>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-sm font-semibold text-red-700 dark:text-red-400">Motivo de anulación</label>
              <textarea
                value={motivoAnular}
                onChange={e => setMotivoAnular(e.target.value)}
                rows={2}
                placeholder="Describe el motivo..."
                className="w-full border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAnular(false); setMotivoAnular(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAnular}
                  disabled={!!procesando}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
                >
                  {procesando === 'Anulando' ? 'Anulando...' : 'Confirmar anulación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Venta generada */}
      {cot.id_venta_generada && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-300">
          <span>Esta cotización fue convertida en venta.</span>
          <Link to={`/ventas/${cot.id_venta_generada}`} className="underline font-semibold hover:text-yellow-900 dark:hover:text-yellow-100">
            Ver venta generada →
          </Link>
        </div>
      )}

      {/* Datos principales — cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Cliente */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-0.5 h-4 rounded-full bg-yellow-400" />
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cliente</p>
          </div>
          <p className="font-semibold text-zinc-900 dark:text-white">{clienteNombre}</p>
          {cot.cliente_documento && <p className="text-sm text-zinc-500 dark:text-zinc-400">{cot.tipo_documento}: {cot.cliente_documento}</p>}
          {cot.cliente_telefono  && <p className="text-sm text-zinc-500 dark:text-zinc-400">Tel: {cot.cliente_telefono}</p>}
          {cot.cliente_email     && <p className="text-sm text-zinc-500 dark:text-zinc-400">{cot.cliente_email}</p>}
        </div>

        {/* Datos */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-0.5 h-4 rounded-full bg-yellow-400" />
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cotización</p>
          </div>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Sucursal</dt>
              <dd className="font-medium text-zinc-900 dark:text-white">{cot.sucursal_nombre}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Fecha</dt>
              <dd className="font-medium text-zinc-900 dark:text-white">{fmtFecha(cot.fecha)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Válida hasta</dt>
              <dd className="font-medium text-zinc-900 dark:text-white">{fmtDate(cot.fecha_vencimiento)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Moneda</dt>
              <dd className="font-medium text-zinc-900 dark:text-white">{cot.moneda_simbolo}</dd>
            </div>
          </dl>
        </div>

        {/* Vendedor / obs */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-0.5 h-4 rounded-full bg-yellow-400" />
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Vendedor</p>
          </div>
          <p className="font-semibold text-zinc-900 dark:text-white">{cot.vendedor_nombre}</p>
          {cot.observaciones && (
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Observaciones</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{cot.observaciones}</p>
            </div>
          )}
        </div>
      </div>

      {/* Detalle de productos */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5">
          <span className="w-0.5 h-4 rounded-full bg-yellow-400" />
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            Productos ({cot.detalle?.length ?? 0})
          </p>
        </div>

        {/* Desktop tabla */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Producto</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Cantidad</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Precio unit.</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Desc %</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {(cot.detalle ?? []).map((d, i) => (
                <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-900 dark:text-white">{d.producto}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{d.codigo_interno}</p>
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-700 dark:text-zinc-300 font-mono">
                    {fmt(d.cantidad)} {d.unidad_nombre}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-700 dark:text-zinc-300 font-mono hidden md:table-cell">
                    Bs {fmt(d.precio_unitario)}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-500 hidden md:table-cell">
                    {Number(d.descuento_porc) > 0 ? `${d.descuento_porc}%` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-zinc-900 dark:text-white">
                    Bs {fmt(d.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {(cot.detalle ?? []).map((d, i) => (
            <div key={i} className="flex items-start justify-between gap-3 px-4 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{d.producto}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">{d.codigo_interno}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {fmt(d.cantidad)} × Bs {fmt(d.precio_unitario)}
                  {Number(d.descuento_porc) > 0 && <span className="text-red-400 ml-1">-{d.descuento_porc}%</span>}
                </p>
              </div>
              <p className="text-sm font-semibold font-mono text-zinc-900 dark:text-white whitespace-nowrap">Bs {fmt(d.subtotal)}</p>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm min-w-[220px]">
            <dt className="text-zinc-500 dark:text-zinc-400">Subtotal:</dt>
            <dd className="text-right font-mono text-zinc-900 dark:text-white">Bs {fmt(cot.subtotal)}</dd>
            {Number(cot.descuento_porc) > 0 && <>
              <dt className="text-zinc-500 dark:text-zinc-400">Descuento ({cot.descuento_porc}%):</dt>
              <dd className="text-right font-mono text-red-500">-Bs {fmt(cot.descuento_monto)}</dd>
            </>}
            {Number(cot.impuesto) > 0 && <>
              <dt className="text-zinc-500 dark:text-zinc-400">Impuesto:</dt>
              <dd className="text-right font-mono text-zinc-700 dark:text-zinc-300">Bs {fmt(cot.impuesto)}</dd>
            </>}
            <dt className="text-base font-bold text-zinc-900 dark:text-white border-t border-zinc-200 dark:border-zinc-700 pt-1.5">Total:</dt>
            <dd className="text-right text-base font-bold font-mono text-zinc-900 dark:text-white border-t border-zinc-200 dark:border-zinc-700 pt-1.5">Bs {fmt(cot.total)}</dd>
          </dl>
        </div>
      </div>

      {/* Modal convertir en venta */}
      {showConvertir && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <span className="w-0.5 h-5 rounded-full bg-yellow-400" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Convertir en venta</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Seleccione el depósito del que se descargará el stock y el tipo de venta.
              </p>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">Depósito *</label>
                <select
                  value={convertForm.id_deposito}
                  onChange={e => setConvertForm(p => ({ ...p, id_deposito: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">— seleccionar —</option>
                  {depositos.map(d => (
                    <option key={d.id_deposito} value={d.id_deposito}>
                      {d.sucursal_nombre ? `${d.sucursal_nombre} — ${d.nombre}` : d.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">Tipo de venta</label>
                <div className="flex gap-2">
                  {['MENOR', 'MAYOR'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setConvertForm(p => ({ ...p, tipo_venta: t }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                        convertForm.tipo_venta === t
                          ? 'bg-yellow-400 border-yellow-400 text-zinc-900'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {t === 'MENOR' ? 'Por menor' : 'Por mayor'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">Condición de pago</label>
                <div className="flex gap-2">
                  {['CONTADO', 'CREDITO'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setConvertForm(p => ({ ...p, condicion_pago: t }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                        convertForm.condicion_pago === t
                          ? 'bg-yellow-400 border-yellow-400 text-zinc-900'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {t === 'CONTADO' ? 'Contado' : 'Crédito'}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowConvertir(false); setError(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConvertir}
                  disabled={!!procesando}
                  className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm disabled:opacity-60 transition-colors"
                >
                  {procesando === 'Convirtiendo' ? 'Convirtiendo...' : 'Confirmar y convertir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
