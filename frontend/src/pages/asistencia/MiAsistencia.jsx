import { useState, useEffect } from 'react';
import { asistenciaService } from '../../services/asistencia.service';

const ESTADO_LABEL = { PRESENTE: 'A tiempo', TARDANZA: 'Con tardanza' };

function obtenerUbicacion() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Este navegador no soporta geolocalización'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('No se pudo obtener tu ubicación. Revisá los permisos del navegador.'))
    );
  });
}

export default function MiAsistencia() {
  const [hoy, setHoy]         = useState(null);
  const [cargando, setCargando] = useState(true);
  const [marcando, setMarcando] = useState(false);
  const [error, setError]     = useState(null);

  const cargar = () => {
    setCargando(true);
    asistenciaService.getHoy()
      .then(r => setHoy(r.data.asistencia))
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
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Mi Asistencia</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 text-center space-y-4">
        {cargando ? (
          <p className="text-sm text-zinc-400">Cargando…</p>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Entrada</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{hoy?.hora_entrada || '—'}</p>
              {hoy?.estado && <p className="text-xs text-amber-500 font-medium">{ESTADO_LABEL[hoy.estado] || hoy.estado}</p>}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Salida</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{hoy?.hora_salida || '—'}</p>
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
              <p className="text-sm text-zinc-400">Turno cerrado por hoy.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
