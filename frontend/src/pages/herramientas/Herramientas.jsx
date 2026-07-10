import { useState, useEffect, useRef } from 'react';
import { herramientasService as svc } from '../../services/herramientas.service';
import { usePermission } from '../../hooks/usePermission';

const cls = (...c) => c.filter(Boolean).join(' ');

function Toast({ msg, tipo = 'ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={cls(
      'fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 max-w-sm',
      tipo === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
    )}>
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 text-lg leading-none">✕</button>
    </div>
  );
}

// ── SECCIÓN BACKUP ────────────────────────────────────────────────────────────
function SeccionBackup({ toast, puede }) {
  const [backups, setBackups]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [creando, setCreando]       = useState(false);
  const [restaurando, setRestaurando] = useState(null);
  const [confirmando, setConfirmando] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await svc.listarBackups();
      setBackups(r.data);
    } catch { toast('Error al cargar backups', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const crear = async () => {
    setCreando(true);
    try {
      const r = await svc.crearBackup();
      toast(`✅ Backup creado: ${r.data.archivo} (${r.data.tamano_mb} MB)`);
      cargar();
    } catch (e) { toast(e.response?.data?.mensaje || 'Error al crear backup', 'error'); }
    finally { setCreando(false); }
  };

  const descargar = async (id) => {
    try {
      const r = await svc.descargarBackup(id);
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url; a.download = id; a.click();
      URL.revokeObjectURL(url);
    } catch { toast('Error al descargar', 'error'); }
  };

  const restaurar = async (id) => {
    setRestaurando(id);
    try {
      await svc.restaurarBackup(id);
      toast('✅ Backup restaurado correctamente');
    } catch (e) { toast(e.response?.data?.mensaje || 'Error al restaurar', 'error'); }
    finally { setRestaurando(null); setConfirmando(null); }
  };

  const eliminar = async (id) => {
    try {
      await svc.eliminarBackup(id);
      toast('Backup eliminado');
      cargar();
    } catch { toast('Error al eliminar', 'error'); }
    finally { setConfirmando(null); }
  };

  const fmtFecha = (d) => new Date(d).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="space-y-5">
      {/* Crear backup */}
      {puede('crear', 'backup') && (
        <div className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <div>
            <p className="font-semibold text-zinc-900 dark:text-white text-sm">Crear copia de seguridad</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Genera un dump SQL completo de la base de datos</p>
          </div>
          <button onClick={crear} disabled={creando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-zinc-900 font-semibold text-sm transition-colors">
            {creando ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
              </svg>
            )}
            {creando ? 'Creando...' : 'Crear Backup'}
          </button>
        </div>
      )}

      {/* Lista de backups */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Copias disponibles</h3>
          <button onClick={cargar} className="text-xs text-zinc-400 hover:text-yellow-500 transition-colors">↻ Actualizar</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-zinc-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Cargando...
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-400">
            <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
            </svg>
            <p className="text-sm">No hay backups disponibles</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
            <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                <tr>
                  {['Archivo', 'Fecha', 'Tamaño', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {backups.map(b => (
                  <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{b.nombre}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {fmtFecha(b.fecha)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {b.tamano_mb} MB
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Descargar */}
                        {puede('descargar', 'backup') && (
                          <button onClick={() => descargar(b.id)} title="Descargar"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                          </button>
                        )}
                        {/* Restaurar */}
                        {puede('restaurar', 'backup') && (
                          confirmando === `restaurar_${b.id}` ? (
                            <span className="flex items-center gap-1 text-xs">
                              <button onClick={() => restaurar(b.id)} disabled={restaurando === b.id}
                                className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors disabled:opacity-50">
                                {restaurando === b.id ? '...' : 'Confirmar'}
                              </button>
                              <button onClick={() => setConfirmando(null)} className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                No
                              </button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmando(`restaurar_${b.id}`)} title="Restaurar"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                              </svg>
                            </button>
                          )
                        )}
                        {/* Eliminar */}
                        {puede('crear', 'backup') && (
                          confirmando === `eliminar_${b.id}` ? (
                            <span className="flex items-center gap-1 text-xs">
                              <button onClick={() => eliminar(b.id)}
                                className="px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors">
                                Eliminar
                              </button>
                              <button onClick={() => setConfirmando(null)} className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                No
                              </button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmando(`eliminar_${b.id}`)} title="Eliminar"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SECCIÓN EXCEL ─────────────────────────────────────────────────────────────
function SeccionExcel({ toast }) {
  const [archivo,   setArchivo]  = useState(null);
  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [drag,      setDrag]     = useState(false);
  const fileRef = useRef();

  const importar = async () => {
    if (!archivo) return;
    setImporting(true);
    setResultado(null);
    try {
      const r = await svc.importarProductos(archivo);
      setResultado(r.data);
      const { creados, actualizados, errores } = r.data;
      toast(
        errores.length === 0
          ? `${creados} creados, ${actualizados} actualizados — sin errores`
          : `${creados} creados, ${actualizados} actualizados, ${errores.length} con error`,
        'ok'
      );
    } catch (e) {
      toast(e.response?.data?.mensaje || 'Error al importar', 'error');
    } finally { setImporting(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setArchivo(f);
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-4">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Importar productos</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Compatible con lista de precios (MARCA · PRODUCTO · DETALLE…) y con la plantilla estándar.
            Las marcas, categorías y proveedores nuevos se crean automáticamente.
          </p>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          className={cls(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
            drag      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
            : archivo ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
                      : 'border-zinc-300 dark:border-zinc-600 hover:border-yellow-400'
          )}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { setArchivo(e.target.files?.[0] || null); setResultado(null); }} />
          <svg className={cls('w-10 h-10 mx-auto mb-3', archivo ? 'text-green-500' : 'text-zinc-400')}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
          </svg>
          {archivo ? (
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">{archivo.name}</p>
              <p className="text-xs text-zinc-400 mt-1">{(archivo.size / 1024).toFixed(1)} KB · haz clic para cambiar</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Arrastra tu Excel aquí o haz clic para buscar</p>
              <p className="text-xs text-zinc-400 mt-1">.xlsx o .xls</p>
            </div>
          )}
        </div>

        {archivo && !importing && (
          <button onClick={importar}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Importar productos
          </button>
        )}

        {importing && (
          <div className="flex items-center justify-center gap-3 py-4">
            <svg className="w-5 h-5 animate-spin text-yellow-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Importando productos…</span>
          </div>
        )}

        {resultado && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
              </svg>
              Formato:{' '}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {resultado.formato === 'lista_precios' ? 'Lista de precios (MARCA / PRODUCTO / DETALLE…)' : 'Plantilla estándar'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { v: resultado.creados,            label: 'creados',              color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
                { v: resultado.actualizados,       label: 'actualizados',         color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
                resultado.stockActualizados > 0  && { v: resultado.stockActualizados,  label: 'stock actualizados',  color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
                resultado.sucursalesCreadas > 0  && { v: resultado.sucursalesCreadas,  label: 'sucursales creadas',  color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                resultado.depositosCreados > 0   && { v: resultado.depositosCreados,   label: 'puntos de venta',     color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
                resultado.proveedoresCreados > 0 && { v: resultado.proveedoresCreados, label: 'proveedores nuevos',  color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
                resultado.marcasCreadas > 0      && { v: resultado.marcasCreadas,      label: 'marcas nuevas',       color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
                resultado.categoriasCreadas > 0  && { v: resultado.categoriasCreadas,  label: 'categorías nuevas',   color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
                resultado.errores?.length > 0    && { v: resultado.errores.length,     label: 'errores',             color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
              ].filter(Boolean).map((it, i) => (
                <span key={i} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${it.color}`}>
                  {it.v} {it.label}
                </span>
              ))}
            </div>
            {resultado.errores?.length > 0 && (
              <div className="max-h-52 overflow-y-auto rounded-xl border border-red-200 dark:border-red-800">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 dark:bg-red-900/20 sticky top-0">
                    <tr>
                      {['Fila', 'Campo', 'Error'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-red-700 dark:text-red-300 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                    {resultado.errores.map((e, i) => (
                      <tr key={i} className="hover:bg-red-50 dark:hover:bg-red-900/10">
                        <td className="px-3 py-1.5 text-red-600 dark:text-red-400 font-mono">{e.fila}</td>
                        <td className="px-3 py-1.5 text-red-600 dark:text-red-400 font-mono">{e.campo}</td>
                        <td className="px-3 py-1.5 text-red-500 dark:text-red-400">{e.msg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SECCIÓN CATÁLOGO PDF ──────────────────────────────────────────────────────
function SeccionCatalogo({ toast }) {
  const [marcas,      setMarcas]      = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [sucursales,  setSucursales]  = useState([]);
  const [filtros,     setFiltros]     = useState({ id_marca: '', id_categoria: '', id_sucursal: '' });
  const [generando,   setGenerando]   = useState(false);

  useEffect(() => {
    Promise.all([
      svc.getCatalogoMarcas(),
      svc.getCatalogoCategorias(),
      svc.getCatalogoSucursales(),
    ]).then(([m, c, s]) => {
      setMarcas(m.data);
      setCategorias(c.data);
      setSucursales(s.data);
    }).catch(() => {});
  }, []);

  const generar = async () => {
    setGenerando(true);
    try {
      const r = await svc.getCatalogoPDF(filtros);
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `catalogo_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Catálogo generado');
    } catch (e) {
      toast(e.response?.data?.mensaje || 'Error al generar catálogo', 'error');
    } finally { setGenerando(false); }
  };

  const selCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition';
  const labelCls = 'block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1';

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-5">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Generar catálogo PDF</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Genera un PDF con los productos en stock. Filtra por marca, categoría o sucursal (opcional).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Marca</label>
            <select value={filtros.id_marca}
              onChange={e => setFiltros(f => ({ ...f, id_marca: e.target.value }))}
              className={selCls}>
              <option value="">Todas las marcas</option>
              {marcas.map(m => <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Categoría</label>
            <select value={filtros.id_categoria}
              onChange={e => setFiltros(f => ({ ...f, id_categoria: e.target.value }))}
              className={selCls}>
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Sucursal</label>
            <select value={filtros.id_sucursal}
              onChange={e => setFiltros(f => ({ ...f, id_sucursal: e.target.value }))}
              className={selCls}>
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
            </select>
          </div>
        </div>

        <button onClick={generar} disabled={generando}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-zinc-900 font-semibold text-sm transition-colors">
          {generando ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          )}
          {generando ? 'Generando...' : 'Descargar Catálogo PDF'}
        </button>
      </div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function Herramientas() {
  const [tab, setTab]     = useState(null);
  const [toast, setToast] = useState(null);
  const { puede }         = usePermission();

  const TABS = [
    {
      id: 'backup', label: 'Backups', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
        </svg>
      ),
      visible: puede('crear', 'backup') || puede('restaurar', 'backup') || puede('descargar', 'backup'),
    },
    {
      id: 'excel', label: 'Importar Excel', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      ),
      visible: puede('importar_productos', 'excel'),
    },
    {
      id: 'catalogo', label: 'Catálogo PDF', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>
      ),
      visible: puede('generar_pdf', 'catalogo'),
    },
  ].filter(t => t.visible);

  // Seleccionar primer tab visible al cargar
  const tabActivo = tab && TABS.find(t => t.id === tab) ? tab : TABS[0]?.id ?? null;

  const showToast = (msg, tipo = 'ok') => setToast({ msg, tipo });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Herramientas</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Administración y mantenimiento del sistema.
        </p>
      </div>

      {TABS.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-zinc-400">
          <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          <p className="text-sm">Sin permisos para usar esta sección</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-full sm:w-auto sm:inline-flex">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cls(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 sm:flex-none justify-center sm:justify-start',
                  tabActivo === t.id
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                )}>
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Contenido */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 sm:p-6">
            {tabActivo === 'backup'   && <SeccionBackup  toast={showToast} puede={puede} />}
            {tabActivo === 'excel'    && <SeccionExcel   toast={showToast} />}
            {tabActivo === 'catalogo' && <SeccionCatalogo toast={showToast} />}
          </div>
        </>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
