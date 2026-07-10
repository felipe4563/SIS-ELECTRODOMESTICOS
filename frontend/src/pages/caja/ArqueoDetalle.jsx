import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cajaService } from '../../services/caja.service';
import { usePermission } from '../../hooks/usePermission';
import { useEmpresa } from '../../contexts/EmpresaContext';

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const fmtFecha = (f) =>
  f ? new Date(f).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const fmtCorta = (f) =>
  f ? new Date(f).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const METODO_COLORS = {
  EFECTIVO:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  QR:            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TARJETA:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TRANSFERENCIA: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  CHEQUE:        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

function MetodoBadge({ metodo }) {
  const cls = METODO_COLORS[metodo] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>
      {metodo?.replace(/_/g, ' ')}
    </span>
  );
}

function groupByMethod(arr) {
  return arr.reduce((acc, item) => {
    const m = item.metodo_pago || 'OTRO';
    acc[m] = (acc[m] || 0) + Number(item.monto);
    return acc;
  }, {});
}

// ── Modal cierre ──────────────────────────────────────────────────────────
function ModalCerrar({ arqueo, provisional, onClose, onSuccess }) {
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
      await cajaService.cerrarCaja(arqueo.id_arqueo, { monto_cierre_real: montoReal, observaciones: obs });
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
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Cerrar turno</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{arqueo.caja} — {arqueo.sucursal}</p>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 text-sm">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
            Total esperado en efectivo (sistema)
          </p>
          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2 font-semibold">
            <span className="text-zinc-700 dark:text-zinc-300">Total efectivo</span>
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
              {signo !== '' ? signo + ' ' : ''}Bs {fmt(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Recibo térmico (solo impresión) ───────────────────────────────────────
function ReciboArqueo({ arqueo, empresa, cobros, gastos, pagosCompra }) {
  const cobrosPorMetodo  = groupByMethod(cobros);
  const gastosPorMetodo  = groupByMethod(gastos);
  const comprasPorMetodo = groupByMethod(pagosCompra);

  const totalCobros  = cobros.reduce((s, c) => s + Number(c.monto), 0);
  const totalGastos  = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const totalCompras = pagosCompra.reduce((s, p) => s + Number(p.monto), 0);

  const cobrosEf  = cobrosPorMetodo['EFECTIVO'] || 0;
  const gastosEf  = gastosPorMetodo['EFECTIVO'] || 0;
  const comprasEf = comprasPorMetodo['EFECTIVO'] || 0;
  const sistemaEf = Number(arqueo.monto_apertura) + cobrosEf - gastosEf - comprasEf;
  const difNum    = Number(arqueo.diferencia ?? 0);

  const S = {
    wrap:    { fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.5', color: '#000', background: '#fff' },
    center:  { textAlign: 'center' },
    sec:     { marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dashed #d4d4d8' },
    row:     { display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' },
    label:   { color: '#71717a', flexShrink: 0 },
    value:   { fontWeight: '500', textAlign: 'right' },
    hdr:     { fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a', marginBottom: '3px' },
    sub:     { borderTop: '1px dashed #d4d4d8', marginTop: '4px', paddingTop: '4px' },
    strong:  { borderTop: '2px solid #000', marginTop: '5px', paddingTop: '5px' },
  };

  return (
    <div id="resumen-caja" style={S.wrap}>
      {/* Empresa */}
      <div style={{ ...S.center, ...S.sec }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{empresa?.nombre_comercial || empresa?.razon_social || ''}</div>
        {empresa?.nit && <div>NIT: {empresa.nit}</div>}
        <div>{arqueo.sucursal}</div>
        {empresa?.telefono && <div>Tel: {empresa.telefono}</div>}
      </div>

      {/* Título */}
      <div style={{ ...S.center, ...S.sec }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#71717a' }}>Resumen de Turno</div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px' }}>{arqueo.caja}</div>
        <div style={{ fontSize: '10px', color: '#71717a', marginTop: '2px' }}>
          {fmtFecha(arqueo.fecha_apertura)}<br />
          {arqueo.fecha_cierre ? `Cierre: ${fmtFecha(arqueo.fecha_cierre)}` : 'Turno abierto'}
        </div>
      </div>

      {/* Cajero */}
      <div style={S.sec}>
        <div style={S.row}><span style={S.label}>Cajero:</span><span style={S.value}>{arqueo.usuario}</span></div>
        <div style={S.row}><span style={S.label}>Estado:</span><span style={S.value}>{arqueo.estado}</span></div>
        <div style={S.row}><span style={S.label}>Apertura:</span><span style={S.value}>Bs {fmt(arqueo.monto_apertura)}</span></div>
      </div>

      {/* Cobros por método */}
      {totalCobros > 0 && (
        <div style={S.sec}>
          <div style={S.hdr}>Cobros</div>
          {Object.entries(cobrosPorMetodo).map(([m, v]) => (
            <div key={m} style={S.row}>
              <span style={S.label}>{m.replace(/_/g, ' ')}:</span>
              <span style={S.value}>Bs {fmt(v)}</span>
            </div>
          ))}
          <div style={{ ...S.row, ...S.sub }}>
            <span style={{ fontWeight: 'bold' }}>Total cobros:</span>
            <span style={{ fontWeight: 'bold' }}>Bs {fmt(totalCobros)}</span>
          </div>
        </div>
      )}

      {/* Gastos por método */}
      {totalGastos > 0 && (
        <div style={S.sec}>
          <div style={S.hdr}>Gastos</div>
          {Object.entries(gastosPorMetodo).map(([m, v]) => (
            <div key={m} style={S.row}>
              <span style={S.label}>{m.replace(/_/g, ' ')}:</span>
              <span style={S.value}>Bs {fmt(v)}</span>
            </div>
          ))}
          <div style={{ ...S.row, ...S.sub }}>
            <span style={{ fontWeight: 'bold' }}>Total gastos:</span>
            <span style={{ fontWeight: 'bold' }}>Bs {fmt(totalGastos)}</span>
          </div>
        </div>
      )}

      {/* Pagos proveedor por método */}
      {totalCompras > 0 && (
        <div style={S.sec}>
          <div style={S.hdr}>Pagos Proveedor</div>
          {Object.entries(comprasPorMetodo).map(([m, v]) => (
            <div key={m} style={S.row}>
              <span style={S.label}>{m.replace(/_/g, ' ')}:</span>
              <span style={S.value}>Bs {fmt(v)}</span>
            </div>
          ))}
          <div style={{ ...S.row, ...S.sub }}>
            <span style={{ fontWeight: 'bold' }}>Total pagos:</span>
            <span style={{ fontWeight: 'bold' }}>Bs {fmt(totalCompras)}</span>
          </div>
        </div>
      )}

      {/* Cuadre efectivo */}
      <div style={S.sec}>
        <div style={S.hdr}>Cuadre Efectivo</div>
        <div style={S.row}><span style={S.label}>Apertura:</span><span style={S.value}>Bs {fmt(arqueo.monto_apertura)}</span></div>
        {cobrosEf > 0 && <div style={S.row}><span style={S.label}>+ Cobros ef.:</span><span style={S.value}>Bs {fmt(cobrosEf)}</span></div>}
        {gastosEf > 0 && <div style={S.row}><span style={S.label}>- Gastos ef.:</span><span style={S.value}>Bs {fmt(gastosEf)}</span></div>}
        {comprasEf > 0 && <div style={S.row}><span style={S.label}>- Pagos ef.:</span><span style={S.value}>Bs {fmt(comprasEf)}</span></div>}
        <div style={{ ...S.row, ...S.strong, fontSize: '12px' }}>
          <span style={{ fontWeight: 'bold' }}>SISTEMA:</span>
          <span style={{ fontWeight: 'bold' }}>Bs {fmt(sistemaEf)}</span>
        </div>
        {arqueo.monto_cierre_real != null && (
          <>
            <div style={{ ...S.row, marginTop: '3px' }}>
              <span style={{ fontWeight: 'bold' }}>REAL:</span>
              <span style={{ fontWeight: 'bold' }}>Bs {fmt(arqueo.monto_cierre_real)}</span>
            </div>
            <div style={{ ...S.row, color: difNum === 0 ? '#52525b' : difNum > 0 ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
              <span>DIFERENCIA:</span>
              <span>{difNum >= 0 ? '+' : ''}Bs {fmt(arqueo.diferencia)}</span>
            </div>
          </>
        )}
      </div>

      {/* Observaciones */}
      {arqueo.observaciones && (
        <div style={{ ...S.sec, fontStyle: 'italic', fontSize: '10px', color: '#71717a' }}>
          {arqueo.observaciones}
        </div>
      )}

      {/* Pie */}
      <div style={{ ...S.center, fontSize: '10px', color: '#71717a', paddingTop: '4px' }}>
        — Documento interno de turno —
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function ArqueoDetalle() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { puede } = usePermission();
  const { empresa } = useEmpresa() ?? {};

  const puedoCerrar = puede('cerrar', 'caja');

  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modal,    setModal]    = useState(null);
  const [tab,      setTab]      = useState('cobros');

  const cargar = (imprimirDespues = false) => {
    setCargando(true);
    cajaService.getArqueo(id)
      .then(r => {
        setData(r.data);
        if (imprimirDespues) setTimeout(() => window.print(), 300);
      })
      .catch(() => navigate('/caja'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [id]);

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!data) return null;

  const { arqueo, cobros = [], gastos = [], pagosCompra = [], monto_cierre_sistema_provisional } = data;
  const esAbierta = arqueo.estado === 'ABIERTA';

  // Solo efectivo para el cuadre de caja
  const cobrosEf  = cobros.filter(c => c.metodo_pago === 'EFECTIVO').reduce((s, c) => s + Number(c.monto), 0);
  const gastosEf  = gastos.filter(g => g.metodo_pago === 'EFECTIVO').reduce((s, g) => s + Number(g.monto), 0);
  const comprasEf = pagosCompra.filter(p => p.metodo_pago === 'EFECTIVO').reduce((s, p) => s + Number(p.monto), 0);

  // Totales de todos los métodos
  const totalCobros  = cobros.reduce((s, c) => s + Number(c.monto), 0);
  const totalGastos  = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const totalCompras = pagosCompra.reduce((s, p) => s + Number(p.monto), 0);

  // Desglose por método
  const cobrosPorMetodo  = groupByMethod(cobros);
  const gastosPorMetodo  = groupByMethod(gastos);
  const comprasPorMetodo = groupByMethod(pagosCompra);

  const esperado   = monto_cierre_sistema_provisional ?? Number(arqueo.monto_cierre_sistema ?? 0);
  const diferencia = arqueo.diferencia;
  const difNum     = Number(diferencia ?? 0);

  const difColor = () => {
    if (diferencia == null) return 'text-zinc-400';
    if (difNum > 0) return 'text-green-600 dark:text-green-400';
    if (difNum < 0) return 'text-red-500 dark:text-red-400';
    return 'text-zinc-500 dark:text-zinc-400';
  };

  const tabs = [
    { key: 'cobros',  label: `Cobros (${cobros.length})` },
    { key: 'gastos',  label: `Gastos (${gastos.length})` },
    { key: 'compras', label: `Pago proveedores (${pagosCompra.length})` },
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
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir resumen
          </button>
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
        </div>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Cajero',         value: arqueo.usuario,                  sub: null },
          { label: 'Apertura',       value: fmtFecha(arqueo.fecha_apertura), sub: `Bs ${fmt(arqueo.monto_apertura)}` },
          { label: 'Cierre',         value: fmtFecha(arqueo.fecha_cierre),   sub: esAbierta ? 'Turno activo' : null },
          { label: 'Total efectivo', value: `Bs ${fmt(esperado)}`,           sub: esAbierta ? 'Provisional' : 'Sistema' },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{card.label}</p>
            <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-white leading-tight">{card.value}</p>
            {card.sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Totales por método + Cuadre efectivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Totales por método de pago */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Totales por método</h2>
          <div className="space-y-4 text-sm">
            {totalCobros > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Cobros</p>
                <div className="space-y-1.5">
                  {Object.entries(cobrosPorMetodo).map(([m, v]) => (
                    <div key={m} className="flex items-center justify-between">
                      <MetodoBadge metodo={m} />
                      <span className="font-mono font-medium text-green-600 dark:text-green-400">Bs {fmt(v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-1.5 font-semibold">
                    <span className="text-zinc-500 dark:text-zinc-400">Total cobros</span>
                    <span className="font-mono text-zinc-900 dark:text-white">Bs {fmt(totalCobros)}</span>
                  </div>
                </div>
              </div>
            )}
            {totalGastos > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Gastos</p>
                <div className="space-y-1.5">
                  {Object.entries(gastosPorMetodo).map(([m, v]) => (
                    <div key={m} className="flex items-center justify-between">
                      <MetodoBadge metodo={m} />
                      <span className="font-mono font-medium text-red-500 dark:text-red-400">Bs {fmt(v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-1.5 font-semibold">
                    <span className="text-zinc-500 dark:text-zinc-400">Total gastos</span>
                    <span className="font-mono text-zinc-900 dark:text-white">Bs {fmt(totalGastos)}</span>
                  </div>
                </div>
              </div>
            )}
            {totalCompras > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Pagos proveedor</p>
                <div className="space-y-1.5">
                  {Object.entries(comprasPorMetodo).map(([m, v]) => (
                    <div key={m} className="flex items-center justify-between">
                      <MetodoBadge metodo={m} />
                      <span className="font-mono font-medium text-red-500 dark:text-red-400">Bs {fmt(v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-1.5 font-semibold">
                    <span className="text-zinc-500 dark:text-zinc-400">Total pagos</span>
                    <span className="font-mono text-zinc-900 dark:text-white">Bs {fmt(totalCompras)}</span>
                  </div>
                </div>
              </div>
            )}
            {totalCobros === 0 && totalGastos === 0 && totalCompras === 0 && (
              <p className="text-xs text-zinc-400">Sin movimientos registrados</p>
            )}
          </div>
        </div>

        {/* Cuadre efectivo */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
            {esAbierta ? 'Cuadre efectivo (provisional)' : 'Cuadre efectivo'}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Monto apertura</span>
              <span className="font-mono font-medium text-zinc-900 dark:text-white">Bs {fmt(arqueo.monto_apertura)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">+ Cobros efectivo</span>
              <span className="font-mono font-medium text-green-600 dark:text-green-400">Bs {fmt(cobrosEf)}</span>
            </div>
            {gastosEf > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">− Gastos efectivo</span>
                <span className="font-mono font-medium text-red-500 dark:text-red-400">Bs {fmt(gastosEf)}</span>
              </div>
            )}
            {comprasEf > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">− Pagos proveedores</span>
                <span className="font-mono font-medium text-red-500 dark:text-red-400">Bs {fmt(comprasEf)}</span>
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
                  <span className="font-mono">{difNum >= 0 ? '+' : ''}Bs {fmt(diferencia)}</span>
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
      </div>

      {/* Tabs de movimientos */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
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
              { key: 'metodo_pago',  label: 'Método',   hidden: 'hidden sm:table-cell',
                render: f => <MetodoBadge metodo={f.metodo_pago} /> },
              { key: 'fecha',        label: 'Fecha',    small: true, hidden: 'hidden md:table-cell',
                render: f => fmtCorta(f.fecha) },
              { key: 'monto',        label: 'Monto Bs', right: true, bold: true,
                render: f => fmt(f.monto) },
            ]}
          />
        )}

        {tab === 'gastos' && (
          <TablaMovimientos
            filas={gastos}
            total={totalGastos}
            signo="−"
            colorTotal="text-red-500 dark:text-red-400"
            columnas={[
              { key: 'numero',      label: 'N° Gasto',   small: true },
              { key: 'categoria',   label: 'Categoría',  hidden: 'hidden sm:table-cell' },
              { key: 'descripcion', label: 'Descripción' },
              { key: 'metodo_pago', label: 'Método',     hidden: 'hidden sm:table-cell',
                render: f => <MetodoBadge metodo={f.metodo_pago} /> },
              { key: 'fecha',       label: 'Fecha',      small: true, hidden: 'hidden md:table-cell',
                render: f => fmtCorta(f.fecha) },
              { key: 'monto',       label: 'Monto Bs',   right: true, bold: true,
                render: f => fmt(f.monto) },
            ]}
          />
        )}

        {tab === 'compras' && (
          <TablaMovimientos
            filas={pagosCompra}
            total={totalCompras}
            signo="−"
            colorTotal="text-red-500 dark:text-red-400"
            columnas={[
              { key: 'numero',      label: 'N° Pago',   small: true },
              { key: 'proveedor',   label: 'Proveedor' },
              { key: 'metodo_pago', label: 'Método',    hidden: 'hidden sm:table-cell',
                render: f => <MetodoBadge metodo={f.metodo_pago} /> },
              { key: 'fecha',       label: 'Fecha',     small: true, hidden: 'hidden md:table-cell',
                render: f => fmtCorta(f.fecha) },
              { key: 'monto',       label: 'Monto Bs',  right: true, bold: true,
                render: f => fmt(f.monto) },
            ]}
          />
        )}
      </div>

      {modal === 'cerrar' && (
        <ModalCerrar
          arqueo={arqueo}
          provisional={esAbierta ? monto_cierre_sistema_provisional : null}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); cargar(true); }}
        />
      )}

      {/* Recibo térmico — oculto en pantalla, visible al imprimir */}
      <ReciboArqueo
        arqueo={arqueo}
        empresa={empresa}
        cobros={cobros}
        gastos={gastos}
        pagosCompra={pagosCompra}
      />

      <style>{`
        #resumen-caja { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          #resumen-caja { display: block !important; }
          #resumen-caja, #resumen-caja * { visibility: visible !important; }
          #resumen-caja {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 74mm !important;
            padding: 3mm !important;
            background: white !important;
            color: #000 !important;
          }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>
    </div>
  );
}
