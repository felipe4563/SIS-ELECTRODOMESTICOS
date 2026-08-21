import {
  Document, Page, Text, View, StyleSheet, pdf, Image,
} from '@react-pdf/renderer';
import { transferenciasService } from '../../services/transferencias.service';

const fmtN   = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha  = s => s ? new Date(s).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const ESTADO_COLOR = {
  SOLICITADA:  { bg: '#dbeafe', fg: '#1d4ed8' },
  EN_TRANSITO: { bg: '#fef9c3', fg: '#a16207' },
  RECIBIDA:    { bg: '#dcfce7', fg: '#15803d' },
  PARCIAL:     { bg: '#ffedd5', fg: '#c2410c' },
  ANULADA:     { bg: '#fee2e2', fg: '#b91c1c' },
};
const ESTADO_LABEL = {
  SOLICITADA: 'Solicitada', EN_TRANSITO: 'En Tránsito', RECIBIDA: 'Recibida',
  PARCIAL: 'Parcial', ANULADA: 'Anulada',
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

  // Grilla info
  grid4:    { flexDirection: 'row', gap: 12, marginBottom: 14 },
  col:      { flex: 1 },
  lbl:      { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  val:      { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 1 },
  sub:      { fontSize: 8, color: '#4b5563', marginBottom: 1 },

  // Flecha origen → destino
  flowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  flowBox:  { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 4, borderWidth: 1 },
  flowLbl:  { fontSize: 7, fontFamily: 'Helvetica-Bold' },
  flowSub:  { fontSize: 7, marginTop: 1 },
  flowArr:  { fontSize: 12, color: '#9ca3af' },

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
  cUm:    { width: 55 },
  cEnv:   { width: 75, textAlign: 'right' },
  cRec:   { width: 75, textAlign: 'right' },
  cPend:  { width: 75, textAlign: 'right' },
  pNom:   { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#111827' },
  pDet:   { fontSize: 7, color: '#555555', marginTop: 1 },
  pSpec:  { fontSize: 7, color: '#6b7280', marginTop: 1 },

  // Totales
  totWrap:  { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, marginBottom: 12 },
  totBox:   { minWidth: 160 },
  totRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, paddingHorizontal: 8 },
  totLbl:   { fontSize: 8, color: '#6b7280' },
  totVal:   { fontSize: 8, color: '#111827' },
  totRowB:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 8,
              borderTopWidth: 1.5, borderTopColor: '#1a1a1a' },
  totLblB:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827' },
  totValB:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827' },

  // Obs
  obsBox:   { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 3,
              padding: 8, marginBottom: 12 },
  obsText:  { fontSize: 8, color: '#374151', marginTop: 2 },

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
function TransferenciaDoc({ transferencia: t, detalle = [], empresa: e, logoUrl }) {
  const est = ESTADO_COLOR[t.estado] ?? ESTADO_COLOR.ANULADA;
  const nombreCompleto = (n, a) => [n, a].filter(Boolean).join(' ') || '—';
  const specLinea = d => [d.marca && `Marca: ${d.marca}`, d.modelo && `Mod: ${d.modelo}`, d.color && `Color: ${d.color}`, d.capacidad && `Cap: ${d.capacidad}`].filter(Boolean).join('  ·  ');
  const totalEnviado  = detalle.reduce((s, d) => s + Number(d.cantidad_enviada  ?? 0), 0);
  const totalRecibido = detalle.reduce((s, d) => s + Number(d.cantidad_recibida ?? 0), 0);

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
            <Text style={S.docBadge}>NOTA DE TRANSFERENCIA</Text>
            <Text style={S.docNum}>{t.numero}</Text>
            <Text style={[S.estBadge, { backgroundColor: est.bg, color: est.fg }]}>
              {ESTADO_LABEL[t.estado] ?? t.estado}
            </Text>
          </View>
        </View>

        {/* ── Flujo origen → destino ── */}
        <View style={S.flowWrap}>
          <View style={[S.flowBox, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
            <Text style={[S.flowLbl, { color: '#b45309' }]}>ORIGEN · {t.deposito_origen_codigo}</Text>
            <Text style={S.flowSub}>{t.deposito_origen_nombre}</Text>
          </View>
          <Text style={S.flowArr}>→</Text>
          <View style={[S.flowBox, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <Text style={[S.flowLbl, { color: '#1d4ed8' }]}>DESTINO · {t.deposito_destino_codigo}</Text>
            <Text style={S.flowSub}>{t.deposito_destino_nombre}</Text>
          </View>
        </View>

        {/* ── Info grid ── */}
        <View style={S.grid4}>
          <View style={S.col}>
            <Text style={S.lbl}>Fechas</Text>
            <Text style={S.sub}>Solicitud: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{fecha(t.fecha_solicitud)}</Text></Text>
            {t.fecha_envio && (
              <Text style={S.sub}>Envío: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{fecha(t.fecha_envio)}</Text></Text>
            )}
            {t.fecha_recepcion && (
              <Text style={S.sub}>Recepción: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{fecha(t.fecha_recepcion)}</Text></Text>
            )}
          </View>
          <View style={S.col}>
            <Text style={S.lbl}>Solicita</Text>
            <Text style={S.val}>{nombreCompleto(t.solicita_nombres, t.solicita_apellidos)}</Text>
          </View>
          <View style={S.col}>
            <Text style={S.lbl}>Envía</Text>
            <Text style={S.val}>{nombreCompleto(t.envia_nombres, t.envia_apellidos)}</Text>
          </View>
          <View style={S.col}>
            <Text style={S.lbl}>Recibe</Text>
            <Text style={S.val}>{nombreCompleto(t.recibe_nombres, t.recibe_apellidos)}</Text>
          </View>
        </View>

        <View style={S.divider} />

        {/* ── Tabla productos ── */}
        <Text style={S.secTitle}>Detalle de Productos</Text>
        <View style={S.tHead}>
          <Text style={[S.th, S.cN]}>#</Text>
          <Text style={[S.th, S.cCod]}>Código</Text>
          <Text style={[S.th, S.cProd]}>Producto</Text>
          <Text style={[S.th, S.cUm]}>U.M.</Text>
          <Text style={[S.th, S.cEnv, S.right]}>Enviada</Text>
          <Text style={[S.th, S.cRec, S.right]}>Recibida</Text>
          <Text style={[S.th, S.cPend, S.right]}>Pendiente</Text>
        </View>
        {detalle.map((d, i) => {
          const pendiente = Number(d.cantidad_enviada ?? 0) - Number(d.cantidad_recibida ?? 0);
          const spec = specLinea(d);
          return (
            <View key={d.id_detalle} style={i % 2 === 0 ? S.tRow : S.tRowAlt}>
              <Text style={[S.td, S.cN, { color: '#9ca3af' }]}>{i + 1}</Text>
              <Text style={[S.td, S.cCod, S.mono, { fontSize: 7 }]}>{d.codigo_interno}</Text>
              <View style={[S.cProd, { paddingVertical: 5, paddingHorizontal: 5 }]}>
                <Text style={S.pNom}>{d.producto_nombre}</Text>
                {d.producto_detalle && <Text style={S.pDet}>{d.producto_detalle}</Text>}
                {spec && <Text style={S.pSpec}>{spec}</Text>}
              </View>
              <Text style={[S.td, S.cUm, { fontSize: 7, color: '#9ca3af' }]}>{d.unidad_nombre}</Text>
              <Text style={[S.td, S.cEnv, S.right, S.mono]}>{fmtN(d.cantidad_enviada)}</Text>
              <Text style={[S.td, S.cRec, S.right, S.mono, { color: '#15803d' }]}>{fmtN(d.cantidad_recibida)}</Text>
              <Text style={[S.td, S.cPend, S.right, S.mono, pendiente > 0 ? { color: '#c2410c' } : { color: '#9ca3af' }]}>
                {fmtN(pendiente)}
              </Text>
            </View>
          );
        })}

        {/* ── Totales enviado / recibido ── */}
        <View style={S.totWrap}>
          <View style={S.totBox}>
            <View style={S.totRow}>
              <Text style={S.totLbl}>Total enviado:</Text>
              <Text style={S.totVal}>{fmtN(totalEnviado)}</Text>
            </View>
            <View style={S.totRowB}>
              <Text style={S.totLblB}>TOTAL RECIBIDO:</Text>
              <Text style={S.totValB}>{fmtN(totalRecibido)}</Text>
            </View>
          </View>
        </View>

        {/* ── Observaciones ── */}
        {(t.observaciones || t.observaciones_envio || t.observaciones_recepcion) && (
          <>
            <View style={[S.divider, { marginTop: 14 }]} />
            {t.observaciones && (
              <>
                <Text style={S.secTitle}>Observaciones (solicitud)</Text>
                <View style={S.obsBox}>
                  <Text style={S.obsText}>{t.observaciones}</Text>
                </View>
              </>
            )}
            {t.observaciones_envio && (
              <>
                <Text style={S.secTitle}>Observaciones (envío)</Text>
                <View style={S.obsBox}>
                  <Text style={S.obsText}>{t.observaciones_envio}</Text>
                </View>
              </>
            )}
            {t.observaciones_recepcion && (
              <>
                <Text style={S.secTitle}>Observaciones (recepción)</Text>
                <View style={S.obsBox}>
                  <Text style={S.obsText}>{t.observaciones_recepcion}</Text>
                </View>
              </>
            )}
          </>
        )}

        {/* ── Firmas ── */}
        <View style={S.firmas}>
          <View style={S.firmaBlq}>
            <View style={S.firmaLin} />
            <Text style={S.firmaTit}>Solicitado por</Text>
            <Text style={S.firmaNom}>{nombreCompleto(t.solicita_nombres, t.solicita_apellidos)}</Text>
          </View>
          <View style={S.firmaBlq}>
            <View style={S.firmaLin} />
            <Text style={S.firmaTit}>Enviado por</Text>
            <Text style={S.firmaNom}>{nombreCompleto(t.envia_nombres, t.envia_apellidos)}</Text>
          </View>
          <View style={S.firmaBlq}>
            <View style={S.firmaLin} />
            <Text style={S.firmaTit}>Recibido por</Text>
            <Text style={S.firmaNom}>{nombreCompleto(t.recibe_nombres, t.recibe_apellidos)}</Text>
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

/* ─── Función de descarga directa (exportada para usar desde TransferenciaDetalle) ── */
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

export async function descargarTransferenciaPDF(id, empresa, logoUrl) {
  const [{ data }, logoBase64] = await Promise.all([
    transferenciasService.getOne(id),
    urlToBase64(logoUrl),
  ]);
  const { detalle, ...transferencia } = data;

  const blob = await pdf(
    <TransferenciaDoc
      transferencia={transferencia}
      detalle={detalle ?? []}
      empresa={empresa}
      logoUrl={logoBase64}
    />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `transferencia-${transferencia.numero}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
