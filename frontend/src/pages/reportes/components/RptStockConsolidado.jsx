import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { fmt, fmtN, BtnPDF, Tabla, Resumen } from './ReportesShared';

const INPUT = 'w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400';

function StockBadge({ disponible, minimo }) {
  const bajo = Number(disponible) <= Number(minimo);
  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
      bajo
        ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
        : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
    }`}>
      {bajo ? 'Bajo mínimo' : 'OK'}
    </span>
  );
}

function CardStock({ fila }) {
  const bajo = Number(fila.cantidad_disponible) <= Number(fila.stock_minimo);
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-white text-sm leading-tight truncate">{fila.producto}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">{fila.codigo_interno}</p>
        </div>
        <StockBadge disponible={fila.cantidad_disponible} minimo={fila.stock_minimo} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-2">
          <p className="text-zinc-400 dark:text-zinc-500 mb-0.5">Marca</p>
          <p className="font-medium text-zinc-700 dark:text-zinc-300 truncate">{fila.marca || '—'}</p>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-2">
          <p className="text-zinc-400 dark:text-zinc-500 mb-0.5">Categoría</p>
          <p className="font-medium text-zinc-700 dark:text-zinc-300 truncate">{fila.categoria || '—'}</p>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-2">
          <p className="text-zinc-400 dark:text-zinc-500 mb-0.5">Depósito</p>
          <p className="font-medium text-zinc-700 dark:text-zinc-300 truncate">{fila.deposito || '—'}</p>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-2">
          <p className="text-zinc-400 dark:text-zinc-500 mb-0.5">P. Público</p>
          <p className="font-semibold font-mono text-zinc-900 dark:text-white">Bs {fmt(fila.precio_publico)}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 pt-2 border-t border-zinc-100 dark:border-zinc-700 text-center">
        <div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Total</p>
          <p className="font-mono font-semibold text-sm text-zinc-900 dark:text-white">{fmtN(fila.cantidad)}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Reservado</p>
          <p className="font-mono font-semibold text-sm text-zinc-900 dark:text-white">{fmtN(fila.cantidad_reservada)}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Disponible</p>
          <p className={`font-mono font-semibold text-sm ${bajo ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
            {fmtN(fila.cantidad_disponible)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Mínimo</p>
          <p className="font-mono font-semibold text-sm text-zinc-500 dark:text-zinc-400">{fmtN(fila.stock_minimo)}</p>
        </div>
      </div>
    </div>
  );
}

export default function RptStockConsolidado() {
  const [filtros, setFiltros]       = useState({ con_stock: '1', id_sucursal: '' });
  const [filas, setFilas]           = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando]     = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    const p = { ...filtros };
    if (!p.id_sucursal) delete p.id_sucursal;
    reportesService.getStockConsolidado(p)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => {
    reportesService.getFormDataSucursales().then(r => setSucursales(r.data)).catch(() => {});
    buscar();
  }, []);

  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totalUnidades = filas.reduce((a, r) => a + Number(r.cantidad), 0);
  const alertas       = filas.filter(r => Number(r.cantidad_disponible) <= Number(r.stock_minimo)).length;

  const cols = [
    { key: 'codigo_interno',      label: 'Código' },
    { key: 'producto',            label: 'Producto',    bold: true },
    { key: 'marca',               label: 'Marca' },
    { key: 'categoria',           label: 'Categoría' },
    { key: 'deposito',            label: 'Depósito' },
    { key: 'cantidad',            label: 'Cantidad',    align: 'right', render: v => fmtN(v) },
    { key: 'cantidad_reservada',  label: 'Reservado',   align: 'right', render: v => fmtN(v) },
    { key: 'cantidad_disponible', label: 'Disponible',  align: 'right', render: (v, r) => (
        <span className={Number(v) <= Number(r.stock_minimo) ? 'text-red-500 font-semibold' : 'text-green-600 dark:text-green-400 font-semibold'}>
          {fmtN(v)}
        </span>
      )
    },
    { key: 'costo_promedio',      label: 'Costo Prom.', align: 'right', render: v => fmt(v) },
    { key: 'precio_publico',      label: 'P. Público',  align: 'right', render: v => `Bs ${fmt(v)}` },
    { key: 'stock_minimo',        label: 'Mínimo',      align: 'right', render: v => fmtN(v) },
  ];

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-full sm:w-48">
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Sucursal / Punto de venta</label>
          <select value={filtros.id_sucursal} onChange={e => f('id_sucursal', e.target.value)} className={INPUT}>
            <option value="">Todas las sucursales</option>
            {sucursales.map(s => (
              <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pb-1">
          <input
            type="checkbox"
            id="con_stock"
            checked={filtros.con_stock === '1'}
            onChange={e => f('con_stock', e.target.checked ? '1' : '')}
            className="w-4 h-4 accent-yellow-400 cursor-pointer"
          />
          <label htmlFor="con_stock" className="text-sm text-zinc-600 dark:text-zinc-400 select-none cursor-pointer">
            Solo con stock
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={buscar}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors"
          >
            Consultar
          </button>
          <BtnPDF tipo="stock" filtros={Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''))} />
        </div>
      </div>

      {/* Resumen */}
      <Resumen items={[
        { label: 'Líneas',         valor: fmtN(filas.length) },
        { label: 'Total unidades', valor: fmtN(totalUnidades) },
        { label: 'Bajo mínimo',    valor: fmtN(alertas), color: alertas > 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400' },
      ]} />

      {/* Contenido */}
      {cargando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filas.length === 0 ? (
        <p className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">Sin registros de stock</p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="grid gap-3 md:hidden">
            {filas.map((fila, i) => <CardStock key={i} fila={fila} />)}
          </div>
          {/* Desktop: tabla */}
          <div className="hidden md:block">
            <Tabla columnas={cols} filas={filas} cargando={false} vacio="Sin registros de stock" />
          </div>
        </>
      )}
    </div>
  );
}
