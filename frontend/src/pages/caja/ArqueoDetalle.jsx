import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cajaService } from '../../services/caja.service';
import { usePermission } from '../../hooks/usePermission';

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const fmtFecha = (f) =>
  f ? new Date(f).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const fmtCorta = (f) =>
  f ? new Date(f).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// ── Modal cierre ──────────────────────────────────────────────────────────
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

        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 space-y-2 text-sm">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Total esperado (sistema)</p>
          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2 font-semibold">
            <span className="text-zinc-700 dark:text-zinc-300">Total sistema</span>
            <span className="font-mono text-zinc-900 dark:text-white">Bs {fmt(provisional)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
            Monto físico real (Bs) *
          </label>
          <input
            type="number" min={0} step="0.01" value={montoReal}
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
            rows={2} value={obs}
            onChange={e => setObs(e.target.value)}
            placeholder={dif !== null && dif !== 0 ? 'Explica la diferencia…' : 'Opcional'}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={handleCerrar} disabled={cargando}
            className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors">
            {cargando ? 'Cerrando…' : 'Cerrar caja'}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tabla de movimientos genérica ─────────────────────────────────────────
function TablaMovimientos({ filas, columnas, total, colorTotal = 'text-zinc-900 dark:text-white', signo = '+' }) {
  if (filas.length === 0) {
    return <div className="py-8 text-center text-sm text-zinc-400">Sin movimientos</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-800/60">
            {columnas.map(c => (
              <th key={c.key}
                className={`px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 ${c.right ? 'text-right' : 'text-left'} ${c.hidden ?? ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {filas.map((fila, i) => (
            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              {columnas.map(c => (
                <td key={c.key}
                  className={`px-4 py-2.5 ${c.right ? 'text-right font-mono' : ''} ${c.bold ? 'font-semibold' : ''} ${c.small ? 'text-xs text-zinc-500 dark:text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'} ${c.hidden ?? ''}`}>
                  {c.render ? c.render(fila) : fila[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-zinc-50 dark:bg-zinc-800/60">
          <tr>
            <td colSpan={columnas.length - 1}
              className="px-4 py-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-right">
              Total
            </td>
            <td className={`px-4 py-2.5 text-right font-mono font-bold ${colorTotal}`}>
              {signo !== '' ? signo : ''} Bs {fmt(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function ArqueoDetalle() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { puede } = usePermission();

  const puedoCerrar       = puede('cerrar', 'caja');
  const puedoForzarCierre = puede('forzar_cierre', 'caja');

  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modal,    setModal]    = useState(null); // 'cerrar' | 'forzar'
  const [tab,      setTab]      = useState('cobros'); // 'cobros' | 'gastos' | 'compras'

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

  const { arqueo, cobros = [], gastos = [], pagosCompra = [], monto_cierre_sistema_provisional } = data;
  const esAbierta = arqueo.estado === 'ABIERTA';

  const totalCobros    = cobros.reduce((s, c) => s + Number(c.monto), 0);
  const totalGastos    = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const totalCompras   = pagosCompra.reduce((s, p) => s + Number(p.monto), 0);
  const esperado       = monto_cierre_sistema_provisional ?? Number(arqueo.monto_cierre_sistema ?? 0);
  const diferencia     = arqueo.diferencia;
  const difNum         = Number(diferencia ?? 0);

  const difColor = () => {
    if (diferencia == null) return 'text-zinc-400';
    if (difNum > 0) return 'text-green-600 dark:text-green-400';
    if (difNum < 0) return 'text-red-500 dark:text-red-400';
    return 'text-zinc-500 dark:text-zinc-400';
  };

  const tabs = [
    { key: 'cobros',   label: `Cobros en efectivo (${cobros.length})` },
    { key: 'gastos',   label: `Gastos en efectivo (${gastos.length})` },
    { key: 'compras',  label: `Pagos proveedores (${pagosCompra.length})` },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
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
          <Link to="/caja"
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Volver
          </Link>
          {esAbierta && puedoCerrar && (
            <button onClick={() => setModal('cerrar')}
              className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors">
              Cerrar turno
            </button>
          )}
          {esAbierta && puedoForzarCierre && !puedoCerrar && (
            <button onClick={() => setModal('forzar')}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors">
              Forzar cierre
            </button>
          )}
        </div>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Cajero',          value: arqueo.usuario,                  sub: null },
          { label: 'Apertura',        value: fmtFecha(arqueo.fecha_apertura), sub: `Bs ${fmt(arqueo.monto_apertura)}` },
          { label: 'Cierre',          value: fmtFecha(arqueo.fecha_cierre),   sub: esAbierta ? 'Turno activo' : null },
          { label: 'Total sistema',   value: `Bs ${fmt(esperado)}`,           sub: esAbierta ? 'Provisional' : 'Calculado' },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{card.label}</p>
            <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-white leading-tight">{card.value}</p>
            {card.sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Cuadre de caja */}
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
            <span className="text-zinc-500 dark:text-zinc-400">+ Cobros efectivo</span>
            <span className="font-mono font-medium text-green-600 dark:text-green-400">Bs {fmt(totalCobros)}</span>
          </div>
          {totalGastos > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">− Gastos efectivo</span>
              <span className="font-mono font-medium text-red-500 dark:text-red-400">Bs {fmt(totalGastos)}</span>
            </div>
          )}
          {totalCompras > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">− Pagos proveedores</span>
              <span className="font-mono font-medium text-red-500 dark:text-red-400">Bs {fmt(totalCompras)}</span>
            </div>
          )}
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

      {/* Tabs de movimientos */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-5 py-3.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-b-2 border-yellow-400 text-yellow-600 dark:text-yellow-400'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Cobros */}
        {tab === 'cobros' && (
          <TablaMovimientos
            filas={cobros}
            total={totalCobros}
            signo="+"
            colorTotal="text-green-600 dark:text-green-400"
            columnas={[
              { key: 'numero',       label: 'N° Pago',  small: true },
              { key: 'venta_numero', label: 'Venta',    small: true, hidden: 'hidden sm:table-cell' },
              { key: 'cliente',      label: 'Cliente' },
              { key: 'fecha',        label: 'Fecha',    small: true, hidden: 'hidden md:table-cell',
                render: f => fmtCorta(f.fecha) },
              { key: 'monto',        label: 'Monto Bs', right: true, bold: true,
                render: f => fmt(f.monto) },
            ]}
          />
        )}

        {/* Tab: Gastos */}
        {tab === 'gastos' && (
          <TablaMovimientos
            filas={gastos}
            total={totalGastos}
            signo="−"
            colorTotal="text-red-500 dark:text-red-400"
            columnas={[
              { key: 'numero',      label: 'N° Gasto',  small: true },
              { key: 'categoria',   label: 'Categoría', hidden: 'hidden sm:table-cell' },
              { key: 'descripcion', label: 'Descripción' },
              { key: 'fecha',       label: 'Fecha',     small: true, hidden: 'hidden md:table-cell',
                render: f => fmtCorta(f.fecha) },
              { key: 'monto',       label: 'Monto Bs',  right: true, bold: true,
                render: f => fmt(f.monto) },
            ]}
          />
        )}

        {/* Tab: Pagos proveedores */}
        {tab === 'compras' && (
          <TablaMovimientos
            filas={pagosCompra}
            total={totalCompras}
            signo="−"
            colorTotal="text-red-500 dark:text-red-400"
            columnas={[
              { key: 'numero',    label: 'N° Pago',    small: true },
              { key: 'proveedor', label: 'Proveedor' },
              { key: 'fecha',     label: 'Fecha',      small: true, hidden: 'hidden md:table-cell',
                render: f => fmtCorta(f.fecha) },
              { key: 'monto',     label: 'Monto Bs',   right: true, bold: true,
                render: f => fmt(f.monto) },
            ]}
          />
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
