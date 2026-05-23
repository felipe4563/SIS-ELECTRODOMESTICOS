import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transferenciasService } from '../../services/transferencias.service';
import { depositosService }       from '../../services/depositos.service';
import { usePermission }          from '../../hooks/usePermission';

const fmtFecha = s => s ? new Date(s).toLocaleDateString('es-BO') : '—';

const ESTADO_BADGE = {
  SOLICITADA:  { label: 'Solicitada',  cls: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400' },
  EN_TRANSITO: { label: 'En tránsito', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  RECIBIDA:    { label: 'Recibida',    cls: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400' },
  PARCIAL:     { label: 'Parcial',     cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  ANULADA:     { label: 'Anulada',     cls: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400' },
};

const HOY    = new Date().toISOString().slice(0, 10);
const HACE30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

export default function Transferencias() {
  const navigate = useNavigate();
  const { puede } = usePermission();
  const puedeCrear = puede('transferir_solicitar', 'inventario');

  const [transferencias, setTransferencias] = useState([]);
  const [depositos,      setDepositos]      = useState([]);
  const [cargando,       setCargando]       = useState(true);
  const [filtros,        setFiltros]        = useState({
    estado: '', id_deposito_origen: '', id_deposito_destino: '',
    fecha_desde: HACE30, fecha_hasta: HOY,
  });

  useEffect(() => {
    depositosService.getAll()
      .then(r => setDepositos(r.data.depositos ?? r.data ?? []))
      .catch(() => {});
  }, []);

  const cargar = async () => {
    setCargando(true);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''));
      const res = await transferenciasService.getAll(params);
      setTransferencias(res.data.transferencias ?? []);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const pendientes = transferencias.filter(t => ['SOLICITADA', 'EN_TRANSITO', 'PARCIAL'].includes(t.estado)).length;

  const inputCls = 'px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Transferencias</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Movimiento de mercadería entre depósitos
          </p>
        </div>
        {puedeCrear && (
          <button
            onClick={() => navigate('/inventario/transferencias/nueva')}
            className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
          >
            + Nueva transferencia
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total (filtro)</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{transferencias.length}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-200 dark:border-yellow-900/30 p-4">
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">En proceso</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendientes}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200 dark:border-green-900/30 p-4">
          <p className="text-xs text-green-600 dark:text-green-400 mb-1">Recibidas</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {transferencias.filter(t => t.estado === 'RECIBIDA').length}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <select value={filtros.estado} onChange={e => setF('estado', e.target.value)} className={inputCls}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_BADGE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtros.id_deposito_origen} onChange={e => setF('id_deposito_origen', e.target.value)} className={inputCls}>
            <option value="">Depósito origen (todos)</option>
            {depositos.map(d => <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>)}
          </select>
          <select value={filtros.id_deposito_destino} onChange={e => setF('id_deposito_destino', e.target.value)} className={inputCls}>
            <option value="">Depósito destino (todos)</option>
            {depositos.map(d => <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>)}
          </select>
          <input type="date" value={filtros.fecha_desde} onChange={e => setF('fecha_desde', e.target.value)} className={inputCls} />
          <div className="flex gap-2">
            <input type="date" value={filtros.fecha_hasta} onChange={e => setF('fecha_hasta', e.target.value)} className={`flex-1 ${inputCls}`} />
            <button onClick={cargar} className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors">
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-20 text-zinc-400">Cargando…</div>
        ) : transferencias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-2">
            <span className="text-4xl">🔄</span>
            <p className="text-sm">No hay transferencias para los filtros seleccionados</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                    {['Número', 'Origen → Destino', 'Solicitada', 'Enviada', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {transferencias.map(t => {
                    const badge = ESTADO_BADGE[t.estado] ?? { label: t.estado, cls: 'bg-zinc-100 text-zinc-600' };
                    return (
                      <tr key={t.id_transferencia}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/inventario/transferencias/${t.id_transferencia}`)}
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-white">{t.numero}</td>
                        <td className="px-4 py-3">
                          <span className="text-zinc-900 dark:text-white">{t.deposito_origen_nombre}</span>
                          <span className="text-zinc-400 mx-1.5">→</span>
                          <span className="text-zinc-900 dark:text-white">{t.deposito_destino_nombre}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">{fmtFecha(t.fecha_solicitud)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">{fmtFecha(t.fecha_envio)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/inventario/transferencias/${t.id_transferencia}`); }}
                            className="text-xs text-zinc-500 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                          >
                            Ver →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-600">
              {transferencias.length} transferencia{transferencias.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
