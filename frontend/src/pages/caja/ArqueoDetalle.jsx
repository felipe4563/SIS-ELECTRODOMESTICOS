import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cajaService } from '../../services/caja.service';
import { usePermission } from '../../hooks/usePermission';

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const fmtFecha = (f) =>
  f ? new Date(f).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function ModalCerrar({ arqueo, provisional, esForzado, onClose, onSuccess }) {
  const [montoReal, setMontoReal] = useState(provisional != null ? String(provisional.toFixed(2)) : '');
  const [obs,       setObs]       = useState('');
  const [cargando,  setCargando]  = useState(false);
  const [error,     setError]     = useState('');

  const dif = montoReal !== '' ? Number(montoReal) - (provisional ?? 0) : null;

  const handleCerrar = async () => {
    setError('');
    if (montoReal === '') return setError('Ingresá el monto físico real');
    setCargando(true);
    try {
      const fn = esForzado ? cajaService.forzarCierre : cajaService.cerrarCaja;
      await fn(arqueo.id_arqueo, { monto_cierre_real: montoReal, observaciones: obs });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.mensaje ?? 'Error al cerrar caja');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            {esForzado ? 'Forzar cierre de caja' : 'Cerrar turno'}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {arqueo.caja} — {arqueo.sucursal}
          </p>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Resumen esperado */}
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Monto apertura</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-white">Bs {fmt(arqueo.monto_apertura)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Cobros en efectivo</span>
            <span className="font-mono font-medium text-green-600 dark:text-green-400">
              + Bs {fmt((provisional ?? 0) - Number(arqueo.monto_apertura))}
            </span>
          </div>
          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2 font-semibold">
            <span className="text-zinc-700 dark:text-zinc-300">Total esperado</span>
            <span className="font-mono text-zinc-900 dark:text-white">Bs {fmt(provisional)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
            Monto físico real (Bs) *
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={montoReal}
            onChange={e => setMontoReal(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            autoFocus
          />
        </div>

        {dif !== null && (
          <div className={`flex justify-between rounded-xl px-4 py-2.5 text-sm font-semibold ${
            dif === 0
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              : dif > 0
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}>
            <span>Diferencia</span>
            <span className="font-mono">{dif >= 0 ? '+' : ''}Bs {fmt(dif)}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
            Observaciones / Justificación
          </label>
          <textarea
            rows={2}
            value={obs}
            onChange={e => setObs(e.target.value)}
            placeholder={dif !== null && dif !== 0 ? 'Explica la diferencia…' : 'Opcional'}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCerrar}
            disabled={cargando}
            className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors"
          >
            {cargando ? 'Cerrando…' : 'Cerrar caja'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ArqueoDetalle() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { puede }    = usePermission();

  const puedoCerrar        = puede('cerrar', 'caja');
  const puedoForzarCierre  = puede('forzar_cierre', 'caja');

  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modal,    setModal]    = useState(null); // 'cerrar' | 'forzar'

  const cargar = () => {
    setCargando(true);
    cajaService.getArqueo(id)
      .then(r => setData(r.data))
      .catch(() => navigate('/caja'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [id]);

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!data) return null;

  const { arqueo, cobros, monto_cierre_sistema_provisional } = data;
  const esAbierta = arqueo.estado === 'ABIERTA';

  const totalCobros = cobros.reduce((s, c) => s + Number(c.monto), 0);
  const esperado    = monto_cierre_sistema_provisional ?? Number(arqueo.monto_cierre_sistema ?? 0);
  const diferencia  = arqueo.diferencia;
  const difNum      = Number(diferencia ?? 0);

  const difColor = () => {
    if (diferencia == null) return 'text-zinc-400';
    if (difNum > 0) return 'text-green-600 dark:text-green-400';
    if (difNum < 0) return 'text-red-500 dark:text-red-400';
    return 'text-zinc-500 dark:text-zinc-400';
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{arqueo.caja}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              esAbierta
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
            }`}>
              {arqueo.estado}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{arqueo.sucursal}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link
            to="/caja"
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Volver
          </Link>
          {esAbierta && puedoCerrar && (
            <button
              onClick={() => setModal('cerrar')}
              className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
            >
              Cerrar turno
            </button>
          )}
          {esAbierta && puedoForzarCierre && !puedoCerrar && (
            <button
              onClick={() => setModal('forzar')}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
            >
              Forzar cierre
            </button>
          )}
        </div>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Cajero',        value: arqueo.usuario,           sub: null },
          { label: 'Apertura',      value: fmtFecha(arqueo.fecha_apertura), sub: `Bs ${fmt(arqueo.monto_apertura)}` },
          { label: 'Cierre',        value: fmtFecha(arqueo.fecha_cierre),   sub: esAbierta ? 'Turno activo' : null },
          { label: 'Cobros efectivo', value: `Bs ${fmt(totalCobros)}`,     sub: `${cobros.length} transacción${cobros.length !== 1 ? 'es' : ''}` },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{card.label}</p>
            <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-white leading-tight">{card.value}</p>
            {card.sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Cuadro de cierre */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
          {esAbierta ? 'Resumen provisional' : 'Cuadre de caja'}
        </h2>
        <div className="space-y-2 text-sm max-w-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Monto apertura</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-white">Bs {fmt(arqueo.monto_apertura)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Cobros efectivo</span>
            <span className="font-mono font-medium text-green-600 dark:text-green-400">+ Bs {fmt(totalCobros)}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2">
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">Total esperado (sistema)</span>
            <span className="font-mono font-bold text-zinc-900 dark:text-white">Bs {fmt(esperado)}</span>
          </div>
          {!esAbierta && (
            <>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Conteo físico real</span>
                <span className="font-mono font-medium text-zinc-900 dark:text-white">Bs {fmt(arqueo.monto_cierre_real)}</span>
              </div>
              <div className={`flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2 font-bold ${difColor()}`}>
                <span>Diferencia</span>
                <span className="font-mono">
                  {difNum >= 0 ? '+' : ''}Bs {fmt(diferencia)}
                </span>
              </div>
            </>
          )}
        </div>

        {!esAbierta && arqueo.observaciones && (
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Observaciones</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{arqueo.observaciones}</p>
          </div>
        )}
      </div>

      {/* Cobros en efectivo */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Cobros en efectivo durante el turno
          </h2>
        </div>
        {cobros.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-400">Sin cobros en efectivo</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">N° Pago</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Venta</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Fecha</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Monto Bs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {cobros.map(c => (
                  <tr key={c.id_pago} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">{c.numero}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">{c.venta_numero}</td>
                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{c.cliente}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(c.fecha).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-zinc-900 dark:text-white">
                      {fmt(c.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-zinc-50 dark:bg-zinc-800/60">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-right">Total</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-zinc-900 dark:text-white">
                    {fmt(totalCobros)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {(modal === 'cerrar' || modal === 'forzar') && (
        <ModalCerrar
          arqueo={arqueo}
          provisional={esAbierta ? monto_cierre_sistema_provisional : null}
          esForzado={modal === 'forzar'}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}
