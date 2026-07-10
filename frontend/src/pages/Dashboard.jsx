import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportesService } from '../services/reportes.service';
import { AbilityContext } from '../contexts/AbilityContext';

const fmt  = (n) => Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => Number(n).toLocaleString('es-BO');

// ── SVG Icons ─────────────────────────────────────────────────────────────
const ICONS = {
  shoppingBag:   <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
  calendar:      <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  shoppingCart:  <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>,
  bell:          <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
  arrowUpRight:  <><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></>,
  arrowDownLeft: <><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></>,
  wallet:        <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>,
  trendingUp:    <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  refresh:       <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
  building:      <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6"/><path d="M3 15h6"/></>,
  chevronDown:   <><polyline points="6 9 12 15 18 9"/></>,
  mapPin:        <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
  layers:        <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
};

function Ic({ id, size = 18, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}
         fill="none" stroke="currentColor"
         strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
         className={className} aria-hidden="true">
      {ICONS[id]}
    </svg>
  );
}

// ── Color tokens ──────────────────────────────────────────────────────────
const COLOR = {
  yellow: { wrap: 'border-yellow-400/25 dark:border-yellow-400/15', icon: 'bg-yellow-400/15 dark:bg-yellow-400/10 text-yellow-500 dark:text-yellow-400' },
  green:  { wrap: 'border-green-500/25 dark:border-green-500/15',   icon: 'bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400' },
  blue:   { wrap: 'border-blue-500/25 dark:border-blue-500/15',     icon: 'bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  red:    { wrap: 'border-red-500/25 dark:border-red-500/15',       icon: 'bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400' },
  purple: { wrap: 'border-purple-500/25 dark:border-purple-500/15', icon: 'bg-purple-500/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  orange: { wrap: 'border-orange-500/25 dark:border-orange-500/15', icon: 'bg-orange-500/10 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' },
};

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ icon, titulo, valor, subtitulo, color = 'yellow', onClick }) {
  const c = COLOR[color] || COLOR.yellow;
  return (
    <div
      onClick={onClick}
      className={`group rounded-2xl p-4 bg-white dark:bg-zinc-900 border ${c.wrap}
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
        transition-all duration-200`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${c.icon}`}>
          <Ic id={icon} size={17} />
        </span>
        {onClick && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-300 dark:text-zinc-600">
            <Ic id="arrowUpRight" size={14} />
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-zinc-900 dark:text-white leading-tight tracking-tight">{valor}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-0.5">{titulo}</p>
      {subtitulo && (
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">{subtitulo}</p>
      )}
    </div>
  );
}

// ── Responsive SVG bar chart ───────────────────────────────────────────────
function BarChart({ data }) {
  const wrapRef = useRef(null);
  const [cw, setCw] = useState(0);
  const [hov, setHov] = useState(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => setCw(Math.floor(e.contentRect.width)));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const allDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const found = (data || []).find(x => x.dia === iso);
    allDays.push({
      iso, label: dias[d.getDay()],
      total: found ? +found.total : 0,
      cantidad: found ? +found.cantidad : 0,
      isToday: i === 0,
    });
  }

  const maxV = Math.max(...allDays.map(d => d.total), 1);
  const hasData = allDays.some(d => d.total > 0);

  const H = 148;
  const labelH = 20;
  const padV   = 12;
  const barAreaH = H - labelH - padV;
  const n = allDays.length;
  const step = cw > 0 ? cw / n : 0;
  const barW = Math.max(4, step * 0.55);
  const gridLines = [0.33, 0.67, 1];

  return (
    <div ref={wrapRef} className="relative mt-4 min-h-[148px]">
      {/* Tooltip */}
      {hov !== null && (
        <div className="absolute right-0 -top-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 pointer-events-none">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Bs {fmt(allDays[hov].total)}</span>
          {' · '}{fmtN(allDays[hov].cantidad)} vtas
        </div>
      )}

      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
          Sin ventas en los últimos 7 días
        </div>
      )}

      {cw > 0 && (
        <svg width={cw} height={H} style={{ display: 'block', overflow: 'visible' }}>
          {/* Grid lines */}
          {gridLines.map(pct => {
            const y = padV + barAreaH * (1 - pct);
            return (
              <line key={pct}
                x1={0} y1={y} x2={cw} y2={y}
                strokeWidth={1}
                className="stroke-zinc-100 dark:stroke-zinc-800"
              />
            );
          })}

          {/* Bars + labels */}
          {allDays.map((d, i) => {
            const barH  = Math.max((d.total / maxV) * barAreaH, d.total > 0 ? 4 : 0);
            const cx    = step * i + step / 2;
            const x     = cx - barW / 2;
            const y     = padV + barAreaH - barH;
            const isHov = hov === i;

            return (
              <g key={d.iso}
                 onMouseEnter={() => setHov(i)}
                 onMouseLeave={() => setHov(null)}
                 style={{ cursor: 'default' }}>
                {/* Hover hit area */}
                <rect x={cx - step / 2} y={0} width={step} height={H - labelH}
                      fill="transparent" />
                {/* Bar */}
                <rect
                  x={x} y={y} width={barW} height={barH} rx={4}
                  className={`transition-colors duration-150 ${
                    d.isToday
                      ? 'fill-yellow-400'
                      : isHov
                        ? 'fill-zinc-400 dark:fill-zinc-500'
                        : 'fill-zinc-200 dark:fill-zinc-700'
                  }`}
                />
                {/* Day label */}
                <text
                  x={cx} y={H - 3}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={d.isToday ? 600 : 400}
                  className={d.isToday
                    ? 'fill-yellow-500 dark:fill-yellow-400'
                    : 'fill-zinc-400 dark:fill-zinc-500'}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ── SucursalSelector ──────────────────────────────────────────────────────
function SucursalSelector({ sucursales, valor, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  const seleccionada = sucursales.find(s => s.id_sucursal === valor);

  useEffect(() => {
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                   bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700
                   text-zinc-700 dark:text-zinc-300
                   hover:border-yellow-400 dark:hover:border-yellow-500
                   transition-colors min-w-[180px] sm:min-w-[220px]"
      >
        <Ic id="building" size={14} className="text-zinc-400 shrink-0" />
        <span className="flex-1 text-left truncate">
          {seleccionada ? seleccionada.nombre : 'Todas las sucursales'}
        </span>
        <Ic id="chevronDown" size={14} className={`text-zinc-400 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white dark:bg-zinc-900
                        border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg
                        min-w-full overflow-hidden py-1">
          <button
            onClick={() => { onChange(null); setAbierto(false); }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors
              ${!valor ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-medium'
                       : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
          >
            Todas las sucursales
          </button>
          {sucursales.map(s => (
            <button
              key={s.id_sucursal}
              onClick={() => { onChange(s.id_sucursal); setAbierto(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors
                ${valor === s.id_sucursal
                  ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-medium'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
            >
              {s.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SucursalBadge — muestra la ubicación del usuario logueado ─────────────
function SucursalBadge({ info }) {
  if (!info) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium
                       bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400
                       px-2 py-1 rounded-lg border border-zinc-200/60 dark:border-zinc-700/50">
        <Ic id="building" size={11} className="opacity-70" />
        {info.sucursal_nombre}
        {info.sucursal_tipo && info.sucursal_tipo !== 'SUCURSAL' && (
          <span className="text-[9px] uppercase opacity-60 ml-0.5">{info.sucursal_tipo}</span>
        )}
      </span>

      {info.deposito_nombre && (
        <>
          <span className="text-zinc-300 dark:text-zinc-600 text-[10px] select-none">›</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium
                           bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400
                           px-2 py-1 rounded-lg border border-yellow-200/60 dark:border-yellow-500/20">
            <Ic id="mapPin" size={11} className="opacity-80" />
            {info.deposito_nombre}
            {info.deposito_tipo === 'PUNTO_VENTA' && (
              <span className="text-[9px] font-semibold opacity-70 ml-0.5">PV</span>
            )}
          </span>
        </>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
const REFRESH_MS = 60_000;

export default function Dashboard() {
  const ability  = useContext(AbilityContext);
  const navigate = useNavigate();

  const puedeVerTodas = ability.can('ver_todas_sucursales', 'dashboard');

  const [data,        setData]        = useState(null);
  const [cargando,    setCargando]    = useState(true);
  const [error,       setError]       = useState(null);
  const [sucursales,  setSucursales]  = useState([]);
  const [sucursal,    setSucursal]    = useState(null);
  const [ultimaAct,   setUltimaAct]  = useState(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    else setRefrescando(true);
    setError(null);
    try {
      const params = puedeVerTodas && sucursal ? { id_sucursal: sucursal } : undefined;
      const r = await reportesService.getDashboard(params);
      setData(r.data);
      if (r.data.sucursales?.length > 0) {
        setSucursales(r.data.sucursales);
      }
      setUltimaAct(new Date());
    } catch (e) {
      setError(e.response?.data?.error || 'Error al cargar dashboard');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [puedeVerTodas, sucursal]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const id = setInterval(() => cargar(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [cargar]);

  // ── Renders de estado ───────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
        {error}
      </div>
    );
  }

  const mes = new Date().toLocaleString('es-BO', { month: 'long', year: 'numeric' });
  const horaAct = ultimaAct
    ? ultimaAct.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
    : null;

  const sucursalActiva = puedeVerTodas
    ? (sucursal ? sucursales.find(s => s.id_sucursal === sucursal)?.nombre ?? '' : 'Todas las sucursales')
    : null;

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5 capitalize">
            {mes}{sucursalActiva ? ` · ${sucursalActiva}` : ''}
          </p>
          {/* Sucursal + punto de venta del usuario logueado */}
          <SucursalBadge info={data?.sucursalUsuario} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro de sucursales — solo si tiene permiso y hay sucursales */}
          {puedeVerTodas && sucursales.length > 0 && (
            <SucursalSelector
              sucursales={sucursales}
              valor={sucursal}
              onChange={setSucursal}
            />
          )}

          {/* Botón refresh manual */}
          <button
            onClick={() => cargar(true)}
            disabled={refrescando}
            title="Actualizar"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                       bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700
                       text-zinc-500 dark:text-zinc-400
                       hover:border-yellow-400 dark:hover:border-yellow-500
                       disabled:opacity-50 transition-colors"
          >
            <Ic id="refresh" size={14} className={refrescando ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Indicador de última actualización */}
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {horaAct ? `Actualizado ${horaAct}` : 'En tiempo real'}
          </span>
        </div>
      </div>

      {/* KPIs fila 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon="shoppingBag" titulo="Ventas hoy" color="yellow"
          valor={`Bs ${fmt(data.ventasHoy?.total ?? 0)}`}
          subtitulo={`${fmtN(data.ventasHoy?.cantidad ?? 0)} transacciones`}
          onClick={() => navigate('/ventas')}
        />
        <KpiCard
          icon="calendar" titulo="Ventas del mes" color="green"
          valor={`Bs ${fmt(data.ventasMes?.total ?? 0)}`}
          subtitulo={`${fmtN(data.ventasMes?.cantidad ?? 0)} transacciones`}
          onClick={() => navigate('/ventas')}
        />
        <KpiCard
          icon="shoppingCart" titulo="Compras del mes" color="blue"
          valor={`Bs ${fmt(data.comprasMes?.total ?? 0)}`}
          subtitulo={`${fmtN(data.comprasMes?.cantidad ?? 0)} órdenes`}
          onClick={() => navigate('/compras')}
        />
        <KpiCard
          icon="bell" titulo="Alertas de stock" color={data.alertas > 0 ? 'red' : 'green'}
          valor={fmtN(data.alertas ?? 0)}
          subtitulo={data.alertas > 0 ? 'Productos bajo mínimo' : 'Sin alertas activas'}
          onClick={() => navigate('/inventario/alertas')}
        />
      </div>

      {/* KPIs fila 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          icon="arrowUpRight" titulo="Cuentas por cobrar" color="orange"
          valor={`Bs ${fmt(data.cuentasCobrar ?? 0)}`}
          subtitulo="Saldo pendiente clientes"
          onClick={() => navigate('/reportes')}
        />
        <KpiCard
          icon="arrowDownLeft" titulo="Cuentas por pagar" color="purple"
          valor={`Bs ${fmt(data.cuentasPagar ?? 0)}`}
          subtitulo="Saldo pendiente proveedores"
          onClick={() => navigate('/reportes')}
        />
        <KpiCard
          icon="wallet" titulo="Arqueos abiertos" color={data.arqueos > 0 ? 'yellow' : 'blue'}
          valor={fmtN(data.arqueos ?? 0)}
          subtitulo={data.arqueos > 0 ? 'Turno(s) en curso' : 'Sin turnos activos'}
          onClick={() => navigate('/caja')}
        />
      </div>

      {/* Gráfico + Top productos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Ventas últimos 7 días */}
        <div className="lg:col-span-2 rounded-2xl p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Ventas últimos 7 días</h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Montos en bolivianos (Bs)</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
              <Ic id="trendingUp" size={12} />
              7d
            </span>
          </div>
          <BarChart data={data.ventasDiarias} />
        </div>

        {/* Top 5 productos del mes */}
        <div className="rounded-2xl p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Top productos</h2>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">este mes</span>
          </div>
          {(!data.topProductos || data.topProductos.length === 0) ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-6">Sin datos este mes</p>
          ) : (
            <div className="space-y-3">
              {data.topProductos.map((p, i) => {
                const maxQty = Number(data.topProductos[0].cantidad_vendida);
                const pct = (Number(p.cantidad_vendida) / maxQty) * 100;
                const rankColors = ['text-yellow-500', 'text-zinc-400', 'text-orange-400'];
                return (
                  <div key={p.codigo_interno}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[11px] font-bold w-4 shrink-0 ${rankColors[i] || 'text-zinc-300 dark:text-zinc-600'}`}>
                          {i + 1}
                        </span>
                        <span className="text-[12px] text-zinc-700 dark:text-zinc-300 truncate leading-tight">{p.producto}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-900 dark:text-white ml-2 shrink-0 tabular-nums">
                        {fmtN(p.cantidad_vendida)}
                      </span>
                    </div>
                    <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-yellow-400' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={() => navigate('/reportes')}
            className="mt-5 w-full flex items-center justify-center gap-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors"
          >
            Ver reporte completo
            <Ic id="arrowUpRight" size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
