import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaSpinner, FaEdit, FaSave, FaTimes,
  FaPlus, FaTrash, FaUser, FaCreditCard, FaStar,
  FaMapMarkerAlt, FaClock, FaPhone, FaEnvelope,
  FaMoneyBillWave, FaCheckCircle,
} from 'react-icons/fa';
import { proveedoresService } from '../../services/proveedores.service';
import { usePermission } from '../../hooks/usePermission';
import Modal from '../../components/ui/Modal';
import { isValidEmail } from '../../utils/validation';

const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';

// Filtros de entrada
const filtroTelefono     = v => v.replace(/[^\d+\-()\s]/g, '');
const filtroNit          = v => v.replace(/[^a-zA-Z0-9\-\.]/g, '');
const filtroNumeroCuenta = v => v.replace(/[^\d\-]/g, '');
const filtroSoloLetras   = v => v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
const filtroEnteroPos    = v => v.replace(/\D/g, '');

const METODOS      = ['EFECTIVO', 'TRANSFERENCIA', 'QR', 'CHEQUE', 'OTRO'];
const METODO_LABEL = { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', QR: 'QR', CHEQUE: 'Cheque', OTRO: 'Otro' };
const METODO_COLOR = {
  EFECTIVO:      'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',
  TRANSFERENCIA: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  QR:            'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
  CHEQUE:        'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
  OTRO:          'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400',
};

const TIPO_BADGE = {
  NACIONAL:      'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  INTERNACIONAL: 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

const EMPTY_PROV = {
  codigo: '', razon_social: '', nombre_comercial: '', nit: '',
  tipo_proveedor: 'NACIONAL', direccion: '', ciudad: '', pais: 'Bolivia',
  telefono: '', email: '', contacto_principal: '', plazo_credito_dias: 0, activo: true,
};
const EMPTY_CONT  = { nombre: '', cargo: '', telefono: '', email: '' };
const EMPTY_CUENTA = {
  metodo: 'TRANSFERENCIA', id_banco: '', tipo_cuenta: '', numero_cuenta: '',
  titular: '', qr_url: '', id_moneda: '', es_principal: false, activo: true,
};

// ── Tab Datos Generales ───────────────────────────────────────────────────
function TabDatos({ proveedor, puedeEditar, onSaved }) {
  const [editando,  setEditando]  = useState(false);
  const [form,      setForm]      = useState({ ...EMPTY_PROV });
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (proveedor) setForm({ ...proveedor, activo: !!proveedor.activo });
  }, [proveedor]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') return setForm(prev => ({ ...prev, [name]: checked }));
    let v = value;
    if (name === 'telefono')            v = filtroTelefono(v);
    if (name === 'nit')                 v = filtroNit(v);
    if (name === 'plazo_credito_dias')  v = filtroEnteroPos(v);
    setForm(prev => ({ ...prev, [name]: v }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.email?.trim() && !isValidEmail(form.email))
      return setError('El formato del email no es válido');
    setGuardando(true);
    try {
      await proveedoresService.update(proveedor.id_proveedor, form);
      setEditando(false);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = () => {
    setForm({ ...proveedor, activo: !!proveedor.activo });
    setEditando(false);
    setError(null);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Código</label>
          <input name="codigo" value={form.codigo} onChange={handleChange} required disabled={!editando}
            className={inputCls} style={{ textTransform: 'uppercase' }} />
        </div>
        <div>
          <label className={labelCls}>Razón Social</label>
          <input name="razon_social" value={form.razon_social} onChange={handleChange} required disabled={!editando}
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Nombre Comercial</label>
          <input name="nombre_comercial" value={form.nombre_comercial || ''} onChange={handleChange} disabled={!editando}
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>NIT / RUC</label>
          <input name="nit" value={form.nit || ''} onChange={handleChange} disabled={!editando}
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Tipo de proveedor</label>
          <select name="tipo_proveedor" value={form.tipo_proveedor} onChange={handleChange} disabled={!editando}
            className={inputCls}>
            <option value="NACIONAL">Nacional</option>
            <option value="INTERNACIONAL">Internacional</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Plazo de crédito (días)</label>
          <input name="plazo_credito_dias" type="number" min="0" step="1" value={form.plazo_credito_dias}
            onChange={handleChange} disabled={!editando} className={inputCls} inputMode="numeric" />
        </div>
        <div>
          <label className={labelCls}>Ciudad</label>
          <input name="ciudad" value={form.ciudad || ''} onChange={handleChange} disabled={!editando}
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>País</label>
          <input name="pais" value={form.pais || ''} onChange={handleChange} disabled={!editando}
            className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Dirección</label>
        <input name="direccion" value={form.direccion || ''} onChange={handleChange} disabled={!editando}
          className={inputCls} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Teléfono</label>
          <input name="telefono" value={form.telefono || ''} onChange={handleChange} disabled={!editando}
            className={inputCls} inputMode="tel" maxLength={20} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input name="email" type="email" value={form.email || ''} onChange={handleChange} disabled={!editando}
            className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Contacto principal</label>
        <input name="contacto_principal" value={form.contacto_principal || ''} onChange={handleChange} disabled={!editando}
          className={inputCls} />
      </div>

      {editando && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange}
            className="rounded accent-amber-500" />
          <span className="text-sm text-gray-700 dark:text-zinc-300">Activo</span>
        </label>
      )}

      {puedeEditar && (
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
          {editando ? (
            <>
              <button type="button" onClick={cancelar}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                <FaTimes className="h-3.5 w-3.5" /> Cancelar
              </button>
              <button type="submit" disabled={guardando}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
                {guardando ? <FaSpinner className="animate-spin h-4 w-4" /> : <FaSave className="h-3.5 w-3.5" />}
                Guardar cambios
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setEditando(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 transition-all">
              <FaEdit className="h-3.5 w-3.5" /> Editar
            </button>
          )}
        </div>
      )}
    </form>
  );
}

// ── Tab Contactos ─────────────────────────────────────────────────────────
function TabContactos({ idProveedor, puedeGestionar }) {
  const [lista,     setLista]     = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [modal,     setModal]     = useState(false);
  const [confirm,   setConfirm]   = useState(null);
  const [editando,  setEditando]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_CONT);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);

  const cargar = useCallback(() => {
    setCargando(true);
    proveedoresService.getContactos(idProveedor)
      .then(({ data }) => setLista(data.contactos))
      .finally(() => setCargando(false));
  }, [idProveedor]);

  useEffect(cargar, [cargar]);

  const abrirCrear  = () => { setEditando(null); setForm(EMPTY_CONT); setError(null); setModal(true); };
  const abrirEditar = (c) => { setEditando(c); setForm({ ...c }); setError(null); setModal(true); };
  const cerrar      = () => { setModal(false); setError(null); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'nombre')   v = filtroSoloLetras(v);
    if (name === 'cargo')    v = filtroSoloLetras(v);
    if (name === 'telefono') v = filtroTelefono(v);
    setForm(prev => ({ ...prev, [name]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.email?.trim() && !isValidEmail(form.email))
      return setError('El formato del email no es válido');
    setGuardando(true);
    try {
      if (editando) {
        await proveedoresService.updateContacto(idProveedor, editando.id_contacto, form);
      } else {
        await proveedoresService.createContacto(idProveedor, form);
      }
      cerrar();
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await proveedoresService.deleteContacto(idProveedor, id);
      setConfirm(null);
      cargar();
    } catch {
      setConfirm(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400 dark:text-zinc-500">{lista.length} contacto{lista.length !== 1 ? 's' : ''}</p>
        {puedeGestionar && (
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 transition-all">
            <FaPlus className="h-3 w-3" /> Agregar contacto
          </button>
        )}
      </div>

      {cargando ? (
        <div className="flex justify-center py-10 text-gray-400"><FaSpinner className="animate-spin h-5 w-5" /></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-14 text-gray-400 dark:text-zinc-500">
          <FaUser className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay contactos registrados</p>
          {puedeGestionar && (
            <button onClick={abrirCrear} className="mt-2 text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors">
              Agregar contacto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lista.map(c => (
            <div key={c.id_contacto}
              className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 flex items-start justify-between gap-3 border border-gray-200 dark:border-zinc-700">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{c.nombre}</p>
                {c.cargo && <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{c.cargo}</p>}
                <div className="flex flex-col gap-1 mt-2">
                  {c.telefono && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                      <FaPhone className="h-2.5 w-2.5 shrink-0" /> {c.telefono}
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                      <FaEnvelope className="h-2.5 w-2.5 shrink-0" /> {c.email}
                    </div>
                  )}
                </div>
              </div>
              {puedeGestionar && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => abrirEditar(c)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                    <FaEdit className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setConfirm(c)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <FaTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={cerrar} title={editando ? 'Editar Contacto' : 'Nuevo Contacto'}>
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required
              className={inputCls} placeholder="Nombre completo" />
          </div>
          <div>
            <label className={labelCls}>Cargo</label>
            <input name="cargo" value={form.cargo} onChange={handleChange}
              className={inputCls} placeholder="Ej: Gerente de ventas" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={handleChange}
                className={inputCls} placeholder="+591..." inputMode="tel" maxLength={20} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                className={inputCls} placeholder="correo@..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrar}
              className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              {editando ? 'Guardar cambios' : 'Agregar contacto'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar Contacto" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Eliminar el contacto <strong className="text-gray-900 dark:text-white">{confirm?.nombre}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button onClick={() => handleEliminar(confirm.id_contacto)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Tab Cuentas de Pago ───────────────────────────────────────────────────
function TabCuentas({ idProveedor, puedeGestionar }) {
  const [lista,     setLista]     = useState([]);
  const [monedas,   setMonedas]   = useState([]);
  const [bancos,    setBancos]    = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [modal,     setModal]     = useState(false);
  const [confirm,   setConfirm]   = useState(null);
  const [editando,  setEditando]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_CUENTA);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);

  const cargar = useCallback(() => {
    setCargando(true);
    proveedoresService.getCuentas(idProveedor)
      .then(({ data }) => setLista(data.cuentas))
      .finally(() => setCargando(false));
  }, [idProveedor]);

  useEffect(cargar, [cargar]);
  useEffect(() => {
    proveedoresService.getFormData()
      .then(({ data }) => {
        setMonedas(data.monedas ?? []);
        setBancos(data.bancos ?? []);
      })
      .catch(() => {});
  }, []);

  const abrirCrear  = () => { setEditando(null); setForm(EMPTY_CUENTA); setError(null); setModal(true); };
  const abrirEditar = (c) => {
    setEditando(c);
    setForm({ ...c, es_principal: !!c.es_principal, activo: !!c.activo, id_moneda: c.id_moneda || '', id_banco: c.id_banco || '' });
    setError(null);
    setModal(true);
  };
  const cerrar = () => { setModal(false); setError(null); };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') return setForm(prev => ({ ...prev, [name]: checked }));
    let v = value;
    if (name === 'numero_cuenta') v = filtroNumeroCuenta(v);
    if (name === 'tipo_cuenta')   v = filtroSoloLetras(v);
    if (name === 'titular')       v = filtroSoloLetras(v);
    setForm(prev => ({ ...prev, [name]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const payload = { ...form, id_moneda: form.id_moneda || null };
      if (editando) {
        await proveedoresService.updateCuenta(idProveedor, editando.id_cuenta, payload);
      } else {
        await proveedoresService.createCuenta(idProveedor, payload);
      }
      cerrar();
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleDesactivar = async (id) => {
    try {
      await proveedoresService.deleteCuenta(idProveedor, id);
      setConfirm(null);
      cargar();
    } catch {
      setConfirm(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400 dark:text-zinc-500">{lista.length} cuenta{lista.length !== 1 ? 's' : ''}</p>
        {puedeGestionar && (
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 transition-all">
            <FaPlus className="h-3 w-3" /> Agregar cuenta
          </button>
        )}
      </div>

      {cargando ? (
        <div className="flex justify-center py-10 text-gray-400"><FaSpinner className="animate-spin h-5 w-5" /></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-14 text-gray-400 dark:text-zinc-500">
          <FaCreditCard className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay cuentas de pago registradas</p>
          {puedeGestionar && (
            <button onClick={abrirCrear} className="mt-2 text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors">
              Agregar cuenta
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lista.map(c => (
            <div key={c.id_cuenta}
              className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 border border-gray-200 dark:border-zinc-700 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {c.es_principal && <FaStar className="h-3 w-3 text-amber-400 shrink-0" title="Principal" />}
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${METODO_COLOR[c.metodo]}`}>
                    {METODO_LABEL[c.metodo]}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.activo
                      ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'
                  }`}>
                    {c.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                {puedeGestionar && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => abrirEditar(c)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                      <FaEdit className="h-3.5 w-3.5" />
                    </button>
                    {c.activo && (
                      <button onClick={() => setConfirm(c)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <FaTrash className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 text-xs text-gray-600 dark:text-zinc-400">
                {c.banco_nombre && (
                  <p className="font-medium text-gray-800 dark:text-zinc-200">
                    {c.banco_nombre}{c.banco_sigla ? ` (${c.banco_sigla})` : ''}
                    {c.tipo_cuenta ? <span className="font-normal text-gray-500 dark:text-zinc-400"> · {c.tipo_cuenta}</span> : null}
                  </p>
                )}
                {c.numero_cuenta && (
                  <p className="font-mono text-gray-700 dark:text-zinc-300">{c.numero_cuenta}</p>
                )}
                {c.titular && <p>{c.titular}</p>}
                {c.moneda_simbolo && (
                  <p className="text-amber-600 dark:text-amber-400 font-medium">{c.moneda_simbolo} {c.moneda_nombre}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar cuenta */}
      <Modal open={modal} onClose={cerrar} title={editando ? 'Editar Cuenta de Pago' : 'Nueva Cuenta de Pago'} maxWidth="max-w-lg">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Método de pago *</label>
            <select name="metodo" value={form.metodo} onChange={handleChange} required className={inputCls}>
              {METODOS.map(m => <option key={m} value={m}>{METODO_LABEL[m]}</option>)}
            </select>
          </div>
          {form.metodo !== 'EFECTIVO' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Banco / Entidad</label>
                  <select name="id_banco" value={form.id_banco} onChange={handleChange} className={inputCls}>
                    <option value="">— Sin especificar —</option>
                    {bancos.map(b => (
                      <option key={b.id_banco} value={b.id_banco}>
                        {b.nombre}{b.sigla ? ` (${b.sigla})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tipo de cuenta</label>
                  <input name="tipo_cuenta" value={form.tipo_cuenta} onChange={handleChange}
                    className={inputCls} placeholder="Ej: Caja de ahorro" />
                </div>
              </div>
              {form.metodo === 'QR' ? (
                <div>
                  <label className={labelCls}>URL del QR</label>
                  <input name="qr_url" value={form.qr_url} onChange={handleChange}
                    className={inputCls} placeholder="https://..." />
                </div>
              ) : (
                <div>
                  <label className={labelCls}>Número de cuenta</label>
                  <input name="numero_cuenta" value={form.numero_cuenta} onChange={handleChange}
                    className={inputCls} placeholder="Número de cuenta" inputMode="numeric" maxLength={30} />
                </div>
              )}
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Titular</label>
              <input name="titular" value={form.titular} onChange={handleChange}
                className={inputCls} placeholder="Nombre del titular" />
            </div>
            <div>
              <label className={labelCls}>Moneda</label>
              <select name="id_moneda" value={form.id_moneda} onChange={handleChange} className={inputCls}>
                <option value="">— Sin especificar —</option>
                {monedas.map(m => (
                  <option key={m.id_moneda} value={m.id_moneda}>{m.simbolo} {m.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="es_principal" checked={form.es_principal} onChange={handleChange}
                className="rounded accent-amber-500" />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Cuenta principal</span>
            </label>
            {editando && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange}
                  className="rounded accent-amber-500" />
                <span className="text-sm text-gray-700 dark:text-zinc-300">Activa</span>
              </label>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrar}
              className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              {editando ? 'Guardar cambios' : 'Agregar cuenta'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar Cuenta" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Desactivar la cuenta <strong className="text-gray-900 dark:text-white">{METODO_LABEL[confirm?.metodo]}</strong>
          {confirm?.numero_cuenta ? ` (${confirm.numero_cuenta})` : ''}?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button onClick={() => handleDesactivar(confirm.id_cuenta)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">
            Desactivar
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Tab Saldo / Cuenta por Pagar ─────────────────────────────────────────
const ESTADO_COLOR = {
  RECIBIDO: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',
  PARCIAL:  'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
  CONFIRMADO: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  POR_LLEGAR: 'bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400',
};
const ESTADO_LABEL = {
  RECIBIDO: 'Recibido', PARCIAL: 'Parcial', CONFIRMADO: 'Confirmado', POR_LLEGAR: 'Por llegar',
};

const fmt = (val) => parseFloat(val ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function TabSaldo({ idProveedor }) {
  const [datos,    setDatos]    = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    setCargando(true);
    setError(null);
    proveedoresService.getSaldo(idProveedor)
      .then(({ data }) => setDatos(data))
      .catch(() => setError('Error al cargar el saldo'))
      .finally(() => setCargando(false));
  }, [idProveedor]);

  if (cargando) return (
    <div className="flex justify-center py-14 text-gray-400"><FaSpinner className="animate-spin h-5 w-5" /></div>
  );
  if (error) return (
    <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
  );

  const { saldo_actual, compras_pendientes, ultimos_pagos } = datos;
  const sinDeuda = parseFloat(saldo_actual) <= 0;

  return (
    <div className="space-y-6">

      {/* Tarjeta saldo */}
      <div className={`rounded-xl p-5 flex items-center gap-4 border ${
        sinDeuda
          ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20'
          : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
      }`}>
        {sinDeuda
          ? <FaCheckCircle className="h-8 w-8 text-green-500 shrink-0" />
          : <FaMoneyBillWave className="h-8 w-8 text-amber-500 shrink-0" />
        }
        <div>
          <p className={`text-xs font-medium uppercase tracking-wide ${
            sinDeuda ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
            {sinDeuda ? 'Sin deuda pendiente' : 'Saldo total pendiente'}
          </p>
          <p className={`text-2xl font-bold ${
            sinDeuda ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
          }`}>
            Bs. {fmt(saldo_actual)}
          </p>
        </div>
      </div>

      {/* Compras con saldo pendiente */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-200 mb-3 flex items-center gap-2">
          Compras con saldo pendiente
          <span className="bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full font-normal">
            {compras_pendientes.length}
          </span>
        </h3>
        {compras_pendientes.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-8">No hay compras con saldo pendiente</p>
        ) : (
          <div className="space-y-2">
            {compras_pendientes.map(c => (
              <div key={c.id_compra}
                className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">{c.numero}</span>
                    {c.estado && (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLOR[c.estado] ?? 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                        {ESTADO_LABEL[c.estado] ?? c.estado}
                      </span>
                    )}
                    {c.condicion_pago === 'CREDITO' && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400">
                        Crédito {c.dias_credito}d
                      </span>
                    )}
                  </div>
                  {c.numero_factura && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Factura: {c.numero_factura}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                    {c.fecha_pedido ? new Date(c.fecha_pedido).toLocaleDateString('es-BO') : '—'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Total: {c.moneda_simbolo} {fmt(c.total)}
                  </p>
                  <p className="font-bold text-red-600 dark:text-red-400 text-sm">
                    {c.moneda_simbolo} {fmt(c.saldo_pendiente)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500">pendiente</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Últimos pagos */}
      {ultimos_pagos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-200 mb-3 flex items-center gap-2">
            Últimos pagos
            <span className="bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full font-normal">
              {ultimos_pagos.length}
            </span>
          </h3>
          <div className="space-y-2">
            {ultimos_pagos.map(p => (
              <div key={p.id_pago}
                className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-gray-700 dark:text-zinc-200">{p.numero}</p>
                  {p.compra_numero && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Compra: {p.compra_numero}</p>
                  )}
                  {p.numero_referencia && (
                    <p className="text-xs text-gray-400 dark:text-zinc-500">Ref: {p.numero_referencia}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                    {new Date(p.fecha).toLocaleDateString('es-BO')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${METODO_COLOR[p.metodo_pago] ?? METODO_COLOR.OTRO}`}>
                    {METODO_LABEL[p.metodo_pago] ?? p.metodo_pago}
                  </span>
                  <p className="font-bold text-green-600 dark:text-green-400 text-sm mt-1">
                    {p.moneda_simbolo} {fmt(p.monto)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────
export default function ProveedorDetalle() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { puede }   = usePermission();
  const [proveedor, setProveedor] = useState(null);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState(null);
  const [tabActivo, setTabActivo] = useState(0);

  const cargarProveedor = useCallback(() => {
    setCargando(true);
    proveedoresService.getOne(id)
      .then(({ data }) => setProveedor(data.proveedor))
      .catch(() => setError('Proveedor no encontrado'))
      .finally(() => setCargando(false));
  }, [id]);

  useEffect(cargarProveedor, [cargarProveedor]);

  const puedeEditar            = puede('editar',              'proveedores');
  const puedeGestionarContacto = puede('gestionar_contactos', 'proveedores');
  const puedeGestionarCuentas  = puede('gestionar_cuentas',   'proveedores');
  const puedeVerSaldo          = puede('ver_saldo',           'proveedores');

  const TABS = [
    'Datos Generales',
    'Contactos',
    'Cuentas de Pago',
    ...(puedeVerSaldo ? ['Saldo'] : []),
  ];

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <FaSpinner className="animate-spin h-7 w-7" />
      </div>
    );
  }

  if (error || !proveedor) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-sm">{error || 'Proveedor no encontrado'}</p>
        <button onClick={() => navigate('/proveedores')}
          className="mt-4 text-amber-500 hover:text-amber-400 text-sm font-medium">
          Volver a proveedores
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <button onClick={() => navigate('/proveedores')}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4">
        <FaArrowLeft className="h-3.5 w-3.5" /> Volver a proveedores
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl px-6 py-5 mb-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg uppercase">
                {proveedor.codigo}
              </span>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[proveedor.tipo_proveedor]}`}>
                {proveedor.tipo_proveedor}
              </span>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                proveedor.activo
                  ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'
              }`}>
                {proveedor.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {proveedor.razon_social}
            </h1>
            {proveedor.nombre_comercial && (
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{proveedor.nombre_comercial}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500 dark:text-zinc-400">
              {proveedor.ciudad && (
                <span className="flex items-center gap-1">
                  <FaMapMarkerAlt className="h-3 w-3" />
                  {proveedor.ciudad}{proveedor.pais ? `, ${proveedor.pais}` : ''}
                </span>
              )}
              {proveedor.telefono && (
                <span className="flex items-center gap-1">
                  <FaPhone className="h-3 w-3" /> {proveedor.telefono}
                </span>
              )}
              {proveedor.email && (
                <span className="flex items-center gap-1">
                  <FaEnvelope className="h-3 w-3" /> {proveedor.email}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FaClock className="h-3 w-3" />
                {proveedor.plazo_credito_dias > 0
                  ? <span className="text-amber-600 dark:text-amber-400 font-medium">{proveedor.plazo_credito_dias} días crédito</span>
                  : 'Contado'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-zinc-800">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setTabActivo(i)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                tabActivo === i
                  ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 bg-amber-50/50 dark:bg-amber-500/5'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tabActivo === 0 && (
            <TabDatos proveedor={proveedor} puedeEditar={puedeEditar} onSaved={cargarProveedor} />
          )}
          {tabActivo === 1 && (
            <TabContactos idProveedor={id} puedeGestionar={puedeGestionarContacto} />
          )}
          {tabActivo === 2 && (
            <TabCuentas idProveedor={id} puedeGestionar={puedeGestionarCuentas} />
          )}
          {tabActivo === 3 && puedeVerSaldo && (
            <TabSaldo idProveedor={id} />
          )}
        </div>
      </div>
    </div>
  );
}
