import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, BtnPDF, Tabla, Resumen, EstadoBadge } from './ReportesShared';

export default function RptCompras() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getCompras(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const total = filas.reduce((a, r) => a + Number(r.total), 0);

  const cols = [
    { key: 'numero',          label: 'N°',         bold: true },
    { key: 'fecha_pedido',    label: 'Fecha' },
    { key: 'proveedor',       label: 'Proveedor' },
    { key: 'sucursal',        label: 'Sucursal' },
    { key: 'condicion_pago',  label: 'Condición' },
    { key: 'total',           label: 'Total Bs',   align: 'right', render: v => fmt(v) },
    { key: 'saldo_pendiente', label: 'Saldo Bs',   align: 'right', render: v => Number(v) > 0 ? <span className="text-red-500">{fmt(v)}</span> : '—' },
    { key: 'estado',          label: 'Estado',     render: v => <EstadoBadge estado={v} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <BtnConsultar onClick={buscar} />
        <BtnPDF tipo="compras" filtros={filtros} />
      </div>
      <Resumen items={[
        { label: 'Compras', valor: fmtN(filas.length) },
        { label: 'Total',   valor: `Bs ${fmt(total)}`, color: 'text-blue-600 dark:text-blue-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}
