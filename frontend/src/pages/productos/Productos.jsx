import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiPlus, HiArrowPath, HiArchiveBox, HiEye, HiTrash, HiQrCode,
} from 'react-icons/hi2';
import { productosService } from '../../services/productos.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import api from '../../api/axios';

const inputCls  = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors';
const labelCls  = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';
const selectCls = inputCls;

const EMPTY = {
  id_marca: '', id_categoria: '', id_unidad: '', id_moneda_costo: '',
  producto: '', detalle: '', capacidad: '', caracteristicas: '', modelo: '', color: '',
  precio_real: '', costo_logistica: 0, costo_mcm: 0, precio_publico: '',
  bono: 0, precio_mayor: 0, id_proveedor_default: '',
  stock_minimo: 0, stock_maximo: 0, notas: '',
};

export default function Productos() {
  const navigate    = useNavigate();
  const { puede }   = usePermission();

  const [lista,      setLista]      = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [busqueda,   setBusqueda]   = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroCateg, setFiltroCateg] = useState('');

  const [modal,      setModal]      = useState(false);
  const [confirm,    setConfirm]    = useState(null);
  const [form,       setForm]       = useState(EMPTY);
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState(null);

  const [marcas,     setMarcas]     = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades,   setUnidades]   = useState([]);
  const [monedas,    setMonedas]    = useState([]);
  const [proveedores,setProveedores]= useState([]);

  const [seleccionados, setSeleccionados] = useState(new Set());

  const toggleSeleccion = (id) =>
    setSeleccionados(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const toggleTodos = () =>
    setSeleccionados(prev =>
      prev.size === visibles.length
        ? new Set()
        : new Set(visibles.map(p => p.id_producto))
    );

  const imprimirEtiquetas = () => {
    const etiquetas = lista
      .filter(p => seleccionados.has(p.id_producto))
      .map(p => ({ nombre: p.producto, codigo_interno: p.codigo_interno, copias: 1 }));
    navigate('/productos/etiquetas', { state: { etiquetas } });
  };

  const cargar = () => {
    setCargando(true);
    productosService.getAll()
      .then(({ data }) => setLista(data.productos))
      .catch(() => setError('Error al cargar productos'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    Promise.all([
      api.get('/marcas'),
      api.get('/categorias'),
      api.get('/unidades'),
      api.get('/monedas'),
      api.get('/proveedores'),
    ]).then(([m, c, u, mo, p]) => {
      setMarcas(m.data.marcas?.filter(x => x.activo) ?? []);
      setCategorias(c.data.categorias?.filter(x => x.activo) ?? []);
      setUnidades(u.data.unidades?.filter(x => x.activo) ?? []);
      setMonedas(mo.data.monedas?.filter(x => x.activo) ?? []);
      setProveedores(p.data.proveedores?.filter(x => x.activo) ?? []);
    });
  }, []);

  const marcasUnicas     = [...new Set(lista.map(p => p.marca_nombre))].filter(Boolean).sort();
  const categoriasUnicas = [...new Set(lista.map(p => p.categoria_nombre))].filter(Boolean).sort();

  const visibles = lista.filter(p => {
    const q = busqueda.toLowerCase();
    const coincide = !q ||
      p.codigo_interno.toLowerCase().includes(q) ||
      p.producto.toLowerCase().includes(q) ||
      (p.modelo || '').toLowerCase().includes(q) ||
      (p.detalle || '').toLowerCase().includes(q) ||
      p.marca_nombre.toLowerCase().includes(q);
    const marcaOk = !filtroMarca || p.marca_nombre === filtroMarca;
    const categOk = !filtroCateg || p.categoria_nombre === filtroCateg;
    return coincide && marcaOk && categOk;
  });

  const abrirCrear  = () => { setForm(EMPTY); setError(null); setModal(true); };
  const cerrarModal = () => { setModal(false); setError(null); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await productosService.create(form);
      cerrarModal();
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await productosService.remove(id);
      setConfirm(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desactivar');
      setConfirm(null);
    }
  };

  const puedeCrear    = puede('crear',    'productos');
  const puedeEliminar = puede('eliminar', 'productos');

  const bs = (v) => `Bs ${Number(v ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Catálogo de productos con precios y stock"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {seleccionados.size > 0 && (
              <button onClick={imprimirEtiquetas}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white shadow-sm transition-all">
                <HiQrCode className="h-4 w-4" />
                <span className="hidden sm:inline">Imprimir QR</span>
                <span>({seleccionados.size})</span>
              </button>
            )}
            {puedeCrear && (
              <button onClick={abrirCrear}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-sm transition-all">
                <HiPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo producto</span>
              </button>
            )}
          </div>
        }
      />

      {error && !modal && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {/* Filtros */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por código, nombre, modelo o marca..."
          className={inputCls + ' flex-1'}
        />
        <select value={filtroMarca} onChange={e => setFiltroMarca(e.target.value)} className={selectCls + ' sm:w-40'}>
          <option value="">Todas las marcas</option>
          {marcasUnicas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroCateg} onChange={e => setFiltroCateg(e.target.value)} className={selectCls + ' sm:w-40'}>
          <option value="">Todas las categorías</option>
          {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <HiArrowPath className="animate-spin h-6 w-6" />
        </div>
      ) : visibles.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl">
          <HiArchiveBox className="h-10 w-10 mx-auto mb-3 opacity-25" />
          <p className="text-sm">{busqueda || filtroMarca || filtroCateg ? 'Sin resultados para los filtros aplicados' : 'No hay productos registrados'}</p>
        </div>
      ) : (
        <>
          {/* Vista tabla — md en adelante */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-800/40">
                    <th className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={visibles.length > 0 && seleccionados.size === visibles.length}
                        onChange={toggleTodos}
                        className="rounded border-gray-300 dark:border-zinc-600 text-amber-500 focus:ring-amber-400"
                      />
                    </th>
                    {['Código', 'Producto', 'Marca / Cat.', 'Modelo', 'Precios', 'Stock', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {visibles.map(p => (
                    <tr key={p.id_producto} className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors ${seleccionados.has(p.id_producto) ? 'bg-amber-50/60 dark:bg-amber-500/5' : ''}`}>
                      <td className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={seleccionados.has(p.id_producto)}
                          onChange={() => toggleSeleccion(p.id_producto)}
                          className="rounded border-gray-300 dark:border-zinc-600 text-amber-500 focus:ring-amber-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">{p.codigo_interno}</span>
                        {p.codigo_barras && <p className="text-xs text-gray-400 dark:text-zinc-600 font-mono">{p.codigo_barras}</p>}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{p.producto}</p>
                        {p.detalle && <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{p.detalle}</p>}
                        {p.capacidad && <p className="text-xs text-gray-400 dark:text-zinc-500">{p.capacidad}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">{p.marca_nombre}</p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500">{p.categoria_nombre}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400">
                        {p.modelo || <span className="text-gray-300 dark:text-zinc-600">—</span>}
                        {p.color && <p className="text-gray-400 dark:text-zinc-500">{p.color}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{bs(p.precio_publico)}</p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500">Costo: {bs(p.costo_total)}</p>
                        {p.bono > 0 && <p className="text-xs text-emerald-600 dark:text-emerald-400">Bono: {bs(p.bono)}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {Number(p.stock_total) > 0 ? (
                          <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                            {Number(p.stock_total).toLocaleString('es-BO')}
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => navigate('/productos/etiquetas', { state: { etiquetas: [{ nombre: p.producto, codigo_interno: p.codigo_interno, copias: 1 }] } })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                            title="Imprimir etiqueta QR">
                            <HiQrCode className="h-4 w-4" />
                          </button>
                          <button onClick={() => navigate(`/productos/${p.id_producto}`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                            title="Ver detalle">
                            <HiEye className="h-4 w-4" />
                          </button>
                          {puedeEliminar && p.activo && (
                            <button onClick={() => setConfirm(p)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              title="Desactivar">
                              <HiTrash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista cards — móvil */}
          <div className="md:hidden space-y-2">
            {/* Seleccionar todos */}
            <label className="flex items-center gap-2 px-1 py-1 text-xs text-gray-500 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={visibles.length > 0 && seleccionados.size === visibles.length}
                onChange={toggleTodos}
                className="rounded border-gray-300 dark:border-zinc-600 text-amber-500 focus:ring-amber-400"
              />
              Seleccionar todos ({visibles.length})
            </label>

            {visibles.map(p => (
              <div key={p.id_producto}
                className={`bg-white dark:bg-zinc-900 border rounded-xl p-3 transition-colors ${seleccionados.has(p.id_producto) ? 'border-amber-300 dark:border-amber-500/50 bg-amber-50/40 dark:bg-amber-500/5' : 'border-gray-200 dark:border-zinc-800'}`}>
                {/* Fila superior: checkbox + código + estado */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={seleccionados.has(p.id_producto)}
                      onChange={() => toggleSeleccion(p.id_producto)}
                      className="rounded border-gray-300 dark:border-zinc-600 text-amber-500 focus:ring-amber-400 mt-0.5"
                    />
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">{p.codigo_interno}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    {Number(p.stock_total) > 0 ? (
                      <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                        {Number(p.stock_total).toLocaleString('es-BO')} uds
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">Sin stock</span>
                    )}
                  </div>
                </div>

                {/* Nombre + detalle */}
                <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{p.producto}</p>
                {p.detalle && <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{p.detalle}{p.capacidad ? ` · ${p.capacidad}` : ''}</p>}

                {/* Marca / Categoría / Modelo */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500 dark:text-zinc-400">
                  <span>{p.marca_nombre}</span>
                  {p.categoria_nombre && <span className="text-gray-300 dark:text-zinc-600">·</span>}
                  {p.categoria_nombre && <span>{p.categoria_nombre}</span>}
                  {p.modelo && <span className="text-gray-300 dark:text-zinc-600">·</span>}
                  {p.modelo && <span>{p.modelo}</span>}
                </div>

                {/* Precios + acciones */}
                <div className="flex items-end justify-between mt-2.5 pt-2.5 border-t border-gray-100 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{bs(p.precio_publico)}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500">Costo: {bs(p.costo_total)}</p>
                    {p.bono > 0 && <p className="text-xs text-emerald-600 dark:text-emerald-400">Bono: {bs(p.bono)}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate('/productos/etiquetas', { state: { etiquetas: [{ nombre: p.producto, codigo_interno: p.codigo_interno, copias: 1 }] } })}
                      className="p-2 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                      title="Imprimir etiqueta QR">
                      <HiQrCode className="h-4 w-4" />
                    </button>
                    <button onClick={() => navigate(`/productos/${p.id_producto}`)}
                      className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                      title="Ver detalle">
                      <HiEye className="h-4 w-4" />
                    </button>
                    {puedeEliminar && p.activo && (
                      <button onClick={() => setConfirm(p)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        title="Desactivar">
                        <HiTrash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal crear producto */}
      <Modal open={modal} onClose={cerrarModal} title="Nuevo Producto" maxWidth="max-w-3xl">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Marca *</label>
              <select name="id_marca" value={form.id_marca} onChange={handleChange} required className={selectCls}>
                <option value="">Seleccionar marca</option>
                {marcas.map(m => <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Categoría *</label>
              <select name="id_categoria" value={form.id_categoria} onChange={handleChange} required className={selectCls}>
                <option value="">Seleccionar categoría</option>
                {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Unidad de medida *</label>
              <select name="id_unidad" value={form.id_unidad} onChange={handleChange} required className={selectCls}>
                <option value="">Seleccionar unidad</option>
                {unidades.map(u => <option key={u.id_unidad} value={u.id_unidad}>{u.nombre} ({u.simbolo})</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Moneda de costo *</label>
              <select name="id_moneda_costo" value={form.id_moneda_costo} onChange={handleChange} required className={selectCls}>
                <option value="">Seleccionar moneda</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Proveedor default</label>
              <select name="id_proveedor_default" value={form.id_proveedor_default} onChange={handleChange} className={selectCls}>
                <option value="">Sin proveedor</option>
                {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.razon_social}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Nombre del producto *</label>
            <input name="producto" value={form.producto} onChange={handleChange} required
              className={inputCls} placeholder="Ej: COCINA DE PISO" style={{ textTransform: 'uppercase' }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Detalle</label>
              <input name="detalle" value={form.detalle} onChange={handleChange}
                className={inputCls} placeholder="Ej: 4H MESA VIDRIO E.E. GRILL ELEC." />
            </div>
            <div>
              <label className={labelCls}>Capacidad</label>
              <input name="capacidad" value={form.capacidad} onChange={handleChange}
                className={inputCls} placeholder="Ej: 60 CM, 2 Lts" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Modelo</label>
              <input name="modelo" value={form.modelo} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Color</label>
              <input name="color" value={form.color} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Características</label>
              <input name="caracteristicas" value={form.caracteristicas} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          {/* Precios */}
          <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Precios y costos</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Real (costo) *</label>
                <input name="precio_real" type="number" step="0.01" min="0" value={form.precio_real} onChange={handleChange} required
                  className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Logística (LOG)</label>
                <input name="costo_logistica" type="number" step="0.01" min="0" value={form.costo_logistica} onChange={handleChange}
                  className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>MCM</label>
                <input name="costo_mcm" type="number" step="0.01" min="0" value={form.costo_mcm} onChange={handleChange}
                  className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Precio público *</label>
                <input name="precio_publico" type="number" step="0.01" min="0" value={form.precio_publico} onChange={handleChange} required
                  className={inputCls} placeholder="0.00" />
              </div>
            </div>

            {/* Resumen en tiempo real */}
            {(() => {
              const costoTotal = Number(form.costo_mcm || 0);
              const utilidad   = Number(form.precio_publico || 0) - costoTotal - Number(form.bono || 0);
              const margen     = costoTotal > 0 ? (utilidad / costoTotal) * 100 : 0;
              const fmt = v => `Bs ${Number(v).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
              return (
                <div className="grid grid-cols-3 gap-3 mt-3 p-3 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-100 dark:border-amber-500/20">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-0.5">Costo total</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(costoTotal)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-0.5">Utilidad</p>
                    <p className={`text-sm font-bold ${utilidad >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {fmt(utilidad)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-0.5">Margen</p>
                    <p className={`text-sm font-bold ${margen >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {margen.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className={labelCls}>Precio mayorista</label>
                <input name="precio_mayor" type="number" step="0.01" min="0" value={form.precio_mayor} onChange={handleChange}
                  className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Bono vendedor</label>
                <input name="bono" type="number" step="0.01" min="0" value={form.bono} onChange={handleChange}
                  className={inputCls} placeholder="0.00" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className={labelCls}>Stock mínimo</label>
                  <input name="stock_minimo" type="number" step="0.01" min="0" value={form.stock_minimo} onChange={handleChange} className={inputCls} />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Stock máximo</label>
                  <input name="stock_maximo" type="number" step="0.01" min="0" value={form.stock_maximo} onChange={handleChange} className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrarModal}
              className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <HiArrowPath className="animate-spin h-4 w-4" />}
              Crear producto
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmación desactivar */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar Producto" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Desactivar el producto <strong className="text-gray-900 dark:text-white">{confirm?.producto}</strong> ({confirm?.codigo_interno})?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button onClick={() => handleEliminar(confirm.id_producto)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">
            Desactivar
          </button>
        </div>
      </Modal>

    </div>
  );
}
