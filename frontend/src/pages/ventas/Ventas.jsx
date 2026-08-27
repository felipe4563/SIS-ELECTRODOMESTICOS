import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ventasService } from '../../services/ventas.service';
import { cajaService } from '../../services/caja.service';
import { usePermission } from '../../hooks/usePermission';

const fmtFecha = s => s ? new Date(s).toLocaleDateString('es-BO') : '—';
const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

/* ─── Íconos mínimos (outline, consistentes con el resto de la app) ──────── */
function Ic({ id, size = 15, className = '' }) {
  const paths = {
    ticket:  <path d="M3 9a2 2 0 002-2V6a2 2 0 00-2-2v0a2 2 0 00-2 2v1a2 2 0 002 2zm0 0a2 2 0 00-2 2v1a2 2 0 002 2v0a2 2 0 002-2v-1a2 2 0 00-2-2M8 6h13M8 12h13M8 18h13M3 15a2 2 0 002 2v0a2 2 0 002-2v-1a2 2 0 00-2-2 2 2 0 00-2 2z" />,
    clock:   <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
    cash:    <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 6v0M18 6v0M6 18v0M18 18v0" /></>,
    alert:   <><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></>,
    plus:    <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search:  <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    empty:   <path d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}
      fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {paths[id]}
    </svg>
  );
}

const ESTADO_BADGE = {
  BORRADOR:  { label: 'Borrador',  cls: 'bg-zinc-100  text-zinc-600  dark:bg-zinc-800  dark:text-zinc-400',  accent: 'bg-zinc-300 dark:bg-zinc-600',  chipOn: 'bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900' },
  EMITIDA:   { label: 'Emitida',   cls: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',   accent: 'bg-blue-400',   chipOn: 'bg-blue-500 text-white' },
  PAGADA:    { label: 'Pagada',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', accent: 'bg-green-400',  chipOn: 'bg-green-500 text-white' },
  PARCIAL:   { label: 'Parcial',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500', accent: 'bg-yellow-400', chipOn: 'bg-yellow-500 text-zinc-900' },
  ANULADA:   { label: 'Anulada',   cls: 'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400',   accent: 'bg-red-400',    chipOn: 'bg-red-500 text-white' },
  DEVUELTA:  { label: 'Devuelta',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', accent: 'bg-purple-400', chipOn: 'bg-purple-500 text-white' },
};

const HOY    = new Date().toISOString().slice(0, 10);
const HACE30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

/* ─── Chip de filtro de estado ────────────────────────────────────────────── */
function ChipEstado({ label, activo, colorOn, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
        activo
          ? `${colorOn} shadow-sm`
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
      }`}
    >
      {label}
    </button>
  );
}

/* ─── Tarjeta de estadística estilo POS ──────────────────────────────────── */
function StatTile({ icon, iconCls, label, value, sub, valueCls = 'text-zinc-900 dark:text-white' }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
        <Ic id={icon} size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide truncate">{label}</p>
        <p className={`text-xl font-bold font-mono leading-tight ${valueCls}`}>{value}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

export default function Ventas() {
  const navigate = useNavigate();
  const { puede } = usePermission();
  const puedeCrear = puede('crear_menor', 'ventas') || puede('crear_mayor', 'ventas');

  const [ventas,       setVentas]       = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [arqueoActual, setArqueoActual] = useState(undefined); // undefined = cargando, null = sin caja
  const [filtros,      setFiltros]      = useState({
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

  useEffect(() => {
    cajaService.getArqueoActual()
      .then(r => setArqueoActual(r.data.arqueo ?? null))
      .catch(() => setArqueoActual(null));
  }, []);

  // Búsqueda automática: al entrar y cada vez que cambian los filtros (con debounce)
  useEffect(() => {
    const t = setTimeout(() => { cargar(); }, 400);
    return () => clearTimeout(t);
  }, [filtros]); // eslint-disable-line

  const sinCaja = arqueoActual === null;

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-shadow';

  const totalMonto = ventas.reduce((s, v) => s + Number(v.total ?? 0), 0);
  const pendiente  = ventas.reduce((s, v) => s + Number(v.saldo_pendiente ?? 0), 0);
  const emitidas   = ventas.filter(v => v.estado === 'EMITIDA').length;

  return (
    <div className="space-y-5">

      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Ventas</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Gestión de ventas por menor y por mayor</p>
        </div>
        {puedeCrear && (
          <button
            onClick={() => !sinCaja && navigate('/ventas/nueva')}
            disabled={sinCaja}
            title={sinCaja ? 'Debes abrir una caja antes de realizar ventas' : undefined}
            className={`self-start sm:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${
              sinCaja
                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                : 'bg-yellow-400 hover:bg-yellow-500 text-zinc-900'
            }`}
          >
            <Ic id="plus" size={16} />
            Nueva venta
          </button>
        )}
      </div>

      {/* ── Banner sin caja ── */}
      {sinCaja && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
          <span className="text-orange-500 text-lg flex-shrink-0">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">No hay caja abierta</p>
            <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">Para realizar una venta debés abrir una caja primero desde el módulo <strong>Caja</strong>.</p>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon="ticket" iconCls="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
          label="Total ventas" value={ventas.length} sub="en el período"
        />
        <StatTile
          icon="clock" iconCls="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          label="Emitidas" value={emitidas} sub="pendientes de cobro"
          valueCls="text-blue-600 dark:text-blue-400"
        />
        <StatTile
          icon="cash" iconCls="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          label="Total Bs" value={fmtMonto(totalMonto)} sub="facturado total"
          valueCls="text-green-600 dark:text-green-400"
        />
        <StatTile
          icon="alert" iconCls="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500"
          label="Por cobrar Bs" value={fmtMonto(pendiente)} sub="saldo pendiente"
          valueCls="text-yellow-600 dark:text-yellow-400"
        />
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">

        {/* Chips de estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 sidebar-scroll">
          <ChipEstado label="Todos" activo={filtros.estado === ''} colorOn="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" onClick={() => setF('estado', '')} />
          {Object.entries(ESTADO_BADGE).map(([k, v]) => (
            <ChipEstado key={k} label={v.label} activo={filtros.estado === k} colorOn={v.chipOn} onClick={() => setF('estado', k)} />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl gap-1">
            {[
              { v: '',      label: 'Menor y mayor' },
              { v: 'MENOR', label: 'Menor' },
              { v: 'MAYOR', label: 'Mayor' },
            ].map(opt => (
              <button
                key={opt.v} onClick={() => setF('tipo_venta', opt.v)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtros.tipo_venta === opt.v
                    ? 'bg-yellow-400 text-zinc-900 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <label className="absolute -top-2 left-3 text-[10px] font-semibold text-zinc-400 bg-white dark:bg-zinc-900 px-1 uppercase tracking-wide">Desde</label>
            <input type="date" value={filtros.fecha_desde} onChange={e => setF('fecha_desde', e.target.value)} className={inputCls} />
          </div>

          <div className="relative">
            <label className="absolute -top-2 left-3 text-[10px] font-semibold text-zinc-400 bg-white dark:bg-zinc-900 px-1 uppercase tracking-wide">Hasta</label>
            <input type="date" value={filtros.fecha_hasta} onChange={e => setF('fecha_hasta', e.target.value)} className={inputCls} />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Ic id="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text" placeholder="Buscar número, cliente…" value={filtros.q}
                onChange={e => setF('q', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && cargar()}
                className={`pl-9 ${inputCls}`}
              />
            </div>
            <button
              onClick={cargar}
              className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors flex-shrink-0"
            >
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-7 h-7 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">Cargando ventas…</p>
          </div>
        ) : ventas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 text-zinc-400">
            <Ic id="empty" size={40} className="text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm font-medium">Sin ventas para estos filtros</p>
            <p className="text-xs">Ajustá el rango de fechas o los filtros</p>
          </div>
        ) : (
          <>
            {/* Vista tabla — solo desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <th className="w-1" />
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Número</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Fecha</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Total</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Pendiente</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Estado</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {ventas.map(v => {
                    const badge = ESTADO_BADGE[v.estado] ?? { label: v.estado, cls: 'bg-zinc-100 text-zinc-600', accent: 'bg-zinc-300' };
                    const clienteNombre = v.cliente_razon || `${v.cliente_nombres ?? ''} ${v.cliente_apellidos ?? ''}`.trim();
                    return (
                      <tr
                        key={v.id_venta}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/ventas/${v.id_venta}`)}
                      >
                        <td className="p-0">
                          <div className={`w-1 h-full min-h-[52px] ${badge.accent}`} />
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-white text-sm">
                          {v.numero}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="truncate text-zinc-900 dark:text-white font-medium">{clienteNombre}</p>
                          <p className="text-xs text-zinc-400 font-mono">{v.cliente_codigo}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            v.tipo_venta === 'MAYOR'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            {v.tipo_venta === 'MAYOR' ? 'Mayor' : 'Menor'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-sm">
                          {fmtFecha(v.fecha)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900 dark:text-white">
                          {fmtMonto(v.total)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {Number(v.saldo_pendiente) > 0
                            ? <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{fmtMonto(v.saldo_pendiente)}</span>
                            : <span className="text-green-600 dark:text-green-400">—</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-zinc-300 dark:text-zinc-600 group-hover:text-yellow-500 dark:group-hover:text-yellow-400 transition-colors">
                            →
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista lista — mobile y tablet, estilo ticket */}
            <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {ventas.map(v => {
                const badge = ESTADO_BADGE[v.estado] ?? { label: v.estado, cls: 'bg-zinc-100 text-zinc-600', accent: 'bg-zinc-300' };
                const clienteNombre = v.cliente_razon || `${v.cliente_nombres ?? ''} ${v.cliente_apellidos ?? ''}`.trim();
                const tienePendiente = Number(v.saldo_pendiente) > 0;
                return (
                  <div
                    key={v.id_venta}
                    className="flex active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors cursor-pointer"
                    onClick={() => navigate(`/ventas/${v.id_venta}`)}
                  >
                    <div className={`w-1 shrink-0 ${badge.accent}`} />
                    <div className="flex-1 min-w-0 px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      {/* Fila superior: número + badges + total */}
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="font-mono font-bold text-zinc-900 dark:text-white text-sm shrink-0">
                            {v.numero}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                            v.tipo_venta === 'MAYOR'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            {v.tipo_venta === 'MAYOR' ? 'Mayor' : 'Menor'}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono font-bold text-zinc-900 dark:text-white text-sm leading-tight">
                            Bs {fmtMonto(v.total)}
                          </p>
                          {tienePendiente && (
                            <p className="text-[11px] font-mono text-yellow-600 dark:text-yellow-400 font-semibold leading-tight">
                              Pend. {fmtMonto(v.saldo_pendiente)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Fila inferior: cliente + fecha */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium truncate">{clienteNombre}</p>
                        <p className="text-xs text-zinc-400 shrink-0">{fmtFecha(v.fecha)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie de tabla */}
            <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                {ventas.length} venta{ventas.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-zinc-400 font-mono">
                Total: Bs {fmtMonto(totalMonto)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
