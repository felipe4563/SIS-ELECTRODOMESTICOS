import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSpinner, FaPlus, FaEdit, FaTrash, FaStar, FaRegStar, FaSave, FaTimes } from 'react-icons/fa';
import { clientesService } from '../../services/clientes.service';
import { usePermission } from '../../hooks/usePermission';
import Modal from '../../components/ui/Modal';
import { isValidEmail } from '../../utils/validation';

const inputCls  = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
const labelCls  = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';
const selectCls = inputCls;

const TIPO_BADGE = {
  MAYORISTA:  'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
  MINORISTA:  'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  VIP:        'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  OCASIONAL:  'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400',
};

const EMPTY_CLI = {
  codigo: '', tipo_cliente: 'MINORISTA', tipo_documento: 'CI', documento: '',
  razon_social: '', nombres: '', apellidos: '',
  telefono: '', celular: '', email: '', fecha_nacimiento: '',
  descuento_default: 0, activo: true,
};

const EMPTY_DIR = { etiqueta: '', direccion: '', ciudad: '', referencias: '', es_principal: false };

// ── Tab: Datos Generales ──────────────────────────────────────────────────
function TabDatos({ cliente, onActualizar }) {
  const { puede } = usePermission();
  const [editando, setEditando] = useState(false);
  const [form,     setForm]     = useState({ ...EMPTY_CLI });
  const [guardando, setGuardando] = useState(false);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (cliente) {
      setForm({
        codigo:           cliente.codigo || '',
        tipo_cliente:     cliente.tipo_cliente || 'MINORISTA',
        tipo_documento:   cliente.tipo_documento || 'CI',
        documento:        cliente.documento || '',
        razon_social:     cliente.razon_social || '',
        nombres:          cliente.nombres || '',
        apellidos:        cliente.apellidos || '',
        telefono:         cliente.telefono || '',
        celular:          cliente.celular || '',
        email:            cliente.email || '',
        fecha_nacimiento: cliente.fecha_nacimiento ? cliente.fecha_nacimiento.split('T')[0] : '',
        descuento_default: cliente.descuento_default ?? 0,
        activo:           !!cliente.activo,
      });
    }
  }, [cliente]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    setError(null);
    if (form.email?.trim() && !isValidEmail(form.email)) {
      return setError('El formato del email no es válido');
    }
    setGuardando(true);
    try {
      await clientesService.update(cliente.id_cliente, form);
      setEditando(false);
      onActualizar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = () => {
    setEditando(false);
    setError(null);
    setForm({
      codigo: cliente.codigo || '', tipo_cliente: cliente.tipo_cliente || 'MINORISTA',
      tipo_documento: cliente.tipo_documento || 'CI', documento: cliente.documento || '',
      razon_social: cliente.razon_social || '', nombres: cliente.nombres || '',
      apellidos: cliente.apellidos || '', telefono: cliente.telefono || '',
      celular: cliente.celular || '', email: cliente.email || '',
      fecha_nacimiento: cliente.fecha_nacimiento ? cliente.fecha_nacimiento.split('T')[0] : '',
      descuento_default: cliente.descuento_default ?? 0, activo: !!cliente.activo,
    });
  };

  const puedeEditar = puede('editar', 'clientes');

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Información del cliente</h3>
        {puedeEditar && !editando && (
          <button onClick={() => setEditando(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
            <FaEdit className="h-3 w-3" /> Editar
          </button>
        )}
        {editando && (
          <div className="flex gap-2">
            <button onClick={cancelar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <FaTimes className="h-3 w-3" /> Cancelar
            </button>
            <button onClick={handleSave} disabled={guardando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando ? <FaSpinner className="animate-spin h-3 w-3" /> : <FaSave className="h-3 w-3" />}
              Guardar
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Código</label>
            <input name="codigo" value={form.codigo} onChange={handleChange} disabled={!editando}
              className={inputCls} style={editando ? { textTransform: 'uppercase' } : {}} />
          </div>
          <div>
            <label className={labelCls}>Tipo de cliente</label>
            {editando ? (
              <select name="tipo_cliente" value={form.tipo_cliente} onChange={handleChange} className={selectCls}>
                <option value="MINORISTA">Minorista</option>
                <option value="MAYORISTA">Mayorista</option>
                <option value="VIP">VIP</option>
                <option value="OCASIONAL">Ocasional</option>
              </select>
            ) : (
              <div className="px-3 py-2.5">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[form.tipo_cliente]}`}>
                  {form.tipo_cliente}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombres</label>
            <input name="nombres" value={form.nombres} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Apellidos</label>
            <input name="apellidos" value={form.apellidos} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Razón Social</label>
          <input name="razon_social" value={form.razon_social} onChange={handleChange} disabled={!editando} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Tipo de documento</label>
            {editando ? (
              <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} className={selectCls}>
                <option value="CI">CI</option>
                <option value="NIT">NIT</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="RUC">RUC</option>
                <option value="OTRO">Otro</option>
              </select>
            ) : (
              <input value={form.tipo_documento} disabled className={inputCls} />
            )}
          </div>
          <div>
            <label className={labelCls}>Nro. de documento</label>
            <input name="documento" value={form.documento} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Celular</label>
            <input name="celular" value={form.celular} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Email</label>
            <input name="email" type={editando ? 'email' : 'text'} value={form.email} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fecha de nacimiento</label>
            <input name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Descuento por defecto (%)</label>
            <input name="descuento_default" type="number" min="0" max="100" step="0.01" value={form.descuento_default} onChange={handleChange} disabled={!editando} className={inputCls} />
          </div>
          {editando && (
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} className="w-4 h-4 rounded accent-amber-500" />
                <span className="text-sm text-gray-700 dark:text-zinc-300">Cliente activo</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Direcciones ──────────────────────────────────────────────────────
function TabDirecciones({ idCliente }) {
  const { puede }  = usePermission();
  const [lista,    setLista]    = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal,    setModal]    = useState(false);
  const [confirm,  setConfirm]  = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form,     setForm]     = useState(EMPTY_DIR);
  const [guardando, setGuardando] = useState(false);
  const [error,    setError]    = useState(null);

  const cargar = useCallback(() => {
    setCargando(true);
    clientesService.getDirecciones(idCliente)
      .then(({ data }) => setLista(data.direcciones))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [idCliente]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => { setEditItem(null); setForm(EMPTY_DIR); setError(null); setModal(true); };
  const abrirEditar = (d) => {
    setEditItem(d);
    setForm({ etiqueta: d.etiqueta || '', direccion: d.direccion, ciudad: d.ciudad || '', referencias: d.referencias || '', es_principal: !!d.es_principal });
    setError(null);
    setModal(true);
  };
  const cerrarModal = () => { setModal(false); setError(null); };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      if (editItem) {
        await clientesService.updateDireccion(idCliente, editItem.id_direccion, form);
      } else {
        await clientesService.createDireccion(idCliente, form);
      }
      cerrarModal();
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await clientesService.deleteDireccion(idCliente, id);
      setConfirm(null);
      cargar();
    } catch {
      setConfirm(null);
    }
  };

  const puedeGestionar = puede('gestionar_direcciones', 'clientes');

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Direcciones de entrega</h3>
        {puedeGestionar && (
          <button onClick={abrirCrear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
            <FaPlus className="h-3 w-3" /> Agregar
          </button>
        )}
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <FaSpinner className="animate-spin h-5 w-5" />
        </div>
      ) : lista.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
          <p className="text-sm">Sin direcciones registradas</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-zinc-800">
          {lista.map(d => (
            <div key={d.id_direccion} className="flex items-start justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <span className="mt-0.5 shrink-0">
                  {d.es_principal
                    ? <FaStar className="h-4 w-4 text-amber-400" title="Principal" />
                    : <FaRegStar className="h-4 w-4 text-gray-300 dark:text-zinc-600" />
                  }
                </span>
                <div className="min-w-0">
                  {d.etiqueta && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 font-medium mb-1">
                      {d.etiqueta}
                    </span>
                  )}
                  <p className="text-sm text-gray-900 dark:text-white">{d.direccion}</p>
                  {d.ciudad && <p className="text-xs text-gray-500 dark:text-zinc-400">{d.ciudad}</p>}
                  {d.referencias && <p className="text-xs text-gray-400 dark:text-zinc-500 italic">{d.referencias}</p>}
                </div>
              </div>
              {puedeGestionar && (
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <button onClick={() => abrirEditar(d)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                    <FaEdit className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setConfirm(d)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <FaTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={cerrarModal} title={editItem ? 'Editar Dirección' : 'Nueva Dirección'} maxWidth="max-w-md">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Etiqueta (Casa, Oficina, Bodega...)</label>
            <input name="etiqueta" value={form.etiqueta} onChange={handleChange}
              className={inputCls} placeholder="Ej: Casa principal" />
          </div>
          <div>
            <label className={labelCls}>Dirección *</label>
            <input name="direccion" value={form.direccion} onChange={handleChange} required
              className={inputCls} placeholder="Calle, número, zona..." />
          </div>
          <div>
            <label className={labelCls}>Ciudad</label>
            <input name="ciudad" value={form.ciudad} onChange={handleChange}
              className={inputCls} placeholder="Ej: La Paz" />
          </div>
          <div>
            <label className={labelCls}>Referencias</label>
            <input name="referencias" value={form.referencias} onChange={handleChange}
              className={inputCls} placeholder="Entre calles, color de fachada..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="es_principal" checked={form.es_principal} onChange={handleChange}
              className="w-4 h-4 rounded accent-amber-500" />
            <span className="text-sm text-gray-700 dark:text-zinc-300">Dirección principal</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrarModal}
              className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              {editItem ? 'Guardar cambios' : 'Agregar dirección'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar Dirección" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Eliminar la dirección <strong className="text-gray-900 dark:text-white">{confirm?.direccion}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button onClick={() => handleEliminar(confirm.id_direccion)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Tab: Crédito ──────────────────────────────────────────────────────────
function TabCredito({ cliente, onActualizar }) {
  const { puede }    = usePermission();
  const [editando,   setEditando]   = useState(false);
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState(null);
  const [form, setForm] = useState({ permite_credito: false, limite_credito: 0, dias_credito: 0 });

  useEffect(() => {
    if (cliente) {
      setForm({
        permite_credito: !!cliente.permite_credito,
        limite_credito:  cliente.limite_credito ?? 0,
        dias_credito:    cliente.dias_credito ?? 0,
      });
    }
  }, [cliente]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    setError(null);
    setGuardando(true);
    try {
      await clientesService.updateCredito(cliente.id_cliente, form);
      setEditando(false);
      onActualizar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = () => {
    setEditando(false);
    setError(null);
    setForm({
      permite_credito: !!cliente.permite_credito,
      limite_credito:  cliente.limite_credito ?? 0,
      dias_credito:    cliente.dias_credito ?? 0,
    });
  };

  const puedeDarCredito = puede('dar_credito', 'clientes');
  const puedeVerSaldo   = puede('ver_saldo',   'clientes');

  return (
    <div className="space-y-4">
      {/* Saldo actual */}
      {puedeVerSaldo && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">Cuenta por cobrar</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Saldo actual</p>
              <p className={`text-xl font-bold ${Number(cliente?.saldo_actual) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                Bs {Number(cliente?.saldo_actual ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Límite de crédito</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {cliente?.permite_credito
                  ? `Bs ${Number(cliente?.limite_credito ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`
                  : '—'
                }
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Disponible</p>
              <p className={`text-xl font-bold ${cliente?.permite_credito ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-zinc-500'}`}>
                {cliente?.permite_credito
                  ? `Bs ${Math.max(0, Number(cliente?.limite_credito ?? 0) - Number(cliente?.saldo_actual ?? 0)).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`
                  : '—'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Condiciones de crédito */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Condiciones de crédito</h3>
          {puedeDarCredito && !editando && (
            <button onClick={() => setEditando(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
              <FaEdit className="h-3 w-3" /> Editar
            </button>
          )}
          {editando && (
            <div className="flex gap-2">
              <button onClick={cancelar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                <FaTimes className="h-3 w-3" /> Cancelar
              </button>
              <button onClick={handleSave} disabled={guardando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
                {guardando ? <FaSpinner className="animate-spin h-3 w-3" /> : <FaSave className="h-3 w-3" />}
                Guardar
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="permite_credito" checked={form.permite_credito} onChange={handleChange}
              disabled={!editando} className="w-4 h-4 rounded accent-amber-500 disabled:opacity-50" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Permitir crédito</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Habilita ventas a crédito para este cliente</p>
            </div>
          </label>

          {form.permite_credito && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className={labelCls}>Límite de crédito (Bs)</label>
                <input name="limite_credito" type="number" min="0" step="0.01" value={form.limite_credito}
                  onChange={handleChange} disabled={!editando} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Días de crédito</label>
                <input name="dias_credito" type="number" min="0" value={form.dias_credito}
                  onChange={handleChange} disabled={!editando} className={inputCls} placeholder="0" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ClienteDetalle ────────────────────────────────────────────────────────
export default function ClienteDetalle() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [cliente,    setCliente]    = useState(null);
  const [cargando,   setCargando]   = useState(true);
  const [tabActivo,  setTabActivo]  = useState(0);

  const TABS = ['Datos Generales', 'Direcciones', 'Crédito'];

  const cargarCliente = useCallback(() => {
    clientesService.getOne(id)
      .then(({ data }) => setCliente(data.cliente))
      .catch(() => navigate('/clientes'))
      .finally(() => setCargando(false));
  }, [id, navigate]);

  useEffect(() => { cargarCliente(); }, [cargarCliente]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <FaSpinner className="animate-spin h-7 w-7" />
      </div>
    );
  }

  if (!cliente) return null;

  const nombreCompleto = [cliente.nombres, cliente.apellidos].filter(Boolean).join(' ') || cliente.razon_social || '—';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/clientes')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4">
          <FaArrowLeft className="h-3.5 w-3.5" />
          Volver a clientes
        </button>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg">
                  {cliente.codigo}
                </span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[cliente.tipo_cliente]}`}>
                  {cliente.tipo_cliente}
                </span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cliente.activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                  {cliente.activo ? 'Activo' : 'Inactivo'}
                </span>
                {cliente.permite_credito && (
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    Crédito habilitado
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{nombreCompleto}</h1>
              {cliente.razon_social && (cliente.nombres || cliente.apellidos) && (
                <p className="text-sm text-gray-500 dark:text-zinc-400">{cliente.razon_social}</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-zinc-400">
            {cliente.documento && (
              <span>{cliente.tipo_documento}: <strong className="text-gray-900 dark:text-white">{cliente.documento}</strong></span>
            )}
            {cliente.celular && <span>Cel: <strong className="text-gray-900 dark:text-white">{cliente.celular}</strong></span>}
            {cliente.telefono && <span>Tel: <strong className="text-gray-900 dark:text-white">{cliente.telefono}</strong></span>}
            {cliente.email && <span>Email: <strong className="text-gray-900 dark:text-white">{cliente.email}</strong></span>}
            {cliente.permite_credito && (
              <span>Saldo: <strong className={`${Number(cliente.saldo_actual) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                Bs {Number(cliente.saldo_actual ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </strong></span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setTabActivo(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tabActivo === i
                ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Contenido tabs */}
      {tabActivo === 0 && <TabDatos cliente={cliente} onActualizar={cargarCliente} />}
      {tabActivo === 1 && <TabDirecciones idCliente={id} />}
      {tabActivo === 2 && <TabCredito cliente={cliente} onActualizar={cargarCliente} />}
    </div>
  );
}
