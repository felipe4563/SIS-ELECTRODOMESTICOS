import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { buildLogoUrl } from '../../../contexts/EmpresaContext';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmtF  = s => s ? new Date(s).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtDt = s => s ? new Date(s).toLocaleString('es-PY') : '—';
const gs    = n => n != null && Number(n) > 0 ? `Gs. ${Number(n).toLocaleString('es-PY')}` : null;

const ESTADO_LABEL = {
  RECIBIDO:           'Recibido',
  EN_DIAGNOSTICO:     'En diagnóstico',
  ESPERANDO_REPUESTO: 'Esperando repuesto',
  EN_REPARACION:      'En reparación',
  REPARADO:           'Reparado',
  LISTO_ENTREGA:      'Listo para entrega',
  ENTREGADO:          'Entregado',
  SIN_REPARACION:     'Sin reparación',
  ANULADO:            'Anulado',
};

const ESTADO_COLOR = {
  RECIBIDO:           { bg: '#f4f4f5', text: '#52525b' },
  EN_DIAGNOSTICO:     { bg: '#dbeafe', text: '#1d4ed8' },
  ESPERANDO_REPUESTO: { bg: '#fef3c7', text: '#b45309' },
  EN_REPARACION:      { bg: '#ede9fe', text: '#6d28d9' },
  REPARADO:           { bg: '#dcfce7', text: '#15803d' },
  LISTO_ENTREGA:      { bg: '#ccfbf1', text: '#0f766e' },
  ENTREGADO:          { bg: '#e0e7ff', text: '#3730a3' },
  SIN_REPARACION:     { bg: '#ffe4e6', text: '#be123c' },
  ANULADO:            { bg: '#fee2e2', text: '#dc2626' },
};

const PRIO_COLOR = {
  URGENTE: { bg: '#fee2e2', text: '#dc2626' },
  ALTA:    { bg: '#fef3c7', text: '#b45309' },
  NORMAL:  { bg: '#dbeafe', text: '#1d4ed8' },
  BAJA:    { bg: '#f4f4f5', text: '#52525b' },
};

/* ─── Estilos ────────────────────────────────────────────────────────────── */
/*
 * A4 usable: 210mm - 2×14mm = 182mm ≈ 516pt
 * Columnas tabla: N°Orden(68) + Cliente(flex) + Equipo(flex) + Días(28) + Prioridad(52) + Costo(60)
 */
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', fontSize: 8.5, color: '#111827',
    paddingHorizontal: '14mm', paddingVertical: '12mm',
  },

  /* ── Cabecera ── */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 3, borderBottomColor: '#facc15',
    paddingBottom: 10, marginBottom: 14,
  },
  logo:        { width: 64, height: 38, objectFit: 'contain', marginBottom: 4 },
  empNombre:   { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  empMeta:     { fontSize: 7.5, color: '#6b7280', marginTop: 1 },
  badge:       {
    backgroundColor: '#facc15', color: '#1c1917',
    fontSize: 7.5, fontFamily: 'Helvetica-Bold',
    paddingVertical: 2, paddingHorizontal: 8,
    borderRadius: 3, marginBottom: 4, alignSelf: 'flex-end',
  },
  rptTitle:    { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'right' },
  rptSub:      { fontSize: 8, color: '#4b5563', textAlign: 'right', marginTop: 2 },

  /* ── Sección por estado ── */
  estadoSec:   { marginBottom: 16 },
  estadoHead:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1c1917',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 3,
  },
  estadoName:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#facc15' },
  estadoCount: { fontSize: 8, color: '#d4d4d4' },

  /* ── Tabla ── */
  tableHead: {
    flexDirection: 'row', backgroundColor: '#f3f4f6',
    borderLeftWidth: 1, borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: '#d1d5db', marginTop: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb',
  },
  tableRowAlt: {
    flexDirection: 'row', backgroundColor: '#fafafa',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb',
  },
  th:     { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#4b5563', paddingVertical: 4, paddingHorizontal: 5 },
  td:     { fontSize: 8,   color: '#374151',              paddingVertical: 4, paddingHorizontal: 5 },
  right:  { textAlign: 'right' },
  center: { textAlign: 'center' },

  /* anchos de columna */
  cNum:   { width: 68 },
  cCli:   { flex: 1.2 },
  cEquip: { flex: 1.6 },
  cDias:  { width: 32, textAlign: 'center' },
  cPrio:  { width: 56, textAlign: 'center' },
  cCosto: { width: 64, textAlign: 'right' },

  /* mini badges inline */
  miniTag: {
    paddingVertical: 1, paddingHorizontal: 4, borderRadius: 2,
    fontSize: 7, fontFamily: 'Helvetica-Bold',
    alignSelf: 'flex-start',
  },

  /* equipo: nombre en bold, meta en gris */
  equipNom: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#111827' },
  equipMet: { fontSize: 6.5, color: '#9ca3af', marginTop: 1 },

  /* falla reportada */
  fallaText: { fontSize: 6.5, color: '#6b7280', marginTop: 1.5, fontStyle: 'italic' },

  /* ── Subtotales por estado ── */
  subBox: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 3 },
  subWrap:{ width: 200 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2,
            borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  subLbl: { fontSize: 7.5, color: '#6b7280' },
  subVal: { fontSize: 7.5, color: '#374151' },

  /* ── Totales generales ── */
  grandBox:   { borderTopWidth: 2, borderTopColor: '#111827', marginTop: 14, paddingTop: 10 },
  grandTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8 },
  grandRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  grandLbl:   { fontSize: 8, color: '#4b5563' },
  grandVal:   { fontSize: 8, color: '#111827' },
  grandTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fef9c3', borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    marginTop: 8, borderWidth: 1, borderColor: '#fde047',
  },
  grandTLbl: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#713f12' },
  grandTVal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#15803d' },

  /* ── Footer ── */
  footer:    { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 6, marginTop: 14 },
  footerTxt: { fontSize: 7, color: '#9ca3af', textAlign: 'center', marginTop: 1 },
});

/* ─── Tabla de órdenes por estado ─────────────────────────────────────────── */
function TablaHead() {
  return (
    <View style={S.tableHead}>
      <Text style={[S.th, S.cNum]}>N° Orden</Text>
      <Text style={[S.th, S.cCli]}>Cliente</Text>
      <Text style={[S.th, S.cEquip]}>Equipo / falla</Text>
      <Text style={[S.th, S.cDias, S.center]}>Días</Text>
      <Text style={[S.th, S.cPrio, S.center]}>Prioridad</Text>
      <Text style={[S.th, S.cCosto, S.right]}>Costo</Text>
    </View>
  );
}

function FilaOrden({ o, i }) {
  const pClr = PRIO_COLOR[o.prioridad] ?? PRIO_COLOR.NORMAL;
  const equip = [o.marca_producto, o.modelo_producto].filter(Boolean).join(' ');
  const costo = gs(o.costo_final) ?? gs(o.costo_estimado);

  return (
    <View style={i % 2 === 0 ? S.tableRow : S.tableRowAlt} wrap={false}>
      <View style={[S.cNum, { paddingVertical: 4, paddingHorizontal: 5 }]}>
        <Text style={{ fontFamily: 'Courier', fontSize: 8, color: '#111827' }}>{o.numero}</Text>
        <Text style={{ fontSize: 6.5, color: '#9ca3af', marginTop: 1 }}>{fmtF(o.fecha_recepcion)}</Text>
        {o.garantia ? <Text style={[S.miniTag, { backgroundColor: '#dcfce7', color: '#15803d', marginTop: 2 }]}>GARANTÍA</Text> : null}
      </View>
      <View style={[S.cCli, { paddingVertical: 4, paddingHorizontal: 5 }]}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#111827' }}>{o.cliente_nombre ?? '—'}</Text>
        {o.sucursal_nombre && <Text style={{ fontSize: 6.5, color: '#9ca3af', marginTop: 1 }}>{o.sucursal_nombre}</Text>}
        {o.usuario_recibe  && <Text style={{ fontSize: 6.5, color: '#9ca3af' }}>Recibió: {o.usuario_recibe}</Text>}
      </View>
      <View style={[S.cEquip, { paddingVertical: 4, paddingHorizontal: 5 }]}>
        <Text style={S.equipNom}>{o.descripcion_producto ?? '—'}</Text>
        {equip ? <Text style={S.equipMet}>{equip}{o.numero_serie ? `  ·  S/N: ${o.numero_serie}` : ''}</Text> : null}
        {o.falla_reportada
          ? <Text style={S.fallaText} numberOfLines={2}>{o.falla_reportada}</Text>
          : null}
      </View>
      <Text style={[S.td, S.cDias]}>{o.dias_en_servicio ?? '—'}</Text>
      <View style={[S.cPrio, { paddingVertical: 4, paddingHorizontal: 5, alignItems: 'center' }]}>
        <Text style={[S.miniTag, { backgroundColor: pClr.bg, color: pClr.text }]}>
          {o.prioridad ?? '—'}
        </Text>
      </View>
      <Text style={[S.td, S.cCosto]}>{costo ?? '—'}</Text>
    </View>
  );
}

function EstadoSection({ estado, ordenes }) {
  const clr    = ESTADO_COLOR[estado] ?? { bg: '#f4f4f5', text: '#52525b' };
  const label  = ESTADO_LABEL[estado] ?? estado;
  const totalCosto = ordenes.reduce((a, o) => a + (Number(o.costo_final) || Number(o.costo_estimado) || 0), 0);
  const diasProm = ordenes.length
    ? Math.round(ordenes.reduce((a, o) => a + (Number(o.dias_en_servicio) || 0), 0) / ordenes.length)
    : 0;

  return (
    <View style={S.estadoSec}>
      <View style={S.estadoHead}>
        <Text style={S.estadoName}>{label}</Text>
        <Text style={S.estadoCount}>{ordenes.length} {ordenes.length === 1 ? 'orden' : 'órdenes'}</Text>
      </View>

      <TablaHead />

      {ordenes.map((o, i) => <FilaOrden key={o.id_servicio} o={o} i={i} />)}

      <View style={S.subBox}>
        <View style={S.subWrap}>
          <View style={S.subRow}>
            <Text style={S.subLbl}>Promedio días en servicio</Text>
            <Text style={S.subVal}>{diasProm} días</Text>
          </View>
          {totalCosto > 0 && (
            <View style={[S.subRow, { borderBottomWidth: 0 }]}>
              <Text style={[S.subLbl, { fontFamily: 'Helvetica-Bold' }]}>Total facturado / estimado</Text>
              <Text style={[S.subVal, { fontFamily: 'Helvetica-Bold' }]}>
                Gs. {totalCosto.toLocaleString('es-PY')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/* ─── Documento PDF principal ────────────────────────────────────────────── */
function ReporteDoc({ ordenes, empresa, filtros }) {
  const logoSrc  = buildLogoUrl(empresa?.logo_url);
  const hayLogo  = logoSrc && logoSrc !== '/logo.png';
  const now      = new Date().toLocaleString('es-PY');

  // Agrupar por estado en orden canónico
  const ORDEN_ESTADOS = [
    'RECIBIDO','EN_DIAGNOSTICO','ESPERANDO_REPUESTO','EN_REPARACION',
    'REPARADO','LISTO_ENTREGA','ENTREGADO','SIN_REPARACION','ANULADO',
  ];
  const grupos = {};
  for (const o of ordenes) {
    if (!grupos[o.estado]) grupos[o.estado] = [];
    grupos[o.estado].push(o);
  }
  const estadosPresentes = ORDEN_ESTADOS.filter(e => grupos[e]?.length > 0);

  const totalOrdenes = ordenes.length;
  const totalCosto   = ordenes.reduce((a, o) => a + (Number(o.costo_final) || Number(o.costo_estimado) || 0), 0);
  const enProceso    = ordenes.filter(o => !['ENTREGADO','ANULADO','SIN_REPARACION'].includes(o.estado)).length;

  const periodoStr = (() => {
    if (filtros?.fecha_desde && filtros?.fecha_hasta)
      return `${fmtF(filtros.fecha_desde)} — ${fmtF(filtros.fecha_hasta)}`;
    if (filtros?.fecha_desde) return `Desde ${fmtF(filtros.fecha_desde)}`;
    if (filtros?.fecha_hasta) return `Hasta ${fmtF(filtros.fecha_hasta)}`;
    return 'Todos los registros';
  })();

  const estadoFiltro = filtros?.estado ? ` · Estado: ${ESTADO_LABEL[filtros.estado] ?? filtros.estado}` : '';

  return (
    <Document title="Reporte Servicio Técnico" author={empresa?.nombre ?? 'Servicio Técnico'}>
      <Page size="A4" style={S.page}>

        {/* ── Cabecera fija ── */}
        <View style={S.header} fixed>
          <View>
            {hayLogo && <Image style={S.logo} src={logoSrc} />}
            <Text style={S.empNombre}>{empresa?.nombre ?? 'Servicio Técnico'}</Text>
            {empresa?.nit       && <Text style={S.empMeta}>NIT / RUC: {empresa.nit}</Text>}
            {empresa?.telefono  && <Text style={S.empMeta}>Tel: {empresa.telefono}</Text>}
            {empresa?.direccion && <Text style={S.empMeta}>{empresa.direccion}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.badge}>REPORTE</Text>
            <Text style={S.rptTitle}>Servicio Técnico</Text>
            <Text style={S.rptSub}>{periodoStr}{estadoFiltro}</Text>
          </View>
        </View>

        {/* ── Secciones por estado ── */}
        {estadosPresentes.map(estado => (
          <EstadoSection key={estado} estado={estado} ordenes={grupos[estado]} />
        ))}

        {/* ── Totales generales ── */}
        <View style={S.grandBox}>
          <Text style={S.grandTitle}>Resumen general</Text>
          <View style={S.grandRow}>
            <Text style={S.grandLbl}>Total de órdenes</Text>
            <Text style={S.grandVal}>{totalOrdenes}</Text>
          </View>
          <View style={S.grandRow}>
            <Text style={S.grandLbl}>En proceso</Text>
            <Text style={S.grandVal}>{enProceso}</Text>
          </View>
          <View style={S.grandRow}>
            <Text style={S.grandLbl}>Estados en el reporte</Text>
            <Text style={S.grandVal}>{estadosPresentes.length}</Text>
          </View>
          {totalCosto > 0 && (
            <View style={S.grandTotal}>
              <Text style={S.grandTLbl}>TOTAL FACTURADO / ESTIMADO</Text>
              <Text style={S.grandTVal}>Gs. {totalCosto.toLocaleString('es-PY')}</Text>
            </View>
          )}
        </View>

        {/* ── Footer fijo ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerTxt}>
            {empresa?.nombre} · Reporte de Servicio Técnico · Generado el {now}
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
export async function exportarReporteServicioTecnicoPDF({ ordenes, empresa, filtros }) {
  if (!ordenes?.length) throw new Error('No hay datos para exportar.');

  const blob = await pdf(
    <ReporteDoc ordenes={ordenes} empresa={empresa} filtros={filtros} />
  ).toBlob();

  const desde = filtros?.fecha_desde ?? '';
  const hasta = filtros?.fecha_hasta ?? '';
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = `servicio-tecnico${desde ? `_${desde}` : ''}${hasta ? `_${hasta}` : ''}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
