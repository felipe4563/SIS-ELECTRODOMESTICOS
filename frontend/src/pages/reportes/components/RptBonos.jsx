import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, Tabla, Resumen } from './ReportesShared';

export default function RptBonos() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getBonosVendedores(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totalBonos = filas.reduce((a, r) => a + Number(r.total_bonos), 0);

  const cols = [
    { key: 'vendedor',          label: 'Vendedor',        bold: true },
    { key: 'sucursal',          label: 'Sucursal' },
    { key: 'num_ventas',        label: 'Ventas',          align: 'right', render: v => fmtN(v) },
    { key: 'unidades_vendidas', label: 'Unidades',        align: 'right', render: v => fmtN(v) },
    { key: 'total_ventas',      label: 'Monto ventas Bs', align: 'right', render: v => fmt(v) },
    { key: 'total_bonos',       label: 'Bonos Bs',        align: 'right', render: v => <span className="text-green-600 dark:text-green-400 font-semibold">{fmt(v)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <BtnConsultar onClick={buscar} />
      </div>
      <Resumen items={[
        { label: 'Vendedores',   valor: fmtN(filas.length) },
        { label: 'Total bonos',  valor: `Bs ${fmt(totalBonos)}`, color: 'text-green-600 dark:text-green-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}
