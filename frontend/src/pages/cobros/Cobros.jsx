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
  EMITIDA:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PARCIAL:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  PAGADA:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  ANULADA:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  VENCIDA:  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

// ── Modal reutilizable ───────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── Modal registrar cobro ────────────────────────────────────────────────────
function ModalCobrar({ clienteInicial, onClose, onSuccess }) {
  const [busqueda, setBusqueda]             = useState('');
  const [clientes, setClientes]             = useState([]);
  const [cliente, setCliente]               = useState(clienteInicial || null);
  const [ventas, setVentas]                 = useState([]);
  const [ventaSel, setVentaSel]             = useState(null);
  const [cuotaSel, setCuotaSel]             = useState(null);
  const [monedas, setMonedas]               = useState([]);
  const [form, setForm]                     = useState({ monto: '', metodo_pago: 'EFECTIVO', id_moneda: '', numero_referencia: '', observaciones: '' });
  const [guardando, setGuardando]           = useState(false);
  const [error, setError]                   = useState('');

  // Cargar monedas al montar
  useEffect(() => {
    api.get('/monedas').then(r => {
      const list = r.data?.data ?? r.data ?? [];
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
    setForm(f => ({ ...f, monto: String(Number(c.cuota_monto) - Number(c.cuota_pagada)) }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!cliente)          return setError('Seleccione un cliente');
    if (!ventaSel)         return setError('Seleccione una venta');
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) return setError('Ingrese un monto válido');
    if (!form.id_moneda)   return setError('Seleccione una moneda');

    setGuardando(true);
    try {
      const sucursalId = parseInt(localStorage.getItem('id_sucursal') || '1');
      await cobrosService.registrar({
        id_venta:          ventaSel.id_venta,
        id_cuota:          cuotaSel?.id_cuota || null,
        id_cliente:        cliente.id_cliente,
        id_sucursal:       sucursalId,
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
    <Modal title="Registrar Cobro" onClose={onClose}>
      {/* Búsqueda de cliente */}
      {!cliente ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Buscar cliente</label>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Nombre, NIT/CI, razón social…"
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          {clientes.length > 0 && (
            <ul className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-700">
              {clientes.map(c => (
                <li key={c.id_cliente}>
                  <button
                    onClick={() => seleccionarCliente(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                  >
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {c.razon_social || `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim()}
                    </p>
                    <p className="text-xs text-zinc-500">{c.tipo_documento}: {c.documento} · {c.celular}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Cliente seleccionado */}
          <div className="flex items-center justify-between rounded-xl bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 border border-yellow-200 dark:border-yellow-700">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-white text-sm">
                {cliente.razon_social || `${cliente.nombres ?? ''} ${cliente.apellidos ?? ''}`.trim()}
              </p>
              <p className="text-xs text-zinc-500">{cliente.tipo_documento}: {cliente.documento}</p>
            </div>
            <button onClick={() => { setCliente(null); setVentaSel(null); setCuotaSel(null); setVentas([]); }}
              className="text-xs text-yellow-600 hover:text-yellow-800 font-medium">Cambiar</button>
          </div>

          {/* Ventas pendientes */}
          {ventas.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No hay ventas con saldo pendiente</p>
          ) : (
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Ventas pendientes</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {ventas.map(v => (
                  <button
                    key={v.id_venta}
                    onClick={() => seleccionarVenta(v)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-all text-sm ${
                      ventaSel?.id_venta === v.id_venta
                        ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-yellow-300 dark:hover:border-yellow-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-900 dark:text-white">{v.numero}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.condicion_pago === 'CREDITO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {v.condicion_pago}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-zinc-500">{FMT_FECHA(v.fecha)}</span>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                        Saldo: {FMT(v.saldo_pendiente)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cuotas (si crédito y venta seleccionada) */}
          {ventaSel && ventaSel.condicion_pago === 'CREDITO' && (ventaSel.cuotas ?? []).length > 0 && (
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Cuota a pagar (opcional)</p>
              <div className="space-y-1.5">
                {ventaSel.cuotas.map(c => (
                  <button
                    key={c.id_cuota}
                    onClick={() => seleccionarCuota(c)}
                    className={`w-full text-left rounded-xl border px-4 py-2.5 transition-all text-sm ${
                      cuotaSel?.id_cuota === c.id_cuota
                        ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-yellow-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-900 dark:text-white">Cuota {c.numero_cuota}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[c.estado] ?? ''}`}>{c.estado}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 text-xs text-zinc-500">
                      <span>Vence: {FMT_FECHA(c.fecha_vencimiento)}</span>
                      <span>Pendiente: {FMT(Number(c.cuota_monto) - Number(c.cuota_pagada))}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Formulario de cobro */}
          {ventaSel && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Monto *</label>
                <input
                  type="number" min="0.01" step="0.01"
                  value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Método de pago *</label>
                <select
                  value={form.metodo_pago}
                  onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  {METODOS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Moneda *</label>
                <select
                  value={form.id_moneda}
                  onChange={e => setForm(f => ({ ...f, id_moneda: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Seleccione…</option>
                  {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.codigo} - {m.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">N° Referencia</label>
                <input
                  value={form.numero_referencia}
                  onChange={e => setForm(f => ({ ...f, numero_referencia: e.target.value }))}
                  placeholder="Opcional"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Observaciones</label>
                <textarea
                  rows={2} value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-700">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
        {ventaSel && (
          <button
            onClick={handleSubmit} disabled={guardando}
            className="px-5 py-2 rounded-xl bg-yellow-400 text-zinc-900 text-sm font-semibold hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Grabar cobro'}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ── Modal editar cobro ───────────────────────────────────────────────────────
function ModalEditar({ pago, onClose, onSuccess }) {
  const [form, setForm]       = useState({ numero_referencia: pago.numero_referencia ?? '', observaciones: pago.observaciones ?? '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError]     = useState('');

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
    <Modal title={`Modificar cobro ${pago.numero}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">N° Referencia</label>
          <input value={form.numero_referencia} onChange={e => setForm(f => ({ ...f, numero_referencia: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Observaciones</label>
          <textarea rows={3} value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
          />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-700">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
        <button onClick={handleSubmit} disabled={guardando}
          className="px-5 py-2 rounded-xl bg-yellow-400 text-zinc-900 text-sm font-semibold hover:bg-yellow-500 disabled:opacity-50 transition-colors">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </Modal>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function Cobros() {
  const navigate = useNavigate();
  const { puede } = usePermission();

  const [tab, setTab]             = useState('cobros');
  const [cobros, setCobros]       = useState([]);
  const [cuentas, setCuentas]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const LIMIT = 20;

  const [filtros, setFiltros] = useState({
    busqueda: '', tipo: '', estado: '', fecha_desde: '', fecha_hasta: '',
  });
  const [cuentaBusqueda, setCuentaBusqueda] = useState('');

  const [loading, setLoading]           = useState(false);
  const [modalCobrar, setModalCobrar]   = useState(false);
  const [clienteInicialModal, setClienteInicialModal] = useState(null);
  const [modalEditar, setModalEditar]   = useState(null);
  const [confirmAnular, setConfirmAnular] = useState(null);
  const [anulando, setAnulando]         = useState(false);

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

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Cobros</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Gestión de pagos de ventas</p>
        </div>
        {puede('crear', 'cobros') && (
          <button
            onClick={() => { setClienteInicialModal(null); setModalCobrar(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 text-zinc-900 font-semibold text-sm hover:bg-yellow-500 transition-colors shadow-sm"
          >
            <span className="text-base">＋</span> Ingresar cobro
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
        {[
          { key: 'cobros',  label: 'Cobros realizados' },
          { key: 'cuentas', label: 'Cuentas por cobrar' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB COBROS ── */}
      {tab === 'cobros' && (
        <>
          {/* Filtros */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                placeholder="Buscar número, cliente…"
                value={filtros.busqueda}
                onChange={e => setFiltros(f => ({ ...f, busqueda: e.target.value }))}
                className="lg:col-span-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="">Tipo: Todos</option>
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </select>
              <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="">Estado: Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PAGADA">Pagado</option>
                <option value="VENCIDA">Vencido</option>
              </select>
              <div className="flex gap-2">
                <input type="date" value={filtros.fecha_desde} onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))}
                  className="w-full px-2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <input type="date" value={filtros.fecha_hasta} onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))}
                  className="w-full px-2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                    {['N° Cobro', 'N° Venta', 'Cliente', 'Fecha', 'Monto', 'Método', 'Tipo', 'Estado venta', 'Acciones'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-10 text-zinc-400">Cargando…</td></tr>
                  ) : cobros.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-10 text-zinc-400">Sin resultados</td></tr>
                  ) : cobros.map(p => (
                    <tr key={p.id_pago} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{p.numero}</td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">{p.numero_venta}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900 dark:text-white text-xs">{p.razon_social || p.cliente_nombre}</p>
                        <p className="text-xs text-zinc-500">{p.cliente_documento}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{FMT_DT(p.fecha)}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                        {p.moneda_simbolo} {FMT(p.monto)}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{p.metodo_pago.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.condicion_pago === 'CREDITO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.condicion_pago}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[p.estado_venta] ?? ''}`}>{p.estado_venta}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {puede('imprimir', 'cobros') && (
                            <button onClick={() => navigate(`/cobros/${p.id_pago}/recibo`)} title="Ver recibo"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm">🖨</button>
                          )}
                          {puede('editar', 'cobros') && (
                            <button onClick={() => setModalEditar(p)} title="Modificar"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors text-sm">✏️</button>
                          )}
                          {puede('anular', 'cobros') && (
                            <button onClick={() => setConfirmAnular(p)} title="Anular"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm">🗑</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-xs text-zinc-500">
                  {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total}
                </p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => cargarCobros(page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors">
                    ‹ Anterior
                  </button>
                  <button disabled={page >= totalPages} onClick={() => cargarCobros(page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors">
                    Siguiente ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB CUENTAS POR COBRAR ── */}
      {tab === 'cuentas' && (
        <>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4">
            <input
              placeholder="Buscar cliente por nombre, NIT/CI…"
              value={cuentaBusqueda}
              onChange={e => setCuentaBusqueda(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                    {['Cliente', 'NIT/CI', 'Celular', 'Ventas pendientes', 'Total pendiente', 'Acción'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {cuentas.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-zinc-400">Sin cuentas por cobrar</td></tr>
                  ) : cuentas.map(c => (
                    <tr key={c.id_cliente} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900 dark:text-white">{c.razon_social || `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim()}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{c.tipo_documento}: {c.documento}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{c.celular ?? '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-medium">{c.num_ventas}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                        {FMT(c.total_pendiente)}
                      </td>
                      <td className="px-4 py-3">
                        {puede('crear', 'cobros') && (
                          <button
                            onClick={() => { setClienteInicialModal(c); setModalCobrar(true); }}
                            className="px-3 py-1.5 rounded-lg bg-yellow-400 text-zinc-900 text-xs font-semibold hover:bg-yellow-500 transition-colors"
                          >
                            Cobrar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
        <ModalEditar pago={modalEditar} onClose={() => setModalEditar(null)} onSuccess={onModalSuccess} />
      )}

      {/* Confirm anular */}
      {confirmAnular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">¿Anular cobro?</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">
              Se anulará el cobro <span className="font-mono font-semibold">{confirmAnular.numero}</span> por <strong>{confirmAnular.moneda_simbolo} {FMT(confirmAnular.monto)}</strong>.
              El saldo de la venta y del cliente serán revertidos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAnular(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button onClick={handleAnular} disabled={anulando}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                {anulando ? 'Anulando…' : 'Anular cobro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
