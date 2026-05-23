import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ajustesService } from '../../services/ajustes.service';
import { usePermission }  from '../../hooks/usePermission';

const fmtFecha = s => s ? new Date(s).toLocaleString('es-BO') : '—';
const fmtCant  = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const ESTADO_BADGE = {
  BORRADOR: { label: 'Borrador',  cls: 'bg-zinc-100  text-zinc-600  dark:bg-zinc-800  dark:text-zinc-400' },
  APROBADO: { label: 'Aprobado',  cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ANULADO:  { label: 'Anulado',   cls: 'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400' },
};

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{titulo}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function AjusteDetalle() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { puede } = usePermission();

  const [ajuste,    setAjuste]    = useState(null);
  const [cargando,  setCargando]  = useState(true);
  const [modal,     setModal]     = useState(null); // 'aprobar' | 'anular'
  const [procesando, setProcesando] = useState(false);
  const [error,     setError]     = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await ajustesService.getOne(id);
      setAjuste(res.data);
    } catch { navigate('/inventario/ajustes'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [id]); // eslint-disable-line

  const accion = async () => {
    setError('');
    setProcesando(true);
    try {
      if (modal === 'aprobar') await ajustesService.aprobar(id);
      else                     await ajustesService.anular(id);
      setModal(null);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al procesar');
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!ajuste)  return null;

  const badge = ESTADO_BADGE[ajuste.estado] ?? { label: ajuste.estado, cls: 'bg-zinc-100 text-zinc-600' };
  const puedeEditar  = puede('ajuste_crear',   'inventario') && ajuste.estado === 'BORRADOR';
  const puedeAprobar = puede('ajuste_aprobar', 'inventario') && ajuste.estado === 'BORRADOR';
  const puedeAnular  = puede('ajuste_anular',  'inventario') && ajuste.estado === 'BORRADOR';

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <button onClick={() => navigate('/inventario/ajustes')} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mb-1">
            ← Ajustes
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">{ajuste.numero}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeEditar && (
            <button
              onClick={() => navigate(`/inventario/ajustes/${id}/editar`)}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
            >
              Editar
            </button>
          )}
          {puedeAprobar && (
            <button
              onClick={() => setModal('aprobar')}
              className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors"
            >
              Aprobar ajuste
            </button>
          )}
          {puedeAnular && (
            <button
              onClick={() => setModal('anular')}
              className="px-4 py-2 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold text-sm transition-colors"
            >
              Anular
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Depósito',  value: `${ajuste.deposito_nombre} (${ajuste.deposito_codigo})` },
          { label: 'Fecha',     value: fmtFecha(ajuste.fecha) },
          { label: 'Usuario',   value: `${ajuste.usuario_nombres} ${ajuste.usuario_apellidos}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {ajuste.motivo && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Motivo</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{ajuste.motivo}</p>
        </div>
      )}

      {/* Detalle */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Productos ajustados</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                {['Producto', 'Unidad', 'Stock sistema', 'Conteo físico', 'Diferencia', 'Observación'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(ajuste.detalle ?? []).map(d => {
                const diff = Number(d.diferencia ?? 0);
                return (
                  <tr key={d.id_detalle}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900 dark:text-white">{d.producto_nombre}</p>
                      <p className="text-[11px] font-mono text-zinc-400">{d.codigo_interno}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{d.unidad_nombre}</td>
                    <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">{fmtCant(d.cantidad_sistema)}</td>
                    <td className="px-4 py-3 font-mono text-zinc-900 dark:text-white font-semibold">{fmtCant(d.cantidad_fisica)}</td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      <span className={diff > 0 ? 'text-green-600 dark:text-green-400' : diff < 0 ? 'text-red-500 dark:text-red-400' : 'text-zinc-400'}>
                        {diff > 0 ? '+' : ''}{fmtCant(diff)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs">{d.observacion || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Aprobar */}
      {modal === 'aprobar' && (
        <Modal titulo="Aprobar ajuste" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Al aprobar, el stock del depósito <strong>{ajuste.deposito_nombre}</strong> se
              actualizará según los conteos físicos. Esta acción no se puede revertir.
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={accion} disabled={procesando}
                className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {procesando ? 'Aprobando…' : 'Confirmar aprobación'}
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Anular */}
      {modal === 'anular' && (
        <Modal titulo="Anular ajuste" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ¿Confirmás la anulación de este ajuste? Solo se puede anular si está en estado Borrador.
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={accion} disabled={procesando}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {procesando ? 'Anulando…' : 'Confirmar anulación'}
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
