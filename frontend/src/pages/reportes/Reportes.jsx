import { useState } from 'react';
import RptVentas            from './components/RptVentas';
import RptVentasVendedor    from './components/RptVentasVendedor';
import RptVentasCliente     from './components/RptVentasCliente';
import RptVentasProducto    from './components/RptVentasProducto';
import RptTopProductos      from './components/RptTopProductos';
import RptCompras           from './components/RptCompras';
import RptCuentasCobrar     from './components/RptCuentasCobrar';
import RptCuentasPagar      from './components/RptCuentasPagar';
import RptRentabilidad      from './components/RptRentabilidad';
import RptEstadoResultados  from './components/RptEstadoResultados';
import RptBonos             from './components/RptBonos';
import RptStockConsolidado  from './components/RptStockConsolidado';
import RptKardex            from './components/RptKardex';
import RptArqueosCaja       from './components/RptArqueosCaja';
import RptGastosCategoria   from './components/RptGastosCategoria';

// ── Icono base ────────────────────────────────────────────────────────────
const I = ({ d }) => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

// ── Grupos y tabs ─────────────────────────────────────────────────────────
const TABS = [
  {
    grupo: 'Ventas',
    items: [
      { id: 'ventas',            label: 'Período',        short: 'Período',   icono: <I d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />, comp: RptVentas },
      { id: 'ventas-vendedor',   label: 'Por vendedor',   short: 'Vendedor',  icono: <I d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />, comp: RptVentasVendedor },
      { id: 'ventas-cliente',    label: 'Por cliente',    short: 'Cliente',   icono: <I d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />, comp: RptVentasCliente },
      { id: 'ventas-producto',   label: 'Por producto',   short: 'Producto',  icono: <I d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />, comp: RptVentasProducto },
      { id: 'top-productos',     label: 'Top productos',  short: 'Top',       icono: <I d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />, comp: RptTopProductos },
      { id: 'bonos',             label: 'Bonos vendedores',short: 'Bonos',    icono: <I d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />, comp: RptBonos },
    ],
  },
  {
    grupo: 'Compras y pagos',
    items: [
      { id: 'compras',           label: 'Compras',         short: 'Compras',   icono: <I d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />, comp: RptCompras },
      { id: 'cuentas-cobrar',    label: 'Ctas. por cobrar', short: 'Cobrar',  icono: <I d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />, comp: RptCuentasCobrar },
      { id: 'cuentas-pagar',     label: 'Ctas. por pagar',  short: 'Pagar',   icono: <I d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />, comp: RptCuentasPagar },
      { id: 'gastos-categoria',  label: 'Gastos',           short: 'Gastos',  icono: <I d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />, comp: RptGastosCategoria },
    ],
  },
  {
    grupo: 'Finanzas',
    items: [
      { id: 'rentabilidad',      label: 'Rentabilidad',     short: 'Rentab.',  icono: <I d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />, comp: RptRentabilidad },
      { id: 'estado-resultados', label: 'Estado resultados', short: 'Resultados', icono: <I d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />, comp: RptEstadoResultados },
      { id: 'arqueos-caja',      label: 'Arqueos caja',     short: 'Caja',    icono: <I d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />, comp: RptArqueosCaja },
    ],
  },
  {
    grupo: 'Inventario',
    items: [
      { id: 'stock',             label: 'Stock',            short: 'Stock',   icono: <I d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />, comp: RptStockConsolidado },
      { id: 'kardex',            label: 'Kardex',           short: 'Kardex',  icono: <I d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />, comp: RptKardex },
    ],
  },
];

const ALL_ITEMS = TABS.flatMap(g => g.items);

// ── Página principal ──────────────────────────────────────────────────────
export default function Reportes() {
  const [tab, setTab] = useState('ventas');

  const tabActual = ALL_ITEMS.find(t => t.id === tab);
  const Comp = tabActual?.comp;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Reportes</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Análisis y estadísticas del negocio</p>
      </div>

      <div className="flex gap-5 items-start">

        {/* ── Sidebar (md+) ─────────────────────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 gap-4">
          {TABS.map(grupo => (
            <div key={grupo.grupo}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-3 mb-1">
                {grupo.grupo}
              </p>
              <div className="flex flex-col gap-0.5">
                {grupo.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-left w-full transition-all duration-150 ${
                      tab === item.id
                        ? 'bg-yellow-400 text-zinc-900'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {item.icono}
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* ── Contenido ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Grid de iconos (móvil — <md) */}
          <div className="md:hidden grid grid-cols-5 gap-1.5">
            {ALL_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center transition-all duration-150 ${
                  tab === item.id
                    ? 'bg-yellow-400 text-zinc-900 shadow-sm'
                    : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                {item.icono}
                <span className="text-[9px] font-semibold leading-tight line-clamp-1 w-full text-center">
                  {item.short}
                </span>
              </button>
            ))}
          </div>

          {/* Panel del reporte */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              {tabActual?.icono}
              <h2 className="font-semibold text-zinc-900 dark:text-white">{tabActual?.label}</h2>
            </div>
            {Comp && <Comp />}
          </div>
        </div>

      </div>
    </div>
  );
}
