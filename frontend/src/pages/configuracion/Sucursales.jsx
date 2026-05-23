import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSpinner, FaStore } from 'react-icons/fa';
import { sucursalesService } from '../../services/configuracion.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const EMPTY = { codigo: '', nombre: '', tipo: 'SUCURSAL', direccion: '', ciudad: '', telefono: '', responsable: '', es_punto_venta: true, activo: true };
const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 dark:focus:border-amber-500/50 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';

const badgeTipo = (tipo) => tipo === 'PRINCIPAL'
  ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
  : 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400';

export default function Sucursales() {
  const { puede } = usePermission();
  const [lista,    setLista]    = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal,    setModal]    = useState(false);
  const [confirm,  setConfirm]  = useState(null);
  const [editando, setEditando] = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [error,    setError]    = useState(null);

  const cargar = () => {
    setCargando(true);
    sucursalesService.getAll()
      .then(({ data }) => setLista(data.sucursales))
      .catch(() => setError('Error al cargar sucursales'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const abrirCrear = () => { setEditando(null); setForm(EMPTY); setError(null); setModal(true); };
  const abrirEditar = (s) => { setEditando(s); setForm({ ...s }); setError(null); setModal(true); };
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
        await sucursalesService.update(editando.id_sucursal, form);
      } else {
        await sucursalesService.create(form);
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
      await sucursalesService.remove(id);
      setConfirm(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div>
      <PageHeader
        title="Sucursales"
        description="Gestiona las sucursales de tu empresa"
        action={puede('crear', 'sucursales') && (
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-md shadow-amber-500/20 transition-all">
            <FaPlus className="h-3.5 w-3.5" /> Nueva sucursal
          </button>
        )}
      />

      {error && !modal && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center h-48 text-gray-400"><FaSpinner className="animate-spin h-6 w-6" /></div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          {lista.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-zinc-500">
              <FaStore className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay sucursales registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    {['Código', 'Nombre', 'Tipo', 'Ciudad', 'Teléfono', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {lista.map(s => (
                    <tr key={s.id_sucursal} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">{s.codigo}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badgeTipo(s.tipo)}`}>{s.tipo}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{s.ciudad || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{s.telefono || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                          {s.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {puede('editar', 'sucursales') && (
                            <button onClick={() => abrirEditar(s)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                              <FaEdit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {puede('eliminar', 'sucursales') && (
                            <button onClick={() => setConfirm(s)}
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
      <Modal open={modal} onClose={cerrarModal} title={editando ? 'Editar Sucursal' : 'Nueva Sucursal'}>
        {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Código *</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} required className={inputCls} placeholder="Ej: GAL18" />
            </div>
            <div>
              <label className={labelCls}>Tipo *</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className={inputCls}>
                <option value="SUCURSAL">SUCURSAL</option>
                <option value="PRINCIPAL">PRINCIPAL</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} placeholder="Nombre de la sucursal" />
            </div>
            <div>
              <label className={labelCls}>Ciudad</label>
              <input name="ciudad" value={form.ciudad ?? ''} onChange={handleChange} className={inputCls} placeholder="Ciudad" />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input name="telefono" value={form.telefono ?? ''} onChange={handleChange} className={inputCls} placeholder="Teléfono" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Dirección</label>
              <input name="direccion" value={form.direccion ?? ''} onChange={handleChange} className={inputCls} placeholder="Dirección" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Responsable</label>
              <input name="responsable" value={form.responsable ?? ''} onChange={handleChange} className={inputCls} placeholder="Nombre del responsable" />
            </div>
          </div>
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="es_punto_venta" checked={form.es_punto_venta ?? true} onChange={handleChange} className="rounded accent-amber-500" />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Es punto de venta</span>
            </label>
            {editando && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="activo" checked={form.activo ?? true} onChange={handleChange} className="rounded accent-amber-500" />
                <span className="text-sm text-gray-700 dark:text-zinc-300">Activa</span>
              </label>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrarModal} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              {editando ? 'Guardar cambios' : 'Crear sucursal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmación eliminar */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar Sucursal" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Desactivar la sucursal <strong className="text-gray-900 dark:text-white">{confirm?.nombre}</strong>? Podrás reactivarla después.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button onClick={() => handleEliminar(confirm.id_sucursal)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">Desactivar</button>
        </div>
      </Modal>
    </div>
  );
}
