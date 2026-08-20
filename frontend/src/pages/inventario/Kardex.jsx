import { useState, useEffect, useMemo } from 'react';
import { inventarioService } from '../../services/inventario.service';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtFecha = s => s ? new Date(s).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const fmtNum   = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const EFECTO_BADGE = {
  ENTRADA:       { label: 'Entrada',       cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  SALIDA:        { label: 'Salida',        cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  TRANSFERENCIA: { label: 'Transferencia', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  AJUSTE:        { label: 'Ajuste',        cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

const DOC_TIPOS = ['COMPRA', 'VENTA', 'TRANSFERENCIA', 'AJUSTE', 'DEVOLUCION', 'APERTURA', 'SERVICIO_TECNICO'];

const HOY   = new Date().toISOString().slice(0, 10);
const HACE30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

// ── Componente principal ─────────────────────────────────────────────────────
export default function Kardex() {
  // Filtros
  const [filtros, setFiltros] = useState({
    id_producto:   '',
    id_deposito:   '',
    fecha_desde:   HACE30,
    fecha_hasta:   HOY,
    documento_tipo: '',
  });

  // Catálogos para selects
  const [productos,  setProductos]  = useState([]);
  const [depositos,  setDepositos]  = useState([]);

  // Resultados
  const [filas,    setFilas]    = useState([]);
  const [cargando, setCargando] = useState(false);
  const [buscado,  setBuscado]  = useState(false);

  // Buscador de producto (autocompletar)
  const [buscProd,   setBuscProd]   = useState('');
  const [prodAbierto, setProdAbierto] = useState(false);

  useEffect(() => {
    inventarioService.getFormData()
      .then(r => {
        setProductos(r.data.productos ?? []);
        setDepositos(r.data.depositos ?? []);
      })
      .catch(() => {});
  }, []);

  const buscar = async () => {
    setCargando(true);
    try {
      // Solo enviar params no vacíos
      const params = Object.fromEntries(
        Object.entries(filtros).filter(([, v]) => v !== '')
      );
      const res = await inventarioService.getKardex(params);
      setFilas(res.data);
      setBuscado(true);
    } catch { /* silencioso */ }
    finally  { setCargando(false); }
  };

  // Búsqueda automática: al entrar y cada vez que cambian los filtros (con debounce)
  useEffect(() => {
    const t = setTimeout(() => { buscar(); }, 400);
    return () => clearTimeout(t);
  }, [filtros]); // eslint-disable-line

  const set = (k, v) => setFiltros(prev => ({ ...prev, [k]: v }));

  const productoSeleccionado = productos.find(p => String(p.id_producto) === String(filtros.id_producto));

  const productosFiltrados = useMemo(() => {
    const q = buscProd.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(p =>
      p.producto.toLowerCase().includes(q) ||
      p.codigo_interno.toLowerCase().includes(q) ||
      (p.marca ?? '').toLowerCase().includes(q) ||
      (p.modelo ?? '').toLowerCase().includes(q)
    );
  }, [productos, buscProd]);

  const seleccionarProducto = p => {
    set('id_producto', p.id_producto);
    setBuscProd('');
    setProdAbierto(false);
  };

  const limpiarProducto = () => {
    set('id_producto', '');
    setBuscProd('');
  };

  return (
    <div className="space-y-5">

      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Kardex</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Historial de movimientos de stock por producto y depósito
        </p>
      </div>

      {/* Panel de filtros */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-4">Filtros</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Producto — buscador con autocompletar */}
          <div className="relative">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Producto</label>
            <div className="relative">
              <input
                type="text"
                value={productoSeleccionado ? `${productoSeleccionado.codigo_interno} — ${productoSeleccionado.producto}` : buscProd}
                onChange={e => {
                  if (filtros.id_producto) set('id_producto', '');
                  setBuscProd(e.target.value);
                  setProdAbierto(true);
                }}
                onFocus={() => setProdAbierto(true)}
                onBlur={() => setTimeout(() => setProdAbierto(false), 150)}
                placeholder="Buscar por código, producto, marca…"
                className="w-full px-3 py-2 pr-8 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              {(filtros.id_producto || buscProd) && (
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={limpiarProducto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm leading-none"
                  title="Limpiar"
                >
                  ✕
                </button>
              )}
            </div>
            {prodAbierto && !filtros.id_producto && (
              <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg">
                {productosFiltrados.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-zinc-400">Sin resultados</div>
                ) : (
                  <>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { set('id_producto', ''); setBuscProd(''); setProdAbierto(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 border-b border-zinc-100 dark:border-zinc-700"
                    >
                      Todos los productos
                    </button>
                    {productosFiltrados.slice(0, 50).map(p => (
                      <button
                        type="button"
                        key={p.id_producto}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => seleccionarProducto(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-yellow-50 dark:hover:bg-zinc-700/50 border-b border-zinc-50 dark:border-zinc-700/50 last:border-0"
                      >
                        <p className="font-medium text-zinc-900 dark:text-white truncate">{p.producto}</p>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          {p.codigo_interno}{p.marca ? ` · ${p.marca}` : ''}{p.modelo ? ` · ${p.modelo}` : ''}
                        </p>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Depósito */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Depósito</label>
            <select
              value={filtros.id_deposito}
              onChange={e => set('id_deposito', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Todos los depósitos</option>
              {depositos.map(d => (
                <option key={d.id_deposito} value={d.id_deposito}>
                  {d.codigo} — {d.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo documento */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Tipo de movimiento</label>
            <select
              value={filtros.documento_tipo}
              onChange={e => set('documento_tipo', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Todos los tipos</option>
              {DOC_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Fecha desde */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Fecha desde</label>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={e => set('fecha_desde', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Fecha hasta */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Fecha hasta</label>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={e => set('fecha_hasta', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Botón buscar */}
          <div className="flex items-end">
            <button
              onClick={buscar}
              disabled={cargando}
              className="w-full px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm disabled:opacity-50 transition-colors"
            >
              {cargando ? 'Buscando…' : '🔍 Buscar'}
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {!buscado && !cargando ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-2">
            <span className="text-4xl">📜</span>
            <p className="text-sm">Configura los filtros y presiona Buscar</p>
          </div>
        ) : cargando ? (
          <div className="flex items-center justify-center py-20 text-zinc-400">Cargando movimientos…</div>
        ) : filas.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-zinc-400">Sin movimientos para los filtros seleccionados</div>
        ) : (
          <>
            {/* ── Tabla — md+ ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                    {['Fecha', 'Tipo', 'Producto', 'Depósito', 'Documento', 'Cantidad', 'Costo Unit.', 'Saldo Cant.', 'Saldo Costo', 'Usuario', 'Obs.'].map(h => (
                      <th
                        key={h}
                        className={`text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap ${
                          h === 'Producto'
                            ? 'sticky left-0 z-10 w-[200px] bg-zinc-50 dark:bg-zinc-800/60 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]'
                            : ''
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filas.map(f => {
                    const badge = EFECTO_BADGE[f.efecto] ?? { label: f.efecto, cls: 'bg-zinc-100 text-zinc-600' };
                    // efecto ENTRADA/SALIDA es explícito y confiable (cantidad se guarda sin signo).
                    // Para AJUSTE/TRANSFERENCIA el efecto es ambiguo (mismo valor en ambos sentidos)
                    // y ahí sí se guarda la cantidad con signo, así que usamos eso.
                    const esEntrada = f.efecto === 'ENTRADA' ? true
                      : f.efecto === 'SALIDA' ? false
                      : Number(f.cantidad) >= 0;
                    return (
                      <tr key={f.id_kardex} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600 dark:text-zinc-400 text-xs">{fmtFecha(f.fecha)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                            {f.tipo_movimiento || badge.label}
                          </span>
                        </td>
                        <td className="sticky left-0 z-10 px-4 py-2.5 whitespace-nowrap w-[200px] bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/40 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                          <p className="font-medium text-zinc-900 dark:text-white truncate" title={f.producto_nombre}>{f.producto_nombre}</p>
                          <p className="text-[11px] text-zinc-400 font-mono">{f.codigo_interno}</p>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                          <p>{f.deposito_nombre}</p>
                          <p className="text-[11px] font-mono text-zinc-400">{f.deposito_codigo}</p>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <p className="text-zinc-700 dark:text-zinc-300">{f.documento_tipo}</p>
                          {f.documento_numero && (
                            <p className="text-[11px] font-mono text-zinc-400">{f.documento_numero}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono font-semibold">
                          <span className={esEntrada ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {esEntrada ? '+' : '−'}{fmtNum(Math.abs(f.cantidad))}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono text-zinc-600 dark:text-zinc-400">{fmtNum(f.costo_unitario)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono font-semibold text-zinc-900 dark:text-white">{fmtNum(f.saldo_cantidad)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono text-zinc-600 dark:text-zinc-400">{fmtNum(f.saldo_costo)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                          {f.usuario_nombres ? `${f.usuario_nombres} ${f.usuario_apellidos}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 max-w-[160px] text-zinc-500 dark:text-zinc-400 text-xs truncate"
                          title={f.observaciones ?? ''}>
                          {f.observaciones || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Tarjetas — móvil < md ── */}
            <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {filas.map(f => {
                const badge = EFECTO_BADGE[f.efecto] ?? { label: f.efecto, cls: 'bg-zinc-100 text-zinc-600' };
                const esEntrada = f.efecto === 'ENTRADA';
                return (
                  <div key={f.id_kardex} className="px-4 py-3 space-y-2">
                    {/* Fila 1: badge tipo + fecha */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                        {f.tipo_movimiento || badge.label}
                      </span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">{fmtFecha(f.fecha)}</span>
                    </div>

                    {/* Producto */}
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white leading-snug">{f.producto_nombre}</p>
                      <p className="text-[11px] font-mono text-zinc-400 mt-0.5">{f.codigo_interno}</p>
                    </div>

                    {/* Cantidad + saldo */}
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Movimiento</p>
                        <p className={`font-mono font-bold text-sm ${esEntrada ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {esEntrada ? '+' : '−'}{fmtNum(Math.abs(f.cantidad))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Saldo</p>
                        <p className="font-mono font-semibold text-sm text-zinc-900 dark:text-white">{fmtNum(f.saldo_cantidad)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Costo unit.</p>
                        <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{fmtNum(f.costo_unitario)}</p>
                      </div>
                    </div>

                    {/* Depósito + documento */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="text-zinc-400 dark:text-zinc-500">Depósito: </span>
                        {f.deposito_nombre}
                        {f.deposito_codigo && <span className="font-mono text-zinc-400"> ({f.deposito_codigo})</span>}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="text-zinc-400 dark:text-zinc-500">Doc: </span>
                        {f.documento_tipo}{f.documento_numero && <span className="font-mono"> #{f.documento_numero}</span>}
                      </span>
                    </div>

                    {/* Usuario + obs */}
                    {(f.usuario_nombres || f.observaciones) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        {f.usuario_nombres && (
                          <span className="text-[11px] text-zinc-400">{f.usuario_nombres} {f.usuario_apellidos}</span>
                        )}
                        {f.observaciones && (
                          <span className="text-[11px] text-zinc-400 italic truncate">{f.observaciones}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-600">
              {filas.length} movimiento{filas.length !== 1 ? 's' : ''} {filas.length >= 500 && '(máx. 500 — afina los filtros para ver más)'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
