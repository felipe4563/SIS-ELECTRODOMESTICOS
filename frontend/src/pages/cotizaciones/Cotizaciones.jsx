import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cotizacionesService } from '../../services/cotizaciones.service';

const ESTADO_BADGE = {
  BORRADOR:   'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  EMITIDA:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  APROBADA:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  RECHAZADA:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  VENCIDA:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  CONVERTIDA: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fmtFecha = s => s ? new Date(s).toLocaleDateString('es-BO') : '—';
const fmtHora  = s => s ? new Date(s).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '';

const PAGE_SIZE = 20;

export default function Cotizaciones() {
  const navigate = useNavigate();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [total, setTotal]       = useState(0);
  const [page,  setPage]        = useState(1);
  const [cargando, setCargando] = useState(true);

  const [filtros, setFiltros] = useState({
    q: '', estado: '', tipo_cotizacion: '', fecha_desde: '', fecha_hasta: '',
  });

  const cargar = useCallback(async (pg = 1) => {
    setCargando(true);
    try {
      const params = { ...filtros, page: pg, limit: PAGE_SIZE };
      Object.keys(params).forEach(k => params[k] === '' && delete params[k]);
      const r = await cotizacionesService.getAll(params);
      setCotizaciones(r.data.cotizaciones ?? []);
      setTotal(r.data.total ?? 0);
      setPage(pg);
    } catch {
      setCotizaciones([]);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(1); }, [cargar]);

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const inputCls = 'px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Cotizaciones</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{total} registro(s)</p>
        </div>
        <button
          onClick={() => navigate('/cotizaciones/nueva')}
          className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
        >
          + Nueva cotización
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            className={`${inputCls} lg:col-span-2`}
            placeholder="Buscar número, cliente…"
            value={filtros.q}
            onChange={e => setF('q', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cargar(1)}
          />
          <select className={inputCls} value={filtros.estado} onChange={e => setF('estado', e.target.value)}>
            <option value="">Todos los estados</option>
            {['BORRADOR','EMITIDA','APROBADA','RECHAZADA','VENCIDA','CONVERTIDA'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className={inputCls} value={filtros.tipo_cotizacion} onChange={e => setF('tipo_cotizacion', e.target.value)}>
            <option value="">Contado / Crédito</option>
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Crédito</option>
          </select>
          <div className="flex gap-2">
            <input type="date" className={inputCls + ' flex-1'} value={filtros.fecha_desde}
              onChange={e => setF('fecha_desde', e.target.value)} />
            <input type="date" className={inputCls + ' flex-1'} value={filtros.fecha_hasta}
              onChange={e => setF('fecha_hasta', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => cargar(1)}
            className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors">
            Buscar
          </button>
          <button onClick={() => { setFiltros({ q: '', estado: '', tipo_cotizacion: '', fecha_desde: '', fecha_hasta: '' }); }}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition-colors">
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">N°</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">Vence</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={7} className="text-center py-16 text-zinc-400">Cargando…</td></tr>
              ) : cotizaciones.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-zinc-400">Sin resultados</td></tr>
              ) : cotizaciones.map(c => (
                <tr key={c.id_cotizacion}
                  onClick={() => navigate(`/cotizaciones/${c.id_cotizacion}`)}
                  className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-900 dark:text-white">{c.numero}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900 dark:text-white text-sm">
                      {c.cliente_razon || `${c.cliente_nombres} ${c.cliente_apellidos}`}
                    </p>
                    <p className="text-xs text-zinc-400">{c.cliente_codigo}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-zinc-600 dark:text-zinc-400">
                    <p className="text-xs">{fmtFecha(c.fecha)}</p>
                    <p className="text-xs text-zinc-400">{fmtHora(c.fecha)}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-zinc-500 dark:text-zinc-400">
                    {c.fecha_vencimiento ? fmtFecha(c.fecha_vencimiento) : '—'}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {c.tipo_cotizacion === 'CREDITO' ? 'Crédito' : 'Contado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900 dark:text-white">
                    Bs {fmtMonto(c.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ESTADO_BADGE[c.estado] ?? ''}`}>
                      {c.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Página {page} de {totalPages} · {total} registros
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => cargar(page - 1)} disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                &lt; Anterior
              </button>
              <button
                onClick={() => cargar(page + 1)} disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Siguiente &gt;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
