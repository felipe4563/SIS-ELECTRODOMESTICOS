import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, Tabla, Resumen } from './ReportesShared';

export default function RptCajaChica() {
  const [filtros, setFiltros]   = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [data, setData]         = useState({ historial: [], totalPorCaja: [], saldos: [] });
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getCajaChica(filtros)
      .then(r => { setData(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totalRepuesto = data.totalPorCaja.reduce((a, r) => a + Number(r.total_repuesto), 0);

  const colsHistorial = [
    { key: 'fecha',        label: 'Fecha' },
    { key: 'caja_origen',  label: 'De' },
    { key: 'caja_destino', label: 'A',  bold: true },
    { key: 'sucursal',     label: 'Sucursal' },
    { key: 'monto',        label: 'Monto Bs', align: 'right', render: v => fmt(v) },
    { key: 'usuario',      label: 'Usuario' },
    { key: 'observaciones',label: 'Observaciones', render: v => v || '—' },
  ];

  const colsTotales = [
    { key: 'caja',              label: 'Caja Chica', bold: true },
    { key: 'sucursal',          label: 'Sucursal' },
    { key: 'num_reposiciones',  label: 'N° reposiciones', align: 'right', render: v => fmtN(v) },
    { key: 'total_repuesto',    label: 'Total repuesto Bs', align: 'right', render: v => fmt(v) },
  ];

  const colsSaldos = [
    { key: 'caja',              label: 'Caja Chica', bold: true },
    { key: 'sucursal',          label: 'Sucursal' },
    { key: 'monto_fondo_fijo',  label: 'Fondo fijo Bs', align: 'right', render: v => fmt(v) },
    { key: 'saldo_actual',      label: 'Saldo actual Bs', align: 'right', render: (v, row) => v === null
        ? <span className="text-zinc-400">Sin turno abierto</span>
        : <span className={Number(v) < Number(row.monto_fondo_fijo) * 0.3 ? 'text-red-500 font-semibold' : 'text-green-600 dark:text-green-400 font-semibold'}>{fmt(v)}</span>
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <BtnConsultar onClick={buscar} />
      </div>

      <Resumen items={[
        { label: 'Reposiciones', valor: fmtN(data.historial.length) },
        { label: 'Total repuesto', valor: `Bs ${fmt(totalRepuesto)}` },
        { label: 'Cajas chicas', valor: fmtN(data.saldos.length) },
      ]} />

      <div>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Saldo actual vs. fondo fijo</h3>
        <Tabla columnas={colsSaldos} filas={data.saldos} cargando={cargando} vacio="Sin cajas chicas configuradas" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Total repuesto por caja (período)</h3>
        <Tabla columnas={colsTotales} filas={data.totalPorCaja} cargando={cargando} vacio="Sin reposiciones en el período" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Historial de reposiciones</h3>
        <Tabla columnas={colsHistorial} filas={data.historial} cargando={cargando} vacio="Sin reposiciones en el período" />
      </div>
    </div>
  );
}
