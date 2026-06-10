import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, Tabla } from './ReportesShared';

export default function RptVentasProducto() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getVentasProducto(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const cols = [
    { key: 'codigo_interno',   label: 'Código' },
    { key: 'producto',         label: 'Producto',    bold: true },
    { key: 'marca',            label: 'Marca' },
    { key: 'categoria',        label: 'Categoría' },
    { key: 'cantidad_vendida', label: 'Unidades',    align: 'right', render: v => fmtN(v) },
    { key: 'precio_promedio',  label: 'P. Prom Bs',  align: 'right', render: v => fmt(v) },
    { key: 'monto_total',      label: 'Total Bs',    align: 'right', render: v => fmt(v) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <BtnConsultar onClick={buscar} />
      </div>
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}
