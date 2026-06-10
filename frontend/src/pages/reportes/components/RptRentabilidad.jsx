import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, BtnPDF, Tabla, Resumen } from './ReportesShared';

export default function RptRentabilidad() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy(), agrupar_por: 'producto' });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getRentabilidad(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totIngresos = filas.reduce((a, r) => a + Number(r.ingresos), 0);
  const totUtilidad = filas.reduce((a, r) => a + Number(r.utilidad_bruta || 0), 0);

  const grupoLabel = filtros.agrupar_por === 'marca' ? 'Marca'
                   : filtros.agrupar_por === 'categoria' ? 'Categoría' : 'Producto';

  const cols = [
    { key: 'grupo',            label: grupoLabel,    bold: true },
    { key: 'cantidad_vendida', label: 'Unidades',    align: 'right', render: v => fmtN(v) },
    { key: 'ingresos',         label: 'Ingresos Bs', align: 'right', render: v => fmt(v) },
    { key: 'costo_ventas',     label: 'Costo Bs',    align: 'right', render: v => fmt(v) },
    { key: 'utilidad_bruta',   label: 'Utilidad Bs', align: 'right', render: v => <span className={Number(v) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{fmt(v)}</span> },
    { key: 'margen_pct',       label: 'Margen %',    align: 'right', render: v => <span className={Number(v) >= 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-500 font-semibold'}>{v}%</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <div>
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Agrupar por</label>
          <select value={filtros.agrupar_por} onChange={e => f('agrupar_por', e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400">
            <option value="producto">Producto</option>
            <option value="marca">Marca</option>
            <option value="categoria">Categoría</option>
          </select>
        </div>
        <BtnConsultar onClick={buscar} />
        <BtnPDF tipo="rentabilidad" filtros={filtros} />
      </div>
      <Resumen items={[
        { label: 'Ingresos',       valor: `Bs ${fmt(totIngresos)}`, color: 'text-zinc-900 dark:text-white' },
        { label: 'Utilidad bruta', valor: `Bs ${fmt(totUtilidad)}`, color: totUtilidad >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500' },
        { label: 'Margen',         valor: totIngresos > 0 ? `${((totUtilidad / totIngresos) * 100).toFixed(1)}%` : '—', color: 'text-yellow-600 dark:text-yellow-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}
