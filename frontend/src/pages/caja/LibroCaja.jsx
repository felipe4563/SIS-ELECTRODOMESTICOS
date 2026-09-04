import { useState, useEffect } from 'react';
import { cajaService } from '../../services/caja.service';
import { sucursalesService } from '../../services/configuracion.service';
import { usePermission } from '../../hooks/usePermission';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtFecha = s => s ? new Date(s).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const ORIGEN_BADGE = {
  VENTA:  { label: 'Venta',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  COMPRA: { label: 'Compra',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  GASTO:  { label: 'Gasto',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

const HOY   = new Date().toISOString().slice(0, 10);
const HACE30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

const METODOS_PAGO = [
  'EFECTIVO', 'QR', 'TRANSFERENCIA', 'TARJETA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'CHEQUE', 'OTRO',
];

// ── Componente principal ─────────────────────────────────────────────────────
export default function LibroCaja() {
  const { puede } = usePermission();
  const verTodos = puede('ver_arqueo_todos', 'caja');

  const [filtros, setFiltros] = useState({
    id_sucursal: '', fecha_desde: HACE30, fecha_hasta: HOY, metodo_pago: '',
  });

  const [sucursales, setSucursales] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [totales, setTotales] = useState({ ingresos: 0, egresos: 0, saldo: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(false);
  const LIMIT = 20;

  useEffect(() => {
    if (verTodos) {
      sucursalesService.getAll().then(r => setSucursales(r.data.sucursales ?? r.data ?? [])).catch(() => {});
    }
  }, [verTodos]);

  const buscar = async (p = 1) => {
    setCargando(true);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''));
      const res = await cajaService.getLibroCaja({ ...params, page: p, limit: LIMIT });
      setMovimientos(res.data.movimientos ?? []);
      setTotales(res.data.totales ?? { ingresos: 0, egresos: 0, saldo: 0 });
      setTotal(res.data.total ?? 0);
      setPage(res.data.page ?? p);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  };

  // Búsqueda automática al entrar y cada vez que cambian los filtros (con
  // debounce), reseteando a la página 1 — ya no hace falta tocar "Buscar".
  useEffect(() => {
    const t = setTimeout(() => { buscar(1); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  const totalPages = Math.ceil(total / LIMIT);

  const set = (k, v) => setFiltros(prev => ({ ...prev, [k]: v }));

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  return (
    <div className="space-y-5">

      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Libro Caja</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Ingresos y egresos — ventas, pagos a proveedores y gastos, por cualquier método de pago
        </p>
      </div>

      {/* Panel de filtros */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-4">Filtros</p>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${verTodos ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>

          {verTodos && (
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Sucursal</label>
              <select value={filtros.id_sucursal} onChange={e => set('id_sucursal', e.target.value)} className={inputCls}>
                <option value="">Todas las sucursales</option>
                {sucursales.map(s => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Fecha desde</label>
            <input type="date" value={filtros.fecha_desde} onChange={e => set('fecha_desde', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Fecha hasta</label>
            <input type="date" value={filtros.fecha_hasta} onChange={e => set('fecha_hasta', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Método de pago</label>
            <select value={filtros.metodo_pago} onChange={e => set('metodo_pago', e.target.value)} className={inputCls}>
              <option value="">Todos los métodos</option>
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => buscar(1)}
              disabled={cargando}
              className="w-full px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm disabled:opacity-50 transition-colors"
            >
              {cargando ? 'Buscando…' : '↻ Actualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Ingresos</p>
          <p className="text-xl font-bold font-mono text-green-600 dark:text-green-400 mt-1">Bs {fmtMonto(totales.ingresos)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Egresos</p>
          <p className="text-xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">Bs {fmtMonto(totales.egresos)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Saldo neto</p>
          <p className={`text-xl font-bold font-mono mt-1 ${totales.saldo >= 0 ? 'text-zinc-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
            Bs {fmtMonto(totales.saldo)}
          </p>
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-20 text-zinc-400">Cargando movimientos…</div>
        ) : movimientos.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-zinc-400">Sin movimientos para los filtros seleccionados</div>
        ) : (
          <>
            {/* ── Tabla — md+ ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                    {['Fecha', 'Origen', 'Documento', 'Referencia', 'Método', 'Monto', 'Saldo'].map(h => (
                      <th
                        key={h}
                        className={`text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap ${
                          h === 'Referencia'
                            ? 'sticky left-0 z-10 w-[220px] bg-zinc-50 dark:bg-zinc-800/60 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]'
                            : ''
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {movimientos.map(m => {
                    const badge = ORIGEN_BADGE[m.origen] ?? { label: m.origen, cls: 'bg-zinc-100 text-zinc-600' };
                    const esIngreso = m.tipo === 'INGRESO';
                    return (
                      <tr key={m.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600 dark:text-zinc-400 text-xs">{fmtFecha(m.fecha)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <p className="text-zinc-700 dark:text-zinc-300 font-mono text-xs">{m.numero}</p>
                          {m.documento && <p className="text-[11px] text-zinc-400">{m.documento}</p>}
                        </td>
                        <td className="sticky left-0 z-10 px-4 py-2.5 whitespace-nowrap w-[220px] bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/40 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                          <p className="text-zinc-800 dark:text-zinc-200 truncate" title={m.referencia ?? ''}>{m.referencia || '—'}</p>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">{m.metodo_pago}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono font-semibold">
                          <span className={esIngreso ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {esIngreso ? '+' : '−'}{fmtMonto(m.monto)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono font-semibold text-zinc-900 dark:text-white">
                          {fmtMonto(m.saldo)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Tarjetas — móvil < md ── */}
            <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {movimientos.map(m => {
                const badge = ORIGEN_BADGE[m.origen] ?? { label: m.origen, cls: 'bg-zinc-100 text-zinc-600' };
                const esIngreso = m.tipo === 'INGRESO';
                return (
                  <div key={m.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">{fmtFecha(m.fecha)}</span>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white leading-snug">{m.referencia || '—'}</p>
                      <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                        {m.numero}{m.documento && ` · ${m.documento}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Monto</p>
                        <p className={`font-mono font-bold text-sm ${esIngreso ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {esIngreso ? '+' : '−'}{fmtMonto(m.monto)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Saldo</p>
                        <p className="font-mono font-semibold text-sm text-zinc-900 dark:text-white">{fmtMonto(m.saldo)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Método</p>
                        <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{m.metodo_pago}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginación desktop */}
            {totalPages > 1 && (
              <div className="hidden md:flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}</span>
                  {' '}de{' '}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{total}</span>
                </p>
                <div className="flex gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => buscar(page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >← Anterior</button>
                  <span className="px-3 py-1.5 text-xs text-zinc-400">{page} / {totalPages}</span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => buscar(page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >Siguiente →</button>
                </div>
              </div>
            )}

            {/* Paginación mobile */}
            {totalPages > 1 && (
              <div className="md:hidden flex items-center justify-between gap-3 px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  disabled={page === 1}
                  onClick={() => buscar(page - 1)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >← Anterior</button>
                <span className="text-xs text-zinc-500 shrink-0 font-mono">{page}/{totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => buscar(page + 1)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >Siguiente →</button>
              </div>
            )}

            <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-600">
              {total} movimiento{total !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
