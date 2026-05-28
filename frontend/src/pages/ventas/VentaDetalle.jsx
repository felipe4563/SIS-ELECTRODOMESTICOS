import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ventasService } from '../../services/ventas.service';
import { usePermission } from '../../hooks/usePermission';

const fmtFecha  = s => s ? new Date(s).toLocaleString('es-BO')  : '—';
const fmtFechaS = s => s ? new Date(s).toLocaleDateString('es-BO') : '—';
const fmtMonto  = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const ESTADO_BADGE = {
  BORRADOR: { label: 'Borrador',  cls: 'bg-zinc-100  text-zinc-600  dark:bg-zinc-800  dark:text-zinc-400' },
  EMITIDA:  { label: 'Emitida',   cls: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400' },
  PAGADA:   { label: 'Pagada',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  PARCIAL:  { label: 'Parcial',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500' },
  ANULADA:  { label: 'Anulada',   cls: 'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400' },
  DEVUELTA: { label: 'Devuelta',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
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

export default function VentaDetalle() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { puede } = usePermission();

  const [venta,     setVenta]     = useState(null);
  const [cargando,  setCargando]  = useState(true);
  const [modal,     setModal]     = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error,     setError]     = useState('');

  // Cobro form
  const [cobro, setCobro] = useState({ metodo_pago: 'EFECTIVO', monto: '', numero_referencia: '', observaciones: '', id_cuota: '' });
  // Emit form
  const [nroFactura, setNroFactura] = useState('');
  // Devolucion form
  const [devItems,  setDevItems]  = useState([]);
  const [devMotivo, setDevMotivo] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await ventasService.getOne(id);
      setVenta(res.data);
    } catch { navigate('/ventas'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [id]); // eslint-disable-line

  // Initialize devolucion items from venta detail
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
  }, [venta?.detalle?.length]); // eslint-disable-line

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

  const accionDevolucionEstado = async (id_devolucion, accion) => {
    setProcesando(true);
    try {
      if (accion === 'aprobar') await ventasService.aprobarDevolucion(id_devolucion);
      else await ventasService.rechazarDevolucion(id_devolucion);
      await cargar();
    } catch (err) {
      alert(err.response?.data?.mensaje ?? 'Error');
    } finally { setProcesando(false); }
  };

  const anularCobro = async (id_pago) => {
    if (!confirm('¿Anular este cobro?')) return;
    try {
      await ventasService.anularCobro(id_pago);
      await cargar();
    } catch (err) {
      alert(err.response?.data?.mensaje ?? 'Error al anular cobro');
    }
  };

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!venta)   return null;

  const badge = ESTADO_BADGE[venta.estado] ?? { label: venta.estado, cls: 'bg-zinc-100 text-zinc-600' };
  const clienteNombre = venta.cliente_razon || `${venta.cliente_nombres ?? ''} ${venta.cliente_apellidos ?? ''}`.trim();

  const puedeEditar    = puede('editar_borrador', 'ventas') && venta.estado === 'BORRADOR';
  const puedeEmitir    = puede('emitir', 'ventas') && venta.estado === 'BORRADOR';
  const puedeCobrar    = puede('cobrar', 'ventas') && ['EMITIDA', 'PARCIAL'].includes(venta.estado);
  const puedeAnular    = puede('anular', 'ventas') && !['ANULADA', 'DEVUELTA'].includes(venta.estado);
  const puedeDevolver  = puede('devolucion_crear', 'ventas') && ['EMITIDA', 'PARCIAL', 'PAGADA'].includes(venta.estado);
  const puedeImprimir  = puede('imprimir', 'ventas') && venta.estado !== 'BORRADOR';
  const puedePreview   = venta.estado === 'BORRADOR';

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <button onClick={() => navigate('/ventas')} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mb-1">
            ← Ventas
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">{venta.numero}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
              {badge.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${venta.tipo_venta === 'MAYOR' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
              {venta.tipo_venta === 'MAYOR' ? 'Mayor' : 'Menor'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedePreview && (
            <button onClick={() => navigate(`/ventas/${id}/imprimir`)}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors">
              Vista previa
            </button>
          )}
          {puedeImprimir && (
            <button onClick={() => navigate(`/ventas/${id}/imprimir`)}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors">
              Imprimir
            </button>
          )}
          {puedeEditar && (
            <button onClick={() => navigate(`/ventas/${id}/editar`)}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors">
              Editar
            </button>
          )}
          {puedeEmitir && (
            <button onClick={() => { setError(''); setModal('emitir'); }}
              className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors">
              Emitir venta
            </button>
          )}
          {puedeCobrar && (
            <button onClick={() => { setError(''); setCobro(p => ({ ...p, monto: String(venta.saldo_pendiente) })); setModal('cobrar'); }}
              className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors">
              Registrar cobro
            </button>
          )}
          {puedeDevolver && (
            <button onClick={() => { setError(''); setModal('devolucion'); }}
              className="px-4 py-2 rounded-xl border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-semibold text-sm transition-colors">
              Devolución
            </button>
          )}
          {puedeAnular && (
            <button onClick={() => { setError(''); setModal('anular'); }}
              className="px-4 py-2 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold text-sm transition-colors">
              Anular
            </button>
          )}
        </div>
      </div>

      {/* Info general */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Cliente',     value: clienteNombre },
          { label: 'Sucursal',    value: venta.sucursal_nombre },
          { label: 'Depósito',    value: venta.deposito_nombre },
          { label: 'Vendedor',    value: venta.vendedor_nombre },
          { label: 'Fecha',       value: fmtFecha(venta.fecha) },
          { label: 'Condición',   value: venta.condicion_pago === 'CREDITO' ? `Crédito (${venta.dias_credito} días)` : 'Contado' },
          { label: 'Total',       value: `Bs ${fmtMonto(venta.total)}` },
          { label: 'Saldo',       value: `Bs ${fmtMonto(venta.saldo_pendiente)}`, highlight: Number(venta.saldo_pendiente) > 0 },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{label}</p>
            <p className={`text-sm font-medium ${highlight ? 'text-yellow-600 dark:text-yellow-400' : 'text-zinc-900 dark:text-white'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Detalle productos */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Productos</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                {['Producto', 'Cant.', 'Precio unit.', 'Desc %', 'Subtotal'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(venta.detalle ?? []).map(d => (
                <tr key={d.id_detalle}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900 dark:text-white">{d.producto}</p>
                    <p className="text-[11px] font-mono text-zinc-400">{d.codigo_interno}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">{fmtMonto(d.cantidad)}</td>
                  <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">Bs {fmtMonto(d.precio_unitario)}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{d.descuento_porc > 0 ? `${d.descuento_porc}%` : '—'}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-white">Bs {fmtMonto(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-zinc-700 dark:text-zinc-300">Subtotal</td>
                <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-white">Bs {fmtMonto(venta.subtotal)}</td>
              </tr>
              {Number(venta.descuento_monto) > 0 && (
                <tr className="border-t border-zinc-100 dark:border-zinc-800">
                  <td colSpan={4} className="px-4 py-2 text-right text-sm text-zinc-500">Descuento ({venta.descuento_porc}%)</td>
                  <td className="px-4 py-2 font-mono text-red-500">-Bs {fmtMonto(venta.descuento_monto)}</td>
                </tr>
              )}
              {Number(venta.impuesto) > 0 && (
                <tr className="border-t border-zinc-100 dark:border-zinc-800">
                  <td colSpan={4} className="px-4 py-2 text-right text-sm text-zinc-500">Impuesto</td>
                  <td className="px-4 py-2 font-mono text-zinc-600 dark:text-zinc-400">Bs {fmtMonto(venta.impuesto)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-zinc-300 dark:border-zinc-600">
                <td colSpan={4} className="px-4 py-3 text-right text-base font-bold text-zinc-900 dark:text-white">Total</td>
                <td className="px-4 py-3 font-mono text-base font-bold text-zinc-900 dark:text-white">Bs {fmtMonto(venta.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Cuotas */}
      {(venta.cuotas ?? []).length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Plan de cuotas</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                {['N°', 'Vence', 'Monto', 'Pagado', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {venta.cuotas.map(c => (
                <tr key={c.id_cuota}>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{c.numero_cuota}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{fmtFechaS(c.fecha_vencimiento)}</td>
                  <td className="px-4 py-2 font-mono">Bs {fmtMonto(c.monto)}</td>
                  <td className="px-4 py-2 font-mono text-green-600 dark:text-green-400">Bs {fmtMonto(c.monto_pagado)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${CUOTA_BADGE[c.estado] ?? ''}`}>
                      {c.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagos */}
      {(venta.pagos ?? []).length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Cobros registrados</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                {['Número', 'Fecha', 'Método', 'Monto', 'Referencia', 'Usuario', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {venta.pagos.map(p => (
                <tr key={p.id_pago}>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-700 dark:text-zinc-300">{p.numero}</td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtFecha(p.fecha)}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{p.metodo_pago.replace('_', ' ')}</td>
                  <td className="px-4 py-2 font-mono font-semibold text-green-600 dark:text-green-400">Bs {fmtMonto(p.monto)}</td>
                  <td className="px-4 py-2 text-zinc-400 text-xs">{p.numero_referencia || '—'}</td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400 text-xs">{p.usuario_nombre}</td>
                  <td className="px-4 py-2">
                    {puede('anular_cobro', 'ventas') && !['ANULADA'].includes(venta.estado) && (
                      <button onClick={() => anularCobro(p.id_pago)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors">
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Devoluciones */}
      {(venta.devoluciones ?? []).length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Devoluciones</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                {['Número', 'Fecha', 'Total', 'Motivo', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {venta.devoluciones.map(d => (
                <tr key={d.id_devolucion}>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-700 dark:text-zinc-300">{d.numero}</td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtFecha(d.fecha)}</td>
                  <td className="px-4 py-2 font-mono text-zinc-900 dark:text-white">Bs {fmtMonto(d.total)}</td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400 text-xs max-w-[150px] truncate">{d.motivo || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${DEV_BADGE[d.estado] ?? ''}`}>
                      {d.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {d.estado === 'PENDIENTE' && puede('devolucion_aprobar', 'ventas') && (
                      <div className="flex gap-2">
                        <button onClick={() => accionDevolucionEstado(d.id_devolucion, 'aprobar')} disabled={procesando}
                          className="text-xs text-green-600 hover:text-green-700 font-semibold">Aprobar</button>
                        <button onClick={() => accionDevolucionEstado(d.id_devolucion, 'rechazar')} disabled={procesando}
                          className="text-xs text-red-500 hover:text-red-600 font-semibold">Rechazar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modales ── */}

      {/* Emitir */}
      {modal === 'emitir' && (
        <Modal titulo="Emitir venta" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Al emitir, el stock del depósito <strong>{venta.deposito_nombre}</strong> se reducirá.
              {venta.condicion_pago === 'CREDITO' && ' Se generarán cuotas y se actualizará el saldo del cliente.'}
            </p>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">N° Factura (opcional)</label>
              <input type="text" value={nroFactura} onChange={e => setNroFactura(e.target.value)}
                placeholder="Ej: 00123"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={accionEmitir} disabled={procesando}
                className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {procesando ? 'Emitiendo…' : 'Confirmar emisión'}
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cobrar */}
      {modal === 'cobrar' && (
        <Modal titulo="Registrar cobro" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Monto *</label>
                <input type="number" min={0.01} step="0.01" value={cobro.monto}
                  onChange={e => setCobro(p => ({ ...p, monto: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                <p className="text-xs text-zinc-400 mt-0.5">Saldo: Bs {fmtMonto(venta.saldo_pendiente)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Método de pago *</label>
                <select value={cobro.metodo_pago} onChange={e => setCobro(p => ({ ...p, metodo_pago: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400">
                  {['EFECTIVO','TRANSFERENCIA','QR','CHEQUE','TARJETA_DEBITO','TARJETA_CREDITO','OTRO'].map(m => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            {(venta.cuotas ?? []).length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Aplicar a cuota</label>
                <select value={cobro.id_cuota} onChange={e => setCobro(p => ({ ...p, id_cuota: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400">
                  <option value="">— ninguna —</option>
                  {venta.cuotas.filter(c => c.estado !== 'PAGADA').map(c => (
                    <option key={c.id_cuota} value={c.id_cuota}>
                      Cuota {c.numero_cuota} — Bs {fmtMonto(c.monto)} (vence {fmtFechaS(c.fecha_vencimiento)})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">N° Referencia</label>
              <input type="text" value={cobro.numero_referencia} onChange={e => setCobro(p => ({ ...p, numero_referencia: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={accionCobrar} disabled={procesando}
                className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {procesando ? 'Guardando…' : 'Confirmar cobro'}
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Anular */}
      {modal === 'anular' && (
        <Modal titulo="Anular venta" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ¿Confirmás la anulación de la venta <strong>{venta.numero}</strong>?
              {['EMITIDA', 'PARCIAL'].includes(venta.estado) && ' El stock será reintegrado al depósito.'}
              {Number(venta.saldo_pendiente) > 0 && ` Se revertirán Bs ${fmtMonto(venta.saldo_pendiente)} del saldo del cliente.`}
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={accionAnular} disabled={procesando}
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

      {/* Devolución */}
      {modal === 'devolucion' && (
        <Modal titulo="Crear devolución" onClose={() => setModal(null)}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Motivo general</label>
              <input type="text" value={devMotivo} onChange={e => setDevMotivo(e.target.value)}
                placeholder="Ej: Producto defectuoso"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Productos a devolver:</p>
            {devItems.map((it, i) => (
              <div key={i} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{it.producto}</p>
                <p className="text-xs text-zinc-400">Vendido: {fmtMonto(it.cantidad_original)} u.</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Cantidad a devolver</label>
                    <input type="number" min={0} max={it.cantidad_original} step="0.01" value={it.cantidad}
                      onChange={e => setDevItems(p => p.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Motivo</label>
                    <input type="text" value={it.motivo}
                      onChange={e => setDevItems(p => p.map((x, j) => j === i ? { ...x, motivo: e.target.value } : x))}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400" />
                  </div>
                </div>
              </div>
            ))}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={accionDevolucion} disabled={procesando}
                className="flex-1 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {procesando ? 'Creando…' : 'Crear devolución'}
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
