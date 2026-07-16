import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { reportesService } from '../../../services/reportes.service';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmt  = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fmtN = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 0 });
const fmtF = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/* ─── Estilos ─────────────────────────────────────────────────────────────── */
/*
 * A4 usable: 210mm - 2×14mm padding = 182mm ≈ 516pt
 * Columnas fijas: Cant(28) + P.Unit(62) + Subtotal(64) + Bono(58) = 212pt
 * Producto (flex): 516 - 212 = ~304pt — amplio para nombre + metadatos en 2 líneas
 */
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', fontSize: 9, color: '#111827',
    paddingHorizontal: '14mm', paddingVertical: '12mm',
  },

  /* ── Cabecera ── */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 3, borderBottomColor: '#facc15', paddingBottom: 10, marginBottom: 14,
  },
  logo:        { width: 56, height: 36, objectFit: 'contain', marginBottom: 3 },
  empresa:     { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  meta:        { fontSize: 7.5, color: '#6b7280', marginTop: 1 },
  badge:       { backgroundColor: '#facc15', color: '#1c1917', fontSize: 7.5,
                 fontFamily: 'Helvetica-Bold', paddingVertical: 2, paddingHorizontal: 8,
                 borderRadius: 3, marginBottom: 4, alignSelf: 'flex-end' },
  reportTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'right' },
  periodo:     { fontSize: 8, color: '#4b5563', textAlign: 'right', marginTop: 2 },

  /* ── Sección vendedor ── */
  vendSection: { marginBottom: 18 },
  vendHeader:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1c1917', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 3,
  },
  vendName:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#facc15' },
  vendSuc:     { fontSize: 8, color: '#d4d4d4' },

  /* ── Tabla ── */
  tableHead:   {
    flexDirection: 'row', backgroundColor: '#f3f4f6',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderTopWidth: 1, borderColor: '#d1d5db', marginTop: 0,
  },
  tableRow:    {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb',
  },
  tableRowAlt: {
    flexDirection: 'row', backgroundColor: '#f9fafb',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb',
  },
  th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#4b5563', paddingVertical: 5, paddingHorizontal: 6 },
  td: { fontSize: 8,   color: '#374151',              paddingVertical: 5, paddingHorizontal: 6 },
  right:  { textAlign: 'right' },
  center: { textAlign: 'center' },

  /* Anchos — producto es flex:1, el resto fijo */
  cProd: { flex: 1 },
  cCant: { width: 28, textAlign: 'right' },
  cPU:   { width: 62, textAlign: 'right' },
  cSub:  { width: 64, textAlign: 'right' },
  cBono: { width: 58, textAlign: 'right' },

  /* Contenido celda producto */
  prodName:  { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#111827' },
  prodMeta:  { fontSize: 6.5, color: '#9ca3af', marginTop: 1.5 },
  prodSerie: { fontSize: 7, color: '#1d4ed8', fontFamily: 'Helvetica-Bold', marginTop: 2 },
  prodVenta: { fontSize: 6.5, color: '#6b7280', marginTop: 1.5 },

  /* ── Subtotales por vendedor ── */
  subTotBox:  { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  subTotWrap: { width: 190 },
  subTotRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2,
                borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  subLabel:   { fontSize: 7.5, color: '#6b7280' },
  subVal:     { fontSize: 7.5, color: '#374151' },
  subBonoBg:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 3, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#bbf7d0', marginTop: 4,
  },
  subBonoLbl: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#15803d' },
  subBonoVal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#15803d' },

  /* ── Gran total ── */
  grandBox:    { borderTopWidth: 2, borderTopColor: '#111827', marginTop: 14, paddingTop: 10 },
  grandTitle:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8 },
  grandRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  grandLbl:    { fontSize: 8, color: '#4b5563' },
  grandVal:    { fontSize: 8, color: '#111827' },
  grandBono:   {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fef9c3', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 7,
    marginTop: 8, borderWidth: 1, borderColor: '#fde047',
  },
  grandBonoLbl:{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#713f12' },
  grandBonoVal:{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#15803d' },

  /* ── Footer ── */
  footer:     { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 6, marginTop: 16 },
  footerText: { fontSize: 7, color: '#9ca3af', textAlign: 'center', marginTop: 1 },
});

/* ─── Agrupador ───────────────────────────────────────────────────────────── */
function agruparPorVendedor(filas) {
  const map = new Map();
  for (const r of filas) {
    if (!map.has(r.id_usuario)) {
      map.set(r.id_usuario, {
        id_usuario: r.id_usuario,
        vendedor:   r.vendedor,
        sucursal:   r.sucursal,
        productos:  [],
      });
    }
    map.get(r.id_usuario).productos.push(r);
  }
  return [...map.values()];
}

/* ─── Encabezado tabla (fijo por sección) ─────────────────────────────────── */
function TablaHead() {
  return (
    <View style={S.tableHead}>
      <Text style={[S.th, S.cProd]}>Producto / Serie / Venta</Text>
      <Text style={[S.th, S.cCant, S.right]}>Cant.</Text>
      <Text style={[S.th, S.cPU,   S.right]}>P. Unit. Bs</Text>
      <Text style={[S.th, S.cSub,  S.right]}>Subtotal Bs</Text>
      <Text style={[S.th, S.cBono, S.right]}>Bono Bs</Text>
    </View>
  );
}

/* ─── Sección por vendedor ─────────────────────────────────────────────────── */
function VendedorSection({ v }) {
  const totalVentas = v.productos.reduce((a, r) => a + Number(r.subtotal),      0);
  const totalBonos  = v.productos.reduce((a, r) => a + Number(r.bono_vendedor), 0);
  const totalUnids  = v.productos.reduce((a, r) => a + Number(r.cantidad),      0);
  const numVentas   = new Set(v.productos.map(r => r.id_venta)).size;

  return (
    <View style={S.vendSection}>

      {/* Cabecera vendedor */}
      <View style={S.vendHeader}>
        <Text style={S.vendName}>{v.vendedor}</Text>
        <Text style={S.vendSuc}>{v.sucursal}</Text>
      </View>

      <TablaHead />

      {/* Filas de productos */}
      {v.productos.map((r, i) => {
        const metaLine = [r.codigo_interno, r.marca].filter(Boolean).join(' · ');
        return (
          <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt} wrap={false}>

            {/* Columna producto: nombre + metadatos + serie + venta/fecha */}
            <View style={[S.cProd, { paddingVertical: 5, paddingHorizontal: 6 }]}>
              <Text style={S.prodName}>{r.producto}</Text>
              {metaLine ? <Text style={S.prodMeta}>{metaLine}</Text> : null}
              {r.numero_serie
                ? <Text style={S.prodSerie}>S/N: {r.numero_serie}</Text>
                : null
              }
              <Text style={S.prodVenta}>Venta N° {r.numero_venta}  ·  {fmtF(r.fecha_venta)}</Text>
            </View>

            <Text style={[S.td, S.cCant]}>{fmtN(r.cantidad)}</Text>
            <Text style={[S.td, S.cPU  ]}>{fmt(r.precio_unitario)}</Text>
            <Text style={[S.td, S.cSub ]}>{fmt(r.subtotal)}</Text>
            <Text style={[S.td, S.cBono]}>{fmt(r.bono_vendedor)}</Text>
          </View>
        );
      })}

      {/* Subtotales vendedor */}
      <View style={S.subTotBox}>
        <View style={S.subTotWrap}>
          <View style={S.subTotRow}>
            <Text style={S.subLabel}>Ventas realizadas</Text>
            <Text style={S.subVal}>{fmtN(numVentas)}</Text>
          </View>
          <View style={S.subTotRow}>
            <Text style={S.subLabel}>Unidades vendidas</Text>
            <Text style={S.subVal}>{fmtN(totalUnids)}</Text>
          </View>
          <View style={S.subTotRow}>
            <Text style={S.subLabel}>Total ventas</Text>
            <Text style={S.subVal}>Bs {fmt(totalVentas)}</Text>
          </View>
          <View style={S.subBonoBg}>
            <Text style={S.subBonoLbl}>Bono acumulado</Text>
            <Text style={S.subBonoVal}>Bs {fmt(totalBonos)}</Text>
          </View>
        </View>
      </View>

    </View>
  );
}

/* ─── Documento principal ─────────────────────────────────────────────────── */
function BonosDoc({ filas, empresa, logoUrl, desde, hasta }) {
  const vendedores  = agruparPorVendedor(filas);
  const grandBonos  = filas.reduce((a, r) => a + Number(r.bono_vendedor), 0);
  const grandVentas = filas.reduce((a, r) => a + Number(r.subtotal),      0);
  const grandUnids  = filas.reduce((a, r) => a + Number(r.cantidad),      0);
  const now         = new Date().toLocaleString('es-BO');

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Encabezado — se repite en cada página */}
        <View style={S.header} fixed>
          <View>
            {logoUrl && logoUrl !== '/logo.png' && <Image src={logoUrl} style={S.logo} />}
            <Text style={S.empresa}>{empresa?.nombre_comercial || empresa?.razon_social || 'MEGAELECTRA'}</Text>
            {empresa?.direccion && <Text style={S.meta}>{empresa.direccion}</Text>}
            {empresa?.telefono  && <Text style={S.meta}>Tel: {empresa.telefono}</Text>}
            {empresa?.nit       && <Text style={S.meta}>NIT: {empresa.nit}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.badge}>REPORTE</Text>
            <Text style={S.reportTitle}>Bonos por Vendedor</Text>
            <Text style={S.periodo}>Período: {fmtF(desde)} — {fmtF(hasta)}</Text>
          </View>
        </View>

        {/* Secciones por vendedor */}
        {vendedores.map(v => (
          <VendedorSection key={v.id_usuario} v={v} />
        ))}

        {/* Gran total */}
        <View style={S.grandBox}>
          <Text style={S.grandTitle}>Resumen General</Text>
          <View style={S.grandRow}>
            <Text style={S.grandLbl}>Vendedores</Text>
            <Text style={S.grandVal}>{fmtN(vendedores.length)}</Text>
          </View>
          <View style={S.grandRow}>
            <Text style={S.grandLbl}>Unidades totales</Text>
            <Text style={S.grandVal}>{fmtN(grandUnids)}</Text>
          </View>
          <View style={S.grandRow}>
            <Text style={S.grandLbl}>Total ventas</Text>
            <Text style={S.grandVal}>Bs {fmt(grandVentas)}</Text>
          </View>
          <View style={S.grandBono}>
            <Text style={S.grandBonoLbl}>TOTAL BONOS</Text>
            <Text style={S.grandBonoVal}>Bs {fmt(grandBonos)}</Text>
          </View>
        </View>

        {/* Footer — se repite en cada página */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>
            {empresa?.nombre_comercial || empresa?.razon_social} · Generado el {now}
          </Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}

/* ─── Exportador ──────────────────────────────────────────────────────────── */
export async function exportarBonosPDF({ filtros, empresa, logoUrl }) {
  const { data } = await reportesService.getBonosVendedoresDetalle(filtros);

  if (!data || data.length === 0) {
    throw new Error('No hay datos en el período seleccionado para exportar.');
  }

  const blob = await pdf(
    <BonosDoc
      filas={data}
      empresa={empresa}
      logoUrl={logoUrl}
      desde={filtros.fecha_desde}
      hasta={filtros.fecha_hasta}
    />
  ).toBlob();

  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = `bonos-vendedores_${filtros.fecha_desde}_${filtros.fecha_hasta}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
