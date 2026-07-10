import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cotizacionesService } from '../../services/cotizaciones.service';
import { usePermission } from '../../hooks/usePermission';

const ESTADOS = ['BORRADOR', 'EMITIDA', 'APROBADA', 'RECHAZADA', 'CONVERTIDA', 'VENCIDA', 'ANULADA'];

const BADGE = {
  BORRADOR:   'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  EMITIDA:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  APROBADA:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  RECHAZADA:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  VENCIDA:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  CONVERTIDA: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  ANULADA:    'bg-red-50 text-red-400 dark:bg-red-900/10 dark:text-red-500',
};

const BORDER = {
  BORRADOR:   'border-l-zinc-300 dark:border-l-zinc-600',
  EMITIDA:    'border-l-blue-400',
  APROBADA:   'border-l-green-400',
  RECHAZADA:  'border-l-red-400',
  CONVERTIDA: 'border-l-yellow-400',
  VENCIDA:    'border-l-orange-400',
  ANULADA:    'border-l-zinc-200 dark:border-l-zinc-700',
};

const fmt      = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fmtFecha = s => s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-BO') : '—';

const PAGE_SIZE = 25;

function Spinner() {
  return <div className="w-5 h-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-yellow-400 rounded-full animate-spin" />;
}

export default function Cotizaciones() {
  const navigate       = useNavigate();
  const { puede }      = usePermission();
  const [sucursales, setSucursales] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [total, setTotal]  = useState(0);
  const [cargando, setCargando] = useState(true);
  const [err, setErr]      = useState('');

  const [filtros, setFiltros] = useState({
    q: '', estado: '', tipo_cotizacion: '', id_sucursal: '',
    fecha_desde: '', fecha_hasta: '', page: 1,
  });

  // Cargar sucursales para el filtro (solo si tiene ver_todas)
  useEffect(() => {
    if (!puede('ver_todas', 'cotizaciones')) return;
    cotizacionesService.getFormData()
      .then(r => setSucursales(r.data.sucursales || []))
      .catch(() => {});
  }, [puede]);

  const cargar = useCallback(async () => {
    setCargando(true); setErr('');
    try {
      const params = { limit: PAGE_SIZE };
      Object.entries(filtros).forEach(([k, v]) => { if (v !== '') params[k] = v; });
      const r = await cotizacionesService.getAll(params);
      setCotizaciones(r.data.cotizaciones ?? []);
      setTotal(r.data.total ?? 0);
    } catch { setErr('Error al cargar cotizaciones'); }
    finally { setCargando(false); }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v, page: 1 }));
  const limpiar = () => setFiltros({ q: '', estado: '', tipo_cotizacion: '', id_sucursal: '', fecha_desde: '', fecha_hasta: '', page: 1 });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const FC = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-zinc-400 dark:placeholder-zinc-500';

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Cotizaciones</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Gestión de propuestas comerciales</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {puede('crear', 'cotizaciones') && (
            <button
              onClick={() => navigate('/cotizaciones/nueva')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 transition-colors shadow-sm"
            >
              + Nueva cotización
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2.5">
          <span className="w-0.5 h-4 rounded-full bg-yellow-400" />
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Filtros</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <input
            className={`${FC} sm:col-span-2 lg:col-span-1`}
            placeholder="Buscar número o cliente..."
            value={filtros.q}
            onChange={e => setF('q', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cargar()}
          />
          <select className={FC} value={filtros.estado} onChange={e => setF('estado', e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={FC} value={filtros.tipo_cotizacion} onChange={e => setF('tipo_cotizacion', e.target.value)}>
            <option value="">Contado y crédito</option>
            <option value="CONTADO">CONTADO</option>
            <option value="CREDITO">CRÉDITO</option>
          </select>
          {puede('ver_todas', 'cotizaciones') && (
            <select className={FC} value={filtros.id_sucursal} onChange={e => setF('id_sucursal', e.target.value)}>
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
            </select>
          )}
          <input type="date" className={FC} value={filtros.fecha_desde} onChange={e => setF('fecha_desde', e.target.value)} />
          <input type="date" className={FC} value={filtros.fecha_hasta} onChange={e => setF('fecha_hasta', e.target.value)} />
          <button
            onClick={limpiar}
            className="px-3 py-2 rounded-xl text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Conteo */}
      <div className="px-1">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold text-zinc-900 dark:text-white">{total}</span>{' '}
          cotización{total !== 1 ? 'es' : ''} encontrada{total !== 1 ? 's' : ''}
        </p>
      </div>

      {err && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3">
          {err}
        </div>
      )}

      {/* Lista */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">

        {/* Desktop tabla (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">N°</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide hidden lg:table-cell">Sucursal</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Fecha</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide hidden xl:table-cell">Vence</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide hidden xl:table-cell">Tipo</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Total</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {cargando ? (
                <tr><td colSpan={8} className="py-14">
                  <div className="flex items-center justify-center gap-2.5 text-zinc-400"><Spinner /><span className="text-sm">Cargando...</span></div>
                </td></tr>
              ) : cotizaciones.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-14 text-sm text-zinc-400">Sin cotizaciones registradas</td></tr>
              ) : cotizaciones.map(c => (
                <tr
                  key={c.id_cotizacion}
                  onClick={() => navigate(`/cotizaciones/${c.id_cotizacion}`)}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-zinc-900 dark:text-white whitespace-nowrap">{c.numero}</td>
                  <td className="px-5 py-3.5 max-w-[200px]">
                    <p className="font-medium text-zinc-900 dark:text-white truncate">
                      {c.cliente_razon || `${c.cliente_nombres ?? ''} ${c.cliente_apellidos ?? ''}`.trim()}
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{c.cliente_codigo}</p>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">{c.sucursal_nombre}</td>
                  <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    <p className="text-xs">{fmtFecha(c.fecha)}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{c.vendedor_nombre}</p>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap hidden xl:table-cell">
                    {c.fecha_vencimiento ? fmtFecha(c.fecha_vencimiento) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400 hidden xl:table-cell">{c.tipo_cotizacion}</td>
                  <td className="px-5 py-3.5 text-right font-semibold font-mono text-zinc-900 dark:text-white whitespace-nowrap">
                    Bs {fmt(c.total)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${BADGE[c.estado] ?? 'bg-zinc-100 text-zinc-500'}`}>
                      {c.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards (< md) */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {cargando ? (
            <div className="flex items-center justify-center gap-2.5 py-12 text-zinc-400"><Spinner /><span className="text-sm">Cargando...</span></div>
          ) : cotizaciones.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">Sin cotizaciones registradas</div>
          ) : cotizaciones.map(c => (
            <button
              key={c.id_cotizacion}
              onClick={() => navigate(`/cotizaciones/${c.id_cotizacion}`)}
              className={`w-full text-left flex border-l-4 ${BORDER[c.estado] ?? 'border-l-zinc-200'} hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors`}
            >
              <div className="flex-1 px-4 py-3.5 space-y-1.5 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-white pt-0.5">{c.numero}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${BADGE[c.estado] ?? ''}`}>{c.estado}</span>
                </div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                  {c.cliente_razon || `${c.cliente_nombres ?? ''} ${c.cliente_apellidos ?? ''}`.trim()}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{c.sucursal_nombre} · {c.tipo_cotizacion}</p>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">{fmtFecha(c.fecha)}</span>
                  <span className="font-bold font-mono text-sm text-zinc-900 dark:text-white">Bs {fmt(c.total)}</span>
                </div>
              </div>
              <div className="flex items-center justify-center px-3 text-zinc-300 dark:text-zinc-600 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
            <button
              onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))}
              disabled={filtros.page <= 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Pág. <span className="font-semibold text-zinc-900 dark:text-white">{filtros.page}</span> de{' '}
              <span className="font-semibold text-zinc-900 dark:text-white">{totalPages}</span>
              {' '}· {total} registros
            </span>
            <button
              onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))}
              disabled={filtros.page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
