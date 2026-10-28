import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transferenciasService } from '../../services/transferencias.service';
import { productosService }       from '../../services/productos.service';
import { usePermission }          from '../../hooks/usePermission';
import { useEmpresa }             from '../../contexts/EmpresaContext';
import { descargarTransferenciaPDF } from './TransferenciaImprimir';

const fmtFecha = s => s ? new Date(s).toLocaleString('es-BO') : '—';
const fmtCant  = n => Math.round(Number(n ?? 0)).toLocaleString('es-BO');
const specLinea = d => [d.marca && `Marca: ${d.marca}`, d.modelo && `Mod: ${d.modelo}`, d.color && `Color: ${d.color}`, d.capacidad && `Cap: ${d.capacidad}`].filter(Boolean).join('  ·  ');

const ESTADO_BADGE = {
  BORRADOR:    { label: 'Borrador',    cls: 'bg-zinc-100   text-zinc-600   dark:bg-zinc-800      dark:text-zinc-400' },
  SOLICITADA:  { label: 'Solicitada',  cls: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400' },
  EN_TRANSITO: { label: 'En tránsito', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  RECIBIDA:    { label: 'Recibida',    cls: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400' },
  PARCIAL:     { label: 'Parcial',     cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  ANULADA:     { label: 'Anulada',     cls: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400' },
};

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{titulo}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function TransferenciaDetalle() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { puede } = usePermission();
  const { empresa, logoUrl } = useEmpresa();

  const [trf,      setTrf]      = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modal,    setModal]    = useState(null); // 'enviar' | 'recibir' | 'anular'
  const [obs,      setObs]      = useState('');
  const [sendItems, setSendItems] = useState([]);
  const [recvItems, setRecvItems] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [error,    setError]    = useState('');
  const [descargando, setDescargando] = useState(false);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [modalSeries, setModalSeries] = useState(null); // { id_detalle, id_producto, producto_nombre, cantidad, seleccion, disponibles, cargando, error, guardando }

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await transferenciasService.getOne(id);
      setTrf(res.data);
    } catch { navigate('/inventario/transferencias'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [id]); // eslint-disable-line

  const abrirEnviar = () => {
    const pendientes = (trf?.detalle ?? []).filter(
      d => Number(d.cantidad_despachada) < Number(d.cantidad_enviada)
    );
    setSendItems(pendientes.map(d => {
      const aEnviar = Math.round(Number(d.cantidad_enviada) - Number(d.cantidad_despachada));
      const series = (d.series ?? []).filter(s => s.estado === 'EN_STOCK' && String(s.id_deposito_actual) === String(trf.id_deposito_origen));
      return {
        id_detalle: d.id_detalle,
        producto_nombre: d.producto_nombre,
        cantidad_enviada: d.cantidad_enviada,
        cantidad_despachada: d.cantidad_despachada,
        cantidad_a_enviar: aEnviar,
        series,
        seleccion: series.slice(0, aEnviar).map(s => s.id_serie),
      };
    }));
    setModal('enviar');
  };

  const abrirRecibir = () => {
    const pendientes = (trf?.detalle ?? []).filter(
      d => Number(d.cantidad_recibida) < Number(d.cantidad_despachada)
    );
    setRecvItems(pendientes.map(d => {
      const aRecibir = Math.round(Number(d.cantidad_despachada) - Number(d.cantidad_recibida));
      const series = (d.series ?? []).filter(s => s.estado === 'EN_TRANSITO');
      return {
        id_detalle: d.id_detalle,
        producto_nombre: d.producto_nombre,
        cantidad_despachada: d.cantidad_despachada,
        cantidad_recibida: d.cantidad_recibida,
        cantidad_a_recibir: aRecibir,
        series,
        seleccion: series.slice(0, aRecibir).map(s => s.id_serie),
      };
    }));
    setModal('recibir');
  };

  const accion = async () => {
    setError('');
    setProcesando(true);
    try {
      if (modal === 'enviar') {
        const items = sendItems.map(it => ({ id_detalle: it.id_detalle, cantidad_a_enviar: it.cantidad_a_enviar, series: it.seleccion }));
        await transferenciasService.enviar(id, { items, observaciones: obs });
      } else if (modal === 'recibir') {
        const items = recvItems.map(it => ({ id_detalle: it.id_detalle, cantidad_a_recibir: it.cantidad_a_recibir, series: it.seleccion }));
        await transferenciasService.recibir(id, { items, observaciones: obs });
      } else if (modal === 'anular') {
        await transferenciasService.anular(id, { motivo: motivoAnular });
      }
      setModal(null);
      setObs('');
      setMotivoAnular('');
      await cargar();
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al procesar');
    } finally {
      setProcesando(false);
    }
  };

  const abrirSeries = async (d) => {
    setModalSeries({
      id_detalle: d.id_detalle,
      id_producto: d.id_producto,
      producto_nombre: d.producto_nombre,
      cantidad: d.cantidad_enviada,
      seleccion: (d.series ?? []).map(s => s.id_serie),
      disponibles: [],
      cargando: true,
      error: '',
      guardando: false,
    });
    try {
      const { data } = await productosService.getSeriesProducto(d.id_producto, trf.id_deposito_origen, {
        excluirTransferencia: trf.id_transferencia,
      });
      setModalSeries(prev => (prev && prev.id_detalle === d.id_detalle) ? { ...prev, disponibles: data.series ?? [], cargando: false } : prev);
    } catch {
      setModalSeries(prev => (prev && prev.id_detalle === d.id_detalle) ? { ...prev, error: 'Error al cargar las series', cargando: false } : prev);
    }
  };

  const toggleSerieModal = (id_serie) => {
    setModalSeries(prev => {
      if (!prev) return prev;
      const marcada = prev.seleccion.includes(id_serie);
      if (marcada) return { ...prev, seleccion: prev.seleccion.filter(s => s !== id_serie) };
      if (prev.seleccion.length >= Number(prev.cantidad)) return prev;
      return { ...prev, seleccion: [...prev.seleccion, id_serie] };
    });
  };

  const guardarSeriesModal = async () => {
    if (!modalSeries) return;
    setModalSeries(prev => ({ ...prev, guardando: true, error: '' }));
    try {
      const items = (trf.detalle ?? []).map(d => ({
        id_producto: d.id_producto,
        cantidad: d.cantidad_enviada,
        observacion: d.observacion,
        series: d.id_detalle === modalSeries.id_detalle ? modalSeries.seleccion : (d.series ?? []).map(s => s.id_serie),
      }));
      await transferenciasService.update(id, {
        id_deposito_origen: trf.id_deposito_origen,
        id_deposito_destino: trf.id_deposito_destino,
        observaciones: trf.observaciones,
        items,
      });
      setModalSeries(null);
      await cargar();
    } catch (err) {
      setModalSeries(prev => ({ ...prev, guardando: false, error: err.response?.data?.mensaje ?? 'Error al guardar las series' }));
    }
  };

  const emitir = async () => {
    setError('');
    setProcesando(true);
    try {
      await transferenciasService.emitir(id);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al emitir la transferencia');
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!trf)     return null;

  const badge = ESTADO_BADGE[trf.estado] ?? { label: trf.estado, cls: 'bg-zinc-100 text-zinc-600' };
  const puedeEditar  = puede('transferir_solicitar', 'inventario');
  const puedeEnviar  = puede('transferir_enviar', 'inventario');
  const puedeRecibir = puede('transferir_recibir', 'inventario');
  const puedeAnular  = puede('transferir_anular', 'inventario');

  const textaCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  const etiquetasDisponibles = (trf.detalle ?? []).filter(d => d.codigo_interno);
  const handleImprimirEtiquetas = () => {
    navigate(`/inventario/transferencias/${id}/etiquetas`, {
      state: {
        etiquetas: etiquetasDisponibles.map(d => ({
          nombre: d.producto_nombre,
          detalle: d.producto_detalle,
          codigo_interno: d.codigo_interno,
          marca: d.marca, modelo: d.modelo, color: d.color, capacidad: d.capacidad,
          series: d.series,
          copias: 1,
        })),
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <button onClick={() => navigate('/inventario/transferencias')} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mb-1">
            ← Transferencias
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">{trf.numero}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate(`/inventario/transferencias/${id}/imprimir`)}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
          >
            Imprimir
          </button>
          <button
            onClick={async () => {
              setDescargando(true);
              try { await descargarTransferenciaPDF(id, empresa, logoUrl); }
              finally { setDescargando(false); }
            }}
            disabled={descargando}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60 font-semibold text-sm transition-colors"
          >
            {descargando ? 'Generando…' : 'Comprobante PDF'}
          </button>
          {etiquetasDisponibles.length > 0 && (
            <button
              onClick={handleImprimirEtiquetas}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
            >
              Etiquetas
            </button>
          )}
          {trf.estado === 'BORRADOR' && puedeEditar && (
            <button onClick={() => navigate(`/inventario/transferencias/${id}/editar`)}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors">
              Editar
            </button>
          )}
          {trf.estado === 'BORRADOR' && puedeEditar && (
            <button onClick={emitir} disabled={procesando}
              className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors">
              {procesando ? 'Emitiendo…' : 'Emitir'}
            </button>
          )}
          {['SOLICITADA', 'EN_TRANSITO', 'PARCIAL'].includes(trf.estado) && puedeEnviar &&
            (trf.detalle ?? []).some(d => Number(d.cantidad_despachada) < Number(d.cantidad_enviada)) && (
            <button onClick={abrirEnviar}
              className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors">
              Enviar mercadería
            </button>
          )}
          {['EN_TRANSITO', 'PARCIAL'].includes(trf.estado) && puedeRecibir && (
            <button onClick={abrirRecibir}
              className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors">
              Recibir mercadería
            </button>
          )}
          {['SOLICITADA', 'EN_TRANSITO', 'PARCIAL'].includes(trf.estado) && puedeAnular && (
            <button onClick={() => setModal('anular')}
              className="px-4 py-2 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold text-sm transition-colors">
              Anular
            </button>
          )}
        </div>
      </div>

      {error && !modal && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Depósito origen',  value: `${trf.deposito_origen_nombre} (${trf.deposito_origen_codigo})` },
          { label: 'Depósito destino', value: `${trf.deposito_destino_nombre} (${trf.deposito_destino_codigo})` },
          { label: 'Solicitada',       value: fmtFecha(trf.fecha_solicitud) },
          { label: 'Enviada',          value: fmtFecha(trf.fecha_envio) },
          { label: 'Recibida',         value: fmtFecha(trf.fecha_recepcion) },
          { label: 'Solicita',         value: trf.solicita_nombres ? `${trf.solicita_nombres} ${trf.solicita_apellidos}` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {(trf.observaciones || trf.observaciones_envio || trf.observaciones_recepcion) && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 space-y-2.5">
          {trf.observaciones && (
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Observaciones (solicitud)</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{trf.observaciones}</p>
            </div>
          )}
          {trf.observaciones_envio && (
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Observaciones (envío)</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{trf.observaciones_envio}</p>
            </div>
          )}
          {trf.observaciones_recepcion && (
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Observaciones (recepción)</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{trf.observaciones_recepcion}</p>
            </div>
          )}
        </div>
      )}

      {trf.motivo_anulacion && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500 dark:text-red-400 mb-0.5">Motivo de anulación</p>
          <p className="text-sm text-red-700 dark:text-red-300">{trf.motivo_anulacion}</p>
        </div>
      )}

      {/* Detalle */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Productos</p>
        </div>

        {/* ── Tarjetas — móvil < md ── */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {(trf.detalle ?? []).map(d => {
            const pendiente = Number(d.cantidad_despachada) - Number(d.cantidad_recibida);
            return (
              <div key={d.id_detalle} className="px-4 py-3 space-y-2">
                <div>
                  <p className="font-medium text-sm text-zinc-900 dark:text-white">{d.producto_nombre}</p>
                  <p className="text-[11px] font-mono text-zinc-400">{d.codigo_interno}</p>
                  {d.producto_detalle && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{d.producto_detalle}</p>
                  )}
                  {specLinea(d) && (
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{specLinea(d)}</p>
                  )}
                  {d.series?.length > 0 && (
                    <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
                      N° serie: {d.series.map(s => s.numero_serie).join(', ')}
                    </p>
                  )}
                </div>
                {d.unidad_nombre && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Unidad: {d.unidad_nombre}</p>
                )}
                {trf.estado === 'BORRADOR' && puedeEditar && (
                  <button type="button" onClick={() => abrirSeries(d)}
                    className="text-[11px] px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                    {d.series?.length > 0 ? `Series elegidas (${d.series.length}/${fmtCant(d.cantidad_enviada)})` : 'Elegir series'}
                  </button>
                )}
                <div className="flex items-center gap-4 text-xs flex-wrap">
                  <div>
                    <span className="text-zinc-400 dark:text-zinc-500">Solicitado </span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-white">{fmtCant(d.cantidad_enviada)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 dark:text-zinc-500">Despachado </span>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{fmtCant(d.cantidad_despachada)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 dark:text-zinc-500">Recibido </span>
                    <span className="font-mono font-semibold text-green-600 dark:text-green-400">{fmtCant(d.cantidad_recibida)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 dark:text-zinc-500">Pendiente </span>
                    <span className={`font-mono font-semibold ${pendiente > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-400'}`}>
                      {fmtCant(pendiente)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Tabla — desktop md+ ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                {['Producto', 'Unidad', 'Solicitado', 'Despachado', 'Recibido', 'Pendiente'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(trf.detalle ?? []).map(d => {
                const pendiente = Number(d.cantidad_despachada) - Number(d.cantidad_recibida);
                return (
                  <tr key={d.id_detalle}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900 dark:text-white">{d.producto_nombre}</p>
                      <p className="text-[11px] font-mono text-zinc-400">{d.codigo_interno}</p>
                      {d.producto_detalle && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{d.producto_detalle}</p>
                      )}
                      {specLinea(d) && (
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{specLinea(d)}</p>
                      )}
                      {d.series?.length > 0 && (
                        <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
                          N° serie: {d.series.map(s => s.numero_serie).join(', ')}
                        </p>
                      )}
                      {trf.estado === 'BORRADOR' && puedeEditar && (
                        <button type="button" onClick={() => abrirSeries(d)}
                          className="mt-1.5 text-[11px] px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                          {d.series?.length > 0 ? `Series elegidas (${d.series.length}/${fmtCant(d.cantidad_enviada)})` : 'Elegir series'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{d.unidad_nombre}</td>
                    <td className="px-4 py-3 font-mono text-zinc-900 dark:text-white">{fmtCant(d.cantidad_enviada)}</td>
                    <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">{fmtCant(d.cantidad_despachada)}</td>
                    <td className="px-4 py-3 font-mono text-green-600 dark:text-green-400">{fmtCant(d.cantidad_recibida)}</td>
                    <td className="px-4 py-3 font-mono">
                      <span className={pendiente > 0 ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-zinc-400'}>
                        {fmtCant(pendiente)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Enviar */}
      {modal === 'enviar' && (
        <Modal titulo="Confirmar envío" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              El stock saldrá del depósito <strong>{trf.deposito_origen_nombre}</strong>. Si no envía todo, puede completar el resto después con un nuevo envío.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {sendItems.map((item, i) => {
                const aEnviar = Math.round(Number(item.cantidad_a_enviar) || 0);
                const faltanSeries = item.series.length > 0 && item.seleccion.length < aEnviar;
                return (
                  <div key={item.id_detalle} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2 space-y-1.5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-900 dark:text-white truncate">{item.producto_nombre}</p>
                        <p className="text-[11px] text-zinc-400">
                          Solicitado: {fmtCant(item.cantidad_enviada)} · Despachado: {fmtCant(item.cantidad_despachada)}
                        </p>
                      </div>
                      <div className="w-28">
                        <label className="text-[10px] text-zinc-500 dark:text-zinc-400">A enviar</label>
                        <input
                          type="number"
                          min={0}
                          max={Math.round(Number(item.cantidad_enviada) - Number(item.cantidad_despachada))}
                          step="1"
                          value={item.cantidad_a_enviar}
                          onChange={e => {
                            const val = e.target.value === '' ? '' : Math.round(Number(e.target.value));
                            setSendItems(prev => prev.map((it, idx) => {
                              if (idx !== i) return it;
                              const nuevaCant = val === '' ? 0 : val;
                              return { ...it, cantidad_a_enviar: val, seleccion: it.seleccion.slice(0, nuevaCant) };
                            }));
                          }}
                          className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right"
                        />
                      </div>
                    </div>
                    {item.series.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Elegí qué serie(s) enviar ({item.seleccion.length}/{aEnviar}):
                        </p>
                        <div className="space-y-0.5 max-h-28 overflow-y-auto">
                          {item.series.map(s => {
                            const marcada   = item.seleccion.includes(s.id_serie);
                            const bloqueada = !marcada && item.seleccion.length >= aEnviar;
                            return (
                              <label key={s.id_serie}
                                className={`flex items-center gap-1.5 text-[11px] px-1 py-0.5 rounded cursor-pointer ${bloqueada ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white dark:hover:bg-zinc-900'}`}>
                                <input type="checkbox" checked={marcada} disabled={bloqueada}
                                  onChange={() => setSendItems(prev => prev.map((it, idx) => {
                                    if (idx !== i) return it;
                                    if (marcada) return { ...it, seleccion: it.seleccion.filter(id => id !== s.id_serie) };
                                    if (it.seleccion.length >= aEnviar) return it;
                                    return { ...it, seleccion: [...it.seleccion, s.id_serie] };
                                  }))}
                                  className="rounded accent-blue-500" />
                                <span className="font-mono text-zinc-700 dark:text-zinc-300">{s.numero_serie}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {faltanSeries && (
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        Elegí {aEnviar - item.seleccion.length} serie(s) más para esta línea antes de enviar.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Observaciones</label>
              <textarea rows={2} value={obs} onChange={e => setObs(e.target.value)}
                className={`${textaCls} resize-none`} placeholder="Opcional…" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={accion} disabled={procesando || sendItems.some(it => it.series.length > 0 && it.seleccion.length < Math.round(Number(it.cantidad_a_enviar) || 0))}
                className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {procesando ? 'Procesando…' : 'Confirmar envío'}
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Recibir */}
      {modal === 'recibir' && (
        <Modal titulo="Recibir mercadería" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {recvItems.map((item, i) => {
                const aRecibir = Math.round(Number(item.cantidad_a_recibir) || 0);
                const faltanSeries = item.series.length > 0 && item.seleccion.length < aRecibir;
                return (
                  <div key={item.id_detalle} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2 space-y-1.5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-900 dark:text-white truncate">{item.producto_nombre}</p>
                        <p className="text-[11px] text-zinc-400">
                          Despachado: {fmtCant(item.cantidad_despachada)} · Recibido: {fmtCant(item.cantidad_recibida)}
                        </p>
                      </div>
                      <div className="w-28">
                        <label className="text-[10px] text-zinc-500 dark:text-zinc-400">A recibir</label>
                        <input
                          type="number"
                          min={0}
                          max={Math.round(Number(item.cantidad_despachada) - Number(item.cantidad_recibida))}
                          step="1"
                          value={item.cantidad_a_recibir}
                          onChange={e => {
                            const val = e.target.value === '' ? '' : Math.round(Number(e.target.value));
                            setRecvItems(prev => prev.map((it, idx) => {
                              if (idx !== i) return it;
                              const nuevaCant = val === '' ? 0 : val;
                              return { ...it, cantidad_a_recibir: val, seleccion: it.seleccion.slice(0, nuevaCant) };
                            }));
                          }}
                          className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right"
                        />
                      </div>
                    </div>
                    {item.series.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Elegí qué serie(s) recibir ({item.seleccion.length}/{aRecibir}):
                        </p>
                        <div className="space-y-0.5 max-h-28 overflow-y-auto">
                          {item.series.map(s => {
                            const marcada   = item.seleccion.includes(s.id_serie);
                            const bloqueada = !marcada && item.seleccion.length >= aRecibir;
                            return (
                              <label key={s.id_serie}
                                className={`flex items-center gap-1.5 text-[11px] px-1 py-0.5 rounded cursor-pointer ${bloqueada ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white dark:hover:bg-zinc-900'}`}>
                                <input type="checkbox" checked={marcada} disabled={bloqueada}
                                  onChange={() => setRecvItems(prev => prev.map((it, idx) => {
                                    if (idx !== i) return it;
                                    if (marcada) return { ...it, seleccion: it.seleccion.filter(id => id !== s.id_serie) };
                                    if (it.seleccion.length >= aRecibir) return it;
                                    return { ...it, seleccion: [...it.seleccion, s.id_serie] };
                                  }))}
                                  className="rounded accent-yellow-500" />
                                <span className="font-mono text-zinc-700 dark:text-zinc-300">{s.numero_serie}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {faltanSeries && (
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        Elegí {aRecibir - item.seleccion.length} serie(s) más para esta línea antes de recibir.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Observaciones</label>
              <textarea rows={2} value={obs} onChange={e => setObs(e.target.value)}
                className={`${textaCls} resize-none`} placeholder="Opcional…" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={accion} disabled={procesando || recvItems.some(it => it.series.length > 0 && it.seleccion.length < Math.round(Number(it.cantidad_a_recibir) || 0))}
                className="flex-1 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors">
                {procesando ? 'Procesando…' : 'Confirmar recepción'}
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
        <Modal titulo="Anular transferencia" onClose={() => { setModal(null); setMotivoAnular(''); }}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {['EN_TRANSITO', 'PARCIAL'].includes(trf.estado)
                ? 'Al anular, el stock que ya salió y no fue recibido volverá al depósito origen. Esta acción no se puede revertir.'
                : '¿Confirmás la anulación de esta transferencia?'}
            </p>
            <div>
              <label className="block text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Motivo de anulación</label>
              <textarea
                value={motivoAnular}
                onChange={e => setMotivoAnular(e.target.value)}
                rows={2}
                placeholder="Describe el motivo..."
                className="w-full border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={accion} disabled={procesando || !motivoAnular.trim()}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {procesando ? 'Anulando…' : 'Confirmar anulación'}
              </button>
              <button onClick={() => { setModal(null); setMotivoAnular(''); }}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Elegir series */}
      {modalSeries && (
        <Modal titulo={`Series — ${modalSeries.producto_nombre}`} onClose={() => setModalSeries(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Elegí hasta {fmtCant(modalSeries.cantidad)} serie(s) para esta línea.
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2">
              {modalSeries.cargando ? (
                <p className="text-xs text-zinc-400 text-center py-2">Cargando series…</p>
              ) : modalSeries.disponibles.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-2">Sin series disponibles en este depósito</p>
              ) : (
                modalSeries.disponibles.map(s => {
                  const marcada   = modalSeries.seleccion.includes(s.id_serie);
                  const bloqueada = !marcada && modalSeries.seleccion.length >= Number(modalSeries.cantidad);
                  return (
                    <label key={s.id_serie}
                      className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg cursor-pointer ${bloqueada ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                      <input type="checkbox" checked={marcada} disabled={bloqueada}
                        onChange={() => toggleSerieModal(s.id_serie)} className="rounded accent-amber-500" />
                      <span className="font-mono text-zinc-700 dark:text-zinc-300">{s.numero_serie}</span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Elegidas: {modalSeries.seleccion.length}/{fmtCant(modalSeries.cantidad)}
            </p>
            {modalSeries.error && <p className="text-sm text-red-500">{modalSeries.error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={guardarSeriesModal} disabled={modalSeries.guardando || modalSeries.cargando}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {modalSeries.guardando ? 'Guardando…' : 'Guardar series'}
              </button>
              <button onClick={() => setModalSeries(null)}
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
