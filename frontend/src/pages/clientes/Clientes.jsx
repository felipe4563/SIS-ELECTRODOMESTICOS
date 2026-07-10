import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaPlus, FaSpinner, FaUsers, FaEye, FaTrash,
  FaPhone, FaCreditCard, FaMapMarkerAlt,
} from 'react-icons/fa';
import { clientesService } from '../../services/clientes.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import { isValidEmail } from '../../utils/validation';

const EMPTY = {
  tipo_cliente: 'MINORISTA', tipo_documento: 'CI', documento: '',
  razon_social: '', nombres: '', apellidos: '',
  telefono: '', celular: '', email: '', fecha_nacimiento: '',
  descuento_default: 0,
};

const inputCls  = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors';
const labelCls  = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';

const TIPO_BADGE = {
  MAYORISTA: 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
  MINORISTA: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  VIP:       'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  OCASIONAL: 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400',
};

function ClienteCard({ c, puedeEliminar, onVer, onEliminar }) {
  const nombre = [c.nombres, c.apellidos].filter(Boolean).join(' ') || c.razon_social || '—';

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-md transition-all duration-200">

      {/* Badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg uppercase">
            {c.codigo}
          </span>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[c.tipo_cliente]}`}>
            {c.tipo_cliente}
          </span>
        </div>
        <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          c.activo
            ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
            : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'
        }`}>
          {c.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Nombre */}
      <div>
        <p className="font-semibold text-gray-900 dark:text-white leading-tight">{nombre}</p>
        {c.razon_social && (c.nombres || c.apellidos) && (
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 truncate">{c.razon_social}</p>
        )}
        {c.documento && (
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{c.tipo_documento}: {c.documento}</p>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
        {(c.celular || c.telefono) && (
          <div className="flex items-center gap-1.5">
            <FaPhone className="h-3 w-3 shrink-0 text-gray-400 dark:text-zinc-500" />
            <span>{c.celular || c.telefono}</span>
          </div>
        )}
        {c.permite_credito ? (
          <div className="flex items-center gap-1.5">
            <FaCreditCard className="h-3 w-3 shrink-0 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Crédito Bs {Number(c.limite_credito ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              {c.dias_credito > 0 && ` · ${c.dias_credito}d`}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <FaCreditCard className="h-3 w-3 shrink-0 text-gray-400 dark:text-zinc-500" />
            <span>Contado</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400">
          <FaMapMarkerAlt className="h-3 w-3" />
          <span>{c.total_direcciones ?? 0} dirección{c.total_direcciones !== 1 ? 'es' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onVer}
            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
            title="Ver detalle"
          >
            <FaEye className="h-3.5 w-3.5" />
          </button>
          {puedeEliminar && c.activo && (
            <button
              onClick={onEliminar}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Desactivar"
            >
              <FaTrash className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Clientes() {
  const navigate        = useNavigate();
  const { puede }       = usePermission();
  const [lista,         setLista]     = useState([]);
  const [cargando,      setCargando]  = useState(true);
  const [busqueda,      setBusqueda]  = useState('');
  const [modal,         setModal]     = useState(false);
  const [confirm,       setConfirm]   = useState(null);
  const [form,          setForm]      = useState(EMPTY);
  const [guardando,     setGuardando] = useState(false);
  const [error,         setError]     = useState(null);

  const cargar = () => {
    setCargando(true);
    clientesService.getAll()
      .then(({ data }) => setLista(data.clientes))
      .catch(() => setError('Error al cargar clientes'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const visibles = lista.filter(c =>
    c.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.nombres  || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.apellidos || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.razon_social || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.documento || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirCrear  = () => { setForm(EMPTY); setError(null); setModal(true); };
  const cerrarModal = () => { setModal(false); setError(null); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.email?.trim() && !isValidEmail(form.email))
      return setError('El formato del email no es válido');
    setGuardando(true);
    try {
      await clientesService.create(form);
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
      await clientesService.remove(id);
      setConfirm(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desactivar');
      setConfirm(null);
    }
  };

  const puedeCrear    = puede('crear',    'clientes');
  const puedeEliminar = puede('eliminar', 'clientes');

  const nombreConfirm = c => [c?.nombres, c?.apellidos].filter(Boolean).join(' ') || c?.razon_social || '—';

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Gestiona la cartera de clientes y sus condiciones comerciales"
        action={puedeCrear && (
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-md shadow-amber-500/20 transition-all">
            <FaPlus className="h-3.5 w-3.5" /> Nuevo cliente
          </button>
        )}
      />

      {error && !modal && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      <div className="mb-5">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por código, nombre, apellido, razón social o documento..."
          className={inputCls}
        />
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <FaSpinner className="animate-spin h-6 w-6" />
        </div>
      ) : visibles.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-zinc-500">
          <FaUsers className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">{busqueda ? 'Sin resultados para tu búsqueda' : 'No hay clientes registrados'}</p>
          {!busqueda && puedeCrear && (
            <button onClick={abrirCrear} className="mt-3 text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors">
              Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mb-3">{visibles.length} cliente{visibles.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibles.map(c => (
              <ClienteCard
                key={c.id_cliente}
                c={c}
                puedeEliminar={puedeEliminar}
                onVer={() => navigate(`/clientes/${c.id_cliente}`)}
                onEliminar={() => setConfirm(c)}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal crear cliente */}
      <Modal open={modal} onClose={cerrarModal} title="Nuevo Cliente" maxWidth="max-w-2xl">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Tipo de cliente</label>
            <select name="tipo_cliente" value={form.tipo_cliente} onChange={handleChange} className={inputCls}>
              <option value="MINORISTA">Minorista</option>
              <option value="MAYORISTA">Mayorista</option>
              <option value="VIP">VIP</option>
              <option value="OCASIONAL">Ocasional</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombres</label>
              <input name="nombres" value={form.nombres} onChange={handleChange}
                className={inputCls} placeholder="Nombres del cliente" />
            </div>
            <div>
              <label className={labelCls}>Apellidos</label>
              <input name="apellidos" value={form.apellidos} onChange={handleChange}
                className={inputCls} placeholder="Apellidos del cliente" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Razón Social (para facturación)</label>
            <input name="razon_social" value={form.razon_social} onChange={handleChange}
              className={inputCls} placeholder="Nombre legal para facturar" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo de documento</label>
              <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} className={inputCls}>
                <option value="CI">CI</option>
                <option value="NIT">NIT</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="RUC">RUC</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Nro. de documento</label>
              <input name="documento" value={form.documento} onChange={handleChange}
                className={inputCls} placeholder="Número de documento" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={handleChange}
                className={inputCls} placeholder="Teléfono fijo" />
            </div>
            <div>
              <label className={labelCls}>Celular</label>
              <input name="celular" value={form.celular} onChange={handleChange}
                className={inputCls} placeholder="Número de celular" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                className={inputCls} placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label className={labelCls}>Fecha de nacimiento</label>
              <input name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange}
                className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrarModal}
              className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              Crear cliente
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmación desactivar */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar Cliente" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Desactivar al cliente <strong className="text-gray-900 dark:text-white">{nombreConfirm(confirm)}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button onClick={() => handleEliminar(confirm.id_cliente)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">
            Desactivar
          </button>
        </div>
      </Modal>
    </div>
  );
}
