import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Document, Page, Text, View, StyleSheet, pdf, Image,
} from '@react-pdf/renderer';
import { cotizacionesService } from '../../services/cotizaciones.service';

/* ─── Helpers ─────────────────────────────────────────── */
const fmt  = n  => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fecha = s => s ? new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const ESTADO_COLOR = {
  APROBADA:  { bg: '#dcfce7', fg: '#15803d' },
  EMITIDA:   { bg: '#dbeafe', fg: '#1d4ed8' },
  VENCIDA:   { bg: '#ffedd5', fg: '#c2410c' },
  RECHAZADA: { bg: '#fee2e2', fg: '#b91c1c' },
  CONVERTIDA:{ bg: '#f5f3ff', fg: '#6d28d9' },
  BORRADOR:  { bg: '#f3f4f6', fg: '#6b7280' },
};

/* ─── Estilos ─────────────────────────────────────────── */
const S = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 10, color: '#111827', padding: '15mm' },

  // Header
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
                borderBottomWidth: 3, borderBottomColor: '#facc15', paddingBottom: 12, marginBottom: 16 },
  logo:       { width: 60, height: 40, objectFit: 'contain', marginBottom: 4 },
  empresa:    { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  meta:       { fontSize: 8, color: '#6b7280', marginTop: 1 },
  badgeTitle: { backgroundColor: '#facc15', color: '#1c1917', fontSize: 8, fontFamily: 'Helvetica-Bold',
                paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4 },
  numero:     { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 4, marginBottom: 2 },
  estadoBadge:{ fontSize: 8, fontFamily: 'Helvetica-Bold', paddingVertical: 2, paddingHorizontal: 6,
                borderRadius: 3, marginTop: 3 },

  // Info grid
  grid2:      { flexDirection: 'row', gap: 16, marginBottom: 14 },
  col:        { flex: 1 },
  sectionLbl: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af',
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  fieldBold:  { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#111827', marginBottom: 1 },
  field:      { fontSize: 8, color: '#4b5563', marginBottom: 1 },

  // Tabla
  tableHead:  { flexDirection: 'row', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  tableRow:   { flexDirection: 'row', borderLeftWidth: 1, borderRightWidth: 1,
                borderBottomWidth: 1, borderColor: '#e5e7eb' },
  tableRowAlt:{ flexDirection: 'row', backgroundColor: '#f9fafb',
                borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  th:         { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#4b5563',
                paddingVertical: 5, paddingHorizontal: 6 },
  td:         { fontSize: 8, color: '#374151', paddingVertical: 5, paddingHorizontal: 6 },
  right:      { textAlign: 'right' },

  // Columnas tabla
  cNum:       { width: 22 },
  cProd:      { flex: 1 },
  cCant:      { width: 60, textAlign: 'right' },
  cPrecio:    { width: 72, textAlign: 'right' },
  cDesc:      { width: 44, textAlign: 'right' },
  cSub:       { width: 72, textAlign: 'right' },
  prodName:   { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#111827' },
  prodCode:   { fontSize: 7, color: '#9ca3af', marginTop: 1 },

  // Totales
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, marginBottom: 14 },
  totalsBox:  { width: 200 },
  totRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totLabel:   { fontSize: 8, color: '#4b5563' },
  totVal:     { fontSize: 8, fontFamily: 'Helvetica', color: '#374151' },
  totTotal:   { flexDirection: 'row', justifyContent: 'space-between',
                borderTopWidth: 2, borderTopColor: '#111827', paddingTop: 5, marginTop: 3 },
  totTotalLbl:{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  totTotalVal:{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  descVal:    { fontSize: 8, color: '#ef4444' },

  // Obs
  obsBox:     { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4,
                padding: 8, marginBottom: 14 },
  obsText:    { fontSize: 8, color: '#374151', marginTop: 2 },

  // Footer
  footer:     { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, textAlign: 'center' },
  footerText: { fontSize: 7, color: '#9ca3af', textAlign: 'center', marginTop: 1 },
});

/* ─── Documento PDF ───────────────────────────────────── */
function CotizacionDoc({ cotizacion: c, empresa: e, logoUrl }) {
  const clienteNombre = c.cliente_razon || `${c.cliente_nombres ?? ''} ${c.cliente_apellidos ?? ''}`.trim();
  const est = ESTADO_COLOR[c.estado] ?? ESTADO_COLOR.BORRADOR;

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Encabezado */}
        <View style={S.header}>
          <View>
            {logoUrl && logoUrl !== '/logo.png' && (
              <Image src={logoUrl} style={S.logo} />
            )}
            <Text style={S.empresa}>{e.nombre_comercial || e.razon_social}</Text>
            {e.direccion && <Text style={S.meta}>{e.direccion}</Text>}
            {e.telefono  && <Text style={S.meta}>Tel: {e.telefono}</Text>}
            {e.nit       && <Text style={S.meta}>NIT: {e.nit}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.badgeTitle}>COTIZACIÓN</Text>
            <Text style={S.numero}>{c.numero}</Text>
            <Text style={S.meta}>Fecha: {fecha(c.fecha)}</Text>
            {c.fecha_vencimiento && <Text style={S.meta}>Válida hasta: {fecha(c.fecha_vencimiento)}</Text>}
            <Text style={[S.estadoBadge, { backgroundColor: est.bg, color: est.fg }]}>{c.estado}</Text>
          </View>
        </View>

        {/* Cliente / Sucursal */}
        <View style={S.grid2}>
          <View style={S.col}>
            <Text style={S.sectionLbl}>Cliente</Text>
            <Text style={S.fieldBold}>{clienteNombre}</Text>
            {c.cliente_documento && <Text style={S.field}>{c.tipo_documento}: {c.cliente_documento}</Text>}
            {c.cliente_telefono  && <Text style={S.field}>Tel: {c.cliente_telefono}</Text>}
            {c.cliente_email     && <Text style={S.field}>{c.cliente_email}</Text>}
          </View>
          <View style={S.col}>
            <Text style={S.sectionLbl}>Sucursal</Text>
            <Text style={S.fieldBold}>{c.sucursal_nombre}</Text>
            {c.sucursal_direccion && <Text style={S.field}>{c.sucursal_direccion}</Text>}
            <Text style={[S.sectionLbl, { marginTop: 6 }]}>Atendido por</Text>
            <Text style={S.field}>{c.vendedor_nombre}</Text>
            <Text style={S.field}>Pago: {c.tipo_cotizacion === 'CREDITO' ? 'Crédito' : 'Contado'}</Text>
          </View>
        </View>

        {/* Tabla */}
        <View style={S.tableHead}>
          <Text style={[S.th, S.cNum]}>#</Text>
          <Text style={[S.th, S.cProd]}>Producto</Text>
          <Text style={[S.th, S.cCant, S.right]}>Cant.</Text>
          <Text style={[S.th, S.cPrecio, S.right]}>Precio unit.</Text>
          <Text style={[S.th, S.cDesc, S.right]}>Desc %</Text>
          <Text style={[S.th, S.cSub, S.right]}>Subtotal</Text>
        </View>
        {(c.detalle ?? []).map((d, i) => (
          <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
            <Text style={[S.td, S.cNum, { color: '#9ca3af' }]}>{i + 1}</Text>
            <View style={[S.cProd, { paddingVertical: 5, paddingHorizontal: 6 }]}>
              <Text style={S.prodName}>{d.producto}</Text>
              {d.codigo_interno && <Text style={S.prodCode}>{d.codigo_interno}</Text>}
            </View>
            <Text style={[S.td, S.cCant, S.right]}>{fmt(d.cantidad)} {d.unidad_nombre}</Text>
            <Text style={[S.td, S.cPrecio, S.right]}>Bs {fmt(d.precio_unitario)}</Text>
            <Text style={[S.td, S.cDesc, S.right]}>
              {Number(d.descuento_porc) > 0 ? `${d.descuento_porc}%` : '—'}
            </Text>
            <Text style={[S.td, S.cSub, S.right, { fontFamily: 'Helvetica-Bold' }]}>Bs {fmt(d.subtotal)}</Text>
          </View>
        ))}

        {/* Totales */}
        <View style={S.totalsWrap}>
          <View style={S.totalsBox}>
            <View style={S.totRow}>
              <Text style={S.totLabel}>Subtotal:</Text>
              <Text style={S.totVal}>Bs {fmt(c.subtotal)}</Text>
            </View>
            {Number(c.descuento_porc) > 0 && (
              <View style={S.totRow}>
                <Text style={S.totLabel}>Descuento ({c.descuento_porc}%):</Text>
                <Text style={S.descVal}>-Bs {fmt(c.descuento_monto)}</Text>
              </View>
            )}
            {Number(c.impuesto) > 0 && (
              <View style={S.totRow}>
                <Text style={S.totLabel}>Impuesto:</Text>
                <Text style={S.totVal}>Bs {fmt(c.impuesto)}</Text>
              </View>
            )}
            <View style={S.totTotal}>
              <Text style={S.totTotalLbl}>TOTAL:</Text>
              <Text style={S.totTotalVal}>Bs {fmt(c.total)}</Text>
            </View>
          </View>
        </View>

        {/* Observaciones */}
        {c.observaciones && (
          <View style={S.obsBox}>
            <Text style={S.sectionLbl}>Observaciones / Condiciones</Text>
            <Text style={S.obsText}>{c.observaciones}</Text>
          </View>
        )}

        {/* Pie */}
        <View style={S.footer}>
          <Text style={S.footerText}>
            Esta cotización es válida hasta {c.fecha_vencimiento ? fecha(c.fecha_vencimiento) : 'la fecha indicada'}.
            Precios sujetos a disponibilidad de stock.
          </Text>
          <Text style={S.footerText}>{e.razon_social} · {e.telefono}</Text>
        </View>

      </Page>
    </Document>
  );
}

/* ─── Función de descarga (exportada) ────────────────── */
export async function descargarCotizacionPDF(id, logoUrl) {
  const { data } = await cotizacionesService.getPDF(id);
  const { cotizacion: c, empresa: e } = data;
  const blob = await pdf(
    <CotizacionDoc cotizacion={c} empresa={e} logoUrl={logoUrl} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `cotizacion-${c.numero}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Página de ruta (auto-descarga y vuelve) ─────────── */
export default function CotizacionPDFPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Se obtiene logoUrl desde el contexto no disponible aquí,
    // pero la función acepta undefined y simplemente lo omite
    descargarCotizacionPDF(id, undefined)
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
