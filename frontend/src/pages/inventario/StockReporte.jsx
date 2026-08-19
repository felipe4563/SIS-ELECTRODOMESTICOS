import {
  Document, Page, Text, View, StyleSheet, pdf, Image,
} from '@react-pdf/renderer';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
const toNum  = n => { const v = Number(n ?? 0); return isNaN(v) ? 0 : v; };
const fmtNum = n => toNum(n).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fechaHora = () => new Date().toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });

function estadoStock(totalDisp, stockMin) {
  if (totalDisp === 0)                       return { label: 'Sin stock',   color: '#b91c1c' };
  if (totalDisp <= Number(stockMin))         return { label: 'Bajo mínimo', color: '#c2410c' };
  return                                        { label: 'OK',              color: '#15803d' };
}

function totalDe(p, depositos) {
  return depositos.reduce((s, d) => s + toNum(p.stock[d.id_deposito]?.cantidad_disponible), 0);
}

function resumenFiltros(filtros) {
  const partes = [];
  if (filtros.busqueda) partes.push(`Búsqueda: "${filtros.busqueda}"`);
  if (filtros.marca)    partes.push(`Marca: ${filtros.marca}`);
  if (filtros.categoria) partes.push(`Categoría: ${filtros.categoria}`);
  if (filtros.estado)   partes.push(`Estado: ${{ ok: 'Stock OK', bajo: 'Bajo mínimo', sin: 'Sin stock' }[filtros.estado]}`);
  return partes.length ? partes.join('  ·  ') : 'Sin filtros aplicados';
}

/* ════════════════════════════════════════════════════════════════════════════
   VERSIÓN HTML (impresión directa — window.print)
   ════════════════════════════════════════════════════════════════════════════ */
export function StockReporteHTML({ productos, depositos, empresa: e, logoUrl, filtros }) {
  return (
    <div id="documento-stock" style={{ width: '297mm', minHeight: '210mm', background: '#fff', color: '#111827', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '9px', padding: '12mm 14mm', boxSizing: 'border-box' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #facc15', paddingBottom: '10px', marginBottom: '12px' }}>
        <div>
          {logoUrl && logoUrl !== '/logo.png' && (
            <img src={logoUrl} alt="Logo" style={{ width: '56px', height: '38px', objectFit: 'contain', marginBottom: '4px' }} />
          )}
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', marginBottom: '2px' }}>{e?.nombre_comercial || e?.razon_social || ''}</div>
          {e?.nit && <div style={{ fontSize: '7px', color: '#6b7280' }}>NIT: {e.nit}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ backgroundColor: '#facc15', color: '#1c1917', fontSize: '8px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px' }}>REPORTE DE STOCK</span>
          <div style={{ fontSize: '7px', color: '#6b7280', marginTop: '4px' }}>Generado: {fechaHora()}</div>
          <div style={{ fontSize: '7px', color: '#6b7280', marginTop: '1px' }}>{productos.length} producto{productos.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Filtros aplicados */}
      <div style={{ fontSize: '7px', color: '#6b7280', marginBottom: '10px' }}>{resumenFiltros(filtros)}</div>

      {/* Tabla */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Producto</th>
            <th style={{ width: '80px', textAlign: 'left', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Marca</th>
            <th style={{ width: '50px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Mín.</th>
            {depositos.map(d => (
              <th key={d.id_deposito} style={{ width: '55px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px', borderLeft: '1px solid #e5e7eb' }}>
                {d.codigo}
              </th>
            ))}
            <th style={{ width: '55px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px', borderLeft: '1px solid #e5e7eb' }}>Total</th>
            <th style={{ width: '70px', textAlign: 'center', fontSize: '7px', fontWeight: 'bold', color: '#4b5563', padding: '5px' }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p, i) => {
            const total = totalDe(p, depositos);
            const est   = estadoStock(total, p.stock_minimo);
            return (
              <tr key={p.id_producto} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '4px 5px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '8px', color: '#111827' }}>{p.producto}</div>
                  <div style={{ fontSize: '7px', color: '#9ca3af' }}>{p.codigo_interno}</div>
                </td>
                <td style={{ fontSize: '8px', color: '#374151', padding: '4px 5px' }}>{p.marca_nombre}</td>
                <td style={{ textAlign: 'right', fontSize: '8px', color: '#374151', fontFamily: 'Courier, monospace', padding: '4px 5px' }}>{fmtNum(p.stock_minimo)}</td>
                {depositos.map(d => {
                  const disp = toNum(p.stock[d.id_deposito]?.cantidad_disponible);
                  return (
                    <td key={d.id_deposito} style={{ textAlign: 'right', fontSize: '8px', fontFamily: 'Courier, monospace', padding: '4px 5px', borderLeft: '1px solid #f3f4f6', color: disp === 0 ? '#d1d5db' : '#111827', fontWeight: disp === 0 ? 'normal' : 'bold' }}>
                      {fmtNum(disp)}
                    </td>
                  );
                })}
                <td style={{ textAlign: 'right', fontSize: '8px', fontFamily: 'Courier, monospace', fontWeight: 'bold', padding: '4px 5px', borderLeft: '1px solid #f3f4f6' }}>{fmtNum(total)}</td>
                <td style={{ textAlign: 'center', padding: '4px 5px' }}>
                  <span style={{ fontSize: '7px', fontWeight: 'bold', color: est.color }}>{est.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '6px', marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '7px', color: '#9ca3af' }}>Generado el {fechaHora()}</span>
        <span style={{ fontSize: '7px', color: '#9ca3af' }}>{e?.razon_social ?? ''}</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   VERSIÓN PDF (descarga — react-pdf)
   ════════════════════════════════════════════════════════════════════════════ */
const S = StyleSheet.create({
  page:     { fontFamily: 'Helvetica', fontSize: 8, color: '#111827', padding: '10mm 12mm' },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
              borderBottomWidth: 3, borderBottomColor: '#facc15', paddingBottom: 10, marginBottom: 10 },
  logo:     { width: 56, height: 38, objectFit: 'contain', marginBottom: 4 },
  empNom:   { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  empMeta:  { fontSize: 7, color: '#6b7280' },
  docRight: { alignItems: 'flex-end' },
  docBadge: { backgroundColor: '#facc15', color: '#1c1917', fontSize: 8,
              fontFamily: 'Helvetica-Bold', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 3 },
  docMeta:  { fontSize: 7, color: '#6b7280', marginTop: 4 },
  filtros:  { fontSize: 7, color: '#6b7280', marginBottom: 10 },

  tHead:    { flexDirection: 'row', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  tRow:     { flexDirection: 'row', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  tRowAlt:  { flexDirection: 'row', backgroundColor: '#f9fafb', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  th:       { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#4b5563', paddingVertical: 4, paddingHorizontal: 4 },
  td:       { fontSize: 7.5, color: '#374151', paddingVertical: 4, paddingHorizontal: 4 },
  right:    { textAlign: 'right' },
  center:   { textAlign: 'center' },
  mono:     { fontFamily: 'Courier' },

  cProd:  { flex: 1 },
  cMarca: { width: 70 },
  cMin:   { width: 40, textAlign: 'right' },
  cDep:   { width: 45, textAlign: 'right', borderLeftWidth: 1, borderLeftColor: '#e5e7eb' },
  cTotal: { width: 45, textAlign: 'right', borderLeftWidth: 1, borderLeftColor: '#e5e7eb' },
  cEst:   { width: 55, textAlign: 'center' },
  pNom:   { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: '#111827' },
  pCod:   { fontSize: 6.5, color: '#9ca3af', marginTop: 1 },

  footer:   { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 6, marginTop: 10,
              flexDirection: 'row', justifyContent: 'space-between' },
  footTxt:  { fontSize: 6.5, color: '#9ca3af' },
});

function StockReportePDFDoc({ productos, depositos, empresa: e, logoUrl }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>

        <View style={S.header}>
          <View>
            {logoUrl && logoUrl !== '/logo.png' && <Image src={logoUrl} style={S.logo} />}
            <Text style={S.empNom}>{e?.nombre_comercial || e?.razon_social || ''}</Text>
            {e?.nit && <Text style={S.empMeta}>NIT: {e.nit}</Text>}
          </View>
          <View style={S.docRight}>
            <Text style={S.docBadge}>REPORTE DE STOCK</Text>
            <Text style={S.docMeta}>Generado: {fechaHora()}</Text>
            <Text style={S.docMeta}>{productos.length} producto{productos.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        <View style={S.tHead}>
          <Text style={[S.th, S.cProd]}>Producto</Text>
          <Text style={[S.th, S.cMarca]}>Marca</Text>
          <Text style={[S.th, S.cMin]}>Mín.</Text>
          {depositos.map(d => (
            <Text key={d.id_deposito} style={[S.th, S.cDep]}>{d.codigo}</Text>
          ))}
          <Text style={[S.th, S.cTotal]}>Total</Text>
          <Text style={[S.th, S.cEst]}>Estado</Text>
        </View>
        {productos.map((p, i) => {
          const total = totalDe(p, depositos);
          const est   = estadoStock(total, p.stock_minimo);
          return (
            <View key={p.id_producto} style={i % 2 === 0 ? S.tRow : S.tRowAlt}>
              <View style={[S.cProd, { paddingVertical: 4, paddingHorizontal: 4 }]}>
                <Text style={S.pNom}>{p.producto}</Text>
                <Text style={S.pCod}>{p.codigo_interno}</Text>
              </View>
              <Text style={[S.td, S.cMarca]}>{p.marca_nombre}</Text>
              <Text style={[S.td, S.cMin, S.mono]}>{fmtNum(p.stock_minimo)}</Text>
              {depositos.map(d => {
                const disp = toNum(p.stock[d.id_deposito]?.cantidad_disponible);
                return (
                  <Text key={d.id_deposito} style={[S.td, S.cDep, S.mono, disp === 0 ? { color: '#d1d5db' } : { fontFamily: 'Helvetica-Bold' }]}>
                    {fmtNum(disp)}
                  </Text>
                );
              })}
              <Text style={[S.td, S.cTotal, S.mono, { fontFamily: 'Helvetica-Bold' }]}>{fmtNum(total)}</Text>
              <Text style={[S.td, S.cEst, { color: est.color, fontFamily: 'Helvetica-Bold', fontSize: 6.5 }]}>{est.label}</Text>
            </View>
          );
        })}

        <View style={S.footer} fixed>
          <Text style={S.footTxt}>Generado el {fechaHora()}</Text>
          <Text style={S.footTxt}>{e?.razon_social ?? ''}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function descargarStockReportePDF(productos, depositos, empresa, logoUrl) {
  const blob = await pdf(
    <StockReportePDFDoc productos={productos} depositos={depositos} empresa={empresa} logoUrl={logoUrl} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `reporte-stock-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
