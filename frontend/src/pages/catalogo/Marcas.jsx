import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSpinner, FaTag } from 'react-icons/fa';
import { marcasService } from '../../services/catalogo.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const EMPTY = { nombre: '', pais_origen: '', logo_url: '', activo: true };
const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';

export default function Marcas() {
  const { puede } = usePermission();
  const [lista,     setLista]     = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [busqueda,  setBusqueda]  = useState('');
  const [modal,     setModal]     = useState(false);
  const [confirm,   setConfirm]   = useState(null);
  const [editando,  setEditando]  = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);

  const cargar = () => {
    setCargando(true);
    marcasService.getAll()
      .then(({ data }) => setLista(data.marcas))
      .catch(() => setError('Error al cargar marcas'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const visibles = lista.filter(m =>
    m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (m.pais_origen || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirCrear  = () => { setEditando(null); setForm(EMPTY); setError(null); setModal(true); };
  const abrirEditar = (m) => { setEditando(m); setForm({ ...m, activo: !!m.activo }); setError(null); setModal(true); };
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
      if (editando) {
        await marcasService.update(editando.id_marca, form);
      } else {
        await marcasService.create(form);
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
      await marcasService.remove(id);
      setConfirm(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desactivar');
      setConfirm(null);
    }
  };

  const puedeGestionar = puede('gestionar', 'marcas');

  return (
    <div>
      <PageHeader
        title="Marcas"
        description="Gestiona las marcas de productos"
        action={puedeGestionar && (
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-md shadow-amber-500/20 transition-all">
            <FaPlus className="h-3.5 w-3.5" /> Nueva marca
          </button>
        )}
      />

      {error && !modal && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {/* Buscador */}
      <div className="mb-4">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o país..."
          className={inputCls}
        />
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-48 text-gray-400"><FaSpinner className="animate-spin h-6 w-6" /></div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          {visibles.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-zinc-500">
              <FaTag className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{busqueda ? 'Sin resultados' : 'No hay marcas registradas'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    {['Nombre', 'País de origen', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {visibles.map(m => (
                    <tr key={m.id_marca} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{m.nombre}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{m.pais_origen || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                          {m.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {puedeGestionar && (
                            <>
                              <button onClick={() => abrirEditar(m)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                                <FaEdit className="h-3.5 w-3.5" />
                              </button>
                              {m.activo ? (
                                <button onClick={() => setConfirm(m)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                  <FaTrash className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </>
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
      <Modal open={modal} onClose={cerrarModal} title={editando ? 'Editar Marca' : 'Nueva Marca'}>
        {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} placeholder="Ej: CHALLENGER" />
          </div>
          <div>
            <label className={labelCls}>País de origen</label>
            <input name="pais_origen" value={form.pais_origen} onChange={handleChange} className={inputCls} placeholder="Ej: Argentina" />
          </div>
          <div>
            <label className={labelCls}>URL del logo</label>
            <input name="logo_url" value={form.logo_url} onChange={handleChange} className={inputCls} placeholder="https://..." />
          </div>
          {editando && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} className="rounded accent-amber-500" />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Activa</span>
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrarModal} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              {editando ? 'Guardar cambios' : 'Crear marca'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmación */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar Marca" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Desactivar la marca <strong className="text-gray-900 dark:text-white">{confirm?.nombre}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button onClick={() => handleEliminar(confirm.id_marca)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">Desactivar</button>
        </div>
      </Modal>
    </div>
  );
}
