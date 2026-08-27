import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ventasService } from '../../services/ventas.service';
import { usePermission } from '../../hooks/usePermission';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { descargarVentaPDF } from './VentaPDF';

const fmtFecha  = s => s ? new Date(s).toLocaleString('es-BO')  : '—';
const fmtFechaS = s => s ? new Date(s).toLocaleDateString('es-BO') : '—';
const fmtMonto  = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const ESTADO_BADGE = {
  BORRADOR: { label: 'Borrador',  cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',          border: 'border-l-zinc-400' },
  EMITIDA:  { label: 'Emitida',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',       border: 'border-l-blue-500' },
  PAGADA:   { label: 'Pagada',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   border: 'border-l-green-500' },
  PARCIAL:  { label: 'Parcial',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500', border: 'border-l-yellow-400' },
  ANULADA:  { label: 'Anulada',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',           border: 'border-l-red-500' },
  DEVUELTA: { label: 'Devuelta',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', border: 'border-l-purple-500' },
};

const CUOTA_BADGE = {
  PENDIENTE: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  PARCIAL:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500',
  PAGADA:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  VENCIDA:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const DEV_BADGE = {
  PENDIENTE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500',
  APROBADA:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RECHAZADA: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const DEV_LABEL = { PENDIENTE: 'Pendiente', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada' };

function SectionCard({ title, badge, children }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="w-0.5 h-5 rounded-full bg-yellow-400 shrink-0" />
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</p>
        {badge && (
          <span className="text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full sm:max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{titulo}</h3>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1';

export default function VentaDetalle() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();
  const { puede } = usePermission();
  const { logoUrl } = useEmpresa() ?? {};

  const [venta,      setVenta]      = useState(null);
  const [cargando,   setCargando]   = useState(true);
  const [modal,      setModal]      = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error,      setError]      = useState('');
  const [descargando, setDescargando] = useState(false);

  const [cobro,            setCobro]           = useState({ metodo_pago: 'EFECTIVO', monto: '', numero_referencia: '', observaciones: '', id_cuota: '' });
  const [nroFactura,       setNroFactura]       = useState('');
  const [devItems,         setDevItems]         = useState([]);
  const [devMotivo,        setDevMotivo]        = useState('');
  const [confirmCobroId,   setConfirmCobroId]   = useState(null);
  const [pageError,        setPageError]        = useState('');
  const [uploadingSerie,   setUploadingSerie]   = useState(null); // id_detalle subiendo (inline)
  const [modalSeries,      setModalSeries]      = useState(false);
  const [seriesUploading,  setSeriesUploading]  = useState({}); // {[id_detalle]: bool}
  const [seriesDone,       setSeriesDone]       = useState({}); // {[id_detalle]: bool}
  const [previewSerie,     setPreviewSerie]     = useState(null); // { url, id_detalle }
  const serieInputRef = useRef(null);
  const serieDetalleRef = useRef(null);
  const backendBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

  const handleSubirSerie = async (file) => {
    const id_detalle = serieDetalleRef.current;
    if (!file || !id_detalle) return;
    setUploadingSerie(id_detalle);
    try {
      await ventasService.subirImagenSerie(id_detalle, file);
      await cargar();
    } catch { /* silencioso */ }
    finally { setUploadingSerie(null); serieDetalleRef.current = null; }
  };

  const handleSubirSerieModal = async (id_detalle, file) => {
    setSeriesUploading(p => ({ ...p, [id_detalle]: true }));
    try {
      await ventasService.subirImagenSerie(id_detalle, file);
      setSeriesDone(p => ({ ...p, [id_detalle]: true }));
      await cargar();
    } catch { /* silencioso */ }
    finally { setSeriesUploading(p => ({ ...p, [id_detalle]: false })); }
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await ventasService.getOne(id);
      setVenta(res.data);
    } catch { navigate('/ventas'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [id]); // eslint-disable-line

  useEffect(() => {
    if (!venta) return;
    if (searchParams.get('series') === '1') {
      const tieneSeriesPendientes = (venta.detalle ?? []).some(d => d.numero_serie && !d.imagen_serie_url);
      if (tieneSeriesPendientes) setModalSeries(true);
    }
  }, [venta]); // eslint-disable-line

  useEffect(() => {
    if (venta?.detalle) {
      setDevItems(venta.detalle.map(d => ({
        id_producto: d.id_producto,
        producto: d.producto,
        cantidad_original: Number(d.cantidad),
        cantidad: 0,
        precio_unitario: d.precio_unitario,
        motivo: '',
      })));
    }
  }, [venta]); // eslint-disable-line

  const accionEmitir = async () => {
    setError(''); setProcesando(true);
    try {
      await ventasService.emitir(id, { numero_factura: nroFactura || undefined });
      setModal(null);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al emitir');
    } finally { setProcesando(false); }
  };

  const accionCobrar = async () => {
    setError(''); setProcesando(true);
    try {
      await ventasService.cobrar(id, { ...cobro, id_cuota: cobro.id_cuota || undefined });
      setModal(null);
      setCobro({ metodo_pago: 'EFECTIVO', monto: '', numero_referencia: '', observaciones: '', id_cuota: '' });
      await cargar();
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al registrar cobro');
    } finally { setProcesando(false); }
  };

  const accionAnular = async () => {
    setError(''); setProcesando(true);
    try {
      await ventasService.anular(id);
      setModal(null);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al anular');
    } finally { setProcesando(false); }
  };

  const accionDevolucion = async () => {
    setError(''); setProcesando(true);
    try {
      const itemsValidos = devItems.filter(it => Number(it.cantidad) > 0);
      if (!itemsValidos.length) { setError('Seleccioná al menos un producto'); setProcesando(false); return; }
      await ventasService.crearDevolucion(id, {
        motivo: devMotivo,
        items: itemsValidos.map(it => ({
          id_producto: it.id_producto,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          motivo: it.motivo,
        })),
      });
      setModal(null);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al crear devolución');
    } finally { setProcesando(false); }
  };

  const accionAnularCobro = async () => {
    if (!confirmCobroId) return;
    try {
      await ventasService.anularCobro(confirmCobroId);
      setConfirmCobroId(null);
      await cargar();
    } catch (err) {
      setPageError(err.response?.data?.mensaje ?? 'Error al anular cobro');
      setConfirmCobroId(null);
    }
  };

  if (cargando) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
    </div>
  );
  if (!venta) return null;

  const badge          = ESTADO_BADGE[venta.estado] ?? { label: venta.estado, cls: 'bg-zinc-100 text-zinc-600', border: 'border-l-zinc-400' };
  const clienteNombre  = venta.cliente_razon || `${venta.cliente_nombres ?? ''} ${venta.cliente_apellidos ?? ''}`.trim();

  const puedeEditar      = puede('editar_borrador',  'ventas') && venta.estado === 'BORRADOR';
  const puedeEmitir      = puede('emitir',           'ventas') && venta.estado === 'BORRADOR';
  const puedeCobrar      = puede('cobrar',           'ventas') && ['EMITIDA', 'PARCIAL'].includes(venta.estado) && Number(venta.saldo_pendiente) > 0;
  const puedeAnular      = puede('anular',           'ventas') && !['ANULADA', 'DEVUELTA'].includes(venta.estado);
  const puedeDevolver    = puede('devolucion_crear', 'ventas') && ['EMITIDA', 'PARCIAL', 'PAGADA'].includes(venta.estado);
  const puedeImprimir    = puede('imprimir',         'ventas') && venta.estado !== 'BORRADOR';
  const puedePreview     = venta.estado === 'BORRADOR';
  const puedeVerUtilidad = puede('ver_utilidad',     'ventas');
  const tieneSeriesSinFoto = (venta.detalle ?? []).some(d => d.numero_serie && !d.imagen_serie_url);

  return (
    <div className="space-y-4">

      {/* ── Cabecera documento ── */}
      <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 border-l-4 ${badge.border} px-4 sm:px-5 py-4`}>
        <button
          onClick={() => navigate('/ventas')}
          className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors mb-2.5 flex items-center gap-1">
          ← Ventas
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white font-mono tracking-tight">{venta.numero}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
              {badge.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              venta.tipo_venta === 'MAYOR'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}>
              {venta.tipo_venta === 'MAYOR' ? 'Mayor' : 'Menor'}
            </span>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {puedePreview && (
              <button onClick={() => navigate(`/ventas/${id}/imprimir`)}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm transition-colors">
                Vista previa
              </button>
            )}
            {puedeImprimir && (
              <button onClick={() => navigate(`/ventas/${id}/imprimir`)}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm transition-colors">
                Imprimir
              </button>
            )}
            {puedeImprimir && (
              <button
                disabled={descargando}
                onClick={async () => {
                  setDescargando(true);
                  try {
                    await descargarVentaPDF(id, logoUrl);
                  } catch (err) {
                    console.error('[descargarVentaPDF]', err);
                    setPageError(err.response?.data?.mensaje ?? err.response?.data?.error ?? 'No se pudo generar el comprobante PDF');
                  } finally {
                    setDescargando(false);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm transition-colors disabled:opacity-50">
                {descargando ? 'Generando…' : 'Comprobante PDF'}
              </button>
            )}
            {puedeEditar && (
              <button onClick={() => navigate(`/ventas/${id}/editar`)}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm transition-colors">
                Editar
              </button>
            )}
            {puedeEmitir && (
              <button onClick={() => { setError(''); setModal('emitir'); }}
                className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors">
                Emitir
              </button>
            )}
            {puedeCobrar && (
              <button onClick={() => { setError(''); setCobro(p => ({ ...p, monto: String(venta.saldo_pendiente) })); setModal('cobrar'); }}
                className="px-3 py-1.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors">
                Cobrar
              </button>
            )}
            {puedeDevolver && (
              <button onClick={() => { setError(''); setModal('devolucion'); }}
                className="px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-medium text-sm transition-colors">
                Devolución
              </button>
            )}
            {tieneSeriesSinFoto && (
              <button onClick={() => setModalSeries(true)}
                className="px-3 py-1.5 rounded-xl border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 font-medium text-sm transition-colors">
                Fotos de serie
              </button>
            )}
            {puedeAnular && (
              <button onClick={() => { setError(''); setModal('anular'); }}
                className="px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-sm transition-colors">
                Anular
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Información general ── */}
      <SectionCard title="Información general">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-zinc-100 dark:divide-zinc-800 lg:divide-y-0 lg:divide-x lg:divide-zinc-100 lg:dark:divide-zinc-800">
          {[
            { label: 'Cliente',   value: clienteNombre },
            { label: 'Sucursal',  value: venta.sucursal_nombre },
            { label: 'Depósito',  value: venta.deposito_nombre },
            { label: 'Vendedor',  value: venta.vendedor_nombre },
            { label: 'Fecha',     value: fmtFecha(venta.fecha) },
            { label: 'Condición', value: venta.condicion_pago === 'CREDITO' ? `Crédito (${venta.dias_credito}d)` : 'Contado' },
            { label: 'Total',     value: `Bs ${fmtMonto(venta.total)}`,           mono: true },
            { label: 'Saldo',     value: `Bs ${fmtMonto(venta.saldo_pendiente)}`, mono: true, highlight: Number(venta.saldo_pendiente) > 0 },
          ].map(({ label, value, mono, highlight }) => (
            <div key={label} className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">{label}</p>
              <p className={`text-sm font-medium leading-snug ${mono ? 'font-mono' : ''} ${
                highlight ? 'text-yellow-600 dark:text-yellow-400 font-bold' : 'text-zinc-900 dark:text-white'
              }`}>
                {value || '—'}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Productos ── */}
      <SectionCard title="Productos" badge={(venta.detalle ?? []).length}>

        {/* Tabla desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                {['Producto', 'Cant.', 'Precio unit.', 'Desc %', 'Subtotal',
                  ...(puedeVerUtilidad ? ['Costo unit.', 'Utilidad'] : [])
                ].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {(venta.detalle ?? []).map(d => {
                const utilidad = Number(d.subtotal) - (Number(d.costo_unitario) * Number(d.cantidad));
                const margen   = Number(d.subtotal) > 0 ? (utilidad / Number(d.subtotal) * 100) : 0;
                return (
                  <tr key={d.id_detalle} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900 dark:text-white">{d.producto}</p>
                      <p className="text-[11px] font-mono text-zinc-400 mt-0.5">{d.codigo_interno}</p>
                      {d.producto_detalle && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{d.producto_detalle}</p>
                      )}
                      {(d.marca || d.modelo || d.color || d.capacidad) && (
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                          {[d.marca, d.modelo, d.color, d.capacidad].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {/* N° de serie */}
                      {d.numero_serie ? (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                            Serie: {d.numero_serie}
                          </span>
                          {d.imagen_serie_url ? (
                            <>
                              <button
                                onClick={() => setPreviewSerie({ url: d.imagen_serie_url, id_detalle: d.id_detalle })}
                                className="text-[10px] text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 underline">
                                ver foto
                              </button>
                              <span className="text-[10px] text-zinc-300 dark:text-zinc-600">·</span>
                              <button
                                onClick={() => { serieDetalleRef.current = d.id_detalle; serieInputRef.current?.click(); }}
                                disabled={uploadingSerie === d.id_detalle}
                                className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline">
                                {uploadingSerie === d.id_detalle ? 'subiendo…' : 'cambiar'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => { serieDetalleRef.current = d.id_detalle; serieInputRef.current?.click(); }}
                              disabled={uploadingSerie === d.id_detalle}
                              className="text-[10px] text-zinc-400 hover:text-yellow-600 dark:hover:text-yellow-400 underline"
                            >
                              {uploadingSerie === d.id_detalle ? 'subiendo…' : '+ foto serie'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-300 dark:text-zinc-600 mt-0.5 italic">Sin serie</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">{fmtMonto(d.cantidad)}</td>
                    <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">Bs {fmtMonto(d.precio_unitario)}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{d.descuento_porc > 0 ? `${d.descuento_porc}%` : '—'}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-white">Bs {fmtMonto(d.subtotal)}</td>
                    {puedeVerUtilidad && (
                      <>
                        <td className="px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400">Bs {fmtMonto(d.costo_unitario)}</td>
                        <td className="px-4 py-3 font-mono font-semibold">
                          <span className={utilidad >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                            Bs {fmtMonto(utilidad)}
                          </span>
                          <span className="ml-1 text-[10px] text-zinc-400">({margen.toFixed(1)}%)</span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/40">
                <td colSpan={4} className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Subtotal</td>
                <td className="px-4 py-2.5 font-mono font-semibold text-zinc-900 dark:text-white">Bs {fmtMonto(venta.subtotal)}</td>
                {puedeVerUtilidad && <td colSpan={2} />}
              </tr>
              {Number(venta.descuento_monto) > 0 && (
                <tr className="border-t border-zinc-100 dark:border-zinc-800">
                  <td colSpan={4} className="px-4 py-2 text-right text-xs text-zinc-500">Descuento ({venta.descuento_porc}%)</td>
                  <td className="px-4 py-2 font-mono text-red-500">−Bs {fmtMonto(venta.descuento_monto)}</td>
                  {puedeVerUtilidad && <td colSpan={2} />}
                </tr>
              )}
              {Number(venta.impuesto) > 0 && (
                <tr className="border-t border-zinc-100 dark:border-zinc-800">
                  <td colSpan={4} className="px-4 py-2 text-right text-xs text-zinc-500">Impuesto</td>
                  <td className="px-4 py-2 font-mono text-zinc-600 dark:text-zinc-400">Bs {fmtMonto(venta.impuesto)}</td>
                  {puedeVerUtilidad && <td colSpan={2} />}
                </tr>
              )}
              <tr className="border-t-2 border-zinc-300 dark:border-zinc-600">
                <td colSpan={4} className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-white">Total</td>
                <td className="px-4 py-3 font-mono text-base font-bold text-zinc-900 dark:text-white">Bs {fmtMonto(venta.total)}</td>
                {puedeVerUtilidad && (() => {
                  const costoTotal    = (venta.detalle ?? []).reduce((s, d) => s + Number(d.costo_unitario) * Number(d.cantidad), 0);
                  const utilidadTotal = Number(venta.total) - costoTotal;
                  const margenTotal   = Number(venta.total) > 0 ? (utilidadTotal / Number(venta.total) * 100) : 0;
                  return (
                    <>
                      <td className="px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400">Bs {fmtMonto(costoTotal)}</td>
                      <td className="px-4 py-3 font-mono font-bold">
                        <span className={utilidadTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                          Bs {fmtMonto(utilidadTotal)}
                        </span>
                        <span className="ml-1 text-xs text-zinc-400">({margenTotal.toFixed(1)}%)</span>
                      </td>
                    </>
                  );
                })()}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Cards mobile */}
        <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {(venta.detalle ?? []).map(d => {
            const utilidad = Number(d.subtotal) - (Number(d.costo_unitario) * Number(d.cantidad));
            const margen   = Number(d.subtotal) > 0 ? (utilidad / Number(d.subtotal) * 100) : 0;
            return (
              <div key={d.id_detalle} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-white leading-snug">{d.producto}</p>
                    <p className="text-[11px] font-mono text-zinc-400 mt-0.5">{d.codigo_interno}</p>
                    {d.producto_detalle && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{d.producto_detalle}</p>
                    )}
                    {(d.marca || d.modelo || d.color || d.capacidad) && (
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {[d.marca, d.modelo, d.color, d.capacidad].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <p className="font-mono font-semibold text-sm text-zinc-900 dark:text-white shrink-0">Bs {fmtMonto(d.subtotal)}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                  <span className="font-mono">{fmtMonto(d.cantidad)} u. × Bs {fmtMonto(d.precio_unitario)}</span>
                  {d.descuento_porc > 0 && <span className="text-red-400">−{d.descuento_porc}%</span>}
                  {puedeVerUtilidad && (
                    <span className={`ml-auto font-mono text-[11px] ${utilidad >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      Utilidad Bs {fmtMonto(utilidad)} ({margen.toFixed(1)}%)
                    </span>
                  )}
                </div>
                {/* Serie en mobile */}
                {d.numero_serie && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                      Serie: {d.numero_serie}
                    </span>
                    {d.imagen_serie_url ? (
                      <>
                        <button
                          onClick={() => setPreviewSerie({ url: d.imagen_serie_url, id_detalle: d.id_detalle })}
                          className="text-[10px] text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 underline">
                          ver foto
                        </button>
                        <span className="text-[10px] text-zinc-300 dark:text-zinc-600">·</span>
                        <button
                          onClick={() => { serieDetalleRef.current = d.id_detalle; serieInputRef.current?.click(); }}
                          disabled={uploadingSerie === d.id_detalle}
                          className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline">
                          {uploadingSerie === d.id_detalle ? 'subiendo…' : 'cambiar'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { serieDetalleRef.current = d.id_detalle; serieInputRef.current?.click(); }}
                        disabled={uploadingSerie === d.id_detalle}
                        className="text-[10px] text-zinc-400 hover:text-yellow-600 underline"
                      >
                        {uploadingSerie === d.id_detalle ? 'subiendo…' : '+ foto serie'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Total</p>
            <p className="font-mono font-bold text-zinc-900 dark:text-white">Bs {fmtMonto(venta.total)}</p>
          </div>
        </div>

        {/* Input hidden para subir imagen de serie */}
        <input
          ref={serieInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={e => { handleSubirSerie(e.target.files[0]); e.target.value = ''; }}
        />
      </SectionCard>

      {/* ── Cuotas ── */}
      {(venta.cuotas ?? []).length > 0 && (
        <SectionCard title="Plan de cuotas" badge={venta.cuotas.length}>

          {/* Tabla desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                  {['N°', 'Vence', 'Monto', 'Pagado', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {venta.cuotas.map(c => (
                  <tr key={c.id_cuota} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-zinc-700 dark:text-zinc-300">{c.numero_cuota}</td>
                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{fmtFechaS(c.fecha_vencimiento)}</td>
                    <td className="px-4 py-2.5 font-mono text-zinc-900 dark:text-white">Bs {fmtMonto(c.monto)}</td>
                    <td className="px-4 py-2.5 font-mono text-green-600 dark:text-green-400">Bs {fmtMonto(c.monto_pagado)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${CUOTA_BADGE[c.estado] ?? ''}`}>
                        {c.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {venta.cuotas.map(c => (
              <div key={c.id_cuota} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white font-mono">Cuota {c.numero_cuota}</p>
                    <span className={`inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-semibold ${CUOTA_BADGE[c.estado] ?? ''}`}>
                      {c.estado}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">Vence {fmtFechaS(c.fecha_vencimiento)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-semibold text-zinc-900 dark:text-white">Bs {fmtMonto(c.monto)}</p>
                  {Number(c.monto_pagado) > 0 && (
                    <p className="text-xs font-mono text-green-600 dark:text-green-400">pag. Bs {fmtMonto(c.monto_pagado)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Cobros ── */}
      {(venta.pagos ?? []).length > 0 && (
        <SectionCard title="Cobros registrados" badge={venta.pagos.length}>

          {/* Tabla desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                  {['Número', 'Fecha', 'Método', 'Monto', 'Referencia', 'Usuario', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {venta.pagos.map(p => (
                  <tr key={p.id_pago} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">{p.numero}</td>
                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtFecha(p.fecha)}</td>
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{p.metodo_pago.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-green-600 dark:text-green-400">Bs {fmtMonto(p.monto)}</td>
                    <td className="px-4 py-2.5 text-zinc-400 text-xs">{p.numero_referencia || '—'}</td>
                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 text-xs">{p.usuario_nombre}</td>
                    <td className="px-4 py-2.5">
                      {puede('anular_cobro', 'ventas') && !['ANULADA'].includes(venta.estado) && (
                        <button onClick={() => setConfirmCobroId(p.id_pago)}
                          className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {venta.pagos.map(p => (
              <div key={p.id_pago} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{p.numero}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{p.metodo_pago.replace('_', ' ')} · {p.usuario_nombre}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-semibold text-sm text-green-600 dark:text-green-400">Bs {fmtMonto(p.monto)}</p>
                    <p className="text-[11px] text-zinc-400">{fmtFecha(p.fecha)}</p>
                  </div>
                </div>
                {p.numero_referencia && (
                  <p className="text-xs text-zinc-400 mb-1">Ref: {p.numero_referencia}</p>
                )}
                {puede('anular_cobro', 'ventas') && !['ANULADA'].includes(venta.estado) && (
                  <button onClick={() => setConfirmCobroId(p.id_pago)}
                    className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">
                    Anular cobro
                  </button>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Devoluciones ── */}
      {(venta.devoluciones ?? []).length > 0 && (
        <SectionCard title="Devoluciones" badge={venta.devoluciones.length}>

          {/* Tabla desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                  {['Número', 'Fecha', 'Total', 'Motivo', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {venta.devoluciones.map(d => (
                  <tr key={d.id_devolucion} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">{d.numero}</td>
                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtFecha(d.fecha)}</td>
                    <td className="px-4 py-2.5 font-mono text-zinc-900 dark:text-white">Bs {fmtMonto(d.total)}</td>
                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 text-xs max-w-[150px] truncate">{d.motivo || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${DEV_BADGE[d.estado] ?? ''}`}>
                        {DEV_LABEL[d.estado] ?? d.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {venta.devoluciones.map(d => (
              <div key={d.id_devolucion} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-0.5">{d.numero}</p>
                    {d.motivo && <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{d.motivo}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-semibold text-sm text-zinc-900 dark:text-white">Bs {fmtMonto(d.total)}</p>
                    <span className={`inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-semibold ${DEV_BADGE[d.estado] ?? ''}`}>
                      {DEV_LABEL[d.estado] ?? d.estado}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-zinc-400">{fmtFecha(d.fecha)}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Modales ── */}

      {modal === 'emitir' && (
        <Modal titulo="Emitir venta" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Al emitir, el stock del depósito <strong className="text-zinc-900 dark:text-white">{venta.deposito_nombre}</strong> se reducirá.
              {venta.condicion_pago === 'CREDITO' && ' Se generarán cuotas y se actualizará el saldo del cliente.'}
            </p>
            <div>
              <label className={labelCls}>N° Factura (opcional)</label>
              <input type="text" value={nroFactura} onChange={e => setNroFactura(e.target.value)}
                placeholder="Ej: 00123" className={inputCls} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={accionEmitir} disabled={procesando}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {procesando ? 'Emitiendo…' : 'Confirmar emisión'}
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'cobrar' && (
        <Modal titulo="Registrar cobro" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Monto *</label>
                <input type="number" min={0.01} step="0.01" value={cobro.monto}
                  onChange={e => setCobro(p => ({ ...p, monto: e.target.value }))}
                  className={inputCls} />
                <p className="text-xs text-zinc-400 mt-1">Saldo: Bs {fmtMonto(venta.saldo_pendiente)}</p>
              </div>
              <div>
                <label className={labelCls}>Método de pago *</label>
                <select value={cobro.metodo_pago} onChange={e => setCobro(p => ({ ...p, metodo_pago: e.target.value }))}
                  className={inputCls}>
                  {['EFECTIVO','TRANSFERENCIA','QR','CHEQUE','TARJETA_DEBITO','TARJETA_CREDITO','OTRO'].map(m => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            {(venta.cuotas ?? []).length > 0 && (
              <div>
                <label className={labelCls}>Aplicar a cuota</label>
                <select
                  value={cobro.id_cuota}
                  onChange={e => {
                    const idCuota = e.target.value;
                    const cuota = venta.cuotas.find(c => String(c.id_cuota) === idCuota);
                    const pendiente = cuota ? +(Number(cuota.monto) - Number(cuota.monto_pagado)).toFixed(2) : null;
                    setCobro(p => ({
                      ...p,
                      id_cuota: idCuota,
                      monto: pendiente != null ? String(pendiente) : String(venta.saldo_pendiente),
                    }));
                  }}
                  className={inputCls}>
                  <option value="">— ninguna —</option>
                  {venta.cuotas.filter(c => c.estado !== 'PAGADA').map(c => (
                    <option key={c.id_cuota} value={c.id_cuota}>
                      Cuota {c.numero_cuota} — Bs {fmtMonto(c.monto - c.monto_pagado)} pendiente (vence {fmtFechaS(c.fecha_vencimiento)})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>N° Referencia</label>
              <input type="text" value={cobro.numero_referencia} onChange={e => setCobro(p => ({ ...p, numero_referencia: e.target.value }))}
                className={inputCls} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={accionCobrar} disabled={procesando}
                className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {procesando ? 'Guardando…' : 'Confirmar cobro'}
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'anular' && (
        <Modal titulo="Anular venta" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ¿Confirmás la anulación de <strong className="text-zinc-900 dark:text-white">{venta.numero}</strong>?
              {['EMITIDA', 'PARCIAL'].includes(venta.estado) && ' El stock será reintegrado al depósito.'}
              {venta.estado === 'PARCIAL'
                ? ` Se cancelará la deuda pendiente (Bs ${fmtMonto(venta.saldo_pendiente)}) y se revertirán los cobros realizados (Bs ${fmtMonto(Number(venta.total) - Number(venta.saldo_pendiente))}).`
                : Number(venta.saldo_pendiente) > 0
                  ? ` Se revertirán Bs ${fmtMonto(venta.saldo_pendiente)} del saldo del cliente.`
                  : ''
              }
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={accionAnular} disabled={procesando}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {procesando ? 'Anulando…' : 'Confirmar anulación'}
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'devolucion' && (
        <Modal titulo="Crear devolución" onClose={() => setModal(null)}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className={labelCls}>Motivo general</label>
              <input type="text" value={devMotivo} onChange={e => setDevMotivo(e.target.value)}
                placeholder="Ej: Producto defectuoso" className={inputCls} />
            </div>
            <p className={labelCls}>Productos a devolver</p>
            {devItems.map((it, i) => (
              <div key={i} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2.5">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{it.producto}</p>
                  <p className="text-xs text-zinc-400">Vendido: {fmtMonto(it.cantidad_original)} u.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1 block">Cantidad</label>
                    <input type="number" min={0} max={it.cantidad_original} step="0.01" value={it.cantidad}
                      onChange={e => setDevItems(p => p.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1 block">Motivo</label>
                    <input type="text" value={it.motivo}
                      onChange={e => setDevItems(p => p.map((x, j) => j === i ? { ...x, motivo: e.target.value } : x))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400" />
                  </div>
                </div>
              </div>
            ))}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={accionDevolucion} disabled={procesando}
                className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {procesando ? 'Creando…' : 'Crear devolución'}
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmCobroId && (
        <Modal titulo="Anular cobro" onClose={() => setConfirmCobroId(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ¿Confirmás la anulación de este cobro? El saldo de la venta y del cliente serán revertidos.
            </p>
            <div className="flex gap-2">
              <button onClick={accionAnularCobro}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors">
                Confirmar
              </button>
              <button onClick={() => setConfirmCobroId(null)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {pageError && (
        <Modal titulo="Error" onClose={() => setPageError('')}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{pageError}</p>
            <button onClick={() => setPageError('')}
              className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition-colors">
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {previewSerie && (
        <Modal titulo="Foto de número de serie" onClose={() => setPreviewSerie(null)}>
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center min-h-32">
              <img
                src={`${backendBase}${previewSerie.url}`}
                alt="N° de serie"
                className="max-h-72 w-full object-contain"
              />
            </div>
            <label className="flex items-center justify-center gap-2 cursor-pointer w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    serieDetalleRef.current = previewSerie.id_detalle;
                    handleSubirSerie(file);
                    setPreviewSerie(null);
                  }
                  e.target.value = '';
                }}
              />
              Cambiar foto
            </label>
          </div>
        </Modal>
      )}

      {modalSeries && (
        <Modal titulo="Fotos de número de serie" onClose={() => setModalSeries(false)}>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Subí la foto del número de serie para cada producto. Podés hacerlo ahora o más tarde desde el detalle de la venta.
            </p>
            {(venta?.detalle ?? []).filter(d => d.numero_serie).map(d => (
              <div key={d.id_detalle} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white leading-snug">{d.producto}</p>
                  <span className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded inline-block mt-0.5">
                    S/N: {d.numero_serie}
                  </span>
                </div>
                {(d.imagen_serie_url || seriesDone[d.id_detalle]) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Foto subida</span>
                    {d.imagen_serie_url && (
                      <button
                        onClick={() => setPreviewSerie({ url: d.imagen_serie_url, id_detalle: d.id_detalle })}
                        className="text-[11px] text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 underline">
                        ver foto
                      </button>
                    )}
                    <label className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline cursor-pointer">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) handleSubirSerieModal(d.id_detalle, file);
                          e.target.value = '';
                        }}
                      />
                      cambiar
                    </label>
                  </div>
                ) : (
                  <label className={`flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border-2 border-dashed transition-colors ${
                    seriesUploading[d.id_detalle]
                      ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10'
                      : 'border-zinc-300 dark:border-zinc-600 hover:border-yellow-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      disabled={!!seriesUploading[d.id_detalle]}
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) handleSubirSerieModal(d.id_detalle, file);
                        e.target.value = '';
                      }}
                    />
                    {seriesUploading[d.id_detalle] ? (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Subiendo…</span>
                    ) : (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Seleccionar foto <span className="text-zinc-400 dark:text-zinc-500">(jpg, png, webp · máx. 5 MB)</span>
                      </span>
                    )}
                  </label>
                )}
              </div>
            ))}
            <button onClick={() => setModalSeries(false)}
              className="w-full mt-2 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Cerrar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
