import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ventasService } from '../../services/ventas.service';
import { cajaService } from '../../services/caja.service';
import { clientesService } from '../../services/clientes.service';
import api from '../../api/axios';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../contexts/AuthContext';
import EscanerQR from '../../components/EscanerQR';

const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

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

function FilaItem({ fila, index, productos, stockMap, tipoVenta, promociones, impuestos, comisionPorc, onChange, onRemove }) {
  const [busqueda, setBusqueda] = useState('');

  const filtrados = productos.filter(p =>
    ((stockMap[p.id_producto] ?? 0) >= 1 || String(p.id_producto) === String(fila.id_producto)) &&
    (!busqueda ||
      p.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo_interno.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo_barras || '').includes(busqueda))
  );

  const prod = productos.find(p => String(p.id_producto) === String(fila.id_producto));
  const precioBase = resolverPrecio(prod, tipoVenta);
  const sobreprecio = fila.id_producto ? Math.max(0, Number(fila.precio_unitario) - precioBase) : 0;
  const comisionMonto = +(sobreprecio * (comisionPorc ?? 0) / 100).toFixed(2);

  const disponible = fila.id_producto ? (stockMap[fila.id_producto] ?? 0) : null;

  const base     = Number(fila.cantidad ?? 0) * Number(fila.precio_unitario ?? 0);
  const desc     = base * (Number(fila.descuento_porc ?? 0) / 100);
  const imp      = (base - desc) * (Number(fila.impuesto_porc ?? 0) / 100);
  const subtotal = +(base - desc + imp).toFixed(2);

  const promoPorc = prod ? resolverPromo(prod, promociones) : 0;

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800/80 align-top hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20 transition-colors">
      {/* Producto */}
      <td className="px-4 py-2.5 min-w-[220px]">
        <input
          type="text" placeholder="Filtrar…" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full mb-1 px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:bg-white dark:focus:bg-zinc-800"
        />
        <select
          value={fila.id_producto}
          onChange={e => {
            const id  = e.target.value;
            const p   = productos.find(x => String(x.id_producto) === id);
            const precio = resolverPrecio(p, tipoVenta);
            const descPromo = resolverPromo(p, promociones);
            const impDef = p?.id_impuesto_default
              ? impuestos.find(i => String(i.id_impuesto) === String(p.id_impuesto_default))
              : impuestos.find(i => i.es_default);
            onChange({
              id_producto: id, precio_unitario: precio, descuento_porc: descPromo,
              id_impuesto: impDef ? String(impDef.id_impuesto) : '',
              impuesto_porc: impDef ? Number(impDef.porcentaje) : 0,
            });
          }}
          className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
        >
          <option value="">— seleccionar —</option>
          {filtrados.slice(0, 50).map(p => (
            <option key={p.id_producto} value={p.id_producto}>
              [{p.codigo_interno}] {p.producto}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {disponible !== null && (
            <span className={`text-[10px] font-medium ${disponible <= 0 ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
              Stock: {fmtMonto(disponible)}
            </span>
          )}
          {promoPorc > 0 && fila.id_producto && (
            <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">
              Promo −{promoPorc}%
            </span>
          )}
        </div>
        {/* N° de serie */}
        {fila.id_producto && (
          <input
            type="text"
            placeholder="N° de serie (opcional)"
            value={fila.numero_serie ?? ''}
            onChange={e => onChange({ numero_serie: e.target.value })}
            className="mt-1.5 w-full px-2 py-1 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-yellow-400 font-mono"
          />
        )}
      </td>

      {/* Cantidad */}
      <td className="px-3 py-2.5 w-24">
        <input
          type="number" min={1} step="1" value={fila.cantidad}
          onChange={e => onChange({ cantidad: Math.max(1, parseInt(e.target.value) || 1) })}
          className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right font-mono"
        />
      </td>

      {/* Precio */}
      <td className="px-3 py-2.5 w-32">
        <input
          type="number" min={0} step="0.01" value={fila.precio_unitario}
          onChange={e => onChange({ precio_unitario: e.target.value })}
          className={`w-full px-2 py-1.5 text-xs rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 text-right font-mono ${
            sobreprecio > 0
              ? 'border-amber-400 focus:ring-amber-400'
              : 'border-zinc-200 dark:border-zinc-700 focus:ring-yellow-400'
          }`}
        />
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
            tipoVenta === 'MAYOR'
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
          }`}>
            {tipoVenta === 'MAYOR' ? 'MAYOR' : 'PVP'}
          </span>
          {precioBase > 0 && (
            <span className="text-[10px] text-zinc-400">Base: {fmtMonto(precioBase)}</span>
          )}
        </div>
      </td>

      {/* Descuento % */}
      <td className="px-3 py-2.5 w-20">
        <input
          type="number" min={0} max={100} step="0.01" value={fila.descuento_porc}
          onChange={e => onChange({ descuento_porc: e.target.value })}
          className={`w-full px-2 py-1.5 text-xs rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 text-right font-mono ${
            Number(fila.descuento_porc) > 0
              ? 'border-green-400 focus:ring-green-400 text-green-700 dark:text-green-400 font-semibold'
              : 'border-zinc-200 dark:border-zinc-700 focus:ring-yellow-400'
          }`}
        />
        {Number(fila.descuento_porc) > 0 && promoPorc > 0 && (
          <p className="text-[10px] text-green-600 dark:text-green-400 text-center mt-0.5">auto</p>
        )}
      </td>

      {/* Impuesto */}
      <td className="px-3 py-2.5 w-36">
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
            <option key={i.id_impuesto} value={i.id_impuesto}>
              {i.codigo} ({Number(i.porcentaje).toFixed(0)}%)
            </option>
          ))}
        </select>
      </td>

      {/* Subtotal */}
      <td className="px-3 py-2.5 w-32 text-right font-mono text-sm font-semibold text-zinc-900 dark:text-white align-middle">
        Bs {fmtMonto(subtotal)}
      </td>

      {/* Eliminar */}
      <td className="px-3 py-2.5 w-10 text-center align-middle">
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-base leading-none"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

function FilaItemCard({ fila, index, productos, stockMap, tipoVenta, promociones, impuestos, comisionPorc, onChange, onRemove }) {
  const [busqueda, setBusqueda] = useState('');

  const filtrados = productos.filter(p =>
    ((stockMap[p.id_producto] ?? 0) >= 1 || String(p.id_producto) === String(fila.id_producto)) &&
    (!busqueda ||
      p.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo_interno.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo_barras || '').includes(busqueda))
  );

  const prod      = productos.find(p => String(p.id_producto) === String(fila.id_producto));
  const precioBase = resolverPrecio(prod, tipoVenta);
  const sobreprecio = fila.id_producto ? Math.max(0, Number(fila.precio_unitario) - precioBase) : 0;
  const comisionMonto = +(sobreprecio * (comisionPorc ?? 0) / 100).toFixed(2);
  const disponible = fila.id_producto ? (stockMap[fila.id_producto] ?? 0) : null;
  const base      = Number(fila.cantidad ?? 0) * Number(fila.precio_unitario ?? 0);
  const desc      = base * (Number(fila.descuento_porc ?? 0) / 100);
  const imp       = (base - desc) * (Number(fila.impuesto_porc ?? 0) / 100);
  const subtotal  = +(base - desc + imp).toFixed(2);
  const promoPorc = prod ? resolverPromo(prod, promociones) : 0;

  return (
    <div className="px-4 py-3 space-y-3 border-b border-zinc-100 dark:border-zinc-800">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Producto {index + 1}</span>
          <button onClick={onRemove} className="text-zinc-400 hover:text-red-500 text-xl leading-none transition-colors">×</button>
        </div>
        <input
          type="text" placeholder="Filtrar…" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
        />
        <select
          value={fila.id_producto}
          onChange={e => {
            const id = e.target.value;
            const p  = productos.find(x => String(x.id_producto) === id);
            const precio    = resolverPrecio(p, tipoVenta);
            const descPromo = resolverPromo(p, promociones);
            const impDef = p?.id_impuesto_default
              ? impuestos.find(i => String(i.id_impuesto) === String(p.id_impuesto_default))
              : impuestos.find(i => i.es_default);
            onChange({
              id_producto: id, precio_unitario: precio, descuento_porc: descPromo,
              id_impuesto: impDef ? String(impDef.id_impuesto) : '',
              impuesto_porc: impDef ? Number(impDef.porcentaje) : 0,
            });
          }}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
        >
          <option value="">— seleccionar producto —</option>
          {filtrados.slice(0, 50).map(p => (
            <option key={p.id_producto} value={p.id_producto}>
              [{p.codigo_interno}] {p.producto}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 flex-wrap">
          {disponible !== null && (
            <span className={`text-[10px] font-medium ${disponible <= 0 ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
              Stock: {fmtMonto(disponible)}
            </span>
          )}
          {promoPorc > 0 && fila.id_producto && (
            <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">
              Promo −{promoPorc}%
            </span>
          )}
        </div>
        {fila.id_producto && (
          <input
            type="text"
            placeholder="N° de serie (opcional)"
            value={fila.numero_serie ?? ''}
            onChange={e => onChange({ numero_serie: e.target.value })}
            className="w-full px-2.5 py-1.5 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-yellow-400 font-mono"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">Cantidad</p>
          <input
            type="number" min={1} step="1" value={fila.cantidad}
            onChange={e => onChange({ cantidad: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right font-mono"
          />
        </div>
        <div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">Precio unit.</p>
          <input
            type="number" min={0} step="0.01" value={fila.precio_unitario}
            onChange={e => onChange({ precio_unitario: e.target.value })}
            className={`w-full px-2 py-1.5 text-xs rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 text-right font-mono ${
              sobreprecio > 0
                ? 'border-amber-400 focus:ring-amber-400'
                : 'border-zinc-200 dark:border-zinc-700 focus:ring-yellow-400'
            }`}
          />
          <div className="flex items-center justify-between mt-0.5">
            <span className={`text-[10px] px-1 py-0.5 rounded font-semibold ${
              tipoVenta === 'MAYOR'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
            }`}>
              {tipoVenta === 'MAYOR' ? 'MAYOR' : 'PVP'}
            </span>
            {precioBase > 0 && (
              <span className="text-[10px] text-zinc-400">Base: {fmtMonto(precioBase)}</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">Desc %</p>
          <input
            type="number" min={0} max={100} step="0.01" value={fila.descuento_porc}
            onChange={e => onChange({ descuento_porc: e.target.value })}
            className={`w-full px-2 py-1.5 text-xs rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 text-right font-mono ${
              Number(fila.descuento_porc) > 0
                ? 'border-green-400 focus:ring-green-400 text-green-700 dark:text-green-400 font-semibold'
                : 'border-zinc-200 dark:border-zinc-700 focus:ring-yellow-400'
            }`}
          />
          {Number(fila.descuento_porc) > 0 && promoPorc > 0 && (
            <p className="text-[10px] text-green-600 dark:text-green-400 text-center mt-0.5">auto</p>
          )}
        </div>
        <div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">Impuesto</p>
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
              <option key={i.id_impuesto} value={i.id_impuesto}>
                {i.codigo} ({Number(i.porcentaje).toFixed(0)}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">Subtotal</span>
        <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white">Bs {fmtMonto(subtotal)}</span>
      </div>
    </div>
  );
}

function Modal({ titulo, onClose, children, maxW = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full ${maxW} shadow-2xl`}>
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
      <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-2">
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
    <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
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
  const [categorias,  setCategorias]  = useState([]);
  const [unidades,    setUnidades]    = useState([]);
  const [impuestos,   setImpuestos]   = useState([]);
  const [vendedores,  setVendedores]  = useState([]);

  const [form, setForm] = useState({
    tipo_venta: 'MENOR', id_sucursal: '', id_deposito: '', id_cliente: '',
    id_moneda: '', tipo_cambio: 1, condicion_pago: 'CONTADO', dias_credito: 0,
    descuento_porc: 0, impuesto: 0, requiere_entrega: false,
    direccion_entrega: '', fecha_entrega: '', observaciones: '',
    id_vendedor: '',
  });
  const [items, setItems] = useState([{ _key: crypto.randomUUID(), id_producto: '', cantidad: 1, precio_unitario: 0, descuento_porc: 0, id_impuesto: '', impuesto_porc: 0, numero_serie: '' }]);
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

  const [modalRapido, setModalRapido] = useState(false);
  const [rpForm, setRpForm]   = useState({ nombre: '', id_categoria: '', id_unidad: '', precio_real: '', precio_publico: '', precio_mayor: '' });
  const [rpError, setRpError] = useState('');
  const [rpGuardando, setRpGuardando] = useState(false);

  const [modalClienteRapido, setModalClienteRapido] = useState(false);
  const [rcForm, setRcForm]   = useState({ nombre: '', documento: '', telefono: '', habilitarCredito: false, limite_credito: '', dias_credito: '' });
  const [rcError, setRcError] = useState('');
  const [rcGuardando, setRcGuardando] = useState(false);

  useEffect(() => {
    if (!esEdicion) {
      cajaService.getArqueoActual()
        .then(r => setArqueoActual(r.data.arqueo ?? null))
        .catch(() => setArqueoActual(null));
    }

    ventasService.formData().then(r => {
      const { sucursales: suc, depositos: deps, productos: prods,
              monedas: mons, impuestos: imps, categorias: cats,
              unidades: uns, promociones: promos, clientes: clis,
              vendedores: vends } = r.data;

      setSucursales(suc ?? []);
      setDepositos(deps ?? []);
      setProductos(prods ?? []);
      setClientes(clis ?? []);
      setMonedas(mons ?? []);
      setImpuestos(imps ?? []);
      setCategorias(cats ?? []);
      setUnidades(uns ?? []);
      setPromociones(promos ?? []);
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
            condicion_pago: v.condicion_pago, dias_credito: v.dias_credito,
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

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

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
  }, [form.id_moneda, monedas]); // eslint-disable-line

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

    const precio = resolverPrecio(prod, form.tipo_venta);
    setItems(prev => {
      const idx = prev.findIndex(it => String(it.id_producto) === String(prod.id_producto));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      const impDef = prod.id_impuesto_default
        ? impuestos.find(i => String(i.id_impuesto) === String(prod.id_impuesto_default))
        : impuestos.find(i => i.es_default);
      return [...prev, {
        _key:            crypto.randomUUID(),
        id_producto:     String(prod.id_producto),
        cantidad:        1,
        precio_unitario: precio,
        descuento_porc:  0,
        id_impuesto:    impDef ? String(impDef.id_impuesto) : '',
        impuesto_porc:  impDef ? Number(impDef.porcentaje) : 0,
      }];
    });
    setQrInput('');
    setQrError('');
  }, [productos, form.tipo_venta, impuestos]); // eslint-disable-line

  const handleQrScan = (val) => {
    clearTimeout(qrTimerRef.current);
    qrTimerRef.current = setTimeout(() => procesarCodigo(val), 300);
  };

  const addItem    = () => setItems(p => [...p, { _key: crypto.randomUUID(), id_producto: '', cantidad: 1, precio_unitario: 0, descuento_porc: 0, id_impuesto: '', impuesto_porc: 0 }]);
  const removeItem = i => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, patch) => setItems(p => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const limpiarItems = () => setItems([{ _key: crypto.randomUUID(), id_producto: '', cantidad: 1, precio_unitario: 0, descuento_porc: 0, id_impuesto: '', impuesto_porc: 0 }]);

  const vendedorActual = vendedores.find(v => String(v.id_usuario) === String(form.id_vendedor));
  const comisionPorc   = Number(vendedorActual?.porcentaje_comision ?? 0);

  const subtotal  = items.reduce((s, it) => {
    const base = Number(it.cantidad ?? 0) * Number(it.precio_unitario ?? 0);
    const desc = base * (Number(it.descuento_porc ?? 0) / 100);
    const imp  = (base - desc) * (Number(it.impuesto_porc ?? 0) / 100);
    return s + (base - desc + imp);
  }, 0);
  const descMonto = subtotal * (Number(form.descuento_porc) / 100);
  const impuesto  = Number(form.impuesto);
  const total     = subtotal - descMonto + impuesto;

  const guardar = async () => {
    setError('');
    if (!form.id_sucursal || !form.id_deposito || !form.id_cliente) {
      return setError('Sucursal, depósito y cliente son obligatorios');
    }
    const itemsValidos = items.filter(it => it.id_producto && Number(it.cantidad) > 0);
    if (!itemsValidos.length) return setError('Agregá al menos un producto con cantidad válida');

    setGuardando(true);
    try {
      const payload = { ...form, items: itemsValidos };
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

  const setRp = (k, v) => setRpForm(p => ({ ...p, [k]: v }));

  const guardarProductoRapido = useCallback(async () => {
    setRpError('');
    const { nombre, id_categoria, id_unidad, precio_real, precio_publico } = rpForm;
    if (!nombre || !id_categoria || !id_unidad || !precio_real || !precio_publico) {
      return setRpError('Nombre, categoría, unidad y precios son requeridos');
    }
    setRpGuardando(true);
    try {
      const res = await ventasService.productoRapido({
        nombre,
        id_categoria,
        id_unidad,
        precio_real: Number(precio_real),
        precio_publico: Number(precio_publico),
        precio_mayor: rpForm.precio_mayor ? Number(rpForm.precio_mayor) : Number(precio_publico),
      });
      const nuevoProd = res.data.producto;
      setProductos(prev => [...prev, nuevoProd]);
      const precio = resolverPrecio(nuevoProd, form.tipo_venta);
      const impDef = nuevoProd.id_impuesto_default
        ? impuestos.find(i => String(i.id_impuesto) === String(nuevoProd.id_impuesto_default))
        : impuestos.find(i => i.es_default);
      setItems(prev => [...prev, {
        _key:            crypto.randomUUID(),
        id_producto:     String(nuevoProd.id_producto),
        cantidad:        1,
        precio_unitario: precio,
        descuento_porc:  0,
        id_impuesto:     impDef ? String(impDef.id_impuesto) : '',
        impuesto_porc:   impDef ? Number(impDef.porcentaje) : 0,
      }]);
      setModalRapido(false);
      setRpForm({ nombre: '', id_categoria: '', id_unidad: '', precio_real: '', precio_publico: '', precio_mayor: '' });
    } catch (err) {
      setRpError(err.response?.data?.mensaje ?? 'Error al crear producto');
    } finally {
      setRpGuardando(false);
    }
  }, [rpForm, form.tipo_venta]);

  const setRc = (k, v) => setRcForm(p => ({ ...p, [k]: v }));

  const guardarClienteRapido = useCallback(async () => {
    setRcError('');
    const { nombre, documento, telefono, habilitarCredito, limite_credito, dias_credito } = rcForm;
    if (!nombre.trim()) return setRcError('El nombre es requerido');
    if (habilitarCredito && !(Number(limite_credito) > 0)) {
      return setRcError('Ingresá un límite de crédito válido');
    }
    setRcGuardando(true);
    try {
      const res = await clientesService.create({
        nombres: nombre.trim(),
        documento: documento.trim() || undefined,
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

      setClientes(prev => [...prev, nuevoCliente]);
      setF('id_cliente', String(nuevoCliente.id_cliente));
      setModalClienteRapido(false);
      setRcForm({ nombre: '', documento: '', telefono: '', habilitarCredito: false, limite_credito: '', dias_credito: '' });
    } catch (err) {
      setRcError(err.response?.data?.error ?? 'Error al crear cliente');
    } finally {
      setRcGuardando(false);
    }
  }, [rcForm]);

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-shadow';
  const monedaSel = monedas.find(m => String(m.id_moneda) === String(form.id_moneda));

  if (cargando) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-400">Cargando…</p>
      </div>
    </div>
  );

  return (
    <div className="pb-28 lg:pb-8 max-w-5xl space-y-4">

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

        {/* Acciones desktop */}
        <div className="hidden lg:flex items-center gap-2.5">
          <button
            onClick={() => navigate(esEdicion ? `/ventas/${id}` : '/ventas')}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardar} disabled={guardando}
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors"
          >
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear venta'}
            {!guardando && (
              <span className="font-mono text-xs bg-zinc-900/10 px-2 py-0.5 rounded-lg font-bold">
                Bs {fmtMonto(total)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Banner sin caja (solo en nueva venta) */}
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

      {/* ── SECCIÓN 1: Datos de la venta ── */}
      <SectionCard title="Datos de la venta">
        <div className="p-5 space-y-5">

          {/* Fila 1: Tipo venta + Sucursal + Depósito + Vendedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <FieldLabel>Tipo de venta</FieldLabel>
              {tiposPermitidos.length > 1 ? (
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl gap-1">
                  {tiposPermitidos.map(t => (
                    <button
                      key={t} onClick={() => setF('tipo_venta', t)} disabled={esEdicion}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        form.tipo_venta === t
                          ? 'bg-yellow-400 text-zinc-900 shadow-sm'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                      } disabled:opacity-60`}
                    >
                      {t === 'MENOR' ? 'Por menor' : 'Por mayor'}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${form.tipo_venta === 'MAYOR' ? 'bg-blue-400' : 'bg-yellow-400'}`} />
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {form.tipo_venta === 'MENOR' ? 'Por menor' : 'Por mayor'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <FieldLabel>Sucursal *</FieldLabel>
              <select
                value={form.id_sucursal} onChange={e => setF('id_sucursal', e.target.value)}
                disabled={esEdicion || sucursales.length <= 1} className={inputCls}
              >
                <option value="">— seleccionar —</option>
                {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
              </select>
            </div>

            <div>
              <FieldLabel>Depósito / Punto de venta *</FieldLabel>
              <select
                value={form.id_deposito} onChange={e => setF('id_deposito', e.target.value)}
                disabled={esEdicion} className={inputCls}
              >
                <option value="">— seleccionar —</option>
                {depositos
                  .filter(d => !form.id_sucursal || String(d.id_sucursal) === String(form.id_sucursal))
                  .map(d => <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>)}
              </select>
            </div>

            <div>
              <FieldLabel>Vendedor *</FieldLabel>
              <select
                value={form.id_vendedor} onChange={e => setF('id_vendedor', e.target.value)}
                className={inputCls}
              >
                <option value="">— seleccionar —</option>
                {vendedores.map(v => (
                  <option key={v.id_usuario} value={v.id_usuario}>{v.nombre_completo}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800" />

          {/* Fila 2: Cliente + Condición pago + Moneda + Tipo cambio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>Cliente *</FieldLabel>
                <button
                  type="button"
                  onClick={() => setModalClienteRapido(true)}
                  className="text-[11px] px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium transition-colors"
                >
                  + Cliente rápido
                </button>
              </div>
              <input
                type="text" value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)}
                placeholder="Buscar por CI, nombre o código…"
                className="w-full mb-1.5 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:bg-white dark:focus:bg-zinc-800"
              />
              <select value={form.id_cliente} onChange={e => setF('id_cliente', e.target.value)} className={inputCls}>
                <option value="">— seleccionar cliente —</option>
                {clientes
                  .filter(c => {
                    if (!busquedaCliente.trim()) return true;
                    const q = busquedaCliente.toLowerCase();
                    return (
                      (c.documento ?? '').toLowerCase().includes(q) ||
                      (c.nombres ?? '').toLowerCase().includes(q) ||
                      (c.apellidos ?? '').toLowerCase().includes(q) ||
                      (c.razon_social ?? '').toLowerCase().includes(q) ||
                      (c.codigo ?? '').toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 50)
                  .map(c => (
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
            </div>

            <div>
              <FieldLabel>Condición de pago *</FieldLabel>
              <select value={form.condicion_pago} onChange={e => setF('condicion_pago', e.target.value)} className={inputCls}>
                <option value="CONTADO">Contado</option>
                {puede('vender_credito', 'ventas') && <option value="CREDITO">Crédito</option>}
              </select>
              {form.condicion_pago === 'CREDITO' && (
                <div className="mt-2">
                  <label className="block text-[10px] text-zinc-400 mb-1">Días de crédito</label>
                  <input
                    type="number" min={0} value={form.dias_credito}
                    onChange={e => setF('dias_credito', e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}
            </div>

            <div>
              <FieldLabel>Moneda</FieldLabel>
              <select value={form.id_moneda} onChange={e => setF('id_moneda', e.target.value)} className={inputCls}>
                <option value="">— seleccionar —</option>
                {monedas.map(m => (
                  <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>
                ))}
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
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800" />

          {/* Fila 3: Entrega + Observaciones */}
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit group">
              <input
                type="checkbox" id="entrega" checked={form.requiere_entrega}
                onChange={e => setF('requiere_entrega', e.target.checked)}
                className="w-4 h-4 rounded accent-yellow-400"
              />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                Requiere entrega a domicilio
              </span>
            </label>

            {form.requiere_entrega && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6 border-l-2 border-yellow-400/30 ml-1.5">
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
                rows={2} className={inputCls} placeholder="Notas adicionales…"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── SECCIÓN 2: Productos ── */}
      <SectionCard
        title="Productos"
        badge={
          promociones.length > 0 && (
            <span className="text-[11px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold">
              {promociones.length} promo{promociones.length > 1 ? 's' : ''} activa{promociones.length > 1 ? 's' : ''}
            </span>
          )
        }
        actions={
          <>
            <button
              onClick={() => setModalRapido(true)}
              className="hidden md:inline-flex text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium transition-colors"
            >
              + Producto rápido
            </button>
            <button
              onClick={limpiarItems}
              className="hidden md:inline-flex text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={addItem}
              className="hidden md:inline-flex text-xs px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold transition-colors"
            >
              + Agregar fila
            </button>
          </>
        }
      >
        {/* Escáner QR */}
        <div className="px-5 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-zinc-400 flex-shrink-0 tracking-widest select-none uppercase">QR</span>
          <input
            type="text"
            value={qrInput}
            onChange={e => { setQrInput(e.target.value); handleQrScan(e.target.value); }}
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
            placeholder="Escanee un código o escriba manualmente…"
            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
          {qrError && <span className="text-xs text-red-500 flex-shrink-0">{qrError}</span>}
          <button
            type="button"
            onClick={() => setMostrarEscaner(true)}
            title="Escanear con cámara"
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-yellow-400 hover:text-yellow-500 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
        </div>

        {/* ── Tarjetas — móvil < md ── */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((fila, i) => (
            <FilaItemCard
              key={fila._key} fila={fila} index={i}
              productos={productos} stockMap={stockMap}
              tipoVenta={form.tipo_venta}
              promociones={promociones}
              impuestos={impuestos}
              comisionPorc={comisionPorc}
              onChange={patch => updateItem(i, patch)}
              onRemove={() => removeItem(i)}
            />
          ))}
          <div className="px-4 py-3 space-y-2">
            <button
              onClick={addItem}
              className="w-full py-2 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-xs text-zinc-400 hover:border-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
            >
              + Agregar fila
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setModalRapido(true)}
                className="flex-1 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium transition-colors"
              >
                + Producto rápido
              </button>
              <button
                onClick={limpiarItems}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabla — desktop md+ ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Producto</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider w-24">Cantidad</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider w-32">Precio unit.</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider w-20">Desc %</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider w-36">Impuesto</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider w-32">Subtotal</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((fila, i) => (
                <FilaItem
                  key={fila._key} fila={fila} index={i}
                  productos={productos} stockMap={stockMap}
                  tipoVenta={form.tipo_venta}
                  promociones={promociones}
                  impuestos={impuestos}
                  comisionPorc={comisionPorc}
                  onChange={patch => updateItem(i, patch)}
                  onRemove={() => removeItem(i)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-white">Bs {fmtMonto(subtotal)}</span>
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
                  <span className="font-mono text-sm text-zinc-500 w-20 text-right">−{fmtMonto(descMonto)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Impuesto (Bs)</span>
                <input
                  type="number" min={0} step="0.01" value={form.impuesto}
                  onChange={e => setF('impuesto', e.target.value)}
                  className="w-28 px-2 py-0.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-yellow-400 font-mono"
                />
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <span className="text-base font-bold text-zinc-900 dark:text-white">Total</span>
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white">Bs {fmtMonto(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Acciones desktop (duplicado al pie) ── */}
      <div className="hidden lg:flex items-center gap-3">
        <button
          onClick={guardar} disabled={guardando}
          className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors"
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear venta'}
        </button>
        <button
          onClick={() => navigate(esEdicion ? `/ventas/${id}` : '/ventas')}
          className="px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>

      {/* ── Barra sticky mobile ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3 shadow-xl">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">Total</p>
          <p className="text-lg font-bold font-mono text-zinc-900 dark:text-white leading-tight">Bs {fmtMonto(total)}</p>
        </div>
        <button
          onClick={() => navigate(esEdicion ? `/ventas/${id}` : '/ventas')}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
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

      {/* ── Modal producto rápido ── */}
      {modalRapido && (
        <Modal titulo="Agregar producto rápido" onClose={() => { setModalRapido(false); setRpError(''); }}>
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">El producto se creará en el catálogo y se agregará al carrito.</p>

            <div>
              <FieldLabel>Nombre del producto *</FieldLabel>
              <input
                type="text" value={rpForm.nombre} onChange={e => setRp('nombre', e.target.value)}
                placeholder="Ej: Ventilador 16 pulgadas"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Categoría *</FieldLabel>
                <select value={rpForm.id_categoria} onChange={e => setRp('id_categoria', e.target.value)} className={inputCls}>
                  <option value="">— seleccionar —</option>
                  {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Unidad *</FieldLabel>
                <select value={rpForm.id_unidad} onChange={e => setRp('id_unidad', e.target.value)} className={inputCls}>
                  <option value="">— seleccionar —</option>
                  {unidades.map(u => <option key={u.id_unidad} value={u.id_unidad}>{u.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Costo (Bs) *</FieldLabel>
                <input type="number" min={0} step="0.01" value={rpForm.precio_real}
                  onChange={e => setRp('precio_real', e.target.value)} className={inputCls} />
              </div>
              <div>
                <FieldLabel>P. venta (Bs) *</FieldLabel>
                <input type="number" min={0} step="0.01" value={rpForm.precio_publico}
                  onChange={e => setRp('precio_publico', e.target.value)} className={inputCls} />
              </div>
              <div>
                <FieldLabel>P. mayor (Bs)</FieldLabel>
                <input type="number" min={0} step="0.01" value={rpForm.precio_mayor}
                  onChange={e => setRp('precio_mayor', e.target.value)}
                  placeholder="Opcional" className={inputCls} />
              </div>
            </div>

            {rpError && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <span>⚠</span> {rpError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={guardarProductoRapido} disabled={rpGuardando}
                className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors"
              >
                {rpGuardando ? 'Creando…' : 'Crear y agregar'}
              </button>
              <button
                onClick={() => { setModalRapido(false); setRpError(''); }}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal cliente rápido ── */}
      {modalClienteRapido && (
        <Modal titulo="Agregar cliente rápido" onClose={() => { setModalClienteRapido(false); setRcError(''); }}>
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">El cliente se creará como minorista. Direcciones, email y demás datos se completan luego desde el módulo Clientes.</p>

            <div>
              <FieldLabel>Nombre / Razón social *</FieldLabel>
              <input
                type="text" value={rcForm.nombre} onChange={e => setRc('nombre', e.target.value)}
                placeholder="Ej: Juan Pérez"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Documento</FieldLabel>
                <input type="text" value={rcForm.documento}
                  onChange={e => setRc('documento', e.target.value)}
                  placeholder="Opcional" className={inputCls} />
              </div>
              <div>
                <FieldLabel>Teléfono</FieldLabel>
                <input type="text" value={rcForm.telefono}
                  onChange={e => setRc('telefono', e.target.value)}
                  placeholder="Opcional" className={inputCls} />
              </div>
            </div>

            {puede('dar_credito', 'clientes') && (
              <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit group mt-3">
                  <input
                    type="checkbox" checked={rcForm.habilitarCredito}
                    onChange={e => setRc('habilitarCredito', e.target.checked)}
                    className="w-4 h-4 rounded accent-yellow-400"
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    Habilitar crédito
                  </span>
                </label>

                {rcForm.habilitarCredito && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pl-6 border-l-2 border-yellow-400/30 ml-1.5">
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
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <span>⚠</span> {rcError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={guardarClienteRapido} disabled={rcGuardando}
                className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors"
              >
                {rcGuardando ? 'Creando…' : 'Crear y seleccionar'}
              </button>
              <button
                onClick={() => { setModalClienteRapido(false); setRcError(''); }}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
