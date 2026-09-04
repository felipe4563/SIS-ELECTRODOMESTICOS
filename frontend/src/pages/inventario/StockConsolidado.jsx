import { useState, useEffect, Fragment } from 'react';
import { inventarioService } from '../../services/inventario.service';
import { usePermission }     from '../../hooks/usePermission';
import { useEmpresa }        from '../../contexts/EmpresaContext';
import { descargarStockReportePDF } from './StockReporte';
import StockImprimirBoton from './StockImprimirBoton';

const toNum  = n => { const v = Number(n ?? 0); return isNaN(v) ? 0 : v; };
const fmtNum = n => toNum(n).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const specLinea = p => [p.modelo && `Mod: ${p.modelo}`, p.color && `Color: ${p.color}`, p.capacidad && `Cap: ${p.capacidad}`].filter(Boolean).join('  ·  ');

const RESUMEN_VACIO = { total: 0, unidades: 0, sinStock: 0, bajoMin: 0, ok: 0 };
const FACETAS_VACIAS = { marcas: [], productos: [], modelos: [], colores: [], capacidades: [] };
const LIMIT = 20;

// ── Celda inline editable de stock mínimo ────────────────────────────────────
function StockMinCell({ id_producto, value, editable, onSave }) {
  const [edit,   setEdit]   = useState(false);
  const [val,    setVal]    = useState(value);
  const [saving, setSaving] = useState(false);

  if (!editable) return <span className="font-mono tabular-nums">{fmtNum(value)}</span>;

  if (!edit) {
    return (
      <button
        onClick={() => { setVal(value); setEdit(true); }}
        title="Editar stock mínimo"
        className="font-mono tabular-nums underline decoration-dashed underline-offset-2 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
      >
        {fmtNum(value)}
      </button>
    );
  }

  const guardar = async () => {
    const num = Number(val);
    if (isNaN(num) || num < 0) return;
    setSaving(true);
    try { await onSave(id_producto, num); setEdit(false); }
    catch { /* silencioso */ }
    finally { setSaving(false); }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number" min={0} value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEdit(false); }}
        className="w-20 px-1.5 py-0.5 rounded border border-amber-400 text-right font-mono text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none"
        autoFocus disabled={saving}
      />
      <button onClick={guardar} disabled={saving} className="text-green-500 hover:text-green-400 font-bold text-xs">✓</button>
      <button onClick={() => setEdit(false)} disabled={saving} className="text-zinc-400 hover:text-zinc-300 text-xs">✕</button>
    </div>
  );
}

// ── Estado de fila ────────────────────────────────────────────────────────────
function estadoStock(totalDisp, stockMin) {
  if (totalDisp === 0)
    return { label: 'Sin stock',   badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             bar: 'bg-red-500' };
  if (totalDisp <= Number(stockMin))
    return { label: 'Bajo mínimo', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', bar: 'bg-orange-400' };
  return   { label: 'OK',          badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',     bar: '' };
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, colorCls, isTotal, onClick, active }) {
  const border = isTotal
    ? 'border-t-2 border-t-amber-400 dark:border-t-amber-500 border-zinc-200 dark:border-zinc-800'
    : active
      ? 'border-amber-400 dark:border-amber-500'
      : 'border-zinc-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-600';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex flex-col gap-1 p-4 text-left rounded-2xl border bg-white dark:bg-zinc-900 transition-all ${border} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 leading-none">{label}</span>
      <span className={`text-3xl font-bold tabular-nums leading-none mt-1 ${colorCls}`}>{value}</span>
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function StockConsolidado() {
  const { puede } = usePermission();
  const verTodos     = puede('ver_todos_depositos', 'inventario');
  const puedeEditMin = puede('stock_minimo_editar', 'inventario');
  const { empresa, logoUrl } = useEmpresa() ?? {};

  const [depositos, setDepositos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [resumen,   setResumen]   = useState(RESUMEN_VACIO);
  const [facetas,   setFacetas]   = useState(FACETAS_VACIAS);

  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState(null);
  const [busqueda,  setBusqueda]  = useState('');
  const [filMarca,  setFilMarca]  = useState('');
  const [filProducto, setFilProducto] = useState('');
  const [filModelo,   setFilModelo]   = useState('');
  const [filColor,     setFilColor]     = useState('');
  const [filCapacidad, setFilCapacidad] = useState('');
  const [filEstado, setFilEstado] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [productosExport, setProductosExport] = useState([]);
  const [depositosVisibles, setDepositosVisibles] = useState(null); // null = todos (default backend)

  // Mismos filtros que usa `cargar`, sin page/limit — para el listado paginado
  // y para la exportación completa (impresión/PDF) comparten exactamente los
  // mismos criterios de búsqueda.
  const construirFiltros = () => {
    const params = {};
    if (busqueda)     params.busqueda  = busqueda;
    if (filMarca)     params.marca     = filMarca;
    if (filProducto)  params.producto  = filProducto;
    if (filModelo)    params.modelo    = filModelo;
    if (filColor)     params.color     = filColor;
    if (filCapacidad) params.capacidad = filCapacidad;
    if (filEstado)    params.estado    = filEstado;
    if (depositosVisibles !== null) params.depositos = [...depositosVisibles].join(',');
    return params;
  };

  // Trae TODOS los productos que matchean los filtros actuales (sin paginar,
  // con tope de seguridad en el backend) — solo se usa al imprimir/exportar,
  // ya que la tabla en pantalla solo mantiene la página actual en memoria.
  const cargarExport = async () => {
    const res = await inventarioService.exportarStockConsolidado(construirFiltros());
    setProductosExport(res.data.productos ?? []);
    return res.data;
  };

  const cargar = async (p = page) => {
    setCargando(true);
    setError(null);
    try {
      const params = { ...construirFiltros(), page: p, limit: LIMIT };

      const res = await inventarioService.getStockConsolidado(params);
      setDepositos(res.data.depositos ?? []);
      setProductos(res.data.productos ?? []);
      setTotal(res.data.total ?? 0);
      setPage(res.data.page ?? p);
      setResumen(res.data.resumen ?? RESUMEN_VACIO);
      setFacetas(res.data.facetas ?? FACETAS_VACIAS);
    } catch (err) {
      const msg = err?.response?.data?.mensaje || err?.response?.data?.error || 'Error al cargar el inventario';
      setError(msg);
    } finally { setCargando(false); }
  };

  const handleStockMinimo = async (id_producto, nuevoMin) => {
    await inventarioService.editarStockMinimo(id_producto, { stock_minimo: nuevoMin });
    setProductos(prev => prev.map(p =>
      p.id_producto === id_producto ? { ...p, stock_minimo: nuevoMin } : p
    ));
  };

  // Búsqueda automática: al entrar y cada vez que cambian los filtros (con debounce),
  // resetea a la página 1. También se dispara al alternar los depósitos visibles.
  useEffect(() => {
    const t = setTimeout(() => { cargar(1); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, filMarca, filProducto, filModelo, filColor, filCapacidad, filEstado, depositosVisibles]);

  const { marcas, productos: productosDisponibles, modelos: modelosDisponibles, colores: coloresDisponibles, capacidades: capacidadesDisponibles } = facetas;

  const cambiarFilMarca    = v => { setFilMarca(v); setFilProducto(''); setFilModelo(''); setFilColor(''); setFilCapacidad(''); };
  const cambiarFilProducto = v => { setFilProducto(v); setFilModelo(''); setFilColor(''); setFilCapacidad(''); };
  const cambiarFilModelo   = v => { setFilModelo(v); setFilColor(''); setFilCapacidad(''); };
  const cambiarFilColor    = v => { setFilColor(v); setFilCapacidad(''); };

  const depositosMostrados = depositos.filter(d => !depositosVisibles || depositosVisibles.has(d.id_deposito));
  const toggleDeposito = (id_deposito) => setDepositosVisibles(prev => {
    const next = new Set(prev ?? depositos.map(d => d.id_deposito));
    next.has(id_deposito) ? next.delete(id_deposito) : next.add(id_deposito);
    return next;
  });
  const mostrarTodosDepositos  = () => setDepositosVisibles(new Set(depositos.map(d => d.id_deposito)));
  const mostrarNingunDeposito  = () => setDepositosVisibles(new Set());

  // Ya vienen filtrados + paginados desde el backend — esta es la página actual.
  const productosFiltrados = productos;

  const totalPages = Math.max(Math.ceil(total / LIMIT), 1);

  const hayFiltros = busqueda || filMarca || filProducto || filModelo || filColor || filCapacidad || filEstado;
  const limpiar    = () => { setBusqueda(''); setFilMarca(''); setFilProducto(''); setFilModelo(''); setFilColor(''); setFilCapacidad(''); setFilEstado(''); };

  // ── Estado de carga/error/vacío compartido ────────────────────────────────
  const innerContent = () => {
    if (cargando) return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
        <span className="text-2xl animate-spin leading-none">↻</span>
        <span className="text-sm">Cargando stock…</span>
      </div>
    );
    if (productosFiltrados.length === 0) return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-zinc-400">
        <span className="text-4xl leading-none">📦</span>
        <span className="text-sm mt-1">Sin resultados</span>
        {hayFiltros && (
          <button onClick={limpiar} className="text-amber-600 dark:text-amber-400 text-xs underline mt-1">
            Limpiar filtros
          </button>
        )}
      </div>
    );
    return null;
  };

  return (
    <div className="space-y-4">

      {/* ── Cabecera ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400 mb-1">
            Inventario
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white leading-none">
            {verTodos ? 'Stock Consolidado' : 'Mi Inventario'}
          </h1>
          {/* Depósitos — chips para elegir cuáles columnas mostrar en la tabla */}
          {!cargando && depositos.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {depositos.map(d => {
                const visible = depositosVisibles?.has(d.id_deposito) ?? true;
                return (
                  <button
                    key={d.id_deposito}
                    type="button"
                    role="switch"
                    aria-checked={visible}
                    onClick={() => toggleDeposito(d.id_deposito)}
                    title={visible ? 'Ocultar columna en la tabla' : 'Mostrar columna en la tabla'}
                    className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                      visible
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <span className={`relative inline-flex items-center w-6 h-3.5 rounded-full shrink-0 transition-colors ${
                      visible ? 'bg-amber-500 dark:bg-amber-400' : 'bg-zinc-300 dark:bg-zinc-600'
                    }`}>
                      <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${
                        visible ? 'translate-x-[13px]' : 'translate-x-0.5'
                      }`} />
                    </span>
                    {d.nombre}
                  </button>
                );
              })}
              {depositos.length > 1 && (
                <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 ml-1">
                  <button type="button" onClick={mostrarTodosDepositos} className="hover:underline hover:text-zinc-600 dark:hover:text-zinc-300">Todos</button>
                  ·
                  <button type="button" onClick={mostrarNingunDeposito} className="hover:underline hover:text-zinc-600 dark:hover:text-zinc-300">Ninguno</button>
                </span>
              )}
            </div>
          )}
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
            {depositos.length} depósito{depositos.length !== 1 ? 's' : ''} · {total} producto{total !== 1 ? 's' : ''}
            {puedeEditMin && (
              <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium hidden sm:inline">
                · Toca Stock Mín. para editar
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!cargando && productosFiltrados.length > 0 && (
            <>
              <StockImprimirBoton
                productos={productosExport}
                depositos={depositos}
                empresa={empresa}
                logoUrl={logoUrl}
                filtros={{ busqueda, marca: filMarca, producto: filProducto, modelo: filModelo, estado: filEstado }}
                preparando={imprimiendo}
                onAntesDeImprimir={async () => { setImprimiendo(true); try { await cargarExport(); } finally { setImprimiendo(false); } }}
              />
              <button
                disabled={descargando}
                onClick={async () => {
                  setDescargando(true);
                  try {
                    const { productos: todos } = await cargarExport();
                    await descargarStockReportePDF(todos, depositos, empresa, logoUrl);
                  } finally { setDescargando(false); }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all disabled:opacity-50"
              >
                <span className="hidden sm:inline">{descargando ? 'Generando…' : 'PDF'}</span>
                <span className="sm:hidden">📄</span>
              </button>
            </>
          )}
          <button
            onClick={() => cargar(page)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all"
          >
            <span className={cargando ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* ── Stat cards — 2×3 en móvil, 5 en línea en desktop ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <StatCard label="Total productos" value={resumen.total}           colorCls="text-zinc-900 dark:text-white"        isTotal />
        <StatCard label="Unidades en stock" value={fmtNum(resumen.unidades)} colorCls="text-zinc-900 dark:text-white"        isTotal />
        <StatCard label="Sin stock"       value={resumen.sinStock} colorCls="text-red-600 dark:text-red-400"       active={filEstado === 'sin'}  onClick={() => setFilEstado(f => f === 'sin'  ? '' : 'sin')} />
        <StatCard label="Bajo mínimo"     value={resumen.bajoMin}  colorCls="text-orange-500 dark:text-orange-400" active={filEstado === 'bajo'} onClick={() => setFilEstado(f => f === 'bajo' ? '' : 'bajo')} />
        <StatCard label="Stock OK"        value={resumen.ok}       colorCls="text-green-600 dark:text-green-400"   active={filEstado === 'ok'}   onClick={() => setFilEstado(f => f === 'ok'   ? '' : 'ok')} />
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        {/* búsqueda — ancho completo en móvil, ancho fijo y compacto en desktop */}
        <div className="relative w-full sm:w-56 shrink-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none select-none">⌕</span>
          <input
            type="text"
            placeholder="Buscar código, producto, marca o modelo…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        {/* selects — 2 en una fila en móvil, se acomodan con el espacio libre en desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-1 sm:flex-wrap gap-2">
          <select
            value={filMarca}
            onChange={e => cambiarFilMarca(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-auto sm:min-w-[140px]"
          >
            <option value="">Todas las marcas</option>
            {marcas.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={filProducto}
            onChange={e => cambiarFilProducto(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-auto sm:min-w-[140px]"
          >
            <option value="">Todos los productos</option>
            {productosDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={filModelo}
            onChange={e => cambiarFilModelo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-auto sm:min-w-[140px]"
          >
            <option value="">Todos los modelos</option>
            {modelosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={filColor}
            onChange={e => cambiarFilColor(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-auto sm:min-w-[140px]"
          >
            <option value="">Todos los colores</option>
            {coloresDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filCapacidad}
            onChange={e => setFilCapacidad(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-auto sm:min-w-[140px]"
          >
            <option value="">Todas las capacidades</option>
            {capacidadesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filEstado}
            onChange={e => setFilEstado(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-auto sm:min-w-[140px]"
          >
            <option value="">Todos los estados</option>
            <option value="ok">Stock OK</option>
            <option value="bajo">Bajo mínimo</option>
            <option value="sin">Sin stock</option>
          </select>
        </div>
        {hayFiltros && (
          <button
            onClick={limpiar}
            className="w-full sm:w-auto shrink-0 px-3 py-2 rounded-xl sm:rounded-none border sm:border-0 border-zinc-200 dark:border-zinc-700 text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors text-center"
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-red-500 text-lg leading-none mt-0.5 shrink-0">⚠</span>
          <div>
            <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
            <button onClick={() => cargar(page)} className="text-red-600 dark:text-red-500 text-xs underline mt-1">Reintentar</button>
          </div>
        </div>
      )}

      {/* ── Contenido principal ── */}
      {!error && (
        <>
          {/* ════════════════════════════════════
              MÓVIL — tarjetas por producto
              ════════════════════════════════════ */}
          <div className="md:hidden space-y-2">
            {(cargando || productosFiltrados.length === 0) ? (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                {innerContent()}
              </div>
            ) : (
              productosFiltrados.map(p => {
                const totalDisp = depositosMostrados.reduce(
                  (s, d) => s + toNum(p.stock[d.id_deposito]?.cantidad_disponible), 0
                );
                const est = estadoStock(totalDisp, p.stock_minimo);

                return (
                  <div key={p.id_producto}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex">
                    {/* Barra lateral de estado */}
                    <div className={`w-1 shrink-0 ${est.bar}`} />
                    <div className="flex-1 p-4 space-y-3 min-w-0">
                      {/* Fila superior: nombre + badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 dark:text-white leading-tight truncate">{p.producto}</p>
                          <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">{p.codigo_interno}</p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${est.badge}`}>
                          {est.label}
                        </span>
                      </div>

                      {/* Marca · Unidad */}
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {p.marca_nombre} · {p.unidad_nombre}
                      </p>
                      {p.detalle && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-2">{p.detalle}</p>
                      )}
                      {specLinea(p) && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 -mt-2">{specLinea(p)}</p>
                      )}

                      {/* Depósitos */}
                      {depositosMostrados.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {depositosMostrados.map(d => {
                            const disp = toNum(p.stock[d.id_deposito]?.cantidad_disponible);
                            return (
                              <div key={d.id_deposito}
                                className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-700">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">{d.codigo}</span>
                                <span className={`text-sm font-mono font-bold tabular-nums ${disp === 0 ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-800 dark:text-zinc-100'}`}>
                                  {fmtNum(disp)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Fila inferior: total + stock mínimo */}
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Total disp.</p>
                          <p className="text-xl font-bold font-mono tabular-nums text-zinc-900 dark:text-white leading-none mt-0.5">
                            {fmtNum(totalDisp)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Stock mín.</p>
                          <div className="mt-0.5">
                            <StockMinCell
                              id_producto={p.id_producto}
                              value={p.stock_minimo}
                              editable={puedeEditMin}
                              onSave={handleStockMinimo}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Paginación móvil */}
            {!cargando && productosFiltrados.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 px-1 py-2">
                <button
                  disabled={page === 1}
                  onClick={() => cargar(page - 1)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >← Anterior</button>
                <span className="text-xs text-zinc-500 shrink-0 font-mono">{page}/{totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => cargar(page + 1)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >Siguiente →</button>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════
              DESKTOP — tabla completa
              ════════════════════════════════════ */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {(cargando || productosFiltrados.length === 0) ? innerContent() : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                      <th className="sticky left-0 z-10 w-1 p-0 bg-zinc-50 dark:bg-zinc-800/60" aria-hidden />
                      <th className="sticky left-1 z-10 text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 whitespace-nowrap w-[260px] bg-zinc-50 dark:bg-zinc-800/60 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">Producto</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 whitespace-nowrap">Stock Mín.</th>
                      {depositosMostrados.map(d => (
                        <th key={d.id_deposito} colSpan={2}
                          className="text-center px-4 py-2 whitespace-nowrap border-l border-zinc-200 dark:border-zinc-700">
                          <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400">{d.codigo}</span>
                          <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[100px]">{d.nombre}</span>
                        </th>
                      ))}
                      <th className="sticky right-[110px] z-10 text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 whitespace-nowrap border-l border-zinc-200 dark:border-zinc-700 w-[96px] bg-zinc-50 dark:bg-zinc-800/60 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">Total</th>
                      <th className="sticky right-0 z-10 text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 whitespace-nowrap w-[110px] bg-zinc-50 dark:bg-zinc-800/60">Estado</th>
                    </tr>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                      <td className="sticky left-0 z-10 w-1 p-0 bg-zinc-50/50 dark:bg-zinc-800/30" aria-hidden />
                      <td className="sticky left-1 z-10 w-[260px] bg-zinc-50/50 dark:bg-zinc-800/30" />
                      <td />
                      {depositosMostrados.map(d => (
                        <Fragment key={d.id_deposito}>
                          <td className="text-right px-3 py-1.5 border-l border-zinc-200 dark:border-zinc-700">Disp.</td>
                          <td className="text-right px-3 py-1.5">Res.</td>
                        </Fragment>
                      ))}
                      <td className="sticky right-[110px] z-10 w-[96px] bg-zinc-50/50 dark:bg-zinc-800/30" />
                      <td className="sticky right-0 z-10 w-[110px] bg-zinc-50/50 dark:bg-zinc-800/30" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {productosFiltrados.map(p => {
                      const totalDisp = depositosMostrados.reduce(
                        (s, d) => s + toNum(p.stock[d.id_deposito]?.cantidad_disponible), 0
                      );
                      const est = estadoStock(totalDisp, p.stock_minimo);

                      return (
                        <tr key={p.id_producto} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="sticky left-0 z-10 w-1 p-0 bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/40">
                            <div className={`w-[3px] h-full min-h-[44px] ${est.bar}`} />
                          </td>
                          <td className="sticky left-1 z-10 px-4 py-2.5 w-[260px] bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/40 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                            <p className="font-medium text-zinc-900 dark:text-white leading-tight truncate" title={p.producto}>{p.producto}</p>
                            <p className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                              {p.codigo_interno}{p.codigo_barras ? ` · ${p.codigo_barras}` : ''}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              {p.marca_nombre}{p.unidad_nombre ? ` · ${p.unidad_nombre} (${p.unidad_codigo})` : ''}
                            </p>
                            {p.detalle && (
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{p.detalle}</p>
                            )}
                            {specLinea(p) && (
                              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">{specLinea(p)}</p>
                            )}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right text-zinc-700 dark:text-zinc-300">
                            <StockMinCell
                              id_producto={p.id_producto}
                              value={p.stock_minimo}
                              editable={puedeEditMin}
                              onSave={handleStockMinimo}
                            />
                          </td>
                          {depositosMostrados.map(d => {
                            const s    = p.stock[d.id_deposito];
                            const disp = toNum(s?.cantidad_disponible);
                            const res  = toNum(s?.cantidad_reservada);
                            return (
                              <Fragment key={d.id_deposito}>
                                <td className={`px-3 py-2.5 text-right whitespace-nowrap font-mono tabular-nums border-l border-zinc-100 dark:border-zinc-800 ${disp === 0 ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-800 dark:text-zinc-100 font-semibold'}`}>
                                  {fmtNum(disp)}
                                </td>
                                <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono tabular-nums text-zinc-400 dark:text-zinc-600">
                                  {res > 0 ? fmtNum(res) : '—'}
                                </td>
                              </Fragment>
                            );
                          })}
                          <td className="sticky right-[110px] z-10 px-4 py-2.5 whitespace-nowrap text-right font-mono tabular-nums font-bold text-zinc-900 dark:text-white border-l border-zinc-200 dark:border-zinc-700 w-[96px] bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/40 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                            {fmtNum(totalDisp)}
                          </td>
                          <td className="sticky right-0 z-10 px-4 py-2.5 whitespace-nowrap text-center w-[110px] bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/40">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${est.badge}`}>
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

            {/* Paginación desktop */}
            {!cargando && productosFiltrados.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}</span>
                  {' '}de{' '}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{total}</span>
                </p>
                <div className="flex gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => cargar(page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >← Anterior</button>
                  <span className="px-3 py-1.5 text-xs text-zinc-400">{page} / {totalPages}</span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => cargar(page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >Siguiente →</button>
                </div>
              </div>
            )}

            {/* Footer tabla */}
            {!cargando && productosFiltrados.length > 0 && (
              <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600">
                <span>
                  Mostrando{' '}
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400">{productosFiltrados.length}</span>
                  {' '}de{' '}
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400">{total}</span>
                  {' '}productos
                </span>
                {hayFiltros && (
                  <button onClick={limpiar} className="text-amber-600 dark:text-amber-400 hover:underline">
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer móvil */}
          {!cargando && productosFiltrados.length > 0 && (
            <p className="md:hidden text-center text-xs text-zinc-400 dark:text-zinc-600 pb-2">
              {productosFiltrados.length} de {total} productos
              {hayFiltros && (
                <button onClick={limpiar} className="ml-2 text-amber-600 dark:text-amber-400 underline">
                  Limpiar
                </button>
              )}
            </p>
          )}
        </>
      )}

    </div>
  );
}
