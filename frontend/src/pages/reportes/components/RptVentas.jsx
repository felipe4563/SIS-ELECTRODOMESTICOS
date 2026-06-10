import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, BtnPDF, Tabla, Resumen, EstadoBadge } from './ReportesShared';

export default function RptVentas() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getVentas(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totales = filas.reduce((a, r) => ({ total: a.total + Number(r.total), cant: a.cant + 1 }), { total: 0, cant: 0 });

  const cols = [
    { key: 'numero',          label: 'N°',         bold: true },
    { key: 'fecha',           label: 'Fecha' },
    { key: 'cliente',         label: 'Cliente' },
    { key: 'vendedor',        label: 'Vendedor' },
    { key: 'sucursal',        label: 'Sucursal' },
    { key: 'condicion_pago',  label: 'Condición' },
    { key: 'total',           label: 'Total',       align: 'right', render: v => `Bs ${fmt(v)}` },
    { key: 'saldo_pendiente', label: 'Saldo',       align: 'right', render: v => Number(v) > 0 ? <span className="text-red-500">{`Bs ${fmt(v)}`}</span> : <span className="text-green-500">Pagado</span> },
    { key: 'estado',          label: 'Estado',      render: v => <EstadoBadge estado={v} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <BtnConsultar onClick={buscar} />
        <BtnPDF tipo="ventas" filtros={filtros} />
      </div>
      <Resumen items={[
        { label: 'Transacciones', valor: fmtN(totales.cant) },
        { label: 'Total', valor: `Bs ${fmt(totales.total)}`, color: 'text-yellow-600 dark:text-yellow-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}
