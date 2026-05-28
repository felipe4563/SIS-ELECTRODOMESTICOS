import { useState, useEffect, useMemo } from 'react';
import { promocionesService } from '../../services/combosPromos.service';
import { productosService }   from '../../services/productos.service';
import { marcasService }      from '../../services/catalogo.service';
import { categoriasService }  from '../../services/catalogo.service';

const TIPOS_DESCUENTO = ['PORCENTAJE', 'MONTO_FIJO'];
const APLICA_A        = ['PRODUCTO', 'CATEGORIA', 'MARCA', 'TODOS'];

const APLICA_LABEL = {
  PRODUCTO:  { label: 'Producto',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  CATEGORIA: { label: 'Categoría',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  MARCA:     { label: 'Marca',      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  TODOS:     { label: 'Todos',      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
};

const EMPTY_FORM = {
  codigo: '', nombre: '', descripcion: '',
  tipo_descuento: 'PORCENTAJE', valor_descuento: '',
  fecha_inicio: '', fecha_fin: '',
  cantidad_minima: '1', aplica_a: 'PRODUCTO',
  activo: true,
};

function fmtFecha(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function vigenciaLabel(fi, ff) {
  const hoy = new Date().toISOString().slice(0, 10);
  const vigente = fi <= hoy && ff >= hoy;
  return { text: `${fmtFecha(fi)} → ${fmtFecha(ff)}`, vigente };
}

function EstadoBadge({ activo, fi, ff }) {
  if (!activo) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">Inactivo</span>
  );
  if (!fi || !ff) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Activo</span>
  );
  const hoy = new Date().toISOString().slice(0, 10);
  if (fi > hoy) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Próxima</span>
  );
  if (ff < hoy) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Vencida</span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Vigente</span>
  );
}

export default function Promociones() {
  const [promociones, setPromociones] = useState([]);
  const [productos, setProductos]     = useState([]);
  const [categorias, setCategorias]   = useState([]);
  const [marcas, setMarcas]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');

  // Modal
  const [showModal, setShowModal]     = useState(false);
  const [editando, setEditando]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [aplicaciones, setAplicaciones] = useState([]);
  const [saving, setSaving]           = useState(false);
  const [formErr, setFormErr]         = useState('');

  // Búsqueda dentro del modal
  const [itemSearch, setItemSearch]   = useState('');

  // Confirmar baja
  const [showConfirm, setShowConfirm] = useState(false);
  const [promoABajar, setPromoABajar] = useState(null);

  useEffect(() => {
    load();
    Promise.all([
      productosService.getAll(),
      marcasService.getAll(),
      categoriasService.getAll(),
    ]).then(([rp, rm, rc]) => {
      setProductos((rp.data.productos ?? rp.data ?? []).filter(p => p.activo));
      setMarcas(rm.data.marcas ?? rm.data ?? []);
      setCategorias(rc.data.categorias ?? rc.data ?? []);
    }).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await promocionesService.getAll();
      setPromociones(r.data.promociones ?? []);
    } catch {
      setError('Error al cargar promociones');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = promociones;
    if (filtroActivo === 'activos')   list = list.filter(p => p.activo);
    if (filtroActivo === 'inactivos') list = list.filter(p => !p.activo);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [promociones, search, filtroActivo]);

  // Items disponibles según aplica_a
  const itemsDisponibles = useMemo(() => {
    if (form.aplica_a === 'PRODUCTO')  return productos;
    if (form.aplica_a === 'CATEGORIA') return categorias;
    if (form.aplica_a === 'MARCA')     return marcas;
    return [];
  }, [form.aplica_a, productos, categorias, marcas]);

  const itemsFiltrados = useMemo(() => {
    if (!itemSearch) return itemsDisponibles.slice(0, 30);
    const q = itemSearch.toLowerCase();
    return itemsDisponibles.filter(i =>
      (i.producto ?? i.nombre ?? '').toLowerCase().includes(q) ||
      (i.codigo_interno ?? '').toLowerCase().includes(q)
    ).slice(0, 30);
  }, [itemsDisponibles, itemSearch]);

  const idField = form.aplica_a === 'PRODUCTO'  ? 'id_producto'
               :  form.aplica_a === 'CATEGORIA' ? 'id_categoria'
               :  'id_marca';

  const apLabel = form.aplica_a === 'PRODUCTO'  ? 'Productos'
               :  form.aplica_a === 'CATEGORIA' ? 'Categorías'
               :  'Marcas';

  // ── Helpers modal ──────────────────────────────────────────────────────

  const openNuevo = () => {
    setEditando(null);
    setForm(EMPTY_FORM);
    setAplicaciones([]);
    setItemSearch('');
    setFormErr('');
    setShowModal(true);
  };

  const openEditar = async (promo) => {
    setEditando(promo);
    setForm({
      codigo:          promo.codigo,
      nombre:          promo.nombre,
      descripcion:     promo.descripcion || '',
      tipo_descuento:  promo.tipo_descuento,
      valor_descuento: promo.valor_descuento,
      fecha_inicio:    promo.fecha_inicio ? promo.fecha_inicio.slice(0, 10) : '',
      fecha_fin:       promo.fecha_fin    ? promo.fecha_fin.slice(0, 10)    : '',
      cantidad_minima: String(promo.cantidad_minima ?? 1),
      aplica_a:        promo.aplica_a,
      activo:          !!promo.activo,
    });
    setItemSearch('');
    setFormErr('');
    try {
      const r = await promocionesService.getAplicaciones(promo.id_promocion);
      setAplicaciones(r.data.aplicaciones ?? []);
    } catch {
      setAplicaciones([]);
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditando(null); };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    if (name === 'aplica_a') setAplicaciones([]);
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const agregarItem = (item) => {
    const id = item[idField];
    if (aplicaciones.some(a => a[idField] === id)) return;
    setAplicaciones(prev => [...prev, { ...item }]);
    setItemSearch('');
  };

  const quitarItem = (id) => {
    setAplicaciones(prev => prev.filter(a => a[idField] !== id));
  };

  const handleSave = async () => {
    if (!form.codigo.trim())        return setFormErr('El código es requerido');
    if (!form.nombre.trim())        return setFormErr('El nombre es requerido');
    if (!form.valor_descuento)      return setFormErr('El valor de descuento es requerido');
    if (!form.fecha_inicio || !form.fecha_fin) return setFormErr('Las fechas son requeridas');
    if (form.tipo_descuento === 'PORCENTAJE' && parseFloat(form.valor_descuento) > 100)
      return setFormErr('El porcentaje no puede superar 100');
    setFormErr('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        valor_descuento: parseFloat(form.valor_descuento),
        cantidad_minima: parseFloat(form.cantidad_minima) || 1,
      };

      let id;
      if (editando) {
        await promocionesService.update(editando.id_promocion, payload);
        id = editando.id_promocion;
      } else {
        const r = await promocionesService.create(payload);
        id = r.data.promocion.id_promocion;
      }

      if (form.aplica_a !== 'TODOS') {
        const apps = aplicaciones.map(a => ({
          id_producto:  form.aplica_a === 'PRODUCTO'  ? a.id_producto  : null,
          id_categoria: form.aplica_a === 'CATEGORIA' ? a.id_categoria : null,
          id_marca:     form.aplica_a === 'MARCA'     ? a.id_marca     : null,
        }));
        await promocionesService.updateAplicaciones(id, { aplicaciones: apps });
      }

      closeModal();
      load();
    } catch (err) {
      setFormErr(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const confirmarBaja = (p) => { setPromoABajar(p); setShowConfirm(true); };
  const ejecutarBaja  = async () => {
    if (!promoABajar) return;
    try {
      await promocionesService.remove(promoABajar.id_promocion);
      setShowConfirm(false);
      setPromoABajar(null);
      load();
    } catch { setShowConfirm(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Promociones</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Descuentos por porcentaje o monto fijo</p>
        </div>
        <button
          onClick={openNuevo}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Promoción
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
          <div className="py-12 text-center text-gray-400 dark:text-gray-500">No se encontraron promociones</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
              <thead className="bg-gray-50 dark:bg-zinc-800/60">
                <tr>
                  {['Código','Nombre','Descuento','Aplica a','Vigencia','Aplic.','Estado','Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {filtered.map(p => {
                  const vig = vigenciaLabel(p.fecha_inicio, p.fecha_fin);
                  const ap  = APLICA_LABEL[p.aplica_a] ?? { label: p.aplica_a, color: 'bg-gray-100 text-gray-500' };
                  return (
                    <tr key={p.id_promocion} className="hover:bg-amber-50/40 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg">{p.codigo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{p.nombre}</p>
                        {p.cantidad_minima > 1 && (
                          <p className="text-xs text-gray-400">Mín. {p.cantidad_minima} uds</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {p.tipo_descuento === 'PORCENTAJE'
                          ? `${parseFloat(p.valor_descuento).toFixed(0)}%`
                          : `Bs. ${parseFloat(p.valor_descuento).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ap.color}`}>{ap.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{vig.text}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
                          {p.aplica_a === 'TODOS' ? '∞' : p.total_aplicaciones ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <EstadoBadge activo={p.activo} fi={p.fecha_inicio} ff={p.fecha_fin} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditar(p)} title="Editar"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          {p.activo ? (
                            <button onClick={() => confirmarBaja(p)} title="Desactivar"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                              </svg>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal crear/editar ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editando ? 'Editar Promoción' : 'Nueva Promoción'}
              </h2>
              <button onClick={closeModal}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {/* Datos básicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Código *</label>
                  <input name="codigo" value={form.codigo} onChange={handleChange}
                    placeholder="PROMO-001"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange}
                    placeholder="Descuento de temporada"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Tipo descuento *</label>
                  <select name="tipo_descuento" value={form.tipo_descuento} onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {TIPOS_DESCUENTO.map(t => (
                      <option key={t} value={t}>{t === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Monto fijo (Bs.)'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Valor descuento * {form.tipo_descuento === 'PORCENTAJE' ? '(%)' : '(Bs.)'}
                  </label>
                  <input name="valor_descuento" type="number" min="0"
                    step={form.tipo_descuento === 'PORCENTAJE' ? '1' : '0.01'}
                    max={form.tipo_descuento === 'PORCENTAJE' ? '100' : undefined}
                    value={form.valor_descuento} onChange={handleChange}
                    placeholder={form.tipo_descuento === 'PORCENTAJE' ? '10' : '50.00'}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Fecha inicio *</label>
                  <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Fecha fin *</label>
                  <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Cantidad mínima</label>
                  <input name="cantidad_minima" type="number" min="1" step="1"
                    value={form.cantidad_minima} onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Aplica a *</label>
                  <select name="aplica_a" value={form.aplica_a} onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {APLICA_A.map(a => (
                      <option key={a} value={a}>{APLICA_LABEL[a].label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Descripción</label>
                  <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
                    placeholder="Descripción opcional..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"/>
                </div>
                {editando && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="activoP" name="activo" checked={form.activo} onChange={handleChange}
                      className="w-4 h-4 rounded accent-amber-500"/>
                    <label htmlFor="activoP" className="text-sm text-gray-700 dark:text-gray-300">Activo</label>
                  </div>
                )}
              </div>

              {/* Sección aplicaciones (solo si aplica_a != TODOS) */}
              {form.aplica_a !== 'TODOS' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {apLabel} a los que aplica
                    </h3>
                    <span className="text-xs text-gray-400">{aplicaciones.length} seleccionado{aplicaciones.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="relative mb-3">
                    <input
                      value={itemSearch} onChange={e => setItemSearch(e.target.value)}
                      placeholder={`Buscar ${apLabel.toLowerCase()}...`}
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    {itemSearch && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-lg max-h-44 overflow-y-auto">
                        {itemsFiltrados.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
                        ) : itemsFiltrados.map(item => {
                          const id = item[idField];
                          const yaAgregado = aplicaciones.some(a => a[idField] === id);
                          return (
                            <button key={id}
                              onClick={() => agregarItem(item)}
                              disabled={yaAgregado}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {form.aplica_a === 'PRODUCTO' && (
                                <span className="font-mono text-xs text-amber-600 dark:text-amber-400 mr-2">{item.codigo_interno}</span>
                              )}
                              <span className="text-gray-800 dark:text-gray-200">{item.producto ?? item.nombre}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {aplicaciones.length === 0 ? (
                    <p className="text-center py-4 text-xs text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl">
                      Busca y selecciona a quiénes aplica la promoción
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {aplicaciones.map(a => {
                        const id = a[idField];
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm border border-amber-200 dark:border-amber-700/40">
                            {form.aplica_a === 'PRODUCTO' && (
                              <span className="font-mono text-xs opacity-70">{a.codigo_interno}</span>
                            )}
                            {a.producto ?? a.nombre ?? a.producto_nombre ?? a.categoria_nombre ?? a.marca_nombre}
                            <button onClick={() => quitarItem(id)} className="ml-0.5 hover:text-red-500 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                              </svg>
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {form.aplica_a === 'TODOS' && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40">
                  <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-sm text-amber-700 dark:text-amber-300">Esta promoción aplica a todos los productos del catálogo.</p>
                </div>
              )}

              {formErr && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{formErr}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-zinc-800">
              <button onClick={closeModal}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-medium text-sm transition-colors">
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear Promoción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar baja ─────────────────────────────────────────── */}
      {showConfirm && promoABajar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Desactivar promoción</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">¿Desactivar <span className="font-medium">{promoABajar.nombre}</span>?</p>
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
