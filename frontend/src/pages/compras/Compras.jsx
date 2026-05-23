import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { comprasService } from '../../services/compras.service';
import { usePermission }  from '../../hooks/usePermission';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtFecha = s => s ? new Date(s).toLocaleDateString('es-BO') : '—';
const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const ESTADO_BADGE = {
  PRE_PEDIDO:  { label: 'Pre-pedido',  cls: 'bg-zinc-100  text-zinc-600  dark:bg-zinc-800  dark:text-zinc-400' },
  POR_LLEGAR:  { label: 'Por llegar',  cls: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400' },
  CONFIRMADO:  { label: 'Confirmado',  cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  PARCIAL:     { label: 'Parcial',     cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  RECIBIDO:    { label: 'Recibido',    cls: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400' },
  ANULADO:     { label: 'Anulado',     cls: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400' },
};

const ESTADOS = ['PRE_PEDIDO', 'POR_LLEGAR', 'PARCIAL', 'RECIBIDO', 'ANULADO'];

const HOY    = new Date().toISOString().slice(0, 10);
const HACE30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

export default function Compras() {
  const navigate = useNavigate();
  const { puede } = usePermission();
  const puedeCrear = puede('crear_pre_pedido', 'compras');

  const [compras,  setCompras]  = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtros,  setFiltros]  = useState({
    q: '', estado: '', fecha_desde: HACE30, fecha_hasta: HOY,
  });

  const cargar = async () => {
    setCargando(true);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''));
      const res = await comprasService.getAll(params);
      setCompras(res.data.compras ?? []);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  // Stats
  const stats = useMemo(() => {
    const pendientes = compras.filter(c => ['PRE_PEDIDO','POR_LLEGAR','PARCIAL'].includes(c.estado)).length;
    const saldoTotal = compras.reduce((s, c) => s + Number(c.saldo_pendiente ?? 0), 0);
    return { total: compras.length, pendientes, saldoTotal };
  }, [compras]);

  return (
    <div className="space-y-5">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Compras</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Gestión de órdenes de compra y pagos a proveedores
          </p>
        </div>
        {puedeCrear && (
          <button
            onClick={() => navigate('/compras/nueva')}
            className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
          >
            + Nueva compra
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total (filtro)</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-900/30 p-4">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Pendientes</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pendientes}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-200 dark:border-orange-900/30 p-4">
          <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">Saldo por pagar</p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{fmtMonto(stats.saldoTotal)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Buscar nº, proveedor…"
            value={filtros.q}
            onChange={e => setF('q', e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <select
            value={filtros.estado}
            onChange={e => setF('estado', e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_BADGE[e]?.label ?? e}</option>)}
          </select>
          <input type="date" value={filtros.fecha_desde} onChange={e => setF('fecha_desde', e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <div className="flex gap-2">
            <input type="date" value={filtros.fecha_hasta} onChange={e => setF('fecha_hasta', e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              onClick={cargar}
              className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
            >
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-20 text-zinc-400">Cargando compras…</div>
        ) : compras.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-2">
            <span className="text-4xl">🛒</span>
            <p className="text-sm">No hay compras para los filtros seleccionados</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                    {['Número', 'Proveedor', 'Fecha pedido', 'Est. llegada', 'Depósito', 'Total', 'Saldo', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {compras.map(c => {
                    const badge = ESTADO_BADGE[c.estado] ?? { label: c.estado, cls: 'bg-zinc-100 text-zinc-600' };
                    return (
                      <tr key={c.id_compra}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/compras/${c.id_compra}`)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-mono font-semibold text-zinc-900 dark:text-white">{c.numero}</p>
                          {c.numero_factura && <p className="text-[11px] text-zinc-400">F: {c.numero_factura}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-zinc-900 dark:text-white truncate max-w-[180px]">{c.proveedor_nombre}</p>
                          <p className="text-[11px] font-mono text-zinc-400">{c.proveedor_codigo}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{fmtFecha(c.fecha_pedido)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-500">{fmtFecha(c.fecha_estim_llegada)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{c.deposito_nombre}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-semibold text-zinc-900 dark:text-white">
                          {fmtMonto(c.total)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
                          <span className={Number(c.saldo_pendiente) > 0 ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-green-600 dark:text-green-400'}>
                            {fmtMonto(c.saldo_pendiente)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/compras/${c.id_compra}`); }}
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
              {compras.length} compra{compras.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
