import { useState, useEffect } from 'react';
import {
  FaPlus, FaEdit, FaTrash, FaSpinner, FaUsers, FaKey, FaStore,
  FaSignOutAlt, FaCheckCircle, FaTimesCircle,
} from 'react-icons/fa';
import { usuariosService, rolesService } from '../../services/usuariosRoles.service';
import { sucursalesService } from '../../services/configuracion.service';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';
const EMPTY    = { username: '', password: '', nombres: '', apellidos: '', documento: '', email: '', telefono: '', id_rol: '', id_sucursal_default: '', activo: true };

// ── Avatar de iniciales ──────────────────────────────────────────────────────
function Avatar({ nombres, apellidos }) {
  const ini = [nombres?.[0], apellidos?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  return (
    <div className="w-8 h-8 rounded-lg bg-amber-400 text-zinc-900 flex items-center justify-center text-xs font-bold shrink-0">
      {ini}
    </div>
  );
}

// ── Modal: Asignar sucursales ────────────────────────────────────────────────
function SucursalesModal({ open, onClose, usuario, onSaved }) {
  const [todas,       setTodas]       = useState([]);
  const [seleccionadas, setSeleccionadas] = useState(new Set());
  const [guardando,   setGuardando]   = useState(false);
  const [cargando,    setCargando]    = useState(true);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    if (!open || !usuario) return;
    setCargando(true);
    setError(null);
    Promise.all([sucursalesService.getAll(), usuariosService.getOne(usuario.id_usuario)])
      .then(([{ data: s }, { data: u }]) => {
        setTodas(s.sucursales.filter(x => x.activo));
        setSeleccionadas(new Set(u.sucursales.map(x => x.id_sucursal)));
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setCargando(false));
  }, [open, usuario]);

  const toggle = (id) => setSeleccionadas(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await usuariosService.asignarSucursales(usuario.id_usuario, [...seleccionadas]);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Sucursales — ${usuario?.nombres} ${usuario?.apellidos}`} maxWidth="max-w-md">
      {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
      {cargando ? (
        <div className="flex items-center justify-center h-32 text-gray-400"><FaSpinner className="animate-spin h-5 w-5" /></div>
      ) : (
        <>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {todas.map(s => (
              <label key={s.id_sucursal} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                <input type="checkbox" checked={seleccionadas.has(s.id_sucursal)} onChange={() => toggle(s.id_sucursal)}
                  className="rounded accent-amber-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{s.nombre}</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500">{s.codigo} · {s.tipo}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800 mt-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button onClick={guardar} disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              Guardar
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Modal: Reset contraseña ──────────────────────────────────────────────────
function ResetPassModal({ open, onClose, usuario }) {
  const [pass,     setPass]     = useState('');
  const [guardando,setGuardando]= useState(false);
  const [error,    setError]    = useState(null);
  const [ok,       setOk]       = useState(false);

  useEffect(() => { if (open) { setPass(''); setError(null); setOk(false); } }, [open]);

  const guardar = async () => {
    if (pass.length < 6) { setError('Mínimo 6 caracteres'); return; }
    setGuardando(true);
    setError(null);
    try {
      await usuariosService.resetPassword(usuario.id_usuario, { nueva_password: pass });
      setOk(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al resetear');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Resetear Contraseña" maxWidth="max-w-sm">
      {ok ? (
        <div className="text-center py-4">
          <FaCheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="text-sm text-gray-700 dark:text-zinc-300">Contraseña reseteada. El usuario deberá cambiarla al iniciar sesión.</p>
          <button onClick={onClose} className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 transition-all">Cerrar</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4">
            Ingresa la nueva contraseña temporal para <strong className="text-gray-900 dark:text-white">{usuario?.nombres} {usuario?.apellidos}</strong>.
          </p>
          {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
          <div className="mb-4">
            <label className={labelCls}>Nueva contraseña *</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)}
              className={inputCls} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button onClick={guardar} disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              Resetear
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function Usuarios() {
  const { puede }   = usePermission();
  const { usuario: yo } = useAuth();

  const [lista,     setLista]     = useState([]);
  const [roles,     setRoles]     = useState([]);
  const [sucursales,setSucursales]= useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState(null);
  const [busqueda,  setBusqueda]  = useState('');

  const [modal,     setModal]     = useState(false);
  const [editando,  setEditando]  = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState(null);

  const [confirm,   setConfirm]   = useState(null);
  const [resetModal,setResetModal]= useState(null);
  const [sucModal,  setSucModal]  = useState(null);

  const cargar = () => {
    setCargando(true);
    Promise.all([
      usuariosService.getAll(),
      rolesService.getAll(),
      sucursalesService.getAll(),
    ])
      .then(([{ data: u }, { data: r }, { data: s }]) => {
        setLista(u.usuarios);
        setRoles(r.roles.filter(x => x.activo));
        setSucursales(s.sucursales.filter(x => x.activo));
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const abrirCrear  = () => { setEditando(null); setForm(EMPTY); setFormError(null); setModal(true); };
  const abrirEditar = (u) => {
    setEditando(u);
    setForm({ ...u, password: '', activo: !!u.activo });
    setFormError(null);
    setModal(true);
  };
  const cerrarModal = () => { setModal(false); setFormError(null); };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setGuardando(true);
    try {
      if (editando) await usuariosService.update(editando.id_usuario, form);
      else          await usuariosService.create(form);
      cerrarModal();
      cargar();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (u) => {
    try {
      await usuariosService.remove(u.id_usuario);
      setConfirm(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desactivar');
      setConfirm(null);
    }
  };

  const handleCerrarSesiones = async (u) => {
    try {
      await usuariosService.cerrarSesiones(u.id_usuario);
    } catch { /* silent */ }
  };

  const filtrados = busqueda
    ? lista.filter(u =>
        `${u.nombres} ${u.apellidos} ${u.username} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase())
      )
    : lista;

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Gestión de usuarios del sistema"
        action={puede('crear', 'usuarios') && (
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-md shadow-amber-500/20 transition-all">
            <FaPlus className="h-3.5 w-3.5" /> Nuevo usuario
          </button>
        )}
      />

      <div className="mb-4">
        <input
          placeholder="Buscar por nombre, username o email..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm w-full max-w-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-colors"
        />
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center h-48 text-gray-400"><FaSpinner className="animate-spin h-6 w-6" /></div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          {filtrados.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-zinc-500">
              <FaUsers className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{busqueda ? 'Sin resultados' : 'No hay usuarios registrados'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    {['Usuario', 'Username', 'Rol', 'Sucursal', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {filtrados.map(u => (
                    <tr key={u.id_usuario} className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors ${!u.activo ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar nombres={u.nombres} apellidos={u.apellidos} />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{u.nombres} {u.apellidos}</p>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{u.email ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-zinc-400">{u.username}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-zinc-300 text-xs">{u.rol_nombre}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-zinc-400 text-xs">{u.sucursal_nombre ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit ${u.activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                            {u.activo ? <FaCheckCircle className="h-2.5 w-2.5" /> : <FaTimesCircle className="h-2.5 w-2.5" />}
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                          {u.debe_cambiar_pass ? (
                            <span className="text-xs text-amber-600 dark:text-amber-400">⚠ Debe cambiar pass</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {puede('asignar_sucursales', 'usuarios') && (
                            <button onClick={() => setSucModal(u)} title="Asignar sucursales"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                              <FaStore className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {puede('resetear_password', 'usuarios') && (
                            <button onClick={() => setResetModal(u)} title="Resetear contraseña"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                              <FaKey className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {puede('cerrar_sesiones', 'usuarios') && u.id_usuario !== yo?.id && (
                            <button onClick={() => handleCerrarSesiones(u)} title="Cerrar sesiones"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors">
                              <FaSignOutAlt className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {puede('editar', 'usuarios') && (
                            <button onClick={() => abrirEditar(u)} title="Editar"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors">
                              <FaEdit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {puede('eliminar', 'usuarios') && u.id_usuario !== yo?.id && (
                            <button onClick={() => setConfirm(u)} title="Desactivar"
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
      <Modal open={modal} onClose={cerrarModal} title={editando ? 'Editar Usuario' : 'Nuevo Usuario'} maxWidth="max-w-lg">
        {formError && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{formError}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombres *</label>
              <input name="nombres" value={form.nombres} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Apellidos *</label>
              <input name="apellidos" value={form.apellidos} onChange={handleChange} required className={inputCls} />
            </div>
            {!editando && (
              <div>
                <label className={labelCls}>Username *</label>
                <input name="username" value={form.username} onChange={handleChange} required className={inputCls} autoComplete="off" />
              </div>
            )}
            {!editando && (
              <div>
                <label className={labelCls}>Contraseña temporal *</label>
                <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} className={inputCls} autoComplete="new-password" />
              </div>
            )}
            <div>
              <label className={labelCls}>Documento (CI)</label>
              <input name="documento" value={form.documento ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input name="telefono" value={form.telefono ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Email</label>
              <input name="email" type="email" value={form.email ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Rol *</label>
              <select name="id_rol" value={form.id_rol} onChange={handleChange} required className={inputCls}>
                <option value="">Seleccionar</option>
                {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sucursal principal</label>
              <select name="id_sucursal_default" value={form.id_sucursal_default ?? ''} onChange={handleChange} className={inputCls}>
                <option value="">Sin asignar</option>
                {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
          {editando && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="activo" checked={form.activo ?? true} onChange={handleChange} className="rounded accent-amber-500" />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Usuario activo</span>
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrarModal} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              {editando ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmar desactivar */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar Usuario" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Desactivar a <strong className="text-gray-900 dark:text-white">{confirm?.nombres} {confirm?.apellidos}</strong>?
          Sus sesiones activas también se cerrarán.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button onClick={() => handleEliminar(confirm)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">Desactivar</button>
        </div>
      </Modal>

      <ResetPassModal  open={!!resetModal} onClose={() => setResetModal(null)} usuario={resetModal} />
      <SucursalesModal open={!!sucModal}   onClose={() => setSucModal(null)}   usuario={sucModal} onSaved={cargar} />
    </div>
  );
}
