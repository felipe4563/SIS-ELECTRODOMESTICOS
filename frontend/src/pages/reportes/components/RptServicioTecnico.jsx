import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { servicioTecnicoService } from '../../../services/servicioTecnico.service';
import { exportarReporteServicioTecnicoPDF } from './RptServicioTecnicoPDF';
import { hoy, inicioMes, FiltroFechas, BtnConsultar } from './ReportesShared';

const SELECT = 'border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors';

const ESTADO_LABEL = {
  RECIBIDO:           'Recibido',
  EN_DIAGNOSTICO:     'En diagnóstico',
  ESPERANDO_REPUESTO: 'Esperando repuesto',
  EN_REPARACION:      'En reparación',
  REPARADO:           'Reparado',
  LISTO_ENTREGA:      'Listo para entrega',
  ENTREGADO:          'Entregado',
  SIN_REPARACION:     'Sin reparación',
  ANULADO:            'Anulado',
};

const ESTADO_BADGE = {
  RECIBIDO:           'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  EN_DIAGNOSTICO:     'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ESPERANDO_REPUESTO: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  EN_REPARACION:      'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  REPARADO:           'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  LISTO_ENTREGA:      'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  ENTREGADO:          'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  SIN_REPARACION:     'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  ANULADO:            'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PRIO_BADGE = {
  URGENTE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ALTA:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  NORMAL:  'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  BAJA:    'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

const ORDEN_ESTADOS = [
  'RECIBIDO','EN_DIAGNOSTICO','ESPERANDO_REPUESTO','EN_REPARACION',
  'REPARADO','LISTO_ENTREGA','ENTREGADO','SIN_REPARACION','ANULADO',
];

const fmt = d => d ? new Date(d).toLocaleDateString('es-PY') : '—';
const gs  = n => n != null && Number(n) > 0 ? `Gs. ${Number(n).toLocaleString('es-PY')}` : null;

export default function RptServicioTecnico() {
  const navigate = useNavigate();

  const [filtros, setFiltros]       = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [estadoFiltro, setEstado]   = useState('');
  const [tecnicoFiltro, setTecnico] = useState('');
  const [tecnicos, setTecnicos]     = useState([]);
  const [ordenes, setOrdenes]       = useState(null);
  const [empresa, setEmpresa]       = useState(null);
  const [cargando, setCargando]     = useState(false);
  const [exportando, setExportando] = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');

  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  // Cargar lista de técnicos activos al montar
  useEffect(() => {
    servicioTecnicoService.getTecnicos({ activo: 1 })
      .then(r => setTecnicos(r.data?.tecnicos ?? r.data ?? []))
      .catch(() => {});
  }, []);

  const buscar = useCallback(() => {
    setCargando(true); setErrorMsg('');
    const params = { ...filtros };
    if (estadoFiltro)   params.estado = estadoFiltro;
    if (tecnicoFiltro)  params.id_tecnico_externo = tecnicoFiltro;
    servicioTecnicoService.getReporteDetalle(params)
      .then(r => {
        setOrdenes(r.data.ordenes);
        setEmpresa(r.data.empresa);
      })
      .catch(() => setErrorMsg('Error al cargar el reporte'))
      .finally(() => setCargando(false));
  }, [filtros, estadoFiltro, tecnicoFiltro]);

  // Consulta automática al montar
  useEffect(() => { buscar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportPDF = async () => {
    setExportando(true); setErrorMsg('');
    try {
      await exportarReporteServicioTecnicoPDF({
        ordenes,
        empresa,
        filtros: { ...filtros, estado: estadoFiltro || null },
      });
    } catch (e) {
      setErrorMsg(e.message || 'Error al generar el PDF');
    } finally {
      setExportando(false);
    }
  };

  const grupos = ordenes ? (() => {
    const g = {};
    for (const o of ordenes) {
      if (!g[o.estado]) g[o.estado] = [];
      g[o.estado].push(o);
    }
    return g;
  })() : null;

  const estadosPresentes = grupos ? ORDEN_ESTADOS.filter(e => grupos[e]?.length > 0) : [];
  const totalOrdenes = ordenes?.length ?? 0;
  const enProceso    = ordenes?.filter(o => !['ENTREGADO','ANULADO','SIN_REPARACION'].includes(o.estado)).length ?? 0;

  return (
    <div className="space-y-4">

      {/* ── Filtros ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <FiltroFechas filtros={filtros} onChange={f} />

          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Estado</label>
            <select value={estadoFiltro} onChange={e => setEstado(e.target.value)} className={SELECT}>
              <option value="">Todos los estados</option>
              {ORDEN_ESTADOS.map(e => (
                <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
              ))}
            </select>
          </div>

          {tecnicos.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Técnico externo</label>
              <select value={tecnicoFiltro} onChange={e => setTecnico(e.target.value)} className={SELECT}>
                <option value="">Todos los técnicos</option>
                {tecnicos.map(t => (
                  <option key={t.id_tecnico} value={t.id_tecnico}>{t.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <BtnConsultar onClick={buscar} />

          {ordenes?.length > 0 && (
            <button
              onClick={handleExportPDF}
              disabled={exportando}
              className="ml-auto px-3 py-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 font-semibold text-sm rounded-xl transition-colors border border-red-200 dark:border-red-500/30 flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              {exportando ? 'Generando…' : 'Descargar PDF'}
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {/* ── Cargando ── */}
      {cargando && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Sin datos ── */}
      {!cargando && ordenes !== null && ordenes.length === 0 && (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">
          No hay órdenes con esos filtros
        </div>
      )}

      {/* ── Resultados ── */}
      {!cargando && ordenes?.length > 0 && (
        <>
          {/* Resumen rápido */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total órdenes', value: totalOrdenes },
              { label: 'En proceso',    value: enProceso },
              { label: 'Estados',       value: estadosPresentes.length },
              { label: 'Entregadas',    value: grupos?.ENTREGADO?.length ?? 0 },
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 text-center">
                <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">{c.value}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Tabla agrupada por estado */}
          {estadosPresentes.map(estado => (
            <div key={estado} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-zinc-900 dark:bg-zinc-950">
                <div className="flex items-center gap-2.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ESTADO_BADGE[estado]}`}>
                    {ESTADO_LABEL[estado]}
                  </span>
                </div>
                <span className="text-xs text-zinc-400 font-mono">
                  {grupos[estado].length} {grupos[estado].length === 1 ? 'orden' : 'órdenes'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">N° Orden</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Cliente</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Equipo</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Técnico</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Falla</th>
                      <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Días</th>
                      <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Prioridad</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Costo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {grupos[estado].map(o => {
                      const costo = gs(o.costo_final) ?? gs(o.costo_estimado);
                      return (
                        <tr
                          key={o.id_servicio}
                          onClick={() => navigate(`/servicio-tecnico/${o.id_servicio}`)}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-white">
                              {o.numero}
                            </span>
                            <br />
                            <span className="text-[10px] text-zinc-400">{fmt(o.fecha_recepcion)}</span>
                            {o.garantia && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                GAR
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 text-xs">
                              {o.cliente_nombre ?? '—'}
                            </span>
                            {o.sucursal_nombre && (
                              <><br /><span className="text-[10px] text-zinc-400">{o.sucursal_nombre}</span></>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-[180px]">
                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-tight block">
                              {o.descripcion_producto ?? '—'}
                            </span>
                            {(o.marca_producto || o.modelo_producto) && (
                              <span className="text-[10px] text-zinc-400 block mt-0.5">
                                {[o.marca_producto, o.modelo_producto].filter(Boolean).join(' ')}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-zinc-600 dark:text-zinc-300">
                              {o.tecnico_nombre ?? <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                              {o.falla_reportada ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-300">
                              {o.dias_en_servicio ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIO_BADGE[o.prioridad] ?? PRIO_BADGE.NORMAL}`}>
                              {o.prioridad ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-zinc-700 dark:text-zinc-300">
                            {costo ?? <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
