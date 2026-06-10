import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, Tabla, Resumen, EstadoBadge } from './ReportesShared';

export default function RptArqueosCaja() {
  const [filtros, setFiltros]   = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas]       = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getArqueosCaja(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totalAperturas = filas.reduce((a, r) => a + Number(r.monto_apertura), 0);

  const cols = [
    { key: 'caja',                 label: 'Caja',          bold: true },
    { key: 'sucursal',             label: 'Sucursal' },
    { key: 'usuario',              label: 'Usuario' },
    { key: 'fecha_apertura',       label: 'Apertura' },
    { key: 'fecha_cierre',         label: 'Cierre',        render: v => v || '—' },
    { key: 'monto_apertura',       label: 'Apertura Bs',   align: 'right', render: v => fmt(v) },
    { key: 'monto_cierre_sistema', label: 'Sistema Bs',    align: 'right', render: v => v != null ? fmt(v) : '—' },
    { key: 'monto_cierre_real',    label: 'Real Bs',       align: 'right', render: v => v != null ? fmt(v) : '—' },
    { key: 'diferencia',           label: 'Diferencia Bs', align: 'right', render: v => v != null ? (
        <span className={Number(v) < 0 ? 'text-red-500 font-semibold' : Number(v) > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>{fmt(v)}</span>
      ) : '—'
    },
    { key: 'estado',               label: 'Estado',        render: v => <EstadoBadge estado={v} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <BtnConsultar onClick={buscar} />
      </div>
      <Resumen items={[
        { label: 'Arqueos',        valor: fmtN(filas.length) },
        { label: 'Total apertura', valor: `Bs ${fmt(totalAperturas)}` },
        { label: 'Abiertos',       valor: fmtN(filas.filter(r => r.estado === 'ABIERTA').length), color: 'text-yellow-600 dark:text-yellow-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="Sin arqueos en el período" />
    </div>
  );
}
