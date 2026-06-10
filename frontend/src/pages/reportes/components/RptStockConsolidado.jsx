import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { fmt, fmtN, BtnPDF, Tabla, Resumen } from './ReportesShared';

export default function RptStockConsolidado() {
  const [filtros, setFiltros]   = useState({ con_stock: '1' });
  const [filas, setFilas]       = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getStockConsolidado(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totalUnidades = filas.reduce((a, r) => a + Number(r.cantidad), 0);
  const alertas       = filas.filter(r => Number(r.cantidad_disponible) <= Number(r.stock_minimo)).length;

  const cols = [
    { key: 'codigo_interno',      label: 'Código' },
    { key: 'producto',            label: 'Producto',    bold: true },
    { key: 'marca',               label: 'Marca' },
    { key: 'categoria',           label: 'Categoría' },
    { key: 'deposito',            label: 'Depósito' },
    { key: 'cantidad',            label: 'Cantidad',    align: 'right', render: v => fmtN(v) },
    { key: 'cantidad_reservada',  label: 'Reservado',   align: 'right', render: v => fmtN(v) },
    { key: 'cantidad_disponible', label: 'Disponible',  align: 'right', render: (v, r) => (
        <span className={Number(v) <= Number(r.stock_minimo) ? 'text-red-500 font-semibold' : 'text-green-600 dark:text-green-400 font-semibold'}>
          {fmtN(v)}
        </span>
      )
    },
    { key: 'costo_promedio',      label: 'Costo Prom.', align: 'right', render: v => fmt(v) },
    { key: 'precio_publico',      label: 'P. Público',  align: 'right', render: v => `Bs ${fmt(v)}` },
    { key: 'stock_minimo',        label: 'Mínimo',      align: 'right', render: v => fmtN(v) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="con_stock" checked={filtros.con_stock === '1'}
            onChange={e => f('con_stock', e.target.checked ? '1' : '')}
            className="w-4 h-4 accent-yellow-400" />
          <label htmlFor="con_stock" className="text-sm text-zinc-600 dark:text-zinc-400">Solo con stock</label>
        </div>
        <button onClick={buscar}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">
          Consultar
        </button>
        <BtnPDF tipo="stock" filtros={filtros} />
      </div>
      <Resumen items={[
        { label: 'Líneas',          valor: fmtN(filas.length) },
        { label: 'Total unidades',  valor: fmtN(totalUnidades) },
        { label: 'Bajo mínimo',     valor: fmtN(alertas), color: alertas > 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="Sin registros de stock" />
    </div>
  );
}
