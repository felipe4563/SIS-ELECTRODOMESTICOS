import { useState, useEffect } from 'react';
import { FaEdit, FaCheck, FaTimes, FaSpinner, FaCog } from 'react-icons/fa';
import { parametrosService } from '../../services/configuracion.service';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/ui/PageHeader';

const inputCls = 'px-3 py-1.5 rounded-lg text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-colors w-full max-w-xs';

function ParametroFila({ p, puedEditar }) {
  const [editando,  setEditando]  = useState(false);
  const [valor,     setValor]     = useState(p.valor ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);

  const guardar = async () => {
    setError(null);
    setGuardando(true);
    try {
      await parametrosService.update(p.clave, valor);
      setEditando(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = () => { setValor(p.valor ?? ''); setEditando(false); setError(null); };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">{p.clave}</p>
        {p.descripcion && <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{p.descripcion}</p>}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400">{p.tipo_dato}</span>
      </td>
      <td className="px-4 py-3">
        {editando ? (
          <div className="space-y-1">
            <input value={valor} onChange={e => setValor(e.target.value)} className={inputCls} />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        ) : (
          <span className="text-sm text-gray-900 dark:text-white font-mono">{p.valor ?? <span className="text-gray-400 italic">—</span>}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {puedEditar && (
          editando ? (
            <div className="flex items-center gap-1">
              <button onClick={guardar} disabled={guardando}
                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors disabled:opacity-50">
                {guardando ? <FaSpinner className="animate-spin h-3.5 w-3.5" /> : <FaCheck className="h-3.5 w-3.5" />}
              </button>
              <button onClick={cancelar}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                <FaTimes className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditando(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
              <FaEdit className="h-3.5 w-3.5" />
            </button>
          )
        )}
      </td>
    </tr>
  );
}

export default function Parametros() {
  const { puede } = usePermission();
  const [lista,    setLista]    = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    parametrosService.getAll()
      .then(({ data }) => setLista(data.parametros))
      .catch(() => setError('Error al cargar parámetros'))
      .finally(() => setCargando(false));
  }, []);

  const filtrada = busqueda
    ? lista.filter(p => p.clave.toLowerCase().includes(busqueda.toLowerCase()) || p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()))
    : lista;

  return (
    <div>
      <PageHeader
        title="Parámetros del Sistema"
        description="Configuración general de la aplicación"
      />

      <div className="mb-4">
        <input
          placeholder="Buscar parámetro..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm w-full max-w-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-colors"
        />
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center h-48 text-gray-400"><FaSpinner className="animate-spin h-6 w-6" /></div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          {filtrada.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-zinc-500">
              <FaCog className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{busqueda ? 'Sin resultados' : 'No hay parámetros configurados'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    {['Parámetro', 'Tipo', 'Valor', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {filtrada.map(p => (
                    <ParametroFila key={p.id_config} p={p} puedEditar={puede('editar', 'parametros')} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
