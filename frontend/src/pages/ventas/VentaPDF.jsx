import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Document, Page, Text, View, StyleSheet, pdf, Image,
} from '@react-pdf/renderer';
import { ventasService } from '../../services/ventas.service';

/* ─── Helpers (mismos que VentaImprimir.jsx) ──────────────────────────────── */
const fmt   = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fecha = s => s ? new Date(s).toLocaleString('es-BO') : '—';

/* ─── Estilos ──────────────────────────────────────────────────────────────── */
const S = StyleSheet.create({
  page:     { fontFamily: 'Helvetica', fontSize: 10, color: '#111827', padding: '14mm 16mm' },

  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
              borderBottomWidth: 3, borderBottomColor: '#facc15', paddingBottom: 12, marginBottom: 14 },
  logo:     { width: 64, height: 44, objectFit: 'contain', marginBottom: 4 },
  empNom:   { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  empMeta:  { fontSize: 8, color: '#6b7280', marginTop: 1 },
  docRight: { alignItems: 'flex-end' },
  docBadge: { backgroundColor: '#facc15', color: '#1c1917', fontSize: 8,
              fontFamily: 'Helvetica-Bold', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 3 },
  docNum:   { fontSize: 20, fontFamily: 'Helvetica-Bold', marginTop: 4, marginBottom: 4, letterSpacing: 0.5 },
  docFact:  { fontSize: 8, color: '#6b7280', marginTop: 1 },

  grid2:    { flexDirection: 'row', gap: 16, marginBottom: 14 },
  col:      { flex: 1 },
  lbl:      { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  val:      { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 1 },
  sub:      { fontSize: 8, color: '#4b5563', marginBottom: 1 },

  divider:  { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginBottom: 12 },
  secTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },

  tHead:    { flexDirection: 'row', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  tRow:     { flexDirection: 'row', borderLeftWidth: 1, borderRightWidth: 1,
              borderBottomWidth: 1, borderColor: '#e5e7eb' },
  tRowAlt:  { flexDirection: 'row', backgroundColor: '#f9fafb',
              borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  th:       { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#4b5563', paddingVertical: 5, paddingHorizontal: 5 },
  td:       { fontSize: 8, color: '#374151', paddingVertical: 5, paddingHorizontal: 5 },
  right:    { textAlign: 'right' },
  mono:     { fontFamily: 'Courier' },

  cN:     { width: 20 },
  cProd:  { flex: 1 },
  cPre:   { width: 70, textAlign: 'right' },
  cCant:  { width: 45, textAlign: 'right' },
  cDto:   { width: 50, textAlign: 'right' },
  cSub:   { width: 80, textAlign: 'right' },
  pNom:   { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#111827' },
  pSpec:  { fontSize: 7, color: '#6b7280', marginTop: 1 },

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

  firmas:   { flexDirection: 'row', justifyContent: 'space-around', marginTop: 40, gap: 20 },
  firmaBlq: { flex: 1, alignItems: 'center' },
  firmaLin: { borderTopWidth: 1, borderTopColor: '#111827', width: '90%', marginBottom: 5 },
  firmaTit: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#4b5563' },

  footer:   { borderTopWidth: 1.5, borderTopColor: '#111827', paddingTop: 6, marginTop: 16, textAlign: 'center' },
  footNota: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151', fontStyle: 'italic' },
});

/* ─── Documento PDF ────────────────────────────────────────────────────────── */
function VentaDoc({ data: d, logoUrl }) {
  const empresa = d.empresa_comercial || d.empresa_razon || 'MEGAELECTRA';
  const clienteNombre = d.cliente_razon || `${d.cliente_nombres ?? ''} ${d.cliente_apellidos ?? ''}`.trim();

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Encabezado ── */}
        <View style={S.header}>
          <View>
            {logoUrl && logoUrl !== '/logo.png' && (
              <Image src={logoUrl} style={S.logo} />
            )}
            <Text style={S.empNom}>{empresa}</Text>
            {d.empresa_nit        && <Text style={S.empMeta}>NIT: {d.empresa_nit}</Text>}
            {d.sucursal_nombre    && <Text style={S.empMeta}>Sucursal: {d.sucursal_nombre}</Text>}
            {d.sucursal_direccion && <Text style={S.empMeta}>{d.sucursal_direccion}</Text>}
            {d.sucursal_telefono  && <Text style={S.empMeta}>Tel: {d.sucursal_telefono}</Text>}
          </View>
          <View style={S.docRight}>
            <Text style={S.docBadge}>RECIBO</Text>
            <Text style={S.docNum}>{d.numero}</Text>
            {d.numero_factura && <Text style={S.docFact}>Factura: {d.numero_factura}</Text>}
            <Text style={S.docFact}>Fecha: {fecha(d.fecha)}</Text>
            <Text style={S.docFact}>Vendedor: {d.vendedor_nombre}</Text>
          </View>
        </View>

        {/* ── Cliente / Condición ── */}
        <View style={S.grid2}>
          <View style={S.col}>
            <Text style={S.lbl}>Cliente</Text>
            <Text style={S.val}>{clienteNombre}</Text>
            {d.cliente_documento && <Text style={S.sub}>{d.tipo_documento}: {d.cliente_documento}</Text>}
          </View>
          <View style={S.col}>
            <Text style={S.lbl}>Condición</Text>
            <Text style={S.val}>{d.condicion_pago === 'CREDITO' ? `Crédito (${d.dias_credito} días)` : 'Contado'}</Text>
            {d.requiere_entrega && d.direccion_entrega && (
              <>
                <Text style={[S.lbl, { marginTop: 6 }]}>Entrega</Text>
                <Text style={S.sub}>{d.direccion_entrega}</Text>
                {d.fecha_entrega && <Text style={S.sub}>Fecha: {fecha(d.fecha_entrega)}</Text>}
              </>
            )}
          </View>
        </View>

        <View style={S.divider} />

        {/* ── Tabla productos ── */}
        <Text style={S.secTitle}>Detalle de Productos</Text>
        <View style={S.tHead}>
          <Text style={[S.th, S.cN]}>#</Text>
          <Text style={[S.th, S.cProd]}>Descripción</Text>
          <Text style={[S.th, S.cPre, S.right]}>P. Unit.</Text>
          <Text style={[S.th, S.cCant, S.right]}>Cant.</Text>
          <Text style={[S.th, S.cDto, S.right]}>Dto.</Text>
          <Text style={[S.th, S.cSub, S.right]}>Subtotal</Text>
        </View>
        {(d.detalle ?? []).map((it, i) => {
          const base = Number(it.cantidad) * Number(it.precio_unitario);
          const desc = base * (Number(it.descuento_porc ?? 0) / 100);
          const sub  = base - desc;
          return (
            <View key={i} style={i % 2 === 0 ? S.tRow : S.tRowAlt}>
              <Text style={[S.td, S.cN, { color: '#9ca3af' }]}>{i + 1}</Text>
              <View style={[S.cProd, { paddingVertical: 5, paddingHorizontal: 5 }]}>
                <Text style={S.pNom}>{it.producto}</Text>
                {(it.marca || it.modelo || it.color || it.numero_serie) && (
                  <Text style={S.pSpec}>
                    {[it.marca && `Marca: ${it.marca}`, it.modelo && `Mod: ${it.modelo}`, it.color && `Color: ${it.color}`, it.numero_serie && `S/N: ${it.numero_serie}`]
                      .filter(Boolean).join('  ·  ')}
                  </Text>
                )}
              </View>
              <Text style={[S.td, S.cPre, S.right, S.mono]}>Bs {fmt(it.precio_unitario)}</Text>
              <Text style={[S.td, S.cCant, S.right]}>{fmt(it.cantidad)}</Text>
              <Text style={[S.td, S.cDto, S.right]}>{Number(it.descuento_porc) > 0 ? `${it.descuento_porc}%` : '—'}</Text>
              <Text style={[S.td, S.cSub, S.right, S.mono, { fontFamily: 'Helvetica-Bold' }]}>Bs {fmt(sub)}</Text>
            </View>
          );
        })}

        {/* ── Totales ── */}
        <View style={S.totWrap}>
          <View style={S.totBox}>
            <View style={S.totRow}>
              <Text style={S.totLbl}>Subtotal:</Text>
              <Text style={S.totVal}>Bs {fmt(d.subtotal)}</Text>
            </View>
            {Number(d.descuento_monto) > 0 && (
              <View style={S.totRow}>
                <Text style={S.totLbl}>Descuento ({d.descuento_porc}%):</Text>
                <Text style={[S.totVal, { color: '#ef4444' }]}>-Bs {fmt(d.descuento_monto)}</Text>
              </View>
            )}
            {Number(d.impuesto) > 0 && (
              <View style={S.totRow}>
                <Text style={S.totLbl}>Impuesto:</Text>
                <Text style={S.totVal}>Bs {fmt(d.impuesto)}</Text>
              </View>
            )}
            <View style={S.totFinal}>
              <Text style={S.totFLbl}>TOTAL:</Text>
              <Text style={S.totFVal}>Bs {fmt(d.total)}</Text>
            </View>
            {Number(d.saldo_pendiente) > 0 && (
              <View style={S.saldoRow}>
                <Text style={S.saldoLbl}>SALDO PENDIENTE:</Text>
                <Text style={S.saldoVal}>Bs {fmt(d.saldo_pendiente)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Firmas ── */}
        <View style={S.firmas}>
          <View style={S.firmaBlq}>
            <View style={S.firmaLin} />
            <Text style={S.firmaTit}>Firma del Vendedor</Text>
          </View>
          <View style={S.firmaBlq}>
            <View style={S.firmaLin} />
            <Text style={S.firmaTit}>Firma del Cliente / Receptor</Text>
          </View>
        </View>

        {/* ── Pie ── */}
        <View style={S.footer}>
          <Text style={S.footNota}>
            NOTA: NO SE ACEPTAN CAMBIOS NI DEVOLUCIONES. VERIFIQUE ANTES DE RETIRAR EL PRODUCTO.
          </Text>
        </View>

      </Page>
    </Document>
  );
}

/* ─── Función de descarga directa (exportada para usar desde VentaDetalle) ── */
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

export async function descargarVentaPDF(id, logoUrl) {
  const [{ data }, logoBase64] = await Promise.all([
    ventasService.ticket(id),
    urlToBase64(logoUrl),
  ]);

  const blob = await pdf(<VentaDoc data={data} logoUrl={logoBase64} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `venta-${data.numero}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Página de ruta (auto-descarga y vuelve) ─────────── */
export default function VentaPDFPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    descargarVentaPDF(id, undefined)
      .then(() => navigate(-1))
      .catch(() => navigate(-1));
  }, [id]); // eslint-disable-line

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: '100vh', fontFamily: 'Arial, sans-serif', color: '#6b7280' }}>
      Generando PDF…
    </div>
  );
}
