import { useState, useEffect, useCallback } from 'react';
import { useNavigate }          from 'react-router-dom';
import { usePermission }        from '../../hooks/usePermission';
import { servicioTecnicoService } from '../../services/servicioTecnico.service';

/* ── Constantes de UI ─────────────────────────────────────────────────────── */
const ESTADO_META = {
  RECIBIDO:           { label: 'Recibido',          cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',           border: 'border-l-zinc-400' },
  EN_DIAGNOSTICO:     { label: 'En diagnóstico',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',        border: 'border-l-blue-400' },
  ESPERANDO_REPUESTO: { label: 'Esperando repuesto',cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',border: 'border-l-orange-400' },
  EN_REPARACION:      { label: 'En reparación',     cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',border: 'border-l-violet-400' },
  REPARADO:           { label: 'Reparado',          cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',    border: 'border-l-green-400' },
  LISTO_ENTREGA:      { label: 'Listo p/ entrega',  cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',       border: 'border-l-teal-400' },
  ENTREGADO:          { label: 'Entregado',         cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',border: 'border-l-indigo-400' },
  SIN_REPARACION:     { label: 'Sin reparación',    cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',        border: 'border-l-rose-400' },
  ANULADO:            { label: 'Anulado',           cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',            border: 'border-l-red-400' },
};

const PRIORIDAD_META = {
  BAJA:    { label: 'Baja',    cls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' },
  NORMAL:  { label: 'Normal',  cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  ALTA:    { label: 'Alta',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  URGENTE: { label: 'Urgente', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const ESTADOS_ACTIVOS = ['RECIBIDO', 'EN_DIAGNOSTICO', 'ESPERANDO_REPUESTO', 'EN_REPARACION', 'REPARADO', 'LISTO_ENTREGA'];
const TODOS_LOS_ESTADOS = [...ESTADOS_ACTIVOS, 'ENTREGADO', 'SIN_REPARACION', 'ANULADO'];

const hoy = () => new Date().toISOString().slice(0, 10);
const hace30 = () => {
  const d = new Date(); d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

/* ── Badges ──────────────────────────────────────────────────────────────── */
function EstadoBadge({ estado }) {
  const m = ESTADO_META[estado] ?? { label: estado, cls: 'bg-zinc-100 text-zinc-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

function PrioridadBadge({ prioridad }) {
  const m = PRIORIDAD_META[prioridad] ?? { label: prioridad, cls: 'bg-zinc-100 text-zinc-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${m.cls}`}>
      {m.label}
    </span>
  );
}

/* ── Input class compartida ──────────────────────────────────────────────── */
const INPUT = 'px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors';

/* ── Componente principal ─────────────────────────────────────────────────── */
export default function ServicioTecnico() {
  const navigate = useNavigate();
  const { puede } = usePermission();

  const puedeCrear = puede('crear', 'servicio_tecnico');
  const puedeVer   = puede('ver', 'servicio_tecnico') || puede('ver_todas', 'servicio_tecnico');

  const [servicios, setServicios]   = useState([]);
  const [total, setTotal]           = useState(0);
  const [cargando, setCargando]     = useState(true);
  const [pipeline, setPipeline]     = useState({});
  const [filtros, setFiltros]       = useState({
    search: '', estado: '', fecha_desde: hace30(), fecha_hasta: hoy(),
  });

  const setF = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const cargar = useCallback(async (overrides = {}) => {
    setCargando(true);
    try {
      const params = Object.fromEntries(
        Object.entries({ ...filtros, ...overrides }).filter(([, v]) => v !== '')
      );
      params.limit = 100;
      const res = await servicioTecnicoService.getAll(params);
      const data = res.data.servicios ?? [];
      setServicios(data);
      setTotal(res.data.total ?? data.length);

      // Contar por estado para pipeline
      const counts = {};
      data.forEach(s => { counts[s.estado] = (counts[s.estado] ?? 0) + 1; });
      setPipeline(counts);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activosPendientes = ESTADOS_ACTIVOS.reduce((s, e) => s + (pipeline[e] ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Servicio Técnico</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {activosPendientes > 0
              ? `${activosPendientes} ${activosPendientes === 1 ? 'equipo en proceso' : 'equipos en proceso'}`
              : 'Sin equipos pendientes'}
          </p>
        </div>
        {puedeCrear && (
          <button
            onClick={() => navigate('/servicio-tecnico/nueva')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-zinc-900 font-semibold text-sm transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Nueva Orden
          </button>
        )}
      </div>

      {/* Pipeline pills */}
      <div className="flex flex-wrap gap-2">
        {ESTADOS_ACTIVOS.map(e => {
          const m = ESTADO_META[e];
          const n = pipeline[e] ?? 0;
          return (
            <button
              key={e}
              onClick={() => {
                const nuevo = filtros.estado === e ? '' : e;
                setF('estado', nuevo);
                cargar({ estado: nuevo });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all
                ${filtros.estado === e
                  ? 'ring-2 ring-yellow-400 border-yellow-400'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'}
                ${m.cls}`}
            >
              {m.label}
              <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-black/10 dark:bg-white/10 text-[10px] font-bold">
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={filtros.search}
            onChange={e => setF('search', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cargar()}
            placeholder="Buscar por número, equipo, cliente, serie…"
            className={`${INPUT} flex-1`}
          />
          <select value={filtros.estado} onChange={e => setF('estado', e.target.value)} className={INPUT}>
            <option value="">Todos los estados</option>
            {TODOS_LOS_ESTADOS.map(e => (
              <option key={e} value={e}>{ESTADO_META[e]?.label ?? e}</option>
            ))}
          </select>
          <input
            type="date" value={filtros.fecha_desde}
            onChange={e => setF('fecha_desde', e.target.value)}
            className={INPUT}
          />
          <input
            type="date" value={filtros.fecha_hasta}
            onChange={e => setF('fecha_hasta', e.target.value)}
            className={INPUT}
          />
          <button
            onClick={cargar}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-zinc-900 font-semibold text-sm transition-colors whitespace-nowrap"
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Tabla desktop / Cards mobile */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : servicios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <span className="text-5xl mb-3">🔧</span>
            <p className="font-medium">No hay órdenes de servicio</p>
            <p className="text-sm mt-1">Ajusta los filtros o crea una nueva orden</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                  <tr>
                    {['Número','Equipo','Cliente','Estado','Prioridad','Técnico externo','Recepción','F. estimada',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {servicios.map(s => (
                    <tr
                      key={s.id_servicio}
                      onClick={() => navigate(`/servicio-tecnico/${s.id_servicio}`)}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {s.numero}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-800 dark:text-zinc-200 max-w-[180px] truncate">
                          {s.descripcion_producto}
                        </div>
                        {s.marca_producto && (
                          <div className="text-xs text-zinc-400">{s.marca_producto} {s.modelo_producto}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 max-w-[140px]">
                        <div className="truncate">{s.cliente ?? <span className="text-zinc-400 italic">Inventario</span>}</div>
                        {s.cliente_ci_ruc && <div className="text-xs text-zinc-400">{s.cliente_ci_ruc}</div>}
                      </td>
                      <td className="px-4 py-3"><EstadoBadge estado={s.estado} /></td>
                      <td className="px-4 py-3"><PrioridadBadge prioridad={s.prioridad} /></td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                        {s.tecnico_externo ?? <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono whitespace-nowrap">
                        {s.fecha_recepcion ? new Date(s.fecha_recepcion).toLocaleDateString('es-PY') : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                        {s.fecha_estimada_entrega
                          ? <span className={new Date(s.fecha_estimada_entrega) < new Date() && !['ENTREGADO','ANULADO','SIN_REPARACION'].includes(s.estado)
                              ? 'text-red-500 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}>
                              {new Date(s.fecha_estimada_entrega).toLocaleDateString('es-PY')}
                            </span>
                          : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/servicio-tecnico/${s.id_servicio}`); }}
                          className="text-xs px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {servicios.map(s => {
                const bm = ESTADO_META[s.estado] ?? {};
                return (
                  <div
                    key={s.id_servicio}
                    onClick={() => navigate(`/servicio-tecnico/${s.id_servicio}`)}
                    className={`flex gap-0 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors`}
                  >
                    <div className={`w-1 flex-shrink-0 rounded-l-none ${bm.border ?? 'border-l-zinc-300'} border-l-4`} />
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <span className="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400">{s.numero}</span>
                          <p className="font-medium text-zinc-800 dark:text-zinc-200 text-sm mt-0.5">
                            {s.descripcion_producto}
                          </p>
                        </div>
                        <EstadoBadge estado={s.estado} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {s.cliente && <span>{s.cliente}</span>}
                        {s.cliente && s.prioridad !== 'NORMAL' && <span>·</span>}
                        <PrioridadBadge prioridad={s.prioridad} />
                        {s.fecha_estimada_entrega && (
                          <>
                            <span>·</span>
                            <span className={new Date(s.fecha_estimada_entrega) < new Date() && !['ENTREGADO','ANULADO','SIN_REPARACION'].includes(s.estado) ? 'text-red-500 font-semibold' : ''}>
                              Est. {new Date(s.fecha_estimada_entrega).toLocaleDateString('es-PY')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        {!cargando && servicios.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400">
            {servicios.length} de {total} órdenes
          </div>
        )}
      </div>
    </div>
  );
}
