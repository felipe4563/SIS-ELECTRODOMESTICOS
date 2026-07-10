import { useState, useEffect, useMemo, useRef } from 'react';
import { promocionesService } from '../../services/combosPromos.service';
import { usePermission } from '../../hooks/usePermission';

const TIPOS_DESCUENTO = ['PORCENTAJE', 'MONTO_FIJO'];
const APLICA_A        = ['PRODUCTO', 'CATEGORIA', 'MARCA', 'TODOS'];

const APLICA_META = {
  PRODUCTO:  { label: 'Producto',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'     },
  CATEGORIA: { label: 'Categoría', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  MARCA:     { label: 'Marca',     color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'  },
  TODOS:     { label: 'Todos',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
};

const EMPTY_FORM = {
  nombre: '', descripcion: '',
  tipo_descuento: 'PORCENTAJE', valor_descuento: '',
  fecha_inicio: '', fecha_fin: '',
  cantidad_minima: '1', aplica_a: 'PRODUCTO',
  activo: true,
};

const fmtFecha = (d) => {
  if (!d) return '—';
  const solo = typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
  return new Date(solo + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const Spinner = ({ sm }) => (
  <svg className={`animate-spin ${sm ? 'w-3.5 h-3.5' : 'w-5 h-5'}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
  </svg>
);

function EstadoBadge({ activo, fi, ff }) {
  const today = new Date().toISOString().slice(0, 10);
  const fiS = fi ? String(fi).slice(0, 10) : null;
  const ffS = ff ? String(ff).slice(0, 10) : null;

  if (!activo) {
    if (ffS && ffS < today)
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Vencida</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">Inactiva</span>;
  }
  if (fiS && fiS > today)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Próxima</span>;
  if (ffS && ffS < today)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Vencida</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Vigente</span>;
}

function DescuentoBadge({ tipo, valor }) {
  const txt = tipo === 'PORCENTAJE'
    ? `${parseFloat(valor).toFixed(0)}%`
    : `Bs. ${parseFloat(valor).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <span className="font-mono font-bold text-sm text-yellow-600 dark:text-yellow-400">{txt}</span>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition';
const labelCls = 'block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1';

export default function Promociones() {
  const { puede } = usePermission();

  const [promociones, setPromociones] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');

  // Items para selector (productos/categorías/marcas)
  const [itemsCache, setItemsCache] = useState({ PRODUCTO: [], CATEGORIA: [], MARCA: [] });
  const [itemSearch, setItemSearch] = useState('');
  const [itemsLoading, setItemsLoading] = useState(false);
  const itemSearchTimer = useRef(null);

  // Modal
  const [showModal, setShowModal]   = useState(false);
  const [editando, setEditando]     = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [aplicaciones, setAplicaciones] = useState([]);
  const [saving, setSaving]         = useState(false);
  const [formErr, setFormErr]       = useState('');

  // Confirmar baja
  const [showConfirm, setShowConfirm] = useState(false);
  const [promoABajar, setPromoABajar] = useState(null);

  // Exportar
  const [exportando, setExportando] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await promocionesService.getAll();
      setPromociones(r.data.promociones ?? []);
    } catch { setError('Error al cargar promociones'); }
    finally  { setLoading(false); }
  };

  // ── Filtrado ─────────────────────────────────────────────────────────────
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

  // ── Items para selector ───────────────────────────────────────────────────
  const idField = form.aplica_a === 'PRODUCTO'  ? 'id_producto'
                : form.aplica_a === 'CATEGORIA' ? 'id_categoria'
                : 'id_marca';

  const normalizeItem = (item, tipo) => {
    if (tipo === 'PRODUCTO')  return { id_producto:  item.id, codigo: item.codigo, nombre: item.nombre };
    if (tipo === 'CATEGORIA') return { id_categoria: item.id, nombre: item.nombre };
    return { id_marca: item.id, nombre: item.nombre };
  };

  const itemsFiltrados = useMemo(() => {
    if (form.aplica_a === 'TODOS') return [];
    const cached = itemsCache[form.aplica_a] ?? [];
    if (!itemSearch) return cached.slice(0, 30);
    const q = itemSearch.toLowerCase();
    return cached.filter(i =>
      i.nombre?.toLowerCase().includes(q) ||
      i.codigo?.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [itemsCache, form.aplica_a, itemSearch]);

  const fetchItems = async (tipo, q = '') => {
    setItemsLoading(true);
    try {
      const r = await promocionesService.getItemsParaPromocion(tipo, q);
      const normalized = (r.data.items ?? []).map(i => normalizeItem(i, tipo));
      if (!q) setItemsCache(prev => ({ ...prev, [tipo]: normalized }));
      return normalized;
    } catch { return []; }
    finally { setItemsLoading(false); }
  };

  const handleItemSearchChange = (val) => {
    setItemSearch(val);
    if (form.aplica_a === 'TODOS') return;
    clearTimeout(itemSearchTimer.current);
    itemSearchTimer.current = setTimeout(() => fetchItems(form.aplica_a, val), 300);
  };

  // ── Helpers modal ─────────────────────────────────────────────────────────
  const openNuevo = () => {
    setEditando(null);
    setForm(EMPTY_FORM);
    setAplicaciones([]);
    setItemSearch('');
    setFormErr('');
    setShowModal(true);
    fetchItems('PRODUCTO');
  };

  const openEditar = async (promo) => {
    setEditando(promo);
    setForm({
      codigo:          promo.codigo,
      nombre:          promo.nombre,
      descripcion:     promo.descripcion || '',
      tipo_descuento:  promo.tipo_descuento,
      valor_descuento: String(promo.valor_descuento),
      fecha_inicio:    promo.fecha_inicio ? String(promo.fecha_inicio).slice(0, 10) : '',
      fecha_fin:       promo.fecha_fin    ? String(promo.fecha_fin).slice(0, 10)    : '',
      cantidad_minima: String(promo.cantidad_minima ?? 1),
      aplica_a:        promo.aplica_a,
      activo:          !!promo.activo,
    });
    setItemSearch('');
    setFormErr('');
    fetchItems(promo.aplica_a);
    try {
      const r = await promocionesService.getAplicaciones(promo.id_promocion);
      const raw = r.data.aplicaciones ?? [];
      setAplicaciones(raw.map(a => ({
        id_producto:  a.id_producto  ?? undefined,
        id_categoria: a.id_categoria ?? undefined,
        id_marca:     a.id_marca     ?? undefined,
        codigo:       a.codigo_interno ?? undefined,
        nombre:       a.producto_nombre ?? a.categoria_nombre ?? a.marca_nombre ?? '',
      })));
    } catch { setAplicaciones([]); }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditando(null); };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'aplica_a') {
      setAplicaciones([]);
      setItemSearch('');
      fetchItems(value);
    }
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const agregarItem = (item) => {
    const id = item[idField];
    if (aplicaciones.some(a => a[idField] === id)) return;
    setAplicaciones(prev => [...prev, item]);
    setItemSearch('');
  };

  const quitarItem = (id) => setAplicaciones(prev => prev.filter(a => a[idField] !== id));

  const handleSave = async () => {
    if (!form.nombre.trim())   return setFormErr('El nombre es requerido');
    if (!form.valor_descuento) return setFormErr('El valor de descuento es requerido');
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
    } finally { setSaving(false); }
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

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const r = await promocionesService.exportarPDF({ filtro: filtroActivo });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `promociones_${filtroActivo !== 'todos' ? filtroActivo + '_' : ''}${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {} finally { setExportando(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const FILTROS = [
    { value: 'todos',    label: 'Todos' },
    { value: 'activos',  label: 'Activos' },
    { value: 'inactivos',label: 'Inactivos' },
  ];

  return (
    <div className="space-y-5">

      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Promociones</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Descuentos por porcentaje o monto fijo</p>
        </div>
        <div className="flex items-center gap-2">
          {puede('exportar', 'promociones') && (
            <button onClick={exportarPDF} disabled={exportando}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-400 text-sm font-medium transition-colors disabled:opacity-50">
              {exportando ? <Spinner sm /> : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>
          )}
          {puede('crear', 'promociones') && (
            <button onClick={openNuevo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              <span className="hidden sm:inline">Nueva Promoción</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl shrink-0">
          {FILTROS.map(f => (
            <button key={f.value} onClick={() => setFiltroActivo(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filtroActivo === f.value
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400">
          <Spinner /> Cargando...
        </div>
      ) : error ? (
        <div className="py-12 text-center text-red-500">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-zinc-400 dark:text-zinc-500">
          <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
          <p className="text-sm">No se encontraron promociones</p>
        </div>
      ) : (
        <>
          {/* ── Mobile: cards ── */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map(p => {
              const ap = APLICA_META[p.aplica_a] ?? APLICA_META.TODOS;
              return (
                <div key={p.id_promocion} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 space-y-3">
                  {/* fila 1: código + descuento */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-lg">
                        {p.codigo}
                      </span>
                      <p className="font-semibold text-zinc-900 dark:text-white mt-1.5 text-sm leading-snug">{p.nombre}</p>
                      {p.descripcion && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{p.descripcion}</p>}
                    </div>
                    <DescuentoBadge tipo={p.tipo_descuento} valor={p.valor_descuento} />
                  </div>
                  {/* fila 2: badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <EstadoBadge activo={p.activo} fi={p.fecha_inicio} ff={p.fecha_fin} />
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ap.color}`}>
                      {ap.label}
                      {p.aplica_a !== 'TODOS' && <span className="ml-1 opacity-70">{p.total_aplicaciones ?? 0}</span>}
                    </span>
                    {p.cantidad_minima > 1 && (
                      <span className="text-xs text-zinc-400">Mín. {p.cantidad_minima} uds</span>
                    )}
                  </div>
                  {/* fila 3: vigencia + acciones */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs text-zinc-400">
                      {fmtFecha(p.fecha_inicio)} → {fmtFecha(p.fecha_fin)}
                    </span>
                    <div className="flex items-center gap-1">
                      {puede('editar', 'promociones') && (
                        <button onClick={() => openEditar(p)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                      )}
                      {puede('eliminar', 'promociones') && p.activo && (
                        <button onClick={() => confirmarBaja(p)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Desktop: tabla ── */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
            <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                <tr>
                  {['Código','Nombre','Descuento','Aplica a','Vigencia','Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                  {(puede('editar','promociones') || puede('eliminar','promociones')) && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.map(p => {
                  const ap = APLICA_META[p.aplica_a] ?? APLICA_META.TODOS;
                  return (
                    <tr key={p.id_promocion} className="group hover:bg-yellow-50/40 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-lg">
                          {p.codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-medium text-zinc-900 dark:text-white text-sm truncate">{p.nombre}</p>
                        {p.cantidad_minima > 1 && (
                          <p className="text-xs text-zinc-400">Mín. {p.cantidad_minima} uds</p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <DescuentoBadge tipo={p.tipo_descuento} valor={p.valor_descuento} />
                        <span className="ml-1 text-xs text-zinc-400">
                          {p.tipo_descuento === 'PORCENTAJE' ? '%' : 'fijo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ap.color}`}>
                          {ap.label}
                        </span>
                        {p.aplica_a !== 'TODOS' && (
                          <span className="ml-1 text-xs text-zinc-400">{p.total_aplicaciones ?? 0}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {fmtFecha(p.fecha_inicio)} → {fmtFecha(p.fecha_fin)}
                      </td>
                      <td className="px-4 py-3">
                        <EstadoBadge activo={p.activo} fi={p.fecha_inicio} ff={p.fecha_fin} />
                      </td>
                      {(puede('editar','promociones') || puede('eliminar','promociones')) && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {puede('editar','promociones') && (
                              <button onClick={() => openEditar(p)} title="Editar"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                              </button>
                            )}
                            {puede('eliminar','promociones') && p.activo && (
                              <button onClick={() => confirmarBaja(p)} title="Desactivar"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Modal crear/editar ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-zinc-200 dark:border-zinc-800">
            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {editando ? 'Editar Promoción' : 'Nueva Promoción'}
                </h2>
                {editando && (
                  <p className="text-xs font-mono text-yellow-600 dark:text-yellow-400 mt-0.5">{editando.codigo}</p>
                )}
              </div>
              <button onClick={closeModal}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Datos básicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange}
                    placeholder="Ej. Descuento de temporada"
                    className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Tipo de descuento *</label>
                  <select name="tipo_descuento" value={form.tipo_descuento} onChange={handleChange} className={inputCls}>
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="MONTO_FIJO">Monto fijo (Bs.)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>
                    Valor * {form.tipo_descuento === 'PORCENTAJE' ? '(%)' : '(Bs.)'}
                  </label>
                  <input name="valor_descuento" type="number" min="0"
                    step={form.tipo_descuento === 'PORCENTAJE' ? '1' : '0.01'}
                    max={form.tipo_descuento === 'PORCENTAJE' ? '100' : undefined}
                    value={form.valor_descuento} onChange={handleChange}
                    placeholder={form.tipo_descuento === 'PORCENTAJE' ? '10' : '50.00'}
                    className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Fecha inicio *</label>
                  <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange} className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Fecha fin *</label>
                  <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange} className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Cantidad mínima</label>
                  <input name="cantidad_minima" type="number" min="1" step="1"
                    value={form.cantidad_minima} onChange={handleChange} className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Aplica a *</label>
                  <select name="aplica_a" value={form.aplica_a} onChange={handleChange} className={inputCls}>
                    {APLICA_A.map(a => (
                      <option key={a} value={a}>{APLICA_META[a].label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Descripción</label>
                  <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
                    placeholder="Descripción opcional..."
                    className={`${inputCls} resize-none`}/>
                </div>
                {editando && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="activoP" name="activo" checked={form.activo} onChange={handleChange}
                      className="w-4 h-4 rounded accent-yellow-400"/>
                    <label htmlFor="activoP" className="text-sm text-zinc-700 dark:text-zinc-300">Activa</label>
                  </div>
                )}
              </div>

              {/* Selector de items */}
              {form.aplica_a !== 'TODOS' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      {APLICA_META[form.aplica_a]?.label ?? form.aplica_a} a los que aplica
                    </h3>
                    <span className="text-xs text-zinc-400">{aplicaciones.length} seleccionado{aplicaciones.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="relative mb-3">
                    <input
                      value={itemSearch} onChange={e => handleItemSearchChange(e.target.value)}
                      placeholder={`Buscar ${(APLICA_META[form.aplica_a]?.label ?? form.aplica_a).toLowerCase()}...`}
                      className="w-full px-3 py-2 rounded-xl border border-yellow-200 dark:border-yellow-700/50 bg-yellow-50 dark:bg-yellow-900/10 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    {itemSearch && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg max-h-44 overflow-y-auto">
                        {itemsLoading ? (
                          <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400"><Spinner sm/>Buscando...</div>
                        ) : itemsFiltrados.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-zinc-400">Sin resultados</p>
                        ) : itemsFiltrados.map(item => {
                          const id = item[idField];
                          const ya = aplicaciones.some(a => a[idField] === id);
                          return (
                            <button key={id} onClick={() => agregarItem(item)} disabled={ya}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-yellow-50 dark:hover:bg-yellow-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                              {item.codigo && (
                                <span className="font-mono text-xs text-yellow-600 dark:text-yellow-400 mr-2">{item.codigo}</span>
                              )}
                              <span className="text-zinc-800 dark:text-zinc-200">{item.nombre}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {aplicaciones.length === 0 ? (
                    <p className="text-center py-4 text-xs text-zinc-400 dark:text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl">
                      Busca y selecciona a quiénes aplica la promoción
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {aplicaciones.map(a => {
                        const id = a[idField];
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-sm border border-yellow-200 dark:border-yellow-700/40">
                            {a.codigo && <span className="font-mono text-xs opacity-70">{a.codigo}</span>}
                            {a.nombre}
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
                <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/40">
                  <svg className="w-5 h-5 text-yellow-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">Esta promoción aplica a todos los productos del catálogo.</p>
                </div>
              )}

              {formErr && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{formErr}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={closeModal}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors">
                {saving && <Spinner sm/>}
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear Promoción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar baja ── */}
      {showConfirm && promoABajar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">Desactivar promoción</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  ¿Desactivar <span className="font-medium text-zinc-700 dark:text-zinc-200">{promoABajar.nombre}</span>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
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
