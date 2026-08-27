import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ventasService } from '../../services/ventas.service';
import { cajaService } from '../../services/caja.service';
import { clientesService } from '../../services/clientes.service';
import api from '../../api/axios';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../contexts/AuthContext';
import EscanerQR from '../../components/EscanerQR';

const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const RC_FORM_VACIO = { nombre: '', telefono: '', direccion: '', ciudad: '', habilitarCredito: false, limite_credito: '', dias_credito: '' };

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const buildImgUrl = (url) =>
  !url ? null : url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`;

// Resuelve el precio según tipo de venta con fallback: mayor→publico→real | publico→real
function resolverPrecio(prod, tipoVenta) {
  if (!prod) return 0;
  if (tipoVenta === 'MAYOR') {
    return Number(prod.precio_mayor) || Number(prod.precio_publico) || Number(prod.precio_real) || 0;
  }
  return Number(prod.precio_publico) || Number(prod.precio_real) || 0;
}

// Devuelve el % de descuento de la primera promo vigente que aplica al producto
function resolverPromo(prod, promociones) {
  if (!prod || !promociones?.length) return 0;
  for (const promo of promociones) {
    const aplics = Array.isArray(promo.aplicaciones)
      ? promo.aplicaciones
      : (promo.aplicaciones ? JSON.parse(promo.aplicaciones) : []);
    const aplica = (
      promo.aplica_a === 'TODOS' ||
      (promo.aplica_a === 'PRODUCTO'  && aplics.some(a => String(a.id_producto)  === String(prod.id_producto))) ||
      (promo.aplica_a === 'CATEGORIA' && aplics.some(a => String(a.id_categoria) === String(prod.id_categoria))) ||
      (promo.aplica_a === 'MARCA'     && aplics.some(a => String(a.id_marca)     === String(prod.id_marca)))
    );
    if (aplica && promo.tipo_descuento === 'PORCENTAJE') {
      return Number(promo.valor_descuento);
    }
  }
  return 0;
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
    chevron: <polyline points="6 9 12 15 18 9" />,
    search:  <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    camera:  <><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}
      fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {paths[id]}
    </svg>
  );
}

/* ─── Tile de combo (grilla estilo POS) ──────────────────────────────────── */
function ComboTile({ combo, enCarrito, onClick }) {
  const [errImg, setErrImg] = useState(false);
  const img = buildImgUrl(combo.imagen_url);

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
      <span className="absolute top-1.5 left-1.5 z-10 text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full font-bold">
        COMBO
      </span>
      <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
        {img && !errImg ? (
          <img src={img} alt={combo.nombre} className="w-full h-full object-cover" onError={() => setErrImg(true)} />
        ) : (
          <Ic id="package" size={28} className="text-zinc-300 dark:text-zinc-600" />
        )}
      </div>
      <div className="px-2.5 py-2 space-y-0.5">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight line-clamp-2 min-h-[2.2em]">
          {combo.nombre}
        </p>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight line-clamp-1">
          {combo.detalle.length} producto{combo.detalle.length !== 1 ? 's' : ''} incluido{combo.detalle.length !== 1 ? 's' : ''}
        </p>
        <p className="font-mono font-bold text-sm text-zinc-900 dark:text-white">Bs {fmtMonto(combo.precio_combo)}</p>
      </div>
    </button>
  );
}

/* ─── Tile de producto (grilla estilo POS) ───────────────────────────────── */
function ProductoTile({ prod, disponible, promoPorc, enCarrito, onClick }) {
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
      {promoPorc > 0 && (
        <span className="absolute top-1.5 left-1.5 z-10 text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold">
          −{promoPorc}%
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
        {prod.producto_detalle && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight line-clamp-1">{prod.producto_detalle}</p>
        )}
        {(prod.marca || prod.modelo || prod.color || prod.capacidad) && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight line-clamp-1">
            {[prod.marca, prod.modelo, prod.color, prod.capacidad].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="flex items-center justify-between gap-1">
          <p className="font-mono font-bold text-sm text-zinc-900 dark:text-white">Bs {fmtMonto(resolverPrecio(prod, prod.__tipoVenta))}</p>
          {disponible !== null && disponible <= 5 && (
            <span className="text-[9px] text-amber-500 font-semibold shrink-0">{disponible} u.</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Línea del carrito — combo (panel de orden) ─────────────────────────── */
function CartLineaCombo({ fila, onQtyDelta, onRemove }) {
  const subtotal = Number(fila.combo.precio_combo) * Number(fila.cantidad ?? 0);
  return (
    <div className="border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-900/10 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">COMBO</span>
            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{fila.combo.nombre}</p>
          </div>
          <p className="text-xs text-zinc-400 font-mono">Bs {fmtMonto(fila.combo.precio_combo)} c/u</p>
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
          {fmtMonto(subtotal)}
        </p>

        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
        >
          <Ic id="trash" size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─── Línea del carrito (panel de orden) ─────────────────────────────────── */
function CartLinea({ fila, prod, disponible, impuestos, tipoVenta, expandido, onToggleExpand, onQtyDelta, onChange, onRemove }) {
  const precioBase   = resolverPrecio(prod, tipoVenta);
  const sobreprecio  = Math.max(0, Number(fila.precio_unitario) - precioBase);
  const base         = Number(fila.cantidad ?? 0) * Number(fila.precio_unitario ?? 0);
  const desc         = base * (Number(fila.descuento_porc ?? 0) / 100);
  const imp          = (base - desc) * (Number(fila.impuesto_porc ?? 0) / 100);
  const subtotal     = +(base - desc + imp).toFixed(2);

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
          <p className="text-xs text-zinc-400 font-mono">Bs {fmtMonto(fila.precio_unitario)} c/u</p>
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
            disabled={disponible !== null && Number(fila.cantidad) >= disponible}
            className="w-6 h-6 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Ic id="plus" size={12} />
          </button>
        </div>

        <p className="w-20 text-right font-mono font-semibold text-sm text-zinc-900 dark:text-white shrink-0">
          {fmtMonto(subtotal)}
        </p>

        <button
          onClick={onToggleExpand}
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${expandido ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
          title="Descuento, impuesto, N° de serie"
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
        <div className="px-3 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Precio unit.</label>
            <input
              type="number" min={0} step="0.01" value={fila.precio_unitario}
              onChange={e => onChange({ precio_unitario: e.target.value })}
              className={`w-full px-2 py-1.5 text-xs rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 text-right font-mono ${
                sobreprecio > 0 ? 'border-amber-400 focus:ring-amber-400' : 'border-zinc-200 dark:border-zinc-700 focus:ring-yellow-400'
              }`}
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
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">N° de serie</label>
            <input
              type="text" value={fila.numero_serie ?? ''} placeholder="Opcional"
              onChange={e => onChange({ numero_serie: e.target.value })}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 font-mono"
            />
          </div>
        </div>
      )}
    </div>
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

// Label estándar
function FieldLabel({ children }) {
  return (
    <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wide">
      {children}
    </label>
  );
}

export default function VentaForm() {
  const navigate     = useNavigate();
  const { id }       = useParams();
  const esEdicion    = Boolean(id);
  const { puede }    = usePermission();
  const { usuario }  = useAuth();

  const puedeCrearMenor = puede('crear_menor', 'ventas');
  const puedeCrearMayor = puede('crear_mayor', 'ventas');
  const tiposPermitidos = [
    puedeCrearMenor && 'MENOR',
    puedeCrearMayor && 'MAYOR',
  ].filter(Boolean);

  const [sucursales,  setSucursales]  = useState([]);
  const [depositos,   setDepositos]   = useState([]);
  const [clientes,    setClientes]    = useState([]);
  const [productos,   setProductos]   = useState([]);
  const [monedas,     setMonedas]     = useState([]);
  const [stockMap,    setStockMap]    = useState({});
  const [promociones, setPromociones] = useState([]);
  const [combos,      setCombos]      = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [impuestos,   setImpuestos]   = useState([]);
  const [vendedores,  setVendedores]  = useState([]);

  const [form, setForm] = useState({
    tipo_venta: 'MENOR', id_sucursal: '', id_deposito: '', id_cliente: '',
    id_moneda: '', tipo_cambio: 1, condicion_pago: 'CONTADO', dias_credito: 0, num_cuotas: 1,
    descuento_porc: 0, impuesto: 0, requiere_entrega: false,
    direccion_entrega: '', fecha_entrega: '', observaciones: '',
    id_vendedor: '',
  });
  const [items, setItems] = useState([]);
  const [comboItems, setComboItems] = useState([]);
  const [vistaCatalogo, setVistaCatalogo] = useState('productos'); // 'productos' | 'combos'
  const [expandidos, setExpandidos] = useState(() => new Set());
  const [clienteInfo, setClienteInfo] = useState(null);
  const [guardando,    setGuardando]    = useState(false);
  const [cargando,     setCargando]     = useState(esEdicion);
  const [error,        setError]        = useState('');
  const [arqueoActual, setArqueoActual] = useState(undefined);

  const [qrInput,       setQrInput]       = useState('');
  const [qrError,       setQrError]       = useState('');
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const qrTimerRef = useRef(null);

  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [categoriaSel, setCategoriaSel] = useState('');
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

  useEffect(() => {
    if (!esEdicion) {
      cajaService.getArqueoActual()
        .then(r => setArqueoActual(r.data.arqueo ?? null))
        .catch(() => setArqueoActual(null));
    }

    ventasService.formData().then(r => {
      const { sucursales: suc, depositos: deps, productos: prods,
              monedas: mons, impuestos: imps, categorias: cats,
              promociones: promos, combos: combs, clientes: clis,
              vendedores: vends } = r.data;

      setSucursales(suc ?? []);
      setDepositos(deps ?? []);
      setProductos(prods ?? []);
      setClientes(clis ?? []);
      setMonedas(mons ?? []);
      setImpuestos(imps ?? []);
      setCategorias(cats ?? []);
      setPromociones(promos ?? []);
      setCombos(combs ?? []);
      setVendedores(vends ?? []);

      if (!esEdicion) {
        const idSuc = usuario?.id_sucursal_default ?? usuario?.id_sucursal;
        const sucursal = idSuc ? (suc ?? []).find(s => String(s.id_sucursal) === String(idSuc)) : null;
        const sucId = sucursal ? String(sucursal.id_sucursal) : (suc?.length === 1 ? String(suc[0].id_sucursal) : '');

        const depsSuc = (deps ?? []).filter(d => String(d.id_sucursal) === sucId);
        const depId = depsSuc.length === 1 ? String(depsSuc[0].id_deposito) : '';

        const base = (mons ?? []).find(m => m.es_moneda_base);

        const tipoVentaDefault = puedeCrearMenor ? 'MENOR' : puedeCrearMayor ? 'MAYOR' : 'MENOR';

        const usuarioEnVendedores = (vends ?? []).some(v => String(v.id_usuario) === String(usuario?.id_usuario));
        const vendedorDefault = usuarioEnVendedores
          ? String(usuario.id_usuario)
          : ((vends ?? []).length === 1 ? String(vends[0].id_usuario) : '');

        setForm(p => ({
          ...p,
          tipo_venta: tipoVentaDefault,
          id_sucursal: sucId,
          id_deposito: depId,
          id_moneda: base ? String(base.id_moneda) : '',
          id_vendedor: vendedorDefault,
        }));
      }
    }).catch(() => {});

    if (esEdicion) {
      ventasService.getOne(id)
        .then(r => {
          const v = r.data;
          setForm({
            tipo_venta: v.tipo_venta, id_sucursal: String(v.id_sucursal),
            id_deposito: String(v.id_deposito), id_cliente: String(v.id_cliente),
            id_moneda: String(v.id_moneda), tipo_cambio: v.tipo_cambio,
            condicion_pago: v.condicion_pago, dias_credito: v.dias_credito, num_cuotas: v.num_cuotas ?? 1,
            descuento_porc: v.descuento_porc ?? 0, impuesto: v.impuesto ?? 0,
            requiere_entrega: Boolean(v.requiere_entrega),
            direccion_entrega: v.direccion_entrega ?? '',
            fecha_entrega: v.fecha_entrega ? v.fecha_entrega.slice(0, 10) : '',
            observaciones: v.observaciones ?? '',
            id_vendedor: v.id_vendedor ? String(v.id_vendedor) : '',
          });
          setItems((v.detalle ?? []).map(d => ({
            _key:          crypto.randomUUID(),
            id_producto:   String(d.id_producto),
            cantidad:      d.cantidad,
            precio_unitario: d.precio_unitario,
            descuento_porc: d.descuento_porc ?? 0,
            id_impuesto:   d.id_impuesto ? String(d.id_impuesto) : '',
            impuesto_porc: d.impuesto_porc ?? 0,
            numero_serie:  d.numero_serie ?? '',
          })));
        })
        .catch(() => navigate('/ventas'))
        .finally(() => setCargando(false));
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (esEdicion || !form.id_sucursal) return;
    const depsSuc = depositos.filter(d => String(d.id_sucursal) === String(form.id_sucursal));
    const depActualOk = depsSuc.some(d => String(d.id_deposito) === String(form.id_deposito));
    if (!depActualOk) {
      setF('id_deposito', depsSuc.length === 1 ? String(depsSuc[0].id_deposito) : '');
    }
  }, [form.id_sucursal]); // eslint-disable-line

  useEffect(() => {
    if (!form.id_deposito) { setStockMap({}); return; }
    ventasService.stockDeposito(form.id_deposito).then(r => {
      setStockMap(r.data.stockMap ?? {});
    }).catch(() => {});
  }, [form.id_deposito]);

  useEffect(() => {
    setItems(prev => prev.map(it => {
      if (!it.id_producto) return it;
      const prod = productos.find(p => String(p.id_producto) === String(it.id_producto));
      if (!prod) return it;
      return {
        ...it,
        precio_unitario: resolverPrecio(prod, form.tipo_venta),
      };
    }));
  }, [form.tipo_venta]); // eslint-disable-line

  useEffect(() => {
    if (!form.id_cliente) { setClienteInfo(null); return; }
    const cli = clientes.find(c => String(c.id_cliente) === String(form.id_cliente));
    setClienteInfo(cli ?? null);
    if (!esEdicion && cli?.descuento_default > 0) {
      setF('descuento_porc', cli.descuento_default);
    }
  }, [form.id_cliente, clientes]); // eslint-disable-line

  useEffect(() => {
    if (!form.id_moneda || monedas.length === 0) return;
    const selected = monedas.find(m => String(m.id_moneda) === String(form.id_moneda));
    if (!selected) return;
    if (selected.es_moneda_base) {
      setF('tipo_cambio', 1);
    } else {
      api.get('/tipos-cambio/hoy')
        .then(r => {
          const rates = r.data.tipos_cambio ?? r.data ?? [];
          const rate  = rates.find(tc => String(tc.id_moneda_origen) === String(selected.id_moneda));
          setF('tipo_cambio', rate ? Number(rate.tasa_venta) : 6.96);
        })
        .catch(() => setF('tipo_cambio', 6.96));
    }
  }, [form.id_moneda, monedas]);

  // ── Carrito ────────────────────────────────────────────────────────────────
  const agregarAlCarrito = useCallback((prod) => {
    if (!prod) return;
    const disponible = stockMap[prod.id_producto] ?? null;
    setItems(prev => {
      const idx = prev.findIndex(it => String(it.id_producto) === String(prod.id_producto));
      if (idx >= 0) {
        if (disponible !== null && Number(prev[idx].cantidad) >= disponible) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      const precio = resolverPrecio(prod, form.tipo_venta);
      const descPromo = resolverPromo(prod, promociones);
      const impDef = prod.id_impuesto_default
        ? impuestos.find(i => String(i.id_impuesto) === String(prod.id_impuesto_default))
        : impuestos.find(i => i.es_default);
      return [...prev, {
        _key:            crypto.randomUUID(),
        id_producto:     String(prod.id_producto),
        cantidad:        1,
        precio_unitario: precio,
        descuento_porc:  descPromo,
        id_impuesto:     impDef ? String(impDef.id_impuesto) : '',
        impuesto_porc:   impDef ? Number(impDef.porcentaje) : 0,
        numero_serie:    '',
      }];
    });
  }, [stockMap, form.tipo_venta, promociones, impuestos]);

  const procesarCodigo = useCallback((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const match  = trimmed.match(/\/p\/([^/?#\s]+)$/);
    const codigo = match ? decodeURIComponent(match[1]) : trimmed;

    const prod = productos.find(p => p.codigo_interno === codigo || p.codigo_barras === codigo);
    if (!prod) {
      setQrError(`No encontrado: ${codigo}`);
      setTimeout(() => setQrError(''), 3000);
      setQrInput('');
      return;
    }

    agregarAlCarrito(prod);
    setQrInput('');
    setQrError('');
  }, [productos, agregarAlCarrito]);

  const handleQrScan = (val) => {
    clearTimeout(qrTimerRef.current);
    qrTimerRef.current = setTimeout(() => procesarCodigo(val), 300);
  };

  const cambiarCantidad = (i, delta) => {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== i) return it;
      const disponible = stockMap[it.id_producto] ?? null;
      let nueva = Number(it.cantidad) + delta;
      if (disponible !== null) nueva = Math.min(nueva, disponible);
      nueva = Math.max(1, nueva);
      return { ...it, cantidad: nueva };
    }));
  };
  const removeItem = i => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, patch) => setItems(p => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const limpiarItems = () => { setItems([]); setComboItems([]); };

  // ── Combos ────────────────────────────────────────────────────────────────
  const agregarComboAlCarrito = useCallback((combo) => {
    setComboItems(prev => {
      const idx = prev.findIndex(it => String(it.id_combo) === String(combo.id_combo));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      return [...prev, { _key: crypto.randomUUID(), id_combo: combo.id_combo, combo, cantidad: 1 }];
    });
  }, []);

  const cambiarCantidadCombo = (i, delta) => {
    setComboItems(prev => prev.map((it, idx) => idx === i ? { ...it, cantidad: Math.max(1, Number(it.cantidad) + delta) } : it));
  };
  const removeComboItem = i => setComboItems(p => p.filter((_, idx) => idx !== i));

  const toggleExpandido = (key) => setExpandidos(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const subtotalProductos = items.reduce((s, it) => {
    const base = Number(it.cantidad ?? 0) * Number(it.precio_unitario ?? 0);
    const desc = base * (Number(it.descuento_porc ?? 0) / 100);
    const imp  = (base - desc) * (Number(it.impuesto_porc ?? 0) / 100);
    return s + (base - desc + imp);
  }, 0);
  const subtotalCombos = comboItems.reduce((s, it) => s + Number(it.combo.precio_combo) * Number(it.cantidad ?? 0), 0);
  const subtotal  = subtotalProductos + subtotalCombos;
  const descMonto = subtotal * (Number(form.descuento_porc) / 100);
  const impuesto  = Number(form.impuesto);
  const total     = subtotal - descMonto + impuesto;
  const totalUnidades = items.reduce((s, it) => s + Number(it.cantidad ?? 0), 0)
    + comboItems.reduce((s, it) => s + Number(it.cantidad ?? 0), 0);

  const guardar = async () => {
    setError('');
    if (!form.id_sucursal || !form.id_deposito || !form.id_cliente) {
      return setError('Sucursal, depósito y cliente son obligatorios');
    }
    const itemsValidos = items.filter(it => it.id_producto && Number(it.cantidad) > 0);
    const comboItemsValidos = comboItems
      .filter(it => it.id_combo && Number(it.cantidad) > 0)
      .map(it => ({ id_combo: it.id_combo, cantidad: it.cantidad }));
    if (!itemsValidos.length && !comboItemsValidos.length) return setError('Agregá al menos un producto o combo con cantidad válida');

    setGuardando(true);
    try {
      const payload = { ...form, items: [...itemsValidos, ...comboItemsValidos] };
      let ventaId = id;
      if (esEdicion) {
        await ventasService.update(id, payload);
      } else {
        const res = await ventasService.create(payload);
        ventaId = res.data.id_venta;
      }
      const tieneSeries = itemsValidos.some(it => it.numero_serie?.trim());
      navigate(`/ventas/${ventaId}${tieneSeries ? '?series=1' : ''}`);
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al guardar la venta');
    } finally {
      setGuardando(false);
    }
  };

  const setRc = (k, v) => setRcForm(p => ({ ...p, [k]: v }));

  const guardarClienteRapido = useCallback(async () => {
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
  }, [rcForm, busquedaCliente]);

  const inputCls   = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-shadow';
  const compactCls = 'w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400';
  const monedaSel  = monedas.find(m => String(m.id_moneda) === String(form.id_moneda));

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

  const productosConStockBase = productos.filter(p => (stockMap[p.id_producto] ?? 0) >= 1);

  const marcasDisponibles = [...new Set(productosConStockBase.map(p => p.marca).filter(Boolean))].sort();
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

  const productosVisibles = productosConStockBase
    .filter(p => !filtroMarca     || p.marca     === filtroMarca)
    .filter(p => !filtroProducto  || p.producto  === filtroProducto)
    .filter(p => !filtroModelo    || p.modelo    === filtroModelo)
    .filter(p => !filtroColor     || p.color     === filtroColor)
    .filter(p => !filtroCapacidad || p.capacidad === filtroCapacidad)
    .filter(p => {
      if (busquedaProducto.trim()) {
        const q = busquedaProducto.toLowerCase();
        return p.producto.toLowerCase().includes(q) ||
          p.codigo_interno.toLowerCase().includes(q) ||
          (p.codigo_barras || '').includes(busquedaProducto) ||
          p.marca?.toLowerCase().includes(q) ||
          p.modelo?.toLowerCase().includes(q);
      }
      return !categoriaSel || String(p.id_categoria) === String(categoriaSel);
    });

  const combosVisibles = combos.filter(c =>
    !busquedaProducto.trim() || c.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  const cantidadesCombosEnCarrito = comboItems.reduce((acc, it) => {
    acc[it.id_combo] = (acc[it.id_combo] ?? 0) + Number(it.cantidad ?? 0);
    return acc;
  }, {});

  const cantidadesEnCarrito = items.reduce((acc, it) => {
    acc[it.id_producto] = (acc[it.id_producto] ?? 0) + Number(it.cantidad ?? 0);
    return acc;
  }, {});

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
            onClick={() => navigate(esEdicion ? `/ventas/${id}` : '/ventas')}
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mb-1.5 transition-colors"
          >
            ← Ventas
          </button>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {esEdicion ? 'Editar venta' : 'Nueva venta'}
          </h1>
        </div>
      </div>

      {/* Banner sin caja */}
      {!esEdicion && arqueoActual === null && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
          <span className="text-orange-500 text-lg flex-shrink-0">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">No hay caja abierta</p>
            <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">Podés guardar el borrador, pero no podrás emitir la venta hasta abrir una caja desde el módulo <strong>Caja</strong>.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
          <span className="mt-0.5 flex-shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Franja compacta: datos de la venta ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end">
          <div>
            <FieldLabel>Tipo</FieldLabel>
            {tiposPermitidos.length > 1 ? (
              <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg gap-0.5">
                {tiposPermitidos.map(t => (
                  <button
                    key={t} onClick={() => setF('tipo_venta', t)} disabled={esEdicion}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      form.tipo_venta === t ? 'bg-yellow-400 text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'
                    } disabled:opacity-60`}
                  >
                    {t === 'MENOR' ? 'Menor' : 'Mayor'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                {form.tipo_venta === 'MENOR' ? 'Menor' : 'Mayor'}
              </div>
            )}
          </div>

          <div>
            <FieldLabel>Sucursal *</FieldLabel>
            <select value={form.id_sucursal} onChange={e => setF('id_sucursal', e.target.value)} disabled={esEdicion || sucursales.length <= 1} className={compactCls}>
              <option value="">—</option>
              {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
            </select>
          </div>

          <div>
            <FieldLabel>Depósito *</FieldLabel>
            <select value={form.id_deposito} onChange={e => setF('id_deposito', e.target.value)} disabled={esEdicion} className={compactCls}>
              <option value="">—</option>
              {depositos.filter(d => !form.id_sucursal || String(d.id_sucursal) === String(form.id_sucursal)).map(d => (
                <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Vendedor *</FieldLabel>
            <select value={form.id_vendedor} onChange={e => setF('id_vendedor', e.target.value)} className={compactCls}>
              <option value="">—</option>
              {vendedores.map(v => <option key={v.id_usuario} value={v.id_usuario}>{v.nombre_completo}</option>)}
            </select>
          </div>

          <div>
            <FieldLabel>Condición</FieldLabel>
            <select value={form.condicion_pago} onChange={e => setF('condicion_pago', e.target.value)} className={compactCls}>
              <option value="CONTADO">Contado</option>
              {puede('vender_credito', 'ventas') && <option value="CREDITO">Crédito</option>}
            </select>
          </div>

          <div>
            <FieldLabel>&nbsp;</FieldLabel>
            <button
              type="button" onClick={() => setMostrarMasOpciones(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Ic id="tune" size={13} /> Más opciones
            </button>
          </div>
        </div>

        {form.condicion_pago === 'CREDITO' && (
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            <div className="w-40">
              <FieldLabel>Días de crédito</FieldLabel>
              <input type="number" min={0} value={form.dias_credito} onChange={e => setF('dias_credito', e.target.value)} className={compactCls} />
            </div>
            <div className="w-40">
              <FieldLabel>N° de cuotas</FieldLabel>
              <input type="number" min={1} value={form.num_cuotas} onChange={e => setF('num_cuotas', e.target.value)} className={compactCls} />
            </div>
          </div>
        )}

        <div className="border-t border-zinc-100 dark:border-zinc-800 mt-3 pt-3">
          <FieldLabel>Cliente *</FieldLabel>
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
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                    <span className={`text-xs ${clienteInfo.permite_credito ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'}`}>
                      {clienteInfo.permite_credito
                        ? `Crédito: Bs ${fmtMonto(clienteInfo.limite_credito)} · Saldo: Bs ${fmtMonto(clienteInfo.saldo_actual)}`
                        : 'Sin crédito habilitado'}
                    </span>
                    {clienteInfo.descuento_default > 0 && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">
                        Dto. {clienteInfo.descuento_default}% aplicado
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button" onClick={() => setBusquedaCliente('')}
                className="text-xs text-green-600 dark:text-green-400 hover:underline shrink-0"
              >
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
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  <span className={`text-xs ${clienteInfo.permite_credito ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'}`}>
                    {clienteInfo.permite_credito
                      ? `Crédito: Bs ${fmtMonto(clienteInfo.limite_credito)} · Saldo: Bs ${fmtMonto(clienteInfo.saldo_actual)}`
                      : 'Sin crédito habilitado'}
                  </span>
                  {clienteInfo.descuento_default > 0 && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">
                      Dto. {clienteInfo.descuento_default}% aplicado
                    </span>
                  )}
                </div>
              )}
            </>
          ) : busquedaCliente.trim() ? (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2.5">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No se encontró a "{busquedaCliente.trim()}" — completá los datos para crearlo.
              </p>

              <div>
                <FieldLabel>Nombre / Razón social *</FieldLabel>
                <input
                  type="text" value={rcForm.nombre} onChange={e => setRc('nombre', e.target.value)}
                  placeholder="Ej: Juan Pérez" className={inputCls}
                />
              </div>

              <div>
                <FieldLabel>Teléfono</FieldLabel>
                <input type="text" value={rcForm.telefono}
                  onChange={e => setRc('telefono', e.target.value)}
                  placeholder="Opcional" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <FieldLabel>Dirección</FieldLabel>
                  <input type="text" value={rcForm.direccion}
                    onChange={e => setRc('direccion', e.target.value)}
                    placeholder="Opcional" className={inputCls} />
                </div>
                <div>
                  <FieldLabel>Ciudad</FieldLabel>
                  <input type="text" value={rcForm.ciudad}
                    onChange={e => setRc('ciudad', e.target.value)}
                    placeholder="Opcional" className={inputCls} />
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
                        <FieldLabel>Límite de crédito *</FieldLabel>
                        <input type="number" min={0} step="0.01" value={rcForm.limite_credito}
                          onChange={e => setRc('limite_credito', e.target.value)}
                          className={inputCls} />
                      </div>
                      <div>
                        <FieldLabel>Días de crédito</FieldLabel>
                        <input type="number" min={0} value={rcForm.dias_credito}
                          onChange={e => setRc('dias_credito', e.target.value)}
                          placeholder="0" className={inputCls} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {rcError && (
                <p className="text-xs text-red-500 flex items-center gap-1.5">
                  <span>⚠</span> {rcError}
                </p>
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

          {/* Escáner QR */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold text-zinc-400 flex-shrink-0 tracking-widest select-none uppercase">QR</span>
            <input
              type="text" value={qrInput}
              onChange={e => { setQrInput(e.target.value); handleQrScan(e.target.value); }}
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
              placeholder="Escanee un código o escriba manualmente…"
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
            />
            {qrError && <span className="text-xs text-red-500 flex-shrink-0">{qrError}</span>}
            <button
              type="button" onClick={() => setMostrarEscaner(true)} title="Escanear con cámara"
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-yellow-400 hover:text-yellow-500 transition-colors"
            >
              <Ic id="camera" size={16} />
            </button>
          </div>

          {/* Tab Productos / Combos */}
          {combos.length > 0 && (
            <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl gap-0.5 w-fit">
              {[['productos', 'Productos'], ['combos', `Combos (${combos.length})`]].map(([val, lbl]) => (
                <button
                  key={val} type="button"
                  onClick={() => setVistaCatalogo(val)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    vistaCatalogo === val ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}

          {vistaCatalogo === 'productos' ? (
            /* Categorías + buscador */
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 sidebar-scroll">
                <button
                  onClick={() => setCategoriaSel('')}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    categoriaSel === '' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  Todos
                </button>
                {categorias.map(c => (
                  <button
                    key={c.id_categoria}
                    onClick={() => setCategoriaSel(String(c.id_categoria))}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                      categoriaSel === String(c.id_categoria) ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Ic id="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text" value={busquedaProducto} onChange={e => setBusquedaProducto(e.target.value)}
                  placeholder="Buscar producto por nombre, código, marca o modelo…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <select
                  value={filtroMarca}
                  onChange={e => cambiarFiltroMarca(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">Todas las marcas</option>
                  {marcasDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={filtroProducto}
                  onChange={e => cambiarFiltroProducto(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">Todos los productos</option>
                  {productosDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={filtroModelo}
                  onChange={e => cambiarFiltroModelo(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">Todos los modelos</option>
                  {modelosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={filtroColor}
                  onChange={e => cambiarFiltroColor(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">Todos los colores</option>
                  {coloresDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={filtroCapacidad}
                  onChange={e => setFiltroCapacidad(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">Todas las capacidades</option>
                  {capacidadesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Grilla de productos */}
              {productosVisibles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
                  <Ic id="package" size={32} className="text-zinc-300 dark:text-zinc-700" />
                  <p className="text-sm font-medium">Sin productos con stock para este filtro</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {productosVisibles.map(p => (
                    <ProductoTile
                      key={p.id_producto}
                      prod={{ ...p, __tipoVenta: form.tipo_venta }}
                      disponible={stockMap[p.id_producto] ?? null}
                      promoPorc={resolverPromo(p, promociones)}
                      enCarrito={cantidadesEnCarrito[p.id_producto] ?? 0}
                      onClick={() => agregarAlCarrito(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Buscador + grilla de combos */
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-3">
              <div className="relative">
                <Ic id="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text" value={busquedaProducto} onChange={e => setBusquedaProducto(e.target.value)}
                  placeholder="Buscar combo por nombre…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {combosVisibles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
                  <Ic id="package" size={32} className="text-zinc-300 dark:text-zinc-700" />
                  <p className="text-sm font-medium">Sin combos vigentes para este filtro</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {combosVisibles.map(c => (
                    <ComboTile
                      key={c.id_combo}
                      combo={c}
                      enCarrito={cantidadesCombosEnCarrito[c.id_combo] ?? 0}
                      onClick={() => agregarComboAlCarrito(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Columna panel de orden ── */}
        <div className="lg:sticky lg:top-4 space-y-3">
          <SectionCard
            title="Orden"
            actions={(items.length > 0 || comboItems.length > 0) && (
              <button onClick={limpiarItems} className="text-[11px] px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Limpiar
              </button>
            )}
          >
            <div className="p-3.5 space-y-2 max-h-[50vh] lg:max-h-[calc(100vh-22rem)] overflow-y-auto">
              {items.length === 0 && comboItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-400">
                  <Ic id="cart" size={30} className="text-zinc-300 dark:text-zinc-700" />
                  <p className="text-xs text-center">Tocá un producto o combo para agregarlo</p>
                </div>
              ) : (
                <>
                  {comboItems.map((fila, i) => (
                    <CartLineaCombo
                      key={fila._key}
                      fila={fila}
                      onQtyDelta={d => cambiarCantidadCombo(i, d)}
                      onRemove={() => removeComboItem(i)}
                    />
                  ))}
                  {items.map((fila, i) => {
                    const prod = productos.find(p => String(p.id_producto) === String(fila.id_producto));
                    return (
                      <CartLinea
                        key={fila._key}
                        fila={fila}
                        prod={prod}
                        disponible={stockMap[fila.id_producto] ?? null}
                        impuestos={impuestos}
                        tipoVenta={form.tipo_venta}
                        expandido={expandidos.has(fila._key)}
                        onToggleExpand={() => toggleExpandido(fila._key)}
                        onQtyDelta={d => cambiarCantidad(i, d)}
                        onChange={patch => updateItem(i, patch)}
                        onRemove={() => removeItem(i)}
                      />
                    );
                  })}
                </>
              )}
            </div>

            {/* Totales */}
            <div className="px-3.5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>{totalUnidades} unidad{totalUnidades !== 1 ? 'es' : ''}</span>
                <span className="font-mono">Subt. Bs {fmtMonto(subtotal)}</span>
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
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white">Bs {fmtMonto(total)}</span>
              </div>

              <button
                onClick={guardar} disabled={guardando}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-bold text-sm transition-colors mt-1"
              >
                {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear venta'}
              </button>
              <button
                onClick={() => navigate(esEdicion ? `/ventas/${id}` : '/ventas')}
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
          <p className="text-lg font-bold font-mono text-zinc-900 dark:text-white leading-tight">Bs {fmtMonto(total)}</p>
        </div>
        <button
          onClick={guardar} disabled={guardando}
          className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors"
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar' : 'Crear venta'}
        </button>
      </div>

      {/* ── Escáner de cámara ── */}
      {mostrarEscaner && (
        <EscanerQR
          onScan={(val) => { setMostrarEscaner(false); procesarCodigo(val); }}
          onClose={() => setMostrarEscaner(false)}
        />
      )}

      {/* ── Modal más opciones ── */}
      {mostrarMasOpciones && (
        <Modal titulo="Más opciones" onClose={() => setMostrarMasOpciones(false)}>
          <div className="space-y-4">
            <div>
              <FieldLabel>Moneda</FieldLabel>
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

            <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit group">
              <input
                type="checkbox" checked={form.requiere_entrega}
                onChange={e => setF('requiere_entrega', e.target.checked)}
                className="w-4 h-4 rounded accent-yellow-400"
              />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                Requiere entrega a domicilio
              </span>
            </label>

            {form.requiere_entrega && (
              <div className="grid grid-cols-1 gap-3 pl-6 border-l-2 border-yellow-400/30 ml-1.5">
                <div>
                  <FieldLabel>Dirección de entrega</FieldLabel>
                  <input type="text" value={form.direccion_entrega} onChange={e => setF('direccion_entrega', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <FieldLabel>Fecha de entrega</FieldLabel>
                  <input type="datetime-local" value={form.fecha_entrega} onChange={e => setF('fecha_entrega', e.target.value)} className={inputCls} />
                </div>
              </div>
            )}

            <div>
              <FieldLabel>Observaciones</FieldLabel>
              <textarea
                value={form.observaciones} onChange={e => setF('observaciones', e.target.value)}
                rows={3} className={inputCls} placeholder="Notas adicionales…"
              />
            </div>

            <button
              onClick={() => setMostrarMasOpciones(false)}
              className="w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
            >
              Listo
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
