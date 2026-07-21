import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { buildLogoUrl } from '../../../contexts/EmpresaContext';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmtF  = s => s ? new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtDt = s => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return s; }
};
const fmtN = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const fmtM = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─── Estilos ─────────────────────────────────────────────────────────────
 * Orientación landscape A4: 297mm × 210mm
 * Márgenes: 12mm h / 10mm v → usable ≈ 273mm ≈ 773pt
 *
 * Columnas (pt):
 *   Fecha(88) + Tipo(72) + Efecto(44) + Depósito(70) +
 *   Cant(44) + CostoU(54) + SaldoCant(54) + SaldoCosto(60) +
 *   DocTipo(52) + DocN°(60) + Usuario(64) + Obs(flex)
 * ────────────────────────────────────────────────────────────────────────── */
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', fontSize: 7.5, color: '#111827',
    paddingHorizontal: '12mm', paddingVertical: '10mm',
  },

  /* ── Cabecera ── */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 3, borderBottomColor: '#facc15',
    paddingBottom: 8, marginBottom: 10,
  },
  logo:      { width: 56, height: 32, objectFit: 'contain', marginBottom: 3 },
  empNombre: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  empMeta:   { fontSize: 7, color: '#6b7280', marginTop: 1 },
  badge:     {
    backgroundColor: '#facc15', color: '#1c1917', fontSize: 7,
    fontFamily: 'Helvetica-Bold', paddingVertical: 2, paddingHorizontal: 7,
    borderRadius: 3, marginBottom: 4, alignSelf: 'flex-end',
  },
  rptTitle:  { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'right' },
  rptSub:    { fontSize: 7.5, color: '#4b5563', textAlign: 'right', marginTop: 2 },

  /* ── Info producto ── */
  prodBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f9fafb', borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb',
  },
  prodNom: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827', flex: 1 },
  prodCod: { fontSize: 7.5, color: '#6b7280', fontFamily: 'Courier', marginTop: 1 },
  kpiBox:  { flexDirection: 'row', gap: 20 },
  kpiWrap: { alignItems: 'flex-end' },
  kpiLbl:  { fontSize: 6.5, color: '#9ca3af', textTransform: 'uppercase' },
  kpiVal:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginTop: 1 },
  kpiGrn:  { color: '#15803d' },
  kpiRed:  { color: '#dc2626' },

  /* ── Tabla ── */
  tableHead: {
    flexDirection: 'row', backgroundColor: '#1c1917',
    borderRadius: 2, marginBottom: 0,
  },
  tableRow:    { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  tableRowAlt: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#facc15', paddingVertical: 4, paddingHorizontal: 4 },
  td: { fontSize: 7.5, color: '#374151', paddingVertical: 3.5, paddingHorizontal: 4 },
  right:  { textAlign: 'right' },
  center: { textAlign: 'center' },

  /* anchos de columna */
  cFecha:   { width: 88 },
  cTipo:    { width: 72 },
  cEfecto:  { width: 44, textAlign: 'center' },
  cDep:     { width: 70 },
  cCant:    { width: 48, textAlign: 'right' },
  cCostoU:  { width: 56, textAlign: 'right' },
  cSaldoC:  { width: 54, textAlign: 'right' },
  cSaldoCs: { width: 62, textAlign: 'right' },
  cDocTipo: { width: 54 },
  cDocNum:  { width: 62 },
  cUser:    { width: 64 },
  cObs:     { flex: 1 },

  /* mini badge efecto */
  efEntrada: {
    backgroundColor: '#dcfce7', color: '#15803d', fontFamily: 'Helvetica-Bold',
    fontSize: 6.5, paddingVertical: 1.5, paddingHorizontal: 4, borderRadius: 2, alignSelf: 'flex-start',
  },
  efSalida: {
    backgroundColor: '#fee2e2', color: '#dc2626', fontFamily: 'Helvetica-Bold',
    fontSize: 6.5, paddingVertical: 1.5, paddingHorizontal: 4, borderRadius: 2, alignSelf: 'flex-start',
  },
  efOtro: {
    backgroundColor: '#f3f4f6', color: '#374151', fontFamily: 'Helvetica-Bold',
    fontSize: 6.5, paddingVertical: 1.5, paddingHorizontal: 4, borderRadius: 2, alignSelf: 'flex-start',
  },

  /* ── Resumen ── */
  resBox:   { flexDirection: 'row', gap: 10, marginTop: 10 },
  resCard:  {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 4, paddingHorizontal: 10, paddingVertical: 7,
    alignItems: 'center',
  },
  resLbl:   { fontSize: 7, color: '#6b7280', marginBottom: 3 },
  resVal:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827' },
  resGrn:   { color: '#15803d' },
  resRed:   { color: '#dc2626' },
  resBal:   { color: '#1d4ed8' },

  /* ── Footer ── */
  footer:    { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 5, marginTop: 10 },
  footerTxt: { fontSize: 6.5, color: '#9ca3af', textAlign: 'center', marginTop: 1 },
});

/* ─── Cabecera tabla ─────────────────────────────────────────────────────── */
function TablaHead() {
  return (
    <View style={S.tableHead}>
      <Text style={[S.th, S.cFecha]}>Fecha / Hora</Text>
      <Text style={[S.th, S.cTipo]}>Tipo de Movimiento</Text>
      <Text style={[S.th, S.cEfecto, S.center]}>Efecto</Text>
      <Text style={[S.th, S.cDep]}>Depósito</Text>
      <Text style={[S.th, S.cCant, S.right]}>Cantidad</Text>
      <Text style={[S.th, S.cCostoU, S.right]}>Costo Unit.</Text>
      <Text style={[S.th, S.cSaldoC, S.right]}>Saldo Cant.</Text>
      <Text style={[S.th, S.cSaldoCs, S.right]}>Saldo Costo</Text>
      <Text style={[S.th, S.cDocTipo]}>Doc. Tipo</Text>
      <Text style={[S.th, S.cDocNum]}>Doc. N°</Text>
      <Text style={[S.th, S.cUser]}>Usuario</Text>
      <Text style={[S.th, S.cObs]}>Observaciones</Text>
    </View>
  );
}

/* ─── Fila ────────────────────────────────────────────────────────────────── */
function FilaKardex({ f, i }) {
  const esEntrada = f.efecto === 'ENTRADA';
  const esSalida  = f.efecto === 'SALIDA';
  const efStyle   = esEntrada ? S.efEntrada : esSalida ? S.efSalida : S.efOtro;
  const efLabel   = esEntrada ? 'ENTRADA' : esSalida ? 'SALIDA' : (f.efecto ?? '—');
  const cantColor = esEntrada ? '#15803d' : esSalida ? '#dc2626' : '#374151';

  return (
    <View style={i % 2 === 0 ? S.tableRow : S.tableRowAlt} wrap={false}>
      <Text style={[S.td, S.cFecha]}>{fmtDt(f.fecha)}</Text>
      <Text style={[S.td, S.cTipo, { fontFamily: 'Helvetica-Bold', color: '#111827' }]}>{f.tipo_movimiento ?? '—'}</Text>
      <View style={[S.cEfecto, { paddingVertical: 3.5, paddingHorizontal: 4, alignItems: 'center' }]}>
        <Text style={efStyle}>{efLabel}</Text>
      </View>
      <Text style={[S.td, S.cDep]}>{f.deposito ?? '—'}</Text>
      <Text style={[S.td, S.cCant, S.right, { color: cantColor, fontFamily: 'Helvetica-Bold' }]}>
        {esEntrada ? '+' : esSalida ? '−' : ''}{fmtN(Math.abs(Number(f.cantidad ?? 0)))}
      </Text>
      <Text style={[S.td, S.cCostoU, S.right]}>{fmtM(f.costo_unitario)}</Text>
      <Text style={[S.td, S.cSaldoC, S.right, { fontFamily: 'Helvetica-Bold' }]}>{fmtN(f.saldo_cantidad)}</Text>
      <Text style={[S.td, S.cSaldoCs, S.right]}>{fmtM(f.saldo_costo)}</Text>
      <Text style={[S.td, S.cDocTipo]}>{f.documento_tipo ?? '—'}</Text>
      <Text style={[S.td, S.cDocNum, { fontFamily: 'Courier', fontSize: 7 }]}>{f.documento_numero ?? '—'}</Text>
      <Text style={[S.td, S.cUser]}>{f.usuario ?? '—'}</Text>
      <Text style={[S.td, S.cObs, { color: '#6b7280', fontStyle: 'italic' }]} numberOfLines={2}>
        {f.observaciones ?? ''}
      </Text>
    </View>
  );
}

/* ─── Documento principal ────────────────────────────────────────────────── */
function KardexDoc({ movimientos, producto, empresa, filtros }) {
  const logoSrc = buildLogoUrl(empresa?.logo_url);
  const hayLogo = logoSrc && logoSrc !== '/logo.png';
  const now     = new Date().toLocaleString('es-BO');

  const totalEntradas = movimientos
    .filter(m => m.efecto === 'ENTRADA')
    .reduce((a, m) => a + Number(m.cantidad ?? 0), 0);
  const totalSalidas = movimientos
    .filter(m => m.efecto === 'SALIDA')
    .reduce((a, m) => a + Number(m.cantidad ?? 0), 0);

  const ultimo = movimientos[0]; // orden DESC → el más reciente primero
  const saldoFinal = Number(ultimo?.saldo_cantidad ?? 0);

  const periodoStr = (() => {
    if (filtros?.fecha_desde && filtros?.fecha_hasta)
      return `${fmtF(filtros.fecha_desde)} — ${fmtF(filtros.fecha_hasta)}`;
    if (filtros?.fecha_desde) return `Desde ${fmtF(filtros.fecha_desde)}`;
    if (filtros?.fecha_hasta) return `Hasta ${fmtF(filtros.fecha_hasta)}`;
    return 'Todos los registros';
  })();

  return (
    <Document title={`Kardex — ${producto?.producto ?? ''}`} author={empresa?.nombre ?? ''}>
      <Page size="A4" orientation="landscape" style={S.page}>

        {/* Cabecera fija */}
        <View style={S.header} fixed>
          <View>
            {hayLogo && <Image style={S.logo} src={logoSrc} />}
            <Text style={S.empNombre}>{empresa?.nombre ?? ''}</Text>
            {empresa?.nit       && <Text style={S.empMeta}>NIT/RUC: {empresa.nit}</Text>}
            {empresa?.telefono  && <Text style={S.empMeta}>Tel: {empresa.telefono}</Text>}
            {empresa?.direccion && <Text style={S.empMeta}>{empresa.direccion}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.badge}>REPORTE</Text>
            <Text style={S.rptTitle}>Kardex de Inventario</Text>
            <Text style={S.rptSub}>{periodoStr}</Text>
          </View>
        </View>

        {/* Info producto */}
        <View style={S.prodBox}>
          <View style={{ flex: 1 }}>
            <Text style={S.prodNom}>{producto?.producto ?? '—'}</Text>
            <Text style={S.prodCod}>{producto?.codigo_interno ?? ''}</Text>
          </View>
          <View style={S.kpiBox}>
            <View style={S.kpiWrap}>
              <Text style={S.kpiLbl}>Movimientos</Text>
              <Text style={S.kpiVal}>{movimientos.length}</Text>
            </View>
            <View style={S.kpiWrap}>
              <Text style={S.kpiLbl}>Total entradas</Text>
              <Text style={[S.kpiVal, S.kpiGrn]}>+{fmtN(totalEntradas)}</Text>
            </View>
            <View style={S.kpiWrap}>
              <Text style={S.kpiLbl}>Total salidas</Text>
              <Text style={[S.kpiVal, S.kpiRed]}>−{fmtN(totalSalidas)}</Text>
            </View>
            <View style={S.kpiWrap}>
              <Text style={S.kpiLbl}>Saldo final</Text>
              <Text style={[S.kpiVal, { color: '#1d4ed8' }]}>{fmtN(saldoFinal)}</Text>
            </View>
          </View>
        </View>

        {/* Tabla */}
        <TablaHead />
        {movimientos.map((m, i) => (
          <FilaKardex key={m.id_kardex ?? i} f={m} i={i} />
        ))}

        {/* Resumen */}
        <View style={S.resBox}>
          <View style={S.resCard}>
            <Text style={S.resLbl}>Total movimientos</Text>
            <Text style={S.resVal}>{movimientos.length}</Text>
          </View>
          <View style={S.resCard}>
            <Text style={S.resLbl}>Total entradas</Text>
            <Text style={[S.resVal, S.resGrn]}>+{fmtN(totalEntradas)}</Text>
          </View>
          <View style={S.resCard}>
            <Text style={S.resLbl}>Total salidas</Text>
            <Text style={[S.resVal, S.resRed]}>−{fmtN(totalSalidas)}</Text>
          </View>
          <View style={S.resCard}>
            <Text style={S.resLbl}>Saldo final</Text>
            <Text style={[S.resVal, S.resBal]}>{fmtN(saldoFinal)}</Text>
          </View>
        </View>

        {/* Footer fijo */}
        <View style={S.footer} fixed>
          <Text style={S.footerTxt}>
            {empresa?.nombre} · Kardex de Inventario · Generado el {now}
          </Text>
          <Text
            style={S.footerTxt}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}

/* ─── Exportador ─────────────────────────────────────────────────────────── */
export async function exportarKardexPDF({ movimientos, producto, empresa, filtros }) {
  if (!movimientos?.length) throw new Error('No hay movimientos para exportar.');

  const blob = await pdf(
    <KardexDoc movimientos={movimientos} producto={producto} empresa={empresa} filtros={filtros} />
  ).toBlob();

  const cod  = producto?.codigo_interno ? `_${producto.codigo_interno}` : '';
  const desde = filtros?.fecha_desde ?? '';
  const hasta = filtros?.fecha_hasta ?? '';
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `kardex${cod}${desde ? `_${desde}` : ''}${hasta ? `_${hasta}` : ''}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
