import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams }           from 'react-router-dom';
import { FaArrowLeft, FaSpinner }           from 'react-icons/fa';
import { usePermission }                    from '../../hooks/usePermission';
import { servicioTecnicoService }           from '../../services/servicioTecnico.service';
import { exportarReciboPDF }               from './ReciboPDF';

/* ─── Estado metadata ──────────────────────────────────────────────────────── */
const ESTADO_META = {
  RECIBIDO:           { label: 'Recibido',           dot: 'bg-zinc-400',   badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' },
  EN_DIAGNOSTICO:     { label: 'En diagnóstico',     dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  ESPERANDO_REPUESTO: { label: 'Esperando repuesto', dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  EN_REPARACION:      { label: 'En reparación',      dot: 'bg-violet-400', badge: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  REPARADO:           { label: 'Reparado',           dot: 'bg-green-400',  badge: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  LISTO_ENTREGA:      { label: 'Listo para entrega', dot: 'bg-teal-400',   badge: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  ENTREGADO:          { label: 'Entregado',          dot: 'bg-indigo-400', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  SIN_REPARACION:     { label: 'Sin reparación',     dot: 'bg-rose-400',   badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  ANULADO:            { label: 'Anulado',            dot: 'bg-red-400',    badge: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const PRIORIDAD_META = {
  BAJA:    { label: 'Baja',    color: 'text-zinc-400 dark:text-zinc-500' },
  NORMAL:  { label: 'Normal',  color: 'text-blue-500 dark:text-blue-400' },
  ALTA:    { label: 'Alta',    color: 'text-amber-600 dark:text-amber-400' },
  URGENTE: { label: 'Urgente', color: 'text-red-600 dark:text-red-400' },
};

const SIGUIENTES_ESTADOS = {
  RECIBIDO:           [{ value: 'EN_DIAGNOSTICO',     label: 'Iniciar diagnóstico' }],
  EN_DIAGNOSTICO:     [
    { value: 'ESPERANDO_REPUESTO', label: 'Esperando repuesto' },
    { value: 'EN_REPARACION',      label: 'Iniciar reparación' },
    { value: 'SIN_REPARACION',     label: 'Sin reparación posible' },
  ],
  ESPERANDO_REPUESTO: [
    { value: 'EN_REPARACION',  label: 'Iniciar reparación' },
    { value: 'SIN_REPARACION', label: 'Sin reparación posible' },
  ],
  EN_REPARACION: [
    { value: 'REPARADO',       label: 'Marcar como reparado' },
    { value: 'SIN_REPARACION', label: 'Sin reparación posible' },
  ],
  REPARADO:       [{ value: 'LISTO_ENTREGA', label: 'Listo para entrega' }],
  LISTO_ENTREGA:  [],
  ENTREGADO:      [],
  SIN_REPARACION: [],
  ANULADO:        [],
};

/* ─── Tokens compartidos ───────────────────────────────────────────────────── */
const CARD     = 'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800';
const TEXTAREA = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors resize-none';
const SELECT   = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors';
const INPUT    = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors';
const LABEL    = 'block text-[10px] font-bold tracking-[0.14em] uppercase text-zinc-400 dark:text-zinc-500 mb-1.5';

/* ─── Sub-componentes ──────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-0.5 h-3.5 rounded-full bg-yellow-400 flex-shrink-0" />
      <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-zinc-400 dark:text-zinc-500">
        {children}
      </span>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const m = ESTADO_META[estado] ?? { label: estado, badge: 'bg-zinc-100 text-zinc-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${m.badge}`}>
      {m.label}
    </span>
  );
}

function Field({ label, value, mono = false, wide = false, pre = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className={wide ? 'col-span-full' : ''}>
      <dt className="text-[10px] font-semibold tracking-wide uppercase text-zinc-400 dark:text-zinc-500 mb-0.5">
        {label}
      </dt>
      <dd className={`text-sm text-zinc-800 dark:text-zinc-200 ${mono ? 'font-mono' : ''} ${pre ? 'whitespace-pre-wrap leading-relaxed' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

/* ─── Modal genérico ───────────────────────────────────────────────────────── */
function Modal({ titulo, onClose, onConfirm, cargando, children, btnLabel = 'Confirmar', btnCls = 'bg-yellow-400 hover:bg-yellow-500 text-zinc-900' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`${CARD} w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-2xl shadow-2xl`}>
        <div className="flex justify-center pt-3 pb-0 sm:hidden">
          <div className="w-8 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="w-0.5 h-4 rounded-full bg-yellow-400 flex-shrink-0" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">{titulo}</h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm">
            ✕
          </button>
        </div>
        <div className="p-5 space-y-4">
          {children}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={onConfirm} disabled={cargando}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${btnCls}`}>
              {cargando && <FaSpinner className="animate-spin" size={11} />}
              {btnLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Componente principal ─────────────────────────────────────────────────── */
export default function ServicioTecnicoDetalle() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { puede } = usePermission();

  const [servicio, setServicio]         = useState(null);
  const [seguimiento, setSeguimiento]   = useState([]);
  const [cargando, setCargando]         = useState(true);
  const [accionando, setAccionando]     = useState(false);
  const [error, setError]               = useState('');

  const [descargando, setDescargando]   = useState(false);
  const [modalEstado, setModalEstado]   = useState(false);
  const [modalEntrega, setModalEntrega] = useState(false);
  const [modalAnular, setModalAnular]   = useState(false);

  const [nuevoEstado, setNuevoEstado]   = useState('');
  const [obsEstado, setObsEstado]       = useState('');
  const [obsEntrega, setObsEntrega]     = useState('');
  const [costoFinal, setCostoFinal]     = useState('');
  const [motivoAnular, setMotivoAnular] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await servicioTecnicoService.getOne(id);
      setServicio(res.data);
      setSeguimiento(res.data.seguimiento ?? []);
      setCostoFinal(res.data.costo_final ?? '0');
    } catch {
      setError('No se pudo cargar la orden');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const puedeCambiarEstado = puede('cambiar_estado', 'servicio_tecnico');
  const puedeEntregar      = puede('entregar',       'servicio_tecnico');
  const puedeAnular        = puede('anular',         'servicio_tecnico');
  const puedeEditar        = puede('editar',         'servicio_tecnico');
  const puedeImprimir      = puede('imprimir',       'servicio_tecnico');

  const confirmarEstado = async () => {
    if (!nuevoEstado) return;
    setAccionando(true); setError('');
    try {
      await servicioTecnicoService.cambiarEstado(id, { estado_nuevo: nuevoEstado, observacion: obsEstado });
      setModalEstado(false); setObsEstado(''); setNuevoEstado('');
      await cargar();
    } catch (e) {
      setError(e.response?.data?.mensaje ?? 'Error al cambiar estado');
    } finally { setAccionando(false); }
  };

  const confirmarEntrega = async () => {
    setAccionando(true); setError('');
    try {
      await servicioTecnicoService.entregar(id, { observacion: obsEntrega, costo_final: costoFinal || undefined });
      setModalEntrega(false); setObsEntrega('');
      await cargar();
    } catch (e) {
      setError(e.response?.data?.mensaje ?? 'Error al registrar entrega');
    } finally { setAccionando(false); }
  };

  const descargarPDF = async () => {
    setDescargando(true); setError('');
    try {
      await exportarReciboPDF(id);
    } catch {
      setError('No se pudo generar el PDF');
    } finally { setDescargando(false); }
  };

  const confirmarAnular = async () => {
    setAccionando(true); setError('');
    try {
      await servicioTecnicoService.anular(id, { motivo: motivoAnular });
      setModalAnular(false); setMotivoAnular('');
      await cargar();
    } catch (e) {
      setError(e.response?.data?.mensaje ?? 'Error al anular');
    } finally { setAccionando(false); }
  };

  /* ── Estados de carga ── */
  if (cargando) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-7 h-7 border-[2.5px] border-zinc-200 border-t-yellow-400 rounded-full animate-spin" />
    </div>
  );

  if (!servicio) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-400">
      <span className="text-4xl">🔍</span>
      <p className="text-sm font-medium">Orden no encontrada</p>
      <button onClick={() => navigate('/servicio-tecnico')}
        className="text-sm text-yellow-600 hover:underline">
        Volver al listado
      </button>
    </div>
  );

  const s             = servicio;
  const estadoCerrado = ['ENTREGADO', 'ANULADO'].includes(s.estado);
  const siguientes    = SIGUIENTES_ESTADOS[s.estado] ?? [];
  const prioMeta      = PRIORIDAD_META[s.prioridad];

  const fmt   = d => d ? new Date(d).toLocaleDateString('es-PY') : null;
  const fmtDt = d => d ? new Date(d).toLocaleString('es-PY') : null;

  return (
    <div className="space-y-4">

      {/* ── Docket header — número de orden estilo ticket de taller ── */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="h-[3px] bg-yellow-400" />
        <div className="p-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => navigate('/servicio-tecnico')}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <FaArrowLeft size={13} />
            </button>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Servicio técnico</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Identidad de la orden */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <span className="text-2xl font-mono font-bold tracking-tight text-zinc-900 dark:text-white">
                  {s.numero}
                </span>
                <EstadoBadge estado={s.estado} />
                {s.prioridad && s.prioridad !== 'NORMAL' && prioMeta && (
                  <span className={`text-xs font-bold uppercase tracking-wide ${prioMeta.color}`}>
                    ↑ {prioMeta.label}
                  </span>
                )}
                {s.garantia && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase tracking-wider">
                    Garantía
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {s.descripcion_producto}
                {s.marca_producto ? ` · ${s.marca_producto}` : ''}
                {s.modelo_producto ? ` ${s.modelo_producto}` : ''}
              </p>
            </div>

            {/* Acciones — jerarquía clara: primaria > secundaria > destructiva */}
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch sm:w-44">
              {puedeCambiarEstado && siguientes.length > 0 && (
                <button onClick={() => { setNuevoEstado(siguientes[0].value); setModalEstado(true); }}
                  className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-xs font-bold text-zinc-900 transition-colors text-center">
                  Cambiar estado
                </button>
              )}
              {puedeEntregar && s.estado === 'LISTO_ENTREGA' && (
                <button onClick={() => setModalEntrega(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-xs font-bold text-white transition-colors text-center">
                  Registrar entrega
                </button>
              )}
              {puedeEditar && !estadoCerrado && (
                <button onClick={() => navigate(`/servicio-tecnico/${id}/editar`)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center">
                  Editar
                </button>
              )}
              {puedeImprimir && (
                <button onClick={() => navigate(`/servicio-tecnico/${id}/imprimir`)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center">
                  Imprimir
                </button>
              )}
              {puedeImprimir && (
                <button onClick={descargarPDF} disabled={descargando}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {descargando && <FaSpinner className="animate-spin" size={10} />}
                  {descargando ? 'Generando…' : 'Descargar PDF'}
                </button>
              )}
              {puedeAnular && !estadoCerrado && (
                <button onClick={() => setModalAnular(true)}
                  className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-900 text-xs font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-center">
                  Anular
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Grid principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Columna principal 2/3 */}
        <div className="lg:col-span-2 space-y-4">

          {/* Equipo */}
          <div className={`${CARD} p-5`}>
            <SectionLabel>Equipo</SectionLabel>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3.5">
              <Field label="Descripción" value={s.descripcion_producto} wide />
              <Field label="Marca"       value={s.marca_producto} />
              <Field label="Modelo"      value={s.modelo_producto} />
              <Field label="N° de serie" value={s.numero_serie} mono />
              <Field label="Color"       value={s.color_producto} />
              <Field label="Tipo"        value={s.tipo_origen === 'CLIENTE' ? 'Del cliente' : 'Inventario'} />
            </dl>
          </div>

          {/* Recepción */}
          <div className={`${CARD} p-5`}>
            <SectionLabel>Recepción</SectionLabel>
            <div className="space-y-3.5">
              {s.falla_reportada && (
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide uppercase text-zinc-400 dark:text-zinc-500 mb-1">
                    Falla reportada
                  </dt>
                  <dd className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {s.falla_reportada}
                  </dd>
                </div>
              )}
              {s.accesorios_recibidos && (
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide uppercase text-zinc-400 dark:text-zinc-500 mb-1">
                    Accesorios recibidos
                  </dt>
                  <dd className="text-sm text-zinc-800 dark:text-zinc-200">{s.accesorios_recibidos}</dd>
                </div>
              )}
              {s.condicion_fisica && (
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide uppercase text-zinc-400 dark:text-zinc-500 mb-1">
                    Condición física
                  </dt>
                  <dd className="text-sm text-zinc-800 dark:text-zinc-200">{s.condicion_fisica}</dd>
                </div>
              )}
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3 pt-3.5 border-t border-zinc-100 dark:border-zinc-800">
                <Field label="Recibido por"      value={s.usuario_recibe_nombre} />
                <Field label="Fecha recepción"   value={fmtDt(s.fecha_recepcion)} />
                <Field label="Sucursal"          value={s.sucursal_nombre} />
                <Field label="Entrega estimada"  value={fmt(s.fecha_estimada_entrega)} />
              </dl>
            </div>
          </div>

          {/* Diagnóstico y reparación */}
          {(s.diagnostico || s.trabajo_realizado || s.repuestos_usados) && (
            <div className={`${CARD} p-5`}>
              <SectionLabel>Diagnóstico y reparación</SectionLabel>
              <div className="space-y-3.5">
                {s.diagnostico && (
                  <div>
                    <dt className="text-[10px] font-semibold tracking-wide uppercase text-zinc-400 dark:text-zinc-500 mb-1">
                      Diagnóstico
                    </dt>
                    <dd className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {s.diagnostico}
                    </dd>
                  </div>
                )}
                {s.trabajo_realizado && (
                  <div>
                    <dt className="text-[10px] font-semibold tracking-wide uppercase text-zinc-400 dark:text-zinc-500 mb-1">
                      Trabajo realizado
                    </dt>
                    <dd className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {s.trabajo_realizado}
                    </dd>
                  </div>
                )}
                {s.repuestos_usados && (
                  <div>
                    <dt className="text-[10px] font-semibold tracking-wide uppercase text-zinc-400 dark:text-zinc-500 mb-1">
                      Repuestos usados
                    </dt>
                    <dd className="text-sm text-zinc-800 dark:text-zinc-200">{s.repuestos_usados}</dd>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline de estados */}
          <div className={`${CARD} p-5`}>
            <SectionLabel>Historial de estados</SectionLabel>
            {seguimiento.length === 0 ? (
              <p className="text-sm text-zinc-400 italic">Sin registros de seguimiento</p>
            ) : (
              <ol className="space-y-0">
                {seguimiento.map((seg, i) => {
                  const isLast = i === seguimiento.length - 1;
                  const em     = ESTADO_META[seg.estado_nuevo] ?? {};
                  return (
                    <li key={seg.id_seguimiento} className="flex gap-3.5">
                      {/* Rail con dot coloreado por estado */}
                      <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${isLast ? 'bg-yellow-400' : (em.dot ?? 'bg-zinc-300 dark:bg-zinc-600')}`} />
                        {!isLast && (
                          <span className="w-px flex-1 min-h-[1.25rem] bg-zinc-150 dark:bg-zinc-800 my-1" style={{ backgroundColor: 'var(--tw-border-opacity, 1)' }} />
                        )}
                      </div>
                      {/* Contenido */}
                      <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
                        <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${em.badge ?? 'bg-zinc-100 text-zinc-600'}`}>
                            {em.label ?? seg.estado_nuevo}
                          </span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">{seg.usuario_nombre}</span>
                          <span className="text-[10px] text-zinc-300 dark:text-zinc-700 font-mono ml-auto tabular-nums">
                            {new Date(seg.fecha).toLocaleString('es-PY')}
                          </span>
                        </div>
                        {seg.observacion && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic mt-0.5">{seg.observacion}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* Sidebar 1/3 */}
        <div className="space-y-4">

          {/* Cliente / Origen */}
          <div className={`${CARD} p-5`}>
            <SectionLabel>{s.tipo_origen === 'CLIENTE' ? 'Cliente' : 'Origen'}</SectionLabel>
            {s.cliente_nombre ? (
              <dl className="space-y-3">
                <Field label="Nombre"   value={s.cliente_nombre} />
                <Field label="CI / RUC" value={s.cliente_ci_ruc} mono />
                <Field label="Teléfono" value={s.cliente_telefono} />
              </dl>
            ) : (
              <p className="text-sm text-zinc-400 italic">Equipo de inventario propio</p>
            )}
          </div>

          {/* Técnico externo */}
          <div className={`${CARD} p-5`}>
            <SectionLabel>Técnico externo</SectionLabel>
            {s.tecnico_nombre ? (
              <dl className="space-y-3">
                <Field label="Taller / técnico" value={s.tecnico_nombre} />
                <Field label="Teléfono"         value={s.tecnico_telefono} />
                <Field label="Fecha de envío"   value={fmt(s.fecha_envio_tecnico)} />
              </dl>
            ) : (
              <p className="text-sm text-zinc-400 italic">Sin técnico externo asignado</p>
            )}
          </div>

          {/* Costos */}
          {s.costo_estimado !== undefined && (
            <div className={`${CARD} p-5`}>
              <SectionLabel>Costos</SectionLabel>
              <dl className="space-y-3">
                <Field
                  label="Estimado"
                  value={s.costo_estimado != null ? `Gs. ${Number(s.costo_estimado).toLocaleString('es-PY')}` : null}
                  mono />
                <Field
                  label="Final"
                  value={s.costo_final != null && Number(s.costo_final) > 0 ? `Gs. ${Number(s.costo_final).toLocaleString('es-PY')}` : null}
                  mono />
              </dl>
            </div>
          )}

          {/* Cierre */}
          {s.fecha_real_entrega && (
            <div className={`${CARD} p-5`}>
              <SectionLabel>Cierre</SectionLabel>
              <dl className="space-y-3">
                <Field label="Fecha de entrega" value={fmtDt(s.fecha_real_entrega)} />
                <Field label="Cerrado por"      value={s.usuario_cierre_nombre} />
              </dl>
            </div>
          )}

          {/* Observaciones */}
          {s.observaciones && (
            <div className={`${CARD} p-5`}>
              <SectionLabel>Observaciones</SectionLabel>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {s.observaciones}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: cambiar estado ── */}
      {modalEstado && (
        <Modal
          titulo="Cambiar estado"
          onClose={() => { setModalEstado(false); setObsEstado(''); }}
          onConfirm={confirmarEstado}
          cargando={accionando}
          btnLabel="Confirmar cambio"
        >
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Nuevo estado</label>
              <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)} className={SELECT}>
                {siguientes.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>
                Observación <span className="normal-case font-normal text-zinc-400">(opcional)</span>
              </label>
              <textarea value={obsEstado} onChange={e => setObsEstado(e.target.value)}
                rows={3} placeholder="Detalles del cambio de estado…" className={TEXTAREA} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: registrar entrega ── */}
      {modalEntrega && (
        <Modal
          titulo="Registrar entrega al cliente"
          onClose={() => { setModalEntrega(false); setObsEntrega(''); }}
          onConfirm={confirmarEntrega}
          cargando={accionando}
          btnLabel="Registrar entrega"
          btnCls="bg-indigo-500 hover:bg-indigo-600 text-white"
        >
          <div className="space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Esto cierra la orden y registra la fecha real de entrega.
            </p>
            <div>
              <label className={LABEL}>Costo final (Gs.)</label>
              <input type="number" min="0" step="1000" value={costoFinal}
                onChange={e => setCostoFinal(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>
                Observación <span className="normal-case font-normal text-zinc-400">(opcional)</span>
              </label>
              <textarea value={obsEntrega} onChange={e => setObsEntrega(e.target.value)}
                rows={2} placeholder="Notas de la entrega…" className={TEXTAREA} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: anular ── */}
      {modalAnular && (
        <Modal
          titulo="Anular orden"
          onClose={() => { setModalAnular(false); setMotivoAnular(''); }}
          onConfirm={confirmarAnular}
          cargando={accionando}
          btnLabel="Anular orden"
          btnCls="bg-red-500 hover:bg-red-600 text-white"
        >
          <div className="space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              La orden quedará marcada como anulada. Esta acción no se puede deshacer.
            </p>
            <div>
              <label className={LABEL}>Motivo de anulación</label>
              <textarea value={motivoAnular} onChange={e => setMotivoAnular(e.target.value)}
                rows={3} placeholder="Indique el motivo de la anulación…" className={TEXTAREA} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
