import { useState, useEffect, useCallback } from 'react';
import { auditoriaService } from '../../services/auditoria.service';
import { exportarCSV }      from '../../utils/exportCsv';
import { useAuth }          from '../../contexts/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────
const hoy      = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

// ── Colores por acción ────────────────────────────────────────────────────
const ACCION_COLOR = {
  INSERT:         'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  UPDATE:         'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  DELETE:         'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  LOGIN:          'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  LOGOUT:         'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400',
  OTRO:           'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  FORZAR_CIERRE:  'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  RESET_PASSWORD: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  CERRAR_SESIONES:'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

function AccionBadge({ accion }) {
  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${ACCION_COLOR[accion] || ACCION_COLOR.OTRO}`}>
      {accion}
    </span>
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

// ── TAB: Auditoría ────────────────────────────────────────────────────────
function TabAuditoria() {
  const [filas, setFilas]         = useState([]);
  const [tablas, setTablas]       = useState([]);
  const [usuarios, setUsuarios]   = useState([]);
  const [cargando, setCargando]   = useState(false);
  const [filtros, setFiltros]     = useState({
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

  const colsExport = [
    { key: 'fecha',       label: 'Fecha' },
    { key: 'usuario',     label: 'Usuario' },
    { key: 'username',    label: 'Username' },
    { key: 'accion',      label: 'Acción' },
    { key: 'tabla',       label: 'Tabla' },
    { key: 'id_registro', label: 'ID Registro' },
    { key: 'ip_origen',   label: 'IP' },
  ];

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Desde</label>
          <input type="date" value={filtros.fecha_desde} onChange={e => f('fecha_desde', e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400" />
        </div>
        <div>
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Hasta</label>
          <input type="date" value={filtros.fecha_hasta} onChange={e => f('fecha_hasta', e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400" />
        </div>
        <div>
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Usuario</label>
          <select value={filtros.id_usuario} onChange={e => f('id_usuario', e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400">
            <option value="">Todos</option>
            {usuarios.map(u => (
              <option key={u.id_usuario} value={u.id_usuario}>{u.nombre} ({u.username})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Tabla</label>
          <select value={filtros.tabla} onChange={e => f('tabla', e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400">
            <option value="">Todas</option>
            {tablas.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Acción</label>
          <select value={filtros.accion} onChange={e => f('accion', e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400">
            <option value="">Todas</option>
            {ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button onClick={buscar}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">
          Consultar
        </button>
        <button onClick={() => exportarCSV(filas, 'auditoria', colsExport)}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition-colors">
          ↓ CSV
        </button>
      </div>

      {/* Contador */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500 px-1">
        {cargando ? 'Cargando...' : `${filas.length.toLocaleString('es-BO')} registros${filas.length >= 500 ? ' (máximo 500 — afine los filtros)' : ''}`}
      </p>

      {/* Tabla */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filas.length === 0 ? (
        <p className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-sm">Sin registros en este período</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Fecha', 'Usuario', 'Acción', 'Tabla', 'ID', 'Antes', 'Después', 'IP'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-left whitespace-nowrap">{h}</th>
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
                  <td className="px-3 py-2.5 max-w-xs"><JsonCell value={row.datos_antes} /></td>
                  <td className="px-3 py-2.5 max-w-xs"><JsonCell value={row.datos_despues} /></td>
                  <td className="px-3 py-2.5 text-xs font-mono text-zinc-400 whitespace-nowrap">{row.ip_origen || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

  const colsExport = [
    { key: 'usuario',          label: 'Usuario' },
    { key: 'username',         label: 'Username' },
    { key: 'rol',              label: 'Rol' },
    { key: 'fecha_inicio',     label: 'Inicio' },
    { key: 'fecha_expiracion', label: 'Expiración' },
    { key: 'ip_origen',        label: 'IP' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {cargando ? 'Cargando...' : `${sesiones.length} sesión(es) activa(s)`}
        </p>
        <div className="flex gap-2">
          <button onClick={cargar}
            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm rounded-xl transition-colors">
            ↻ Actualizar
          </button>
          <button onClick={() => exportarCSV(sesiones, 'sesiones_activas', colsExport)}
            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition-colors">
            ↓ CSV
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sesiones.length === 0 ? (
        <p className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-sm">No hay sesiones activas</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Usuario', 'Rol', 'Inicio', 'Expira', 'IP', 'Acción'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-left whitespace-nowrap">{h}</th>
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
                    <td className="px-3 py-2.5 text-xs font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{s.fecha_inicio}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-zinc-400 whitespace-nowrap">{s.fecha_expiracion}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-zinc-400">{s.ip_origen || '—'}</td>
                    <td className="px-3 py-2.5">
                      {esPropia ? (
                        <span className="text-xs text-zinc-300 dark:text-zinc-600">Sesión actual</span>
                      ) : confirmId === s.id_sesion ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">¿Confirmar?</span>
                          <button onClick={() => cerrar(s.id_sesion)} disabled={cerrando === s.id_sesion}
                            className="px-2 py-1 bg-red-500 hover:bg-red-400 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                            {cerrando === s.id_sesion ? '...' : 'Sí'}
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
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function Auditoria() {
  const [tab, setTab] = useState('auditoria');

  const TABS = [
    { id: 'auditoria', label: 'Log de auditoría', icono: '🔍' },
    { id: 'sesiones',  label: 'Sesiones activas', icono: '🔐' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Auditoría</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Registro de acciones y sesiones del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === t.id
                ? 'bg-yellow-400 text-zinc-900 shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}>
            <span>{t.icono}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
        {tab === 'auditoria' ? <TabAuditoria /> : <TabSesiones />}
      </div>
    </div>
  );
}
