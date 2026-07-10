import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, Tabla, Resumen, EstadoBadge } from './ReportesShared';

const ESTADOS = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'ANULADA'];

export default function RptDevoluciones() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy(), estado: '' });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    const p = { ...filtros };
    if (!p.estado) delete p.estado;
    reportesService.getDevoluciones(p)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const total = filas.reduce((a, r) => a + Number(r.total || 0), 0);

  const cols = [
    { key: 'numero',        label: 'N°',          bold: true },
    { key: 'fecha',         label: 'Fecha' },
    { key: 'venta_numero',  label: 'Venta' },
    { key: 'cliente',       label: 'Cliente' },
    { key: 'sucursal',      label: 'Sucursal' },
    { key: 'motivo',        label: 'Motivo' },
    { key: 'total',         label: 'Total',        align: 'right', render: v => `Bs ${fmt(v)}` },
    { key: 'estado',        label: 'Estado',       render: v => <EstadoBadge estado={v} /> },
    { key: 'usuario',       label: 'Registrado por' },
  ];

  const INPUT = 'w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <div>
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Estado</label>
          <select value={filtros.estado} onChange={e => f('estado', e.target.value)} className={INPUT}>
            <option value="">Todos</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <BtnConsultar onClick={buscar} />
      </div>
      <Resumen items={[
        { label: 'Devoluciones', valor: fmtN(filas.length) },
        { label: 'Total',        valor: `Bs ${fmt(total)}`, color: 'text-red-600 dark:text-red-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="Sin devoluciones en el período" />
    </div>
  );
}
