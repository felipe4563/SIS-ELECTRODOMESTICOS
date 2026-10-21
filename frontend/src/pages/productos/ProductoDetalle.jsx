import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSpinner, FaEdit, FaSave, FaTimes, FaBoxOpen, FaStar, FaTrash, FaPlus, FaExpandAlt } from 'react-icons/fa';
import { HiQrCode } from 'react-icons/hi2';
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
  const [campoModal, setCampoModal] = useState(null); // 'detalle' | 'caracteristicas' | null
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

  // Sincroniza `form` con `producto` ajustando el estado durante el render
  // (patrón recomendado por React para "resetear estado cuando cambia una
  // prop") en vez de un efecto: el padre pasa un objeto `producto` nuevo
  // tanto al montar como después de cada guardado exitoso (onActualizar
  // vuelve a pedirlo), y acá se refleja ese valor recién confirmado.
  // Arranca en null (no en `producto`) a propósito: este componente ya
  // monta con un `producto` real (el padre no lo renderiza hasta tenerlo
  // cargado), así que si el "anterior" arrancara igual al valor inicial
  // nunca se dispararía la primera sincronización y el formulario quedaría
  // vacío.
  const [productoSincronizado, setProductoSincronizado] = useState(null);
  if (producto !== productoSincronizado) {
    setProductoSincronizado(producto);
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
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const v = type === 'checkbox' ? checked : value;

    // Real (costo) + Logística se suman automáticamente al MCM, y el MCM
    // se refleja como precio mayorista por defecto.
    if (name === 'precio_real' || name === 'costo_logistica') {
      setForm(prev => {
        const next = { ...prev, [name]: v };
        const mcm  = Number(next.precio_real || 0) + Number(next.costo_logistica || 0);
        return { ...next, costo_mcm: mcm, precio_mayor: mcm };
      });
      return;
    }

    setForm(prev => ({ ...prev, [name]: v }));
  };

  const handleSave = async ({ keepEditing = false } = {}) => {
    setError(null);
    setGuardando(true);
    try {
      await productosService.update(producto.id_producto, form);
      if (!keepEditing) setEditando(false);
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

  const costo_total = Number(form.costo_mcm || 0);
  const utilidad    = Number(form.precio_publico || 0) - costo_total - Number(form.bono || 0);

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
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + ' mb-0'}>Detalle</label>
              <button type="button" onClick={() => setCampoModal('detalle')}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-amber-500 dark:text-zinc-500 dark:hover:text-amber-400 transition-colors">
                <FaExpandAlt className="h-2.5 w-2.5" /> Expandir
              </button>
            </div>
            <input name="detalle" value={form.detalle} onChange={handleChange} disabled={!editando} className={inputCls} placeholder="Ej: 4H MESA VIDRIO E.E. GRILL ELEC." />
          </div>
          <div>
            <label className={labelCls}>Capacidad</label>
            <input name="capacidad" value={form.capacidad} onChange={handleChange} disabled={!editando} className={inputCls} placeholder="Ej: 60 CM, 2 Lts" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Modelo</label>
            <input name="modelo" value={form.modelo} onChange={handleChange} disabled={!editando} className={inputCls} placeholder="Ej: DSAF-CS-12HRN1" />
          </div>
          <div>
            <label className={labelCls}>Color</label>
            <input name="color" value={form.color} onChange={handleChange} disabled={!editando} className={inputCls} placeholder="Ej: BLANCO" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + ' mb-0'}>Características</label>
              <button type="button" onClick={() => setCampoModal('caracteristicas')}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-amber-500 dark:text-zinc-500 dark:hover:text-amber-400 transition-colors">
                <FaExpandAlt className="h-2.5 w-2.5" /> Expandir
              </button>
            </div>
            <input name="caracteristicas" value={form.caracteristicas} onChange={handleChange} disabled={!editando} className={inputCls} placeholder="Ej: FRIO/CALOR, INVERTER, WIFI" />
          </div>
        </div>

        {campoModal && (
          <ModalCampoExpandido
            titulo={{ detalle: 'Detalle', caracteristicas: 'Características', notas: 'Notas' }[campoModal]}
            name={campoModal}
            value={form[campoModal]}
            editando={editando}
            guardando={guardando}
            onChange={handleChange}
            onGuardar={() => handleSave({ keepEditing: true })}
            onCerrar={() => setCampoModal(null)}
          />
        )}

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
                onChange={handleChange} disabled={!precioEditable} className={inputCls} />
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
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + ' mb-0'}>Notas</label>
              <button type="button" onClick={() => setCampoModal('notas')}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-amber-500 dark:text-zinc-500 dark:hover:text-amber-400 transition-colors">
                <FaExpandAlt className="h-2.5 w-2.5" /> Expandir
              </button>
            </div>
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

// ── Modal: campo de texto expandido (Detalle / Características) ───────────
function ModalCampoExpandido({ titulo, name, value, editando, guardando, onChange, onGuardar, onCerrar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCerrar}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">{titulo}</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors">
            <FaTimes className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            disabled={!editando}
            rows={14}
            autoFocus
            className={inputCls + ' resize-none leading-relaxed'}
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-zinc-800 flex-shrink-0">
          <button onClick={onCerrar}
            className="px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            Cerrar
          </button>
          {editando && (
            <button onClick={onGuardar} disabled={guardando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando ? <FaSpinner className="animate-spin h-3 w-3" /> : <FaSave className="h-3 w-3" />}
              Guardar y seguir escribiendo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Stock por depósito ───────────────────────────────────────────────
function TabStock({ idProducto, producto }) {
  const navigate = useNavigate();
  const [stock,       setStock]       = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [seriesInfo,  setSeriesInfo]  = useState({}); // id_deposito -> { cargado, total }
  const [panelDeposito, setPanelDeposito] = useState(null); // fila de stock con panel abierto, o null
  const [imprimiendo, setImprimiendo] = useState(null); // id_deposito en curso, o null

  // Etiquetas solo de ese depósito: una por cada serie cargada ahí, o
  // (si no tiene series) tantas copias en blanco como unidades totales.
  const imprimirDeposito = async (s) => {
    setImprimiendo(s.id_deposito);
    try {
      const { data } = await productosService.getSeriesProducto(idProducto, s.id_deposito, { incluirReservadas: true });
      const base = {
        nombre: producto.producto, detalle: producto.detalle, codigo_interno: producto.codigo_interno,
        marca: producto.marca_nombre, modelo: producto.modelo, color: producto.color, capacidad: producto.capacidad,
        copias: Math.max(1, Math.trunc(Number(s.cantidad)) || 1),
      };
      const etiqueta = data.series?.length ? { ...base, series: data.series } : base;
      navigate('/productos/etiquetas', { state: { etiquetas: [etiqueta] } });
    } catch {
      /* si falla la consulta de series, no navegamos */
    } finally {
      setImprimiendo(null);
    }
  };

  const cargarSeriesInfo = useCallback((filas) => {
    const conStock = filas.filter(s => Number(s.cantidad_disponible) > 0);
    if (conStock.length === 0) return;
    Promise.all(conStock.map(s =>
      productosService.getSeriesProducto(idProducto, s.id_deposito, { incluirReservadas: true })
        .then(({ data }) => ({ id_deposito: s.id_deposito, cargado: data.series.length, total: data.cantidad_stock }))
        .catch(() => null)
    )).then(resultados => {
      setSeriesInfo(prev => {
        const next = { ...prev };
        resultados.filter(Boolean).forEach(r => { next[r.id_deposito] = { cargado: r.cargado, total: r.total }; });
        return next;
      });
    });
  }, [idProducto]);

  const cargar = useCallback(() => {
    productosService.getStock(idProducto)
      .then(({ data }) => {
        setStock(data.stock);
        cargarSeriesInfo(data.stock);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [idProducto, cargarSeriesInfo]);

  useEffect(() => { cargar(); }, [cargar]);

  const total = stock.reduce((s, r) => s + Number(r.cantidad), 0);

  const celdaSeries = (s) => {
    const info = seriesInfo[s.id_deposito];
    const tieneStock = Number(s.cantidad_disponible) > 0;
    if (!tieneStock) return <span className="text-gray-300 dark:text-zinc-600 text-xs">—</span>;
    if (!info) return <FaSpinner className="animate-spin h-3 w-3 text-gray-300" />;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {info.cargado < info.total ? (
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
            {info.cargado}/{Math.trunc(info.total)} sin serie
          </span>
        ) : (
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
            Completo
          </span>
        )}
        <button onClick={() => setPanelDeposito(s)}
          className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline">
          Cargar series
        </button>
        <button onClick={() => imprimirDeposito(s)} disabled={imprimiendo === s.id_deposito}
          title="Imprimir QR de este depósito"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors disabled:opacity-50">
          {imprimiendo === s.id_deposito ? <FaSpinner className="animate-spin h-3.5 w-3.5" /> : <HiQrCode className="h-3.5 w-3.5" />}
          Imprimir QR
        </button>
      </div>
    );
  };

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
        <>
          {/* Vista tabla — escritorio */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800">
                  {['Depósito','Disponible','Reservada','Total','Últ. Movimiento','Series'].map(h => (
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
                    <td className="px-4 py-3 text-xs text-gray-400 dark:text-zinc-500">
                      {s.fecha_ult_movimiento
                        ? new Date(s.fecha_ult_movimiento).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Sin movimientos'}
                    </td>
                    <td className="px-4 py-3">{celdaSeries(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista tarjetas — móvil */}
          <div className="md:hidden divide-y divide-gray-50 dark:divide-zinc-800">
            {stock.map(s => (
              <div key={s.id_stock} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{s.deposito_nombre}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 font-mono">{s.deposito_codigo}</p>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                    {s.fecha_ult_movimiento
                      ? new Date(s.fecha_ult_movimiento).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Sin movimientos'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className={`font-bold ${Number(s.cantidad_disponible) > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    Disp: {Number(s.cantidad_disponible).toLocaleString('es-BO')}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Reserv: {Number(s.cantidad_reservada).toLocaleString('es-BO')}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Total: {Number(s.cantidad).toLocaleString('es-BO')}
                  </span>
                </div>
                {celdaSeries(s)}
              </div>
            ))}
          </div>
        </>
      )}

      {panelDeposito && (
        <PanelSeriesDeposito
          idProducto={idProducto}
          idDeposito={panelDeposito.id_deposito}
          depositoNombre={panelDeposito.deposito_nombre}
          cantidadTotal={Number(panelDeposito.cantidad)}
          onClose={(info) => {
            setSeriesInfo(prev => ({ ...prev, [panelDeposito.id_deposito]: info }));
            setPanelDeposito(null);
          }}
        />
      )}
    </div>
  );
}

// ── Panel lateral: cargar números de serie de stock antiguo ───────────────
function PanelSeriesDeposito({ idProducto, idDeposito, depositoNombre, cantidadTotal, onClose }) {
  const [cargando,    setCargando]    = useState(true);
  const [series,      setSeries]      = useState([]);
  const [total,       setTotal]       = useState(Math.trunc(cantidadTotal));
  const [numeroSerie, setNumeroSerie] = useState('');
  const [file,        setFile]        = useState(null);
  const [guardando,   setGuardando]   = useState(false);
  const [error,       setError]       = useState('');
  const [editandoId,  setEditandoId]  = useState(null);
  const [editValor,   setEditValor]   = useState('');
  const [editFile,    setEditFile]    = useState(null);
  const [editError,   setEditError]   = useState('');
  const [editGuardando, setEditGuardando] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null); // url de la foto en visor de pantalla completa, o null
  const [paginaSeries, setPaginaSeries] = useState(1);
  const POR_PAGINA_SERIES = 9;

  useEffect(() => {
    productosService.getSeriesProducto(idProducto, idDeposito, { incluirReservadas: true })
      .then(({ data }) => {
        setSeries(data.series);
        setTotal(Math.trunc(data.cantidad_stock));
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [idProducto, idDeposito]);

  const faltan = Math.max(total - series.length, 0);

  const agregar = async () => {
    if (!numeroSerie.trim()) {
      setError('Ingresá el número de serie');
      return;
    }
    setGuardando(true); setError('');
    try {
      const { data } = await productosService.cargarSerieManual(idProducto, idDeposito, numeroSerie.trim(), file);
      // El POST no devuelve imagen_url (a diferencia del equivalente de compras);
      // si se adjuntó foto, usamos un preview local inmediato en vez de "Sin foto"
      // hasta que se cierre/reabra el panel y el GET traiga la URL real.
      const previewUrl = file ? URL.createObjectURL(file) : null;
      setSeries(prev => {
        const next = [...prev, { id_serie: data.id_serie, numero_serie: data.numero_serie, imagen_url: previewUrl, _preview: !!previewUrl }];
        setPaginaSeries(Math.ceil(next.length / POR_PAGINA_SERIES));
        return next;
      });
      setNumeroSerie(''); setFile(null);
    } catch (err) {
      setError(err.response?.data?.mensaje || err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const cerrar = () => onClose({ cargado: series.length, total });

  const iniciarEdicion = (s) => {
    setEditandoId(s.id_serie);
    setEditValor(s.numero_serie);
    setEditFile(null);
    setEditError('');
  };

  const cancelarEdicion = () => {
    setEditandoId(null); setEditFile(null); setEditError('');
  };

  const guardarEdicion = async (idSerie) => {
    if (!editValor.trim()) { setEditError('Ingresá el número de serie'); return; }
    setEditGuardando(true); setEditError('');
    try {
      const { data } = await productosService.editarSerieManual(idProducto, idSerie, editValor.trim(), editFile);
      const previewUrl = editFile ? URL.createObjectURL(editFile) : null;
      setSeries(prev => prev.map(s => s.id_serie !== idSerie ? s : {
        ...s,
        numero_serie: data.numero_serie,
        imagen_url: previewUrl ?? s.imagen_url,
        _preview: previewUrl ? true : s._preview,
      }));
      setEditandoId(null); setEditFile(null);
    } catch (err) {
      setEditError(err.response?.data?.mensaje || err.response?.data?.error || 'Error al editar');
    } finally {
      setEditGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={cerrar}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-lg max-h-[85vh] bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Números de serie</h3>
            <p className="text-xs text-gray-400 dark:text-zinc-500">{depositoNombre}</p>
          </div>
          <button onClick={cerrar} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors">
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center flex-1 text-gray-400 py-12">
            <FaSpinner className="animate-spin h-5 w-5" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Progreso */}
            <div>
              <div className="flex items-center justify-between mb-1 text-xs text-gray-500 dark:text-zinc-400">
                <span>{series.length} / {total} con serie cargada</span>
                <span className={series.length === total ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                  {series.length === total ? 'Completo' : `Faltan ${total - series.length}`}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                <div className="h-full bg-amber-400 transition-all"
                  style={{ width: `${total > 0 ? Math.min(100, (series.length / total) * 100) : 0}%` }} />
              </div>
            </div>

            {/* Series ya cargadas */}
            {series.length > 0 && (
              <div className="space-y-2">
              <div className="grid grid-cols-3 gap-3">
                {series.slice((paginaSeries - 1) * POR_PAGINA_SERIES, paginaSeries * POR_PAGINA_SERIES).map(s => {
                  // Las series recién guardadas en esta sesión llevan un preview
                  // local (blob:) en vez de la URL del servidor — no pasarlo por
                  // buildImgUrl, que le agregaría el prefijo del backend.
                  const url = s.imagen_url ? (s._preview ? s.imagen_url : buildImgUrl(s.imagen_url)) : null;
                  const editandoEsta = editandoId === s.id_serie;
                  return (
                    <div key={s.id_serie} className="flex flex-col items-center">
                      {url ? (
                        <img src={url} alt="N° serie" className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-zinc-700" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg border border-dashed border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-300 dark:text-zinc-600 text-[10px] text-center">
                          Sin foto
                        </div>
                      )}
                      {editandoEsta ? (
                        <div className="mt-1.5 w-full flex flex-col items-center gap-1">
                          <input type="text" value={editValor} onChange={e => setEditValor(e.target.value)}
                            disabled={editGuardando} autoFocus
                            className="w-full px-1.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 text-xs font-mono text-center bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                          <label className={`text-[10px] font-semibold cursor-pointer text-amber-600 dark:text-amber-400 hover:underline ${editGuardando ? 'opacity-50 pointer-events-none' : ''}`}>
                            {editFile ? 'Foto nueva ✓' : (url ? 'Cambiar foto' : 'Agregar foto')}
                            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={editGuardando}
                              onChange={e => setEditFile(e.target.files?.[0] ?? null)} />
                          </label>
                          <div className="flex gap-1.5">
                            <button onClick={() => guardarEdicion(s.id_serie)} disabled={editGuardando}
                              className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50">
                              {editGuardando ? 'Guardando…' : 'Guardar'}
                            </button>
                            <button onClick={cancelarEdicion} disabled={editGuardando}
                              className="text-[10px] text-gray-400 hover:underline disabled:opacity-50">
                              Cancelar
                            </button>
                          </div>
                          {editError && <p className="text-[10px] text-red-500 text-center">{editError}</p>}
                        </div>
                      ) : (
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                          <span className="font-mono text-xs text-gray-600 dark:text-zinc-300 text-center break-all">{s.numero_serie}</span>
                          <div className="flex items-center gap-1.5">
                            {url && (
                              <button onClick={() => setFotoAmpliada(url)}
                                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0">
                                Ver foto
                              </button>
                            )}
                            <button onClick={() => iniciarEdicion(s)}
                              className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline shrink-0">
                              Editar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {series.length > POR_PAGINA_SERIES && (
                <div className="flex items-center justify-between pt-1">
                  <button onClick={() => setPaginaSeries(p => Math.max(1, p - 1))} disabled={paginaSeries === 1}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed hover:underline">
                    ← Anterior
                  </button>
                  <span className="text-xs text-gray-400 dark:text-zinc-500">
                    Página {paginaSeries} / {Math.ceil(series.length / POR_PAGINA_SERIES)}
                  </span>
                  <button onClick={() => setPaginaSeries(p => Math.min(Math.ceil(series.length / POR_PAGINA_SERIES), p + 1))}
                    disabled={paginaSeries >= Math.ceil(series.length / POR_PAGINA_SERIES)}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed hover:underline">
                    Siguiente →
                  </button>
                </div>
              )}
              </div>
            )}

            {/* Alta: un solo formulario reutilizable, guardado parcial por alta */}
            {faltan > 0 ? (
              <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Agregar número de serie</p>
                <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-zinc-800/60 rounded-xl p-2.5">
                  <input
                    type="text"
                    value={numeroSerie}
                    onChange={e => setNumeroSerie(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !guardando) agregar(); }}
                    placeholder="N° de serie"
                    disabled={guardando}
                    autoFocus
                    className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <label className={`text-xs font-semibold cursor-pointer text-amber-600 dark:text-amber-400 hover:underline ${guardando ? 'opacity-50 pointer-events-none' : ''}`}>
                    {file ? 'Foto ✓' : 'Agregar foto'}
                    <input type="file" accept="image/*" capture="environment" className="hidden" disabled={guardando}
                      onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  </label>
                  <button onClick={agregar} disabled={guardando}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 text-xs font-semibold disabled:opacity-50 transition-colors">
                    {guardando ? <FaSpinner className="animate-spin h-3 w-3" /> : 'Guardar'}
                  </button>
                  {error && <p className="w-full text-xs text-red-500">{error}</p>}
                </div>
                <p className="text-xs text-gray-400 dark:text-zinc-500">Faltan {faltan} unidad{faltan === 1 ? '' : 'es'} por cargar.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-4">Todas las unidades tienen número de serie.</p>
            )}
          </div>
        )}
      </div>

      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <button
            onClick={() => setFotoAmpliada(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <FaTimes className="h-6 w-6" />
          </button>
          <img src={fotoAmpliada} alt="Foto del número de serie" className="max-w-full max-h-full rounded-lg object-contain" />
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

// ── Galería de imágenes ───────────────────────────────────────────────────
function GaleriaImagenes({ idProducto, puedeEditar }) {
  const imgRef         = useRef(null);
  const [imagenes,     setImagenes]    = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [subiendo,     setSubiendo]    = useState(false);

  const cargar = useCallback(() => {
    productosService.getImagenes(idProducto)
      .then(({ data }) => {
        setImagenes(data.imagenes);
        const principal = data.imagenes.find(i => i.es_principal) ?? data.imagenes[0] ?? null;
        setSeleccionada(principal);
      })
      .catch(() => {});
  }, [idProducto]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleSubir = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setSubiendo(true);
    try {
      await productosService.uploadImagen(idProducto, file);
      cargar();
    } catch { /* silencioso */ }
    finally { setSubiendo(false); }
  };

  const handlePrincipal = async (img) => {
    try {
      await productosService.setPrincipalImagen(idProducto, img.id_imagen);
      cargar();
    } catch { /* silencioso */ }
  };

  const handleEliminar = async (img) => {
    if (!window.confirm('¿Eliminar esta imagen?')) return;
    try {
      await productosService.deleteImagen(idProducto, img.id_imagen);
      cargar();
    } catch { /* silencioso */ }
  };

  const imgSel = seleccionada ? buildImgUrl(seleccionada.imagen_url) : null;

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-shrink-0">
      {/* Imagen principal */}
      <div className="relative w-full sm:w-48 h-36 rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
        {imgSel
          ? <img src={imgSel} alt="principal" className="w-full h-full object-cover" />
          : <FaBoxOpen className="h-10 w-10 text-gray-300 dark:text-zinc-600" />
        }
      </div>

      {/* Miniaturas + botón agregar */}
      <div className="flex gap-1.5 flex-wrap">
        {imagenes.map(img => {
          const url    = buildImgUrl(img.imagen_url);
          const activa = seleccionada?.id_imagen === img.id_imagen;
          return (
            <div
              key={img.id_imagen}
              className={`relative group w-12 h-12 rounded-lg overflow-hidden border-2 cursor-pointer flex-shrink-0 transition-all ${activa ? 'border-amber-400' : 'border-gray-200 dark:border-zinc-700'}`}
              onClick={() => setSeleccionada(img)}
            >
              {url
                ? <img src={url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gray-200 dark:bg-zinc-700" />
              }
              {/* Badge estrella */}
              {img.es_principal === 1 && (
                <span className="absolute top-0.5 left-0.5 text-amber-400 text-[9px]"><FaStar /></span>
              )}
              {/* Acciones en hover */}
              {puedeEditar && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5 items-center justify-center">
                  {img.es_principal !== 1 && (
                    <button
                      title="Marcar como principal"
                      onClick={e => { e.stopPropagation(); handlePrincipal(img); }}
                      className="text-amber-300 hover:text-amber-200 text-[10px]"
                    ><FaStar /></button>
                  )}
                  <button
                    title="Eliminar imagen"
                    onClick={e => { e.stopPropagation(); handleEliminar(img); }}
                    className="text-red-400 hover:text-red-300 text-[10px]"
                  ><FaTrash /></button>
                </div>
              )}
            </div>
          );
        })}

        {/* Botón agregar */}
        {puedeEditar && (
          <>
            <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleSubir} />
            <button
              onClick={() => imgRef.current?.click()}
              disabled={subiendo}
              className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 dark:border-zinc-600 flex items-center justify-center text-gray-400 dark:text-zinc-500 hover:border-amber-400 hover:text-amber-400 transition-colors disabled:opacity-50 flex-shrink-0"
              title="Agregar imagen"
            >
              {subiendo ? <FaSpinner className="animate-spin h-3.5 w-3.5" /> : <FaPlus className="h-3.5 w-3.5" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── ProductoDetalle ───────────────────────────────────────────────────────
export default function ProductoDetalle() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { puede }   = usePermission();
  const [producto,   setProducto]  = useState(null);
  const [cargando,   setCargando]  = useState(true);
  const [tabActivo,  setTabActivo] = useState(0);

  const TABS = ['Datos Generales', 'Stock', 'Histórico Precios'];

  const cargarProducto = useCallback(() => {
    productosService.getOne(id)
      .then(({ data }) => setProducto(data.producto))
      .catch(() => navigate('/productos'))
      .finally(() => setCargando(false));
  }, [id, navigate]);

  useEffect(() => { cargarProducto(); }, [cargarProducto]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <FaSpinner className="animate-spin h-7 w-7" />
      </div>
    );
  }

  if (!producto) return null;

  const costo_total = Number(producto.costo_mcm);
  const utilidad    = Number(producto.precio_publico) - costo_total - Number(producto.bono || 0);

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
          <div className="flex items-start gap-4 flex-wrap">
            {/* Galería de imágenes */}
            <GaleriaImagenes idProducto={id} puedeEditar={puede('editar', 'productos')} />

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
      {tabActivo === 1 && <TabStock idProducto={id} producto={producto} />}
      {tabActivo === 2 && puede('ver_historico_precios', 'productos') && <TabHistorico idProducto={id} />}
    </div>
  );
}
