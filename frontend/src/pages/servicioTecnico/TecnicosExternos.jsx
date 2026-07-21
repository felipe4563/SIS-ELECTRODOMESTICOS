import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaEdit, FaPowerOff, FaSpinner } from 'react-icons/fa';
import { servicioTecnicoService } from '../../services/servicioTecnico.service';
import { usePermission }          from '../../hooks/usePermission';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors';
const LABEL = 'block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5';

const EMPTY = { nombre: '', contacto: '', telefono: '', direccion: '', especialidad: '', notas: '' };

/* ── Modal alta/edición ─────────────────────────────────────────────────────── */
function ModalTecnico({ tecnico, onClose, onSaved }) {
  const [form, setForm]   = useState(tecnico ?? EMPTY);
  const [guardando, setG] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre es requerido');
    setG(true); setError('');
    try {
      if (tecnico?.id_tecnico) {
        await servicioTecnicoService.updateTecnico(tecnico.id_tecnico, form);
      } else {
        await servicioTecnicoService.createTecnico(form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.mensaje ?? err.response?.data?.error ?? 'Error al guardar');
    } finally {
      setG(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-0.5 bg-yellow-400" />
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              {tecnico?.id_tecnico ? 'Editar técnico' : 'Nuevo técnico'}
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              {tecnico?.id_tecnico
                ? 'Actualiza los datos del técnico o taller'
                : 'Registra un técnico o taller externo al que derivar equipos'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={LABEL}>Nombre del taller / técnico *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                placeholder="Taller Electrónica Moreno" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Persona de contacto</label>
              <input value={form.contacto} onChange={e => set('contacto', e.target.value)}
                placeholder="Nombre del responsable" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                placeholder="0981 000 000" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Especialidad</label>
              <input value={form.especialidad} onChange={e => set('especialidad', e.target.value)}
                placeholder="Refrigeración, Samsung, electrónica…" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Dirección</label>
              <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
                placeholder="Dirección del taller" className={INPUT} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Notas</label>
              <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                rows={2} placeholder="Observaciones, acuerdos, precios…"
                className={`${INPUT} resize-none`} />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors">
              {guardando && <FaSpinner className="animate-spin" size={11} />}
              {tecnico?.id_tecnico ? 'Guardar cambios' : 'Crear técnico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────────────────────── */
export default function TecnicosExternos() {
  const navigate = useNavigate();
  const { puede } = usePermission();
  const puedeGestionar = puede('gestionar_tecnicos', 'servicio_tecnico');

  const [tecnicos, setTecnicos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal]       = useState(null);
  const [toggling, setToggling] = useState(null);

  const cargar = () => {
    setCargando(true);
    servicioTecnicoService.getTecnicos({ solo_activos: 'false' })
      .then(r => setTecnicos(r.data.tecnicos ?? r.data))
      .catch(console.error)
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const handleToggle = async (t) => {
    setToggling(t.id_tecnico);
    try {
      await servicioTecnicoService.toggleTecnico(t.id_tecnico);
      cargar();
    } catch { } finally {
      setToggling(null);
    }
  };

  const activos = tecnicos.filter(t => t.activo).length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/servicio-tecnico')}
          className="mt-0.5 p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0">
          <FaArrowLeft size={13} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">
            Técnicos externos
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5">
            Talleres y técnicos a quienes se derivan equipos para reparación
          </p>
        </div>
        {puedeGestionar && (
          <button onClick={() => setModal('nuevo')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors flex-shrink-0">
            <FaPlus size={11} />
            <span className="hidden sm:inline">Nuevo técnico</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        )}
      </div>

      {/* ── Contadores ── */}
      {!cargando && tecnicos.length > 0 && (
        <div className="flex gap-2">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 px-3.5 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
            <span className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">{activos}</span>
            <span className="text-xs text-zinc-400">activos</span>
          </div>
          {tecnicos.length - activos > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 px-3.5 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 flex-shrink-0" />
              <span className="text-sm font-mono font-semibold text-zinc-500 dark:text-zinc-400">{tecnicos.length - activos}</span>
              <span className="text-xs text-zinc-400">inactivos</span>
            </div>
          )}
        </div>
      )}

      {/* ── Lista ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">

        {cargando ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-6 h-6 border-2 border-zinc-100 dark:border-zinc-800 border-t-yellow-400 rounded-full animate-spin" />
          </div>

        ) : tecnicos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Sin técnicos registrados</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs leading-relaxed">
              Agrega talleres o técnicos externos a quienes puedas derivar equipos para reparación
            </p>
            {puedeGestionar && (
              <button onClick={() => setModal('nuevo')}
                className="mt-5 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors">
                Agregar técnico
              </button>
            )}
          </div>

        ) : (
          <>
            {/* Cabecera desktop */}
            <div className="hidden md:grid md:grid-cols-[1fr_180px_140px_auto] gap-4 px-5 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Técnico / Taller</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Contacto</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Teléfono</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Acciones</span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {tecnicos.map(t => (
                <div
                  key={t.id_tecnico}
                  className={[
                    'relative flex flex-col md:grid md:grid-cols-[1fr_180px_140px_auto] md:items-center',
                    'gap-3 md:gap-4 pl-4 pr-5 py-4 transition-colors',
                    'border-l-2',
                    t.activo
                      ? 'border-l-yellow-400'
                      : 'border-l-zinc-200 dark:border-l-zinc-700 bg-zinc-50/40 dark:bg-zinc-950/40',
                  ].join(' ')}
                >
                  {/* Nombre + especialidad */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold leading-tight ${t.activo ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {t.nombre}
                      </span>
                      {!t.activo && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {t.especialidad && (
                      <span className="inline-block mt-1 text-[11px] font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-400/10 px-2 py-0.5 rounded-md">
                        {t.especialidad}
                      </span>
                    )}
                    {/* Info adicional visible solo en móvil */}
                    <div className="md:hidden mt-2 space-y-0.5">
                      {t.contacto && <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.contacto}</p>}
                      {t.telefono && <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{t.telefono}</p>}
                      {t.direccion && <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.direccion}</p>}
                      {t.notas   && <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">{t.notas}</p>}
                    </div>
                  </div>

                  {/* Columna Contacto — desktop */}
                  <div className="hidden md:block min-w-0">
                    {t.contacto
                      ? <span className="text-xs text-zinc-600 dark:text-zinc-300 block truncate">{t.contacto}</span>
                      : <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                    }
                    {t.direccion && (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block truncate mt-0.5">{t.direccion}</span>
                    )}
                  </div>

                  {/* Columna Teléfono — desktop */}
                  <div className="hidden md:block">
                    {t.telefono
                      ? <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{t.telefono}</span>
                      : <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                    }
                  </div>

                  {/* Acciones */}
                  {puedeGestionar && (
                    <div className="flex items-center gap-1.5 md:justify-end">
                      <button
                        onClick={() => setModal(t)}
                        title="Editar"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                          text-zinc-500 dark:text-zinc-400
                          hover:text-zinc-800 dark:hover:text-white
                          hover:bg-zinc-100 dark:hover:bg-zinc-800
                          border border-zinc-200 dark:border-zinc-700
                          md:border-transparent md:hover:border-zinc-200 md:dark:hover:border-zinc-700
                          transition-colors"
                      >
                        <FaEdit size={11} />
                        <span className="md:hidden">Editar</span>
                      </button>

                      <button
                        onClick={() => handleToggle(t)}
                        disabled={toggling === t.id_tecnico}
                        title={t.activo ? 'Desactivar' : 'Activar'}
                        className={[
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          'border md:border-transparent disabled:opacity-40',
                          t.activo
                            ? 'text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 md:hover:border-red-200 md:dark:hover:border-red-800'
                            : 'text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 md:hover:border-green-200 md:dark:hover:border-green-800',
                        ].join(' ')}
                      >
                        {toggling === t.id_tecnico
                          ? <FaSpinner size={11} className="animate-spin" />
                          : <FaPowerOff size={11} />}
                        <span className="md:hidden">{t.activo ? 'Desactivar' : 'Activar'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ModalTecnico
          tecnico={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}
