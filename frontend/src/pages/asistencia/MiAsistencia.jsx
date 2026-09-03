import { useState, useEffect } from 'react';
import { asistenciaService } from '../../services/asistencia.service';

const ESTADO_LABEL = {
  PRESENTE:    'A tiempo',
  TARDANZA:    'Con tardanza',
  FALTA:       'Falta',
  JUSTIFICADA: 'Justificada',
};

const ESTADO_COLOR = {
  PRESENTE:    'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  TARDANZA:    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  FALTA:       'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  JUSTIFICADA: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
};

function EstadoBadge({ estado }) {
  if (!estado) return null;
  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${ESTADO_COLOR[estado] || ''}`}>
      {ESTADO_LABEL[estado] || estado}
    </span>
  );
}

function obtenerUbicacion() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Este navegador no soporta geolocalización'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('No se pudo obtener tu ubicación. Revisá los permisos del navegador.'))
    );
  });
}

const formatearFecha = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' });

export default function MiAsistencia() {
  const [hoy, setHoy]                 = useState(null);
  const [historial, setHistorial]     = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [marcando, setMarcando]       = useState(false);
  const [error, setError]             = useState(null);
  const [errorCarga, setErrorCarga]   = useState(null);

  const cargar = () => {
    setCargando(true);
    setErrorCarga(null);
    Promise.all([asistenciaService.getHoy(), asistenciaService.getMiHistorial(7)])
      .then(([rHoy, rHist]) => {
        setHoy(rHoy.data.asistencia);
        setHistorial(rHist.data.historial);
      })
      .catch(() => setErrorCarga('No se pudo cargar tu asistencia'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const marcar = async (tipo) => {
    setError(null);
    setMarcando(true);
    try {
      const coords = await obtenerUbicacion();
      if (tipo === 'entrada') await asistenciaService.marcarEntrada(coords);
      else await asistenciaService.marcarSalida(coords);
      cargar();
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Error al marcar');
    } finally {
      setMarcando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Mi Asistencia</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
        {cargando ? (
          <p className="text-sm text-zinc-400 text-center">Cargando…</p>
        ) : errorCarga ? (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl p-3">{errorCarga}</p>
        ) : (
          <>
            {hoy?.sucursal_nombre && (
              <div className="flex items-center justify-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {hoy.sucursal_nombre}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/60 py-4 px-2">
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-1">Entrada</p>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-mono">{hoy?.hora_entrada?.slice(0, 5) || '—'}</p>
                {hoy?.estado && <div className="mt-1.5"><EstadoBadge estado={hoy.estado} /></div>}
              </div>
              <div className="text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/60 py-4 px-2">
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-1">Salida</p>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-mono">{hoy?.hora_salida?.slice(0, 5) || '—'}</p>
              </div>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl p-3">{error}</p>}

            {!hoy?.hora_entrada ? (
              <button onClick={() => marcar('entrada')} disabled={marcando}
                className="w-full py-3 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                {marcando ? 'Obteniendo ubicación…' : 'Marcar entrada'}
              </button>
            ) : !hoy?.hora_salida ? (
              <button onClick={() => marcar('salida')} disabled={marcando}
                className="w-full py-3 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                {marcando ? 'Obteniendo ubicación…' : 'Marcar salida'}
              </button>
            ) : (
              <p className="text-sm text-zinc-400 text-center">Turno cerrado por hoy.</p>
            )}
          </>
        )}
      </div>

      {!cargando && !errorCarga && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Últimos días</h2>
          {historial.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6">Todavía no hay registros anteriores.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {historial.map(h => (
                <li key={h.id_asistencia} className="py-2.5 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 capitalize w-24 shrink-0">{formatearFecha(h.fecha)}</span>
                  <span className="text-sm font-mono text-zinc-800 dark:text-zinc-200 flex-1 text-center sm:text-left">
                    {h.hora_entrada?.slice(0, 5) || '—'} — {h.hora_salida?.slice(0, 5) || '—'}
                  </span>
                  <EstadoBadge estado={h.estado} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
