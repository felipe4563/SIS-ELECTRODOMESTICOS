import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSpinner, FaFolderOpen } from 'react-icons/fa';
import { categoriasService } from '../../services/catalogo.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const EMPTY = { nombre: '', descripcion: '', id_categoria_padre: '', activo: true };
const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';

export default function Categorias() {
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
    categoriasService.getAll()
      .then(({ data }) => setLista(data.categorias))
      .catch(() => setError('Error al cargar categorías'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  // Solo categorías raíz como posibles padres (sin padre propio)
  const posiblesPadres = lista.filter(c => !c.id_categoria_padre && c.activo);

  const visibles = lista.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.padre_nombre || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirCrear  = () => { setEditando(null); setForm(EMPTY); setError(null); setModal(true); };
  const abrirEditar = (c) => {
    setEditando(c);
    setForm({
      nombre:             c.nombre,
      descripcion:        c.descripcion || '',
      id_categoria_padre: c.id_categoria_padre || '',
      activo:             !!c.activo,
    });
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
    const payload = {
      nombre:             form.nombre,
      descripcion:        form.descripcion || null,
      id_categoria_padre: form.id_categoria_padre || null,
      activo:             form.activo,
    };
    try {
      if (editando) {
        await categoriasService.update(editando.id_categoria, payload);
      } else {
        await categoriasService.create(payload);
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
      await categoriasService.remove(id);
      setConfirm(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desactivar');
      setConfirm(null);
    }
  };

  const puedeGestionar = puede('gestionar', 'categorias');

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Gestiona las categorías de productos"
        action={puedeGestionar && (
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-md shadow-amber-500/20 transition-all">
            <FaPlus className="h-3.5 w-3.5" /> Nueva categoría
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
          placeholder="Buscar por nombre o categoría padre..."
          className={inputCls}
        />
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-48 text-gray-400"><FaSpinner className="animate-spin h-6 w-6" /></div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          {visibles.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-zinc-500">
              <FaFolderOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{busqueda ? 'Sin resultados' : 'No hay categorías registradas'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    {['Nombre', 'Categoría padre', 'Subcategorías', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {visibles.map(c => (
                    <tr key={c.id_categoria} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-gray-900 dark:text-white ${c.id_categoria_padre ? 'pl-4 border-l-2 border-amber-400/40' : ''}`}>
                          {c.id_categoria_padre ? '↳ ' : ''}{c.nombre}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">
                        {c.padre_nombre
                          ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">{c.padre_nombre}</span>
                          : <span className="text-xs text-gray-400 dark:text-zinc-600">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.total_subcategorias > 0
                          ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">{c.total_subcategorias}</span>
                          : <span className="text-xs text-gray-400 dark:text-zinc-600">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                          {c.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {puedeGestionar && (
                            <>
                              <button onClick={() => abrirEditar(c)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                                <FaEdit className="h-3.5 w-3.5" />
                              </button>
                              {c.activo ? (
                                <button onClick={() => setConfirm(c)}
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
      <Modal open={modal} onClose={cerrarModal} title={editando ? 'Editar Categoría' : 'Nueva Categoría'}>
        {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} placeholder="Ej: Cocinas de piso" />
          </div>
          <div>
            <label className={labelCls}>Categoría padre</label>
            <select name="id_categoria_padre" value={form.id_categoria_padre} onChange={handleChange} className={inputCls}>
              <option value="">— Ninguna (categoría raíz) —</option>
              {posiblesPadres
                .filter(p => !editando || p.id_categoria !== editando.id_categoria)
                .map(p => (
                  <option key={p.id_categoria} value={p.id_categoria}>{p.nombre}</option>
                ))
              }
            </select>
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2} className={inputCls} placeholder="Descripción opcional..." />
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
              {editando ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmación */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar Categoría" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Desactivar la categoría <strong className="text-gray-900 dark:text-white">{confirm?.nombre}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button onClick={() => handleEliminar(confirm.id_categoria)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">Desactivar</button>
        </div>
      </Modal>
    </div>
  );
}
