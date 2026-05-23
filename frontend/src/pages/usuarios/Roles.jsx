import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSpinner, FaShieldAlt, FaKey } from 'react-icons/fa';
import { rolesService } from '../../services/usuariosRoles.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';

const EMPTY_FORM = { nombre: '', descripcion: '' };

// ── Modal de asignación de permisos ──────────────────────────────────────────
function PermisosModal({ open, onClose, rol, onSaved }) {
  const [todosPermisos, setTodosPermisos] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [guardando, setGuardando] = useState(false);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (!open || !rol) return;
    setCargando(true);
    setError(null);
    Promise.all([rolesService.getPermisos(), rolesService.getRolPermisos(rol.id_rol)])
      .then(([{ data: tp }, { data: rp }]) => {
        setTodosPermisos(tp.permisos);
        setSeleccionados(new Set(rp.permisos));
      })
      .catch(() => setError('Error al cargar permisos'))
      .finally(() => setCargando(false));
  }, [open, rol]);

  const toggle = (id) => setSeleccionados(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleGrupo = (permisos) => {
    const ids = permisos.map(p => p.id_permiso);
    const todosOn = ids.every(id => seleccionados.has(id));
    setSeleccionados(prev => {
      const next = new Set(prev);
      ids.forEach(id => todosOn ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await rolesService.asignarPermisos(rol.id_rol, [...seleccionados]);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  // Agrupar por módulo
  const grupos = todosPermisos.reduce((acc, p) => {
    const key = p.modulo_nombre;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <Modal open={open} onClose={onClose} title={`Permisos — ${rol?.nombre}`} maxWidth="max-w-2xl">
      {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
      {cargando ? (
        <div className="flex items-center justify-center h-40 text-gray-400"><FaSpinner className="animate-spin h-6 w-6" /></div>
      ) : (
        <>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {Object.entries(grupos).map(([modulo, permisos]) => {
              const todosOn = permisos.every(p => seleccionados.has(p.id_permiso));
              return (
                <div key={modulo} className="border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleGrupo(permisos)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-zinc-800/60 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400">{modulo}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${todosOn ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                      {permisos.filter(p => seleccionados.has(p.id_permiso)).length}/{permisos.length}
                    </span>
                  </button>
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {permisos.map(p => (
                      <label key={p.id_permiso} className="flex items-start gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={seleccionados.has(p.id_permiso)}
                          onChange={() => toggle(p.id_permiso)}
                          className="mt-0.5 rounded accent-amber-500 shrink-0"
                        />
                        <div>
                          <p className="text-xs font-medium text-gray-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{p.nombre}</p>
                          {p.descripcion && <p className="text-xs text-gray-400 dark:text-zinc-500 leading-tight">{p.descripcion}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-800 mt-4">
            <span className="text-xs text-gray-400 dark:text-zinc-500">{seleccionados.size} permiso(s) seleccionado(s)</span>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button onClick={guardar} disabled={guardando}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
                {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
                Guardar permisos
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function Roles() {
  const { puede } = usePermission();
  const [lista,    setLista]    = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);
  const [modal,    setModal]    = useState(false);
  const [confirm,  setConfirm]  = useState(null);
  const [permModal,setPermModal] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [guardando,setGuardando]= useState(false);
  const [formError,setFormError]= useState(null);

  const cargar = () => {
    setCargando(true);
    rolesService.getAll()
      .then(({ data }) => setLista(data.roles))
      .catch(() => setError('Error al cargar roles'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const abrirCrear  = () => { setEditando(null); setForm(EMPTY_FORM); setFormError(null); setModal(true); };
  const abrirEditar = (r) => { setEditando(r); setForm({ nombre: r.nombre, descripcion: r.descripcion ?? '' }); setFormError(null); setModal(true); };
  const cerrarModal = () => { setModal(false); setFormError(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setGuardando(true);
    try {
      if (editando) await rolesService.update(editando.id_rol, form);
      else          await rolesService.create(form);
      cerrarModal();
      cargar();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await rolesService.remove(id);
      setConfirm(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar');
      setConfirm(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Gestión de roles y permisos del sistema"
        action={puede('crear', 'roles') && (
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-md shadow-amber-500/20 transition-all">
            <FaPlus className="h-3.5 w-3.5" /> Nuevo rol
          </button>
        )}
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center h-48 text-gray-400"><FaSpinner className="animate-spin h-6 w-6" /></div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          {lista.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-zinc-500">
              <FaShieldAlt className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay roles registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    {['Rol', 'Descripción', 'Permisos', 'Usuarios', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {lista.map(r => (
                    <tr key={r.id_rol} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{r.nombre}</span>
                          {r.es_sistema ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">Sistema</span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400">{r.activo ? 'Activo' : 'Inactivo'}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-zinc-400 text-xs max-w-xs truncate">{r.descripcion ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-900 dark:text-white">{r.total_permisos}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-900 dark:text-white">{r.total_usuarios}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {puede('asignar_permisos', 'roles') && (
                            <button onClick={() => setPermModal(r)} title="Asignar permisos"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                              <FaKey className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {puede('editar', 'roles') && (
                            <button onClick={() => abrirEditar(r)} title="Editar"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                              <FaEdit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {puede('eliminar', 'roles') && !r.es_sistema && (
                            <button onClick={() => setConfirm(r)} title="Eliminar"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                              <FaTrash className="h-3.5 w-3.5" />
                            </button>
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
      )}

      {/* Modal crear/editar */}
      <Modal open={modal} onClose={cerrarModal} title={editando ? 'Editar Rol' : 'Nuevo Rol'} maxWidth="max-w-md">
        {formError && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{formError}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              required className={inputCls} placeholder="Administrador, Vendedor..." />
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea name="descripcion" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              rows={3} className={inputCls} placeholder="Descripción del rol..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrarModal} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              {editando ? 'Guardar cambios' : 'Crear rol'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmar eliminación */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar Rol" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Eliminar el rol <strong className="text-gray-900 dark:text-white">{confirm?.nombre}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button onClick={() => handleEliminar(confirm.id_rol)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">Eliminar</button>
        </div>
      </Modal>

      {/* Modal permisos */}
      <PermisosModal
        open={!!permModal}
        onClose={() => setPermModal(null)}
        rol={permModal}
        onSaved={cargar}
      />
    </div>
  );
}
