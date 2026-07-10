import { reportesService } from '../../../services/reportes.service';
import { usePermission } from '../../../hooks/usePermission';

// ── Helpers ───────────────────────────────────────────────────────────────
export const hoy = () => new Date().toISOString().slice(0, 10);
export const inicioMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
export const fmt  = (n) => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtN = (n) => Number(n || 0).toLocaleString('es-BO');

export async function descargarPDF(tipo, filtros = {}) {
  try {
    const r = await reportesService.exportarReporte(tipo, 'pdf', filtros);
    const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tipo}-${filtros.fecha_desde || ''}-${filtros.fecha_hasta || ''}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch { /* silently ignore */ }
}

// ── Componentes base ──────────────────────────────────────────────────────
export function FiltroFechas({ filtros, onChange }) {
  return (
    <>
      <div>
        <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Desde</label>
        <input type="date" value={filtros.fecha_desde} onChange={e => onChange('fecha_desde', e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400" />
      </div>
      <div>
        <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Hasta</label>
        <input type="date" value={filtros.fecha_hasta} onChange={e => onChange('fecha_hasta', e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400" />
      </div>
    </>
  );
}

export function BtnConsultar({ onClick }) {
  return (
    <button onClick={onClick}
      className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">
      Consultar
    </button>
  );
}

export function BtnPDF({ tipo, filtros }) {
  const { puede } = usePermission();
  if (!puede('exportar', 'reportes')) return null;
  return (
    <button onClick={() => descargarPDF(tipo, filtros)}
      className="px-3 py-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 font-semibold text-sm rounded-xl transition-colors border border-red-200 dark:border-red-500/30 flex items-center gap-1.5">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      PDF
    </button>
  );
}

export function Tabla({ columnas, filas, cargando, vacio }) {
  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!filas || filas.length === 0) {
    return <p className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">{vacio || 'Sin resultados'}</p>;
  }

  const titleCol = columnas.find(c => c.bold) || columnas[0];
  const restCols = columnas.filter(c => c !== titleCol);

  return (
    <>
      {/* Mobile: cards */}
      <div className="grid gap-3 md:hidden">
        {filas.map((fila, i) => (
          <div key={i} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
            <div className="mb-3 pb-2.5 border-b border-zinc-100 dark:border-zinc-700">
              <p className="font-semibold text-sm text-zinc-900 dark:text-white">
                {titleCol.render ? titleCol.render(fila[titleCol.key], fila) : (fila[titleCol.key] ?? '—')}
              </p>
            </div>
            <div className="space-y-2">
              {restCols.map(c => (
                <div key={c.key} className="flex items-start justify-between gap-3 text-xs">
                  <span className="text-zinc-400 dark:text-zinc-500 shrink-0">{c.label}</span>
                  <span className={`font-medium text-zinc-700 dark:text-zinc-300 text-right ${c.align === 'right' ? 'font-mono' : ''}`}>
                    {c.render ? c.render(fila[c.key], fila) : (fila[c.key] ?? '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              {columnas.map(c => (
                <th key={c.key} className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filas.map((fila, i) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                {columnas.map(c => (
                  <td key={c.key} className={`px-3 py-2.5 text-zinc-700 dark:text-zinc-300 ${c.align === 'right' ? 'text-right font-mono' : ''} ${c.bold ? 'font-semibold text-zinc-900 dark:text-white' : ''}`}>
                    {c.render ? c.render(fila[c.key], fila) : (fila[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Resumen({ items }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5 text-sm">
          <span className="text-zinc-400 dark:text-zinc-500">{it.label}:</span>
          <span className={`font-semibold ${it.color || 'text-zinc-900 dark:text-white'}`}>{it.valor}</span>
        </div>
      ))}
    </div>
  );
}

export function EstadoBadge({ estado }) {
  const colores = {
    EMITIDA:    'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    PAGADA:     'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    PARCIAL:    'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    ANULADA:    'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    BORRADOR:   'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400',
    DEVUELTA:   'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    CONFIRMADO: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    RECIBIDO:   'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    PRE_PEDIDO: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400',
    POR_LLEGAR: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    ABIERTA:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    CERRADA:    'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${colores[estado] || 'bg-zinc-100 text-zinc-600'}`}>
      {estado}
    </span>
  );
}

export function EfectoBadge({ efecto }) {
  const c = efecto === 'ENTRADA' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
          : efecto === 'SALIDA'  ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400';
  return <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${c}`}>{efecto}</span>;
}
