import { useState, useEffect, useMemo } from 'react';
import { inventarioService } from '../../services/inventario.service';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtNum = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function exportarCSV(depositos, productosFiltrados) {
  const sep = ',';
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'Código', 'Producto', 'Marca', 'Categoría', 'Unidad', 'Stock Mín.',
    ...depositos.flatMap(d => [`${d.codigo} Disp.`, `${d.codigo} Res.`]),
    'Total Disp.', 'Estado',
  ];

  const rows = productosFiltrados.map(p => {
    const totalDisp = depositos.reduce((sum, d) => sum + (p.stock[d.id_deposito]?.cantidad_disponible ?? 0), 0);
    return [
      p.codigo_interno,
      p.producto,
      p.marca_nombre,
      p.categoria_nombre,
      `${p.unidad_nombre} (${p.unidad_codigo})`,
      p.stock_minimo,
      ...depositos.flatMap(d => [
        p.stock[d.id_deposito]?.cantidad_disponible ?? 0,
        p.stock[d.id_deposito]?.cantidad_reservada  ?? 0,
      ]),
      totalDisp,
      p.activo ? 'Activo' : 'Inactivo',
    ].map(esc).join(sep);
  });

  const csv     = [headers.map(esc).join(sep), ...rows].join('\n');
  const blob    = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `stock_consolidado_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Estado de fila ────────────────────────────────────────────────────────────
function estadoStock(totalDisp, stockMin) {
  if (totalDisp === 0)             return { label: 'Sin stock', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  if (totalDisp <= Number(stockMin)) return { label: 'Bajo mínimo', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
  return { label: 'OK', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function StockConsolidado() {
  const [data,    setData]    = useState({ depositos: [], productos: [] });
  const [cargando,setCargando]= useState(true);
  const [busqueda,setBusqueda]= useState('');
  const [filMarca,setFilMarca]= useState('');
  const [filCat,  setFilCat]  = useState('');
  const [filEstado,setFilEstado] = useState(''); // '' | 'ok' | 'bajo' | 'sin'

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await inventarioService.getStockConsolidado();
      setData(res.data);
    } catch { /* silencioso */ }
    finally  { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  // Opciones únicas para filtros
  const marcas = useMemo(() =>
    [...new Set(data.productos.map(p => p.marca_nombre))].sort(), [data.productos]);
  const categorias = useMemo(() =>
    [...new Set(data.productos.map(p => p.categoria_nombre))].sort(), [data.productos]);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return data.productos.filter(p => {
      if (q && !p.producto.toLowerCase().includes(q) &&
               !p.codigo_interno.toLowerCase().includes(q) &&
               !(p.codigo_barras ?? '').toLowerCase().includes(q)) return false;
      if (filMarca && p.marca_nombre !== filMarca)     return false;
      if (filCat   && p.categoria_nombre !== filCat)  return false;
      if (filEstado) {
        const total = data.depositos.reduce(
          (s, d) => s + (p.stock[d.id_deposito]?.cantidad_disponible ?? 0), 0
        );
        if (filEstado === 'sin'  && total !== 0)              return false;
        if (filEstado === 'bajo' && !(total > 0 && total <= Number(p.stock_minimo))) return false;
        if (filEstado === 'ok'   && !(total > Number(p.stock_minimo)))               return false;
      }
      return true;
    });
  }, [data, busqueda, filMarca, filCat, filEstado]);

  const { depositos } = data;

  // Resumen rápido
  const resumen = useMemo(() => {
    let sinStock = 0, bajoMin = 0, ok = 0;
    for (const p of data.productos) {
      const total = depositos.reduce((s, d) => s + (p.stock[d.id_deposito]?.cantidad_disponible ?? 0), 0);
      if (total === 0)                          sinStock++;
      else if (total <= Number(p.stock_minimo)) bajoMin++;
      else                                      ok++;
    }
    return { total: data.productos.length, sinStock, bajoMin, ok };
  }, [data, depositos]);

  return (
    <div className="space-y-5">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Stock Consolidado</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {data.depositos.length} depósito{data.depositos.length !== 1 ? 's' : ''} · {data.productos.length} producto{data.productos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cargar}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            ↻ Actualizar
          </button>
          <button
            onClick={() => exportarCSV(depositos, productosFiltrados)}
            disabled={productosFiltrados.length === 0}
            className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            ⬇ Exportar CSV
          </button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total productos', val: resumen.total,    color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Sin stock',       val: resumen.sinStock, color: 'text-red-600 dark:text-red-400',    onClick: () => setFilEstado(f => f === 'sin' ? '' : 'sin') },
          { label: 'Bajo mínimo',     val: resumen.bajoMin,  color: 'text-orange-600 dark:text-orange-400', onClick: () => setFilEstado(f => f === 'bajo' ? '' : 'bajo') },
          { label: 'Stock OK',        val: resumen.ok,       color: 'text-green-600 dark:text-green-400', onClick: () => setFilEstado(f => f === 'ok' ? '' : 'ok') },
        ].map(({ label, val, color, onClick }) => (
          <div
            key={label}
            onClick={onClick}
            className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 ${onClick ? 'cursor-pointer hover:border-yellow-400 transition-colors' : ''}`}
          >
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar código o producto…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <select
          value={filMarca}
          onChange={e => setFilMarca(e.target.value)}
          className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="">Todas las marcas</option>
          {marcas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filCat}
          onChange={e => setFilCat(e.target.value)}
          className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filEstado}
          onChange={e => setFilEstado(e.target.value)}
          className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="">Todos los estados</option>
          <option value="ok">Stock OK</option>
          <option value="bajo">Bajo mínimo</option>
          <option value="sin">Sin stock</option>
        </select>
        {(busqueda || filMarca || filCat || filEstado) && (
          <button
            onClick={() => { setBusqueda(''); setFilMarca(''); setFilCat(''); setFilEstado(''); }}
            className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-20 text-zinc-400">Cargando stock…</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-zinc-400">Sin resultados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                  <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">Código</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap min-w-[180px]">Producto</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">Marca</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">Unidad</th>
                  <th className="text-right px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">Stock Mín.</th>
                  {depositos.map(d => (
                    <th key={d.id_deposito} colSpan={2}
                      className="text-center px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap border-l border-zinc-200 dark:border-zinc-700">
                      {d.codigo}
                      <span className="block text-[10px] font-normal text-zinc-400 dark:text-zinc-500 truncate max-w-[100px]">{d.nombre}</span>
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap border-l border-zinc-200 dark:border-zinc-700">Total Disp.</th>
                  <th className="text-center px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">Estado</th>
                </tr>
                {/* Subheader depositos */}
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-[11px] text-zinc-400 dark:text-zinc-500">
                  <td colSpan={5} />
                  {depositos.map(d => (
                    <>
                      <td key={`${d.id_deposito}-d`} className="text-right px-3 py-1 border-l border-zinc-200 dark:border-zinc-700">Disp.</td>
                      <td key={`${d.id_deposito}-r`} className="text-right px-3 py-1">Res.</td>
                    </>
                  ))}
                  <td colSpan={2} />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {productosFiltrados.map(p => {
                  const totalDisp = depositos.reduce(
                    (s, d) => s + (p.stock[d.id_deposito]?.cantidad_disponible ?? 0), 0
                  );
                  const est = estadoStock(totalDisp, p.stock_minimo);
                  const rowCls = totalDisp === 0
                    ? 'bg-red-50/40 dark:bg-red-900/5'
                    : totalDisp <= Number(p.stock_minimo)
                      ? 'bg-orange-50/40 dark:bg-orange-900/5'
                      : '';

                  return (
                    <tr key={p.id_producto} className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors ${rowCls}`}>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">{p.codigo_interno}</span>
                        {p.codigo_barras && (
                          <span className="block font-mono text-[10px] text-zinc-400">{p.codigo_barras}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 min-w-[180px]">
                        <p className="font-medium text-zinc-900 dark:text-white leading-tight">{p.producto}</p>
                        {p.detalle && <p className="text-[11px] text-zinc-400 truncate max-w-[200px]">{p.detalle}</p>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-700 dark:text-zinc-300">{p.marca_nombre}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                        {p.unidad_nombre} <span className="text-xs">({p.unidad_codigo})</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono text-zinc-700 dark:text-zinc-300">
                        {fmtNum(p.stock_minimo)}
                      </td>
                      {depositos.map(d => {
                        const s = p.stock[d.id_deposito];
                        const disp = s?.cantidad_disponible ?? 0;
                        const res  = s?.cantidad_reservada  ?? 0;
                        return (
                          <>
                            <td key={`${p.id_producto}-${d.id_deposito}-d`}
                              className={`px-3 py-2.5 text-right whitespace-nowrap font-mono border-l border-zinc-100 dark:border-zinc-800 ${disp === 0 ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-800 dark:text-zinc-200 font-semibold'}`}>
                              {fmtNum(disp)}
                            </td>
                            <td key={`${p.id_producto}-${d.id_deposito}-r`}
                              className="px-3 py-2.5 text-right whitespace-nowrap font-mono text-zinc-400 dark:text-zinc-500">
                              {res > 0 ? fmtNum(res) : '—'}
                            </td>
                          </>
                        );
                      })}
                      <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono font-bold text-zinc-900 dark:text-white border-l border-zinc-200 dark:border-zinc-700">
                        {fmtNum(totalDisp)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${est.cls}`}>
                          {est.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Footer */}
        {!cargando && productosFiltrados.length > 0 && (
          <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-600">
            Mostrando {productosFiltrados.length} de {data.productos.length} productos
          </div>
        )}
      </div>
    </div>
  );
}
