import { useState, useEffect, useCallback } from 'react';
import { asistenciaService } from '../../services/asistencia.service';

const hoy       = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const INPUT = 'w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400';
const LABEL = 'text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1';

const ESTADO_COLOR = {
  PRESENTE:   'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  TARDANZA:   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  FALTA:      'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  JUSTIFICADA:'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
};

function EstadoBadge({ estado }) {
  return <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${ESTADO_COLOR[estado] || ''}`}>{estado}</span>;
}

function ModalJustificar({ row, onClose, onGuardado }) {
  const [motivo, setMotivo]     = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError]       = useState(null);

  if (!row) return null;

  const guardar = async () => {
    if (!motivo.trim()) return setError('El motivo es requerido');
    setGuardando(true);
    setError(null);
    try {
      await asistenciaService.justificar(row.id_asistencia, motivo.trim());
      onGuardado();
    } catch (e) {
      setError(e.response?.data?.error || 'Error al justificar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Justificar falta — {row.empleado}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{row.fecha}</p>
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
          placeholder="Motivo (permiso, enfermedad, etc.)" className={INPUT} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">Cancelar</button>
          <button onClick={guardar} disabled={guardando}
            className="px-4 py-2 text-sm rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Justificar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Asistencia() {
  const [filas, setFilas]       = useState([]);
  const [cargando, setCargando] = useState(false);
  const [justificarRow, setJustificarRow] = useState(null);
  const [filtros, setFiltros]   = useState({
    fecha_desde: inicioMes(), fecha_hasta: hoy(), estado: '',
  });

  const buscar = useCallback(() => {
    setCargando(true);
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''));
    asistenciaService.getAsistencias(params)
      .then(r => setFilas(r.data.asistencias))
      .finally(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);

  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const resumen = filas.reduce((acc, r) => { acc[r.estado] = (acc[r.estado] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-5">
      {justificarRow && (
        <ModalJustificar row={justificarRow} onClose={() => setJustificarRow(null)}
          onGuardado={() => { setJustificarRow(null); buscar(); }} />
      )}

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Asistencia</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Reporte de entrada/salida de empleados</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-full sm:w-36">
          <label className={LABEL}>Desde</label>
          <input type="date" value={filtros.fecha_desde} onChange={e => f('fecha_desde', e.target.value)} className={INPUT} />
        </div>
        <div className="w-full sm:w-36">
          <label className={LABEL}>Hasta</label>
          <input type="date" value={filtros.fecha_hasta} onChange={e => f('fecha_hasta', e.target.value)} className={INPUT} />
        </div>
        <div className="w-full sm:w-40">
          <label className={LABEL}>Estado</label>
          <select value={filtros.estado} onChange={e => f('estado', e.target.value)} className={INPUT}>
            <option value="">Todos</option>
            <option value="PRESENTE">Presente</option>
            <option value="TARDANZA">Tardanza</option>
            <option value="FALTA">Falta</option>
            <option value="JUSTIFICADA">Justificada</option>
          </select>
        </div>
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">
          Consultar
        </button>
      </div>

      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm">
        <span>Total: <strong>{filas.length}</strong></span>
        <span>Presentes: <strong>{resumen.PRESENTE || 0}</strong></span>
        <span>Tardanzas: <strong>{resumen.TARDANZA || 0}</strong></span>
        <span>Faltas: <strong>{resumen.FALTA || 0}</strong></span>
        <span>Justificadas: <strong>{resumen.JUSTIFICADA || 0}</strong></span>
      </div>

      {cargando ? (
        <p className="text-center py-16 text-zinc-400 text-sm">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="text-center py-16 text-zinc-400 text-sm">Sin registros en este período</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Fecha', 'Empleado', 'Sucursal', 'Entrada', 'Salida', 'Estado', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filas.map(row => (
                <tr key={row.id_asistencia} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-3 py-2.5 text-xs font-mono text-zinc-500">{row.fecha}</td>
                  <td className="px-3 py-2.5 font-medium text-zinc-800 dark:text-zinc-200">{row.empleado}</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{row.sucursal_nombre || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.hora_entrada || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.hora_salida || '—'}</td>
                  <td className="px-3 py-2.5"><EstadoBadge estado={row.estado} /></td>
                  <td className="px-3 py-2.5 text-right">
                    {row.estado === 'FALTA' && (
                      <button onClick={() => setJustificarRow(row)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors">
                        Justificar
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
  );
}
