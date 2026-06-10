import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, Tabla, Resumen } from './ReportesShared';

export default function RptVentasCliente() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getVentasCliente(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const cols = [
    { key: 'codigo',          label: 'Código' },
    { key: 'cliente',         label: 'Cliente',       bold: true },
    { key: 'tipo_cliente',    label: 'Tipo' },
    { key: 'num_compras',     label: 'Compras',       align: 'right', render: v => fmtN(v) },
    { key: 'total_comprado',  label: 'Total Bs',      align: 'right', render: v => fmt(v) },
    { key: 'saldo_pendiente', label: 'Saldo Bs',      align: 'right', render: v => Number(v) > 0 ? <span className="text-red-500">{fmt(v)}</span> : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <BtnConsultar onClick={buscar} />
      </div>
      <Resumen items={[{ label: 'Clientes', valor: fmtN(filas.length) }]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}
