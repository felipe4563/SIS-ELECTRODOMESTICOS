import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaSpinner, FaUsers, FaEye, FaTrash } from 'react-icons/fa';
import { clientesService } from '../../services/clientes.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const EMPTY = {
  codigo: '', tipo_cliente: 'MINORISTA', tipo_documento: 'CI', documento: '',
  razon_social: '', nombres: '', apellidos: '',
  telefono: '', celular: '', email: '', fecha_nacimiento: '',
  descuento_default: 0,
};

const inputCls  = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors';
const labelCls  = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';
const selectCls = inputCls;

const TIPO_BADGE = {
  MAYORISTA:  'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
  MINORISTA:  'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  VIP:        'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  OCASIONAL:  'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400',
};

export default function Clientes() {
  const navigate        = useNavigate();
  const { puede }       = usePermission();
  const [lista,         setLista]         = useState([]);
  const [cargando,      setCargando]      = useState(true);
  const [busqueda,      setBusqueda]      = useState('');
  const [modal,         setModal]         = useState(false);
  const [confirm,       setConfirm]       = useState(null);
  const [form,          setForm]          = useState(EMPTY);
  const [guardando,     setGuardando]     = useState(false);
  const [error,         setError]         = useState(null);

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

  const nombreCompleto = c =>
    [c.nombres, c.apellidos].filter(Boolean).join(' ') || c.razon_social || '—';

  const abrirCrear  = () => { setForm(EMPTY); setError(null); setModal(true); };
  const cerrarModal = () => { setModal(false); setError(null); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
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

      <div className="mb-4">
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
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          {visibles.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-zinc-500">
              <FaUsers className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{busqueda ? 'Sin resultados' : 'No hay clientes registrados'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    {['Código', 'Cliente', 'Tipo', 'Documento', 'Contacto', 'Crédito', 'Dirs.', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {visibles.map(c => (
                    <tr key={c.id_cliente} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">{c.codigo}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{nombreCompleto(c)}</p>
                        {c.razon_social && (c.nombres || c.apellidos) && (
                          <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{c.razon_social}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[c.tipo_cliente]}`}>
                          {c.tipo_cliente}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400">
                        {c.documento ? (
                          <span>{c.tipo_documento} · {c.documento}</span>
                        ) : <span className="text-gray-400 dark:text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400">
                        {c.celular || c.telefono || c.email || <span className="text-gray-400 dark:text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.permite_credito ? (
                          <div className="text-xs">
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                              Bs {Number(c.limite_credito).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </span>
                            {c.dias_credito > 0 && (
                              <p className="text-gray-400 dark:text-zinc-600 mt-0.5">{c.dias_credito}d</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-zinc-600">Contado</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.total_direcciones > 0
                          ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">{c.total_direcciones}</span>
                          : <span className="text-xs text-gray-400 dark:text-zinc-600">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                          {c.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => navigate(`/clientes/${c.id_cliente}`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                            title="Ver detalle">
                            <FaEye className="h-3.5 w-3.5" />
                          </button>
                          {puedeEliminar && c.activo ? (
                            <button onClick={() => setConfirm(c)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              title="Desactivar">
                              <FaTrash className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
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

      {/* Modal crear cliente */}
      <Modal open={modal} onClose={cerrarModal} title="Nuevo Cliente" maxWidth="max-w-2xl">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Código *</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} required maxLength={20}
                className={inputCls} placeholder="Ej: CLI001" style={{ textTransform: 'uppercase' }} />
            </div>
            <div>
              <label className={labelCls}>Tipo de cliente</label>
              <select name="tipo_cliente" value={form.tipo_cliente} onChange={handleChange} className={selectCls}>
                <option value="MINORISTA">Minorista</option>
                <option value="MAYORISTA">Mayorista</option>
                <option value="VIP">VIP</option>
                <option value="OCASIONAL">Ocasional</option>
              </select>
            </div>
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
              <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} className={selectCls}>
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
          ¿Desactivar al cliente <strong className="text-gray-900 dark:text-white">{confirm && nombreCompleto(confirm)}</strong> ({confirm?.codigo})?
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
