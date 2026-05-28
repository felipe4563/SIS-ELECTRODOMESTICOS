import { useState, useEffect } from 'react';
import { herramientasService as svc } from '../../services/herramientas.service';

const fmtFecha = (d) => d ? new Date(d).toLocaleString('es-BO') : '-';

function Toast({ msg, tipo = 'ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 max-w-sm ${tipo === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 text-lg leading-none">✕</button>
    </div>
  );
}

export default function Backup() {
  const [backups,     setBackups]   = useState([]);
  const [loading,     setLoading]   = useState(false);
  const [creando,     setCreando]   = useState(false);
  const [restaurando, setRest]      = useState(null);
  const [toast,       setToast]     = useState(null);

  const showToast = (msg, tipo = 'ok') => setToast({ msg, tipo });

  const cargar = () => {
    setLoading(true);
    svc.listarBackups().then(r => setBackups(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(cargar, []);

  const crear = async () => {
    setCreando(true);
    try {
      const r = await svc.crearBackup();
      showToast(`✅ Backup creado: ${r.data.archivo} (${r.data.tamano_mb} MB)`);
      cargar();
    } catch (e) {
      showToast(e.response?.data?.mensaje || 'Error al crear backup', 'error');
    } finally { setCreando(false); }
  };

  const descargar = async (id) => {
    try {
      const res = await svc.descargarBackup(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = id;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { showToast('Error al descargar el backup', 'error'); }
  };

  const eliminar = async (id) => {
    if (!confirm(`¿Eliminar ${id}?`)) return;
    try {
      await svc.eliminarBackup(id);
      showToast('Backup eliminado');
      cargar();
    } catch { showToast('Error al eliminar', 'error'); }
  };

  const restaurar = async (id) => {
    if (!confirm(`¿Restaurar "${id}"? Esto sobreescribirá todos los datos actuales.`)) return;
    setRest(id);
    try {
      await svc.restaurarBackup(id);
      showToast('✅ Backup restaurado correctamente');
    } catch (e) {
      showToast(e.response?.data?.mensaje || 'Error al restaurar', 'error');
    } finally { setRest(null); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">🗄️ Backup</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Respaldo y restauración de la base de datos.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Respaldo de base de datos</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Genera un dump SQL completo de todos los datos.</p>
          </div>
          <button
            onClick={crear}
            disabled={creando}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {creando ? <span className="animate-spin">⏳</span> : '🗄️'}
            {creando ? 'Creando…' : 'Crear Backup'}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-400 animate-pulse">Cargando backups…</p>
        ) : backups.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">No hay backups guardados.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800 text-left">
                  <th className="px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300">Archivo</th>
                  <th className="px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300">Fecha</th>
                  <th className="px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300">Tamaño</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
                {backups.map(b => (
                  <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">{b.nombre}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fmtFecha(b.fecha)}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{b.tamano_mb} MB</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        <button
                          onClick={() => descargar(b.id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        >
                          ⬇️ Descargar
                        </button>
                        <button
                          onClick={() => restaurar(b.id)}
                          disabled={restaurando === b.id}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
                        >
                          {restaurando === b.id ? '⏳…' : '🔄 Restaurar'}
                        </button>
                        <button
                          onClick={() => eliminar(b.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
