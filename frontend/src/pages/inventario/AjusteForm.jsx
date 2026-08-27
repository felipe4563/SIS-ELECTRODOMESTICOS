import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { ajustesService }    from '../../services/ajustes.service';
import { inventarioService } from '../../services/inventario.service';

const fmtNum = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const compactCls = 'w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400';
const fieldLbl   = 'block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wide';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const buildImgUrl = (url) =>
  !url ? null : url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`;

/* ─── Íconos mínimos ──────────────────────────────────────────────────────── */
function Ic({ id, size = 15, className = '' }) {
  const paths = {
    package: <><path d="M16.5 9.4l-9-5.21" /><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
    cart:    <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></>,
    trash:   <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5-3h4a1 1 0 011 1v2H9V4a1 1 0 011-1z" /></>,
    search:  <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    back:    <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}
      fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {paths[id]}
    </svg>
  );
}

function SectionCard({ title, badge, actions, children }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-0.5 h-5 rounded-full bg-yellow-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</span>
          {badge}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/* ─── Tile de producto (grilla estilo POS) ───────────────────────────────── */
function ProductoTile({ prod, sistema, enCarrito, onClick }) {
  const [errImg, setErrImg] = useState(false);
  const img = buildImgUrl(prod.imagen_url);

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-stretch text-left bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-yellow-400 dark:hover:border-yellow-400 hover:shadow-md active:scale-[0.98] transition-all overflow-hidden group"
    >
      {enCarrito && (
        <span className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-yellow-400 text-zinc-900 text-[11px] font-bold flex items-center justify-center shadow">
          ✓
        </span>
      )}
      <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
        {img && !errImg ? (
          <img src={img} alt={prod.producto} className="w-full h-full object-cover" onError={() => setErrImg(true)} />
        ) : (
          <Ic id="package" size={28} className="text-zinc-300 dark:text-zinc-600" />
        )}
      </div>
      <div className="px-2.5 py-2 space-y-0.5">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight line-clamp-2 min-h-[2.2em]">
          {prod.producto}
        </p>
        <p className="font-mono text-[10px] text-amber-600 dark:text-amber-400">{prod.codigo_interno}</p>
        {(prod.marca || prod.modelo || prod.color || prod.capacidad) && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight line-clamp-1">
            {[prod.marca, prod.modelo, prod.color, prod.capacidad].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Sistema: <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{fmtNum(sistema)}</span></p>
      </div>
    </button>
  );
}

/* ─── Línea del carrito (panel de ajuste) ────────────────────────────────── */
function CartLinea({ fila, prod, onChange, onRemove }) {
  const diferencia = Number(fila.cantidad_fisica) - Number(fila.cantidad_sistema);
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{prod?.producto ?? '—'}</p>
          {prod && (prod.marca || prod.modelo || prod.color || prod.capacidad) && (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
              {[prod.marca, prod.modelo, prod.color, prod.capacidad].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button onClick={onRemove}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
          <Ic id="trash" size={13} />
        </button>
      </div>

      <div className="px-3 pb-3 grid grid-cols-3 gap-2.5">
        <div>
          <label className="block text-[10px] text-zinc-400 mb-1">Sistema</label>
          <p className="px-2 py-1.5 text-xs font-mono text-zinc-500 dark:text-zinc-400">{fmtNum(fila.cantidad_sistema)}</p>
        </div>
        <div>
          <label className="block text-[10px] text-zinc-400 mb-1">Físico</label>
          <input
            type="number" min={0} step="0.01" value={fila.cantidad_fisica}
            onChange={e => onChange({ cantidad_fisica: e.target.value })}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right font-mono"
          />
        </div>
        <div>
          <label className="block text-[10px] text-zinc-400 mb-1">Diferencia</label>
          <p className={`px-2 py-1.5 text-xs font-mono font-semibold ${diferencia > 0 ? 'text-green-600 dark:text-green-400' : diferencia < 0 ? 'text-red-500 dark:text-red-400' : 'text-zinc-400'}`}>
            {diferencia > 0 ? '+' : ''}{fmtNum(diferencia)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AjusteForm() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const esEdicion = Boolean(id);

  const [depositos, setDepositos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [stockMap,  setStockMap]  = useState({});
  const [form, setForm] = useState({ id_deposito: '', motivo: '' });
  const [items, setItems] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const [cargando,  setCargando]  = useState(esEdicion);

  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [filtroMarca,      setFiltroMarca]      = useState('');
  const [filtroProducto,   setFiltroProducto]   = useState('');
  const [filtroModelo,     setFiltroModelo]     = useState('');
  const [filtroColor,      setFiltroColor]      = useState('');
  const [filtroCapacidad,  setFiltroCapacidad]  = useState('');

  useEffect(() => {
    inventarioService.getFormData()
      .then(r => {
        setDepositos(r.data.depositos ?? []);
        setProductos(r.data.productos ?? []);
      })
      .catch(() => {});

    if (esEdicion) {
      ajustesService.getOne(id)
        .then(r => {
          const a = r.data;
          setForm({ id_deposito: String(a.id_deposito), motivo: a.motivo ?? '' });
          setItems((a.detalle ?? []).map(d => ({
            _key: crypto.randomUUID(),
            id_producto: String(d.id_producto),
            cantidad_sistema: d.cantidad_sistema,
            cantidad_fisica: d.cantidad_fisica,
          })));
        })
        .catch(() => navigate('/inventario/ajustes'))
        .finally(() => setCargando(false));
    }
  }, []); // eslint-disable-line

  // Cargar stock del depósito seleccionado
  useEffect(() => {
    if (!form.id_deposito) { setStockMap({}); return; }
    api.get('/inventario/stock')
      .then(r => {
        const map = {};
        for (const prod of r.data.productos ?? []) {
          const s = prod.stock?.[form.id_deposito];
          map[prod.id_producto] = Number(s?.cantidad ?? 0);
        }
        setStockMap(map);
        setItems(prev => prev.map(it => ({
          ...it,
          cantidad_sistema: it.id_producto ? (map[it.id_producto] ?? 0) : it.cantidad_sistema,
        })));
      })
      .catch(() => {});
  }, [form.id_deposito]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const cambiarFiltroMarca    = v => { setFiltroMarca(v); setFiltroProducto(''); setFiltroModelo(''); setFiltroColor(''); setFiltroCapacidad(''); };
  const cambiarFiltroProducto = v => { setFiltroProducto(v); setFiltroModelo(''); setFiltroColor(''); setFiltroCapacidad(''); };
  const cambiarFiltroModelo   = v => { setFiltroModelo(v); setFiltroColor(''); setFiltroCapacidad(''); };
  const cambiarFiltroColor    = v => { setFiltroColor(v); setFiltroCapacidad(''); };

  const agregarAlCarrito = useCallback((prod) => {
    setItems(prev => {
      if (prev.some(it => String(it.id_producto) === String(prod.id_producto))) return prev;
      const sistema = stockMap[prod.id_producto] ?? 0;
      return [...prev, {
        _key: crypto.randomUUID(),
        id_producto: String(prod.id_producto),
        cantidad_sistema: sistema,
        cantidad_fisica: sistema,
      }];
    });
  }, [stockMap]);

  const removeItem = i => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, patch) => setItems(p => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const limpiarItems = () => setItems([]);

  const guardar = async () => {
    setError('');
    if (!form.id_deposito) return setError('Seleccioná un depósito');
    const itemsValidos = items.filter(it => it.id_producto);
    if (!itemsValidos.length) return setError('Agregá al menos un producto');

    setGuardando(true);
    try {
      const payload = { ...form, items: itemsValidos };
      let ajusteId = id;
      if (esEdicion) {
        await ajustesService.update(id, payload);
      } else {
        const res = await ajustesService.create(payload);
        ajusteId = res.data.id_ajuste;
      }
      navigate(`/inventario/ajustes/${ajusteId}`);
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const marcasDisponibles = useMemo(() => [...new Set(productos.map(p => p.marca).filter(Boolean))].sort(), [productos]);
  const productosDisponibles = useMemo(() => [...new Set(
    productos.filter(p => !filtroMarca || p.marca === filtroMarca).map(p => p.producto).filter(Boolean)
  )].sort(), [productos, filtroMarca]);
  const modelosDisponibles = useMemo(() => [...new Set(
    productos
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.producto === filtroProducto))
      .map(p => p.modelo).filter(Boolean)
  )].sort(), [productos, filtroMarca, filtroProducto]);
  const coloresDisponibles = useMemo(() => [...new Set(
    productos
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.producto === filtroProducto) && (!filtroModelo || p.modelo === filtroModelo))
      .map(p => p.color).filter(Boolean)
  )].sort(), [productos, filtroMarca, filtroProducto, filtroModelo]);
  const capacidadesDisponibles = useMemo(() => [...new Set(
    productos
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.producto === filtroProducto) && (!filtroModelo || p.modelo === filtroModelo) && (!filtroColor || p.color === filtroColor))
      .map(p => p.capacidad).filter(Boolean)
  )].sort(), [productos, filtroMarca, filtroProducto, filtroModelo, filtroColor]);

  const productosVisibles = useMemo(() => {
    let lista = productos
      .filter(p => !filtroMarca     || p.marca     === filtroMarca)
      .filter(p => !filtroProducto  || p.producto  === filtroProducto)
      .filter(p => !filtroModelo    || p.modelo    === filtroModelo)
      .filter(p => !filtroColor     || p.color     === filtroColor)
      .filter(p => !filtroCapacidad || p.capacidad === filtroCapacidad);
    if (busquedaProducto.trim()) {
      const q = busquedaProducto.toLowerCase();
      lista = lista.filter(p =>
        p.producto.toLowerCase().includes(q) ||
        p.codigo_interno.toLowerCase().includes(q) ||
        p.marca?.toLowerCase().includes(q) ||
        p.modelo?.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [productos, filtroMarca, filtroProducto, filtroModelo, filtroColor, filtroCapacidad, busquedaProducto]);

  const idsEnCarrito = new Set(items.map(it => String(it.id_producto)));
  const totalDiferencias = items.reduce((s, it) => s + (Number(it.cantidad_fisica) - Number(it.cantidad_sistema)), 0);

  if (cargando) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-400">Cargando…</p>
      </div>
    </div>
  );

  return (
    <div className="pb-24 lg:pb-4 space-y-4">

      {/* ── Cabecera de página ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(esEdicion ? `/inventario/ajustes/${id}` : '/inventario/ajustes')}
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mb-1.5 transition-colors"
          >
            <Ic id="back" size={13} /> Ajustes
          </button>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {esEdicion ? 'Editar ajuste' : 'Nuevo ajuste de inventario'}
          </h1>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
          <span className="mt-0.5 flex-shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Franja compacta: datos del ajuste ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={fieldLbl}>Depósito *</label>
            <select value={form.id_deposito} onChange={e => setF('id_deposito', e.target.value)}
              disabled={esEdicion} className={compactCls}>
              <option value="">— seleccionar —</option>
              {depositos.map(d => <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={fieldLbl}>Motivo</label>
            <input type="text" value={form.motivo} onChange={e => setF('motivo', e.target.value)}
              placeholder="Ej: Conteo mensual" className={compactCls} />
          </div>
        </div>
      </div>

      {/* ── Layout principal: grilla de productos + panel de ajuste ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">

        {/* ── Columna productos ── */}
        <div className="space-y-3 min-w-0">
          {!form.id_deposito ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Ic id="package" size={32} className="text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm font-medium">Seleccioná un depósito para ver el catálogo</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-3">
              <div className="relative">
                <Ic id="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text" value={busquedaProducto} onChange={e => setBusquedaProducto(e.target.value)}
                  placeholder="Buscar producto por nombre, código, marca o modelo…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <select value={filtroMarca} onChange={e => cambiarFiltroMarca(e.target.value)} className={compactCls}>
                  <option value="">Todas las marcas</option>
                  {marcasDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={filtroProducto} onChange={e => cambiarFiltroProducto(e.target.value)} className={compactCls}>
                  <option value="">Todos los productos</option>
                  {productosDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={filtroModelo} onChange={e => cambiarFiltroModelo(e.target.value)} className={compactCls}>
                  <option value="">Todos los modelos</option>
                  {modelosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={filtroColor} onChange={e => cambiarFiltroColor(e.target.value)} className={compactCls}>
                  <option value="">Todos los colores</option>
                  {coloresDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filtroCapacidad} onChange={e => setFiltroCapacidad(e.target.value)} className={compactCls}>
                  <option value="">Todas las capacidades</option>
                  {capacidadesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {productosVisibles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
                  <Ic id="package" size={32} className="text-zinc-300 dark:text-zinc-700" />
                  <p className="text-sm font-medium">Sin productos para este filtro</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {productosVisibles.map(p => (
                    <ProductoTile
                      key={p.id_producto}
                      prod={p}
                      sistema={stockMap[p.id_producto] ?? 0}
                      enCarrito={idsEnCarrito.has(String(p.id_producto))}
                      onClick={() => agregarAlCarrito(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Columna panel de ajuste ── */}
        <div className="lg:sticky lg:top-4 space-y-3">
          <SectionCard
            title="Ajuste"
            actions={items.length > 0 && (
              <button onClick={limpiarItems} className="text-[11px] px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Limpiar
              </button>
            )}
          >
            <div className="p-3.5 space-y-2 max-h-[50vh] lg:max-h-[calc(100vh-22rem)] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-400">
                  <Ic id="cart" size={30} className="text-zinc-300 dark:text-zinc-700" />
                  <p className="text-xs text-center">Tocá un producto del catálogo para agregarlo</p>
                </div>
              ) : (
                items.map((fila, i) => {
                  const prod = productos.find(p => String(p.id_producto) === String(fila.id_producto));
                  return (
                    <CartLinea
                      key={fila._key}
                      fila={fila}
                      prod={prod}
                      onChange={patch => updateItem(i, patch)}
                      onRemove={() => removeItem(i)}
                    />
                  );
                })
              )}
            </div>

            <div className="px-3.5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">{items.length} producto{items.length !== 1 ? 's' : ''}</span>
                <span className={`font-mono font-semibold ${totalDiferencias > 0 ? 'text-green-600 dark:text-green-400' : totalDiferencias < 0 ? 'text-red-500 dark:text-red-400' : 'text-zinc-400'}`}>
                  {totalDiferencias > 0 ? '+' : ''}{fmtNum(totalDiferencias)} dif. total
                </span>
              </div>

              <button
                onClick={guardar} disabled={guardando}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-bold text-sm transition-colors mt-1"
              >
                {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear ajuste'}
              </button>
              <button
                onClick={() => navigate(esEdicion ? `/inventario/ajustes/${id}` : '/inventario/ajustes')}
                className="w-full py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Barra sticky mobile ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3 shadow-xl">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">{items.length} producto{items.length !== 1 ? 's' : ''}</p>
          <p className={`text-lg font-bold font-mono leading-tight ${totalDiferencias > 0 ? 'text-green-600 dark:text-green-400' : totalDiferencias < 0 ? 'text-red-500 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}>
            {totalDiferencias > 0 ? '+' : ''}{fmtNum(totalDiferencias)}
          </p>
        </div>
        <button
          onClick={guardar} disabled={guardando}
          className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors"
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar' : 'Crear ajuste'}
        </button>
      </div>

    </div>
  );
}
