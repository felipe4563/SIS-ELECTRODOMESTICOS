import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaSpinner, FaExchangeAlt } from 'react-icons/fa';
import { tiposCambioService, monedasService } from '../../services/configuracion.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const hoy = () => new Date().toISOString().split('T')[0];
const EMPTY = { id_moneda_origen: '', id_moneda_destino: '', fecha: hoy(), tasa_compra: '', tasa_venta: '' };
const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 dark:focus:border-amber-500/50 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';

export default function TiposCambio() {
  const { puede } = usePermission();
  const [lista,     setLista]     = useState([]);
  const [monedas,   setMonedas]   = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [modal,     setModal]     = useState(false);
  const [confirm,   setConfirm]   = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);

  const cargar = () => {
    setCargando(true);
    Promise.all([tiposCambioService.getAll(), monedasService.getAll()])
      .then(([{ data: tc }, { data: m }]) => {
        setLista(tc.tipos_cambio);
        setMonedas(m.monedas.filter(x => x.activo));
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const cerrarModal = () => { setModal(false); setError(null); };
  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await tiposCambioService.create(form);
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
      await tiposCambioService.remove(id);
      setConfirm(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const formatFecha = (f) => new Date(f + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div>
      <PageHeader
        title="Tipos de Cambio"
        description="Tasas de cambio entre monedas por fecha"
        action={puede('gestionar', 'tipos_cambio') && (
          <button onClick={() => { setForm(EMPTY); setError(null); setModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-md shadow-amber-500/20 transition-all">
            <FaPlus className="h-3.5 w-3.5" /> Nuevo tipo de cambio
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
              <FaExchangeAlt className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay tipos de cambio registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    {['Fecha', 'Par', 'Tasa Compra', 'Tasa Venta', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {lista.map(tc => (
                    <tr key={tc.id_tipo_cambio} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 text-gray-700 dark:text-zinc-300 font-medium">{formatFecha(tc.fecha)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">{tc.moneda_origen_codigo}</span>
                          <FaExchangeAlt className="h-3 w-3 text-gray-400" />
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">{tc.moneda_destino_codigo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-900 dark:text-white">{Number(tc.tasa_compra).toFixed(4)}</td>
                      <td className="px-4 py-3 font-mono text-gray-900 dark:text-white">{Number(tc.tasa_venta).toFixed(4)}</td>
                      <td className="px-4 py-3">
                        {puede('gestionar', 'tipos_cambio') && (
                          <button onClick={() => setConfirm(tc)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                            <FaTrash className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal open={modal} onClose={cerrarModal} title="Nuevo Tipo de Cambio" maxWidth="max-w-md">
        {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Fecha *</label>
            <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Moneda Origen *</label>
              <select name="id_moneda_origen" value={form.id_moneda_origen} onChange={handleChange} required className={inputCls}>
                <option value="">Seleccionar</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.codigo} - {m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Moneda Destino *</label>
              <select name="id_moneda_destino" value={form.id_moneda_destino} onChange={handleChange} required className={inputCls}>
                <option value="">Seleccionar</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.codigo} - {m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tasa Compra *</label>
              <input name="tasa_compra" type="number" step="0.000001" min="0" value={form.tasa_compra} onChange={handleChange} required className={inputCls} placeholder="0.000000" />
            </div>
            <div>
              <label className={labelCls}>Tasa Venta *</label>
              <input name="tasa_venta" type="number" step="0.000001" min="0" value={form.tasa_venta} onChange={handleChange} required className={inputCls} placeholder="0.000000" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={cerrarModal} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              Registrar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar Tipo de Cambio" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Eliminar el tipo de cambio <strong className="text-gray-900 dark:text-white">{confirm?.moneda_origen_codigo} → {confirm?.moneda_destino_codigo}</strong> del <strong>{confirm?.fecha}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button onClick={() => handleEliminar(confirm.id_tipo_cambio)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all">Eliminar</button>
        </div>
      </Modal>
    </div>
  );
}
