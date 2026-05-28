import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cajaService } from '../../services/caja.service';
import { sucursalesService } from '../../services/configuracion.service';
import { usePermission } from '../../hooks/usePermission';

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const fmtFecha = (f) =>
  f ? new Date(f).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// ── Modal: Abrir turno ────────────────────────────────────────────────────
function ModalAbrirCaja({ caja, onClose, onSuccess }) {
  const [monto, setMonto]   = useState('0');
  const [cargando, setCargando] = useState(false);
  const [error, setError]   = useState('');

  const handleAbrir = async () => {
    setError('');
    setCargando(true);
    try {
      await cajaService.abrirCaja(caja.id_caja, { monto_apertura: monto });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.mensaje ?? 'Error al abrir caja');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Abrir turno</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{caja.nombre} — {caja.sucursal}</p>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
            Monto de apertura (Bs)
          </label>
          <input
            type="number" min={0} step="0.01" value={monto}
            onChange={e => setMonto(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            autoFocus
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Efectivo con que inicia el turno</p>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={handleAbrir} disabled={cargando}
            className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors">
            {cargando ? 'Abriendo…' : 'Abrir caja'}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Crear/Editar caja ──────────────────────────────────────────────
function ModalCaja({ caja, onClose, onSuccess }) {
  const editando = Boolean(caja?.id_caja);
  const [sucursales, setSucursales] = useState([]);
  const [form, setForm] = useState({
    id_sucursal: caja?.id_sucursal ?? '',
    nombre:      caja?.nombre      ?? '',
    activo:      caja?.activo      ?? 1,
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    sucursalesService.getAll().then(r => setSucursales(r.data.sucursales ?? [])).catch(() => {});
  }, []);

  const handleGuardar = async () => {
    setError('');
    if (!form.id_sucursal || !form.nombre.trim()) {
      return setError('Sucursal y nombre son requeridos');
    }
    setCargando(true);
    try {
      if (editando) {
        await cajaService.updateCaja(caja.id_caja, form);
      } else {
        await cajaService.crearCaja(form);
      }
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.mensaje ?? 'Error al guardar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
          {editando ? 'Editar caja' : 'Nueva caja'}
        </h2>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Sucursal *</label>
            <select
              value={form.id_sucursal}
              onChange={e => setForm(f => ({ ...f, id_sucursal: e.target.value }))}
              disabled={editando}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-60"
            >
              <option value="">Seleccionar…</option>
              {sucursales.map(s => (
                <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Nombre *</label>
            <input
              type="text" value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Caja Principal"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              autoFocus
            />
          </div>
          {editando && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox" id="activo" checked={Boolean(form.activo)}
                onChange={e => setForm(f => ({ ...f, activo: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 rounded accent-yellow-400"
              />
              <label htmlFor="activo" className="text-sm text-zinc-700 dark:text-zinc-300">Activa</label>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={handleGuardar} disabled={cargando}
            className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors">
            {cargando ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de caja ───────────────────────────────────────────────────────
function TarjetaCaja({ caja, puedoAbrir, puedoGestionar, onAbrir, onEditar }) {
  const abierta = Boolean(caja.id_arqueo);
  const minutosAbierta = abierta
    ? Math.floor((Date.now() - new Date(caja.fecha_apertura)) / 60000)
    : null;

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border ${abierta ? 'border-green-400 dark:border-green-600' : 'border-zinc-200 dark:border-zinc-800'} p-5 space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-zinc-900 dark:text-white">{caja.nombre}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{caja.sucursal}</p>
        </div>
        <div className="flex items-center gap-2">
          {puedoGestionar && (
            <button onClick={() => onEditar(caja)}
              className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
              ✏️
            </button>
          )}
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
            abierta
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
          }`}>
            {abierta ? 'ABIERTA' : 'CERRADA'}
          </span>
        </div>
      </div>

      {abierta ? (
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Cajero</span>
            <span className="font-medium text-zinc-900 dark:text-white">{caja.usuario_turno}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Apertura</span>
            <span className="font-medium text-zinc-900 dark:text-white">{fmtFecha(caja.fecha_apertura)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Monto inicial</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-white">Bs {fmt(caja.monto_apertura)}</span>
          </div>
          {minutosAbierta !== null && (
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Tiempo abierta</span>
              <span className="text-zinc-600 dark:text-zinc-300">
                {minutosAbierta >= 60
                  ? `${Math.floor(minutosAbierta / 60)}h ${minutosAbierta % 60}m`
                  : `${minutosAbierta}m`}
              </span>
            </div>
          )}
          <Link
            to={`/caja/arqueos/${caja.id_arqueo}`}
            className="block mt-2 text-center py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Ver arqueo
          </Link>
        </div>
      ) : (
        <div className="text-sm text-zinc-400 dark:text-zinc-500">Sin turno activo</div>
      )}

      {!abierta && puedoAbrir && (
        <button onClick={() => onAbrir(caja)}
          className="w-full py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors">
          Abrir turno
        </button>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function Caja() {
  const { puede } = usePermission();
  const puedoAbrir           = puede('abrir', 'caja');
  const puedoGestionar       = puede('gestionar', 'caja');
  const puedoVerTodosArqueos = puede('ver_arqueo_todos', 'caja');

  const [cajas,   setCajas]   = useState([]);
  const [arqueos, setArqueos] = useState([]);
  const [cargandoCajas,   setCargandoCajas]   = useState(true);
  const [cargandoArqueos, setCargandoArqueos] = useState(true);
  const [modalAbrir, setModalAbrir] = useState(null);
  const [modalCaja,  setModalCaja]  = useState(null); // null | {} (nueva) | caja (editar)

  const [filtros, setFiltros] = useState({
    id_caja:     '',
    estado:      '',
    fecha_desde: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    fecha_hasta: new Date().toISOString().slice(0, 10),
  });

  const cargarCajas = () => {
    setCargandoCajas(true);
    cajaService.getCajas()
      .then(r => setCajas(r.data.cajas ?? []))
      .catch(() => {})
      .finally(() => setCargandoCajas(false));
  };

  const cargarArqueos = () => {
    setCargandoArqueos(true);
    cajaService.getArqueos(filtros)
      .then(r => setArqueos(r.data.arqueos ?? []))
      .catch(() => {})
      .finally(() => setCargandoArqueos(false));
  };

  useEffect(() => { cargarCajas(); }, []);
  useEffect(() => { cargarArqueos(); }, [filtros]);

  const handleSuccess = () => {
    setModalAbrir(null);
    setModalCaja(null);
    cargarCajas();
    cargarArqueos();
  };

  const estadoBadge = (estado) => {
    const cls = estado === 'ABIERTA'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{estado}</span>;
  };

  const difColor = (dif) => {
    const v = Number(dif ?? 0);
    if (v > 0) return 'text-green-600 dark:text-green-400';
    if (v < 0) return 'text-red-500 dark:text-red-400';
    return 'text-zinc-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Caja</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Apertura y cierre de turnos</p>
        </div>
        {puedoGestionar && (
          <button
            onClick={() => setModalCaja({})}
            className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
          >
            + Nueva caja
          </button>
        )}
      </div>

      {/* Estado de cajas */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
          Estado de cajas
        </h2>
        {cargandoCajas ? (
          <div className="text-center py-10 text-zinc-400">Cargando…</div>
        ) : cajas.length === 0 ? (
          <div className="text-center py-10 text-zinc-400">
            No hay cajas configuradas.{' '}
            {puedoGestionar && (
              <button onClick={() => setModalCaja({})} className="text-yellow-500 hover:underline">
                Crear una nueva
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cajas.map(c => (
              <TarjetaCaja
                key={c.id_caja}
                caja={c}
                puedoAbrir={puedoAbrir}
                puedoGestionar={puedoGestionar}
                onAbrir={setModalAbrir}
                onEditar={setModalCaja}
              />
            ))}
          </div>
        )}
      </div>

      {/* Historial de arqueos */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Historial de arqueos</h2>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Caja</label>
              <select
                value={filtros.id_caja}
                onChange={e => setFiltros(f => ({ ...f, id_caja: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
              >
                <option value="">Todas</option>
                {cajas.map(c => <option key={c.id_caja} value={c.id_caja}>{c.nombre} — {c.sucursal}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Estado</label>
              <select
                value={filtros.estado}
                onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
              >
                <option value="">Todos</option>
                <option value="ABIERTA">Abierta</option>
                <option value="CERRADA">Cerrada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Desde</label>
              <input
                type="date" value={filtros.fecha_desde}
                onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Hasta</label>
              <input
                type="date" value={filtros.fecha_hasta}
                onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
            </div>
          </div>
        </div>

        {cargandoArqueos ? (
          <div className="py-12 text-center text-zinc-400">Cargando…</div>
        ) : arqueos.length === 0 ? (
          <div className="py-12 text-center text-zinc-400">Sin arqueos en el período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Caja / Sucursal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">Cajero</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Apertura</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">Cierre</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Apertura Bs</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">Sistema Bs</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">Real Bs</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Diferencia</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {arqueos.map(aq => (
                  <tr key={aq.id_arqueo} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900 dark:text-white">{aq.caja}</p>
                      <p className="text-xs text-zinc-400">{aq.sucursal}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 hidden sm:table-cell">{aq.usuario}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs hidden md:table-cell">{fmtFecha(aq.fecha_apertura)}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs hidden lg:table-cell">{fmtFecha(aq.fecha_cierre)}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300 hidden md:table-cell">{fmt(aq.monto_apertura)}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300 hidden lg:table-cell">
                      {aq.monto_cierre_sistema != null ? fmt(aq.monto_cierre_sistema) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300 hidden lg:table-cell">
                      {aq.monto_cierre_real != null ? fmt(aq.monto_cierre_real) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${difColor(aq.diferencia)}`}>
                      {aq.diferencia != null
                        ? `${Number(aq.diferencia) >= 0 ? '+' : ''}${fmt(aq.diferencia)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">{estadoBadge(aq.estado)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/caja/arqueos/${aq.id_arqueo}`}
                        className="text-xs font-medium text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbrir && (
        <ModalAbrirCaja
          caja={modalAbrir}
          onClose={() => setModalAbrir(null)}
          onSuccess={handleSuccess}
        />
      )}
      {modalCaja !== null && (
        <ModalCaja
          caja={modalCaja?.id_caja ? modalCaja : null}
          onClose={() => setModalCaja(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
