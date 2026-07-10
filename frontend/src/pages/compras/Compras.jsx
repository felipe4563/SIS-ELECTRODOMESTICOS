import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { comprasService } from '../../services/compras.service';
import { usePermission }  from '../../hooks/usePermission';

const fmtFecha = s => s ? new Date(s).toLocaleDateString('es-BO') : '—';
const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const ESTADO_BADGE = {
  PRE_PEDIDO: { label: 'Pre-pedido', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  POR_LLEGAR: { label: 'Por llegar', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  CONFIRMADO: { label: 'Confirmado', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  PARCIAL:    { label: 'Parcial',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  RECIBIDO:   { label: 'Recibido',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ANULADO:    { label: 'Anulado',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const ESTADOS_FILTRO = ['PRE_PEDIDO', 'POR_LLEGAR', 'CONFIRMADO', 'PARCIAL', 'RECIBIDO', 'ANULADO'];

const PIPELINE = [
  { key: 'PRE_PEDIDO', label: 'Pre-pedido', dot: 'bg-zinc-400',   num: 'text-zinc-700 dark:text-zinc-300'   },
  { key: 'CONFIRMADO', label: 'Confirmado', dot: 'bg-indigo-500', num: 'text-indigo-600 dark:text-indigo-400' },
  { key: 'POR_LLEGAR', label: 'En camino',  dot: 'bg-blue-500',   num: 'text-blue-600 dark:text-blue-400'   },
  { key: 'PARCIAL',    label: 'Parcial',    dot: 'bg-amber-500',  num: 'text-amber-600 dark:text-amber-400' },
  { key: 'RECIBIDO',   label: 'Recibido',   dot: 'bg-green-500',  num: 'text-green-600 dark:text-green-400' },
];

const HOY    = new Date().toISOString().slice(0, 10);
const HACE30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

const inputCls = 'px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-shadow placeholder:text-zinc-400';

export default function Compras() {
  const navigate = useNavigate();
  const { puede } = usePermission();
  const puedeCrear    = puede('crear_pre_pedido', 'compras');
  const puedeVerTodas = puede('ver_todas', 'compras');

  const [compras,    setCompras]    = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [filtros,    setFiltros]    = useState({
    q: '', estado: '', fecha_desde: HACE30, fecha_hasta: HOY, id_sucursal: '',
  });

  const ejecutarBusqueda = async (overrideFiltros) => {
    setCargando(true);
    try {
      const f = overrideFiltros ?? filtros;
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
      const res = await comprasService.getAll(params);
      setCompras(res.data.compras ?? []);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  };

  useEffect(() => {
    ejecutarBusqueda();
    if (puedeVerTodas) {
      comprasService.getFormData()
        .then(({ data }) => setSucursales(data.sucursales ?? []))
        .catch(() => {});
    }
  }, []); // eslint-disable-line

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const handlePipeline = (key) => {
    const newEstado = filtros.estado === key ? '' : key;
    const next = { ...filtros, estado: newEstado };
    setFiltros(next);
    ejecutarBusqueda(next);
  };

  const stats = useMemo(() => {
    const byEstado = {};
    PIPELINE.forEach(s => { byEstado[s.key] = 0; });
    compras.forEach(c => { if (byEstado[c.estado] !== undefined) byEstado[c.estado]++; });
    const saldoTotal = compras.reduce((s, c) => s + Number(c.saldo_pendiente ?? 0), 0);
    return { byEstado, saldoTotal, total: compras.length };
  }, [compras]);

  return (
    <div className="space-y-5">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400 mb-1">
            Gestión de compras
          </p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">
            Órdenes de compra
          </h1>
          {!puedeVerTodas && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Solo tu sucursal</p>
          )}
        </div>
        {puedeCrear && (
          <button
            onClick={() => navigate('/compras/nueva')}
            className="self-start sm:mt-1 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-zinc-900 font-semibold text-sm transition-colors shadow-sm"
          >
            + Nueva compra
          </button>
        )}
      </div>

      {/* Pipeline — franja de etapas clickeable */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex divide-x divide-zinc-100 dark:divide-zinc-800">
          {PIPELINE.map(stage => {
            const activo = filtros.estado === stage.key;
            return (
              <button
                key={stage.key}
                onClick={() => handlePipeline(stage.key)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-4 px-2 transition-colors
                  ${activo
                    ? 'bg-amber-50 dark:bg-amber-900/10'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                <span className={`w-2 h-2 rounded-full transition-transform ${stage.dot} ${activo ? 'scale-125' : ''}`} />
                <span className={`text-2xl font-bold tabular-nums leading-none
                  ${activo ? 'text-amber-600 dark:text-amber-400' : stage.num}`}>
                  {cargando ? <span className="text-base text-zinc-300 dark:text-zinc-600">–</span> : stats.byEstado[stage.key]}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center leading-tight px-1">
                  {stage.label}
                </span>
              </button>
            );
          })}

          {/* Saldo total — separado visualmente */}
          <div className="flex-1 flex flex-col items-center justify-center gap-1 py-4 px-2 bg-orange-50/50 dark:bg-orange-900/5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400">Por pagar</span>
            <span className="text-lg font-bold text-orange-500 dark:text-orange-400 tabular-nums leading-none">
              {cargando ? '–' : fmtMonto(stats.saldoTotal)}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {stats.total} orden{stats.total !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Filtros — toolbar flotante, sin card */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Número, proveedor…"
          value={filtros.q}
          onChange={e => setF('q', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ejecutarBusqueda()}
          className={`${inputCls} min-w-[160px] flex-1 sm:flex-none`}
        />
        <select
          value={filtros.estado}
          onChange={e => setF('estado', e.target.value)}
          className={inputCls}
        >
          <option value="">Todos los estados</option>
          {ESTADOS_FILTRO.map(e => (
            <option key={e} value={e}>{ESTADO_BADGE[e]?.label ?? e}</option>
          ))}
        </select>
        {puedeVerTodas && (
          <select
            value={filtros.id_sucursal}
            onChange={e => setF('id_sucursal', e.target.value)}
            className={inputCls}
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map(s => (
              <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
            ))}
          </select>
        )}
        <input type="date" value={filtros.fecha_desde}
          onChange={e => setF('fecha_desde', e.target.value)} className={inputCls} />
        <input type="date" value={filtros.fecha_hasta}
          onChange={e => setF('fecha_hasta', e.target.value)} className={inputCls} />
        <button
          onClick={() => ejecutarBusqueda()}
          className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-zinc-900 font-semibold text-sm transition-colors"
        >
          Buscar
        </button>
      </div>

      {/* Resultados */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center gap-2.5 py-20 text-sm text-zinc-400">
            <span className="w-4 h-4 border-2 border-zinc-200 border-t-amber-400 rounded-full animate-spin" />
            Cargando órdenes…
          </div>
        ) : compras.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
            <span className="text-3xl">📦</span>
            <p className="text-sm">Sin órdenes para estos filtros</p>
            <button
              onClick={() => {
                const limpios = { q: '', estado: '', fecha_desde: HACE30, fecha_hasta: HOY, id_sucursal: '' };
                setFiltros(limpios);
                ejecutarBusqueda(limpios);
              }}
              className="text-xs text-amber-500 hover:text-amber-600 underline underline-offset-2 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            {/* Tabla — desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    {[
                      'Número', 'Proveedor',
                      ...(puedeVerTodas ? ['Sucursal'] : []),
                      'Pedido', 'Llegada est.', 'Depósito',
                      'Total', 'Saldo', 'Estado', '',
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
                  {compras.map(c => {
                    const badge = ESTADO_BADGE[c.estado] ?? { label: c.estado, cls: 'bg-zinc-100 text-zinc-600' };
                    return (
                      <tr
                        key={c.id_compra}
                        onClick={() => navigate(`/compras/${c.id_compra}`)}
                        className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                      >
                        {/* Celda con borde ámbar en hover — signature */}
                        <td className="pl-4 pr-3 py-3 border-l-2 border-transparent group-hover:border-amber-400 transition-colors">
                          <p className="font-mono font-semibold text-[13px] text-zinc-900 dark:text-white">{c.numero}</p>
                          {c.numero_factura && (
                            <p className="text-[10px] font-mono text-zinc-400 mt-0.5">F: {c.numero_factura}</p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-zinc-900 dark:text-white truncate max-w-[160px]">{c.proveedor_nombre}</p>
                          <p className="text-[10px] font-mono text-zinc-400 mt-0.5">{c.proveedor_codigo}</p>
                        </td>
                        {puedeVerTodas && (
                          <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {c.sucursal_nombre}
                          </td>
                        )}
                        <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {fmtFecha(c.fecha_pedido)}
                        </td>
                        <td className="px-3 py-3 text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                          {fmtFecha(c.fecha_estim_llegada)}
                        </td>
                        <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {c.deposito_nombre}
                        </td>
                        <td className="px-3 py-3 text-right text-[13px] font-mono font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                          {fmtMonto(c.total)}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <span className={`text-[13px] font-mono font-semibold ${
                            Number(c.saldo_pendiente) > 0
                              ? 'text-orange-500 dark:text-orange-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {fmtMonto(c.saldo_pendiente)}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-zinc-400 group-hover:text-amber-500 transition-colors">
                            Ver →
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards — móvil */}
            <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {compras.map(c => {
                const badge = ESTADO_BADGE[c.estado] ?? { label: c.estado, cls: 'bg-zinc-100 text-zinc-600' };
                return (
                  <button
                    key={c.id_compra}
                    onClick={() => navigate(`/compras/${c.id_compra}`)}
                    className="w-full text-left px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors border-l-2 border-transparent hover:border-amber-400"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-mono font-bold text-[13px] text-zinc-900 dark:text-white">{c.numero}</p>
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-0.5 leading-tight">{c.proveedor_nombre}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-400 mb-2">
                      <span>{fmtFecha(c.fecha_pedido)}</span>
                      {c.deposito_nombre && <span>· {c.deposito_nombre}</span>}
                      {puedeVerTodas && c.sucursal_nombre && <span>· {c.sucursal_nombre}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">{fmtMonto(c.total)}</span>
                      {Number(c.saldo_pendiente) > 0 && (
                        <span className="text-xs font-mono text-orange-500 dark:text-orange-400">
                          Saldo: {fmtMonto(c.saldo_pendiente)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 dark:text-zinc-600">
              {compras.length} orden{compras.length !== 1 ? 'es' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
