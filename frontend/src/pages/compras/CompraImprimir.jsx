import {
  Document, Page, Text, View, StyleSheet, pdf, Image,
} from '@react-pdf/renderer';
import { comprasService } from '../../services/compras.service';

const fmt   = n  => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN  = n  => Number(n ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 4 });
const fecha = s  => s ? new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const ESTADO_COLOR = {
  PRE_PEDIDO: { bg: '#f4f4f5', fg: '#52525b' },
  CONFIRMADO: { bg: '#eef2ff', fg: '#4338ca' },
  POR_LLEGAR: { bg: '#dbeafe', fg: '#1d4ed8' },
  PARCIAL:    { bg: '#fffbeb', fg: '#b45309' },
  RECIBIDO:   { bg: '#dcfce7', fg: '#15803d' },
  ANULADO:    { bg: '#fee2e2', fg: '#b91c1c' },
};
const ESTADO_LABEL = {
  PRE_PEDIDO: 'Pre-Pedido', CONFIRMADO: 'Confirmado', POR_LLEGAR: 'Por Llegar',
  PARCIAL: 'Parcial', RECIBIDO: 'Recibido', ANULADO: 'Anulado',
};

const S = StyleSheet.create({
  page:     { fontFamily: 'Helvetica', fontSize: 10, color: '#111827', padding: '14mm 16mm' },

  // Encabezado
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
              borderBottomWidth: 3, borderBottomColor: '#facc15', paddingBottom: 12, marginBottom: 14 },
  logo:     { width: 64, height: 44, objectFit: 'contain', marginBottom: 4 },
  empNom:   { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  empMeta:  { fontSize: 8, color: '#6b7280', marginTop: 1 },
  docRight: { alignItems: 'flex-end' },
  docBadge: { backgroundColor: '#facc15', color: '#1c1917', fontSize: 8,
              fontFamily: 'Helvetica-Bold', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 3 },
  docNum:   { fontSize: 20, fontFamily: 'Helvetica-Bold', marginTop: 4, marginBottom: 4, letterSpacing: 0.5 },
  estBadge: { fontSize: 8, fontFamily: 'Helvetica-Bold', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 3 },
  docFact:  { fontSize: 8, color: '#6b7280', marginTop: 4 },

  // Grilla info
  grid4:    { flexDirection: 'row', gap: 12, marginBottom: 14 },
  col:      { flex: 1 },
  lbl:      { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  val:      { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 1 },
  sub:      { fontSize: 8, color: '#4b5563', marginBottom: 1 },

  divider:  { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginBottom: 12 },

  // Sección título
  secTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },

  // Tabla productos
  tHead:    { flexDirection: 'row', backgroundColor: '#f3f4f6',
              borderWidth: 1, borderColor: '#e5e7eb' },
  tRow:     { flexDirection: 'row', borderLeftWidth: 1, borderRightWidth: 1,
              borderBottomWidth: 1, borderColor: '#e5e7eb' },
  tRowAlt:  { flexDirection: 'row', backgroundColor: '#f9fafb',
              borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  th:       { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#4b5563',
              paddingVertical: 5, paddingHorizontal: 5 },
  td:       { fontSize: 8, color: '#374151', paddingVertical: 5, paddingHorizontal: 5 },
  right:    { textAlign: 'right' },
  mono:     { fontFamily: 'Courier' },

  // Columnas
  cN:     { width: 20 },
  cCod:   { width: 70 },
  cProd:  { flex: 1 },
  cCant:  { width: 55, textAlign: 'right' },
  cUm:    { width: 30 },
  cPre:   { width: 82, textAlign: 'right' },
  cSub:   { width: 88, textAlign: 'right' },
  pNom:   { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#111827' },
  pMarca: { fontSize: 7, color: '#9ca3af', marginTop: 1 },
  pDet:   { fontSize: 7, color: '#6b7280', marginTop: 1 },
  pSpec:  { fontSize: 7, color: '#9ca3af', marginTop: 1 },

  // Totales
  totWrap:  { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, marginBottom: 14 },
  totBox:   { width: 210 },
  totRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2,
              borderBottomWidth: 1, borderBottomColor: '#f3f4f6', borderBottomStyle: 'dashed' },
  totLbl:   { fontSize: 8, color: '#4b5563' },
  totVal:   { fontSize: 8, color: '#374151', fontFamily: 'Courier' },
  totFinal: { flexDirection: 'row', justifyContent: 'space-between',
              borderTopWidth: 2, borderTopColor: '#111827', paddingTop: 5, marginTop: 4 },
  totFLbl:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  totFVal:  { fontSize: 11, fontFamily: 'Courier', color: '#111827' },
  saldoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  saldoLbl: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#dc2626' },
  saldoVal: { fontSize: 8, fontFamily: 'Courier', color: '#dc2626' },

  // Obs
  obsBox:   { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 3,
              padding: 8, marginBottom: 12 },
  obsText:  { fontSize: 8, color: '#374151', marginTop: 2 },

  // Tabla chica (cuotas/pagos)
  tSmHead:  { flexDirection: 'row', backgroundColor: '#f3f4f6',
              borderWidth: 1, borderColor: '#e5e7eb' },
  tSmRow:   { flexDirection: 'row', borderLeftWidth: 1, borderRightWidth: 1,
              borderBottomWidth: 1, borderColor: '#e5e7eb' },

  // Firmas
  firmas:   { flexDirection: 'row', justifyContent: 'space-around', marginTop: 40, gap: 20 },
  firmaBlq: { flex: 1, alignItems: 'center' },
  firmaLin: { borderTopWidth: 1, borderTopColor: '#111827', width: '90%', marginBottom: 5 },
  firmaTit: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#4b5563' },
  firmaNom: { fontSize: 8, color: '#111827', marginTop: 2 },

  // Footer
  footer:   { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8,
              flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  footTxt:  { fontSize: 7, color: '#9ca3af' },
});

/* ─── Documento PDF ────────────────────────────────────────────────────── */
function CompraDoc({ compra: c, detalle = [], cuotas = [], pagos = [], empresa: e, logoUrl }) {
  const sym  = c.moneda_simbolo ?? c.moneda_codigo ?? '';
  const fmtM = (n) => `${sym} ${fmt(n)}`;
  const est  = ESTADO_COLOR[c.estado] ?? ESTADO_COLOR.ANULADO;
  const pagosActivos = pagos.filter(p => p.estado !== 'ANULADO');
  const specLinea = d => [d.modelo && `Mod: ${d.modelo}`, d.color && `Color: ${d.color}`, d.capacidad && `Cap: ${d.capacidad}`].filter(Boolean).join('  ·  ');

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Encabezado ── */}
        <View style={S.header}>
          <View>
            {logoUrl && logoUrl !== '/logo.png' && (
              <Image src={logoUrl} style={S.logo} />
            )}
            <Text style={S.empNom}>{e?.nombre_comercial || e?.razon_social || ''}</Text>
            {e?.nit       && <Text style={S.empMeta}>NIT: {e.nit}</Text>}
            {e?.telefono  && <Text style={S.empMeta}>Tel: {e.telefono}</Text>}
            {e?.direccion && <Text style={S.empMeta}>{e.direccion}</Text>}
          </View>
          <View style={S.docRight}>
            <Text style={S.docBadge}>ORDEN DE COMPRA</Text>
            <Text style={S.docNum}>{c.numero}</Text>
            <Text style={[S.estBadge, { backgroundColor: est.bg, color: est.fg }]}>
              {ESTADO_LABEL[c.estado] ?? c.estado}
            </Text>
            {c.numero_factura && (
              <Text style={S.docFact}>Factura: {c.numero_factura}</Text>
            )}
          </View>
        </View>

        {/* ── Info grid ── */}
        <View style={S.grid4}>
          <View style={S.col}>
            <Text style={S.lbl}>Proveedor</Text>
            <Text style={S.val}>{c.proveedor_nombre}</Text>
            {c.proveedor_codigo   && <Text style={S.sub}>Cód: {c.proveedor_codigo}</Text>}
            {c.proveedor_telefono && <Text style={S.sub}>Tel: {c.proveedor_telefono}</Text>}
          </View>
          <View style={S.col}>
            <Text style={S.lbl}>Destino</Text>
            <Text style={S.val}>{c.sucursal_nombre}</Text>
            <Text style={S.sub}>Depósito: {c.deposito_nombre}</Text>
          </View>
          <View style={S.col}>
            <Text style={S.lbl}>Fechas</Text>
            <Text style={S.sub}>Pedido: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{fecha(c.fecha_pedido)}</Text></Text>
            {c.fecha_estim_llegada && (
              <Text style={S.sub}>Est. llegada: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{fecha(c.fecha_estim_llegada)}</Text></Text>
            )}
            {c.fecha_recepcion && (
              <Text style={S.sub}>Recepción: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{fecha(c.fecha_recepcion)}</Text></Text>
            )}
          </View>
          <View style={S.col}>
            <Text style={S.lbl}>Pago</Text>
            <Text style={S.val}>{c.condicion_pago === 'CONTADO' ? 'Contado' : 'Crédito'}</Text>
            {c.condicion_pago === 'CREDITO' && Number(c.dias_credito) > 0 && (
              <Text style={S.sub}>{c.dias_credito} días</Text>
            )}
            <Text style={S.sub}>Moneda: {c.moneda_codigo}</Text>
            {Number(c.tipo_cambio) !== 1 && (
              <Text style={S.sub}>T.C.: {c.tipo_cambio}</Text>
            )}
          </View>
        </View>

        <View style={S.divider} />

        {/* ── Tabla productos ── */}
        <Text style={S.secTitle}>Detalle de Productos</Text>
        <View style={S.tHead}>
          <Text style={[S.th, S.cN]}>#</Text>
          <Text style={[S.th, S.cCod]}>Código</Text>
          <Text style={[S.th, S.cProd]}>Producto</Text>
          <Text style={[S.th, S.cCant, S.right]}>Cant.</Text>
          <Text style={[S.th, S.cUm]}>U.M.</Text>
          <Text style={[S.th, S.cPre, S.right]}>Precio unit.</Text>
          <Text style={[S.th, S.cSub, S.right]}>Subtotal</Text>
        </View>
        {detalle.map((d, i) => (
          <View key={d.id_detalle} style={i % 2 === 0 ? S.tRow : S.tRowAlt}>
            <Text style={[S.td, S.cN, { color: '#9ca3af' }]}>{i + 1}</Text>
            <Text style={[S.td, S.cCod, S.mono, { fontSize: 7 }]}>{d.codigo_interno}</Text>
            <View style={[S.cProd, { paddingVertical: 5, paddingHorizontal: 5 }]}>
              <Text style={S.pNom}>{d.producto}</Text>
              {d.marca_nombre && <Text style={S.pMarca}>{d.marca_nombre}</Text>}
              {d.producto_detalle && <Text style={S.pDet}>{d.producto_detalle}</Text>}
              {specLinea(d) && <Text style={S.pSpec}>{specLinea(d)}</Text>}
            </View>
            <Text style={[S.td, S.cCant, S.right]}>{fmtN(d.cantidad)}</Text>
            <Text style={[S.td, S.cUm, { fontSize: 7, color: '#9ca3af' }]}>{d.unidad_codigo}</Text>
            <Text style={[S.td, S.cPre, S.right, S.mono]}>{fmtM(d.precio_unitario)}</Text>
            <Text style={[S.td, S.cSub, S.right, S.mono, { fontFamily: 'Helvetica-Bold' }]}>{fmtM(d.subtotal)}</Text>
          </View>
        ))}

        {/* ── Totales ── */}
        <View style={S.totWrap}>
          <View style={S.totBox}>
            {Number(c.descuento) > 0 && (
              <View style={S.totRow}>
                <Text style={S.totLbl}>Descuento</Text>
                <Text style={[S.totVal, { color: '#ef4444' }]}>- {fmtM(c.descuento)}</Text>
              </View>
            )}
            {Number(c.impuesto) > 0 && (
              <View style={S.totRow}>
                <Text style={S.totLbl}>Impuesto</Text>
                <Text style={S.totVal}>{fmtM(c.impuesto)}</Text>
              </View>
            )}
            {Number(c.flete) > 0 && (
              <View style={S.totRow}>
                <Text style={S.totLbl}>Flete</Text>
                <Text style={S.totVal}>{fmtM(c.flete)}</Text>
              </View>
            )}
            {Number(c.otros_costos) > 0 && (
              <View style={S.totRow}>
                <Text style={S.totLbl}>Otros costos</Text>
                <Text style={S.totVal}>{fmtM(c.otros_costos)}</Text>
              </View>
            )}
            <View style={S.totFinal}>
              <Text style={S.totFLbl}>TOTAL</Text>
              <Text style={S.totFVal}>{fmtM(c.total)}</Text>
            </View>
            {Number(c.saldo_pendiente) > 0 && Number(c.saldo_pendiente) !== Number(c.total) && (
              <View style={S.saldoRow}>
                <Text style={S.saldoLbl}>Saldo pendiente</Text>
                <Text style={S.saldoVal}>{fmtM(c.saldo_pendiente)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Observaciones ── */}
        {c.observaciones && (
          <>
            <View style={S.divider} />
            <Text style={S.secTitle}>Observaciones</Text>
            <View style={S.obsBox}>
              <Text style={S.obsText}>{c.observaciones}</Text>
            </View>
          </>
        )}

        {/* ── Cuotas ── */}
        {cuotas.length > 0 && (
          <>
            <View style={S.divider} />
            <Text style={S.secTitle}>Plan de Cuotas</Text>
            <View style={S.tSmHead}>
              <Text style={[S.th, { width: 40 }]}>Cuota</Text>
              <Text style={[S.th, { flex: 1 }]}>Vencimiento</Text>
              <Text style={[S.th, { width: 100, textAlign: 'right' }]}>Monto</Text>
              <Text style={[S.th, { width: 70, textAlign: 'right' }]}>Estado</Text>
            </View>
            {cuotas.map(cu => (
              <View key={cu.id_cuota} style={S.tSmRow}>
                <Text style={[S.td, { width: 40, textAlign: 'center', color: '#6b7280' }]}>{cu.numero_cuota}</Text>
                <Text style={[S.td, { flex: 1 }]}>{fecha(cu.fecha_vencimiento)}</Text>
                <Text style={[S.td, { width: 100, textAlign: 'right', fontFamily: 'Courier' }]}>{fmtM(cu.monto)}</Text>
                <Text style={[S.td, { width: 70, textAlign: 'right', fontSize: 7, color: '#6b7280' }]}>{cu.estado}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Pagos ── */}
        {pagosActivos.length > 0 && (
          <>
            <View style={S.divider} />
            <Text style={S.secTitle}>Pagos Registrados</Text>
            <View style={S.tSmHead}>
              <Text style={[S.th, { width: 90 }]}>N° Pago</Text>
              <Text style={[S.th, { flex: 1 }]}>Método</Text>
              <Text style={[S.th, { width: 70, textAlign: 'right' }]}>Fecha</Text>
              <Text style={[S.th, { width: 100, textAlign: 'right' }]}>Monto</Text>
            </View>
            {pagosActivos.map(p => (
              <View key={p.id_pago} style={S.tSmRow}>
                <Text style={[S.td, { width: 90, fontFamily: 'Courier', fontSize: 7 }]}>{p.numero}</Text>
                <Text style={[S.td, { flex: 1 }]}>{p.metodo_pago}</Text>
                <Text style={[S.td, { width: 70, textAlign: 'right' }]}>{fecha(p.fecha?.slice(0, 10))}</Text>
                <Text style={[S.td, { width: 100, textAlign: 'right', fontFamily: 'Courier' }]}>{fmtM(p.monto)}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Firmas ── */}
        <View style={S.firmas}>
          <View style={S.firmaBlq}>
            <View style={S.firmaLin} />
            <Text style={S.firmaTit}>Elaborado por</Text>
            <Text style={S.firmaNom}>{c.crea_nombres} {c.crea_apellidos}</Text>
          </View>
          {(c.aprueba_nombres || c.aprueba_apellidos) && (
            <View style={S.firmaBlq}>
              <View style={S.firmaLin} />
              <Text style={S.firmaTit}>Aprobado por</Text>
              <Text style={S.firmaNom}>{c.aprueba_nombres} {c.aprueba_apellidos}</Text>
            </View>
          )}
          <View style={S.firmaBlq}>
            <View style={S.firmaLin} />
            <Text style={S.firmaTit}>Conformidad proveedor</Text>
            <Text style={S.firmaNom}> </Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={S.footer}>
          <Text style={S.footTxt}>
            Generado el {new Date().toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
          </Text>
          <Text style={S.footTxt}>{e?.razon_social ?? ''}</Text>
        </View>

      </Page>
    </Document>
  );
}

/* ─── Función de descarga directa (exportada para usar desde CompraDetalle) ── */
async function urlToBase64(url) {
  if (!url || url === '/logo.png') return null;
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror   = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function descargarCompraPDF(id, empresa, logoUrl) {
  const [{ data }, logoBase64] = await Promise.all([
    comprasService.getOne(id),
    urlToBase64(logoUrl),
  ]);
  const { compra, detalle, cuotas, pagos } = data;

  const blob = await pdf(
    <CompraDoc
      compra={compra}
      detalle={detalle}
      cuotas={cuotas}
      pagos={pagos}
      empresa={empresa}
      logoUrl={logoBase64}
    />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `compra-${compra.numero}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
