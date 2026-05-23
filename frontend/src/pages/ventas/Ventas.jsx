import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ventasService } from '../../services/ventas.service';
import { usePermission } from '../../hooks/usePermission';

const fmtFecha = s => s ? new Date(s).toLocaleDateString('es-BO') : '—';
const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const ESTADO_BADGE = {
  BORRADOR:  { label: 'Borrador',  cls: 'bg-zinc-100  text-zinc-600  dark:bg-zinc-800  dark:text-zinc-400' },
  EMITIDA:   { label: 'Emitida',   cls: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400' },
  PAGADA:    { label: 'Pagada',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  PARCIAL:   { label: 'Parcial',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500' },
  ANULADA:   { label: 'Anulada',   cls: 'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400' },
  DEVUELTA:  { label: 'Devuelta',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

const HOY    = new Date().toISOString().slice(0, 10);
const HACE30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

export default function Ventas() {
  const navigate = useNavigate();
  const { puede } = usePermission();
  const puedeCrear = puede('crear_menor', 'ventas') || puede('crear_mayor', 'ventas');

  const [ventas,   setVentas]   = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtros,  setFiltros]  = useState({
    estado: '', tipo_venta: '', fecha_desde: HACE30, fecha_hasta: HOY, q: '',
  });

  const cargar = async () => {
    setCargando(true);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''));
      const res = await ventasService.getAll(params);
      setVentas(res.data.ventas ?? []);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const inputCls = 'px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  const total    = ventas.reduce((s, v) => s + Number(v.total ?? 0), 0);
  const pendiente = ventas.reduce((s, v) => s + Number(v.saldo_pendiente ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Ventas</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Gestión de ventas menor y mayor</p>
        </div>
        {puedeCrear && (
          <button
            onClick={() => navigate('/ventas/nueva')}
            className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
          >
            + Nueva venta
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total ventas</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-white">{ventas.length}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-900/30 p-4">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Emitidas</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {ventas.filter(v => v.estado === 'EMITIDA').length}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200 dark:border-green-900/30 p-4">
          <p className="text-xs text-green-600 dark:text-green-400 mb-1">Total Bs</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmtMonto(total)}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-200 dark:border-yellow-900/30 p-4">
          <p className="text-xs text-yellow-600 dark:text-yellow-500 mb-1">Por cobrar Bs</p>
          <p className="text-xl font-bold text-yellow-600 dark:text-yellow-500">{fmtMonto(pendiente)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select value={filtros.estado} onChange={e => setF('estado', e.target.value)} className={inputCls}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_BADGE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtros.tipo_venta} onChange={e => setF('tipo_venta', e.target.value)} className={inputCls}>
            <option value="">Menor y Mayor</option>
            <option value="MENOR">Al por menor</option>
            <option value="MAYOR">Al por mayor</option>
          </select>
          <input type="date" value={filtros.fecha_desde} onChange={e => setF('fecha_desde', e.target.value)} className={inputCls} />
          <input type="date" value={filtros.fecha_hasta} onChange={e => setF('fecha_hasta', e.target.value)} className={inputCls} />
          <div className="flex gap-2">
            <input
              type="text" placeholder="Buscar…" value={filtros.q}
              onChange={e => setF('q', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && cargar()}
              className={`flex-1 ${inputCls}`}
            />
            <button onClick={cargar} className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors">
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-20 text-zinc-400">Cargando…</div>
        ) : ventas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-2">
            <span className="text-4xl">🛒</span>
            <p className="text-sm">No hay ventas para los filtros seleccionados</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                    {['Número', 'Cliente', 'Tipo', 'Fecha', 'Total', 'Pendiente', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {ventas.map(v => {
                    const badge = ESTADO_BADGE[v.estado] ?? { label: v.estado, cls: 'bg-zinc-100 text-zinc-600' };
                    const clienteNombre = v.cliente_razon || `${v.cliente_nombres ?? ''} ${v.cliente_apellidos ?? ''}`.trim();
                    return (
                      <tr key={v.id_venta}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/ventas/${v.id_venta}`)}
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-white">{v.numero}</td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <p className="truncate text-zinc-900 dark:text-white font-medium">{clienteNombre}</p>
                          <p className="text-xs text-zinc-400">{v.cliente_codigo}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.tipo_venta === 'MAYOR' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                            {v.tipo_venta === 'MAYOR' ? 'Mayor' : 'Menor'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">{fmtFecha(v.fecha)}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-white">{fmtMonto(v.total)}</td>
                        <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                          {Number(v.saldo_pendiente) > 0
                            ? <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{fmtMonto(v.saldo_pendiente)}</span>
                            : <span className="text-green-600 dark:text-green-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/ventas/${v.id_venta}`); }}
                            className="text-xs text-zinc-500 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                          >
                            Ver →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-600">
              {ventas.length} venta{ventas.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
