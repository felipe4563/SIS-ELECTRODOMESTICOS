import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { cotizacionesService }   from '../../services/cotizaciones.service';
import { depositosService }      from '../../services/configuracion.service';
import { descargarCotizacionPDF } from './CotizacionPDF';
import { useEmpresa }            from '../../contexts/EmpresaContext';

const ESTADO_BADGE = {
  BORRADOR:   'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  EMITIDA:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  APROBADA:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  RECHAZADA:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  VENCIDA:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  CONVERTIDA: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fmtFecha = s => s ? new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate  = s => s ? new Date(s).toLocaleDateString('es-BO') : '—';

export default function CotizacionDetalle() {
  const navigate = useNavigate();
  const { id }   = useParams();

  const [cot,         setCot]         = useState(null);
  const [depositos,   setDepositos]   = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [error,       setError]       = useState('');
  const [procesando,  setProcesando]  = useState('');
  const [descargando, setDescargando] = useState(false);
  const { logoUrl } = useEmpresa() ?? {};

  // Modal convertir
  const [showConvertir, setShowConvertir] = useState(false);
  const [convertForm,   setConvertForm]   = useState({ id_deposito: '', tipo_venta: 'MENOR', condicion_pago: 'CONTADO' });

  const cargar = () => {
    setCargando(true);
    cotizacionesService.getOne(id)
      .then(r => setCot(r.data))
      .catch(() => navigate('/cotizaciones'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    depositosService.getAll().then(r => {
      setDepositos((r.data.depositos ?? r.data ?? []).filter(d => d.activo && d.permite_venta));
    }).catch(() => {});
  }, [id]); // eslint-disable-line

  const accion = async (fn, label) => {
    if (!confirm(`¿Confirmar: ${label}?`)) return;
    setProcesando(label);
    setError('');
    try { await fn(); cargar(); }
    catch (err) { setError(err.response?.data?.mensaje ?? `Error: ${label}`); }
    finally { setProcesando(''); }
  };

  const handleConvertir = async () => {
    if (!convertForm.id_deposito) return setError('Seleccioná un depósito para descargar stock');
    setProcesando('Convirtiendo');
    setError('');
    try {
      const r = await cotizacionesService.convertir(id, convertForm);
      setShowConvertir(false);
      navigate(`/ventas/${r.data.id_venta}`);
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al convertir');
    } finally {
      setProcesando('');
    }
  };

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!cot)     return null;

  const clienteNombre = cot.cliente_razon || `${cot.cliente_nombres} ${cot.cliente_apellidos}`;
  const estado = cot.estado;

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Breadcrumb */}
      <div>
        <button onClick={() => navigate('/cotizaciones')}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mb-1">
          ← Cotizaciones
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">{cot.numero}</h1>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${ESTADO_BADGE[estado] ?? ''}`}>
              {estado}
            </span>
          </div>
          {/* Botones de acción */}
          <div className="flex flex-wrap gap-2">
            {estado === 'BORRADOR' && (
              <>
                <button onClick={() => navigate(`/cotizaciones/${id}/editar`)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  Modificar
                </button>
                <button disabled={!!procesando}
                  onClick={() => accion(() => cotizacionesService.emitir(id), 'Emitir')}
                  className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-60 transition-colors">
                  Emitir
                </button>
              </>
            )}
            {estado === 'EMITIDA' && (
              <>
                <button disabled={!!procesando}
                  onClick={() => accion(() => cotizacionesService.aprobar(id), 'Aprobar')}
                  className="px-3 py-2 rounded-xl text-sm font-semibold bg-green-500 hover:bg-green-600 text-white disabled:opacity-60 transition-colors">
                  Aprobar
                </button>
                <button disabled={!!procesando}
                  onClick={() => accion(() => cotizacionesService.rechazar(id), 'Rechazar')}
                  className="px-3 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-60 transition-colors">
                  Rechazar
                </button>
              </>
            )}
            {estado === 'APROBADA' && !cot.id_venta_generada && (
              <>
                <button disabled={!!procesando}
                  onClick={() => accion(() => cotizacionesService.rechazar(id), 'Rechazar')}
                  className="px-3 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-60 transition-colors">
                  Rechazar
                </button>
                <button disabled={!!procesando}
                  onClick={() => setShowConvertir(true)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-60 transition-colors">
                  Convertir en venta
                </button>
              </>
            )}
            <button
              disabled={descargando}
              onClick={async () => {
                setDescargando(true);
                try { await descargarCotizacionPDF(id, logoUrl); }
                catch { setError('Error al generar el PDF'); }
                finally { setDescargando(false); }
              }}
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-yellow-400 hover:bg-yellow-500 text-zinc-900 disabled:opacity-60 transition-colors">
              {descargando ? 'Generando…' : 'Descargar PDF'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Info venta generada */}
      {cot.id_venta_generada && (
        <div className="px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-sm text-purple-700 dark:text-purple-300 flex items-center gap-3">
          <span>Esta cotización fue convertida en venta.</span>
          <Link to={`/ventas/${cot.id_venta_generada}`}
            className="underline font-semibold hover:text-purple-900 dark:hover:text-purple-100">
            Ver venta generada →
          </Link>
        </div>
      )}

      {/* Datos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cliente */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cliente</p>
          <p className="font-semibold text-zinc-900 dark:text-white">{clienteNombre}</p>
          {cot.cliente_documento && <p className="text-sm text-zinc-500">{cot.tipo_documento}: {cot.cliente_documento}</p>}
          {cot.cliente_telefono  && <p className="text-sm text-zinc-500">Tel: {cot.cliente_telefono}</p>}
          {cot.cliente_email     && <p className="text-sm text-zinc-500">{cot.cliente_email}</p>}
        </div>

        {/* Datos cotización */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cotización</p>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500">Sucursal</dt><dd className="font-medium text-zinc-900 dark:text-white">{cot.sucursal_nombre}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Tipo</dt><dd className="font-medium text-zinc-900 dark:text-white">{cot.tipo_cotizacion === 'CREDITO' ? 'Crédito' : 'Contado'}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Fecha</dt><dd className="font-medium text-zinc-900 dark:text-white">{fmtFecha(cot.fecha)}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Válida hasta</dt><dd className="font-medium text-zinc-900 dark:text-white">{fmtDate(cot.fecha_vencimiento)}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Moneda</dt><dd className="font-medium text-zinc-900 dark:text-white">{cot.moneda_simbolo}</dd></div>
          </dl>
        </div>

        {/* Vendedor */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Vendedor</p>
          <p className="font-semibold text-zinc-900 dark:text-white">{cot.vendedor_nombre}</p>
          {cot.observaciones && (
            <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500 mb-1">Observaciones</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{cot.observaciones}</p>
            </div>
          )}
        </div>
      </div>

      {/* Detalle */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Detalle de productos</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Producto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">Cantidad</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Precio unit.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Desc %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(cot.detalle ?? []).map((d, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900 dark:text-white text-sm">{d.producto}</p>
                    <p className="text-xs text-zinc-400">{d.codigo_interno}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300 hidden sm:table-cell">
                    {fmtMonto(d.cantidad)} {d.unidad_nombre}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300 hidden md:table-cell">
                    Bs {fmtMonto(d.precio_unitario)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500 hidden md:table-cell">
                    {d.descuento_porc > 0 ? `${d.descuento_porc}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900 dark:text-white">
                    Bs {fmtMonto(d.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm min-w-[240px]">
            <dt className="text-zinc-500">Subtotal:</dt>
            <dd className="text-right font-mono text-zinc-900 dark:text-white">Bs {fmtMonto(cot.subtotal)}</dd>
            {Number(cot.descuento_porc) > 0 && <>
              <dt className="text-zinc-500">Descuento ({cot.descuento_porc}%):</dt>
              <dd className="text-right font-mono text-red-500">-Bs {fmtMonto(cot.descuento_monto)}</dd>
            </>}
            {Number(cot.impuesto) > 0 && <>
              <dt className="text-zinc-500">Impuesto:</dt>
              <dd className="text-right font-mono text-zinc-700 dark:text-zinc-300">Bs {fmtMonto(cot.impuesto)}</dd>
            </>}
            <dt className="text-base font-bold text-zinc-900 dark:text-white">Total:</dt>
            <dd className="text-right text-base font-bold font-mono text-zinc-900 dark:text-white">Bs {fmtMonto(cot.total)}</dd>
          </dl>
        </div>
      </div>

      {/* Modal convertir */}
      {showConvertir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Convertir en venta</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Seleccioná el depósito del que se descargará el stock y el tipo de venta.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Depósito *</label>
              <select value={convertForm.id_deposito}
                onChange={e => setConvertForm(p => ({ ...p, id_deposito: e.target.value }))}
                className={inputCls}>
                <option value="">— seleccionar —</option>
                {depositos.map(d => <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Tipo de venta</label>
              <div className="flex gap-2">
                {['MENOR', 'MAYOR'].map(t => (
                  <button key={t}
                    onClick={() => setConvertForm(p => ({ ...p, tipo_venta: t }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      convertForm.tipo_venta === t
                        ? 'bg-yellow-400 border-yellow-400 text-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}>
                    {t === 'MENOR' ? 'Al por menor' : 'Al por mayor'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Condición de pago</label>
              <div className="flex gap-2">
                {['CONTADO', 'CREDITO'].map(t => (
                  <button key={t}
                    onClick={() => setConvertForm(p => ({ ...p, condicion_pago: t }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      convertForm.condicion_pago === t
                        ? 'bg-yellow-400 border-yellow-400 text-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}>
                    {t === 'CONTADO' ? 'Contado' : 'Crédito'}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={handleConvertir} disabled={!!procesando}
                className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm disabled:opacity-60 transition-colors">
                {procesando ? 'Convirtiendo…' : 'Confirmar y convertir'}
              </button>
              <button onClick={() => { setShowConvertir(false); setError(''); }}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
