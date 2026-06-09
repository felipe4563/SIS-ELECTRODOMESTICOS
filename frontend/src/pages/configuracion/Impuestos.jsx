import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSpinner, FaFileInvoiceDollar, FaStar } from 'react-icons/fa';
import { impuestosService } from '../../services/configuracion.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const TIPOS = ['VENTA', 'COMPRA', 'AMBOS', 'RETENCION'];
const EMPTY = { codigo: '', nombre: '', porcentaje: '', tipo: 'AMBOS', es_default: false, activo: true };
const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 dark:focus:border-amber-500/50 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';

const badgeTipo = (tipo) => {
  const map = {
    VENTA:     'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',
    COMPRA:    'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
    AMBOS:     'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    RETENCION: 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
  };
  return map[tipo] ?? 'bg-gray-100 text-gray-600';
};

export default function Impuestos() {
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
    impuestosService.getAll()
      .then(({ data }) => setLista(data.impuestos))
      .catch(() => setError('Error al cargar impuestos'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const abrirCrear  = () => { setEditando(null); setForm(EMPTY); setError(null); setModal(true); };
  const abrirEditar = (i) => {
    setEditando(i);
    setForm({ ...i, es_default: !!i.es_default, activo: !!i.activo, porcentaje: String(i.porcentaje) });
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
      if (editando) await impuestosService.update(editando.id_impuesto, form);
      else          await impuestosService.create(form);
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
      await impuestosService.remove(id);
      setConfirm(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desactivar');
      setConfirm(null);
    }
  };

  const puedeCrear    = puede('crear',    'impuestos');
  const puedeEditar   = puede('editar',   'impuestos');
  const puedeEliminar = puede('eliminar', 'impuestos');

  return (
    <div>
      <PageHeader
        title="Impuestos"
        description="Catálogo de tipos de impuesto"
        action={puedeCrear && (
          <button onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-md shadow-amber-500/20 transition-all">
            <FaPlus className="h-3.5 w-3.5" /> Nuevo impuesto
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
            <div className="sm:col-span-2 lg:col-span-3 text-center py-16 text-gray-400 dark:text-zinc-500">
              <FaFileInvoiceDollar className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay impuestos registrados</p>
            </div>
          ) : lista.map(imp => (
            <div key={imp.id_impuesto}
              className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 flex flex-col gap-3 transition-all
                ${imp.es_default ? 'border-amber-300 dark:border-amber-500/50 shadow-md shadow-amber-500/10' : 'border-gray-200 dark:border-zinc-800'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{imp.codigo}</span>
                    {imp.es_default && <FaStar className="h-3 w-3 text-amber-500" title="Default" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{imp.nombre}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${imp.activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                  {imp.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{Number(imp.porcentaje).toFixed(1)}%</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeTipo(imp.tipo)}`}>{imp.tipo}</span>
              </div>

              {(puedeEditar || puedeEliminar) && (
                <div className="flex items-center gap-2 pt-1 border-t border-gray-50 dark:border-zinc-800">
                  {puedeEditar && (
                    <button onClick={() => abrirEditar(imp)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                      <FaEdit className="h-3 w-3" /> Editar
                    </button>
                  )}
                  {puedeEliminar && (
                    <button onClick={() => setConfirm(imp)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors ml-auto">
                      <FaTrash className="h-3 w-3" /> Desactivar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={cerrarModal} title={editando ? 'Editar Impuesto' : 'Nuevo Impuesto'} maxWidth="max-w-md">
        {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Código *</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} required maxLength={20} className={inputCls} placeholder="IVA, IT..." />
            </div>
            <div>
              <label className={labelCls}>Porcentaje * (%)</label>
              <input name="porcentaje" type="number" step="0.01" min="0" max="100" value={form.porcentaje} onChange={handleChange} required className={inputCls} placeholder="13.00" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} placeholder="Impuesto al Valor Agregado" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Tipo *</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className={inputCls}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="es_default" checked={form.es_default ?? false} onChange={handleChange} className="rounded accent-amber-500" />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Default del sistema</span>
            </label>
            {editando && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="activo" checked={form.activo ?? true} onChange={handleChange} className="rounded accent-amber-500" />
                <span className="text-sm text-gray-700 dark:text-zinc-300">Activo</span>
              </label>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrarModal} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              {editando ? 'Guardar cambios' : 'Crear impuesto'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar Impuesto" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Desactivar el impuesto <strong className="text-gray-900 dark:text-white">{confirm?.nombre} ({confirm?.codigo})</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button onClick={() => handleEliminar(confirm.id_impuesto)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">Desactivar</button>
        </div>
      </Modal>
    </div>
  );
}
