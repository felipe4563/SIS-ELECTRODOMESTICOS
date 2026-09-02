import { useState, useEffect, useCallback } from 'react';
import { auditoriaService } from '../../services/auditoria.service';
import { useAuth }          from '../../contexts/AuthContext';

const hoy      = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const INPUT = 'w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400';
const LABEL = 'text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1';

const ACCION_COLOR = {
  INSERT:          'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  UPDATE:          'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  DELETE:          'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  LOGIN:           'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  LOGOUT:          'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400',
  OTRO:            'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  FORZAR_CIERRE:   'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  RESET_PASSWORD:  'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  CERRAR_SESIONES: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

function AccionBadge({ accion }) {
  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${ACCION_COLOR[accion] || ACCION_COLOR.OTRO}`}>
      {accion}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Celda expandible para JSON ────────────────────────────────────────────
function JsonCell({ value }) {
  const [open, setOpen] = useState(false);
  if (!value) return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
  let parsed;
  try { parsed = JSON.parse(value); } catch { parsed = value; }
  const preview = typeof parsed === 'object'
    ? Object.entries(parsed).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ') + (Object.keys(parsed).length > 2 ? '…' : '')
    : String(parsed).slice(0, 40);
  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className="text-xs text-blue-500 dark:text-blue-400 hover:underline text-left">
        {open ? '▲ ocultar' : `▶ ${preview}`}
      </button>
      {open && (
        <pre className="mt-1 p-2 bg-zinc-50 dark:bg-zinc-800 rounded text-[10px] text-zinc-600 dark:text-zinc-400 max-h-32 overflow-auto whitespace-pre-wrap">
          {typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed)}
        </pre>
      )}
    </div>
  );
}

// ── Diff antes/después ────────────────────────────────────────────────────
function DiffTable({ antes, despues }) {
  let a = null, d = null;
  try { a = antes   ? JSON.parse(antes)   : null; } catch { a = antes; }
  try { d = despues ? JSON.parse(despues) : null; } catch { d = despues; }

  if (!a && !d) return <p className="text-sm text-zinc-400 py-2">Sin datos registrados.</p>;

  if (typeof a === 'object' && typeof d === 'object' && (a || d)) {
    const keys    = [...new Set([...Object.keys(a || {}), ...Object.keys(d || {})])];
    const changed = keys.filter(k => JSON.stringify(a?.[k]) !== JSON.stringify(d?.[k]));
    const same    = keys.filter(k => !changed.includes(k));
    return (
      <div className="overflow-x-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-semibold w-1/4">Campo</th>
              <th className="text-left px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold">Antes</th>
              <th className="text-left px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-semibold">Después</th>
            </tr>
          </thead>
          <tbody>
            {[...changed, ...same].map(k => {
              const isChanged = changed.includes(k);
              const vA = a?.[k] ?? null;
              const vD = d?.[k] ?? null;
              return (
                <tr key={k} className={isChanged ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}>
                  <td className={`px-3 py-1.5 font-mono border-t border-zinc-100 dark:border-zinc-800 ${isChanged ? 'font-bold text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    {isChanged && <span className="mr-1 text-yellow-500">●</span>}{k}
                  </td>
                  <td className={`px-3 py-1.5 font-mono border-t border-zinc-100 dark:border-zinc-800 break-all ${isChanged ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    {vA === null ? <em className="text-zinc-300">null</em> : String(vA)}
                  </td>
                  <td className={`px-3 py-1.5 font-mono border-t border-zinc-100 dark:border-zinc-800 break-all ${isChanged ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    {vD === null ? <em className="text-zinc-300">null</em> : String(vD)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Antes</p>
        <pre className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl p-3 overflow-auto max-h-52 whitespace-pre-wrap break-all">
          {a ? JSON.stringify(a, null, 2) : <em className="text-zinc-400">vacío</em>}
        </pre>
      </div>
      <div>
        <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Después</p>
        <pre className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl p-3 overflow-auto max-h-52 whitespace-pre-wrap break-all">
          {d ? JSON.stringify(d, null, 2) : <em className="text-zinc-400">vacío</em>}
        </pre>
      </div>
    </div>
  );
}

// ── Modal detalle ─────────────────────────────────────────────────────────
function ModalDetalle({ row, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Detalle de auditoría</h2>
            <p className="text-xs text-zinc-400 mt-0.5">#{row.id_auditoria}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-lg leading-none">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Fecha',     value: row.fecha },
              { label: 'Usuario',   value: row.usuario || row.username || '—' },
              { label: 'Acción',    accion: row.accion },
              { label: 'Tabla',     value: row.tabla },
              { label: 'ID Reg.',   value: row.id_registro || '—' },
              { label: 'IP Origen', value: row.ip_origen  || '—' },
            ].map(({ label, value, accion }) => (
              <div key={label} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2.5">
                <p className="text-xs text-zinc-400 mb-1">{label}</p>
                {accion
                  ? <AccionBadge accion={accion} />
                  : <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 break-all">{value}</p>}
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Cambios registrados</h3>
            <DiffTable antes={row.datos_antes} despues={row.datos_despues} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB: Log de auditoría ─────────────────────────────────────────────────
function TabAuditoria() {
  const [filas, setFilas]           = useState([]);
  const [tablas, setTablas]         = useState([]);
  const [usuarios, setUsuarios]     = useState([]);
  const [cargando, setCargando]     = useState(false);
  const [detalleRow, setDetalleRow] = useState(null);
  const [filtros, setFiltros]       = useState({
    fecha_desde: inicioMes(),
    fecha_hasta: hoy(),
    id_usuario:  '',
    tabla:       '',
    accion:      '',
  });

  useEffect(() => {
    auditoriaService.getTablas().then(r => setTablas(r.data));
    auditoriaService.getUsuarios().then(r => setUsuarios(r.data));
  }, []);

  const buscar = useCallback(() => {
    setCargando(true);
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''));
    auditoriaService.getAuditoria(params)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);

  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const ACCIONES = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'OTRO'];

  return (
    <div className="space-y-4">
      {detalleRow && <ModalDetalle row={detalleRow} onClose={() => setDetalleRow(null)} />}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-full sm:w-36">
          <label className={LABEL}>Desde</label>
          <input type="date" value={filtros.fecha_desde} onChange={e => f('fecha_desde', e.target.value)} className={INPUT} />
        </div>
        <div className="w-full sm:w-36">
          <label className={LABEL}>Hasta</label>
          <input type="date" value={filtros.fecha_hasta} onChange={e => f('fecha_hasta', e.target.value)} className={INPUT} />
        </div>
        <div className="w-full sm:w-48">
          <label className={LABEL}>Usuario</label>
          <select value={filtros.id_usuario} onChange={e => f('id_usuario', e.target.value)} className={INPUT}>
            <option value="">Todos</option>
            {usuarios.map(u => (
              <option key={u.id_usuario} value={u.id_usuario}>{u.nombre} ({u.username})</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label className={LABEL}>Tabla</label>
          <select value={filtros.tabla} onChange={e => f('tabla', e.target.value)} className={INPUT}>
            <option value="">Todas</option>
            {tablas.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-36">
          <label className={LABEL}>Acción</label>
          <select value={filtros.accion} onChange={e => f('accion', e.target.value)} className={INPUT}>
            <option value="">Todas</option>
            {ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button onClick={buscar}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">
          Consultar
        </button>
      </div>

      {/* Contador */}
      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-zinc-400 dark:text-zinc-500">Registros:</span>
          <span className="font-semibold text-zinc-900 dark:text-white">{cargando ? '…' : filas.length.toLocaleString('es-BO')}</span>
        </div>
        {!cargando && filas.length >= 500 && (
          <span className="text-xs text-orange-500 dark:text-orange-400">Límite 500 — afine los filtros</span>
        )}
      </div>

      {/* Contenido */}
      {cargando ? <Spinner /> : filas.length === 0 ? (
        <p className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">Sin registros en este período</p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="grid gap-3 md:hidden">
            {filas.map(row => (
              <div key={row.id_auditoria} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <AccionBadge accion={row.accion} />
                  <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 shrink-0">{row.fecha}</span>
                </div>
                <div className="space-y-1.5 text-xs mb-3">
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-400 shrink-0">Usuario</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 text-right">
                      {row.usuario || '—'}
                      {row.username && <span className="text-zinc-400 ml-1">({row.username})</span>}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-400 shrink-0">Tabla</span>
                    <span className="font-mono font-medium text-zinc-600 dark:text-zinc-400">{row.tabla}</span>
                  </div>
                  {row.id_registro && (
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-400 shrink-0">ID</span>
                      <span className="font-mono text-zinc-500">{row.id_registro}</span>
                    </div>
                  )}
                  {row.ip_origen && (
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-400 shrink-0">IP</span>
                      <span className="font-mono text-zinc-500">{row.ip_origen}</span>
                    </div>
                  )}
                </div>
                <button onClick={() => setDetalleRow(row)}
                  className="w-full py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors">
                  Ver detalle
                </button>
              </div>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  {['Fecha', 'Usuario', 'Acción', 'Tabla', 'ID', 'IP', ''].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filas.map(row => (
                  <tr key={row.id_auditoria} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-3 py-2.5 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap font-mono">{row.fecha}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{row.usuario || '—'}</div>
                      {row.username && <div className="text-xs text-zinc-400">{row.username}</div>}
                    </td>
                    <td className="px-3 py-2.5"><AccionBadge accion={row.accion} /></td>
                    <td className="px-3 py-2.5 text-xs font-mono text-zinc-600 dark:text-zinc-400">{row.tabla}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-zinc-400">{row.id_registro || '—'}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-zinc-400 whitespace-nowrap hidden lg:table-cell">{row.ip_origen || '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => setDetalleRow(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors">
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── TAB: Sesiones activas ─────────────────────────────────────────────────
function TabSesiones() {
  const { usuario } = useAuth();
  const [sesiones, setSesiones]   = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [cerrando, setCerrando]   = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const cargar = () => {
    setCargando(true);
    auditoriaService.getSesiones()
      .then(r => { setSesiones(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const cerrar = async (id) => {
    setCerrando(id);
    try {
      await auditoriaService.cerrarSesion(id);
      setSesiones(prev => prev.filter(s => s.id_sesion !== id));
    } catch (e) {
      alert(e.response?.data?.error || 'Error al cerrar sesión');
    } finally {
      setCerrando(null);
      setConfirmId(null);
    }
  };

  const parseBrowser = (ua) => {
    if (!ua) return '—';
    if (/Edg/i.test(ua))                             return 'Edge';
    if (/Chrome/i.test(ua))                           return 'Chrome';
    if (/Firefox/i.test(ua))                          return 'Firefox';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua))   return 'Safari';
    return ua.slice(0, 20);
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-5 gap-y-2 flex-wrap bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-zinc-400 dark:text-zinc-500">Activas:</span>
            <span className="font-semibold text-zinc-900 dark:text-white">
              {cargando ? '…' : sesiones.length}
            </span>
          </div>
        </div>
        <button onClick={cargar}
          className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm rounded-xl transition-colors border border-zinc-200 dark:border-zinc-700">
          ↻ Actualizar
        </button>
      </div>

      {/* Contenido */}
      {cargando ? <Spinner /> : sesiones.length === 0 ? (
        <p className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">No hay sesiones activas</p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="grid gap-3 md:hidden">
            {sesiones.map(s => {
              const esPropia = s.id_usuario === usuario?.id;
              return (
                <div key={s.id_sesion} className={`bg-white dark:bg-zinc-800 rounded-xl border p-4 ${esPropia ? 'border-yellow-400/50 dark:border-yellow-400/30' : 'border-zinc-200 dark:border-zinc-700'}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-white">{s.usuario}</span>
                        {esPropia && (
                          <span className="text-[10px] bg-yellow-400 text-zinc-900 px-1.5 py-0.5 rounded-full font-bold">Yo</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">@{s.username}</p>
                    </div>
                    <span className="text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-lg font-medium">{s.rol}</span>
                  </div>
                  <div className="space-y-1.5 text-xs mb-3">
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-400">IP</span>
                      <span className="font-mono text-zinc-600 dark:text-zinc-400">{s.ip_origen || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-400">Navegador</span>
                      <span className="text-zinc-600 dark:text-zinc-400">{parseBrowser(s.user_agent)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-400">Inicio</span>
                      <span className="font-mono text-zinc-600 dark:text-zinc-400">{s.fecha_inicio}</span>
                    </div>
                  </div>
                  {esPropia ? (
                    <p className="text-xs text-center text-zinc-400 dark:text-zinc-500">Sesión actual</p>
                  ) : confirmId === s.id_sesion ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-zinc-500">¿Confirmar cierre?</span>
                      <button onClick={() => cerrar(s.id_sesion)} disabled={cerrando === s.id_sesion}
                        className="px-3 py-1 bg-red-500 hover:bg-red-400 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                        {cerrando === s.id_sesion ? '…' : 'Sí, cerrar'}
                      </button>
                      <button onClick={() => setConfirmId(null)}
                        className="px-3 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs rounded-lg transition-colors">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(s.id_sesion)}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 transition-colors">
                      Cerrar sesión
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  {['Usuario', 'Rol', 'IP', 'Navegador', 'Inicio', 'Expira', 'Acción'].map(h => (
                    <th key={h} className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-left whitespace-nowrap ${h === 'Navegador' ? 'hidden lg:table-cell' : ''} ${h === 'Expira' ? 'hidden sm:table-cell' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sesiones.map(s => {
                  const esPropia = s.id_usuario === usuario?.id;
                  return (
                    <tr key={s.id_sesion} className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${esPropia ? 'bg-yellow-50/50 dark:bg-yellow-400/5' : ''}`}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-zinc-800 dark:text-zinc-200">
                          {s.usuario}
                          {esPropia && <span className="ml-2 text-[10px] bg-yellow-400 text-zinc-900 px-1.5 py-0.5 rounded-full font-bold">Yo</span>}
                        </div>
                        <div className="text-xs text-zinc-400">{s.username}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">{s.rol}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-zinc-400">{s.ip_origen || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-400 hidden lg:table-cell">{parseBrowser(s.user_agent)}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{s.fecha_inicio}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-zinc-400 whitespace-nowrap hidden sm:table-cell">{s.fecha_expiracion}</td>
                      <td className="px-3 py-2.5">
                        {esPropia ? (
                          <span className="text-xs text-zinc-300 dark:text-zinc-600">Sesión actual</span>
                        ) : confirmId === s.id_sesion ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">¿Confirmar?</span>
                            <button onClick={() => cerrar(s.id_sesion)} disabled={cerrando === s.id_sesion}
                              className="px-2 py-1 bg-red-500 hover:bg-red-400 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                              {cerrando === s.id_sesion ? '…' : 'Sí'}
                            </button>
                            <button onClick={() => setConfirmId(null)}
                              className="px-2 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs rounded-lg transition-colors">
                              No
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmId(s.id_sesion)}
                            className="px-3 py-1 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-500/20 transition-colors">
                            Cerrar sesión
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
const TABS = [
  { key: 'log',      label: 'Log de auditoría',  desc: 'Historial de cambios (INSERT/UPDATE/DELETE) y accesos' },
  { key: 'sesiones', label: 'Sesiones activas',   desc: 'Sesiones abiertas del sistema' },
];

export default function Auditoria() {
  const [tab, setTab] = useState('log');
  const activa = TABS.find(t => t.key === tab);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Auditoría</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{activa.desc}</p>
      </div>

      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? 'border-yellow-400 text-zinc-900 dark:text-white'
                : 'border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
        {tab === 'log' ? <TabAuditoria /> : <TabSesiones />}
      </div>
    </div>
  );
}
