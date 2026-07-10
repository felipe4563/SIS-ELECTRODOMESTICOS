import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, BtnPDF, Tabla, Resumen, EstadoBadge } from './ReportesShared';

const INPUT = 'w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400';
const LABEL = 'text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1';

function CardVenta({ fila }) {
  const saldo = Number(fila.saldo_pendiente);
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold font-mono text-zinc-900 dark:text-white text-sm">{fila.numero}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{fila.fecha}</p>
        </div>
        <EstadoBadge estado={fila.estado} />
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-zinc-400 shrink-0">Cliente</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300 text-right truncate">{fila.cliente}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-zinc-400 shrink-0">Vendedor</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300 text-right truncate">{fila.vendedor}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-zinc-400 shrink-0">Sucursal</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300 text-right">{fila.sucursal}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-zinc-400 shrink-0">Condición</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{fila.condicion_pago}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-700">
        <div>
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total</p>
          <p className="font-mono font-bold text-sm text-zinc-900 dark:text-white">Bs {fmt(fila.total)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Saldo</p>
          {saldo > 0
            ? <p className="font-mono font-semibold text-sm text-red-500">Bs {fmt(saldo)}</p>
            : <p className="font-mono font-semibold text-sm text-green-500">Pagado</p>
          }
        </div>
      </div>
    </div>
  );
}

export default function RptVentas() {
  // fecha_desde, fecha_hasta, id_sucursal → backend; estado y condicion → client-side
  const [filtros, setFiltros]     = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy(), id_sucursal: '' });
  const [filas, setFilas]         = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando]   = useState(false);
  const [busqueda, setBusqueda]   = useState('');
  const [filEstado, setFilEstado] = useState('');
  const [filCondicion, setFilCondicion] = useState('');

  const buscar = useCallback(() => {
    setCargando(true);
    const p = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''));
    reportesService.getVentas(p)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => {
    reportesService.getFormDataSucursales().then(r => setSucursales(r.data)).catch(() => {});
    buscar();
  }, []);

  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const filasFiltradas = filas.filter(r => {
    if (filEstado    && r.estado?.toUpperCase()        !== filEstado.toUpperCase())    return false;
    if (filCondicion && r.condicion_pago?.toUpperCase() !== filCondicion.toUpperCase()) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (
        !r.numero?.toLowerCase().includes(q) &&
        !r.cliente?.toLowerCase().includes(q) &&
        !r.vendedor?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const pagadas        = filasFiltradas.filter(r => r.estado === 'PAGADA');
  const totalPagado    = pagadas.reduce((a, r) => a + Number(r.total), 0);
  const totalContado   = pagadas.filter(r => r.condicion_pago === 'CONTADO').reduce((a, r) => a + Number(r.total), 0);
  const totalCredito   = pagadas.filter(r => r.condicion_pago === 'CREDITO').reduce((a, r) => a + Number(r.total), 0);
  const saldoPendiente = filasFiltradas.filter(r => r.estado === 'EMITIDA' || r.estado === 'PARCIAL').reduce((a, r) => a + Number(r.saldo_pendiente), 0);
  const countAnulada   = filasFiltradas.filter(r => r.estado === 'ANULADA' || r.estado === 'DEVUELTA').length;

  const cols = [
    { key: 'numero',          label: 'N°',         bold: true },
    { key: 'fecha',           label: 'Fecha' },
    { key: 'cliente',         label: 'Cliente' },
    { key: 'vendedor',        label: 'Vendedor' },
    { key: 'sucursal',        label: 'Sucursal' },
    { key: 'condicion_pago',  label: 'Condición' },
    { key: 'total',           label: 'Total',       align: 'right', render: v => `Bs ${fmt(v)}` },
    { key: 'saldo_pendiente', label: 'Saldo',       align: 'right', render: v => Number(v) > 0
        ? <span className="text-red-500 font-semibold">Bs {fmt(v)}</span>
        : <span className="text-green-500 font-semibold">Pagado</span>
    },
    { key: 'estado', label: 'Estado', render: v => <EstadoBadge estado={v} /> },
  ];

  const filtrosPDF = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''));

  return (
    <div className="space-y-4">
      {/* Fila 1: fechas */}
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
      </div>

      {/* Fila 2: filtros adicionales */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-full sm:w-52">
          <label className={LABEL}>Buscar N° / cliente / vendedor</label>
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className={INPUT}
          />
        </div>

        <div className="w-full sm:w-44">
          <label className={LABEL}>Sucursal</label>
          <select value={filtros.id_sucursal} onChange={e => f('id_sucursal', e.target.value)} className={INPUT}>
            <option value="">Todas las sucursales</option>
            {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
          </select>
        </div>

        <div className="w-full sm:w-36">
          <label className={LABEL}>Estado</label>
          <select value={filEstado} onChange={e => setFilEstado(e.target.value)} className={INPUT}>
            <option value="">Todos</option>
            <option value="EMITIDA">Emitida</option>
            <option value="PAGADA">Pagada</option>
            <option value="PARCIAL">Parcial</option>
            <option value="ANULADA">Anulada</option>
            <option value="DEVUELTA">Devuelta</option>
          </select>
        </div>

        <div className="w-full sm:w-36">
          <label className={LABEL}>Condición</label>
          <select value={filCondicion} onChange={e => setFilCondicion(e.target.value)} className={INPUT}>
            <option value="">Todas</option>
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Crédito</option>
          </select>
        </div>

        <div className="flex gap-2">
          <BtnConsultar onClick={buscar} />
          <BtnPDF tipo="ventas" filtros={filtrosPDF} />
        </div>
      </div>

      {/* Resumen */}
      <Resumen items={[
        { label: 'Registros',        valor: fmtN(filasFiltradas.length) },
        { label: 'Total pagado',     valor: `Bs ${fmt(totalPagado)}`,    color: 'text-yellow-600 dark:text-yellow-400' },
        { label: 'Contado',          valor: `Bs ${fmt(totalContado)}`,   color: 'text-green-600 dark:text-green-400' },
        { label: 'Crédito',          valor: `Bs ${fmt(totalCredito)}`,   color: 'text-blue-600 dark:text-blue-400' },
        { label: 'Saldo pendiente',  valor: `Bs ${fmt(saldoPendiente)}`, color: saldoPendiente > 0 ? 'text-red-500' : undefined },
        { label: 'Anuladas/Dev.',    valor: fmtN(countAnulada),          color: countAnulada > 0 ? 'text-red-400' : undefined },
      ]} />

      {/* Contenido */}
      {cargando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filasFiltradas.length === 0 ? (
        <p className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">Sin registros de ventas</p>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {filasFiltradas.map((fila, i) => <CardVenta key={i} fila={fila} />)}
          </div>
          <div className="hidden md:block">
            <Tabla columnas={cols} filas={filasFiltradas} cargando={false} vacio="Sin registros de ventas" />
          </div>
        </>
      )}
    </div>
  );
}
