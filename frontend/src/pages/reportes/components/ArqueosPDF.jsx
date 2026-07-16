import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmt  = n  => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fmtF = s  => s ? s.replace('T', ' ').substring(0, 16) : '—';
const fmtD = s  => s ? new Date(s + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/* ─── Estilos ─────────────────────────────────────────────────────────────── */
/*
 * A4 portrait usable: ~516pt
 * Columnas fijas: Apertura(68)+Cierre(68)+Ap.Bs(56)+Sis.Bs(54)+Real Bs(54)+Dif(54)+Estado(44) = 398pt
 * Caja (flex:1): ~118pt
 */
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', fontSize: 8.5, color: '#111827',
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

  /* ── Sección por usuario ── */
  userSection: { marginBottom: 18 },
  userHeader:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1c1917', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 3,
  },
  userName:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#facc15' },
  userSuc:     { fontSize: 8, color: '#d4d4d4' },

  /* ── Tabla ── */
  tableHead:   {
    flexDirection: 'row', backgroundColor: '#f3f4f6',
    borderWidth: 1, borderColor: '#d1d5db', marginTop: 0,
  },
  tableRow:    {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb',
  },
  tableRowAlt: {
    flexDirection: 'row', backgroundColor: '#f9fafb',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb',
  },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#4b5563', paddingVertical: 4, paddingHorizontal: 5 },
  td: { fontSize: 7.5, color: '#374151', paddingVertical: 4, paddingHorizontal: 5 },
  right: { textAlign: 'right' },

  /* Anchos de columnas */
  cCaja:  { flex: 1 },
  cAp:    { width: 68 },
  cCi:    { width: 68 },
  cMAp:   { width: 56, textAlign: 'right' },
  cSis:   { width: 54, textAlign: 'right' },
  cReal:  { width: 54, textAlign: 'right' },
  cDif:   { width: 54, textAlign: 'right' },
  cEst:   { width: 44, textAlign: 'center' },

  /* Diferencia coloreada */
  difNeg: { color: '#dc2626', fontFamily: 'Helvetica-Bold' },
  difPos: { color: '#16a34a', fontFamily: 'Helvetica-Bold' },

  /* Estado chip */
  chipAb: { backgroundColor: '#fef9c3', color: '#92400e', fontSize: 6.5, fontFamily: 'Helvetica-Bold',
            borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  chipCe: { backgroundColor: '#dcfce7', color: '#166534', fontSize: 6.5, fontFamily: 'Helvetica-Bold',
            borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },

  /* ── Subtotales por usuario ── */
  subBox:  { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  subWrap: { width: 210 },
  subRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2,
             borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  subLbl:  { fontSize: 7.5, color: '#6b7280' },
  subVal:  { fontSize: 7.5, color: '#374151' },
  subDifBg:{
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 3, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#bbf7d0', marginTop: 4,
  },
  subDifLbl: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#15803d' },
  subDifVal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#15803d' },

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

/* ─── Agrupador por usuario ──────────────────────────────────────────────── */
function agruparPorUsuario(filas) {
  const map = new Map();
  for (const r of filas) {
    const key = r.usuario;
    if (!map.has(key)) map.set(key, { usuario: r.usuario, sucursal: r.sucursal, arqueos: [] });
    map.get(key).arqueos.push(r);
  }
  return [...map.values()];
}

/* ─── Cabecera tabla ─────────────────────────────────────────────────────── */
function TablaHead() {
  return (
    <View style={S.tableHead}>
      <Text style={[S.th, S.cCaja]}>Caja</Text>
      <Text style={[S.th, S.cAp]}>Apertura</Text>
      <Text style={[S.th, S.cCi]}>Cierre</Text>
      <Text style={[S.th, S.cMAp]}>Ap. Bs</Text>
      <Text style={[S.th, S.cSis]}>Sistema Bs</Text>
      <Text style={[S.th, S.cReal]}>Real Bs</Text>
      <Text style={[S.th, S.cDif]}>Dif. Bs</Text>
      <Text style={[S.th, S.cEst]}>Estado</Text>
    </View>
  );
}

/* ─── Chip de estado ─────────────────────────────────────────────────────── */
function EstadoChip({ estado }) {
  const style = estado === 'ABIERTA' ? S.chipAb : S.chipCe;
  return <Text style={style}>{estado}</Text>;
}

/* ─── Celda diferencia ───────────────────────────────────────────────────── */
function CeldaDif({ val }) {
  if (val == null) return <Text>—</Text>;
  const n = Number(val);
  const style = n < 0 ? S.difNeg : n > 0 ? S.difPos : {};
  return <Text style={style}>{fmt(val)}</Text>;
}

/* ─── Sección por usuario ────────────────────────────────────────────────── */
function UsuarioSection({ g }) {
  const totalAp   = g.arqueos.reduce((a, r) => a + Number(r.monto_apertura        ?? 0), 0);
  const totalSis  = g.arqueos.reduce((a, r) => a + Number(r.monto_cierre_sistema  ?? 0), 0);
  const totalReal = g.arqueos.reduce((a, r) => a + Number(r.monto_cierre_real     ?? 0), 0);
  const totalDif  = g.arqueos.reduce((a, r) => a + Number(r.diferencia            ?? 0), 0);
  const abiertos  = g.arqueos.filter(r => r.estado === 'ABIERTA').length;

  return (
    <View style={S.userSection}>
      <View style={S.userHeader}>
        <Text style={S.userName}>{g.usuario}</Text>
        <Text style={S.userSuc}>{g.sucursal}</Text>
      </View>

      <TablaHead />

      {g.arqueos.map((r, i) => (
        <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt} wrap={false}>
          <Text style={[S.td, S.cCaja]}>{r.caja}</Text>
          <Text style={[S.td, S.cAp]}>{fmtF(r.fecha_apertura)}</Text>
          <Text style={[S.td, S.cCi]}>{fmtF(r.fecha_cierre)}</Text>
          <Text style={[S.td, S.cMAp]}>{fmt(r.monto_apertura)}</Text>
          <Text style={[S.td, S.cSis]}>{r.monto_cierre_sistema != null ? fmt(r.monto_cierre_sistema) : '—'}</Text>
          <Text style={[S.td, S.cReal]}>{r.monto_cierre_real != null ? fmt(r.monto_cierre_real) : '—'}</Text>
          <View style={[S.td, S.cDif]}>
            <CeldaDif val={r.diferencia} />
          </View>
          <View style={[S.td, S.cEst]}>
            <EstadoChip estado={r.estado} />
          </View>
        </View>
      ))}

      <View style={S.subBox}>
        <View style={S.subWrap}>
          <View style={S.subRow}>
            <Text style={S.subLbl}>Arqueos</Text>
            <Text style={S.subVal}>{g.arqueos.length}</Text>
          </View>
          {abiertos > 0 && (
            <View style={S.subRow}>
              <Text style={S.subLbl}>Abiertos</Text>
              <Text style={[S.subVal, { color: '#b45309' }]}>{abiertos}</Text>
            </View>
          )}
          <View style={S.subRow}>
            <Text style={S.subLbl}>Total apertura</Text>
            <Text style={S.subVal}>Bs {fmt(totalAp)}</Text>
          </View>
          <View style={S.subRow}>
            <Text style={S.subLbl}>Total sistema</Text>
            <Text style={S.subVal}>Bs {fmt(totalSis)}</Text>
          </View>
          <View style={S.subRow}>
            <Text style={S.subLbl}>Total real</Text>
            <Text style={S.subVal}>Bs {fmt(totalReal)}</Text>
          </View>
          <View style={[S.subDifBg, totalDif < 0 ? { backgroundColor: '#fef2f2', borderColor: '#fecaca' } : {}]}>
            <Text style={[S.subDifLbl, totalDif < 0 ? { color: '#dc2626' } : {}]}>Diferencia acumulada</Text>
            <Text style={[S.subDifVal, totalDif < 0 ? { color: '#dc2626' } : {}]}>Bs {fmt(totalDif)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ─── Documento principal ────────────────────────────────────────────────── */
function ArqueosDoc({ filas, empresa, logoUrl, desde, hasta }) {
  const grupos      = agruparPorUsuario(filas);
  const grandAp     = filas.reduce((a, r) => a + Number(r.monto_apertura        ?? 0), 0);
  const grandSis    = filas.reduce((a, r) => a + Number(r.monto_cierre_sistema  ?? 0), 0);
  const grandReal   = filas.reduce((a, r) => a + Number(r.monto_cierre_real     ?? 0), 0);
  const grandDif    = filas.reduce((a, r) => a + Number(r.diferencia            ?? 0), 0);
  const abiertos    = filas.filter(r => r.estado === 'ABIERTA').length;
  const now         = new Date().toLocaleString('es-BO');

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Encabezado */}
        <View style={S.header} fixed>
          <View>
            {logoUrl && logoUrl !== '/logo.png' && <Image src={logoUrl} style={S.logo} />}
            <Text style={S.empresa}>{empresa?.nombre_comercial || empresa?.razon_social || ''}</Text>
            {empresa?.direccion && <Text style={S.meta}>{empresa.direccion}</Text>}
            {empresa?.telefono  && <Text style={S.meta}>Tel: {empresa.telefono}</Text>}
            {empresa?.nit       && <Text style={S.meta}>NIT: {empresa.nit}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.badge}>REPORTE</Text>
            <Text style={S.reportTitle}>Arqueos de Caja</Text>
            <Text style={S.periodo}>Período: {fmtD(desde)} — {fmtD(hasta)}</Text>
          </View>
        </View>

        {/* Secciones por usuario */}
        {grupos.map((g, i) => (
          <UsuarioSection key={i} g={g} />
        ))}

        {/* Gran total */}
        <View style={S.grandBox}>
          <Text style={S.grandTitle}>Resumen General</Text>
          <View style={S.grandRow}>
            <Text style={S.grandLbl}>Usuarios</Text>
            <Text style={S.grandVal}>{grupos.length}</Text>
          </View>
          <View style={S.grandRow}>
            <Text style={S.grandLbl}>Total arqueos</Text>
            <Text style={S.grandVal}>{filas.length}</Text>
          </View>
          {abiertos > 0 && (
            <View style={S.grandRow}>
              <Text style={S.grandLbl}>Arqueos abiertos</Text>
              <Text style={[S.grandVal, { color: '#b45309' }]}>{abiertos}</Text>
            </View>
          )}
          <View style={S.grandRow}>
            <Text style={S.grandLbl}>Total apertura</Text>
            <Text style={S.grandVal}>Bs {fmt(grandAp)}</Text>
          </View>
          <View style={S.grandRow}>
            <Text style={S.grandLbl}>Total sistema</Text>
            <Text style={S.grandVal}>Bs {fmt(grandSis)}</Text>
          </View>
          <View style={S.grandRow}>
            <Text style={S.grandLbl}>Total real</Text>
            <Text style={S.grandVal}>Bs {fmt(grandReal)}</Text>
          </View>
          <View style={[S.grandBono, grandDif < 0 ? { backgroundColor: '#fef2f2', borderColor: '#fecaca' } : {}]}>
            <Text style={[S.grandBonoLbl, grandDif < 0 ? { color: '#991b1b' } : {}]}>DIFERENCIA TOTAL</Text>
            <Text style={[S.grandBonoVal, grandDif < 0 ? { color: '#dc2626' } : {}]}>Bs {fmt(grandDif)}</Text>
          </View>
        </View>

        {/* Footer */}
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

/* ─── Exportador ─────────────────────────────────────────────────────────── */
export async function exportarArqueosPDF({ filas, filtros, empresa, logoUrl }) {
  if (!filas || filas.length === 0) {
    throw new Error('No hay datos en el período seleccionado para exportar.');
  }
  const blob = await pdf(
    <ArqueosDoc
      filas={filas}
      empresa={empresa}
      logoUrl={logoUrl}
      desde={filtros.fecha_desde}
      hasta={filtros.fecha_hasta}
    />
  ).toBlob();

  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `arqueos-caja_${filtros.fecha_desde}_${filtros.fecha_hasta}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
