import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, BtnPDF, Tabla, Resumen } from './ReportesShared';

export default function RptTopProductos() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy(), limit: 10 });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getTopProductos(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const maxQty    = filas.length > 0 ? Number(filas[0].cantidad_vendida) : 1;
  const totalMonto = filas.reduce((a, r) => a + Number(r.monto_total), 0);

  const cols = [
    { key: 'codigo_interno',   label: 'Código' },
    { key: 'producto',         label: 'Producto',    bold: true },
    { key: 'marca',            label: 'Marca' },
    { key: 'categoria',        label: 'Categoría' },
    { key: 'cantidad_vendida', label: 'Unidades',    align: 'right', render: v => fmtN(v) },
    { key: 'precio_promedio',  label: 'P. Prom Bs',  align: 'right', render: v => fmt(v) },
    { key: 'monto_total',      label: 'Total Bs',    align: 'right', render: v => fmt(v) },
    { key: 'total_bonos',      label: 'Bonos Bs',    align: 'right', render: v => <span className="text-green-600 dark:text-green-400">{fmt(v)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <div>
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Top N</label>
          <select value={filtros.limit} onChange={e => f('limit', e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400">
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
          </select>
        </div>
        <BtnConsultar onClick={buscar} />
        <BtnPDF tipo="top-productos" filtros={filtros} />
      </div>

      <Resumen items={[
        { label: 'Productos',     valor: fmtN(filas.length) },
        { label: 'Total vendido', valor: `Bs ${fmt(totalMonto)}`, color: 'text-yellow-600 dark:text-yellow-400' },
      ]} />

      {!cargando && filas.length > 0 && (
        <div className="space-y-2">
          {filas.map((p, i) => {
            const pct = (Number(p.cantidad_vendida) / maxQty) * 100;
            return (
              <div key={p.codigo_interno} className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-400 w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{p.producto}</span>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white ml-2 shrink-0">{fmtN(p.cantidad_vendida)} uds</span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 w-24 text-right">Bs {fmt(p.monto_total)}</span>
              </div>
            );
          })}
        </div>
      )}

      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="Sin ventas en el período" />
    </div>
  );
}
