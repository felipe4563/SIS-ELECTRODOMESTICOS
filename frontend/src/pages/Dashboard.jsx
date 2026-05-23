import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportesService } from '../services/reportes.service';

const fmt = (n) =>
  Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtN = (n) => Number(n).toLocaleString('es-BO');

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ icono, titulo, valor, subtitulo, color, onClick }) {
  const colores = {
    yellow: 'from-yellow-400/20 to-yellow-400/5 border-yellow-400/30 dark:border-yellow-400/20',
    green:  'from-green-500/20 to-green-500/5 border-green-500/30 dark:border-green-500/20',
    blue:   'from-blue-500/20 to-blue-500/5 border-blue-500/30 dark:border-blue-500/20',
    red:    'from-red-500/20 to-red-500/5 border-red-500/30 dark:border-red-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 dark:border-purple-500/20',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30 dark:border-orange-500/20',
  };
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-5 bg-gradient-to-br ${colores[color] || colores.yellow} border backdrop-blur-sm ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icono}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">{valor}</p>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-0.5">{titulo}</p>
      {subtitulo && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{subtitulo}</p>}
    </div>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────────
function BarChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-zinc-400 text-center py-8">Sin ventas en los últimos 7 días</p>;
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
    <div className="flex items-end gap-2 h-36">
      {allDays.map((d) => {
        const pct = (d.total / maxTotal) * 100;
        return (
          <div key={d.dia} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end" style={{ height: '112px' }}>
              <div
                className="w-full rounded-t-lg bg-yellow-400 dark:bg-yellow-400 opacity-80 hover:opacity-100 transition-all"
                style={{ height: `${Math.max(pct, 2)}%` }}
                title={`Bs ${fmt(d.total)} · ${d.cantidad} ventas`}
              />
            </div>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">{d.label}</span>
          </div>
        );
      })}
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
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  const hoy = new Date();
  const mes = hoy.toLocaleString('es-BO', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 capitalize">{mes}</p>
      </div>

      {/* KPIs fila 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icono="🛍️"
          titulo="Ventas hoy"
          valor={`Bs ${fmt(data.ventasHoy?.total ?? 0)}`}
          subtitulo={`${fmtN(data.ventasHoy?.cantidad ?? 0)} transacciones`}
          color="yellow"
          onClick={() => navigate('/ventas')}
        />
        <KpiCard
          icono="📅"
          titulo="Ventas del mes"
          valor={`Bs ${fmt(data.ventasMes?.total ?? 0)}`}
          subtitulo={`${fmtN(data.ventasMes?.cantidad ?? 0)} transacciones`}
          color="green"
          onClick={() => navigate('/ventas')}
        />
        <KpiCard
          icono="🛒"
          titulo="Compras del mes"
          valor={`Bs ${fmt(data.comprasMes?.total ?? 0)}`}
          subtitulo={`${fmtN(data.comprasMes?.cantidad ?? 0)} órdenes`}
          color="blue"
          onClick={() => navigate('/compras')}
        />
        <KpiCard
          icono="🔔"
          titulo="Alertas de stock"
          valor={fmtN(data.alertas ?? 0)}
          subtitulo={data.alertas > 0 ? 'Productos bajo mínimo' : 'Sin alertas activas'}
          color={data.alertas > 0 ? 'red' : 'green'}
          onClick={() => navigate('/inventario/alertas')}
        />
      </div>

      {/* KPIs fila 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icono="💵"
          titulo="Cuentas por cobrar"
          valor={`Bs ${fmt(data.cuentasCobrar ?? 0)}`}
          subtitulo="Saldo pendiente clientes"
          color="orange"
          onClick={() => navigate('/reportes')}
        />
        <KpiCard
          icono="💴"
          titulo="Cuentas por pagar"
          valor={`Bs ${fmt(data.cuentasPagar ?? 0)}`}
          subtitulo="Saldo pendiente proveedores"
          color="purple"
          onClick={() => navigate('/reportes')}
        />
        <KpiCard
          icono="💰"
          titulo="Arqueos abiertos"
          valor={fmtN(data.arqueos ?? 0)}
          subtitulo={data.arqueos > 0 ? 'Turno(s) en curso' : 'Sin turnos activos'}
          color={data.arqueos > 0 ? 'yellow' : 'blue'}
          onClick={() => navigate('/caja')}
        />
      </div>

      {/* Gráfico + Top productos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Ventas últimos 7 días */}
        <div className="lg:col-span-2 rounded-2xl p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Ventas últimos 7 días</h2>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Bs</span>
          </div>
          <BarChart data={data.ventasDiarias} />
        </div>

        {/* Top 5 productos del mes */}
        <div className="rounded-2xl p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Top productos del mes</h2>
          {(!data.topProductos || data.topProductos.length === 0) ? (
            <p className="text-sm text-zinc-400 text-center py-6">Sin datos este mes</p>
          ) : (
            <div className="space-y-3">
              {data.topProductos.map((p, i) => {
                const maxQty = Number(data.topProductos[0].cantidad_vendida);
                const pct = (Number(p.cantidad_vendida) / maxQty) * 100;
                return (
                  <div key={p.codigo_interno}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-zinc-400 w-4">{i + 1}</span>
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{p.producto}</span>
                      </div>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white ml-2 shrink-0">
                        {fmtN(p.cantidad_vendida)} uds
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={() => navigate('/reportes')}
            className="mt-4 w-full text-xs text-center text-zinc-400 dark:text-zinc-500 hover:text-yellow-500 transition-colors"
          >
            Ver reporte completo →
          </button>
        </div>
      </div>
    </div>
  );
}
