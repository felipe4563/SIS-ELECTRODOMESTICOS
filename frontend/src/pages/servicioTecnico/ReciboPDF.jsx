import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { servicioTecnicoService } from '../../services/servicioTecnico.service';
import { buildLogoUrl } from '../../contexts/EmpresaContext';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmt   = d => d ? new Date(d).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtDt = d => d ? new Date(d).toLocaleString('es-PY') : '—';
const gs    = n => Number(n) > 0 ? `Gs. ${Number(n).toLocaleString('es-PY')}` : null;
const v     = x => (x != null && x !== '') ? String(x) : null;

/* ─── Metadata de estados ────────────────────────────────────────────────── */
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

/* ─── Estilos ────────────────────────────────────────────────────────────── */
/*
 * A4 usable: 210mm - 2×14mm = 182mm ≈ 516pt
 * Tabla equipo — columnas fijas: Marca(60) + Modelo(70) + Serie(80) + Color(46) = 256pt
 * Descripción (flex:1): ~260pt
 */
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', fontSize: 9, color: '#111827',
    paddingHorizontal: '14mm', paddingVertical: '12mm',
  },

  /* ── Cabecera ── */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 3, borderBottomColor: '#facc15',
    paddingBottom: 10, marginBottom: 14,
  },
  logo:         { width: 72, height: 44, objectFit: 'contain', marginBottom: 5 },
  empNombre:    { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 3 },
  empMeta:      { fontSize: 7.5, color: '#6b7280', marginTop: 1.5 },
  badge:        {
    backgroundColor: '#facc15', color: '#1c1917',
    fontSize: 7.5, fontFamily: 'Helvetica-Bold',
    paddingVertical: 2, paddingHorizontal: 8,
    borderRadius: 3, marginBottom: 5, alignSelf: 'flex-end',
  },
  ordTitle:     { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'right' },
  ordNum:       { fontSize: 22, fontFamily: 'Courier-Bold', color: '#111827', textAlign: 'right', marginTop: 2 },
  estadoBadge:  {
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: 3,
    fontSize: 8, fontFamily: 'Helvetica-Bold',
    alignSelf: 'flex-end', marginTop: 6,
  },
  garantiaBadge: {
    backgroundColor: '#dcfce7', color: '#15803d',
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: 3,
    fontSize: 7.5, fontFamily: 'Helvetica-Bold',
    alignSelf: 'flex-end', marginTop: 3,
    textTransform: 'uppercase',
  },
  prioLine: { fontSize: 7.5, color: '#6b7280', textAlign: 'right', marginTop: 3 },

  /* ── 2 columnas ── */
  row2: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  col:  { flex: 1 },

  /* ── Sección con cabecera oscura ── */
  sec:     { borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10 },
  secHead: {
    backgroundColor: '#1c1917', color: '#facc15',
    paddingVertical: 5, paddingHorizontal: 10,
    fontSize: 7.5, fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  secBody: { paddingVertical: 9, paddingHorizontal: 10 },

  /* ── Sección light ── */
  secLight: {
    borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
    paddingVertical: 8, paddingHorizontal: 10,
    marginBottom: 10,
  },
  secLightHead: {
    fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5,
  },

  /* ── Campo bloque ── */
  fb:     { marginBottom: 6 },
  fl:     { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1.5 },
  fv:     { fontSize: 9, color: '#111827', lineHeight: 1.5 },
  fvMono: { fontSize: 9, fontFamily: 'Courier', color: '#111827' },
  fvBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
  fvPre:  { fontSize: 9, color: '#111827', lineHeight: 1.6 },

  /* ── Campo fila ── */
  fRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  fRowLbl:    { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', minWidth: 90, marginRight: 5 },
  fRowVal:    { fontSize: 8, color: '#111827', flex: 1, lineHeight: 1.4 },
  fRowValMono:{ fontSize: 8, fontFamily: 'Courier', color: '#111827', flex: 1 },

  /* ── Tabla equipo ── */
  tableHead: {
    flexDirection: 'row', backgroundColor: '#f3f4f6',
    borderBottomWidth: 1, borderBottomColor: '#d1d5db',
    paddingVertical: 4, paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5, borderTopColor: '#e5e7eb',
    paddingVertical: 5, paddingHorizontal: 8,
  },
  th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#4b5563' },
  td: { fontSize: 9, color: '#111827' },
  tdMono: { fontSize: 8, fontFamily: 'Courier', color: '#374151' },

  /* ── Bloque técnico ── */
  tecBlock: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
    paddingVertical: 7, paddingHorizontal: 10,
    marginBottom: 10, gap: 8,
  },
  tecLbl: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6b7280' },
  tecVal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827', flex: 1 },
  tecMeta:{ fontSize: 8, color: '#6b7280', marginLeft: 10 },

  /* ── Costo total ── */
  costBox: {
    alignSelf: 'flex-end',
    backgroundColor: '#fef9c3',
    borderWidth: 1, borderColor: '#fde047',
    borderRadius: 4,
    paddingVertical: 10, paddingHorizontal: 20,
    marginBottom: 12, alignItems: 'flex-end',
  },
  costLbl: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#713f12', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  costVal: { fontSize: 22, fontFamily: 'Courier-Bold', color: '#15803d' },

  /* ── Historial de estados ── */
  histRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 5, paddingHorizontal: 10,
    borderTopWidth: 0.5, borderTopColor: '#e5e7eb',
  },
  histDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#facc15',
    marginTop: 2, marginRight: 8, flexShrink: 0,
  },
  histFecha: { fontSize: 7.5, color: '#9ca3af', minWidth: 82, marginRight: 6 },
  histEstado:{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', flex: 1 },
  histObs:   { fontSize: 8, color: '#4b5563', marginTop: 2, lineHeight: 1.4 },
  histUser:  { fontSize: 7, color: '#9ca3af', marginTop: 1.5 },

  /* ── Firmas ── */
  sigSection: { marginTop: 26, marginBottom: 8 },
  sigRow:     { flexDirection: 'row', gap: 18, marginBottom: 12 },
  sigCol:     { flex: 1, alignItems: 'center' },
  sigLine:    { width: '100%', borderTopWidth: 1, borderTopColor: '#374151', marginTop: 30, paddingTop: 5 },
  sigLbl:     { fontSize: 8, color: '#374151', textAlign: 'center' },
  sigSub:     { fontSize: 7.5, color: '#9ca3af', textAlign: 'center', marginTop: 1.5 },
  sigExtra:   {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 6,
  },
  sigExtraLbl:{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#4b5563' },
  sigExtraLine:{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#9ca3af', height: 10 },

  /* ── Footer ── */
  footer:    { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 6, marginTop: 14 },
  footerTxt: { fontSize: 7, color: '#9ca3af', textAlign: 'center', marginTop: 1 },
});

/* ─── Sub-componentes ────────────────────────────────────────────────────── */
function Sec({ title, children }) {
  return (
    <View style={S.sec}>
      <Text style={S.secHead}>{title}</Text>
      <View style={S.secBody}>{children}</View>
    </View>
  );
}

function F({ label, value, mono = false, bold = false, pre = false }) {
  if (!v(value)) return null;
  const style = bold ? S.fvBold : mono ? S.fvMono : pre ? S.fvPre : S.fv;
  return (
    <View style={S.fb}>
      <Text style={S.fl}>{label}</Text>
      <Text style={style}>{String(value)}</Text>
    </View>
  );
}

function FR({ label, value, mono = false }) {
  if (!v(value)) return null;
  return (
    <View style={S.fRow}>
      <Text style={S.fRowLbl}>{label}:</Text>
      <Text style={mono ? S.fRowValMono : S.fRowVal}>{String(value)}</Text>
    </View>
  );
}

/* ─── Documento PDF ──────────────────────────────────────────────────────── */
function ReciboDoc({ r, seguimiento = [] }) {
  const estadoLabel = ESTADO_LABEL[r.estado] ?? r.estado;
  const estadoClr   = ESTADO_COLOR[r.estado] ?? { bg: '#f4f4f5', text: '#52525b' };
  const hayDiag     = r.diagnostico || r.trabajo_realizado || r.repuestos_usados;
  const now         = new Date().toLocaleString('es-PY');
  const logoSrc     = buildLogoUrl(r.empresa_logo);
  const hayLogo     = logoSrc && logoSrc !== '/logo.png';

  return (
    <Document title={`OS-${r.numero}`} author={r.empresa_nombre ?? 'Servicio Técnico'}>
      <Page size="A4" style={S.page}>

        {/* ── Cabecera (fixed) ── */}
        <View style={S.header} fixed>
          {/* Izquierda: logo + datos de empresa */}
          <View>
            {hayLogo && <Image style={S.logo} src={logoSrc} />}
            <Text style={S.empNombre}>{r.empresa_nombre ?? 'Servicio Técnico'}</Text>
            {v(r.empresa_ruc)       && <Text style={S.empMeta}>NIT / RUC: {r.empresa_ruc}</Text>}
            {v(r.empresa_telefono)  && <Text style={S.empMeta}>Tel: {r.empresa_telefono}</Text>}
            {v(r.empresa_direccion) && <Text style={S.empMeta}>{r.empresa_direccion}</Text>}
            {v(r.sucursal_nombre)   && <Text style={S.empMeta}>Sucursal: {r.sucursal_nombre}</Text>}
            {v(r.sucursal_telefono) && <Text style={S.empMeta}>Tel. sucursal: {r.sucursal_telefono}</Text>}
          </View>

          {/* Derecha: título + número + estado */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.badge}>SERVICIO TÉCNICO</Text>
            <Text style={S.ordTitle}>Orden de servicio</Text>
            <Text style={S.ordNum}>{r.numero}</Text>
            <Text style={[S.estadoBadge, { backgroundColor: estadoClr.bg, color: estadoClr.text }]}>
              {estadoLabel}
            </Text>
            {r.garantia && (
              <Text style={S.garantiaBadge}>Garantía</Text>
            )}
            <Text style={S.prioLine}>Prioridad: {r.prioridad ?? '—'}</Text>
          </View>
        </View>

        {/* ── Cliente + Recepción ── */}
        <View style={S.row2}>
          <View style={[S.col, S.sec, { marginBottom: 0 }]}>
            <Text style={S.secHead}>Datos del cliente</Text>
            <View style={S.secBody}>
              <F label="Nombre / razón social" value={r.cliente_nombre} bold />
              <F label="CI / RUC"   value={r.documento}        mono />
              <F label="Teléfono"   value={r.cliente_telefono} />
              <F label="Dirección"  value={r.cliente_direccion} />
            </View>
          </View>

          <View style={[S.col, S.sec, { marginBottom: 0 }]}>
            <Text style={S.secHead}>Recepción</Text>
            <View style={S.secBody}>
              <F label="Fecha de recepción"  value={fmtDt(r.fecha_recepcion)} />
              <F label="Recibido por"        value={r.usuario_recibe} />
              <F label="Sucursal"            value={r.sucursal_nombre} />
              {v(r.sucursal_direccion) && <F label="Dirección"  value={r.sucursal_direccion} />}
              <F label="Entrega estimada"    value={r.fecha_estimada_entrega ? fmt(r.fecha_estimada_entrega) : null} />
              {gs(r.costo_estimado)          && <F label="Costo estimado" value={gs(r.costo_estimado)} mono bold />}
            </View>
          </View>
        </View>

        <View style={{ height: 10 }} />

        {/* ── Equipo recibido ── */}
        <Sec title="Equipo recibido">
          <View style={S.tableHead}>
            <Text style={[S.th, { flex: 1 }]}>Descripción</Text>
            <Text style={[S.th, { width: 60 }]}>Marca</Text>
            <Text style={[S.th, { width: 70 }]}>Modelo</Text>
            <Text style={[S.th, { width: 80 }]}>N° de serie</Text>
            <Text style={[S.th, { width: 46 }]}>Color</Text>
          </View>
          <View style={S.tableRow}>
            <Text style={[S.td, { flex: 1 }]}>{r.descripcion_producto ?? '—'}</Text>
            <Text style={[S.td, { width: 60 }]}>{r.marca_producto ?? '—'}</Text>
            <Text style={[S.td, { width: 70 }]}>{r.modelo_producto ?? '—'}</Text>
            <Text style={[S.tdMono, { width: 80 }]}>{r.numero_serie ?? '—'}</Text>
            <Text style={[S.td, { width: 46 }]}>{r.color_producto ?? '—'}</Text>
          </View>
          {v(r.tipo_servicio) && (
            <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 8, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: '#e5e7eb' }}>
              <Text style={S.fl}>Tipo de servicio:</Text>
              <Text style={S.fv}>{r.tipo_servicio}</Text>
            </View>
          )}
        </Sec>

        {/* ── Falla reportada ── */}
        <Sec title="Falla reportada por el cliente">
          <Text style={S.fvPre}>{r.falla_reportada ?? '—'}</Text>
        </Sec>

        {/* ── Accesorios + Condición ── */}
        {(v(r.accesorios_recibidos) || v(r.condicion_fisica)) && (
          <View style={[S.row2, { marginBottom: 10 }]}>
            {v(r.accesorios_recibidos) && (
              <View style={[S.col, S.secLight, { marginBottom: 0 }]}>
                <Text style={S.secLightHead}>Accesorios recibidos</Text>
                <Text style={S.fv}>{r.accesorios_recibidos}</Text>
              </View>
            )}
            {v(r.condicion_fisica) && (
              <View style={[S.col, S.secLight, { marginBottom: 0 }]}>
                <Text style={S.secLightHead}>Condición física del equipo</Text>
                <Text style={S.fv}>{r.condicion_fisica}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Técnico externo ── */}
        {v(r.tecnico_nombre) && (
          <View style={S.tecBlock}>
            <Text style={S.tecLbl}>Técnico / taller:</Text>
            <Text style={S.tecVal}>{r.tecnico_nombre}</Text>
            {v(r.tecnico_telefono)     && <Text style={S.tecMeta}>Tel: {r.tecnico_telefono}</Text>}
            {v(r.fecha_envio_tecnico)  && <Text style={S.tecMeta}>Enviado: {fmt(r.fecha_envio_tecnico)}</Text>}
          </View>
        )}

        {/* ── Diagnóstico y reparación ── */}
        {hayDiag && (
          <Sec title="Diagnóstico y reparación">
            {v(r.diagnostico) && (
              <View style={{ marginBottom: r.trabajo_realizado ? 8 : 0 }}>
                <Text style={[S.fl, { marginBottom: 3 }]}>Diagnóstico</Text>
                <Text style={S.fvPre}>{r.diagnostico}</Text>
              </View>
            )}
            {v(r.trabajo_realizado) && (
              <View style={{ borderTopWidth: r.diagnostico ? 0.5 : 0, borderTopColor: '#e5e7eb', paddingTop: r.diagnostico ? 8 : 0 }}>
                <Text style={[S.fl, { marginBottom: 3 }]}>Trabajo realizado</Text>
                <Text style={S.fvPre}>{r.trabajo_realizado}</Text>
                {v(r.repuestos_usados) && (
                  <View style={{ marginTop: 8, borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 8 }}>
                    <Text style={[S.fl, { marginBottom: 2 }]}>Repuestos / materiales</Text>
                    <Text style={S.fv}>{r.repuestos_usados}</Text>
                  </View>
                )}
              </View>
            )}
          </Sec>
        )}

        {/* ── Historial de estados ── */}
        {seguimiento.length > 0 && (
          <View style={S.sec}>
            <Text style={S.secHead}>Historial de estados</Text>
            {seguimiento.map((s, i) => {
              const estadoAnterior = ESTADO_LABEL[s.estado_anterior] ?? s.estado_anterior;
              const estadoNuevo    = ESTADO_LABEL[s.estado_nuevo]    ?? s.estado_nuevo;
              const estadoClr      = ESTADO_COLOR[s.estado_nuevo]    ?? { bg: '#f4f4f5', text: '#52525b' };
              return (
                <View key={i} style={S.histRow}>
                  <View style={[S.histDot, { backgroundColor: estadoClr.text }]} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                      <Text style={S.histFecha}>{fmtDt(s.fecha)}</Text>
                      {s.estado_anterior && (
                        <>
                          <Text style={{ fontSize: 7.5, color: '#9ca3af' }}>
                            {estadoAnterior}
                          </Text>
                          <Text style={{ fontSize: 7.5, color: '#9ca3af' }}>→</Text>
                        </>
                      )}
                      <Text style={[S.histEstado, { color: estadoClr.text }]}>{estadoNuevo}</Text>
                    </View>
                    {v(s.observacion) && (
                      <Text style={S.histObs}>{s.observacion}</Text>
                    )}
                    {v(s.usuario_nombre) && (
                      <Text style={S.histUser}>{s.usuario_nombre}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Observaciones generales ── */}
        {v(r.observaciones) && (
          <View style={S.secLight}>
            <Text style={S.secLightHead}>Observaciones generales</Text>
            <Text style={[S.fvPre, { color: '#4b5563' }]}>{r.observaciones}</Text>
          </View>
        )}

        {/* ── Cierre ── */}
        {v(r.fecha_real_entrega) && (
          <View style={[S.secLight, { flexDirection: 'row', gap: 20 }]}>
            <View>
              <Text style={[S.fl, { marginBottom: 2 }]}>Fecha de entrega real</Text>
              <Text style={S.fvBold}>{fmtDt(r.fecha_real_entrega)}</Text>
            </View>
            {v(r.usuario_cierre_nombre) && (
              <View>
                <Text style={[S.fl, { marginBottom: 2 }]}>Cerrado por</Text>
                <Text style={S.fv}>{r.usuario_cierre_nombre}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Costo total ── */}
        {gs(r.costo_final) && (
          <View style={S.costBox}>
            <Text style={S.costLbl}>Total del servicio</Text>
            <Text style={S.costVal}>{gs(r.costo_final)}</Text>
          </View>
        )}

        {/* ── Firmas ── */}
        <View style={S.sigSection}>
          <View style={S.sigRow}>
            <View style={S.sigCol}>
              <View style={S.sigLine} />
              <Text style={S.sigLbl}>Firma del cliente</Text>
              <Text style={S.sigSub}>Recibí conforme</Text>
            </View>
            <View style={S.sigCol}>
              <View style={S.sigLine} />
              <Text style={S.sigLbl}>Nombre y apellido</Text>
              <Text style={S.sigSub}>Aclaración</Text>
            </View>
            <View style={S.sigCol}>
              <View style={S.sigLine} />
              <Text style={S.sigLbl}>Firma del responsable</Text>
              <Text style={S.sigSub}>Sello / cargo</Text>
            </View>
          </View>
          <View style={S.sigExtra}>
            <Text style={S.sigExtraLbl}>Fecha y hora de retiro:</Text>
            <View style={S.sigExtraLine} />
          </View>
          <View style={[S.sigExtra, { marginTop: 6 }]}>
            <Text style={S.sigExtraLbl}>CI / Documento del cliente:</Text>
            <View style={S.sigExtraLine} />
          </View>
        </View>

        {/* ── Footer (fixed) ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerTxt}>
            {r.empresa_nombre} · Orden N°: {r.numero}
            {r.sucursal_nombre ? `  ·  Sucursal: ${r.sucursal_nombre}` : ''}
            {r.sucursal_telefono ? `  ·  Tel: ${r.sucursal_telefono}` : ''}
          </Text>
          <Text style={S.footerTxt}>Generado el {now}</Text>
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
export async function exportarReciboPDF(id) {
  const { data } = await servicioTecnicoService.getRecibo(id);
  const r   = data.recibo;
  const seg = data.seguimiento ?? [];

  const blob = await pdf(<ReciboDoc r={r} seguimiento={seg} />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `OS-${r.numero}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
