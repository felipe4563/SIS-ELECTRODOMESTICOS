import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSpinner, FaDollarSign, FaStar } from 'react-icons/fa';
import { monedasService } from '../../services/configuracion.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const EMPTY = { codigo: '', nombre: '', simbolo: '', decimales: 2, es_moneda_base: false, activo: true };
const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 dark:focus:border-amber-500/50 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';

export default function Monedas() {
  const { puede } = usePermission();
  const [lista,     setLista]     = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [modal,     setModal]     = useState(false);
  const [confirm,   setConfirm]   = useState(null);
  const [editando,  setEditando]  = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);

  const cargar = () => {
    setCargando(true);
    monedasService.getAll()
      .then(({ data }) => setLista(data.monedas))
      .catch(() => setError('Error al cargar monedas'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const abrirCrear  = () => { setEditando(null); setForm(EMPTY); setError(null); setModal(true); };
  const abrirEditar = (m) => { setEditando(m); setForm({ ...m, es_moneda_base: !!m.es_moneda_base, activo: !!m.activo }); setError(null); setModal(true); };
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
      if (editando) await monedasService.update(editando.id_moneda, form);
      else          await monedasService.create(form);
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
      await monedasService.remove(id);
      setConfirm(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desactivar');
      setConfirm(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Monedas"
        description="Monedas habilitadas en el sistema"
        action={puede('gestionar', 'monedas') && (
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-md shadow-amber-500/20 transition-all">
            <FaPlus className="h-3.5 w-3.5" /> Nueva moneda
          </button>
        )}
      />

      {error && !modal && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center h-48 text-gray-400"><FaSpinner className="animate-spin h-6 w-6" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-gray-400 dark:text-zinc-500">
              <FaDollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay monedas registradas</p>
            </div>
          ) : lista.map(m => (
            <div key={m.id_moneda}
              className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 flex flex-col gap-3 transition-all
                ${m.es_moneda_base ? 'border-amber-300 dark:border-amber-500/50 shadow-md shadow-amber-500/10' : 'border-gray-200 dark:border-zinc-800'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-lg font-bold text-gray-700 dark:text-white">
                    {m.simbolo}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{m.codigo}</span>
                      {m.es_moneda_base && <FaStar className="h-3 w-3 text-amber-500" title="Moneda base" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">{m.nombre}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${m.activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                  {m.activo ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-zinc-500">{m.decimales} decimales</p>
              <div className="flex items-center gap-2 pt-1 border-t border-gray-50 dark:border-zinc-800">
                {puede('gestionar', 'monedas') && (
                  <>
                    <button onClick={() => abrirEditar(m)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                      <FaEdit className="h-3 w-3" /> Editar
                    </button>
                    {!m.es_moneda_base && (
                      <button onClick={() => setConfirm(m)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors ml-auto">
                        <FaTrash className="h-3 w-3" /> Desactivar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={cerrarModal} title={editando ? 'Editar Moneda' : 'Nueva Moneda'} maxWidth="max-w-md">
        {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Código *</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} required maxLength={5} className={inputCls} placeholder="USD, BOB, EUR..." />
            </div>
            <div>
              <label className={labelCls}>Símbolo *</label>
              <input name="simbolo" value={form.simbolo} onChange={handleChange} required maxLength={5} className={inputCls} placeholder="$, Bs., €..." />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} placeholder="Dólar Estadounidense" />
            </div>
            <div>
              <label className={labelCls}>Decimales</label>
              <input name="decimales" type="number" min={0} max={6} value={form.decimales} onChange={handleChange} className={inputCls} />
            </div>
          </div>
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="es_moneda_base" checked={form.es_moneda_base ?? false} onChange={handleChange} className="rounded accent-amber-500" />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Moneda base del sistema</span>
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
              {editando ? 'Guardar cambios' : 'Crear moneda'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar Moneda" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Desactivar la moneda <strong className="text-gray-900 dark:text-white">{confirm?.nombre} ({confirm?.codigo})</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button onClick={() => handleEliminar(confirm.id_moneda)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">Desactivar</button>
        </div>
      </Modal>
    </div>
  );
}
