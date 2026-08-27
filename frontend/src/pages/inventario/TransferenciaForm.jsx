import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transferenciasService } from '../../services/transferencias.service';
import { inventarioService }      from '../../services/inventario.service';
import { FaArrowLeft } from 'react-icons/fa';

const fmtNum = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const qtyBtnCls = 'w-7 h-7 shrink-0 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-bold leading-none';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const buildImgUrl = (url) =>
  !url ? null : url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`;

function IcPackage({ size = 28, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16.5 9.4l-9-5.21" /><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

// ── Tarjeta de producto del catálogo (estilo POS) ────────────────────────────
function ProductoCard({ p, enCarrito, onAdd, onQuitar }) {
  const [errImg, setErrImg] = useState(false);
  const sinDisponible = enCarrito >= p.disponible;
  const img = buildImgUrl(p.imagen_url);
  return (
    <div
      className={`relative flex flex-col text-left bg-white dark:bg-zinc-900 rounded-2xl border overflow-hidden cursor-pointer transition-colors ${
        enCarrito > 0
          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
          : 'border-zinc-200 dark:border-zinc-700 hover:border-yellow-300 dark:hover:border-yellow-600'
      }`}
      onClick={() => !sinDisponible && onAdd(p)}
    >
      {enCarrito > 0 && (
        <span className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-yellow-400 text-zinc-900 text-[11px] font-bold flex items-center justify-center shadow">
          {enCarrito}
        </span>
      )}
      <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
        {img && !errImg ? (
          <img src={img} alt={p.producto} className="w-full h-full object-cover" onError={() => setErrImg(true)} />
        ) : (
          <IcPackage size={28} className="text-zinc-300 dark:text-zinc-600" />
        )}
      </div>
      <div className="px-2.5 py-2 flex flex-col gap-1 flex-1">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight line-clamp-2 min-h-[2.2em]">{p.producto}</p>
        <p className="text-[10px] font-mono text-zinc-400">{p.codigo_interno}</p>
        {(p.marca || p.modelo || p.color || p.capacidad) && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight line-clamp-1">
            {[p.marca, p.modelo, p.color, p.capacidad].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="font-mono font-semibold text-xs text-green-600 dark:text-green-400">{fmtNum(p.disponible)} disp.</span>
          {enCarrito > 0 ? (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => onQuitar(p)} className={qtyBtnCls}>−</button>
              <button type="button" onClick={() => onAdd(p)} disabled={sinDisponible} className={qtyBtnCls}>+</button>
            </div>
          ) : (
            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">+ Agregar</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Fila del carrito (compacta, usada en el panel lateral / bottom sheet) ────
function CartItemRow({ fila, productos, stockOrigen, onChange, onQtyDelta, onRemove }) {
  const [busqueda, setBusqueda] = useState('');

  const filtrados = productos.filter(p => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return p.producto.toLowerCase().includes(q) ||
      p.codigo_interno.toLowerCase().includes(q) ||
      p.marca?.toLowerCase().includes(q) ||
      p.modelo?.toLowerCase().includes(q);
  });
  const opciones = filtrados;

  const productoSel = fila.id_producto ? productos.find(p => String(p.id_producto) === String(fila.id_producto)) : null;
  const disponible  = fila.id_producto ? (stockOrigen[fila.id_producto] ?? 0) : null;
  const excede      = disponible !== null && Number(fila.cantidad) > disponible;
  const sinStock    = disponible !== null && disponible <= 0;

  return (
    <div className="py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      {productoSel ? (
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <p className="text-sm text-zinc-900 dark:text-white truncate">{productoSel.producto}</p>
            <p className="text-[11px] font-mono text-zinc-400">{productoSel.codigo_interno}</p>
          </div>
          <button onClick={onRemove} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-base leading-none">×</button>
        </div>
      ) : (
        <div className="space-y-1.5 mb-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Buscar producto…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="flex-1 px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
            />
            <button onClick={onRemove} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-base leading-none">×</button>
          </div>
          <select
            value={fila.id_producto}
            onChange={e => { onChange('id_producto', e.target.value); setBusqueda(''); }}
            className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
          >
            <option value="">— seleccionar producto —</option>
            {opciones.map(p => (
              <option key={p.id_producto} value={p.id_producto}>[{p.codigo_interno}] {p.producto}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {disponible === null ? (
          <span className="text-[11px] text-zinc-400">—</span>
        ) : sinStock ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Sin stock</span>
        ) : (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${excede ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>
            {fmtNum(disponible)} disp.
          </span>
        )}
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onQtyDelta(-1)} className={qtyBtnCls}>−</button>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={fila.cantidad}
            onChange={e => onChange('cantidad', e.target.value)}
            className={`w-16 px-1.5 py-1 text-xs rounded-lg border text-right font-mono focus:outline-none focus:ring-1 ${excede ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 focus:ring-orange-400' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-yellow-400'}`}
          />
          <button type="button" onClick={() => onQtyDelta(1)} disabled={disponible !== null && Number(fila.cantidad) >= disponible} className={qtyBtnCls}>+</button>
        </div>
      </div>
      {excede && <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5 text-right">Supera el disponible</p>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function TransferenciaForm() {
  const navigate = useNavigate();
  const { id }    = useParams();
  const esEdicion = Boolean(id);

  const [depositos,     setDepositos]     = useState([]);
  const [productos,     setProductos]     = useState([]);
  const [stockOrigen,   setStockOrigen]   = useState({});
  const [cargandoStock, setCargandoStock] = useState(false);
  const [cargando,      setCargando]      = useState(esEdicion);
  const [bloqueado,     setBloqueado]     = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const [form, setForm] = useState({
    id_deposito_origen: '', id_deposito_destino: '', observaciones: '',
  });
  const [items,     setItems]     = useState([{ id_producto: '', cantidad: 1 }]);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const [busquedaStock, setBusquedaStock] = useState('');
  const [filtroMarca,    setFiltroMarca]    = useState('');
  const [filtroProducto, setFiltroProducto] = useState('');
  const [filtroModelo,   setFiltroModelo]   = useState('');
  const [filtroColor,    setFiltroColor]    = useState('');
  const [filtroCapacidad, setFiltroCapacidad] = useState('');

  // Bloquear el scroll del body mientras el carrito (bottom-sheet) está abierto en móvil
  useEffect(() => {
    if (!carritoAbierto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [carritoAbierto]);

  // Cargar catálogos
  useEffect(() => {
    inventarioService.getFormData()
      .then(r => {
        setDepositos(r.data.depositos ?? []);
        setProductos(r.data.productos ?? []);
      })
      .catch(() => {});
  }, []);

  // Si es edición, cargar la transferencia (solo válido en BORRADOR) y su stock de origen
  useEffect(() => {
    if (!esEdicion) return;
    transferenciasService.getOne(id)
      .then(r => {
        const t = r.data;
        if (t.estado !== 'BORRADOR') {
          setError('Esta transferencia ya no está en borrador y no se puede editar');
          setBloqueado(true);
          return;
        }
        setForm({
          id_deposito_origen: String(t.id_deposito_origen),
          id_deposito_destino: String(t.id_deposito_destino),
          observaciones: t.observaciones ?? '',
        });
        setItems((t.detalle ?? []).map(d => ({ id_producto: String(d.id_producto), cantidad: Number(d.cantidad_enviada) })));
        return inventarioService.getStockDeposito(t.id_deposito_origen).then(rs => {
          const map = {};
          (rs.data.stock ?? []).forEach(s => { map[String(s.id_producto)] = s.cantidad_disponible; });
          setStockOrigen(map);
        });
      })
      .catch(() => setError('Error al cargar la transferencia'))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  // Al cambiar depósito origen → cargar stock
  const handleOrigenChange = async (id) => {
    setForm(p => ({ ...p, id_deposito_origen: id, id_deposito_destino: p.id_deposito_destino === id ? '' : p.id_deposito_destino }));
    setStockOrigen({});
    setBusquedaStock('');
    setFiltroMarca('');
    setFiltroProducto('');
    setFiltroModelo('');
    setFiltroColor('');
    setFiltroCapacidad('');
    if (!id) return;
    setCargandoStock(true);
    try {
      const r = await inventarioService.getStockDeposito(id);
      const map = {};
      (r.data.stock ?? []).forEach(s => { map[String(s.id_producto)] = s.cantidad_disponible; });
      setStockOrigen(map);
    } catch { /* silencioso */ }
    finally { setCargandoStock(false); }
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const cambiarFiltroMarca = (v) => {
    setFiltroMarca(v);
    setFiltroProducto('');
    setFiltroModelo('');
    setFiltroColor('');
    setFiltroCapacidad('');
  };
  const cambiarFiltroProducto = (v) => {
    setFiltroProducto(v);
    setFiltroModelo('');
    setFiltroColor('');
    setFiltroCapacidad('');
  };
  const cambiarFiltroModelo = (v) => {
    setFiltroModelo(v);
    setFiltroColor('');
    setFiltroCapacidad('');
  };
  const cambiarFiltroColor = (v) => {
    setFiltroColor(v);
    setFiltroCapacidad('');
  };

  const addItem    = () => setItems(p => [...p, { id_producto: '', cantidad: 1 }]);
  const removeItem = i  => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const cambiarCantidad = (i, delta) => {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== i) return it;
      const disponible = it.id_producto ? (stockOrigen[String(it.id_producto)] ?? null) : null;
      let nueva = Number(it.cantidad || 0) + delta;
      if (disponible !== null) nueva = Math.min(nueva, disponible);
      nueva = Math.max(0.01, nueva);
      return { ...it, cantidad: nueva };
    }));
  };

  // Agregar un producto desde el catálogo
  const agregarProducto = (p) => {
    setItems(prev => {
      const idx = prev.findIndex(it => String(it.id_producto) === String(p.id_producto));
      if (idx >= 0) {
        const disp = stockOrigen[String(p.id_producto)] ?? Infinity;
        if (Number(prev[idx].cantidad) >= disp) return prev;
        return prev.map((it, i) => i === idx ? { ...it, cantidad: Number(it.cantidad) + 1 } : it);
      }
      const vacio = prev.findIndex(it => !it.id_producto);
      const nuevaFila = { id_producto: String(p.id_producto), cantidad: 1 };
      if (vacio >= 0) return prev.map((it, i) => i === vacio ? nuevaFila : it);
      return [...prev, nuevaFila];
    });
  };

  // Quitar una unidad de un producto ya agregado (desde el catálogo)
  const quitarUnidadProducto = (p) => {
    setItems(prev => {
      const idx = prev.findIndex(it => String(it.id_producto) === String(p.id_producto));
      if (idx < 0) return prev;
      const nueva = Number(prev[idx].cantidad) - 1;
      if (nueva <= 0) return prev.filter((_, i) => i !== idx);
      return prev.map((it, i) => i === idx ? { ...it, cantidad: nueva } : it);
    });
  };

  // Resumen de items con stock válido
  const itemsValidos = items.filter(it => it.id_producto && Number(it.cantidad) > 0);
  const hayExcesos   = itemsValidos.some(it => {
    const disp = stockOrigen[String(it.id_producto)];
    return disp !== undefined && Number(it.cantidad) > disp;
  });

  const guardar = async () => {
    setError('');
    if (!form.id_deposito_origen || !form.id_deposito_destino)
      return setError('Seleccioná depósito origen y destino');
    if (form.id_deposito_origen === form.id_deposito_destino)
      return setError('Origen y destino no pueden ser el mismo depósito');
    if (!itemsValidos.length)
      return setError('Agregá al menos un producto con cantidad válida');
    if (hayExcesos)
      return setError('Hay productos con cantidad mayor al stock disponible en origen');

    setGuardando(true);
    try {
      if (esEdicion) {
        await transferenciasService.update(id, { ...form, items: itemsValidos });
        navigate(`/inventario/transferencias/${id}`);
      } else {
        const res = await transferenciasService.create({ ...form, items: itemsValidos });
        navigate(`/inventario/transferencias/${res.data.id_transferencia}`);
      }
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al guardar la transferencia');
    } finally {
      setGuardando(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  const depositoOrigen  = depositos.find(d => String(d.id_deposito) === String(form.id_deposito_origen));
  const depositoDestino = depositos.find(d => String(d.id_deposito) === String(form.id_deposito_destino));

  // Productos con stock > 0 en origen (base, antes de aplicar filtros)
  const productosConStockBase = Object.entries(stockOrigen)
    .filter(([, disp]) => disp > 0)
    .map(([id, disp]) => ({
      ...productos.find(p => String(p.id_producto) === id),
      disponible: disp,
    }))
    .filter(p => p.id_producto);

  // Opciones de los selects en cascada: Marca → Producto → Modelo → Color
  const marcasDisponibles = [...new Set(
    productosConStockBase.map(p => p.marca).filter(Boolean)
  )].sort();

  const productosDisponibles = [...new Set(
    productosConStockBase
      .filter(p => !filtroMarca || p.marca === filtroMarca)
      .map(p => p.producto)
      .filter(Boolean)
  )].sort();

  const modelosDisponibles = [...new Set(
    productosConStockBase
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.producto === filtroProducto))
      .map(p => p.modelo)
      .filter(Boolean)
  )].sort();

  const coloresDisponibles = [...new Set(
    productosConStockBase
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.producto === filtroProducto) && (!filtroModelo || p.modelo === filtroModelo))
      .map(p => p.color)
      .filter(Boolean)
  )].sort();

  const capacidadesDisponibles = [...new Set(
    productosConStockBase
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.producto === filtroProducto) && (!filtroModelo || p.modelo === filtroModelo) && (!filtroColor || p.color === filtroColor))
      .map(p => p.capacidad)
      .filter(Boolean)
  )].sort();

  const productosConStock = productosConStockBase
    .filter(p => !filtroMarca    || p.marca    === filtroMarca)
    .filter(p => !filtroProducto || p.producto === filtroProducto)
    .filter(p => !filtroModelo   || p.modelo   === filtroModelo)
    .filter(p => !filtroColor    || p.color    === filtroColor)
    .filter(p => !filtroCapacidad || p.capacidad === filtroCapacidad)
    .filter(p => {
      if (!busquedaStock) return true;
      const q = busquedaStock.toLowerCase();
      return p.producto.toLowerCase().includes(q) ||
        p.codigo_interno.toLowerCase().includes(q) ||
        p.marca?.toLowerCase().includes(q) ||
        p.modelo?.toLowerCase().includes(q);
    })
    .sort((a, b) => b.disponible - a.disponible);

  const cantidadesSeleccionadas = items.reduce((acc, it) => {
    if (it.id_producto) acc[it.id_producto] = (acc[it.id_producto] ?? 0) + Number(it.cantidad || 0);
    return acc;
  }, {});

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-zinc-400">
        Cargando transferencia…
      </div>
    );
  }

  if (bloqueado) {
    return (
      <div className="space-y-4 max-w-2xl">
        <button onClick={() => navigate('/inventario/transferencias')}
          className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <FaArrowLeft className="h-3.5 w-3.5" /> Volver
        </button>
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
        <button onClick={() => navigate(`/inventario/transferencias/${id}`)}
          className="text-sm text-yellow-600 dark:text-yellow-400 hover:underline">
          Ver detalle de la transferencia →
        </button>
      </div>
    );
  }

  // ── Panel del carrito (compartido entre el sidebar desktop y el bottom-sheet móvil) ──
  const panelCarrito = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Productos a transferir</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {itemsValidos.length} producto{itemsValidos.length !== 1 ? 's' : ''} seleccionado{itemsValidos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={addItem} className="text-xs px-2.5 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold transition-colors shrink-0">
          + Agregar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">Sin productos — tocá uno del catálogo para agregarlo</p>
        ) : (
          items.map((fila, i) => (
            <CartItemRow
              key={i}
              fila={fila}
              productos={productos}
              stockOrigen={stockOrigen}
              onChange={(k, v) => updateItem(i, k, v)}
              onQtyDelta={d => cambiarCantidad(i, d)}
              onRemove={() => removeItem(i)}
            />
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0 space-y-2">
        <textarea
          rows={2}
          value={form.observaciones}
          onChange={e => setF('observaciones', e.target.value)}
          className={`${inputCls} resize-none text-xs`}
          placeholder="Observaciones / motivo…"
        />
        {hayExcesos && (
          <p className="text-xs text-orange-600 dark:text-orange-400">⚠ Hay cantidades que superan el disponible</p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={guardar}
            disabled={guardando || itemsValidos.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-semibold text-sm transition-colors"
          >
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Guardar como borrador'}
          </button>
          <button
            onClick={() => navigate('/inventario/transferencias')}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Cabecera */}
      <div>
        <button onClick={() => navigate('/inventario/transferencias')}
          className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-2">
          <FaArrowLeft className="h-3.5 w-3.5" /> Volver
        </button>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {esEdicion ? 'Editar transferencia (borrador)' : 'Nueva transferencia'}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Movimiento de stock entre depósitos</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ── Columna izquierda: depósitos + catálogo ── */}
        <div className="flex-1 min-w-0 w-full space-y-5 pb-20 lg:pb-0">

          {/* Depósitos */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                  Depósito Origen *
                </label>
                <select value={form.id_deposito_origen} onChange={e => handleOrigenChange(e.target.value)} className={inputCls}>
                  <option value="">— seleccionar —</option>
                  {depositos.map(d => <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                  Depósito Destino *
                </label>
                <select
                  value={form.id_deposito_destino}
                  onChange={e => setF('id_deposito_destino', e.target.value)}
                  className={inputCls}
                  disabled={!form.id_deposito_origen}
                >
                  <option value="">— seleccionar —</option>
                  {depositos.filter(d => String(d.id_deposito) !== String(form.id_deposito_origen)).map(d => (
                    <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            {depositoOrigen && depositoDestino && (
              <div className="flex items-center gap-3 px-1 mt-3">
                <span className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {depositoOrigen.nombre}
                </span>
                <span className="text-zinc-400 text-sm flex-1 text-center">→</span>
                <span className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {depositoDestino.nombre}
                </span>
              </div>
            )}
          </div>

          {/* Catálogo de stock disponible */}
          {form.id_deposito_origen && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">Stock disponible en origen</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    {depositoOrigen?.nombre} · tocá un producto para agregarlo
                  </p>
                </div>
                {cargandoStock && <span className="text-xs text-zinc-400 animate-pulse shrink-0">Cargando…</span>}
              </div>

              {!cargandoStock && (
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 space-y-2.5">
                  <input
                    type="text"
                    value={busquedaStock}
                    onChange={e => setBusquedaStock(e.target.value)}
                    placeholder="Buscar por nombre, código, marca o modelo…"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    <select value={filtroMarca} onChange={e => cambiarFiltroMarca(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400">
                      <option value="">Todas las marcas</option>
                      {marcasDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={filtroProducto} onChange={e => cambiarFiltroProducto(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400">
                      <option value="">Todos los productos</option>
                      {productosDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={filtroModelo} onChange={e => cambiarFiltroModelo(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400">
                      <option value="">Todos los modelos</option>
                      {modelosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={filtroColor} onChange={e => cambiarFiltroColor(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400">
                      <option value="">Todos los colores</option>
                      {coloresDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filtroCapacidad} onChange={e => setFiltroCapacidad(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400">
                      <option value="">Todas las capacidades</option>
                      {capacidadesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {!cargandoStock && productosConStock.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-zinc-400">
                  {busquedaStock ? `Sin resultados para "${busquedaStock}"` : 'No hay productos con stock disponible en este depósito'}
                </div>
              )}

              {!cargandoStock && productosConStock.length > 0 && (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {productosConStock.map(p => (
                    <ProductoCard
                      key={p.id_producto}
                      p={p}
                      enCarrito={cantidadesSeleccionadas[p.id_producto] ?? 0}
                      onAdd={agregarProducto}
                      onQuitar={quitarUnidadProducto}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Columna derecha: carrito fijo (desktop) ── */}
        <div className="hidden lg:block w-96 shrink-0 sticky top-4 self-start bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 h-[calc(100vh-2rem)] overflow-hidden">
          {panelCarrito}
        </div>
      </div>

      {/* ── Barra inferior + bottom-sheet del carrito (móvil/tablet) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            {itemsValidos.length} producto{itemsValidos.length !== 1 ? 's' : ''}
          </p>
          {hayExcesos && <p className="text-[11px] text-orange-600 dark:text-orange-400">⚠ Revisá cantidades</p>}
        </div>
        <button
          onClick={() => setCarritoAbierto(true)}
          className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
        >
          Ver carrito
        </button>
      </div>

      {carritoAbierto && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCarritoAbierto(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl border-t border-zinc-200 dark:border-zinc-700 h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">Carrito</span>
              <button
                onClick={() => setCarritoAbierto(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 min-h-0">{panelCarrito}</div>
          </div>
        </div>
      )}

    </div>
  );
}
