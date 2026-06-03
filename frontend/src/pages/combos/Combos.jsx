import { useState, useEffect, useMemo } from 'react';
import { combosService } from '../../services/combosPromos.service';
import { productosService } from '../../services/productos.service';

const EMPTY_FORM = {
  nombre: '', descripcion: '',
  precio_combo: '', fecha_inicio: '', fecha_fin: '',
  imagen_url: '', activo: true,
};

function Badge({ activo }) {
  return activo
    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Activo</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">Inactivo</span>;
}

function fmtFecha(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtPrecio(v) {
  if (v == null) return '—';
  return `Bs. ${parseFloat(v).toFixed(2)}`;
}

function vigenciaLabel(fi, ff) {
  if (!fi && !ff) return '—';
  return `${fmtFecha(fi)} → ${fmtFecha(ff)}`;
}

export default function Combos() {
  const [combos, setCombos]           = useState([]);
  const [productos, setProductos]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');

  // Modal principal
  const [showModal, setShowModal]     = useState(false);
  const [editando, setEditando]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [detalle, setDetalle]         = useState([]); // [{id_producto, cantidad, producto_nombre, ...}]
  const [saving, setSaving]           = useState(false);
  const [formErr, setFormErr]         = useState('');

  // Búsqueda de producto dentro del modal
  const [prodSearch, setProdSearch]   = useState('');

  // Modal confirmar baja
  const [showConfirm, setShowConfirm] = useState(false);
  const [comboABajar, setComboABajar] = useState(null);

  useEffect(() => {
    load();
    productosService.getAll().then(r => {
      const all = r.data.productos ?? r.data ?? [];
      setProductos(all.filter(p => p.activo));
    }).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await combosService.getAll();
      setCombos(r.data.combos ?? []);
    } catch {
      setError('Error al cargar combos');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = combos;
    if (filtroActivo === 'activos')   list = list.filter(c => c.activo);
    if (filtroActivo === 'inactivos') list = list.filter(c => !c.activo);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        c.codigo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [combos, search, filtroActivo]);

  const prodsFiltrados = useMemo(() => {
    if (!prodSearch) return productos.slice(0, 30);
    const q = prodSearch.toLowerCase();
    return productos
      .filter(p =>
        (p.producto || '').toLowerCase().includes(q) ||
        p.codigo_interno?.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [productos, prodSearch]);

  // ── Modal helpers ────────────────────────────────────────────────────────

  const openNuevo = () => {
    setEditando(null);
    setForm(EMPTY_FORM);
    setDetalle([]);
    setProdSearch('');
    setFormErr('');
    setShowModal(true);
  };

  const openEditar = async (combo) => {
    setEditando(combo);
    setForm({
      codigo:       combo.codigo,
      nombre:       combo.nombre,
      descripcion:  combo.descripcion || '',
      precio_combo: combo.precio_combo,
      fecha_inicio: combo.fecha_inicio ? combo.fecha_inicio.slice(0, 10) : '',
      fecha_fin:    combo.fecha_fin    ? combo.fecha_fin.slice(0, 10)    : '',
      imagen_url:   combo.imagen_url   || '',
      activo:       !!combo.activo,
    });
    setFormErr('');
    setProdSearch('');
    // Cargar detalle
    try {
      const r = await combosService.getDetalle(combo.id_combo);
      setDetalle(r.data.detalle ?? []);
    } catch {
      setDetalle([]);
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditando(null); };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  // Agregar producto al detalle local
  const agregarProducto = (prod) => {
    if (detalle.some(d => d.id_producto === prod.id_producto)) return;
    setDetalle(prev => [...prev, {
      id_producto:      prod.id_producto,
      producto_nombre:  prod.producto,
      codigo_interno:   prod.codigo_interno,
      precio_publico:   prod.precio_publico,
      cantidad:         1,
    }]);
    setProdSearch('');
  };

  const cambiarCantidad = (id, val) => {
    setDetalle(prev => prev.map(d =>
      d.id_producto === id ? { ...d, cantidad: parseFloat(val) || 1 } : d
    ));
  };

  const quitarProducto = (id) => {
    setDetalle(prev => prev.filter(d => d.id_producto !== id));
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) return setFormErr('El nombre es requerido');
    if (!form.precio_combo)  return setFormErr('El precio es requerido');
    setFormErr('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        precio_combo: parseFloat(form.precio_combo),
        detalle: detalle.map(d => ({ id_producto: d.id_producto, cantidad: d.cantidad })),
      };
      if (editando) {
        await combosService.update(editando.id_combo, payload);
        // Actualizar productos por separado
        await combosService.updateDetalle(editando.id_combo, {
          detalle: detalle.map(d => ({ id_producto: d.id_producto, cantidad: d.cantidad })),
        });
      } else {
        await combosService.create(payload);
      }
      closeModal();
      load();
    } catch (err) {
      setFormErr(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const confirmarBaja = (combo) => { setComboABajar(combo); setShowConfirm(true); };
  const ejecutarBaja  = async () => {
    if (!comboABajar) return;
    try {
      await combosService.remove(comboABajar.id_combo);
      setShowConfirm(false);
      setComboABajar(null);
      load();
    } catch {
      setShowConfirm(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Combos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Packs de productos con precio especial</p>
        </div>
        <button
          onClick={openNuevo}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Combo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o código..."
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <select
          value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Cargando...
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 dark:text-gray-500">No se encontraron combos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
              <thead className="bg-gray-50 dark:bg-zinc-800/60">
                <tr>
                  {['Código','Nombre','Precio combo','Vigencia','Productos','Estado','Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {filtered.map(c => (
                  <tr key={c.id_combo} className="hover:bg-amber-50/40 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg">{c.codigo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{c.nombre}</p>
                      {c.descripcion && <p className="text-xs text-gray-400 truncate max-w-xs">{c.descripcion}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-amber-600 dark:text-amber-400">{fmtPrecio(c.precio_combo)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{vigenciaLabel(c.fecha_inicio, c.fecha_fin)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold">{c.total_productos ?? 0}</span>
                    </td>
                    <td className="px-4 py-3"><Badge activo={c.activo} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditar(c)} title="Editar"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        {c.activo ? (
                          <button onClick={() => confirmarBaja(c)} title="Desactivar"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal crear/editar ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editando ? 'Editar Combo' : 'Nuevo Combo'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {/* Datos básicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {editando && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Código</label>
                    <p className="px-3 py-2 rounded-xl text-sm font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30">{editando.codigo}</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange}
                    placeholder="Pack Cocina Completa"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Precio combo (Bs.) *</label>
                  <input name="precio_combo" type="number" min="0" step="0.01" value={form.precio_combo} onChange={handleChange}
                    placeholder="1500.00"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">URL imagen</label>
                  <input name="imagen_url" value={form.imagen_url} onChange={handleChange}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Fecha inicio</label>
                  <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Fecha fin</label>
                  <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Descripción</label>
                  <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
                    placeholder="Descripción opcional del combo..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"/>
                </div>
                {editando && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="activo" name="activo" checked={form.activo} onChange={handleChange}
                      className="w-4 h-4 rounded accent-amber-500"/>
                    <label htmlFor="activo" className="text-sm text-gray-700 dark:text-gray-300">Activo</label>
                  </div>
                )}
              </div>

              {/* Sección productos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Productos del combo</h3>
                  <span className="text-xs text-gray-400">{detalle.length} producto{detalle.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Buscador de producto */}
                <div className="relative mb-3">
                  <input
                    value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                    placeholder="Buscar producto por nombre o código..."
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  {prodSearch && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-lg max-h-44 overflow-y-auto">
                      {prodsFiltrados.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
                      ) : prodsFiltrados.map(p => (
                        <button key={p.id_producto}
                          onClick={() => agregarProducto(p)}
                          disabled={detalle.some(d => d.id_producto === p.id_producto)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-between gap-2"
                        >
                          <span>
                            <span className="font-mono text-xs text-amber-600 dark:text-amber-400 mr-2">{p.codigo_interno}</span>
                            <span className="text-gray-800 dark:text-gray-200">{p.producto}</span>
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">Bs. {parseFloat(p.precio_publico ?? 0).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lista de productos del combo */}
                {detalle.length === 0 ? (
                  <p className="text-center py-4 text-xs text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl">
                    Busca y agrega productos al combo
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detalle.map(d => (
                      <div key={d.id_producto} className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.producto_nombre}</p>
                          <p className="text-xs text-gray-400">{d.codigo_interno} · Bs. {parseFloat(d.precio_publico ?? 0).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-xs text-gray-500 dark:text-gray-400">Cant.</label>
                          <input
                            type="number" min="1" step="1"
                            value={d.cantidad}
                            onChange={e => cambiarCantidad(d.id_producto, e.target.value)}
                            className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <button onClick={() => quitarProducto(d.id_producto)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formErr && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{formErr}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-zinc-800">
              <button onClick={closeModal}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-medium text-sm transition-colors">
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear Combo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar baja ─────────────────────────────────────────── */}
      {showConfirm && comboABajar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Desactivar combo</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">¿Desactivar <span className="font-medium">{comboABajar.nombre}</span>?</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
              <button onClick={ejecutarBaja}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors">
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
