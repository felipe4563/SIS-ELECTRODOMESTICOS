import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cotizacionesService } from '../../services/cotizaciones.service';
import { clientesService } from '../../services/clientes.service';
import { usePermission } from '../../hooks/usePermission';
import api from '../../api/axios';

const RC_FORM_VACIO = { nombre: '', telefono: '', direccion: '', ciudad: '', habilitarCredito: false, limite_credito: '', dias_credito: '' };

const fmt   = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const toNum = v => (isNaN(Number(v)) ? 0 : Number(v));

const inputCls   = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors';
const compactCls = 'w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400';
const labelCls   = 'block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5';

function Spinner() {
  return <div className="w-5 h-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-yellow-400 rounded-full animate-spin" />;
}

/* ─── Íconos mínimos ──────────────────────────────────────────────────────── */
function Ic({ id, size = 15, className = '' }) {
  const paths = {
    package: <><path d="M16.5 9.4l-9-5.21" /><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
    cart:    <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></>,
    plus:    <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    minus:   <line x1="5" y1="12" x2="19" y2="12" />,
    trash:   <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5-3h4a1 1 0 011 1v2H9V4a1 1 0 011-1z" /></>,
    tune:    <><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>,
    search:  <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}
      fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {paths[id]}
    </svg>
  );
}

/* ─── Tile de producto (grilla estilo POS) ───────────────────────────────── */
function ProductoTile({ prod, enCarrito, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-stretch text-left bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-yellow-400 dark:hover:border-yellow-400 hover:shadow-md active:scale-[0.98] transition-all overflow-hidden group"
    >
      {enCarrito > 0 && (
        <span className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-yellow-400 text-zinc-900 text-[11px] font-bold flex items-center justify-center shadow">
          {enCarrito}
        </span>
      )}
      <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
        {prod.imagen_url ? (
          <img src={prod.imagen_url} alt={prod.producto} className="w-full h-full object-cover" />
        ) : (
          <Ic id="package" size={28} className="text-zinc-300 dark:text-zinc-600" />
        )}
      </div>
      <div className="px-2.5 py-2 space-y-0.5">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight line-clamp-2 min-h-[2.2em]">
          {prod.producto}
        </p>
        {prod.producto_detalle && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight line-clamp-1">{prod.producto_detalle}</p>
        )}
        {(prod.marca || prod.modelo || prod.color || prod.capacidad) && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight line-clamp-1">
            {[prod.marca, prod.modelo, prod.color, prod.capacidad].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="flex items-center justify-between gap-1">
          <p className="font-mono font-bold text-sm text-zinc-900 dark:text-white">Bs {fmt(prod.precio_publico)}</p>
          {prod.disponible != null && (
            <span className="text-[10px] font-mono font-semibold text-green-600 dark:text-green-400 shrink-0">{fmt(prod.disponible)} disp.</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Línea del carrito (panel de orden) ─────────────────────────────────── */
function CartLinea({ fila, prod, expandido, onToggleExpand, onQtyDelta, onChange, onRemove }) {
  const base     = toNum(fila.cantidad) * toNum(fila.precio_unitario);
  const desc     = base * (toNum(fila.descuento_porc) / 100);
  const subtotal = +(base - desc).toFixed(2);

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{prod?.producto ?? '—'}</p>
          {prod?.producto_detalle && (
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{prod.producto_detalle}</p>
          )}
          {prod && (prod.marca || prod.modelo || prod.color || prod.capacidad) && (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
              {[prod.marca, prod.modelo, prod.color, prod.capacidad].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="text-xs text-zinc-400 font-mono">Bs {fmt(fila.precio_unitario)} c/u</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onQtyDelta(-1)}
            className="w-6 h-6 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Ic id="minus" size={12} />
          </button>
          <span className="w-6 text-center text-sm font-mono font-semibold text-zinc-900 dark:text-white">{fila.cantidad}</span>
          <button
            onClick={() => onQtyDelta(1)}
            className="w-6 h-6 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Ic id="plus" size={12} />
          </button>
        </div>

        <p className="w-20 text-right font-mono font-semibold text-sm text-zinc-900 dark:text-white shrink-0">
          {fmt(subtotal)}
        </p>

        <button
          onClick={onToggleExpand}
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${expandido ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
          title="Precio, descuento, garantía"
        >
          <Ic id="tune" size={13} />
        </button>
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
        >
          <Ic id="trash" size={13} />
        </button>
      </div>

      {expandido && (
        <div className="px-3 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Precio unit.</label>
            <input
              type="number" min={0} step="0.01" value={fila.precio_unitario}
              onChange={e => onChange({ precio_unitario: e.target.value })}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Descuento %</label>
            <input
              type="number" min={0} max={100} step="0.01" value={fila.descuento_porc}
              onChange={e => onChange({ descuento_porc: e.target.value })}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Garantía (años)</label>
            <input
              type="number" min={0} step="1" value={fila.garantia_anos ?? ''}
              placeholder="—"
              onChange={e => onChange({ garantia_anos: e.target.value })}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-center font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de sección con acento izquierdo
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

/* ─────────────────────────────────────────────────────────────────────────────
   Componente principal
───────────────────────────────────────────────────────────────────────────── */
export default function CotizacionForm() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const esEdicion = Boolean(id);
  const { puede } = usePermission();

  const [sucursales, setSucursales] = useState([]);
  const [clientes,   setClientes]   = useState([]);
  const [productos,  setProductos]  = useState([]);
  const [monedas,    setMonedas]    = useState([]);
  const [stockSucursal,   setStockSucursal]   = useState({});
  const [cargandoStock,   setCargandoStock]   = useState(false);

  const [form, setForm] = useState({
    id_sucursal: '', id_cliente: '', id_moneda: '', tipo_cambio: 1,
    tipo_cotizacion: 'CONTADO', fecha_vencimiento: '',
    descuento_porc: 0, impuesto: 0, observaciones: '',
  });
  const [items,       setItems]       = useState([]);
  const [expandidos,  setExpandidos]  = useState(() => new Set());
  const [clienteInfo, setClienteInfo] = useState(null);
  const [guardando,   setGuardando]   = useState(false);
  const [cargando,    setCargando]    = useState(esEdicion);
  const [error,       setError]       = useState('');

  const [busquedaCliente,  setBusquedaCliente]  = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [filtroMarca,     setFiltroMarca]     = useState('');
  const [filtroProducto,  setFiltroProducto]  = useState('');
  const [filtroModelo,    setFiltroModelo]    = useState('');
  const [filtroColor,     setFiltroColor]     = useState('');
  const [filtroCapacidad, setFiltroCapacidad] = useState('');
  const [mostrarMasOpciones, setMostrarMasOpciones] = useState(false);

  const [rcForm, setRcForm]   = useState(RC_FORM_VACIO);
  const [rcError, setRcError] = useState('');
  const [rcGuardando, setRcGuardando] = useState(false);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  /* Cargar form-data en una sola llamada */
  useEffect(() => {
    cotizacionesService.getFormData()
      .then(r => {
        const d = r.data;
        setSucursales(d.sucursales ?? []);
        setClientes(d.clientes ?? []);
        setProductos(d.productos ?? []);
        const mons = d.monedas ?? [];
        setMonedas(mons);
        const base = mons.find(m => m.es_moneda_base);
        if (base && !esEdicion) setF('id_moneda', String(base.id_moneda));
      })
      .catch(() => {});

    if (esEdicion) {
      cotizacionesService.getOne(id)
        .then(r => {
          const c = r.data;
          setForm({
            id_sucursal: String(c.id_sucursal), id_cliente: String(c.id_cliente),
            id_moneda: String(c.id_moneda), tipo_cambio: c.tipo_cambio,
            tipo_cotizacion: c.tipo_cotizacion,
            fecha_vencimiento: c.fecha_vencimiento ? c.fecha_vencimiento.slice(0, 10) : '',
            descuento_porc: c.descuento_porc ?? 0, impuesto: c.impuesto ?? 0,
            observaciones: c.observaciones ?? '',
          });
          setItems((c.detalle ?? []).map(d => ({
            _key:            crypto.randomUUID(),
            id_producto:     String(d.id_producto),
            cantidad:        d.cantidad,
            precio_unitario: d.precio_unitario,
            descuento_porc:  d.descuento_porc ?? 0,
            garantia_anos:   d.garantia_anos ?? '',
          })));
        })
        .catch(() => navigate('/cotizaciones'))
        .finally(() => setCargando(false));
    }
  }, []); // eslint-disable-line

  /* Tipo de cambio automático */
  useEffect(() => {
    if (!form.id_moneda || monedas.length === 0) return;
    const sel = monedas.find(m => String(m.id_moneda) === String(form.id_moneda));
    if (!sel) return;
    if (sel.es_moneda_base) { setF('tipo_cambio', 1); return; }
    api.get('/tipos-cambio/hoy')
      .then(r => {
        const rates = r.data.tipos_cambio ?? r.data ?? [];
        const rate  = rates.find(tc => String(tc.id_moneda_origen) === String(sel.id_moneda));
        setF('tipo_cambio', rate ? Number(rate.tasa_venta) : 6.96);
      })
      .catch(() => setF('tipo_cambio', 6.96));
  }, [form.id_moneda, monedas]); // eslint-disable-line

  useEffect(() => {
    if (!form.id_cliente) { setClienteInfo(null); return; }
    setClienteInfo(clientes.find(c => String(c.id_cliente) === String(form.id_cliente)) ?? null);
  }, [form.id_cliente, clientes]);

  /* Stock disponible en la sucursal seleccionada (suma de sus depósitos) */
  useEffect(() => {
    if (!form.id_sucursal) { setStockSucursal({}); return; }
    setCargandoStock(true);
    cotizacionesService.getStockSucursal(form.id_sucursal)
      .then(r => setStockSucursal(r.data.stockMap ?? {}))
      .catch(() => setStockSucursal({}))
      .finally(() => setCargandoStock(false));
  }, [form.id_sucursal]);

  // ── Carrito ────────────────────────────────────────────────────────────────
  const agregarAlCarrito = useCallback((prod) => {
    setItems(prev => {
      const idx = prev.findIndex(it => String(it.id_producto) === String(prod.id_producto));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: Number(next[idx].cantidad) + 1 };
        return next;
      }
      return [...prev, {
        _key:            crypto.randomUUID(),
        id_producto:     String(prod.id_producto),
        cantidad:        1,
        precio_unitario: toNum(prod.precio_publico),
        descuento_porc:  0,
        garantia_anos:   '',
      }];
    });
  }, []);

  const cambiarCantidad = (i, delta) => {
    setItems(prev => prev.map((it, idx) => idx === i
      ? { ...it, cantidad: Math.max(1, Number(it.cantidad) + delta) }
      : it));
  };
  const removeItem = i => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, patch) => setItems(p => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const limpiarItems = () => setItems([]);

  const toggleExpandido = (key) => setExpandidos(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const setRc = (k, v) => setRcForm(p => ({ ...p, [k]: v }));

  const clientesFiltrados = useMemo(() => clientes.filter(c => {
    if (!busquedaCliente.trim()) return true;
    const q = busquedaCliente.toLowerCase();
    return (
      (c.documento ?? '').toLowerCase().includes(q) ||
      (c.nombres ?? '').toLowerCase().includes(q) ||
      (c.apellidos ?? '').toLowerCase().includes(q) ||
      (c.razon_social ?? '').toLowerCase().includes(q) ||
      (c.codigo ?? '').toLowerCase().includes(q)
    );
  }).slice(0, 50), [clientes, busquedaCliente]);

  // Si la búsqueda deja un único cliente posible, se selecciona solo (sin click extra en el select)
  useEffect(() => {
    if (!busquedaCliente.trim() || clientesFiltrados.length !== 1) return;
    const unico = clientesFiltrados[0];
    if (String(form.id_cliente) !== String(unico.id_cliente)) {
      setF('id_cliente', String(unico.id_cliente));
    }
  }, [clientesFiltrados]); // eslint-disable-line

  const guardarClienteRapido = async () => {
    setRcError('');
    const { nombre, telefono, direccion, ciudad, habilitarCredito, limite_credito, dias_credito } = rcForm;
    if (!nombre.trim()) return setRcError('El nombre es requerido');
    if (habilitarCredito && !(Number(limite_credito) > 0)) {
      return setRcError('Ingresá un límite de crédito válido');
    }
    setRcGuardando(true);
    try {
      const res = await clientesService.create({
        nombres: nombre.trim(),
        documento: busquedaCliente.trim() || undefined,
        telefono: telefono.trim() || undefined,
      });
      let nuevoCliente = res.data.cliente;

      if (habilitarCredito) {
        const resCredito = await clientesService.updateCredito(nuevoCliente.id_cliente, {
          permite_credito: true,
          limite_credito: Number(limite_credito),
          dias_credito: Number(dias_credito) || 0,
        });
        nuevoCliente = { ...nuevoCliente, ...resCredito.data.credito };
      }

      if (direccion.trim()) {
        await clientesService.createDireccion(nuevoCliente.id_cliente, {
          direccion: direccion.trim(),
          ciudad: ciudad.trim() || undefined,
          es_principal: true,
        });
      }

      setClientes(prev => [...prev, nuevoCliente]);
      setF('id_cliente', String(nuevoCliente.id_cliente));
      setBusquedaCliente('');
      setRcForm(RC_FORM_VACIO);
    } catch (err) {
      setRcError(err.response?.data?.error ?? 'Error al crear cliente');
    } finally {
      setRcGuardando(false);
    }
  };

  const subtotal  = items.reduce((s, it) => {
    const base = toNum(it.cantidad) * toNum(it.precio_unitario);
    return s + base - base * (toNum(it.descuento_porc) / 100);
  }, 0);
  const descMonto = subtotal * (toNum(form.descuento_porc) / 100);
  const impuesto  = toNum(form.impuesto);
  const total     = subtotal - descMonto + impuesto;
  const totalUnidades = items.reduce((s, it) => s + Number(it.cantidad ?? 0), 0);

  const guardar = async () => {
    setError('');
    if (!form.id_sucursal || !form.id_cliente)
      return setError('Sucursal y cliente son obligatorios.');
    const itemsValidos = items.filter(it => it.id_producto && toNum(it.cantidad) > 0);
    if (!itemsValidos.length)
      return setError('Agrega al menos un producto con cantidad válida.');
    setGuardando(true);
    try {
      const payload = { ...form, items: itemsValidos };
      let cotId = id;
      if (esEdicion) {
        await cotizacionesService.update(id, payload);
      } else {
        const res = await cotizacionesService.create(payload);
        cotId = res.data.id_cotizacion;
      }
      navigate(`/cotizaciones/${cotId}`);
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al guardar la cotización.');
    } finally {
      setGuardando(false);
    }
  };

  const monedaSel = monedas.find(m => String(m.id_moneda) === String(form.id_moneda));

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

  // Productos con stock > 0 en la sucursal seleccionada (base, antes de aplicar filtros)
  const productosConStockBase = form.id_sucursal
    ? productos
        .filter(p => (stockSucursal[p.id_producto] ?? 0) > 0)
        .map(p => ({ ...p, disponible: stockSucursal[p.id_producto] ?? 0 }))
    : [];

  const marcasDisponibles = [...new Set(productosConStockBase.map(p => p.marca).filter(Boolean))].sort();
  const productosDisponibles = [...new Set(
    productosConStockBase.filter(p => !filtroMarca || p.marca === filtroMarca).map(p => p.producto).filter(Boolean)
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

  const productosVisibles = productosConStockBase
    .filter(p => !filtroMarca     || p.marca     === filtroMarca)
    .filter(p => !filtroProducto  || p.producto  === filtroProducto)
    .filter(p => !filtroModelo    || p.modelo    === filtroModelo)
    .filter(p => !filtroColor     || p.color     === filtroColor)
    .filter(p => !filtroCapacidad || p.capacidad === filtroCapacidad)
    .filter(p => {
      if (!busquedaProducto.trim()) return true;
      const q = busquedaProducto.toLowerCase();
      return p.producto.toLowerCase().includes(q) ||
        (p.codigo_interno ?? '').toLowerCase().includes(q) ||
        p.marca?.toLowerCase().includes(q) ||
        p.modelo?.toLowerCase().includes(q);
    });

  const cantidadesEnCarrito = items.reduce((acc, it) => {
    acc[it.id_producto] = (acc[it.id_producto] ?? 0) + Number(it.cantidad ?? 0);
    return acc;
  }, {});

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-32 text-zinc-400">
        <Spinner /><span className="text-sm">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-4 space-y-4">

      {/* ── Encabezado ── */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(esEdicion ? `/cotizaciones/${id}` : '/cotizaciones')}
          className="mt-0.5 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">
            {esEdicion ? 'Cotizaciones / Editar' : 'Cotizaciones / Nueva'}
          </p>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            {esEdicion ? 'Editar cotización' : 'Nueva cotización'}
          </h1>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Franja compacta: datos generales ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end">
          <div>
            <label className={labelCls}>Sucursal *</label>
            <select value={form.id_sucursal} onChange={e => setF('id_sucursal', e.target.value)} disabled={esEdicion} className={compactCls}>
              <option value="">—</option>
              {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Tipo de pago</label>
            <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg gap-0.5">
              {[['CONTADO', 'Contado'], ['CREDITO', 'Crédito']].map(([val, lbl]) => (
                <button
                  key={val} type="button" onClick={() => setF('tipo_cotizacion', val)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    form.tipo_cotizacion === val ? 'bg-yellow-400 text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Válida hasta</label>
            <input type="date" value={form.fecha_vencimiento} onChange={e => setF('fecha_vencimiento', e.target.value)} className={compactCls} />
          </div>

          <div>
            <label className={labelCls}>&nbsp;</label>
            <button
              type="button" onClick={() => setMostrarMasOpciones(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Ic id="tune" size={13} /> Más opciones
            </button>
          </div>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 mt-3 pt-3">
          <label className={labelCls}>Cliente *</label>
          <input
            type="text" value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)}
            placeholder="Buscar por CI, nombre o código…"
            className="w-full mb-1.5 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:bg-white dark:focus:bg-zinc-800"
          />

          {busquedaCliente.trim() && clientesFiltrados.length === 1 ? (
            <div className="px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 truncate">
                  {clientesFiltrados[0].razon_social || [clientesFiltrados[0].nombres, clientesFiltrados[0].apellidos].filter(Boolean).join(' ')}
                </p>
                {clienteInfo && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 flex flex-wrap gap-x-2">
                    {clienteInfo.tipo_documento && <span>{clienteInfo.tipo_documento}: {clienteInfo.documento}</span>}
                    {clienteInfo.telefono && <span>· Tel: {clienteInfo.telefono}</span>}
                    {clienteInfo.email && <span>· {clienteInfo.email}</span>}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setBusquedaCliente('')} className="text-xs text-green-600 dark:text-green-400 hover:underline shrink-0">
                Cambiar
              </button>
            </div>
          ) : clientesFiltrados.length > 0 ? (
            <>
              <select value={form.id_cliente} onChange={e => setF('id_cliente', e.target.value)} className={inputCls}>
                <option value="">— seleccionar cliente —</option>
                {clientesFiltrados.map(c => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    [{c.codigo}] {c.razon_social || [c.nombres, c.apellidos].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
              {clienteInfo && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {clienteInfo.tipo_documento && <span>{clienteInfo.tipo_documento}: {clienteInfo.documento}</span>}
                  {clienteInfo.telefono && <span>· Tel: {clienteInfo.telefono}</span>}
                  {clienteInfo.email && <span>· {clienteInfo.email}</span>}
                </p>
              )}
            </>
          ) : busquedaCliente.trim() ? (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2.5">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No se encontró a "{busquedaCliente.trim()}" — completá los datos para crearlo.
              </p>
              <div>
                <label className={labelCls}>Nombre / Razón social *</label>
                <input type="text" value={rcForm.nombre} onChange={e => setRc('nombre', e.target.value)} placeholder="Ej: Juan Pérez" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input type="text" value={rcForm.telefono} onChange={e => setRc('telefono', e.target.value)} placeholder="Opcional" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={labelCls}>Dirección</label>
                  <input type="text" value={rcForm.direccion} onChange={e => setRc('direccion', e.target.value)} placeholder="Opcional" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ciudad</label>
                  <input type="text" value={rcForm.ciudad} onChange={e => setRc('ciudad', e.target.value)} placeholder="Opcional" className={inputCls} />
                </div>
              </div>
              {puede('dar_credito', 'clientes') && (
                <div className="pt-1 border-t border-zinc-200 dark:border-zinc-700">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit group mt-2">
                    <input
                      type="checkbox" checked={rcForm.habilitarCredito}
                      onChange={e => setRc('habilitarCredito', e.target.checked)}
                      className="w-4 h-4 rounded accent-yellow-400"
                    />
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                      Habilitar crédito
                    </span>
                  </label>

                  {rcForm.habilitarCredito && (
                    <div className="grid grid-cols-2 gap-2.5 mt-2.5 pl-6 border-l-2 border-yellow-400/30 ml-1.5">
                      <div>
                        <label className={labelCls}>Límite de crédito *</label>
                        <input type="number" min={0} step="0.01" value={rcForm.limite_credito}
                          onChange={e => setRc('limite_credito', e.target.value)}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Días de crédito</label>
                        <input type="number" min={0} value={rcForm.dias_credito}
                          onChange={e => setRc('dias_credito', e.target.value)}
                          placeholder="0" className={inputCls} />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {rcError && (
                <p className="text-xs text-red-500 flex items-center gap-1.5"><span>⚠</span> {rcError}</p>
              )}
              <button
                onClick={guardarClienteRapido} disabled={rcGuardando}
                className="w-full py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-xs transition-colors"
              >
                {rcGuardando ? 'Creando…' : 'Crear y usar este cliente'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Layout principal: grilla de productos + panel de orden ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">

        {/* ── Columna productos ── */}
        <div className="space-y-3 min-w-0">
          {!form.id_sucursal ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
              <Ic id="package" size={32} className="text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm font-medium">Seleccioná una sucursal para ver el catálogo</p>
            </div>
          ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-3">
            {cargandoStock ? (
              <div className="flex items-center justify-center gap-2.5 py-16 text-zinc-400">
                <Spinner /><span className="text-sm">Cargando stock…</span>
              </div>
            ) : (
            <>
            <div className="relative">
              <Ic id="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text" value={busquedaProducto} onChange={e => setBusquedaProducto(e.target.value)}
                placeholder="Buscar producto por nombre, código, marca o modelo…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <select value={filtroMarca} onChange={e => cambiarFiltroMarca(e.target.value)} className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400">
                <option value="">Todas las marcas</option>
                {marcasDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filtroProducto} onChange={e => cambiarFiltroProducto(e.target.value)} className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400">
                <option value="">Todos los productos</option>
                {productosDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filtroModelo} onChange={e => cambiarFiltroModelo(e.target.value)} className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400">
                <option value="">Todos los modelos</option>
                {modelosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filtroColor} onChange={e => cambiarFiltroColor(e.target.value)} className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400">
                <option value="">Todos los colores</option>
                {coloresDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filtroCapacidad} onChange={e => setFiltroCapacidad(e.target.value)} className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400">
                <option value="">Todas las capacidades</option>
                {capacidadesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {productosVisibles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
                <Ic id="package" size={32} className="text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm font-medium">
                  {busquedaProducto || filtroMarca ? 'Sin productos para este filtro' : 'No hay productos con stock disponible en esta sucursal'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {productosVisibles.map(p => (
                  <ProductoTile
                    key={p.id_producto}
                    prod={p}
                    enCarrito={cantidadesEnCarrito[p.id_producto] ?? 0}
                    onClick={() => agregarAlCarrito(p)}
                  />
                ))}
              </div>
            )}
            </>
            )}
          </div>
          )}
        </div>

        {/* ── Columna panel de orden ── */}
        <div className="lg:sticky lg:top-4 space-y-3">
          <SectionCard
            title="Cotización"
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
                  <p className="text-xs text-center">Tocá un producto para agregarlo</p>
                </div>
              ) : (
                items.map((fila, i) => {
                  const prod = productos.find(p => String(p.id_producto) === String(fila.id_producto));
                  return (
                    <CartLinea
                      key={fila._key}
                      fila={fila}
                      prod={prod}
                      expandido={expandidos.has(fila._key)}
                      onToggleExpand={() => toggleExpandido(fila._key)}
                      onQtyDelta={d => cambiarCantidad(i, d)}
                      onChange={patch => updateItem(i, patch)}
                      onRemove={() => removeItem(i)}
                    />
                  );
                })
              )}
            </div>

            {/* Totales */}
            <div className="px-3.5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>{totalUnidades} unidad{totalUnidades !== 1 ? 'es' : ''}</span>
                <span className="font-mono">Subt. Bs {fmt(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Descuento global</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min={0} max={100} step="0.01" value={form.descuento_porc}
                    onChange={e => setF('descuento_porc', e.target.value)}
                    className="w-14 px-2 py-0.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-yellow-400 font-mono"
                  />
                  <span className="text-xs text-zinc-400">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Impuesto (Bs)</span>
                <input
                  type="number" min={0} step="0.01" value={form.impuesto}
                  onChange={e => setF('impuesto', e.target.value)}
                  className="w-24 px-2 py-0.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-yellow-400 font-mono"
                />
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <span className="text-base font-bold text-zinc-900 dark:text-white">Total</span>
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white">Bs {fmt(total)}</span>
              </div>

              <button
                onClick={guardar} disabled={guardando}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-bold text-sm transition-colors mt-1"
              >
                {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear cotización'}
              </button>
              <button
                onClick={() => navigate(esEdicion ? `/cotizaciones/${id}` : '/cotizaciones')}
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
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">Total · {totalUnidades} u.</p>
          <p className="text-lg font-bold font-mono text-zinc-900 dark:text-white leading-tight">Bs {fmt(total)}</p>
        </div>
        <button
          onClick={guardar} disabled={guardando}
          className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors"
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar' : 'Crear cotización'}
        </button>
      </div>

      {/* ── Modal más opciones ── */}
      {mostrarMasOpciones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Más opciones</h3>
              <button onClick={() => setMostrarMasOpciones(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Moneda</label>
                <select value={form.id_moneda} onChange={e => setF('id_moneda', e.target.value)} className={inputCls}>
                  <option value="">— seleccionar —</option>
                  {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>)}
                </select>
                {monedaSel && !monedaSel.es_moneda_base && (
                  <div className="mt-2">
                    <label className="block text-[10px] text-zinc-400 mb-1">Tipo de cambio</label>
                    <input
                      type="number" min="0.000001" step="0.000001" value={form.tipo_cambio}
                      onChange={e => setF('tipo_cambio', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Observaciones</label>
                <textarea
                  value={form.observaciones} onChange={e => setF('observaciones', e.target.value)}
                  rows={3} className={`${inputCls} resize-none`} placeholder="Condiciones, garantías, notas adicionales…"
                />
              </div>

              <button
                onClick={() => setMostrarMasOpciones(false)}
                className="w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
