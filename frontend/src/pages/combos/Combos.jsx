import { useState, useEffect, useMemo, useRef } from 'react';
import { combosService } from '../../services/combosPromos.service';
import { usePermission } from '../../hooks/usePermission';

const BACKEND = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');

const EMPTY_FORM = {
  nombre: '', descripcion: '',
  precio_combo: '', fecha_inicio: '', fecha_fin: '',
  imagen_url: '', activo: true,
};

function StatusBadge({ activo, fecha_fin }) {
  const isVencido = !activo && fecha_fin &&
    new Date(typeof fecha_fin === 'string' ? fecha_fin.slice(0, 10) + 'T12:00:00' : fecha_fin) < new Date();
  if (activo)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Activo</span>;
  if (isVencido)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Vencido</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">Inactivo</span>;
}

const fmtFecha = (d) => {
  if (!d) return null;
  // Normaliza a "YYYY-MM-DD" para evitar problemas de timezone con datetime completo
  const solo = typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
  return new Date(solo + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const fmtPrecio = (v) => {
  if (v == null) return '—';
  return parseFloat(v).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const vigenciaStr = (fi, ff) => {
  const a = fmtFecha(fi);
  const b = fmtFecha(ff);
  if (!a && !b) return null;
  if (a && b)  return `${a} → ${b}`;
  if (a)       return `desde ${a}`;
  return `hasta ${b}`;
};

// ── Imagen del combo ──────────────────────────────────────────────────────────
function ComboImg({ src, nombre, size = 'sm' }) {
  const [err, setErr] = useState(false);
  const full = src && !src.startsWith('http') ? BACKEND + src : src;
  const dim  = size === 'lg' ? 'w-20 h-20' : 'w-10 h-10';
  if (src && !err) {
    return (
      <img
        src={full} alt={nombre}
        onError={() => setErr(true)}
        className={`${dim} object-cover rounded-xl shrink-0 border border-zinc-200 dark:border-zinc-700`}
      />
    );
  }
  return (
    <div className={`${dim} rounded-xl shrink-0 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center`}>
      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    </div>
  );
}

export default function Combos() {
  const { puede } = usePermission();

  const [combos, setCombos]           = useState([]);
  const [productos, setProductos]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');

  const [showModal, setShowModal]     = useState(false);
  const [editando, setEditando]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [detalle, setDetalle]         = useState([]);
  const [saving, setSaving]           = useState(false);
  const [formErr, setFormErr]         = useState('');

  const [prodSearch, setProdSearch]   = useState('');

  const imgInputRef                   = useRef();
  const [imgFile, setImgFile]         = useState(null);
  const [imgPreview, setImgPreview]   = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [comboABajar, setComboABajar] = useState(null);

  const [exportando, setExportando]   = useState(false);

  useEffect(() => {
    load();
    combosService.getProductosParaCombo().then(r => {
      setProductos(r.data.productos ?? []);
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
        (p.nombre || p.producto || '').toLowerCase().includes(q) ||
        p.codigo_interno?.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [productos, prodSearch]);

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openNuevo = () => {
    setEditando(null);
    setForm(EMPTY_FORM);
    setDetalle([]);
    setProdSearch('');
    setFormErr('');
    setImgFile(null);
    setImgPreview(null);
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
    setImgFile(null);
    setImgPreview(null);
    try {
      const r = await combosService.getDetalle(combo.id_combo);
      setDetalle(r.data.detalle ?? []);
    } catch {
      setDetalle([]);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false); setEditando(null);
    setImgFile(null); setImgPreview(null);
  };

  const handleImgSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const agregarProducto = (prod) => {
    if (detalle.some(d => d.id_producto === prod.id_producto)) return;
    setDetalle(prev => [...prev, {
      id_producto:      prod.id_producto,
      producto_nombre:  prod.nombre ?? prod.producto,
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
      let comboId;
      if (editando) {
        await combosService.update(editando.id_combo, payload);
        await combosService.updateDetalle(editando.id_combo, {
          detalle: detalle.map(d => ({ id_producto: d.id_producto, cantidad: d.cantidad })),
        });
        comboId = editando.id_combo;
      } else {
        const res = await combosService.create(payload);
        comboId = res.data.combo?.id_combo ?? res.data.id_combo;
      }
      if (imgFile && comboId) {
        await combosService.uploadImagen(comboId, imgFile);
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

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const r = await combosService.exportarPDF({ filtro: filtroActivo });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `combos_${filtroActivo !== 'todos' ? filtroActivo + '_' : ''}${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silently ignore */
    } finally {
      setExportando(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Cabecera ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Combos</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {combos.length > 0
              ? `${combos.filter(c => c.activo).length} activos de ${combos.length} packs`
              : 'Packs de productos con precio especial'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Exportar PDF — solo si tiene permiso */}
          {puede('exportar', 'combos') && (
            <button
              onClick={exportarPDF}
              disabled={exportando}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-60"
            >
              {exportando ? (
                <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>
          )}

          {/* Nuevo Combo — solo si tiene permiso */}
          {puede('crear', 'combos') && (
            <button
              onClick={openNuevo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm transition-colors active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden xs:inline sm:inline">Nuevo combo</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Filtros ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
        <select
          value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)}
          className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </div>

      {/* ── Estado carga / error ──────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
          <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando combos…</span>
        </div>
      )}
      {error && !loading && (
        <div className="py-12 text-center text-red-500 text-sm">{error}</div>
      )}

      {/* ── Lista / tabla ─────────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {search || filtroActivo !== 'todos' ? 'Sin resultados' : 'Aún no hay combos'}
              </p>
              <p className="text-xs text-zinc-400">
                {search || filtroActivo !== 'todos'
                  ? 'Ajusta los filtros de búsqueda'
                  : puede('crear', 'combos') ? 'Crea el primer pack de productos' : 'No se encontraron combos'}
              </p>
              {!search && filtroActivo === 'todos' && puede('crear', 'combos') && (
                <button onClick={openNuevo}
                  className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Nuevo combo
                </button>
              )}
            </div>
          ) : (
            <>
              {/* ── Mobile cards (md-) ─────────────────────────────────────── */}
              <div className="md:hidden space-y-2">
                {filtered.map(c => (
                  <div key={c.id_combo}
                    className="relative flex gap-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-3 overflow-hidden">
                    {/* Acento lateral amarillo */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-yellow-400" />

                    <div className="ml-1">
                      <ComboImg src={c.imagen_url} nombre={c.nombre} size="sm" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Fila superior: nombre + precio */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{c.nombre}</p>
                          <span className="font-mono text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-px rounded-md">
                            {c.codigo}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-zinc-400 leading-none">Bs.</p>
                          <p className="font-mono font-bold text-base text-yellow-500 dark:text-yellow-400 leading-tight">
                            {fmtPrecio(c.precio_combo)}
                          </p>
                        </div>
                      </div>

                      {/* Fila inferior: metadatos + acciones */}
                      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge activo={c.activo} fecha_fin={c.fecha_fin} />
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            {c.total_productos ?? 0} ítems
                          </span>
                          {vigenciaStr(c.fecha_inicio, c.fecha_fin) && (
                            <span className="text-[10px] text-zinc-400">{vigenciaStr(c.fecha_inicio, c.fecha_fin)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {puede('editar', 'combos') && (
                            <button onClick={() => openEditar(c)} title="Editar"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                              </svg>
                            </button>
                          )}
                          {puede('eliminar', 'combos') && c.activo && (
                            <button onClick={() => confirmarBaja(c)} title="Desactivar"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Desktop table (md+) ────────────────────────────────────── */}
              <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800" id="tabla-combos-print">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                        {['', 'Código', 'Nombre', 'Precio', 'Vigencia', 'Ítems', 'Estado', 'Acciones'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {filtered.map(c => (
                        <tr key={c.id_combo}
                          className="hover:bg-yellow-50/30 dark:hover:bg-zinc-800/40 transition-colors group">
                          <td className="pl-4 py-3 w-12">
                            <ComboImg src={c.imagen_url} nombre={c.nombre} size="sm" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-lg">
                              {c.codigo}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-zinc-900 dark:text-white text-sm">{c.nombre}</p>
                            {c.descripcion && (
                              <p className="text-xs text-zinc-400 truncate max-w-xs">{c.descripcion}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-xs text-zinc-400">Bs. </span>
                            <span className="font-mono font-bold text-base text-yellow-500 dark:text-yellow-400">
                              {fmtPrecio(c.precio_combo)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {vigenciaStr(c.fecha_inicio, c.fecha_fin)
                              ? <span className="text-xs text-zinc-500 dark:text-zinc-400">{vigenciaStr(c.fecha_inicio, c.fecha_fin)}</span>
                              : <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-bold">
                              {c.total_productos ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge activo={c.activo} fecha_fin={c.fecha_fin} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {puede('editar', 'combos') && (
                                <button onClick={() => openEditar(c)} title="Editar"
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                  </svg>
                                </button>
                              )}
                              {puede('eliminar', 'combos') && c.activo && (
                                <button onClick={() => confirmarBaja(c)} title="Desactivar"
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Footer con conteo */}
                <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                  <span>{filtered.length} combo{filtered.length !== 1 ? 's' : ''}</span>
                  {(search || filtroActivo !== 'todos') && filtered.length !== combos.length && (
                    <button onClick={() => { setSearch(''); setFiltroActivo('todos'); }}
                      className="text-yellow-600 dark:text-yellow-400 hover:underline">
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── CSS de impresión ─────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #tabla-combos-print, #tabla-combos-print * { visibility: visible !important; }
          #tabla-combos-print {
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 100% !important; font-size: 11px !important;
            background: white !important; color: #000 !important;
          }
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>

      {/* ── Modal crear/editar ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  {editando ? 'Editar combo' : 'Nuevo combo'}
                </h2>
                {editando && (
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">{editando.codigo}</p>
                )}
              </div>
              <button onClick={closeModal}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Datos básicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange}
                    placeholder="Pack Cocina Completa"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Precio combo (Bs.) *</label>
                  <input name="precio_combo" type="number" min="0" step="0.01" value={form.precio_combo} onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Imagen</label>
                  <input ref={imgInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImgSelect} />
                  <div className="flex items-center gap-3">
                    {(imgPreview || form.imagen_url) && (
                      <img
                        src={imgPreview || (form.imagen_url?.startsWith('http') ? form.imagen_url : BACKEND + form.imagen_url)}
                        alt="preview"
                        className="w-14 h-14 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700 shrink-0"
                      />
                    )}
                    <div className="flex-1 flex flex-col gap-1">
                      <button type="button" onClick={() => imgInputRef.current?.click()}
                        className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left truncate">
                        {imgFile ? imgFile.name : 'Seleccionar imagen…'}
                      </button>
                      <p className="text-[10px] text-zinc-400">JPG, PNG o WebP · máx. 5 MB</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Fecha inicio</label>
                  <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Fecha fin</label>
                  <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Descripción</label>
                  <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
                    placeholder="Descripción opcional del combo…"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"/>
                </div>
                {editando && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="activo" name="activo" checked={form.activo} onChange={handleChange}
                      className="w-4 h-4 rounded accent-yellow-400"/>
                    <label htmlFor="activo" className="text-sm text-zinc-700 dark:text-zinc-300">Combo activo</label>
                  </div>
                )}
              </div>

              {/* Sección productos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Productos del combo</h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    {detalle.length} ítem{detalle.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="relative mb-3">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                    placeholder="Buscar producto por nombre o código…"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-yellow-200 dark:border-yellow-700/40 bg-yellow-50 dark:bg-yellow-900/10 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  {prodSearch && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xl max-h-44 overflow-y-auto">
                      {prodsFiltrados.length === 0 ? (
                        <p className="px-3 py-3 text-xs text-zinc-400 text-center">Sin resultados</p>
                      ) : prodsFiltrados.map(p => (
                        <button key={p.id_producto}
                          onClick={() => agregarProducto(p)}
                          disabled={detalle.some(d => d.id_producto === p.id_producto)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-yellow-50 dark:hover:bg-yellow-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-700/50 last:border-b-0"
                        >
                          <span>
                            <span className="font-mono text-xs text-yellow-600 dark:text-yellow-400 mr-2">{p.codigo_interno}</span>
                            <span className="text-zinc-800 dark:text-zinc-200">{p.nombre ?? p.producto}</span>
                          </span>
                          <span className="text-xs text-zinc-400 shrink-0 font-mono">Bs. {parseFloat(p.precio_publico ?? 0).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {detalle.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700">
                    <svg className="w-6 h-6 text-zinc-300 dark:text-zinc-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-xs text-zinc-400">Busca y agrega productos al combo</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {detalle.map(d => (
                      <div key={d.id_producto}
                        className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{d.producto_nombre}</p>
                          <p className="text-xs text-zinc-400 font-mono">
                            {d.codigo_interno} · Bs. {parseFloat(d.precio_publico ?? 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-xs text-zinc-400">Cant.</label>
                          <input
                            type="number" min="1" step="1"
                            value={d.cantidad}
                            onChange={e => cambiarCantidad(d.id_producto, e.target.value)}
                            className="w-14 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                          <button onClick={() => quitarProducto(d.id_producto)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
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
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl border border-red-100 dark:border-red-900/40">
                  {formErr}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={closeModal}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-900 font-semibold text-sm transition-colors flex items-center gap-2">
                {saving && <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear combo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar desactivar ───────────────────────────────────── */}
      {showConfirm && comboABajar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">Desactivar combo</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  El combo <span className="font-medium text-zinc-700 dark:text-zinc-200">{comboABajar.nombre}</span> no aparecerá en ventas.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
              <button onClick={ejecutarBaja}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors">
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
