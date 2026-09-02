import { useState, useEffect } from 'react';
import {
  FaPlus, FaEdit, FaTrash, FaSpinner, FaUsers, FaKey, FaStore,
  FaSignOutAlt, FaCheckCircle, FaTimesCircle, FaSearch, FaEye, FaEyeSlash,
} from 'react-icons/fa';
import { usuariosService } from '../../services/usuariosRoles.service';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import { isValidEmail, validatePassword } from '../../utils/validation';

const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';
const EMPTY    = {
  username: '', password: '', nombres: '', apellidos: '', cargo: '', documento: '', email: '',
  telefono: '', celular: '', direccion: '', celular_emergencia: '', nombre_contacto_emergencia: '',
  fecha_nacimiento: '', fecha_ingreso: '', id_rol: '', id_sucursal_default: '', activo: true, porcentaje_comision: 0,
};

// ── Campo de contraseña con ojo para mostrar/ocultar ───────────────────────────
function PasswordField({ name, value, onChange, required, minLength, placeholder, autoComplete }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input
        name={name} type={ver ? 'text' : 'password'} value={value} onChange={onChange}
        required={required} minLength={minLength} placeholder={placeholder} autoComplete={autoComplete}
        className={`${inputCls} pr-10`}
      />
      <button
        type="button" onClick={() => setVer(v => !v)} tabIndex={-1}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
        title={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {ver ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ nombres, apellidos }) {
  const ini = [nombres?.[0], apellidos?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  return (
    <div className="w-9 h-9 rounded-xl bg-amber-400 text-zinc-900 flex items-center justify-center text-xs font-bold shrink-0 select-none">
      {ini}
    </div>
  );
}

// ── Badge estado ──────────────────────────────────────────────────────────────
function BadgeEstado({ activo }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
      activo
        ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
        : 'bg-gray-100 dark:bg-zinc-700/60 text-gray-500 dark:text-zinc-400'
    }`}>
      {activo
        ? <FaCheckCircle className="h-2.5 w-2.5 shrink-0" />
        : <FaTimesCircle className="h-2.5 w-2.5 shrink-0" />}
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

// ── Botón de acción ───────────────────────────────────────────────────────────
function AccionBtn({ title, color, icon: Icon, onClick }) {
  const hov = {
    blue:   'hover:text-blue-600   hover:bg-blue-50   dark:hover:bg-blue-500/10',
    amber:  'hover:text-amber-600  hover:bg-amber-50  dark:hover:bg-amber-500/10',
    purple: 'hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10',
    green:  'hover:text-green-600  hover:bg-green-50  dark:hover:bg-green-500/10',
    red:    'hover:text-red-600    hover:bg-red-50    dark:hover:bg-red-500/10',
  };
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded-lg text-gray-400 transition-colors ${hov[color]}`}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// ── Modal: Asignar sucursales ─────────────────────────────────────────────────
function SucursalesModal({ open, onClose, usuario, onSaved }) {
  const [todas,         setTodas]         = useState([]);
  const [seleccionadas, setSeleccionadas] = useState(new Set());
  const [principal,     setPrincipal]     = useState(null);
  const [guardando,     setGuardando]     = useState(false);
  const [cargando,      setCargando]      = useState(true);
  const [error,         setError]         = useState(null);

  useEffect(() => {
    if (!open || !usuario) return;
    setCargando(true); setError(null);
    Promise.all([usuariosService.getFormData(), usuariosService.getOne(usuario.id_usuario)])
      .then(([{ data: fd }, { data: u }]) => {
        setTodas(fd.sucursales);
        const ids = new Set(u.sucursales.map(x => x.id_sucursal));
        setSeleccionadas(ids);
        // Preseleccionar la sucursal principal actual
        const def = u.usuario?.id_sucursal_default ?? usuario.id_sucursal_default;
        setPrincipal(def && ids.has(def) ? def : (ids.size > 0 ? [...ids][0] : null));
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setCargando(false));
  }, [open, usuario]);

  const toggle = (id) => setSeleccionadas(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
      // Si quitamos la principal, reasignar a la primera disponible
      if (principal === id) setPrincipal(next.size > 0 ? [...next][0] : null);
    } else {
      next.add(id);
      if (!principal) setPrincipal(id);
    }
    return next;
  });

  const guardar = async () => {
    setGuardando(true); setError(null);
    try {
      await usuariosService.asignarSucursales(usuario.id_usuario, [...seleccionadas], principal);
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const selArr = [...seleccionadas];

  return (
    <Modal open={open} onClose={onClose} title={`Sucursales — ${usuario?.nombres} ${usuario?.apellidos}`} maxWidth="max-w-md">
      {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
      {cargando ? (
        <div className="flex items-center justify-center h-32 text-gray-400"><FaSpinner className="animate-spin h-5 w-5" /></div>
      ) : (
        <>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-2">Selecciona las sucursales a las que tiene acceso este usuario.</p>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {todas.map(s => {
              const checked = seleccionadas.has(s.id_sucursal);
              const esPrincipal = principal === s.id_sucursal;
              return (
                <div key={s.id_sucursal} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${checked ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-zinc-800'}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(s.id_sucursal)} className="rounded accent-amber-500 shrink-0 cursor-pointer" />
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggle(s.id_sucursal)}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.nombre}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500">{s.codigo} · {s.tipo}</p>
                  </div>
                  {checked && (
                    <button
                      type="button"
                      onClick={() => setPrincipal(s.id_sucursal)}
                      title="Establecer como sucursal principal"
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                        esPrincipal
                          ? 'bg-amber-400 border-amber-400 text-zinc-900'
                          : 'border-gray-300 dark:border-zinc-600 text-gray-400 dark:text-zinc-500 hover:border-amber-400 hover:text-amber-500'
                      }`}
                    >
                      {esPrincipal ? '★ Principal' : '☆ Principal'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {selArr.length > 0 && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400">
              Sucursal principal (inventario y ventas por defecto):{' '}
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {todas.find(s => s.id_sucursal === principal)?.nombre ?? '—'}
              </span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800 mt-3">
            <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />} Guardar
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Modal: Reset contraseña ───────────────────────────────────────────────────
function ResetPassModal({ open, onClose, usuario }) {
  const [pass,      setPass]      = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);
  const [ok,        setOk]        = useState(false);

  useEffect(() => { if (open) { setPass(''); setError(null); setOk(false); } }, [open]);

  const guardar = async () => {
    const passErr = validatePassword(pass);
    if (passErr) { setError(passErr); return; }
    setGuardando(true); setError(null);
    try {
      await usuariosService.resetPassword(usuario.id_usuario, { nueva_password: pass });
      setOk(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al resetear');
    } finally { setGuardando(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Resetear contraseña" maxWidth="max-w-sm">
      {ok ? (
        <div className="text-center py-4">
          <FaCheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="text-sm text-gray-700 dark:text-zinc-300">Contraseña reseteada. El usuario deberá cambiarla al iniciar sesión.</p>
          <button onClick={onClose} className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 transition-all">Cerrar</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4">
            Nueva contraseña temporal para <strong className="text-gray-900 dark:text-white">{usuario?.nombres} {usuario?.apellidos}</strong>.
          </p>
          {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
          <div className="mb-4">
            <label className={labelCls}>Nueva contraseña *</label>
            <PasswordField value={pass} onChange={e => setPass(e.target.value)} placeholder="Mín. 8 car., 1 mayúscula, 1 número" autoComplete="new-password" />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />} Resetear
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Tarjeta de usuario ────────────────────────────────────────────────────────
function UserCard({ u, yo, puede, onEdit, onDelete, onReset, onSucursales, onCerrarSesiones }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 transition-shadow hover:shadow-md dark:hover:shadow-zinc-950/60 ${!u.activo ? 'opacity-60' : ''}`}>

      {/* Cabecera: avatar + nombre + estado */}
      <div className="flex items-start gap-3">
        <Avatar nombres={u.nombres} apellidos={u.apellidos} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate leading-tight">
            {u.nombres} {u.apellidos}
          </p>
          <span className="font-mono text-xs text-gray-400 dark:text-zinc-500">@{u.username}</span>
        </div>
        <BadgeEstado activo={u.activo} />
      </div>

      {/* Detalles */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <span className="truncate">{u.rol_nombre}{u.cargo ? ` · ${u.cargo}` : ''}</span>
        </div>
        {u.sucursal_nombre && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-600 shrink-0" />
            <span className="truncate">{u.sucursal_nombre}</span>
          </div>
        )}
        {u.email && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-600 shrink-0" />
            <span className="truncate">{u.email}</span>
          </div>
        )}
        {u.documento && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-600 shrink-0" />
            <span className="truncate">CI: {u.documento}</span>
          </div>
        )}
        {(u.telefono || u.celular) && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-600 shrink-0" />
            <span className="truncate">{[u.telefono, u.celular].filter(Boolean).join(' / ')}</span>
          </div>
        )}
        {u.celular_emergencia && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-300 dark:bg-red-500/60 shrink-0" />
            <span className="truncate">
              Emergencia: {u.celular_emergencia}{u.nombre_contacto_emergencia ? ` (${u.nombre_contacto_emergencia})` : ''}
            </span>
          </div>
        )}
        {(u.fecha_nacimiento || u.fecha_ingreso) && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-600 shrink-0" />
            <span className="truncate">
              {[
                u.fecha_nacimiento && `Nac.: ${new Date(u.fecha_nacimiento).toLocaleDateString('es-BO')}`,
                u.fecha_ingreso && `Ingreso: ${new Date(u.fecha_ingreso).toLocaleDateString('es-BO')}`,
              ].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
        {u.direccion && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-600 shrink-0" />
            <span className="truncate">{u.direccion}</span>
          </div>
        )}
        {Number(u.porcentaje_comision) > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-600 shrink-0" />
            <span className="truncate">Comisión: {Number(u.porcentaje_comision)}%</span>
          </div>
        )}
        {!!u.debe_cambiar_pass && (
          <span className="inline-block text-xs text-amber-600 dark:text-amber-400 font-medium">⚠ Debe cambiar contraseña</span>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 pt-1 border-t border-gray-100 dark:border-zinc-800">
        {puede('asignar_sucursales', 'usuarios') && (
          <AccionBtn title="Sucursales" color="blue" icon={FaStore} onClick={() => onSucursales(u)} />
        )}
        {puede('resetear_password', 'usuarios') && (
          <AccionBtn title="Resetear contraseña" color="amber" icon={FaKey} onClick={() => onReset(u)} />
        )}
        {puede('cerrar_sesiones', 'usuarios') && u.id_usuario !== yo?.id && (
          <AccionBtn title="Cerrar sesiones" color="purple" icon={FaSignOutAlt} onClick={() => onCerrarSesiones(u)} />
        )}
        {puede('editar', 'usuarios') && (
          <AccionBtn title="Editar" color="green" icon={FaEdit} onClick={() => onEdit(u)} />
        )}
        {puede('eliminar', 'usuarios') && u.id_usuario !== yo?.id && (
          <AccionBtn title="Desactivar" color="red" icon={FaTrash} onClick={() => onDelete(u)} />
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Usuarios() {
  const { puede }       = usePermission();
  const { usuario: yo } = useAuth();

  const [lista,      setLista]      = useState([]);
  const [roles,      setRoles]      = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [error,      setError]      = useState(null);
  const [busqueda,   setBusqueda]   = useState('');

  const [modal,      setModal]      = useState(false);
  const [editando,   setEditando]   = useState(null);
  const [form,       setForm]       = useState(EMPTY);
  const [guardando,  setGuardando]  = useState(false);
  const [formError,  setFormError]  = useState(null);

  const [confirm,      setConfirm]      = useState(null);
  const [resetModal,   setResetModal]   = useState(null);
  const [sucModal,     setSucModal]     = useState(null);
  const [sesionConfirm, setSesionConfirm] = useState(null);
  const [toast,        setToast]        = useState(null);

  const cargar = () => {
    setCargando(true);
    usuariosService.getAll()
      .then(({ data: u }) => setLista(u.usuarios))
      .catch(() => setError('Error al cargar usuarios'))
      .finally(() => setCargando(false));
  };
  useEffect(cargar, []);

  const abrirModal = (u = null) => {
    setEditando(u);
    setForm(u ? {
      ...u, password: '', activo: !!u.activo,
      fecha_nacimiento: u.fecha_nacimiento ? String(u.fecha_nacimiento).slice(0, 10) : '',
      fecha_ingreso:    u.fecha_ingreso    ? String(u.fecha_ingreso).slice(0, 10)    : '',
    } : EMPTY);
    setFormError(null);
    // Cargar roles y sucursales desde el endpoint del propio módulo de usuarios
    usuariosService.getFormData()
      .then(({ data }) => {
        setRoles(data.roles);
        setSucursales(data.sucursales);
      })
      .catch(() => setFormError('No se pudieron cargar los datos del formulario'));
    setModal(true);
  };

  const abrirCrear  = () => abrirModal(null);
  const abrirEditar = (u) => abrirModal(u);
  const cerrarModal = () => { setModal(false); setFormError(null); };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setFormError(null);
    if (!editando) {
      const passErr = validatePassword(form.password);
      if (passErr) return setFormError(passErr);
    }
    if (form.email?.trim() && !isValidEmail(form.email)) return setFormError('El formato del email no es válido');
    setGuardando(true);
    try {
      if (editando) await usuariosService.update(editando.id_usuario, form);
      else          await usuariosService.create(form);
      cerrarModal(); cargar();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const handleEliminar = async (u) => {
    try { await usuariosService.remove(u.id_usuario); setConfirm(null); cargar(); }
    catch (err) { setError(err.response?.data?.error || 'Error al desactivar'); setConfirm(null); }
  };

  const showToast = (msg, tipo = 'ok') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCerrarSesiones = async (u) => {
    setSesionConfirm(u);
  };

  const confirmarCerrarSesiones = async () => {
    const u = sesionConfirm;
    setSesionConfirm(null);
    try {
      const { data } = await usuariosService.cerrarSesiones(u.id_usuario);
      showToast(data.mensaje || 'Sesiones cerradas correctamente', 'ok');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al cerrar sesiones', 'error');
    }
  };

  const filtrados = busqueda
    ? lista.filter(u => `${u.nombres} ${u.apellidos} ${u.username} ${u.email ?? ''}`.toLowerCase().includes(busqueda.toLowerCase()))
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

      {/* Buscador */}
      <div className="mb-4 relative max-w-xs">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 pointer-events-none" />
        <input
          placeholder="Buscar usuario..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="pl-9 pr-3 py-2 w-full rounded-xl text-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-colors"
        />
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <FaSpinner className="animate-spin h-6 w-6" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-zinc-500">
          <FaUsers className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">{busqueda ? 'Sin resultados' : 'No hay usuarios registrados'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrados.map(u => (
            <UserCard
              key={u.id_usuario}
              u={u}
              yo={yo}
              puede={puede}
              onEdit={abrirEditar}
              onDelete={setConfirm}
              onReset={setResetModal}
              onSucursales={setSucModal}
              onCerrarSesiones={handleCerrarSesiones}
            />
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal open={modal} onClose={cerrarModal} title={editando ? 'Editar usuario' : 'Nuevo usuario'} maxWidth="max-w-lg">
        {formError && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{formError}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombres *</label>
              <input name="nombres" value={form.nombres} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Apellidos *</label>
              <input name="apellidos" value={form.apellidos} onChange={handleChange} required className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Cargo</label>
              <input name="cargo" value={form.cargo ?? ''} onChange={handleChange} className={inputCls} placeholder="Ej: Ejecutivo de Ventas" />
            </div>
            {!editando && (<>
              <div>
                <label className={labelCls}>Username *</label>
                <input name="username" value={form.username} onChange={handleChange} required className={inputCls} autoComplete="off" />
              </div>
              <div>
                <label className={labelCls}>Contraseña temporal *</label>
                <PasswordField name="password" value={form.password} onChange={handleChange} required minLength={6} autoComplete="new-password" />
              </div>
            </>)}
            <div>
              <label className={labelCls}>Documento (CI)</label>
              <input name="documento" value={form.documento ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input name="telefono" value={form.telefono ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Celular</label>
              <input name="celular" value={form.celular ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Celular de emergencia</label>
              <input name="celular_emergencia" value={form.celular_emergencia ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nombre contacto de emergencia</label>
              <input name="nombre_contacto_emergencia" value={form.nombre_contacto_emergencia ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha de nacimiento</label>
              <input name="fecha_nacimiento" type="date" value={form.fecha_nacimiento ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha de ingreso</label>
              <input name="fecha_ingreso" type="date" value={form.fecha_ingreso ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Email</label>
              <input name="email" type="email" value={form.email ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Dirección</label>
              <input name="direccion" value={form.direccion ?? ''} onChange={handleChange} className={inputCls} />
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
            <div>
              <label className={labelCls}>Comisión sobreprecio (%)</label>
              <input
                name="porcentaje_comision"
                type="number" min="0" max="100" step="0.01"
                value={form.porcentaje_comision ?? 0}
                onChange={handleChange}
                className={inputCls}
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                % que recibe el vendedor sobre el precio por encima del precio publicado
              </p>
            </div>
          </div>
          {editando && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" name="activo" checked={form.activo ?? true} onChange={handleChange} className="rounded accent-amber-500" />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Usuario activo</span>
            </label>
          )}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
            <button type="button" onClick={cerrarModal} className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              {editando ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmar desactivar */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar usuario" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Desactivar a <strong className="text-gray-900 dark:text-white">{confirm?.nombres} {confirm?.apellidos}</strong>?
          Sus sesiones activas también se cerrarán.
        </p>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button onClick={() => setConfirm(null)} className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button onClick={() => handleEliminar(confirm)} className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">Desactivar</button>
        </div>
      </Modal>

      <ResetPassModal  open={!!resetModal} onClose={() => setResetModal(null)} usuario={resetModal} />
      <SucursalesModal open={!!sucModal}   onClose={() => setSucModal(null)}   usuario={sucModal}   onSaved={cargar} />

      {/* Modal confirmar cerrar sesiones */}
      <Modal open={!!sesionConfirm} onClose={() => setSesionConfirm(null)} title="Cerrar sesiones" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Cerrar todas las sesiones activas de{' '}
          <strong className="text-gray-900 dark:text-white">{sesionConfirm?.nombres} {sesionConfirm?.apellidos}</strong>?
          El usuario tendrá que volver a iniciar sesión.
        </p>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button onClick={() => setSesionConfirm(null)} className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button onClick={confirmarCerrarSesiones} className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-purple-500 hover:bg-purple-600 text-white transition-all">Cerrar sesiones</button>
        </div>
      </Modal>

      {/* Toast de notificación */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.tipo === 'ok'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
