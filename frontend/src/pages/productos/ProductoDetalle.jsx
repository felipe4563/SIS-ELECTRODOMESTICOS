import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSpinner, FaEdit, FaSave, FaTimes, FaBoxOpen, FaCamera } from 'react-icons/fa';
import { productosService } from '../../services/productos.service';
import { usePermission } from '../../hooks/usePermission';
import api from '../../api/axios';

const inputCls  = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
const labelCls  = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';
const selectCls = inputCls;
const bs = v => `Bs ${Number(v ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

// ── Tab: Datos Generales ──────────────────────────────────────────────────
function TabDatos({ producto, onActualizar }) {
  const { puede } = usePermission();
  const [editando,  setEditando]  = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);
  const [form,      setForm]      = useState({
    codigo_interno: '', codigo_barras: '',
    id_marca: '', id_categoria: '', id_unidad: '', id_moneda_costo: '',
    producto: '', detalle: '', capacidad: '', caracteristicas: '', modelo: '', color: '',
    precio_real: 0, costo_logistica: 0, costo_mcm: 0, precio_publico: 0,
    bono: 0, precio_mayor: 0, id_proveedor_default: '',
    stock_minimo: 0, stock_maximo: 0, notas: '', activo: true,
  });

  const [marcas,      setMarcas]      = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [unidades,    setUnidades]    = useState([]);
  const [monedas,     setMonedas]     = useState([]);
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/marcas'), api.get('/categorias'),
      api.get('/unidades'), api.get('/monedas'), api.get('/proveedores'),
    ]).then(([m, c, u, mo, p]) => {
      setMarcas(m.data.marcas?.filter(x => x.activo) ?? []);
      setCategorias(c.data.categorias?.filter(x => x.activo) ?? []);
      setUnidades(u.data.unidades?.filter(x => x.activo) ?? []);
      setMonedas(mo.data.monedas?.filter(x => x.activo) ?? []);
      setProveedores(p.data.proveedores?.filter(x => x.activo) ?? []);
    });
  }, []);

  useEffect(() => {
    if (producto) {
      setForm({
        codigo_interno:       producto.codigo_interno || '',
        codigo_barras:        producto.codigo_barras || '',
        id_marca:             producto.id_marca || '',
        id_categoria:         producto.id_categoria || '',
        id_unidad:            producto.id_unidad || '',
        id_moneda_costo:      producto.id_moneda_costo || '',
        producto:             producto.producto || '',
        detalle:              producto.detalle || '',
        capacidad:            producto.capacidad || '',
        caracteristicas:      producto.caracteristicas || '',
        modelo:               producto.modelo || '',
        color:                producto.color || '',
        precio_real:          producto.precio_real ?? 0,
        costo_logistica:      producto.costo_logistica ?? 0,
        costo_mcm:            producto.costo_mcm ?? 0,
        precio_publico:       producto.precio_publico ?? 0,
        bono:                 producto.bono ?? 0,
        precio_mayor:         producto.precio_mayor ?? 0,
        id_proveedor_default: producto.id_proveedor_default || '',
        stock_minimo:         producto.stock_minimo ?? 0,
        stock_maximo:         producto.stock_maximo ?? 0,
        notas:                producto.notas || '',
        activo:               !!producto.activo,
      });
    }
  }, [producto]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    setError(null);
    setGuardando(true);
    try {
      await productosService.update(producto.id_producto, form);
      setEditando(false);
      onActualizar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = () => { setEditando(false); setError(null); };

  const puedeEditar       = puede('editar',         'productos');
  const puedeEditarPrecio = puede('editar_precio',  'productos');
  const puedeEditarCostos = puede('editar_costos',  'productos');
  const puedeEditarBono   = puede('editar_bono',    'productos');

  // Campos de precios solo si tiene permiso
  const precioEditable = editando && puedeEditarPrecio;
  const costosEditables = editando && puedeEditarCostos;
  const bonoEditable    = editando && puedeEditarBono;

  const costo_total = Number(form.precio_real || 0) + Number(form.costo_logistica || 0) + Number(form.costo_mcm || 0);
  const utilidad    = Number(form.precio_publico || 0) - costo_total;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Información del producto</h3>
        {puedeEditar && !editando && (
          <button onClick={() => setEditando(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
            <FaEdit className="h-3 w-3" /> Editar
          </button>
        )}
        {editando && (
          <div className="flex gap-2">
            <button onClick={cancelar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <FaTimes className="h-3 w-3" /> Cancelar
            </button>
            <button onClick={handleSave} disabled={guardando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando ? <FaSpinner className="animate-spin h-3 w-3" /> : <FaSave className="h-3 w-3" />}
              Guardar
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      <div className="space-y-4">
        {/* Identificación */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Código interno</label>
            <input name="codigo_interno" value={form.codigo_interno} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Código de barras</label>
            <input name="codigo_barras" value={form.codigo_barras} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
        </div>

        {/* Catálogos */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Marca</label>
            {editando ? (
              <select name="id_marca" value={form.id_marca} onChange={handleChange} className={selectCls}>
                {marcas.map(m => <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>)}
              </select>
            ) : (
              <input value={producto?.marca_nombre || ''} disabled className={inputCls} />
            )}
          </div>
          <div>
            <label className={labelCls}>Categoría</label>
            {editando ? (
              <select name="id_categoria" value={form.id_categoria} onChange={handleChange} className={selectCls}>
                {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
              </select>
            ) : (
              <input value={producto?.categoria_nombre || ''} disabled className={inputCls} />
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Unidad</label>
            {editando ? (
              <select name="id_unidad" value={form.id_unidad} onChange={handleChange} className={selectCls}>
                {unidades.map(u => <option key={u.id_unidad} value={u.id_unidad}>{u.nombre} ({u.simbolo})</option>)}
              </select>
            ) : (
              <input value={`${producto?.unidad_nombre || ''} (${producto?.unidad_simbolo || ''})`} disabled className={inputCls} />
            )}
          </div>
          <div>
            <label className={labelCls}>Moneda de costo</label>
            {editando ? (
              <select name="id_moneda_costo" value={form.id_moneda_costo} onChange={handleChange} className={selectCls}>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>)}
              </select>
            ) : (
              <input value={`${producto?.moneda_nombre || ''} (${producto?.moneda_simbolo || ''})`} disabled className={inputCls} />
            )}
          </div>
          <div>
            <label className={labelCls}>Proveedor default</label>
            {editando ? (
              <select name="id_proveedor_default" value={form.id_proveedor_default} onChange={handleChange} className={selectCls}>
                <option value="">Sin proveedor</option>
                {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.razon_social}</option>)}
              </select>
            ) : (
              <input value={producto?.proveedor_nombre || '—'} disabled className={inputCls} />
            )}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className={labelCls}>Nombre del producto</label>
          <input name="producto" value={form.producto} onChange={handleChange} disabled={!editando} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Detalle</label>
            <input name="detalle" value={form.detalle} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Capacidad</label>
            <input name="capacidad" value={form.capacidad} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Modelo</label>
            <input name="modelo" value={form.modelo} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Color</label>
            <input name="color" value={form.color} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Características</label>
            <input name="caracteristicas" value={form.caracteristicas} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
        </div>

        {/* Precios */}
        <div className="pt-3 border-t border-gray-100 dark:border-zinc-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Precios y costos</p>

          {/* Resumen calculado */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Costo total', value: bs(costo_total), color: 'text-gray-900 dark:text-white' },
              { label: 'Precio público', value: bs(form.precio_publico), color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Utilidad', value: bs(utilidad), color: utilidad >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
              { label: 'Margen', value: costo_total > 0 ? `${((utilidad / costo_total) * 100).toFixed(1)}%` : '—', color: 'text-purple-600 dark:text-purple-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">{label}</p>
                <p className={`text-base font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Real (costo)</label>
              <input name="precio_real" type="number" step="0.01" min="0" value={form.precio_real}
                onChange={handleChange} disabled={!costosEditables} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Logística (LOG)</label>
              <input name="costo_logistica" type="number" step="0.01" min="0" value={form.costo_logistica}
                onChange={handleChange} disabled={!costosEditables} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>MCM</label>
              <input name="costo_mcm" type="number" step="0.01" min="0" value={form.costo_mcm}
                onChange={handleChange} disabled={!costosEditables} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Precio público</label>
              <input name="precio_publico" type="number" step="0.01" min="0" value={form.precio_publico}
                onChange={handleChange} disabled={!precioEditable} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className={labelCls}>Precio mayorista</label>
              <input name="precio_mayor" type="number" step="0.01" min="0" value={form.precio_mayor}
                onChange={handleChange} disabled={!precioEditable} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bono vendedor</label>
              <input name="bono" type="number" step="0.01" min="0" value={form.bono}
                onChange={handleChange} disabled={!bonoEditable} className={inputCls} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelCls}>Stock mín.</label>
                <input name="stock_minimo" type="number" step="0.01" min="0" value={form.stock_minimo}
                  onChange={handleChange} disabled={!editando} className={inputCls} />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Stock máx.</label>
                <input name="stock_maximo" type="number" step="0.01" min="0" value={form.stock_maximo}
                  onChange={handleChange} disabled={!editando} className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* Notas y estado */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Notas</label>
            <textarea name="notas" value={form.notas} onChange={handleChange} disabled={!editando} rows={2}
              className={inputCls + ' resize-none'} />
          </div>
          {editando && (
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange}
                  className="w-4 h-4 rounded accent-amber-500" />
                <span className="text-sm text-gray-700 dark:text-zinc-300">Producto activo</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Stock por depósito ───────────────────────────────────────────────
function TabStock({ idProducto }) {
  const [stock,    setStock]    = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    productosService.getStock(idProducto)
      .then(({ data }) => setStock(data.stock))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [idProducto]);

  useEffect(() => { cargar(); }, [cargar]);

  const total = stock.reduce((s, r) => s + Number(r.cantidad), 0);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Stock por depósito</h3>
        <span className="text-sm font-bold text-gray-900 dark:text-white">Total: {Number(total).toLocaleString('es-BO')}</span>
      </div>
      {cargando ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <FaSpinner className="animate-spin h-5 w-5" />
        </div>
      ) : stock.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
          <FaBoxOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin registros de stock</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800">
                {['Depósito','Disponible','Reservada','Total','Costo Prom.','Últ. Movimiento'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {stock.map(s => (
                <tr key={s.id_stock} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{s.deposito_nombre}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 font-mono">{s.deposito_codigo}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-sm ${Number(s.cantidad_disponible) > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                      {Number(s.cantidad_disponible).toLocaleString('es-BO')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-amber-600 dark:text-amber-400 font-medium">
                    {Number(s.cantidad_reservada).toLocaleString('es-BO')}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                    {Number(s.cantidad).toLocaleString('es-BO')}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-zinc-400 text-xs">
                    {bs(s.costo_promedio)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 dark:text-zinc-500">
                    {s.fecha_ult_movimiento
                      ? new Date(s.fecha_ult_movimiento).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Sin movimientos'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Histórico de precios ─────────────────────────────────────────────
function TabHistorico({ idProducto }) {
  const [historico, setHistorico] = useState([]);
  const [cargando,  setCargando]  = useState(true);

  const cargar = useCallback(() => {
    productosService.getHistoricoPrecios(idProducto)
      .then(({ data }) => setHistorico(data.historico))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [idProducto]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Historial de cambios de precio</h3>
      </div>
      {cargando ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <FaSpinner className="animate-spin h-5 w-5" />
        </div>
      ) : historico.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
          <p className="text-sm">Sin cambios de precio registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800">
                {['Fecha','Usuario','Real anterior','Real nuevo','Público anterior','Público nuevo'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {historico.map(h => (
                <tr key={h.id_historico} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-400">
                    {new Date(h.fecha).toLocaleString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 dark:text-zinc-300">
                    {h.nombres ? `${h.nombres} ${h.apellidos || ''}`.trim() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-400">{bs(h.precio_real_ant)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white">{bs(h.precio_real_nuevo)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-400">{bs(h.precio_pub_ant)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-blue-600 dark:text-blue-400">{bs(h.precio_pub_nuevo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const buildImgUrl = (url) =>
  !url ? null : url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`;

// ── ProductoDetalle ───────────────────────────────────────────────────────
export default function ProductoDetalle() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { puede }   = usePermission();
  const imgRef      = useRef(null);
  const [producto,   setProducto]  = useState(null);
  const [cargando,   setCargando]  = useState(true);
  const [tabActivo,  setTabActivo] = useState(0);
  const [subiendoImg, setSubiendoImg] = useState(false);

  const TABS = ['Datos Generales', 'Stock', 'Histórico Precios'];

  const cargarProducto = useCallback(() => {
    productosService.getOne(id)
      .then(({ data }) => setProducto(data.producto))
      .catch(() => navigate('/productos'))
      .finally(() => setCargando(false));
  }, [id, navigate]);

  useEffect(() => { cargarProducto(); }, [cargarProducto]);

  const handleImgChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setSubiendoImg(true);
    try {
      const { data } = await productosService.uploadImagen(id, file);
      setProducto(prev => ({ ...prev, imagen_url: data.imagen_url }));
    } catch {
      // error silencioso — el usuario verá que la imagen no cambió
    } finally {
      setSubiendoImg(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <FaSpinner className="animate-spin h-7 w-7" />
      </div>
    );
  }

  if (!producto) return null;

  const costo_total = Number(producto.precio_real) + Number(producto.costo_logistica) + Number(producto.costo_mcm);
  const utilidad    = Number(producto.precio_publico) - costo_total;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/productos')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4">
          <FaArrowLeft className="h-3.5 w-3.5" />
          Volver a productos
        </button>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
          <div className="flex items-start gap-4">
            {/* Imagen del producto */}
            <div className="relative w-24 h-24 flex-shrink-0 group">
              {buildImgUrl(producto.imagen_url) ? (
                <img
                  src={buildImgUrl(producto.imagen_url)}
                  alt={producto.producto}
                  className="w-full h-full object-cover rounded-xl border border-gray-200 dark:border-zinc-700"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center border border-gray-200 dark:border-zinc-700">
                  <FaBoxOpen className="h-8 w-8 text-gray-300 dark:text-zinc-600" />
                </div>
              )}
              {puede('editar', 'productos') && (
                <>
                  <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImgChange} />
                  <button
                    onClick={() => imgRef.current?.click()}
                    disabled={subiendoImg}
                    className="absolute inset-0 w-full h-full rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 disabled:cursor-not-allowed"
                    title="Cambiar imagen"
                  >
                    {subiendoImg
                      ? <FaSpinner className="animate-spin h-5 w-5 text-white" />
                      : <><FaCamera className="h-4 w-4 text-white" /><span className="text-white text-[10px] font-medium">Cambiar</span></>
                    }
                  </button>
                </>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg">
                  {producto.codigo_interno}
                </span>
                {producto.codigo_barras && (
                  <span className="font-mono text-xs text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                    {producto.codigo_barras}
                  </span>
                )}
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${producto.activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                  {producto.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{producto.producto}</h1>
              {producto.detalle && <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{producto.detalle}</p>}
              <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-600 dark:text-zinc-400">
                <span>Marca: <strong className="text-gray-900 dark:text-white">{producto.marca_nombre}</strong></span>
                <span>Categoría: <strong className="text-gray-900 dark:text-white">{producto.categoria_nombre}</strong></span>
                {producto.modelo && <span>Modelo: <strong className="text-gray-900 dark:text-white">{producto.modelo}</strong></span>}
                {producto.color && <span>Color: <strong className="text-gray-900 dark:text-white">{producto.color}</strong></span>}
                {producto.capacidad && <span>Cap.: <strong className="text-gray-900 dark:text-white">{producto.capacidad}</strong></span>}
              </div>
            </div>

            {/* Resumen de precios en header */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center min-w-[120px]">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Precio público</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{bs(producto.precio_publico)}</p>
              </div>
              <div className={`rounded-xl p-3 text-center min-w-[120px] ${utilidad >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
                <p className={`text-xs font-medium mb-1 ${utilidad >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>Utilidad</p>
                <p className={`text-lg font-bold ${utilidad >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>{bs(utilidad)}</p>
              </div>
              {producto.bono > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 text-center col-span-2">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Bono vendedor</p>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{bs(producto.bono)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
        {TABS.map((tab, i) => {
          if (i === 2 && !puede('ver_historico_precios', 'productos')) return null;
          return (
            <button key={tab} onClick={() => setTabActivo(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                tabActivo === i
                  ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
              }`}>
              {tab}
            </button>
          );
        })}
      </div>

      {tabActivo === 0 && <TabDatos producto={producto} onActualizar={cargarProducto} />}
      {tabActivo === 1 && <TabStock idProducto={id} />}
      {tabActivo === 2 && puede('ver_historico_precios', 'productos') && <TabHistorico idProducto={id} />}
    </div>
  );
}
