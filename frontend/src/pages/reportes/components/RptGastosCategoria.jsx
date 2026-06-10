import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, BtnPDF, Tabla, Resumen } from './ReportesShared';

export default function RptGastosCategoria() {
  const [filtros, setFiltros]   = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [data, setData]         = useState(null);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getGastosCategoria(filtros)
      .then(r => { setData(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const filas      = data?.categorias || [];
  const tot        = data?.totales;
  const totalMonto = filas.reduce((a, r) => a + Number(r.total_monto), 0);
  const colores    = ['bg-yellow-400','bg-blue-400','bg-purple-400','bg-green-400','bg-orange-400','bg-pink-400'];

  const cols = [
    { key: 'categoria',    label: 'Categoría',   bold: true },
    { key: 'num_gastos',   label: 'N° Gastos',   align: 'right', render: v => fmtN(v) },
    { key: 'total_monto',  label: 'Total Bs',    align: 'right', render: v => `Bs ${fmt(v)}` },
    { key: 'efectivo',     label: 'Efectivo Bs', align: 'right', render: v => fmt(v) },
    { key: 'otros_metodos',label: 'Otros Bs',    align: 'right', render: v => fmt(v) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <BtnConsultar onClick={buscar} />
        <BtnPDF tipo="gastos-categoria" filtros={filtros} />
      </div>
      {tot && (
        <Resumen items={[
          { label: 'Total gastos', valor: fmtN(tot.cantidad) },
          { label: 'Monto total',  valor: `Bs ${fmt(tot.total)}`, color: 'text-red-600 dark:text-red-400' },
        ]} />
      )}
      {!cargando && filas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          {filas.map((r, i) => {
            const pct = totalMonto > 0 ? (Number(r.total_monto) / totalMonto) * 100 : 0;
            return (
              <div key={i} className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3">
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{r.categoria}</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">Bs {fmt(r.total_monto)}</span>
                </div>
                <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div className={`h-full ${colores[i % colores.length]} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-zinc-400 mt-1">{pct.toFixed(1)}% · {r.num_gastos} gastos</p>
              </div>
            );
          })}
        </div>
      )}
      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="Sin gastos en el período" />
    </div>
  );
}
