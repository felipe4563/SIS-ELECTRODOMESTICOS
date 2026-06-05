import { useState, useEffect, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { comprasService } from '../../services/compras.service';
import { monedasService }  from '../../services/configuracion.service';
import { usePermission }   from '../../hooks/usePermission';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtFecha  = s => s ? new Date(s).toLocaleDateString('es-BO') : '—';
const fmtDT     = s => s ? new Date(s).toLocaleString('es-BO', { dateStyle:'short', timeStyle:'short' }) : '—';
const fmtMonto  = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fmtNum    = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 4 });

const ESTADO_BADGE = {
  PRE_PEDIDO: { label: 'Pre-pedido', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  POR_LLEGAR: { label: 'Por llegar', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  CONFIRMADO: { label: 'Confirmado', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  PARCIAL:    { label: 'Parcial',    cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  RECIBIDO:   { label: 'Recibido',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ANULADO:    { label: 'Anulado',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const CUOTA_BADGE = {
  PENDIENTE: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  PARCIAL:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  PAGADA:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  VENCIDA:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ── Modal base ────────────────────────────────────────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">{titulo}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Modal Confirmar ───────────────────────────────────────────────────────────
function ModalConfirmar({ onConfirm, onClose, loading, error }) {
  const [form, setForm] = useState({ condicion_pago: 'CONTADO', dias_credito: '30', num_cuotas: '1' });
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Modal titulo="Confirmar pedido → Por llegar" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Condición de pago</label>
          <select value={form.condicion_pago} onChange={e => setF('condicion_pago', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Crédito</option>
          </select>
        </div>
        {form.condicion_pago === 'CREDITO' && (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Días de crédito</label>
              <input type="number" min="1" value={form.dias_credito}
                onChange={e => setF('dias_credito', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Número de cuotas</label>
              <input type="number" min="1" max="24" value={form.num_cuotas}
                onChange={e => setF('num_cuotas', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
            </div>
          </>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button onClick={() => onConfirm(form)} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Confirmando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal Recibir ─────────────────────────────────────────────────────────────
function ModalRecibir({ detalle, onConfirm, onClose, loading, error }) {
  const pendientes = detalle.filter(d =>
    Number(d.cantidad_recibida) < Number(d.cantidad)
  );
  const [recs, setRecs] = useState(() =>
    pendientes.map(d => ({
      id_detalle: d.id_detalle,
      id_producto: d.id_producto,
      cantidad_recibida: +(Number(d.cantidad) - Number(d.cantidad_recibida)).toFixed(4),
      codigo_barras: d.codigo_barras || (d.id_producto != null ? `BC${String(d.id_producto).padStart(8, '0')}` : ''),
      barras_existente: !!d.codigo_barras,
    }))
  );
  const [obs, setObs] = useState('');

  const setRec = (idx, val) => setRecs(prev =>
    prev.map((r, i) => i === idx ? { ...r, cantidad_recibida: val } : r)
  );
  const setBarras = (idx, val) => setRecs(prev =>
    prev.map((r, i) => i === idx ? { ...r, codigo_barras: val } : r)
  );

  return (
    <Modal titulo="Recibir mercadería" onClose={onClose}>
      <div className="space-y-4">
        {pendientes.length === 0 ? (
          <p className="text-sm text-zinc-500">Todos los productos ya fueron recibidos.</p>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {pendientes.map((d, idx) => {
              const maxPend = +(Number(d.cantidad) - Number(d.cantidad_recibida)).toFixed(4);
              return (
                <div key={d.id_detalle} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{d.producto}</p>
                  <p className="text-xs text-zinc-500 mb-2 font-mono">{d.codigo_interno}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-[11px] text-zinc-500 mb-1">
                        Pedido: {fmtNum(d.cantidad)} — Ya recibido: {fmtNum(d.cantidad_recibida)} — Pendiente: <span className="font-semibold text-orange-600">{fmtNum(maxPend)}</span>
                      </p>
                      <input
                        type="number" min="0" max={maxPend} step="0.01"
                        value={recs[idx]?.cantidad_recibida ?? 0}
                        onChange={e => setRec(idx, Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    <span className="text-xs text-zinc-400 whitespace-nowrap">{d.unidad_codigo}</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-[11px] text-zinc-500 mb-1">Código de barras</p>
                    {recs[idx]?.barras_existente ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                          {recs[idx].codigo_barras}
                        </span>
                        <span className="text-[10px] text-blue-500">del proveedor</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={recs[idx]?.codigo_barras ?? ''}
                        onChange={e => setBarras(idx, e.target.value)}
                        placeholder="Escanear o dejar generado"
                        className="w-full px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Observaciones</label>
          <input type="text" value={obs} onChange={e => setObs(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button onClick={() => onConfirm({
              recepciones: recs.map(({ id_detalle, cantidad_recibida }) => ({ id_detalle, cantidad_recibida })),
              observaciones: obs,
              codigos_barras: recs
                .filter(r => r.id_producto != null && r.codigo_barras?.trim())
                .map(({ id_producto, codigo_barras }) => ({ id_producto, codigo_barras })),
            })}
            disabled={loading || pendientes.length === 0}
            className="flex-1 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Guardando…' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal Pagar ───────────────────────────────────────────────────────────────
function ModalPagar({ cuotas, monedas, saldoPendiente, onConfirm, onClose, loading, error }) {
  const HOY = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    metodo_pago: 'EFECTIVO', id_moneda: '', tipo_cambio: '1',
    monto: String(+Number(saldoPendiente).toFixed(2)),
    id_cuota: '', numero_referencia: '', observaciones: '', fecha: HOY,
  });
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const cuotasPendientes = cuotas.filter(c => c.estado !== 'PAGADA');

  const METODOS = ['EFECTIVO','TRANSFERENCIA','QR','CHEQUE','TARJETA','OTRO'];

  return (
    <Modal titulo="Registrar pago" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Método de pago</label>
            <select value={form.metodo_pago} onChange={e => setF('metodo_pago', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Fecha</label>
            <input type="date" value={form.fecha} onChange={e => setF('fecha', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Moneda</label>
            <select value={form.id_moneda} onChange={e => setF('id_moneda', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">— Seleccionar —</option>
              {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.codigo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Monto (saldo: {fmtMonto(saldoPendiente)})
            </label>
            <input type="number" min="0.01" step="0.01" value={form.monto}
              onChange={e => setF('monto', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
          </div>
        </div>

        {cuotasPendientes.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Aplicar a cuota (opcional)</label>
            <select value={form.id_cuota} onChange={e => setF('id_cuota', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">Sin cuota específica</option>
              {cuotasPendientes.map(c => (
                <option key={c.id_cuota} value={c.id_cuota}>
                  Cuota {c.numero_cuota} — {fmtFecha(c.fecha_vencimiento)} — {fmtMonto(c.monto)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Nº referencia / comprobante</label>
          <input type="text" value={form.numero_referencia} onChange={e => setF('numero_referencia', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Observaciones</label>
          <input type="text" value={form.observaciones} onChange={e => setF('observaciones', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button onClick={() => onConfirm(form)} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Guardando…' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CompraDetalle() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { puede } = usePermission();

  const [data,     setData]     = useState(null);
  const [monedas,  setMonedas]  = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab,      setTab]      = useState('productos'); // productos | cuotas | pagos
  const [modal,    setModal]    = useState(null); // confirmar | recibir | pagar | anular
  const [saving,   setSaving]   = useState(false);
  const [modalErr, setModalErr] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await comprasService.getOne(id);
      setData(res.data);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  };

  useEffect(() => {
    cargar();
    monedasService.getAll().then(r => setMonedas(r.data.monedas ?? r.data ?? [])).catch(() => {});
  }, []); // eslint-disable-line

  const openModal = m => { setModalErr(''); setModal(m); };
  const closeModal = () => { setModal(null); setModalErr(''); };

  const runAction = async (fn) => {
    setSaving(true);
    setModalErr('');
    try {
      await fn();
      closeModal();
      cargar();
    } catch (e) {
      setModalErr(e?.response?.data?.error ?? 'Error al procesar la acción');
    } finally {
      setSaving(false);
    }
  };

  const handleRecibir = async (payload) => {
    setSaving(true);
    setModalErr('');
    try {
      await comprasService.recibir(id, payload);
      setModal(null);
      const productosRecibidos = payload.recepciones
        .filter(r => Number(r.cantidad_recibida) > 0)
        .map(r => {
          const det = detalle.find(d => d.id_detalle === r.id_detalle);
          return {
            nombre: det?.producto || '',
            codigo_interno: det?.codigo_interno || '',
            copias: 1,
          };
        })
        .filter(p => p.codigo_interno);
      cargar();
      if (productosRecibidos.length > 0) {
        navigate(`/compras/${id}/etiquetas`, { state: { etiquetas: productosRecibidos } });
      }
    } catch (e) {
      setModalErr(e?.response?.data?.error ?? 'Error al recibir mercadería');
    } finally {
      setSaving(false);
    }
  };

  if (cargando) return <div className="flex items-center justify-center py-20 text-zinc-400">Cargando…</div>;
  if (!data)    return <div className="flex items-center justify-center py-20 text-zinc-400">Compra no encontrada</div>;

  const { compra, detalle, cuotas, pagos } = data;
  const badge = ESTADO_BADGE[compra.estado] ?? { label: compra.estado, cls: 'bg-zinc-100 text-zinc-600' };

  // Permisos de acción
  const puedeEditar    = puede('editar_pre_pedido', 'compras') && compra.estado === 'PRE_PEDIDO';
  const puedeConfirmar = puede('confirmar_pedido',  'compras') && compra.estado === 'PRE_PEDIDO';
  const puedeRecibir   = puede('recibir',            'compras') && ['POR_LLEGAR','PARCIAL'].includes(compra.estado);
  const puedePagar     = puede('pagar',              'compras') && compra.estado !== 'ANULADO' && Number(compra.saldo_pendiente) > 0;
  const puedeAnular    = puede('anular',             'compras') && !['RECIBIDO','ANULADO'].includes(compra.estado);
  const puedeAnulPago  = puede('anular_pago',        'compras');

  const etiquetasDisponibles = detalle.filter(d => d.codigo_interno);

  const handleReimprimirEtiquetas = () => {
    navigate(`/compras/${id}/etiquetas`, {
      state: {
        etiquetas: etiquetasDisponibles.map(d => ({
          nombre: d.producto,
          codigo_interno: d.codigo_interno,
          copias: 1,
        })),
      },
    });
  };

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Modales */}
      {modal === 'confirmar' && (
        <ModalConfirmar
          loading={saving} error={modalErr}
          onClose={closeModal}
          onConfirm={form => runAction(() => comprasService.confirmar(id, form))}
        />
      )}
      {modal === 'recibir' && (
        <ModalRecibir
          detalle={detalle} loading={saving} error={modalErr}
          onClose={closeModal}
          onConfirm={handleRecibir}
        />
      )}
      {modal === 'pagar' && (
        <ModalPagar
          cuotas={cuotas} monedas={monedas}
          saldoPendiente={compra.saldo_pendiente}
          loading={saving} error={modalErr}
          onClose={closeModal}
          onConfirm={form => runAction(() => comprasService.createPago(id, {
            ...form,
            id_cuota:  form.id_cuota  ? Number(form.id_cuota)  : undefined,
            id_moneda: form.id_moneda ? Number(form.id_moneda) : undefined,
            monto:     Number(form.monto),
          }))}
        />
      )}
      {modal === 'anular' && (
        <Modal titulo="Anular compra" onClose={closeModal}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            ¿Confirmas la anulación de la compra <span className="font-mono font-semibold">{compra.numero}</span>?
            Esta acción no puede deshacerse.
          </p>
          {modalErr && <p className="text-sm text-red-500 mb-3">{modalErr}</p>}
          <div className="flex gap-3">
            <button onClick={closeModal} disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button onClick={() => runAction(() => comprasService.anular(id))} disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
              {saving ? 'Anulando…' : 'Sí, anular'}
            </button>
          </div>
        </Modal>
      )}
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/compras')}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-sm">← Volver</button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-zinc-900 dark:text-white">{compra.numero}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{compra.proveedor_nombre}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2">
          {puedeEditar && (
            <button onClick={() => navigate(`/compras/${id}/editar`)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Editar
            </button>
          )}
          {puedeConfirmar && (
            <button onClick={() => openModal('confirmar')}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
              Confirmar pedido
            </button>
          )}
          {puedeRecibir && (
            <button onClick={() => openModal('recibir')}
              className="px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors">
              Recibir mercadería
            </button>
          )}
          {puedePagar && (
            <button onClick={() => openModal('pagar')}
              className="px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 text-sm font-semibold transition-colors">
              Registrar pago
            </button>
          )}
          {etiquetasDisponibles.length > 0 && (
            <button onClick={handleReimprimirEtiquetas}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              🏷️ Etiquetas
            </button>
          )}
          {puedeAnular && (
            <button onClick={() => openModal('anular')}
              className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
              Anular
            </button>
          )}
        </div>
      </div>

      {/* Info general */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
          {[
            ['Proveedor',      compra.proveedor_nombre],
            ['Sucursal',       compra.sucursal_nombre],
            ['Depósito dest.', compra.deposito_nombre],
            ['Moneda',         `${compra.moneda_codigo} (TC: ${compra.tipo_cambio})`],
            ['Condición pago', compra.condicion_pago + (compra.condicion_pago === 'CREDITO' ? ` — ${compra.dias_credito} días` : '')],
            ['Fecha pedido',   fmtFecha(compra.fecha_pedido)],
            ['Est. llegada',   fmtFecha(compra.fecha_estim_llegada)],
            ['Fecha recep.',   fmtFecha(compra.fecha_recepcion)],
            ['Creado por',     `${compra.crea_nombres} ${compra.crea_apellidos}`],
            ...(compra.numero_factura ? [['Factura prov.',  compra.numero_factura]] : []),
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">{label}</p>
              <p className="font-medium text-zinc-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm w-64">
            {[
              ['Subtotal',    fmtMonto(compra.subtotal)],
              ['Descuento',  `-${fmtMonto(compra.descuento)}`],
              ['Impuesto',   fmtMonto(compra.impuesto)],
              ['Flete',      fmtMonto(compra.flete)],
              ['Otros',      fmtMonto(compra.otros_costos)],
            ].map(([l, v]) => (
              <Fragment key={l}>
                <span className="text-zinc-500 dark:text-zinc-400">{l}</span>
                <span className="text-right font-mono text-zinc-700 dark:text-zinc-300">{v}</span>
              </Fragment>
            ))}
            <span className="font-bold text-zinc-900 dark:text-white border-t border-zinc-200 dark:border-zinc-700 pt-1">TOTAL</span>
            <span className="text-right font-bold font-mono text-zinc-900 dark:text-white border-t border-zinc-200 dark:border-zinc-700 pt-1">{fmtMonto(compra.total)}</span>
            <span className="text-zinc-500 dark:text-zinc-400">Saldo pendiente</span>
            <span className={`text-right font-mono font-semibold ${Number(compra.saldo_pendiente) > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
              {fmtMonto(compra.saldo_pendiente)}
            </span>
          </div>
        </div>

        {compra.observaciones && (
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-400 mb-1">Observaciones</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{compra.observaciones}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          {[
            { key: 'productos', label: `Productos (${detalle.length})` },
            { key: 'cuotas',    label: `Cuotas (${cuotas.length})` },
            { key: 'pagos',     label: `Pagos (${pagos.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-yellow-400 text-zinc-900 dark:text-white'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Productos */}
        {tab === 'productos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                  {['Producto', 'Cant. pedida', 'Cant. recibida', 'Pendiente', 'Precio unit.', 'Subtotal'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {detalle.map(d => {
                  const pendiente = +(Number(d.cantidad) - Number(d.cantidad_recibida)).toFixed(4);
                  return (
                    <tr key={d.id_detalle} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900 dark:text-white">{d.producto}</p>
                        <p className="text-[11px] font-mono text-zinc-400">{d.codigo_interno} · {d.marca_nombre}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{fmtNum(d.cantidad)} <span className="text-xs text-zinc-400">{d.unidad_codigo}</span></td>
                      <td className="px-4 py-3 text-right font-mono text-green-600 dark:text-green-400">{fmtNum(d.cantidad_recibida)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={pendiente > 0 ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-zinc-400'}>
                          {fmtNum(pendiente)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">{fmtMonto(d.precio_unitario)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900 dark:text-white">{fmtMonto(d.subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Cuotas */}
        {tab === 'cuotas' && (
          cuotas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-2">
              <span className="text-3xl">💳</span>
              <p className="text-sm">Sin cuotas (pago contado o compra no confirmada)</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                    {['Cuota', 'Vencimiento', 'Monto', 'Pagado', 'Saldo', 'Estado'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {cuotas.map(c => (
                    <tr key={c.id_cuota} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white">#{c.numero_cuota}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{fmtFecha(c.fecha_vencimiento)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900 dark:text-white">{fmtMonto(c.monto)}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-600 dark:text-green-400">{fmtMonto(c.monto_pagado)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-orange-600 dark:text-orange-400">
                        {fmtMonto(Math.max(0, Number(c.monto) - Number(c.monto_pagado)))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${CUOTA_BADGE[c.estado] ?? ''}`}>
                          {c.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Tab: Pagos */}
        {tab === 'pagos' && (
          pagos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-2">
              <span className="text-3xl">💰</span>
              <p className="text-sm">Sin pagos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                    {['Número', 'Fecha', 'Método', 'Monto', 'Cuota', 'Registrado por', ...(puedeAnulPago ? [''] : [])].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {pagos.map(p => (
                    <tr key={p.id_pago} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">{p.numero}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{fmtDT(p.fecha)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300">{p.metodo_pago}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-green-600 dark:text-green-400">{fmtMonto(p.monto)}</td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{p.numero_cuota ? `#${p.numero_cuota}` : '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {p.usuario_nombres} {p.usuario_apellidos}
                      </td>
                      {puedeAnulPago && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Anular pago ${p.numero}?`)) {
                                runAction(() => comprasService.anularPago(id, p.id_pago));
                              }
                            }}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            Anular
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
