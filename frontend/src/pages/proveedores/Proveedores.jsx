import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaSpinner, FaTruck, FaEye, FaTrash } from 'react-icons/fa';
import { proveedoresService } from '../../services/proveedores.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const EMPTY = {
  codigo: '', razon_social: '', nombre_comercial: '', nit: '',
  tipo_proveedor: 'NACIONAL', direccion: '', ciudad: '', pais: 'Bolivia',
  telefono: '', email: '', contacto_principal: '', plazo_credito_dias: 0,
};

const inputCls  = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors';
const labelCls  = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';
const selectCls = inputCls;

const TIPO_BADGE = {
  NACIONAL:       'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  INTERNACIONAL:  'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

export default function Proveedores() {
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
    proveedoresService.getAll()
      .then(({ data }) => setLista(data.proveedores))
      .catch(() => setError('Error al cargar proveedores'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const visibles = lista.filter(p =>
    p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.ciudad || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirCrear  = () => { setForm(EMPTY); setError(null); setModal(true); };
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
      await proveedoresService.create(form);
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
      await proveedoresService.remove(id);
      setConfirm(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desactivar');
      setConfirm(null);
    }
  };

  const puedeCrear    = puede('crear',    'proveedores');
  const puedeEliminar = puede('eliminar', 'proveedores');

  return (
    <div>
      <PageHeader
        title="Proveedores"
        description="Gestiona los proveedores y sus datos de contacto"
        action={puedeCrear && (
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-md shadow-amber-500/20 transition-all">
            <FaPlus className="h-3.5 w-3.5" /> Nuevo proveedor
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
          placeholder="Buscar por código, razón social o ciudad..."
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
              <FaTruck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{busqueda ? 'Sin resultados' : 'No hay proveedores registrados'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    {['Código', 'Razón Social', 'Tipo', 'Ciudad', 'Plazo', 'Contactos', 'Cuentas', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {visibles.map(p => (
                    <tr key={p.id_proveedor} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">{p.codigo}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{p.razon_social}</p>
                        {p.nombre_comercial && (
                          <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{p.nombre_comercial}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[p.tipo_proveedor]}`}>
                          {p.tipo_proveedor}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-zinc-400 text-xs">{p.ciudad || '—'}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600 dark:text-zinc-400">
                        {p.plazo_credito_dias > 0
                          ? <span className="font-medium">{p.plazo_credito_dias}d</span>
                          : <span className="text-gray-400 dark:text-zinc-600">Contado</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.total_contactos > 0
                          ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">{p.total_contactos}</span>
                          : <span className="text-xs text-gray-400 dark:text-zinc-600">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.total_cuentas > 0
                          ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">{p.total_cuentas}</span>
                          : <span className="text-xs text-gray-400 dark:text-zinc-600">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => navigate(`/proveedores/${p.id_proveedor}`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                            title="Ver detalle"
                          >
                            <FaEye className="h-3.5 w-3.5" />
                          </button>
                          {puedeEliminar && p.activo ? (
                            <button onClick={() => setConfirm(p)}
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

      {/* Modal crear proveedor */}
      <Modal open={modal} onClose={cerrarModal} title="Nuevo Proveedor" maxWidth="max-w-2xl">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Código *</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} required maxLength={20}
                className={inputCls} placeholder="Ej: PROV001" style={{ textTransform: 'uppercase' }} />
            </div>
            <div>
              <label className={labelCls}>Razón Social *</label>
              <input name="razon_social" value={form.razon_social} onChange={handleChange} required
                className={inputCls} placeholder="Nombre legal del proveedor" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre Comercial</label>
              <input name="nombre_comercial" value={form.nombre_comercial} onChange={handleChange}
                className={inputCls} placeholder="Nombre comercial (opcional)" />
            </div>
            <div>
              <label className={labelCls}>NIT / RUC</label>
              <input name="nit" value={form.nit} onChange={handleChange}
                className={inputCls} placeholder="Número de identificación" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo de proveedor</label>
              <select name="tipo_proveedor" value={form.tipo_proveedor} onChange={handleChange} className={selectCls}>
                <option value="NACIONAL">Nacional</option>
                <option value="INTERNACIONAL">Internacional</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Plazo de crédito (días)</label>
              <input name="plazo_credito_dias" type="number" min="0" value={form.plazo_credito_dias} onChange={handleChange}
                className={inputCls} placeholder="0 = contado" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Ciudad</label>
              <input name="ciudad" value={form.ciudad} onChange={handleChange}
                className={inputCls} placeholder="Ej: La Paz" />
            </div>
            <div>
              <label className={labelCls}>País</label>
              <input name="pais" value={form.pais} onChange={handleChange}
                className={inputCls} placeholder="Ej: Bolivia" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Dirección</label>
            <input name="direccion" value={form.direccion} onChange={handleChange}
              className={inputCls} placeholder="Dirección completa" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={handleChange}
                className={inputCls} placeholder="Ej: +591 2 2123456" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                className={inputCls} placeholder="correo@proveedor.com" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Contacto principal</label>
            <input name="contacto_principal" value={form.contacto_principal} onChange={handleChange}
              className={inputCls} placeholder="Nombre del contacto principal" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrarModal}
              className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              Crear proveedor
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmación desactivar */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar Proveedor" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Desactivar al proveedor <strong className="text-gray-900 dark:text-white">{confirm?.razon_social}</strong> ({confirm?.codigo})?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button onClick={() => handleEliminar(confirm.id_proveedor)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">
            Desactivar
          </button>
        </div>
      </Modal>
    </div>
  );
}
