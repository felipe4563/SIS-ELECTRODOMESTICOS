import { useState, useEffect, useRef } from 'react';
import { herramientasService as svc } from '../../services/herramientas.service';
import { usePermission } from '../../hooks/usePermission';

// ── Helpers ───────────────────────────────────────────────────────────────────
const cls = (...c) => c.filter(Boolean).join(' ');

function Toast({ msg, tipo = 'ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const bg = tipo === 'error'
    ? 'bg-red-600 text-white'
    : 'bg-green-600 text-white';
  return (
    <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 max-w-sm ${bg}`}>
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 text-lg leading-none">✕</button>
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'excel', label: 'Excel',      icon: '📊' },
  { id: 'bd',    label: 'Limpiar BD', icon: '🗑️', perm: 'eliminar_bd' },
];

// ── SECCIÓN EXCEL ─────────────────────────────────────────────────────────────
function SeccionExcel({ toast }) {
  const [archivo,    setArchivo]   = useState(null);
  const [importing,  setImporting] = useState(false);
  const [resultado,  setResultado] = useState(null);
  const [drag,       setDrag]      = useState(false);
  const fileRef = useRef();

  const importar = async () => {
    if (!archivo) return;
    setImporting(true);
    setResultado(null);
    try {
      const r = await svc.importarProductos(archivo);
      setResultado(r.data);
      const { creados, actualizados, errores } = r.data;
      if (errores.length === 0) {
        toast(`${creados} creados, ${actualizados} actualizados — sin errores`, 'ok');
      } else {
        toast(`${creados} creados, ${actualizados} actualizados, ${errores.length} con error`, 'ok');
      }
    } catch (e) {
      toast(e.response?.data?.mensaje || 'Error al importar', 'error');
    } finally { setImporting(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setArchivo(f);
  };

  const formatoLabel = resultado?.formato === 'lista_precios'
    ? 'Lista de precios (MARCA / PRODUCTO / DETALLE…)'
    : 'Plantilla estándar (codigo_interno / producto…)';

  return (
    <div className="space-y-6">
      {/* Importar */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-4">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Importar productos</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Compatible con tu lista de precios (MARCA · PRODUCTO · DETALLE…) y con la plantilla estándar del sistema.
            Las marcas, categorías y proveedores nuevos se crean automáticamente.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          className={cls(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
            drag
              ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
              : archivo
              ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
              : 'border-zinc-300 dark:border-zinc-600 hover:border-yellow-400'
          )}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { setArchivo(e.target.files?.[0] || null); setResultado(null); }} />
          <svg className={cls('w-10 h-10 mx-auto mb-3', archivo ? 'text-green-500' : 'text-zinc-400')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
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
          <button
            onClick={importar}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
            Importar productos
          </button>
        )}

        {importing && (
          <div className="flex items-center justify-center gap-3 py-4">
            <svg className="w-5 h-5 animate-spin text-yellow-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Importando productos…</span>
          </div>
        )}

        {resultado && (
          <div className="space-y-3">
            {/* Formato detectado */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
              Formato detectado: <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatoLabel}</span>
            </div>

            {/* Contadores */}
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
                {resultado.creados} creados
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                {resultado.actualizados} actualizados
              </span>
              {resultado.stockActualizados > 0 && (
                <span className="px-3 py-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-sm font-medium">
                  {resultado.stockActualizados} stock actualizados
                </span>
              )}
              {resultado.depositosCreados > 0 && (
                <span className="px-3 py-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-sm font-medium">
                  {resultado.depositosCreados} depósitos creados
                </span>
              )}
              {resultado.proveedoresCreados > 0 && (
                <span className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium">
                  {resultado.proveedoresCreados} proveedores nuevos
                </span>
              )}
              {resultado.marcasCreadas > 0 && (
                <span className="px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">
                  {resultado.marcasCreadas} marcas nuevas
                </span>
              )}
              {resultado.categoriasCreadas > 0 && (
                <span className="px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium">
                  {resultado.categoriasCreadas} categorías nuevas
                </span>
              )}
              {resultado.errores?.length > 0 && (
                <span className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium">
                  {resultado.errores.length} errores
                </span>
              )}
            </div>

            {resultado.errores?.length > 0 && (
              <div className="max-h-52 overflow-y-auto rounded-xl border border-red-200 dark:border-red-800">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 dark:bg-red-900/20 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-red-700 dark:text-red-300 font-semibold">Fila</th>
                      <th className="px-3 py-2 text-left text-red-700 dark:text-red-300 font-semibold">Campo</th>
                      <th className="px-3 py-2 text-left text-red-700 dark:text-red-300 font-semibold">Error</th>
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

// ── SECCIÓN ELIMINAR BD ───────────────────────────────────────────────────────
function SeccionEliminarBD({ toast }) {
  const [tablas, setTablas]       = useState([]);
  const [tablaSelec, setTabla]    = useState('');
  const [confirm1, setConfirm1]   = useState(false);
  const [confirmTxt, setConfTxt]  = useState('');
  const [loading, setLoad]        = useState(false);

  useEffect(() => {
    svc.getTablasBorrables().then(r => setTablas(r.data)).catch(() => {});
  }, []);

  const ejecutar = async () => {
    if (confirmTxt !== 'CONFIRMAR BORRADO') {
      toast('El texto de confirmación no coincide', 'error');
      return;
    }
    setLoad(true);
    try {
      const r = await svc.eliminarRegistros(tablaSelec, confirmTxt);
      toast(`✅ ${r.data.eliminados} registros eliminados de "${tablaSelec}"`, 'ok');
      setConfirm1(false);
      setConfTxt('');
      setTabla('');
    } catch (e) {
      toast(e.response?.data?.mensaje || 'Error', 'error');
    } finally { setLoad(false); }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold text-red-700 dark:text-red-400">Zona Peligrosa — Solo SUPER ADMIN</h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">Esta acción elimina registros permanentemente y queda registrada en auditoría.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-red-700 dark:text-red-400 mb-1.5">Selecciona la tabla a limpiar</label>
          <select
            value={tablaSelec}
            onChange={e => { setTabla(e.target.value); setConfirm1(false); setConfTxt(''); }}
            className="w-full border border-red-300 dark:border-red-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="">-- Seleccionar tabla --</option>
            {tablas.map(t => (
              <option key={t.tabla} value={t.tabla}>{t.label} ({t.tabla})</option>
            ))}
          </select>
        </div>

        {tablaSelec && !confirm1 && (
          <button
            onClick={() => setConfirm1(true)}
            className="px-5 py-2.5 rounded-xl border-2 border-red-500 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            Continuar con la eliminación →
          </button>
        )}

        {tablaSelec && confirm1 && (
          <div className="space-y-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-700">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Para confirmar, escribe exactamente: <code className="font-mono font-bold">CONFIRMAR BORRADO</code>
            </p>
            <input
              value={confirmTxt}
              onChange={e => setConfTxt(e.target.value)}
              placeholder="CONFIRMAR BORRADO"
              className="w-full border border-red-300 dark:border-red-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 font-mono"
            />
            <div className="flex gap-3">
              <button
                onClick={ejecutar}
                disabled={loading || confirmTxt !== 'CONFIRMAR BORRADO'}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? '⏳ Eliminando…' : '🗑️ Eliminar registros'}
              </button>
              <button
                onClick={() => { setConfirm1(false); setConfTxt(''); }}
                className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function Herramientas() {
  const [tab, setTab]     = useState('excel');
  const [toast, setToast] = useState(null);
  const { puede }         = usePermission();

  const showToast = (msg, tipo = 'ok') => setToast({ msg, tipo });

  const tabsVisibles = TABS.filter(t => !t.perm || puede(t.perm, 'herramientas'));

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">🛠️ Herramientas</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Funcionalidades administrativas y de mantenimiento del sistema.
        </p>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 min-w-max sm:min-w-0 sm:flex-wrap bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
          {tabsVisibles.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cls(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                tab === t.id
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              )}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 sm:p-6">
        {tab === 'excel' && <SeccionExcel toast={showToast} />}
        {tab === 'bd'    && puede('eliminar_bd', 'herramientas') && <SeccionEliminarBD toast={showToast} />}
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
