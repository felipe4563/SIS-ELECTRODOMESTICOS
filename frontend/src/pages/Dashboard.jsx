import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportesService } from '../services/reportes.service';

const fmt = (n) =>
  Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  archive:       <><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></>,
  trendingUp:    <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
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
  yellow: {
    wrap:  'border-yellow-400/25 dark:border-yellow-400/15',
    icon:  'bg-yellow-400/15 dark:bg-yellow-400/10 text-yellow-500 dark:text-yellow-400',
    bar:   'bg-yellow-400',
    dot:   'bg-yellow-400',
  },
  green: {
    wrap:  'border-green-500/25 dark:border-green-500/15',
    icon:  'bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400',
    bar:   'bg-green-500',
    dot:   'bg-green-500',
  },
  blue: {
    wrap:  'border-blue-500/25 dark:border-blue-500/15',
    icon:  'bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    bar:   'bg-blue-500',
    dot:   'bg-blue-500',
  },
  red: {
    wrap:  'border-red-500/25 dark:border-red-500/15',
    icon:  'bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    bar:   'bg-red-500',
    dot:   'bg-red-500',
  },
  purple: {
    wrap:  'border-purple-500/25 dark:border-purple-500/15',
    icon:  'bg-purple-500/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    bar:   'bg-purple-500',
    dot:   'bg-purple-500',
  },
  orange: {
    wrap:  'border-orange-500/25 dark:border-orange-500/15',
    icon:  'bg-orange-500/10 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
    bar:   'bg-orange-500',
    dot:   'bg-orange-500',
  },
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

// ── Mini bar chart ────────────────────────────────────────────────────────
function BarChart({ data }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-sm text-zinc-400">
        Sin ventas en los últimos 7 días
      </div>
    );
  }

  const maxTotal = Math.max(...data.map(d => Number(d.total)), 1);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const allDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const found = data.find(x => x.dia === iso);
    allDays.push({
      dia: iso,
      label: dias[d.getDay()],
      total: found ? Number(found.total) : 0,
      cantidad: found ? found.cantidad : 0,
    });
  }

  return (
    <div className="relative">
      {hovered !== null && (
        <div className="absolute -top-1 right-0 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
          Bs {fmt(allDays[hovered].total)} · {fmtN(allDays[hovered].cantidad)} vtas
        </div>
      )}
      <div className="flex items-end gap-1.5 h-32 mt-4">
        {allDays.map((d, i) => {
          const pct = (d.total / maxTotal) * 100;
          const isHov = hovered === i;
          const isToday = i === 6;
          return (
            <div
              key={d.dia}
              className="flex-1 flex flex-col items-center gap-1.5 cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="w-full flex flex-col justify-end rounded-t-md overflow-hidden" style={{ height: '100px' }}>
                <div
                  className={`w-full rounded-t-md transition-all duration-150 ${
                    isToday
                      ? 'bg-yellow-400'
                      : isHov
                        ? 'bg-zinc-400 dark:bg-zinc-500'
                        : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium ${
                isToday
                  ? 'text-yellow-500 dark:text-yellow-400'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    reportesService.getDashboard()
      .then(r => { setData(r.data); setCargando(false); })
      .catch(e => { setError(e.response?.data?.error || 'Error al cargar dashboard'); setCargando(false); });
  }, []);

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

  const hoy = new Date();
  const mes = hoy.toLocaleString('es-BO', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5 capitalize">{mes}</p>
        </div>
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          En tiempo real
        </span>
      </div>

      {/* KPIs fila 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon="shoppingBag"
          titulo="Ventas hoy"
          valor={`Bs ${fmt(data.ventasHoy?.total ?? 0)}`}
          subtitulo={`${fmtN(data.ventasHoy?.cantidad ?? 0)} transacciones`}
          color="yellow"
          onClick={() => navigate('/ventas')}
        />
        <KpiCard
          icon="calendar"
          titulo="Ventas del mes"
          valor={`Bs ${fmt(data.ventasMes?.total ?? 0)}`}
          subtitulo={`${fmtN(data.ventasMes?.cantidad ?? 0)} transacciones`}
          color="green"
          onClick={() => navigate('/ventas')}
        />
        <KpiCard
          icon="shoppingCart"
          titulo="Compras del mes"
          valor={`Bs ${fmt(data.comprasMes?.total ?? 0)}`}
          subtitulo={`${fmtN(data.comprasMes?.cantidad ?? 0)} órdenes`}
          color="blue"
          onClick={() => navigate('/compras')}
        />
        <KpiCard
          icon="bell"
          titulo="Alertas de stock"
          valor={fmtN(data.alertas ?? 0)}
          subtitulo={data.alertas > 0 ? 'Productos bajo mínimo' : 'Sin alertas activas'}
          color={data.alertas > 0 ? 'red' : 'green'}
          onClick={() => navigate('/inventario/alertas')}
        />
      </div>

      {/* KPIs fila 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          icon="arrowUpRight"
          titulo="Cuentas por cobrar"
          valor={`Bs ${fmt(data.cuentasCobrar ?? 0)}`}
          subtitulo="Saldo pendiente clientes"
          color="orange"
          onClick={() => navigate('/reportes')}
        />
        <KpiCard
          icon="arrowDownLeft"
          titulo="Cuentas por pagar"
          valor={`Bs ${fmt(data.cuentasPagar ?? 0)}`}
          subtitulo="Saldo pendiente proveedores"
          color="purple"
          onClick={() => navigate('/reportes')}
        />
        <KpiCard
          icon="wallet"
          titulo="Arqueos abiertos"
          valor={fmtN(data.arqueos ?? 0)}
          subtitulo={data.arqueos > 0 ? 'Turno(s) en curso' : 'Sin turnos activos'}
          color={data.arqueos > 0 ? 'yellow' : 'blue'}
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
            <p className="text-sm text-zinc-400 text-center py-6">Sin datos este mes</p>
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
                        className={`h-full rounded-full transition-all duration-500 ${
                          i === 0 ? 'bg-yellow-400' : 'bg-zinc-300 dark:bg-zinc-600'
                        }`}
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
