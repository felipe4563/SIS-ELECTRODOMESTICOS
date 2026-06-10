import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, FiltroFechas, BtnConsultar } from './ReportesShared';

function Fila({ label, valor, indent, negativo, total, subtotal }) {
  return (
    <div className={`flex justify-between py-2.5 ${indent ? 'pl-6' : ''} ${total ? 'border-t-2 border-zinc-900 dark:border-white mt-1' : subtotal ? 'border-t border-zinc-200 dark:border-zinc-700' : ''}`}>
      <span className={`text-sm ${total ? 'font-bold text-zinc-900 dark:text-white' : subtotal ? 'font-semibold text-zinc-700 dark:text-zinc-300' : 'text-zinc-600 dark:text-zinc-400'}`}>{label}</span>
      <span className={`text-sm font-mono font-semibold ${total ? 'text-zinc-900 dark:text-white text-base' : negativo ? Number(valor) < 0 ? 'text-red-500' : 'text-red-400' : Number(valor) >= 0 ? 'text-zinc-900 dark:text-white' : 'text-red-500'}`}>
        {negativo ? `(Bs ${fmt(Math.abs(valor))})` : `Bs ${fmt(valor)}`}
      </span>
    </div>
  );
}

export default function RptEstadoResultados() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [data, setData]       = useState(null);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getEstadoResultados(filtros)
      .then(r => { setData(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <BtnConsultar onClick={buscar} />
      </div>
      {cargando && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {data && !cargando && (
        <div className="max-w-xl">
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="font-bold text-zinc-900 dark:text-white">Estado de Resultados</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{data.periodo.desde} al {data.periodo.hasta}</p>
            </div>
            <div className="px-6 py-4 divide-y divide-zinc-100 dark:divide-zinc-800">
              <Fila label="Ventas brutas"        valor={data.ingresos_brutos} />
              <Fila label="(-) Descuentos"       valor={data.descuentos}        indent negativo />
              <Fila label="(-) Devoluciones"     valor={data.devoluciones}      indent negativo />
              <Fila label="= Ingresos netos"     valor={data.ingresos_netos}    subtotal />
              <Fila label="(-) Costo de ventas"  valor={data.costo_ventas}      indent negativo />
              <div>
                <Fila label="= Utilidad bruta"   valor={data.utilidad_bruta}    subtotal />
                <p className="text-right text-xs text-zinc-400 mb-1">Margen: {data.margen_bruto}%</p>
              </div>
              <Fila label="(-) Gastos operativos" valor={data.gastos_operativos} indent negativo />
              <div>
                <Fila label="= Resultado neto"   valor={data.resultado_neto}    total />
                <p className="text-right text-xs text-zinc-400 mt-0.5">Margen neto: {data.margen_neto}%</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
