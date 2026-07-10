import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSpinner, FaWarehouse, FaBuilding, FaUser } from 'react-icons/fa';
import { depositosService, sucursalesService } from '../../services/configuracion.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const TIPOS = ['ALMACEN', 'DEPOSITO_PEQUENO', 'PUNTO_VENTA', 'TRANSITO'];
const EMPTY = { id_sucursal: '', codigo: '', nombre: '', tipo: 'ALMACEN', direccion: '', encargado: '', permite_venta: true, activo: true };

const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 dark:focus:border-amber-500/50 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';

const TIPO_STYLES = {
  ALMACEN:         { badge: 'bg-blue-100   dark:bg-blue-500/10   text-blue-700   dark:text-blue-400',   bar: 'bg-blue-400   dark:bg-blue-500'   },
  DEPOSITO_PEQUENO:{ badge: 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400', bar: 'bg-purple-400 dark:bg-purple-500' },
  PUNTO_VENTA:     { badge: 'bg-green-100  dark:bg-green-500/10  text-green-700  dark:text-green-400',  bar: 'bg-green-400  dark:bg-green-500'  },
  TRANSITO:        { badge: 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400', bar: 'bg-orange-400 dark:bg-orange-500' },
};

function BadgeTipo({ tipo }) {
  const st = TIPO_STYLES[tipo] ?? { badge: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${st.badge}`}>
      {tipo.replace(/_/g, ' ')}
    </span>
  );
}

function BadgeEstado({ activo }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${activo ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-green-500' : 'bg-gray-400'}`} />
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export default function Depositos() {
  const { puede } = usePermission();
  const [lista,      setLista]      = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [modal,      setModal]      = useState(false);
  const [confirm,    setConfirm]    = useState(null);
  const [editando,   setEditando]   = useState(null);
  const [form,       setForm]       = useState(EMPTY);
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState(null);
  const [filtroSuc,  setFiltroSuc]  = useState('');

  const cargar = () => {
    setCargando(true);
    Promise.all([depositosService.getAll(), sucursalesService.getAll()])
      .then(([{ data: d }, { data: s }]) => {
        setLista(d.depositos);
        setSucursales(s.sucursales.filter(x => x.activo));
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const abrirCrear  = () => { setEditando(null); setForm(EMPTY); setError(null); setModal(true); };
  const abrirEditar = (d) => { setEditando(d); setForm({ ...d }); setError(null); setModal(true); };
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
      if (editando) await depositosService.update(editando.id_deposito, form);
      else          await depositosService.create(form);
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
      await depositosService.remove(id);
      setConfirm(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const listaFiltrada = filtroSuc ? lista.filter(d => String(d.id_sucursal) === filtroSuc) : lista;

  const accionesBtn = (d) => (
    <div className="flex items-center gap-1">
      {puede('editar', 'depositos') && (
        <button
          onClick={() => abrirEditar(d)}
          title="Editar"
          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
        >
          <FaEdit className="h-3.5 w-3.5" />
        </button>
      )}
      {puede('eliminar', 'depositos') && (
        <button
          onClick={() => setConfirm(d)}
          title="Desactivar"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <FaTrash className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Depósitos"
        description="Almacenes y depósitos por sucursal"
        action={puede('crear', 'depositos') && (
          <button
            onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-md shadow-amber-500/20 transition-all"
          >
            <FaPlus className="h-3.5 w-3.5" />
            <span>Nuevo depósito</span>
          </button>
        )}
      />

      {/* Filtro por sucursal */}
      <div className="mb-4">
        <select
          value={filtroSuc}
          onChange={e => setFiltroSuc(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-xl text-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-colors"
        >
          <option value="">Todas las sucursales</option>
          {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
        </select>
      </div>

      {error && !modal && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <FaSpinner className="animate-spin h-6 w-6" />
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl text-center py-16 text-gray-400 dark:text-zinc-500">
          <FaWarehouse className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay depósitos registrados</p>
        </div>
      ) : (
        <>
          {/* ── Vista móvil: cards ─────────────────────────────────── */}
          <div className="md:hidden space-y-3">
            {listaFiltrada.map(d => {
              const bar = (TIPO_STYLES[d.tipo] ?? { bar: 'bg-gray-400' }).bar;
              return (
                <div key={d.id_deposito} className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />

                  <div className="pl-4 pr-3 py-3.5">
                    {/* fila superior: nombre + acciones */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm leading-snug truncate">{d.nombre}</p>
                        <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mt-0.5">{d.codigo}</p>
                      </div>
                      {accionesBtn(d)}
                    </div>

                    {/* badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      <BadgeTipo tipo={d.tipo} />
                      <BadgeEstado activo={d.activo} />
                      {d.permite_venta && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
                          Permite venta
                        </span>
                      )}
                    </div>

                    {/* datos */}
                    <div className="grid grid-cols-1 gap-1 text-xs text-gray-500 dark:text-zinc-400">
                      {d.sucursal_nombre && (
                        <span className="flex items-center gap-1.5 truncate">
                          <FaBuilding className="h-3 w-3 shrink-0 text-gray-400" />
                          {d.sucursal_nombre}
                        </span>
                      )}
                      {d.encargado && (
                        <span className="flex items-center gap-1.5 truncate">
                          <FaUser className="h-3 w-3 shrink-0 text-gray-400" />
                          {d.encargado}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Vista tablet/desktop: tabla ───────────────────────── */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    {['Código', 'Nombre', 'Tipo', 'Sucursal', 'Encargado', 'Venta', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {listaFiltrada.map(d => (
                    <tr key={d.id_deposito} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">{d.codigo}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.nombre}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><BadgeTipo tipo={d.tipo} /></td>
                      <td className="px-4 py-3 text-gray-600 dark:text-zinc-400 whitespace-nowrap">{d.sucursal_nombre}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{d.encargado || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${d.permite_venta ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                          {d.permite_venta ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><BadgeEstado activo={d.activo} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">{accionesBtn(d)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Modal crear/editar ─────────────────────────────────────── */}
      <Modal open={modal} onClose={cerrarModal} title={editando ? 'Editar Depósito' : 'Nuevo Depósito'}>
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Sucursal *</label>
              <select name="id_sucursal" value={form.id_sucursal} onChange={handleChange} required className={inputCls}>
                <option value="">Selecciona una sucursal</option>
                {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Código *</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} required className={inputCls} placeholder="Ej: ALM-GAL18" />
            </div>
            <div>
              <label className={labelCls}>Tipo *</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className={inputCls}>
                {TIPOS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} placeholder="Nombre del depósito" />
            </div>
            <div>
              <label className={labelCls}>Encargado</label>
              <input name="encargado" value={form.encargado ?? ''} onChange={handleChange} className={inputCls} placeholder="Nombre del encargado" />
            </div>
            <div>
              <label className={labelCls}>Dirección</label>
              <input name="direccion" value={form.direccion ?? ''} onChange={handleChange} className={inputCls} placeholder="Dirección" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="permite_venta" checked={form.permite_venta ?? true} onChange={handleChange} className="rounded accent-amber-500" />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Permite venta</span>
            </label>
            {editando && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="activo" checked={form.activo ?? true} onChange={handleChange} className="rounded accent-amber-500" />
                <span className="text-sm text-gray-700 dark:text-zinc-300">Activo</span>
              </label>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={cerrarModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all"
            >
              {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
              {editando ? 'Guardar cambios' : 'Crear depósito'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal confirmación desactivar ──────────────────────────── */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar Depósito" maxWidth="max-w-sm">
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">
          ¿Desactivar el depósito <strong className="text-gray-900 dark:text-white">{confirm?.nombre}</strong>?
        </p>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            onClick={() => setConfirm(null)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleEliminar(confirm.id_deposito)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all"
          >
            Desactivar
          </button>
        </div>
      </Modal>
    </div>
  );
}
