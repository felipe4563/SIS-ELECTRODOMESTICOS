import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { comprasService }     from '../../services/compras.service';
import { productosService }   from '../../services/productos.service';
import { tiposCambioService } from '../../services/configuracion.service';
import { usePermission } from '../../hooks/usePermission';

// ── Helpers ───────────────────────────────────────────────────────────────────
const HOY      = new Date().toISOString().slice(0, 10);
const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const inputCls   = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors';
const compactCls = 'w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400';
const labelCls   = 'block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1';
const fieldLbl   = 'block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wide';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const buildImgUrl = (url) =>
  !url ? null : url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`;

function calcSubtotal(it) {
  const base = Number(it.cantidad || 0) * Number(it.precio_unitario || 0);
  const desc = base * (Number(it.descuento_porc || 0) / 100);
  const imp  = (base - desc) * (Number(it.impuesto_porc || 0) / 100);
  return +(base - desc + imp).toFixed(2);
}

const NP_VACIO = {
  id_marca: '', id_categoria: '', id_unidad: '', id_moneda_costo: '',
  producto: '', detalle: '', capacidad: '', caracteristicas: '', modelo: '', color: '',
  precio_real: '', costo_logistica: 0, costo_mcm: 0, precio_publico: '',
  bono: 0, precio_mayor: 0, id_proveedor_default: '',
  stock_minimo: 0, stock_maximo: 100, notas: '',
};

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

function Modal({ titulo, onClose, children, maxW = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full ${maxW} shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{titulo}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-lg leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
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
function ProductoTile({ prod, enCarrito, onClick }) {
  const [errImg, setErrImg] = useState(false);
  const img = buildImgUrl(prod.imagen_url);

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
        <p className="font-mono font-bold text-sm text-zinc-900 dark:text-white">Bs {fmtMonto(prod.precio_real)}</p>
      </div>
    </button>
  );
}

/* ─── Línea del carrito (panel de orden) ─────────────────────────────────── */
function CartLinea({ fila, prod, impuestos, expandido, onToggleExpand, onQtyDelta, onChange, onRemove }) {
  const sub = calcSubtotal(fila);
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{prod?.producto ?? '—'}</p>
          {prod && (prod.marca || prod.modelo || prod.color || prod.capacidad) && (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
              {[prod.marca, prod.modelo, prod.color, prod.capacidad].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onQtyDelta(-1)}
            className="w-6 h-6 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <Ic id="minus" size={12} />
          </button>
          <input
            type="number" min="0.01" step="0.01" value={fila.cantidad}
            onChange={e => onChange({ cantidad: e.target.value })}
            className="w-12 text-center text-sm font-mono font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white py-0.5 focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
          <button onClick={() => onQtyDelta(1)}
            className="w-6 h-6 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <Ic id="plus" size={12} />
          </button>
        </div>

        <input
          type="number" min="0" step="0.01" value={fila.precio_unitario}
          onChange={e => onChange({ precio_unitario: e.target.value })}
          className="w-20 text-right font-mono text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-400 shrink-0"
        />

        <button onClick={onToggleExpand}
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${expandido ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
          title="Descuento e impuesto">
          <Ic id="tune" size={13} />
        </button>
        <button onClick={onRemove}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
          <Ic id="trash" size={13} />
        </button>
      </div>

      <div className="px-3 pb-2 flex justify-end">
        <span className="text-xs text-zinc-400 dark:text-zinc-500 mr-1.5">Subtotal:</span>
        <span className="text-sm font-mono font-bold text-zinc-900 dark:text-white">{fmtMonto(sub)}</span>
      </div>

      {expandido && (
        <div className="px-3 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Descuento %</label>
            <input
              type="number" min={0} max={100} step="0.01" value={fila.descuento_porc}
              onChange={e => onChange({ descuento_porc: e.target.value })}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Impuesto</label>
            <select
              value={fila.id_impuesto ?? ''}
              onChange={e => {
                const i = impuestos.find(x => String(x.id_impuesto) === e.target.value);
                onChange({ id_impuesto: e.target.value, impuesto_porc: i ? Number(i.porcentaje) : 0 });
              }}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
            >
              <option value="">Sin imp.</option>
              {impuestos.map(i => (
                <option key={i.id_impuesto} value={i.id_impuesto}>{i.codigo} ({Number(i.porcentaje).toFixed(0)}%)</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CompraForm() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const esEdicion = Boolean(id);
  const { puede } = usePermission();
  const puedeCrearProducto = puede('crear', 'productos');

  const [catalogo,      setCatalogo]      = useState(null); // null = cargando
  const [metaProductos, setMetaProductos] = useState(null); // marcas/categorias/unidades para alta rápida
  const [guardando,     setGuardando]     = useState(false);
  const [error,         setError]         = useState('');

  const [datos, setDatos] = useState({
    id_proveedor:        '',
    id_sucursal:         '',
    id_deposito_destino: '',
    id_moneda:           '',
    tipo_cambio:         '1',
    numero_factura:      '',
    fecha_pedido:        HOY,
    fecha_estim_llegada: '',
    descuento:           '0',
    impuesto:            '0',
    flete:               '0',
    otros_costos:        '0',
    observaciones:       '',
  });

  const [items, setItems] = useState([]);
  const [expandidos, setExpandidos] = useState(() => new Set());

  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [filtroMarca,      setFiltroMarca]      = useState('');
  const [filtroProducto,   setFiltroProducto]   = useState('');
  const [filtroModelo,     setFiltroModelo]     = useState('');
  const [filtroColor,      setFiltroColor]      = useState('');
  const [filtroCapacidad,  setFiltroCapacidad]  = useState('');
  const [verTodosProveedor, setVerTodosProveedor] = useState(false);

  const [npModal,     setNpModal]     = useState(false);
  const [npForm,      setNpForm]      = useState(NP_VACIO);
  const [npError,     setNpError]     = useState('');
  const [npGuardando, setNpGuardando] = useState(false);

  // Carga catálogos + compra (si es edición)
  useEffect(() => {
    comprasService.getFormData()
      .then(({ data }) => {
        setCatalogo({
          proveedores: data.proveedores ?? [],
          sucursales:  data.sucursales  ?? [],
          depositos:   data.depositos   ?? [],
          monedas:     data.monedas     ?? [],
          productos:   data.productos   ?? [],
          impuestos:   (data.impuestos ?? []).filter(i => i.tipo === 'COMPRA' || i.tipo === 'AMBOS'),
        });
      })
      .catch(() => setCatalogo({ proveedores: [], sucursales: [], depositos: [], monedas: [], productos: [], impuestos: [] }));

    productosService.getFormData()
      .then(({ data }) => setMetaProductos({
        marcas:     data.marcas     ?? [],
        categorias: data.categorias ?? [],
        unidades:   data.unidades   ?? [],
      }))
      .catch(() => setMetaProductos({ marcas: [], categorias: [], unidades: [] }));

    if (esEdicion) {
      comprasService.getOne(id).then(res => {
        const { compra, detalle } = res.data;
        setDatos({
          id_proveedor:        String(compra.id_proveedor),
          id_sucursal:         String(compra.id_sucursal),
          id_deposito_destino: String(compra.id_deposito_destino),
          id_moneda:           String(compra.id_moneda),
          tipo_cambio:         String(compra.tipo_cambio),
          numero_factura:      compra.numero_factura ?? '',
          fecha_pedido:        compra.fecha_pedido?.slice(0, 10) ?? HOY,
          fecha_estim_llegada: compra.fecha_estim_llegada?.slice(0, 10) ?? '',
          descuento:           String(compra.descuento),
          impuesto:            String(compra.impuesto),
          flete:               String(compra.flete),
          otros_costos:        String(compra.otros_costos),
          observaciones:       compra.observaciones ?? '',
        });
        setItems(detalle.map(d => ({
          _key:            crypto.randomUUID(),
          id_producto:     String(d.id_producto),
          cantidad:        String(d.cantidad),
          precio_unitario: String(d.precio_unitario),
          descuento_porc:  String(d.descuento_porc),
          id_impuesto:     d.id_impuesto ? String(d.id_impuesto) : '',
          impuesto_porc:   String(d.impuesto_porc ?? 0),
        })));
      }).catch(() => {});
    }
  }, []); // eslint-disable-line

  const setD = (k, v) => setDatos(p => ({ ...p, [k]: v }));

  // Auto-fill tipo de cambio al cambiar moneda
  useEffect(() => {
    if (!datos.id_moneda || !catalogo?.monedas.length) return;
    const mon = catalogo.monedas.find(m => String(m.id_moneda) === String(datos.id_moneda));
    if (!mon) return;
    if (mon.es_moneda_base) {
      setD('tipo_cambio', '1');
    } else {
      tiposCambioService.getHoy()
        .then(r => {
          const rates = r.data.tipos_cambio ?? r.data ?? [];
          const rate  = rates.find(tc => String(tc.id_moneda_origen) === String(mon.id_moneda));
          setD('tipo_cambio', rate ? String(rate.tasa_compra) : '6.86');
        })
        .catch(() => setD('tipo_cambio', '6.86'));
    }
  }, [datos.id_moneda, catalogo?.monedas]);

  // ── Carrito ────────────────────────────────────────────────────────────────
  const agregarAlCarrito = useCallback((prod) => {
    if (!prod) return;
    setItems(prev => {
      const idx = prev.findIndex(it => String(it.id_producto) === String(prod.id_producto));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: Number(next[idx].cantidad) + 1 };
        return next;
      }
      const impDef = prod.id_impuesto_default
        ? catalogo.impuestos.find(i => String(i.id_impuesto) === String(prod.id_impuesto_default))
        : catalogo.impuestos.find(i => i.es_default);
      return [...prev, {
        _key:            crypto.randomUUID(),
        id_producto:     String(prod.id_producto),
        cantidad:        1,
        precio_unitario: prod.precio_real,
        descuento_porc:  0,
        id_impuesto:     impDef ? String(impDef.id_impuesto) : '',
        impuesto_porc:   impDef ? Number(impDef.porcentaje) : 0,
      }];
    });
  }, [catalogo]);

  const cambiarCantidad = (i, delta) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, cantidad: Math.max(0.01, Number(it.cantidad) + delta) } : it));
  };
  const removeItem  = i => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem  = (i, patch) => setItems(p => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const limpiarItems = () => setItems([]);

  const toggleExpandido = (key) => setExpandidos(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const totales = useMemo(() => {
    const subtotal  = items.reduce((s, it) => s + calcSubtotal(it), 0);
    const descuento = Number(datos.descuento    || 0);
    const impuesto  = Number(datos.impuesto     || 0);
    const flete     = Number(datos.flete        || 0);
    const otros     = Number(datos.otros_costos || 0);
    const total     = +(subtotal - descuento + impuesto + flete + otros).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), descuento, impuesto, flete, otros, total };
  }, [items, datos.descuento, datos.impuesto, datos.flete, datos.otros_costos]);

  const totalUnidades = items.reduce((s, it) => s + Number(it.cantidad || 0), 0);

  const handleGuardar = async () => {
    setError('');
    if (!datos.id_proveedor || !datos.id_sucursal || !datos.id_deposito_destino || !datos.id_moneda)
      return setError('Completa los campos obligatorios: proveedor, depósito destino y moneda');
    if (items.length === 0 || items.some(it => !it.id_producto || Number(it.cantidad) <= 0))
      return setError('Agregá al menos un producto con cantidad mayor a 0');

    setGuardando(true);
    try {
      const payload = {
        ...datos,
        items: items.map(it => ({
          id_producto:     Number(it.id_producto),
          cantidad:        Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
          descuento_porc:  Number(it.descuento_porc),
          descuento_monto: 0,
          impuesto_porc:   0,
        })),
      };
      if (esEdicion) {
        await comprasService.update(id, payload);
        navigate(`/compras/${id}`);
      } else {
        const res = await comprasService.create(payload);
        navigate(`/compras/${res.data.id_compra}`);
      }
    } catch (e) {
      setError(e?.response?.data?.error ?? 'Error al guardar la compra');
    } finally {
      setGuardando(false);
    }
  };

  // ── Alta rápida de producto nuevo ────────────────────────────────────────────
  const abrirNuevoProducto = () => {
    setNpError('');
    setNpForm({
      ...NP_VACIO,
      producto: busquedaProducto.trim().toUpperCase(),
      id_proveedor_default: datos.id_proveedor || '',
      id_moneda_costo: catalogo?.monedas.find(m => m.es_moneda_base)?.id_moneda ?? '',
    });
    setNpModal(true);
  };
  const setNp = (k, v) => setNpForm(p => ({ ...p, [k]: v }));

  const guardarNuevoProducto = async () => {
    setNpError('');
    if (!npForm.id_marca || !npForm.id_categoria || !npForm.id_unidad || !npForm.id_moneda_costo)
      return setNpError('Marca, categoría, unidad y moneda son obligatorias');
    if (!npForm.producto.trim()) return setNpError('El nombre del producto es obligatorio');
    if (!(Number(npForm.precio_real) >= 0) || !(Number(npForm.precio_publico) >= 0))
      return setNpError('Precio real y precio público son obligatorios');

    setNpGuardando(true);
    try {
      const res = await productosService.create(npForm);
      const creado = res.data.producto;
      const marcaNombre = metaProductos?.marcas.find(m => String(m.id_marca) === String(creado.id_marca))?.nombre ?? creado.marca_nombre;

      const prodParaCatalogo = {
        id_producto:          creado.id_producto,
        codigo_interno:       creado.codigo_interno,
        codigo_barras:        creado.codigo_barras,
        producto:             creado.producto,
        precio_real:          creado.precio_real,
        id_impuesto_default:  creado.id_impuesto_default,
        id_proveedor_default: creado.id_proveedor_default,
        modelo:               creado.modelo,
        color:                creado.color,
        capacidad:            creado.capacidad,
        producto_detalle:     creado.detalle,
        imagen_url:           creado.imagen_url,
        marca:                marcaNombre,
      };

      setCatalogo(prev => ({ ...prev, productos: [...prev.productos, prodParaCatalogo] }));
      agregarAlCarrito(prodParaCatalogo);
      setNpModal(false);
      setBusquedaProducto('');
    } catch (err) {
      setNpError(err.response?.data?.error ?? 'Error al crear el producto');
    } finally {
      setNpGuardando(false);
    }
  };

  // ── Filtros en cascada ───────────────────────────────────────────────────────
  const cambiarFiltroMarca = (v) => { setFiltroMarca(v); setFiltroProducto(''); setFiltroModelo(''); setFiltroColor(''); setFiltroCapacidad(''); };
  const cambiarFiltroProducto = (v) => { setFiltroProducto(v); setFiltroModelo(''); setFiltroColor(''); setFiltroCapacidad(''); };
  const cambiarFiltroModelo = (v) => { setFiltroModelo(v); setFiltroColor(''); setFiltroCapacidad(''); };
  const cambiarFiltroColor = (v) => { setFiltroColor(v); setFiltroCapacidad(''); };

  const productosDelProveedor = useMemo(
    () => (catalogo && datos.id_proveedor)
      ? catalogo.productos.filter(p => String(p.id_proveedor_default) === String(datos.id_proveedor))
      : catalogo?.productos ?? [],
    [catalogo, datos.id_proveedor]
  );
  const hayFiltroProveedor = Boolean(datos.id_proveedor) && catalogo && productosDelProveedor.length !== catalogo.productos.length;
  const baseProductos = useMemo(
    () => (verTodosProveedor || !hayFiltroProveedor) ? (catalogo?.productos ?? []) : productosDelProveedor,
    [verTodosProveedor, hayFiltroProveedor, catalogo, productosDelProveedor]
  );

  const marcasDisponibles = useMemo(() => [...new Set(baseProductos.map(p => p.marca).filter(Boolean))].sort(), [baseProductos]);
  const productosDisponibles = useMemo(() => [...new Set(
    baseProductos.filter(p => !filtroMarca || p.marca === filtroMarca).map(p => p.producto).filter(Boolean)
  )].sort(), [baseProductos, filtroMarca]);
  const modelosDisponibles = useMemo(() => [...new Set(
    baseProductos
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.producto === filtroProducto))
      .map(p => p.modelo).filter(Boolean)
  )].sort(), [baseProductos, filtroMarca, filtroProducto]);
  const coloresDisponibles = useMemo(() => [...new Set(
    baseProductos
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.producto === filtroProducto) && (!filtroModelo || p.modelo === filtroModelo))
      .map(p => p.color).filter(Boolean)
  )].sort(), [baseProductos, filtroMarca, filtroProducto, filtroModelo]);
  const capacidadesDisponibles = useMemo(() => [...new Set(
    baseProductos
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.producto === filtroProducto) && (!filtroModelo || p.modelo === filtroModelo) && (!filtroColor || p.color === filtroColor))
      .map(p => p.capacidad).filter(Boolean)
  )].sort(), [baseProductos, filtroMarca, filtroProducto, filtroModelo, filtroColor]);

  const productosVisibles = useMemo(() => {
    let lista = baseProductos
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
  }, [baseProductos, filtroMarca, filtroProducto, filtroModelo, filtroColor, filtroCapacidad, busquedaProducto]);

  const cantidadesEnCarrito = items.reduce((acc, it) => {
    acc[it.id_producto] = (acc[it.id_producto] ?? 0) + Number(it.cantidad ?? 0);
    return acc;
  }, {});

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!catalogo) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-400">Cargando…</p>
      </div>
    </div>
  );

  const monedaSel = catalogo.monedas.find(m => String(m.id_moneda) === String(datos.id_moneda));

  return (
    <div className="pb-24 lg:pb-4 space-y-4">

      {/* ── Cabecera de página ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/compras')}
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mb-1.5 transition-colors"
          >
            ← Compras
          </button>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {esEdicion ? 'Editar Pre-pedido' : 'Nueva Compra'}
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

      {/* ── Franja compacta: datos generales ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className={fieldLbl}>Proveedor *</label>
            <select value={datos.id_proveedor} onChange={e => setD('id_proveedor', e.target.value)} className={compactCls}>
              <option value="">— Seleccionar proveedor —</option>
              {catalogo.proveedores.map(p => (
                <option key={p.id_proveedor} value={p.id_proveedor}>{p.codigo} — {p.razon_social}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={fieldLbl}>Depósito / Almacén destino *</label>
            <select
              value={datos.id_deposito_destino}
              onChange={e => {
                const idDep = e.target.value;
                const dep   = catalogo.depositos.find(d => String(d.id_deposito) === idDep);
                setDatos(p => ({ ...p, id_deposito_destino: idDep, id_sucursal: dep ? String(dep.id_sucursal) : '' }));
              }}
              className={compactCls}
            >
              <option value="">— Seleccionar —</option>
              {catalogo.depositos.map(d => (
                <option key={d.id_deposito} value={d.id_deposito}>{d.codigo} — {d.nombre} ({d.sucursal_nombre})</option>
              ))}
            </select>
          </div>

          <div>
            <label className={fieldLbl}>Nº Factura proveedor</label>
            <input type="text" value={datos.numero_factura} onChange={e => setD('numero_factura', e.target.value)}
              placeholder="Opcional" className={compactCls} />
          </div>

          <div>
            <label className={fieldLbl}>Moneda *</label>
            <select value={datos.id_moneda} onChange={e => setD('id_moneda', e.target.value)} className={compactCls}>
              <option value="">— Seleccionar —</option>
              {catalogo.monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.codigo} — {m.nombre}</option>)}
            </select>
          </div>

          {monedaSel && !monedaSel.es_moneda_base && (
            <div>
              <label className={fieldLbl}>Tipo de cambio *</label>
              <input type="number" min="0.000001" step="0.000001" value={datos.tipo_cambio}
                onChange={e => setD('tipo_cambio', e.target.value)} className={compactCls} />
            </div>
          )}

          <div>
            <label className={fieldLbl}>Fecha pedido *</label>
            <input type="date" value={datos.fecha_pedido} onChange={e => setD('fecha_pedido', e.target.value)} className={compactCls} />
          </div>

          <div>
            <label className={fieldLbl}>Est. llegada</label>
            <input type="date" value={datos.fecha_estim_llegada} onChange={e => setD('fecha_estim_llegada', e.target.value)} className={compactCls} />
          </div>
        </div>

        <div>
          <label className={fieldLbl}>Observaciones</label>
          <textarea value={datos.observaciones} onChange={e => setD('observaciones', e.target.value)}
            rows={2} placeholder="Notas adicionales…" className={compactCls + ' resize-none'} />
        </div>
      </div>

      {/* ── Layout principal: grilla de productos + panel de orden ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">

        {/* ── Columna productos ── */}
        <div className="space-y-3 min-w-0">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Ic id="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text" value={busquedaProducto} onChange={e => setBusquedaProducto(e.target.value)}
                  placeholder="Buscar producto por nombre, código, marca o modelo…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              {puedeCrearProducto && (
                <button
                  type="button" onClick={abrirNuevoProducto}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
                  title="Crear un producto nuevo sin salir de esta pantalla"
                >
                  <Ic id="plus" size={13} /> Nuevo producto
                </button>
              )}
            </div>

            {hayFiltroProveedor && (
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 cursor-pointer select-none w-fit">
                <input
                  type="checkbox" checked={verTodosProveedor}
                  onChange={e => setVerTodosProveedor(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-yellow-400"
                />
                Ver todos los productos (no solo los de este proveedor)
              </label>
            )}

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

            {productosVisibles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2.5 text-zinc-400">
                <Ic id="package" size={32} className="text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm font-medium">Sin productos para este filtro</p>
                {puedeCrearProducto && (
                  <button
                    type="button" onClick={abrirNuevoProducto}
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-900 text-xs font-semibold transition-colors"
                  >
                    <Ic id="plus" size={13} /> Crear producto nuevo
                  </button>
                )}
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
          </div>
        </div>

        {/* ── Columna panel de orden ── */}
        <div className="lg:sticky lg:top-4 space-y-3">
          <SectionCard
            title="Pre-pedido"
            actions={items.length > 0 && (
              <button onClick={limpiarItems} className="text-[11px] px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Limpiar
              </button>
            )}
          >
            <div className="p-3.5 space-y-2 max-h-[50vh] lg:max-h-[calc(100vh-26rem)] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-400">
                  <Ic id="cart" size={30} className="text-zinc-300 dark:text-zinc-700" />
                  <p className="text-xs text-center">Tocá un producto para agregarlo</p>
                </div>
              ) : (
                items.map((fila, i) => {
                  const prod = catalogo.productos.find(p => String(p.id_producto) === String(fila.id_producto));
                  return (
                    <CartLinea
                      key={fila._key}
                      fila={fila}
                      prod={prod}
                      impuestos={catalogo.impuestos}
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
                <span className="font-mono">Subt. Bs {fmtMonto(totales.subtotal)}</span>
              </div>

              {[
                { label: 'Descuento global', key: 'descuento' },
                { label: 'Impuesto',         key: 'impuesto' },
                { label: 'Flete',            key: 'flete' },
                { label: 'Otros costos',     key: 'otros_costos' },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
                  <input
                    type="number" min="0" step="0.01" value={datos[key]}
                    onChange={e => setD(key, e.target.value)}
                    className="w-24 px-2 py-0.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-yellow-400 font-mono"
                  />
                </div>
              ))}

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <span className="text-base font-bold text-zinc-900 dark:text-white">Total</span>
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white">Bs {fmtMonto(totales.total)}</span>
              </div>

              <button
                onClick={handleGuardar} disabled={guardando}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-bold text-sm transition-colors mt-1"
              >
                {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear pre-pedido'}
              </button>
              <button
                onClick={() => navigate('/compras')}
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
          <p className="text-lg font-bold font-mono text-zinc-900 dark:text-white leading-tight">Bs {fmtMonto(totales.total)}</p>
        </div>
        <button
          onClick={handleGuardar} disabled={guardando}
          className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors"
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar' : 'Crear pre-pedido'}
        </button>
      </div>

      {/* ── Modal: alta rápida de producto nuevo ── */}
      {npModal && (
        <Modal titulo="Nuevo producto" onClose={() => setNpModal(false)} maxW="max-w-2xl">
          <div className="space-y-4">
            {npError && (
              <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{npError}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Marca *</label>
                <select value={npForm.id_marca} onChange={e => setNp('id_marca', e.target.value)} className={inputCls}>
                  <option value="">Seleccionar marca</option>
                  {metaProductos?.marcas.map(m => <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Categoría *</label>
                <select value={npForm.id_categoria} onChange={e => setNp('id_categoria', e.target.value)} className={inputCls}>
                  <option value="">Seleccionar categoría</option>
                  {metaProductos?.categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Unidad de medida *</label>
                <select value={npForm.id_unidad} onChange={e => setNp('id_unidad', e.target.value)} className={inputCls}>
                  <option value="">Seleccionar unidad</option>
                  {metaProductos?.unidades.map(u => <option key={u.id_unidad} value={u.id_unidad}>{u.nombre} ({u.simbolo})</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Moneda de costo *</label>
                <select value={npForm.id_moneda_costo} onChange={e => setNp('id_moneda_costo', e.target.value)} className={inputCls}>
                  <option value="">Seleccionar moneda</option>
                  {catalogo.monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo ?? m.codigo})</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Proveedor default</label>
                <select value={npForm.id_proveedor_default} onChange={e => setNp('id_proveedor_default', e.target.value)} className={inputCls}>
                  <option value="">Sin proveedor</option>
                  {catalogo.proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.razon_social}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Nombre del producto *</label>
              <input value={npForm.producto} onChange={e => setNp('producto', e.target.value)}
                className={inputCls} placeholder="Ej: COCINA DE PISO" style={{ textTransform: 'uppercase' }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Detalle</label>
                <input value={npForm.detalle} onChange={e => setNp('detalle', e.target.value)}
                  className={inputCls} placeholder="Ej: 4H MESA VIDRIO E.E. GRILL ELEC." />
              </div>
              <div>
                <label className={labelCls}>Capacidad</label>
                <input value={npForm.capacidad} onChange={e => setNp('capacidad', e.target.value)}
                  className={inputCls} placeholder="Ej: 60 CM, 2 Lts" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Modelo</label>
                <input value={npForm.modelo} onChange={e => setNp('modelo', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Color</label>
                <input value={npForm.color} onChange={e => setNp('color', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Características</label>
                <input value={npForm.caracteristicas} onChange={e => setNp('caracteristicas', e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Precios y costos</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>Real (costo) *</label>
                  <input type="number" step="0.01" min="0" value={npForm.precio_real} onChange={e => setNp('precio_real', e.target.value)}
                    className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>Logística (LOG)</label>
                  <input type="number" step="0.01" min="0" value={npForm.costo_logistica} onChange={e => setNp('costo_logistica', e.target.value)}
                    className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>MCM</label>
                  <input type="number" step="0.01" min="0" value={npForm.costo_mcm} onChange={e => setNp('costo_mcm', e.target.value)}
                    className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>Precio público *</label>
                  <input type="number" step="0.01" min="0" value={npForm.precio_publico} onChange={e => setNp('precio_publico', e.target.value)}
                    className={inputCls} placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className={labelCls}>Precio mayorista</label>
                  <input type="number" step="0.01" min="0" value={npForm.precio_mayor} onChange={e => setNp('precio_mayor', e.target.value)}
                    className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>Bono vendedor</label>
                  <input type="number" step="0.01" min="0" value={npForm.bono} onChange={e => setNp('bono', e.target.value)}
                    className={inputCls} placeholder="0.00" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={labelCls}>Stock mínimo</label>
                    <input type="number" step="0.01" min="0" value={npForm.stock_minimo} onChange={e => setNp('stock_minimo', e.target.value)} className={inputCls} />
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>Stock máximo</label>
                    <input type="number" step="0.01" min="0" value={npForm.stock_maximo} onChange={e => setNp('stock_maximo', e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Notas</label>
              <textarea value={npForm.notas} onChange={e => setNp('notas', e.target.value)} rows={2}
                className={inputCls + ' resize-none'} placeholder="Opcional" />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setNpModal(false)}
                className="px-4 py-2 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={guardarNuevoProducto} disabled={npGuardando}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-yellow-400 hover:bg-yellow-500 text-zinc-900 disabled:opacity-50 transition-colors">
                {npGuardando ? 'Creando…' : 'Crear y agregar al pedido'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
