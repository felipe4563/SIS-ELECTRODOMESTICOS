import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmtN, FiltroFechas, BtnConsultar, BtnPDF, Tabla, Resumen, EstadoBadge } from './ReportesShared';

const ESTADOS = ['SOLICITADA', 'EN_TRANSITO', 'RECIBIDA', 'PARCIAL', 'ANULADA'];

export default function RptTransferencias() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy(), estado: '' });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    const p = { ...filtros };
    if (!p.estado) delete p.estado;
    reportesService.getTransferencias(p)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const cols = [
    { key: 'numero',           label: 'N°',             bold: true },
    { key: 'fecha_solicitud',  label: 'Solicitada' },
    { key: 'sucursal_origen',  label: 'Origen' },
    { key: 'deposito_origen',  label: 'Depósito origen' },
    { key: 'sucursal_destino', label: 'Destino' },
    { key: 'deposito_destino', label: 'Depósito destino' },
    { key: 'num_productos',    label: 'Productos',      align: 'right', render: v => fmtN(v) },
    { key: 'total_enviado',    label: 'Unidades',       align: 'right', render: v => fmtN(v) },
    { key: 'estado',           label: 'Estado',         render: v => <EstadoBadge estado={v} /> },
    { key: 'solicitante',      label: 'Solicitado por' },
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
        <BtnPDF tipo="transferencias" filtros={filtros} />
      </div>
      <Resumen items={[
        { label: 'Transferencias', valor: fmtN(filas.length) },
        { label: 'Total unidades', valor: fmtN(filas.reduce((a, r) => a + Number(r.total_enviado || 0), 0)) },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="Sin transferencias en el período" />
    </div>
  );
}
