import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Document, Page, View, Text, Image,
  StyleSheet as PDFStyleSheet, PDFDownloadLink,
} from '@react-pdf/renderer';
import { cajaService } from '../../services/caja.service';
import { gastosService } from '../../services/gastos.service';
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

// ── Estilos PDF ───────────────────────────────────────────────────────────
const P = PDFStyleSheet.create({
  page:       { padding: '12mm 14mm 16mm', fontFamily: 'Helvetica', fontSize: 9, color: '#18181b', backgroundColor: '#fff' },
  // Header empresa
  header:     { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#18181b', paddingBottom: 8, marginBottom: 10 },
  logo:       { width: 54, height: 38, objectFit: 'contain', marginRight: 10 },
  empWrap:    { flex: 1 },
  empName:    { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  empSub:     { fontSize: 7.5, color: '#52525b', lineHeight: 1.5 },
  // Título
  titBox:     { backgroundColor: '#18181b', paddingVertical: 5, paddingHorizontal: 8, marginBottom: 10 },
  titText:    { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#fff', textAlign: 'center', letterSpacing: 1.5 },
  titSub:     { fontSize: 7.5, color: '#a1a1aa', textAlign: 'center', marginTop: 2 },
  // Info grid
  infoGrid:   { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#f4f4f5', padding: '6pt 8pt', marginBottom: 10 },
  infoCell:   { width: '33.33%', marginBottom: 5 },
  infoLbl:    { fontSize: 6.5, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 1.5 },
  infoVal:    { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  // Secciones
  secHdr:     { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, color: '#71717a', borderBottomWidth: 1, borderBottomColor: '#d4d4d8', paddingBottom: 3, marginBottom: 4, marginTop: 10 },
  row:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: '#f4f4f5' },
  lbl:        { color: '#52525b' },
  val:        { fontFamily: 'Helvetica-Bold' },
  rowTotal:   { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4, marginTop: 3, borderTopWidth: 1.5, borderTopColor: '#18181b' },
  // Tabla productos
  tblHead:    { flexDirection: 'row', backgroundColor: '#f4f4f5', paddingVertical: 3, paddingHorizontal: 3, borderBottomWidth: 1, borderBottomColor: '#d4d4d8', marginTop: 4 },
  tblRow:     { flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 3, borderBottomWidth: 0.5, borderBottomColor: '#f4f4f5', alignItems: 'flex-start' },
  tblRowAlt:  { flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 3, borderBottomWidth: 0.5, borderBottomColor: '#f4f4f5', backgroundColor: '#fafafa', alignItems: 'flex-start' },
  th:         { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 },
  td:         { fontSize: 7.5, color: '#27272a' },
  cVenta:     { width: '13%' },
  cProd:      { width: '23%' },
  cMarca:     { width: '11%' },
  cModelo:    { width: '13%' },
  cColor:     { width: '9%' },
  cSerie:     { width: '15%' },
  cCant:      { width: '5%', textAlign: 'right' },
  cSub:       { width: '11%', textAlign: 'right' },
  // Cuadre
  cuadreBox:  { backgroundColor: '#fafafa', padding: '6pt 8pt', marginTop: 6, borderWidth: 0.5, borderColor: '#e4e4e7' },
  cuadreRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: '#f4f4f5' },
  cuadreFin:  { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5, marginTop: 4, borderTopWidth: 2, borderTopColor: '#18181b' },
  // Footer
  footer:     { position: 'absolute', bottom: '8mm', left: '14mm', right: '14mm', textAlign: 'center', fontSize: 7, color: '#a1a1aa', borderTopWidth: 0.5, borderTopColor: '#e4e4e7', paddingTop: 4 },
});

// ── Documento PDF ─────────────────────────────────────────────────────────
function ResumenCajaPDF({ arqueo, empresa, logoUrl, cobros, gastos, pagosCompra, ventasDetalle }) {
  const fmtP = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
  const fmtF = f => f ? new Date(f).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const cobrosPM  = groupByMethod(cobros);
  const gastosPM  = groupByMethod(gastos);
  const comprasPM = groupByMethod(pagosCompra);

  const totalCobros  = cobros.reduce((s, c) => s + Number(c.monto), 0);
  const totalGastos  = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const totalCompras = pagosCompra.reduce((s, p) => s + Number(p.monto), 0);
  const totalVendido = ventasDetalle.reduce((s, i) => s + Number(i.subtotal ?? 0), 0);

  const cobrosEf  = cobrosPM['EFECTIVO'] || 0;
  const gastosEf  = gastosPM['EFECTIVO'] || 0;
  const comprasEf = comprasPM['EFECTIVO'] || 0;
  const sistemaEf = Number(arqueo.monto_apertura) + cobrosEf - gastosEf - comprasEf;
  const difNum    = Number(arqueo.diferencia ?? 0);

  const nombreEmpresa = empresa?.nombre_comercial || empresa?.razon_social || 'MEGAELECTRA';
  const absLogo = logoUrl && logoUrl !== '/logo.png'
    ? (logoUrl.startsWith('http') ? logoUrl : window.location.origin + logoUrl)
    : null;

  const infoItems = [
    ['Cajero',    arqueo.usuario],
    ['Estado',    arqueo.estado],
    ['Apertura',  fmtF(arqueo.fecha_apertura)],
    ['Cierre',    fmtF(arqueo.fecha_cierre)],
    ['Monto apertura', `Bs ${fmtP(arqueo.monto_apertura)}`],
    ['Total cobrado',  `Bs ${fmtP(totalCobros)}`],
  ];

  return (
    <Document>
      <Page size="A4" style={P.page}>

        {/* Header empresa */}
        <View style={P.header}>
          {absLogo && <Image src={absLogo} style={P.logo} />}
          <View style={P.empWrap}>
            <Text style={P.empName}>{nombreEmpresa}</Text>
            {empresa?.razon_social && empresa?.nombre_comercial && empresa.razon_social !== empresa.nombre_comercial && (
              <Text style={[P.empSub, { marginBottom: 1 }]}>{empresa.razon_social}</Text>
            )}
            {empresa?.nit       && <Text style={P.empSub}>NIT: {empresa.nit}</Text>}
            {empresa?.direccion && <Text style={P.empSub}>Dir: {empresa.direccion}</Text>}
            {empresa?.telefono  && <Text style={P.empSub}>Tel: {empresa.telefono}</Text>}
            {empresa?.email     && <Text style={P.empSub}>{empresa.email}</Text>}
          </View>
        </View>

        {/* Título */}
        <View style={P.titBox}>
          <Text style={P.titText}>RESUMEN DE TURNO</Text>
          <Text style={P.titSub}>{arqueo.caja} — {arqueo.sucursal}</Text>
        </View>

        {/* Info grid */}
        <View style={P.infoGrid}>
          {infoItems.map(([lbl, val]) => (
            <View key={lbl} style={P.infoCell}>
              <Text style={P.infoLbl}>{lbl}</Text>
              <Text style={P.infoVal}>{val}</Text>
            </View>
          ))}
        </View>

        {/* Cobros */}
        {totalCobros > 0 && (
          <View>
            <Text style={P.secHdr}>Cobros por método de pago</Text>
            {Object.entries(cobrosPM).map(([m, v]) => (
              <View key={m} style={P.row}>
                <Text style={P.lbl}>{m.replace(/_/g, ' ')}</Text>
                <Text style={P.val}>Bs {fmtP(v)}</Text>
              </View>
            ))}
            <View style={P.rowTotal}>
              <Text style={P.val}>Total cobros</Text>
              <Text style={P.val}>Bs {fmtP(totalCobros)}</Text>
            </View>
          </View>
        )}

        {/* Gastos */}
        {totalGastos > 0 && (
          <View>
            <Text style={P.secHdr}>Gastos por método de pago</Text>
            {Object.entries(gastosPM).map(([m, v]) => (
              <View key={m} style={P.row}>
                <Text style={P.lbl}>{m.replace(/_/g, ' ')}</Text>
                <Text style={P.val}>Bs {fmtP(v)}</Text>
              </View>
            ))}
            <View style={P.rowTotal}>
              <Text style={P.val}>Total gastos</Text>
              <Text style={P.val}>Bs {fmtP(totalGastos)}</Text>
            </View>
          </View>
        )}

        {/* Pagos proveedor */}
        {totalCompras > 0 && (
          <View>
            <Text style={P.secHdr}>Pagos a proveedores</Text>
            {Object.entries(comprasPM).map(([m, v]) => (
              <View key={m} style={P.row}>
                <Text style={P.lbl}>{m.replace(/_/g, ' ')}</Text>
                <Text style={P.val}>Bs {fmtP(v)}</Text>
              </View>
            ))}
            <View style={P.rowTotal}>
              <Text style={P.val}>Total pagos</Text>
              <Text style={P.val}>Bs {fmtP(totalCompras)}</Text>
            </View>
          </View>
        )}

        {/* Productos vendidos */}
        {ventasDetalle.length > 0 && (
          <View>
            <Text style={P.secHdr}>Detalle de productos vendidos</Text>
            <View style={P.tblHead}>
              <View style={P.cVenta}><Text style={P.th}>Venta</Text></View>
              <View style={P.cProd}><Text style={P.th}>Producto</Text></View>
              <View style={P.cMarca}><Text style={P.th}>Marca</Text></View>
              <View style={P.cModelo}><Text style={P.th}>Modelo</Text></View>
              <View style={P.cColor}><Text style={P.th}>Color</Text></View>
              <View style={P.cSerie}><Text style={P.th}>N° Serie</Text></View>
              <View style={P.cCant}><Text style={[P.th, { textAlign: 'right' }]}>Cant</Text></View>
              <View style={P.cSub}><Text style={[P.th, { textAlign: 'right' }]}>Subtotal</Text></View>
            </View>
            {ventasDetalle.map((item, i) => (
              <View key={i} style={i % 2 === 0 ? P.tblRow : P.tblRowAlt}>
                <View style={P.cVenta}><Text style={[P.td, { fontSize: 7 }]}>{item.venta_numero}</Text></View>
                <View style={P.cProd}><Text style={P.td}>{item.producto}</Text></View>
                <View style={P.cMarca}><Text style={P.td}>{item.marca || '—'}</Text></View>
                <View style={P.cModelo}><Text style={P.td}>{item.modelo || '—'}</Text></View>
                <View style={P.cColor}><Text style={P.td}>{item.color || '—'}</Text></View>
                <View style={P.cSerie}><Text style={[P.td, { fontFamily: 'Courier', fontSize: 7 }]}>{item.numero_serie || '—'}</Text></View>
                <View style={P.cCant}><Text style={[P.td, { textAlign: 'right' }]}>{fmtP(item.cantidad)}</Text></View>
                <View style={P.cSub}><Text style={[P.td, { textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>Bs {fmtP(item.subtotal)}</Text></View>
              </View>
            ))}
            <View style={P.rowTotal}>
              <Text style={P.val}>Total vendido</Text>
              <Text style={P.val}>Bs {fmtP(totalVendido)}</Text>
            </View>
          </View>
        )}

        {/* Cuadre efectivo */}
        <Text style={P.secHdr}>Cuadre de efectivo</Text>
        <View style={P.cuadreBox}>
          <View style={P.cuadreRow}>
            <Text style={P.lbl}>Monto apertura</Text>
            <Text style={P.val}>Bs {fmtP(arqueo.monto_apertura)}</Text>
          </View>
          {cobrosEf > 0 && (
            <View style={P.cuadreRow}>
              <Text style={P.lbl}>+ Cobros en efectivo</Text>
              <Text style={[P.val, { color: '#16a34a' }]}>Bs {fmtP(cobrosEf)}</Text>
            </View>
          )}
          {gastosEf > 0 && (
            <View style={P.cuadreRow}>
              <Text style={P.lbl}>− Gastos en efectivo</Text>
              <Text style={[P.val, { color: '#dc2626' }]}>Bs {fmtP(gastosEf)}</Text>
            </View>
          )}
          {comprasEf > 0 && (
            <View style={P.cuadreRow}>
              <Text style={P.lbl}>− Pagos a proveedores</Text>
              <Text style={[P.val, { color: '#dc2626' }]}>Bs {fmtP(comprasEf)}</Text>
            </View>
          )}
          <View style={[P.cuadreRow, { borderTopWidth: 1, borderTopColor: '#d4d4d8', marginTop: 3, paddingTop: 4 }]}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10 }}>Total esperado (sistema)</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10 }}>Bs {fmtP(sistemaEf)}</Text>
          </View>
          {arqueo.monto_cierre_real != null && (
            <>
              <View style={[P.cuadreRow, { marginTop: 4 }]}>
                <Text style={P.lbl}>Conteo físico real</Text>
                <Text style={P.val}>Bs {fmtP(arqueo.monto_cierre_real)}</Text>
              </View>
              <View style={[P.cuadreFin, { color: difNum === 0 ? '#52525b' : difNum > 0 ? '#16a34a' : '#dc2626' }]}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10 }}>DIFERENCIA</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10 }}>
                  {difNum >= 0 ? '+' : ''}Bs {fmtP(arqueo.diferencia)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Observaciones */}
        {arqueo.observaciones && (
          <View style={{ marginTop: 8, padding: '5pt 7pt', backgroundColor: '#fef9c3', borderWidth: 0.5, borderColor: '#fbbf24' }}>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#713f12', marginBottom: 2 }}>OBSERVACIONES</Text>
            <Text style={{ fontSize: 8, color: '#713f12' }}>{arqueo.observaciones}</Text>
          </View>
        )}

        {/* Footer fijo */}
        <View style={P.footer} fixed>
          <Text>
            Documento interno de turno — {nombreEmpresa} — Generado el{' '}
            {new Date().toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ── Modal gasto rápido (imprevistos durante el turno) ────────────────────
function ModalGastoRapido({ arqueo, onClose, onSuccess }) {
  const HOY = new Date().toISOString().slice(0, 10);

  const [categorias, setCategorias] = useState([]);
  const [monedaBase, setMonedaBase] = useState(null);
  const [cargandoCat, setCargandoCat] = useState(true);
  const [mostrarCategoria, setMostrarCategoria] = useState(false);

  const [form, setForm] = useState({
    id_categoria_gasto: '',
    descripcion: '',
    monto: '',
    metodo_pago: 'EFECTIVO',
    numero_comprobante: '',
  });
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    gastosService.getFormData()
      .then(({ data }) => {
        const cats = (data.categorias ?? []).filter(c => c.activo);
        setCategorias(cats);
        setForm(p => ({ ...p, id_categoria_gasto: cats[0]?.id_categoria_gasto ?? '' }));
        setMonedaBase((data.monedas ?? []).find(m => m.es_moneda_base) ?? data.monedas?.[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setCargandoCat(false));
  }, []);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleGuardar = async () => {
    setError('');
    if (!form.id_categoria_gasto) return setError('Elegí una categoría');
    if (!form.descripcion.trim()) return setError('Ingresá una descripción');
    if (!(Number(form.monto) > 0)) return setError('Ingresá un monto válido');
    if (!monedaBase) return setError('No hay moneda configurada');

    setCargando(true);
    try {
      await gastosService.crearGasto({
        id_categoria_gasto: form.id_categoria_gasto,
        id_sucursal: arqueo.id_sucursal,
        descripcion: form.descripcion.trim(),
        fecha: HOY,
        id_moneda: monedaBase.id_moneda,
        monto: form.monto,
        metodo_pago: form.metodo_pago,
        numero_comprobante: form.numero_comprobante.trim() || undefined,
      });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.mensaje ?? 'Error al registrar el gasto');
    } finally {
      setCargando(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Registrar gasto</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{arqueo.caja} — {arqueo.sucursal}</p>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {mostrarCategoria ? (
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Categoría *</label>
            <select
              value={form.id_categoria_gasto} onChange={e => setF('id_categoria_gasto', e.target.value)}
              disabled={cargandoCat} className={inputCls}
            >
              {categorias.map(c => <option key={c.id_categoria_gasto} value={c.id_categoria_gasto}>{c.nombre}</option>)}
            </select>
          </div>
        ) : (
          !cargandoCat && categorias.length > 1 && (
            <button type="button" onClick={() => setMostrarCategoria(true)}
              className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-yellow-600 dark:hover:text-yellow-400 underline underline-offset-2">
              Categoría: {categorias.find(c => String(c.id_categoria_gasto) === String(form.id_categoria_gasto))?.nombre ?? '—'} (cambiar)
            </button>
          )
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Descripción *</label>
          <input
            type="text" value={form.descripcion} onChange={e => setF('descripcion', e.target.value)}
            placeholder="Ej: Taxi para entrega urgente" className={inputCls} autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Monto (Bs) *</label>
            <input
              type="number" min={0} step="0.01" value={form.monto}
              onChange={e => setF('monto', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Método</label>
            <select value={form.metodo_pago} onChange={e => setF('metodo_pago', e.target.value)} className={inputCls}>
              {['EFECTIVO', 'TRANSFERENCIA', 'QR', 'CHEQUE', 'TARJETA', 'OTRO'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">N° Comprobante</label>
          <input
            type="text" value={form.numero_comprobante} onChange={e => setF('numero_comprobante', e.target.value)}
            placeholder="Opcional" className={inputCls}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={handleGuardar} disabled={cargando || cargandoCat}
            className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors">
            {cargando ? 'Guardando…' : 'Registrar gasto'}
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

  const idCol    = columnas[0];
  const montoCol = columnas[columnas.length - 1];
  const midCols  = columnas.slice(1, -1).filter(c => !c.right);

  return (
    <>
      {/* ── Tarjetas — móvil < md ── */}
      <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
        {filas.map((fila, i) => (
          <div key={i} className="px-4 py-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                {idCol.render ? idCol.render(fila) : fila[idCol.key]}
              </span>
              <span className={`font-mono font-bold text-sm ${colorTotal}`}>
                {signo !== '' ? signo + ' ' : ''}Bs {montoCol.render ? montoCol.render(fila) : fila[montoCol.key]}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {midCols.map(c => {
                const val = c.render ? c.render(fila) : fila[c.key];
                if (!val) return null;
                return (
                  <span key={c.key} className={c.small ? 'text-xs text-zinc-400 dark:text-zinc-500' : 'text-sm text-zinc-700 dark:text-zinc-300'}>
                    {val}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 flex justify-between">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total</span>
          <span className={`font-mono font-bold text-sm ${colorTotal}`}>
            {signo !== '' ? signo + ' ' : ''}Bs {fmt(total)}
          </span>
        </div>
      </div>

      {/* ── Tabla — desktop md+ ── */}
      <div className="hidden md:block overflow-x-auto">
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
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function ArqueoDetalle() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { puede } = usePermission();
  const { empresa, logoUrl } = useEmpresa() ?? {};

  const puedoCerrar = puede('cerrar', 'caja');
  const puedoRegistrarGasto = puede('crear', 'gastos');

  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modal,    setModal]    = useState(null);
  const [tab,      setTab]      = useState('cobros');

  const cargar = () => {
    setCargando(true);
    cajaService.getArqueo(id)
      .then(r => setData(r.data))
      .catch(() => navigate('/caja'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [id]); // eslint-disable-line

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!data) return null;

  const { arqueo, cobros = [], gastos = [], pagosCompra = [], ventasDetalle = [], monto_cierre_sistema_provisional } = data;
  const esAbierta = arqueo.estado === 'ABIERTA';

  const cobrosEf  = cobros.filter(c => c.metodo_pago === 'EFECTIVO').reduce((s, c) => s + Number(c.monto), 0);
  const gastosEf  = gastos.filter(g => g.metodo_pago === 'EFECTIVO').reduce((s, g) => s + Number(g.monto), 0);
  const comprasEf = pagosCompra.filter(p => p.metodo_pago === 'EFECTIVO').reduce((s, p) => s + Number(p.monto), 0);

  const totalCobros  = cobros.reduce((s, c) => s + Number(c.monto), 0);
  const totalGastos  = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const totalCompras = pagosCompra.reduce((s, p) => s + Number(p.monto), 0);

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

  const pdfDoc = (
    <ResumenCajaPDF
      arqueo={arqueo}
      empresa={empresa}
      logoUrl={logoUrl}
      cobros={cobros}
      gastos={gastos}
      pagosCompra={pagosCompra}
      ventasDetalle={ventasDetalle}
    />
  );

  const pdfFilename = `turno-${(arqueo.caja ?? 'caja').replace(/\s+/g, '-').toLowerCase()}-${arqueo.id_arqueo}.pdf`;

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
          {/* Botón descargar PDF */}
          <PDFDownloadLink document={pdfDoc} fileName={pdfFilename}>
            {({ loading: pdfLoading }) => (
              <button
                disabled={pdfLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {pdfLoading ? 'Generando…' : 'Descargar PDF'}
              </button>
            )}
          </PDFDownloadLink>

          <Link to="/caja"
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Volver
          </Link>
          {esAbierta && puedoRegistrarGasto && (
            <button onClick={() => setModal('gasto')}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              + Registrar gasto
            </button>
          )}
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

      {modal === 'gasto' && (
        <ModalGastoRapido
          arqueo={arqueo}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); cargar(); }}
        />
      )}

      {modal === 'cerrar' && (
        <ModalCerrar
          arqueo={arqueo}
          provisional={esAbierta ? monto_cierre_sistema_provisional : null}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}
