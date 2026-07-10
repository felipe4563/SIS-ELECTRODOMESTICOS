import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cobrosService } from '../../services/cobros.service';
import { usePermission } from '../../hooks/usePermission';
import api from '../../api/axios';

const FMT = (n) => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FMT_FECHA = (d) => d ? new Date(d).toLocaleDateString('es-BO') : '-';
const FMT_DT = (d) => d ? new Date(d).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '-';

const METODOS = ['EFECTIVO', 'QR', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'CHEQUE', 'OTRO'];

const ESTADO_BADGE = {
  EMITIDA: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PARCIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  PAGADA:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  ANULADA: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  VENCIDA: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const FIELD = "w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-colors";

// ── Modal base ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, maxW = 'max-w-2xl' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className={`bg-white dark:bg-zinc-900 w-full ${maxW} rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]`}>
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-lg"
          >✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── Modal registrar cobro ─────────────────────────────────────────────────────
function ModalCobrar({ clienteInicial, onClose, onSuccess }) {
  const [busqueda, setBusqueda]   = useState('');
  const [clientes, setClientes]   = useState([]);
  const [cliente, setCliente]     = useState(clienteInicial || null);
  const [ventas, setVentas]       = useState([]);
  const [ventaSel, setVentaSel]   = useState(null);
  const [cuotaSel, setCuotaSel]   = useState(null);
  const [monedas, setMonedas]     = useState([]);
  const [form, setForm]           = useState({ monto: '', metodo_pago: 'EFECTIVO', id_moneda: '', numero_referencia: '', observaciones: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get('/monedas').then(r => {
      const list = r.data?.monedas ?? r.data?.data ?? (Array.isArray(r.data) ? r.data : []);
      setMonedas(list);
      const base = list.find(m => m.es_moneda_base) ?? list[0];
      if (base) setForm(f => ({ ...f, id_moneda: base.id_moneda }));
    }).catch(() => {});
    if (clienteInicial) cargarVentas(clienteInicial.id_cliente);
  }, []);

  const buscarClientes = useCallback(async (q) => {
    if (q.length < 2) { setClientes([]); return; }
    try {
      const r = await api.get('/clientes', { params: { busqueda: q, limit: 10 } });
      setClientes(r.data?.data ?? r.data ?? []);
    } catch { setClientes([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscarClientes(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargarVentas = async (id_cliente) => {
    try {
      const r = await cobrosService.getVentasPendientes(id_cliente);
      setVentas(r.data ?? []);
    } catch { setVentas([]); }
  };

  const seleccionarCliente = (c) => {
    setCliente(c);
    setClientes([]);
    setBusqueda('');
    setVentaSel(null);
    setCuotaSel(null);
    cargarVentas(c.id_cliente);
  };

  const seleccionarVenta = (v) => {
    setVentaSel(v);
    setCuotaSel(null);
    setForm(f => ({ ...f, monto: String(v.saldo_pendiente) }));
  };

  const seleccionarCuota = (c) => {
    setCuotaSel(c);
    setForm(f => ({ ...f, monto: String(Number(c.monto) - Number(c.monto_pagado)) }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!cliente)          return setError('Seleccione un cliente');
    if (!ventaSel)         return setError('Seleccione una venta');
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) return setError('Ingrese un monto válido');
    if (!form.id_moneda)   return setError('Seleccione una moneda');
    setGuardando(true);
    try {
      await cobrosService.registrar({
        id_venta:          ventaSel.id_venta,
        id_cuota:          cuotaSel?.id_cuota || null,
        id_cliente:        cliente.id_cliente,
        metodo_pago:       form.metodo_pago,
        id_moneda:         form.id_moneda,
        monto:             Number(form.monto),
        numero_referencia: form.numero_referencia || null,
        observaciones:     form.observaciones || null,
      });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.error ?? 'Error al registrar cobro');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal title="Registrar cobro" onClose={onClose}>
      {!cliente ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Buscar cliente</p>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Nombre, NIT/CI, razón social…"
            autoFocus
            className={FIELD}
          />
          {clientes.length > 0 && (
            <ul className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {clientes.map(c => (
                <li key={c.id_cliente}>
                  <button
                    onClick={() => seleccionarCliente(c)}
                    className="w-full text-left px-4 py-3 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors group"
                  >
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                      {c.razon_social || `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim()}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{c.tipo_documento}: {c.documento} · {c.celular}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {busqueda.length >= 2 && clientes.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-4">Sin resultados para «{busqueda}»</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-xl bg-yellow-50 dark:bg-yellow-900/10 px-4 py-3 border border-yellow-200 dark:border-yellow-800">
            <div>
              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide mb-0.5">Cliente</p>
              <p className="font-bold text-zinc-900 dark:text-white text-sm">
                {cliente.razon_social || `${cliente.nombres ?? ''} ${cliente.apellidos ?? ''}`.trim()}
              </p>
              <p className="text-xs text-zinc-500">{cliente.tipo_documento}: {cliente.documento}</p>
            </div>
            <button
              onClick={() => { setCliente(null); setVentaSel(null); setCuotaSel(null); setVentas([]); }}
              className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline font-semibold shrink-0 ml-3"
            >
              Cambiar
            </button>
          </div>

          {ventas.length === 0 ? (
            <div className="text-center py-6 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-400">Este cliente no tiene ventas con saldo pendiente</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Ventas pendientes</p>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5">
                {ventas.map(v => (
                  <button
                    key={v.id_venta}
                    onClick={() => seleccionarVenta(v)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                      ventaSel?.id_venta === v.id_venta
                        ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/15 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-yellow-300 dark:hover:border-yellow-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-200">{v.numero}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        v.condicion_pago === 'CREDITO'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      }`}>{v.condicion_pago}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-zinc-500">{FMT_FECHA(v.fecha)}</span>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400">Bs {FMT(v.saldo_pendiente)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {ventaSel && ventaSel.condicion_pago === 'CREDITO' && (ventaSel.cuotas ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                Cuota a pagar <span className="normal-case font-normal">(opcional)</span>
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                {ventaSel.cuotas.map(c => (
                  <button
                    key={c.id_cuota}
                    onClick={() => seleccionarCuota(c)}
                    className={`w-full text-left rounded-xl border px-4 py-2.5 transition-all ${
                      cuotaSel?.id_cuota === c.id_cuota
                        ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/15'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-yellow-300 dark:hover:border-yellow-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Cuota {c.numero_cuota}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ESTADO_BADGE[c.estado] ?? ''}`}>{c.estado}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 text-xs text-zinc-500">
                      <span>Vence: {FMT_FECHA(c.fecha_vencimiento)}</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Bs {FMT(Number(c.monto) - Number(c.monto_pagado))}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {ventaSel && (
            <div className="space-y-3 pt-1">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Detalle del cobro</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Monto *</label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={form.monto}
                    onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                    className={FIELD}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Método de pago *</label>
                  <select value={form.metodo_pago} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))} className={FIELD}>
                    {METODOS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Moneda *</label>
                  <select value={form.id_moneda} onChange={e => setForm(f => ({ ...f, id_moneda: e.target.value }))} className={FIELD}>
                    <option value="">Seleccione…</option>
                    {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.codigo} – {m.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">N° Referencia</label>
                  <input
                    value={form.numero_referencia}
                    onChange={e => setForm(f => ({ ...f, numero_referencia: e.target.value }))}
                    placeholder="Opcional"
                    className={FIELD}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Observaciones</label>
                  <textarea
                    rows={2} value={form.observaciones}
                    onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                    className={`${FIELD} resize-none`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <span className="text-red-500 text-sm">⚠</span>
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-zinc-100 dark:border-zinc-800">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          Cancelar
        </button>
        {ventaSel && (
          <button
            onClick={handleSubmit}
            disabled={guardando}
            className="px-5 py-2 rounded-xl bg-yellow-400 text-zinc-900 text-sm font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardando ? 'Grabando…' : 'Grabar cobro'}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ── Modal editar cobro ────────────────────────────────────────────────────────
function ModalEditar({ pago, onClose, onSuccess }) {
  const [form, setForm]           = useState({ numero_referencia: pago.numero_referencia ?? '', observaciones: pago.observaciones ?? '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async () => {
    setError('');
    setGuardando(true);
    try {
      await cobrosService.update(pago.id_pago, form);
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.error ?? 'Error al actualizar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal title={`Modificar cobro ${pago.numero}`} onClose={onClose} maxW="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">N° Referencia</label>
          <input
            value={form.numero_referencia}
            onChange={e => setForm(f => ({ ...f, numero_referencia: e.target.value }))}
            className={FIELD}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Observaciones</label>
          <textarea
            rows={3}
            value={form.observaciones}
            onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
            className={`${FIELD} resize-none`}
          />
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <span className="text-red-500 text-sm">⚠</span>
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-zinc-100 dark:border-zinc-800">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={guardando}
          className="px-5 py-2 rounded-xl bg-yellow-400 text-zinc-900 text-sm font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </Modal>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Cobros() {
  const navigate = useNavigate();
  const { puede } = usePermission();

  const [tab, setTab]             = useState('cobros');
  const [cobros, setCobros]       = useState([]);
  const [cuentas, setCuentas]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const LIMIT = 20;

  const [filtros, setFiltros] = useState({ busqueda: '', tipo: '', estado: '', fecha_desde: '', fecha_hasta: '' });
  const [cuentaBusqueda, setCuentaBusqueda] = useState('');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const [loading, setLoading]               = useState(false);
  const [modalCobrar, setModalCobrar]       = useState(false);
  const [clienteInicialModal, setClienteInicialModal] = useState(null);
  const [modalEditar, setModalEditar]       = useState(null);
  const [confirmAnular, setConfirmAnular]   = useState(null);
  const [anulando, setAnulando]             = useState(false);

  const cargarCobros = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const r = await cobrosService.getAll({ ...filtros, page: p, limit: LIMIT });
      setCobros(r.data.data ?? []);
      setTotal(r.data.total ?? 0);
      setPage(p);
    } catch { setCobros([]); }
    finally { setLoading(false); }
  }, [filtros]);

  const cargarCuentas = useCallback(async () => {
    try {
      const r = await cobrosService.getCuentasPorCobrar({ busqueda: cuentaBusqueda });
      setCuentas(r.data ?? []);
    } catch { setCuentas([]); }
  }, [cuentaBusqueda]);

  useEffect(() => { if (tab === 'cobros') cargarCobros(1); }, [tab, filtros]);
  useEffect(() => { if (tab === 'cuentas') cargarCuentas(); }, [tab, cuentaBusqueda]);

  const handleAnular = async () => {
    if (!confirmAnular) return;
    setAnulando(true);
    try {
      await cobrosService.anular(confirmAnular.id_pago);
      setConfirmAnular(null);
      cargarCobros(page);
    } catch (e) {
      alert(e.response?.data?.error ?? 'Error al anular');
    } finally { setAnulando(false); }
  };

  const onModalSuccess = () => {
    setModalCobrar(false);
    setClienteInicialModal(null);
    setModalEditar(null);
    cargarCobros(1);
    if (tab === 'cuentas') cargarCuentas();
  };

  const totalPages = Math.ceil(total / LIMIT);
  const filtrosActivos = Object.values(filtros).some(v => v !== '');
  const maxDeuda = cuentas.length > 0 ? Math.max(...cuentas.map(c => Number(c.total_pendiente))) : 1;

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Cobros</h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Pagos recibidos y cuentas pendientes</p>
        </div>
        {puede('crear', 'cobros') && (
          <button
            onClick={() => { setClienteInicialModal(null); setModalCobrar(true); }}
            className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-yellow-400 text-zinc-900 font-bold text-sm hover:bg-yellow-500 active:scale-95 transition-all shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Ingresar cobro</span>
            <span className="sm:hidden">Cobro</span>
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl w-fit">
        {[
          { key: 'cobros',  label: 'Cobros', labelFull: 'Cobros realizados', count: total },
          { key: 'cuentas', label: 'Por cobrar', labelFull: 'Cuentas por cobrar', count: cuentas.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <span className="sm:hidden">{t.label}</span>
            <span className="hidden sm:inline">{t.labelFull}</span>
            {t.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                tab === t.key
                  ? 'bg-yellow-400 text-zinc-900'
                  : 'bg-zinc-200 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-400'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════
          TAB: COBROS REALIZADOS
      ════════════════════════════════════════ */}
      {tab === 'cobros' && (
        <>
          {/* Filtros */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            {/* Toggle mobile */}
            <button
              onClick={() => setFiltrosAbiertos(o => !o)}
              className="md:hidden w-full flex items-center justify-between px-4 py-3 text-sm"
            >
              <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                Filtros
                {filtrosActivos && (
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                )}
              </span>
              <svg className={`w-4 h-4 text-zinc-400 transition-transform ${filtrosAbiertos ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className={`${filtrosAbiertos ? 'block' : 'hidden'} md:block p-3 sm:p-4`}>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Búsqueda */}
                <div className="relative flex-1 min-w-0">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    placeholder="Número, cliente…"
                    value={filtros.busqueda}
                    onChange={e => setFiltros(f => ({ ...f, busqueda: e.target.value }))}
                    className={`${FIELD} pl-9`}
                  />
                </div>
                {/* Selectores en fila */}
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <select
                    value={filtros.tipo}
                    onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
                    className={`${FIELD} w-full sm:w-32`}
                  >
                    <option value="">Tipo</option>
                    <option value="CONTADO">Contado</option>
                    <option value="CREDITO">Crédito</option>
                  </select>
                  <select
                    value={filtros.estado}
                    onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
                    className={`${FIELD} w-full sm:w-32`}
                  >
                    <option value="">Estado</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="PAGADA">Pagado</option>
                    <option value="VENCIDA">Vencido</option>
                  </select>
                  <input
                    type="date"
                    value={filtros.fecha_desde}
                    onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))}
                    className={`${FIELD} w-full sm:w-36 text-xs`}
                  />
                  <input
                    type="date"
                    value={filtros.fecha_hasta}
                    onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))}
                    className={`${FIELD} w-full sm:w-36 text-xs`}
                  />
                </div>
              </div>
              {filtrosActivos && (
                <button
                  onClick={() => setFiltros({ busqueda: '', tipo: '', estado: '', fecha_desde: '', fecha_hasta: '' })}
                  className="mt-2 text-xs text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors font-medium flex items-center gap-1"
                >
                  <span>✕</span> Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* ── Mobile: Cards ── */}
          <div className="md:hidden space-y-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : cobros.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                <p className="text-sm text-zinc-400">Sin resultados</p>
              </div>
            ) : cobros.map(p => (
              <div key={p.id_pago} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="flex min-w-0">
                  {/* Stripe amarillo izquierdo */}
                  <div className="w-1 shrink-0 bg-yellow-400" />
                  <div className="flex-1 min-w-0 p-4 space-y-2.5">
                    {/* Fila 1: número + monto */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{p.numero}</p>
                        <p className="font-mono text-xs text-blue-600 dark:text-blue-400 mt-0.5">{p.numero_venta}</p>
                      </div>
                      <p className="font-mono font-bold text-lg text-zinc-900 dark:text-white shrink-0 leading-tight">
                        {p.moneda_simbolo} {FMT(p.monto)}
                      </p>
                    </div>
                    {/* Fila 2: cliente */}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{p.razon_social || p.cliente_nombre}</p>
                      <p className="text-xs text-zinc-400 truncate">{p.cliente_documento} · {FMT_DT(p.fecha)}</p>
                    </div>
                    {/* Fila 3: badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ESTADO_BADGE[p.estado_venta] ?? ''}`}>
                        {p.estado_venta}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        p.condicion_pago === 'CREDITO'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      }`}>{p.condicion_pago}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                        {p.metodo_pago.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {/* Fila 4: acciones */}
                    <div className="flex gap-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      {puede('imprimir', 'cobros') && (
                        <button
                          onClick={() => navigate(`/cobros/${p.id_pago}/recibo`)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Recibo
                        </button>
                      )}
                      {puede('editar', 'cobros') && (
                        <button
                          onClick={() => setModalEditar(p)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                      )}
                      {puede('anular', 'cobros') && (
                        <button
                          onClick={() => setConfirmAnular(p)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Anular
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop: Tabla ── */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap">N° Cobro</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap">Venta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap">Fecha</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Método</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12">
                        <div className="inline-flex items-center gap-2 text-zinc-400 text-sm">
                          <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                          Cargando…
                        </div>
                      </td>
                    </tr>
                  ) : cobros.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-zinc-400 text-sm">
                        Sin resultados para los filtros aplicados
                      </td>
                    </tr>
                  ) : cobros.map(p => (
                    <tr key={p.id_pago} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-200 whitespace-nowrap">{p.numero}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">{p.numero_venta}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{p.razon_social || p.cliente_nombre}</p>
                        <p className="text-xs text-zinc-400 truncate">{p.cliente_documento}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{FMT_DT(p.fecha)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-zinc-900 dark:text-white">{p.moneda_simbolo} {FMT(p.monto)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{p.metodo_pago.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${
                          p.condicion_pago === 'CREDITO'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}>{p.condicion_pago}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${ESTADO_BADGE[p.estado_venta] ?? ''}`}>
                          {p.estado_venta}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          {puede('imprimir', 'cobros') && (
                            <button
                              onClick={() => navigate(`/cobros/${p.id_pago}/recibo`)}
                              title="Ver recibo"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                          )}
                          {puede('editar', 'cobros') && (
                            <button
                              onClick={() => setModalEditar(p)}
                              title="Editar"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {puede('anular', 'cobros') && (
                            <button
                              onClick={() => setConfirmAnular(p)}
                              title="Anular"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación desktop */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}</span>
                  {' '}de{' '}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{total}</span>
                </p>
                <div className="flex gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => cargarCobros(page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >← Anterior</button>
                  <span className="px-3 py-1.5 text-xs text-zinc-400">{page} / {totalPages}</span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => cargarCobros(page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >Siguiente →</button>
                </div>
              </div>
            )}
          </div>

          {/* Paginación mobile */}
          {totalPages > 1 && (
            <div className="md:hidden flex items-center justify-between gap-3">
              <button
                disabled={page === 1}
                onClick={() => cargarCobros(page - 1)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >← Anterior</button>
              <span className="text-xs text-zinc-500 shrink-0 font-mono">{page}/{totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => cargarCobros(page + 1)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >Siguiente →</button>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════
          TAB: CUENTAS POR COBRAR
      ════════════════════════════════════════ */}
      {tab === 'cuentas' && (
        <>
          {/* Buscador */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              placeholder="Buscar cliente por nombre, NIT/CI…"
              value={cuentaBusqueda}
              onChange={e => setCuentaBusqueda(e.target.value)}
              className={`${FIELD} pl-9 max-w-sm`}
            />
          </div>

          {cuentas.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Sin cuentas por cobrar</p>
              <p className="text-xs text-zinc-400 mt-1">Todas las ventas a crédito están al día</p>
            </div>
          ) : (
            <>
              {/* ── Mobile: Cards de deudores ── */}
              <div className="md:hidden space-y-2">
                {cuentas.map(c => {
                  const pct = Math.max(6, Math.round((Number(c.total_pendiente) / maxDeuda) * 100));
                  return (
                    <div
                      key={c.id_cliente}
                      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                    >
                      <div className="flex min-w-0">
                        <div className="w-1 shrink-0 bg-red-400" />
                        <div className="flex-1 min-w-0 p-4 space-y-3">
                          {/* Nombre + deuda */}
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                                {c.razon_social || `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim()}
                              </p>
                              <p className="text-xs text-zinc-400 truncate mt-0.5">
                                {c.tipo_documento}: {c.documento}
                                {c.celular && ` · ${c.celular}`}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-mono font-bold text-base text-red-600 dark:text-red-400">Bs {FMT(c.total_pendiente)}</p>
                              <p className="text-xs text-zinc-400 mt-0.5">{c.num_ventas} {c.num_ventas === 1 ? 'venta' : 'ventas'}</p>
                            </div>
                          </div>

                          {/* Barra de deuda relativa */}
                          <div className="space-y-1">
                            <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-400 dark:bg-red-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          {/* Acción */}
                          {puede('crear', 'cobros') && (
                            <button
                              onClick={() => { setClienteInicialModal(c); setModalCobrar(true); }}
                              className="w-full py-2 rounded-xl bg-yellow-400 text-zinc-900 text-sm font-bold hover:bg-yellow-500 active:scale-95 transition-all"
                            >
                              Cobrar ahora
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop: Tabla ── */}
              <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Cliente</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap">NIT / CI</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Celular</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap">Ventas</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap">Total pendiente</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide w-28">Deuda</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                      {cuentas.map(c => {
                        const pct = Math.max(4, Math.round((Number(c.total_pendiente) / maxDeuda) * 100));
                        return (
                          <tr key={c.id_cliente} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                            <td className="px-4 py-3 max-w-[200px]">
                              <p className="font-semibold text-zinc-900 dark:text-white truncate">
                                {c.razon_social || `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim()}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{c.tipo_documento}: {c.documento}</td>
                            <td className="px-4 py-3 text-xs text-zinc-500">{c.celular ?? '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold">{c.num_ventas}</span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <span className="font-mono font-bold text-red-600 dark:text-red-400">Bs {FMT(c.total_pendiente)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden w-24">
                                <div
                                  className="h-full bg-red-400 dark:bg-red-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {puede('crear', 'cobros') && (
                                <button
                                  onClick={() => { setClienteInicialModal(c); setModalCobrar(true); }}
                                  className="px-3 py-1.5 rounded-xl bg-yellow-400 text-zinc-900 text-xs font-bold hover:bg-yellow-500 transition-colors whitespace-nowrap"
                                >
                                  Cobrar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Modales ── */}
      {modalCobrar && (
        <ModalCobrar
          clienteInicial={clienteInicialModal}
          onClose={() => { setModalCobrar(false); setClienteInicialModal(null); }}
          onSuccess={onModalSuccess}
        />
      )}

      {modalEditar && (
        <ModalEditar
          pago={modalEditar}
          onClose={() => setModalEditar(null)}
          onSuccess={onModalSuccess}
        />
      )}

      {/* Confirm anular */}
      {confirmAnular && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 w-full sm:max-w-sm">
            <div className="sm:hidden flex justify-center mb-3">
              <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            </div>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">¿Anular cobro?</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 px-4 py-3 mb-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Cobro</span>
                <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-200">{confirmAnular.numero}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Monto</span>
                <span className="font-mono text-sm font-bold text-red-600 dark:text-red-400">{confirmAnular.moneda_simbolo} {FMT(confirmAnular.monto)}</span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">
              El saldo de la venta y del cliente serán revertidos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAnular(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAnular}
                disabled={anulando}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {anulando ? 'Anulando…' : 'Anular cobro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
