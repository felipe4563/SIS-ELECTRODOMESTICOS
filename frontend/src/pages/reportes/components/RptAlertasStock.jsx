import { useState, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { fmtN, BtnConsultar, Tabla, Resumen } from './ReportesShared';

export default function RptAlertasStock() {
  const [filas, setFilas]       = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getAlertasStock()
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, []);

  const sinStock   = filas.filter(r => r.estado_stock === 'SIN_STOCK').length;
  const bajoMinimo = filas.filter(r => r.estado_stock === 'BAJO_MINIMO').length;

  const cols = [
    { key: 'codigo_interno',       label: 'Código',     bold: true },
    { key: 'producto',             label: 'Producto' },
    { key: 'marca',                label: 'Marca' },
    { key: 'categoria',            label: 'Categoría' },
    { key: 'deposito',             label: 'Depósito' },
    { key: 'sucursal',             label: 'Sucursal' },
    { key: 'stock_minimo',         label: 'Mínimo',     align: 'right', render: v => fmtN(v) },
    { key: 'cantidad_disponible',  label: 'Disponible', align: 'right', render: v => fmtN(v) },
    { key: 'estado_stock',         label: 'Estado',     render: v => (
        <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
          v === 'SIN_STOCK'
            ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
            : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
        }`}>
          {v === 'SIN_STOCK' ? 'Sin stock' : 'Bajo mínimo'}
        </span>
      )},
  ];

  const consultado = filas.length > 0 || cargando;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <BtnConsultar onClick={buscar} />
      </div>
      {!consultado && !cargando && (
        <p className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">
          Presiona <span className="font-semibold text-zinc-500 dark:text-zinc-400">Consultar</span> para ver alertas de stock
        </p>
      )}
      {filas.length > 0 && (
        <Resumen items={[
          { label: 'Total alertas',  valor: fmtN(filas.length) },
          { label: 'Sin stock',      valor: fmtN(sinStock),   color: 'text-red-600 dark:text-red-400' },
          { label: 'Bajo mínimo',    valor: fmtN(bajoMinimo), color: 'text-orange-600 dark:text-orange-400' },
        ]} />
      )}
      {consultado && (
        <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="No hay productos bajo stock mínimo" />
      )}
    </div>
  );
}
