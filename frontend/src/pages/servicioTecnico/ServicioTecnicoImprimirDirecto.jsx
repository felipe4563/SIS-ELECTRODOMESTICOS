import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { servicioTecnicoService } from '../../services/servicioTecnico.service';
import { useEmpresa } from '../../contexts/EmpresaContext';

const fmt   = d => d ? new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtDt = d => d ? new Date(d).toLocaleString('es-BO') : '—';
const fmtM  = n => Number(n) > 0 ? `Bs ${Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2 })}` : null;
const v     = x => (x != null && x !== '') ? String(x) : null;

const ESTADO_LABEL = {
  RECIBIDO: 'Recibido', EN_DIAGNOSTICO: 'En diagnóstico', ESPERANDO_REPUESTO: 'Esperando repuesto',
  EN_REPARACION: 'En reparación', REPARADO: 'Reparado', LISTO_ENTREGA: 'Listo para entrega',
  ENTREGADO: 'Entregado', SIN_REPARACION: 'Sin reparación', ANULADO: 'Anulado',
};
const ESTADO_COLOR = {
  RECIBIDO:           { bg: '#f4f4f5', fg: '#52525b' },
  EN_DIAGNOSTICO:     { bg: '#dbeafe', fg: '#1d4ed8' },
  ESPERANDO_REPUESTO: { bg: '#fef3c7', fg: '#b45309' },
  EN_REPARACION:      { bg: '#ede9fe', fg: '#6d28d9' },
  REPARADO:           { bg: '#dcfce7', fg: '#15803d' },
  LISTO_ENTREGA:      { bg: '#ccfbf1', fg: '#0f766e' },
  ENTREGADO:          { bg: '#e0e7ff', fg: '#3730a3' },
  SIN_REPARACION:     { bg: '#ffe4e6', fg: '#be123c' },
  ANULADO:            { bg: '#fee2e2', fg: '#dc2626' },
};

const specLinea = r => [r.marca_producto && `Marca: ${r.marca_producto}`, r.modelo_producto && `Mod: ${r.modelo_producto}`, r.color_producto && `Color: ${r.color_producto}`, r.numero_serie && `S/N: ${r.numero_serie}`].filter(Boolean).join('  ·  ');

/* ─── Ticket 80mm (portrait) ──────────────────────────────────────────────── */
function Ticket80({ r, logoUrl }) {
  const est = ESTADO_COLOR[r.estado] ?? ESTADO_COLOR.RECIBIDO;
  return (
    <div id="ticket" style={{ width: '80mm', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5', background: 'white', color: '#000', padding: '4mm' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
        {logoUrl && logoUrl !== '/logo.png' && (
          <img src={logoUrl} alt="Logo" style={{ height: '80px', width: '112px', objectFit: 'contain', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: '1.3', wordBreak: 'break-word' }}>{r.empresa_nombre ?? 'MEGAELECTRA'}</div>
          {v(r.empresa_ruc)       && <div style={{ fontSize: '10px', marginTop: '3px' }}><span style={{ fontWeight: 'bold' }}>NIT:</span> {r.empresa_ruc}</div>}
          {v(r.sucursal_nombre)   && <div style={{ fontSize: '10px' }}><span style={{ fontWeight: 'bold' }}>Sucursal:</span> {r.sucursal_nombre}</div>}
          {v(r.sucursal_telefono) && <div style={{ fontSize: '10px' }}><span style={{ fontWeight: 'bold' }}>Tel:</span> {r.sucursal_telefono}</div>}
        </div>
      </div>

      <Divisor />

      <div style={{ marginBottom: '4px' }}>
        <Row label="ORDEN DE SERVICIO" value={r.numero} bold />
        <div style={{ margin: '3px 0' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px', backgroundColor: est.bg, color: est.fg }}>
            {ESTADO_LABEL[r.estado] ?? r.estado}
          </span>
          {r.garantia && <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px', backgroundColor: '#dcfce7', color: '#15803d', marginLeft: '4px' }}>Garantía</span>}
        </div>
        <Row label="Recepción:" value={fmtDt(r.fecha_recepcion)} />
        {v(r.fecha_estimada_entrega) && <Row label="Entrega est.:" value={fmt(r.fecha_estimada_entrega)} />}
        {v(r.fecha_real_entrega) && <Row label="Entregado:" value={fmtDt(r.fecha_real_entrega)} />}
      </div>

      <Divisor />

      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontWeight: 'bold' }}>CLIENTE</div>
        <div style={{ fontWeight: 'bold' }}>{r.cliente_nombre}</div>
        {v(r.documento) && <div>CI/RUC: {r.documento}</div>}
        {v(r.cliente_telefono) && <div>Tel: {r.cliente_telefono}</div>}
        {v(r.cliente_direccion) && <div>Dir: {r.cliente_direccion}</div>}
      </div>

      <Divisor />

      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontWeight: 'bold' }}>EQUIPO</div>
        <div style={{ fontWeight: 'bold' }}>{r.descripcion_producto ?? '—'}</div>
        {specLinea(r) && <div style={{ fontSize: '10px' }}>{specLinea(r)}</div>}
        {v(r.tipo_servicio) && <div style={{ fontSize: '10px' }}>Servicio: {r.tipo_servicio}</div>}
      </div>

      <Divisor />

      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontWeight: 'bold' }}>FALLA REPORTADA</div>
        <div>{r.falla_reportada ?? '—'}</div>
      </div>

      {(v(r.diagnostico) || v(r.trabajo_realizado)) && (
        <>
          <Divisor />
          <div style={{ marginBottom: '4px' }}>
            {v(r.diagnostico) && <><div style={{ fontWeight: 'bold' }}>DIAGNÓSTICO</div><div style={{ marginBottom: '3px' }}>{r.diagnostico}</div></>}
            {v(r.trabajo_realizado) && <><div style={{ fontWeight: 'bold' }}>TRABAJO REALIZADO</div><div>{r.trabajo_realizado}</div></>}
            {v(r.repuestos_usados) && <div style={{ marginTop: '2px' }}>Repuestos: {r.repuestos_usados}</div>}
          </div>
        </>
      )}

      {v(r.tecnico_nombre) && (
        <>
          <Divisor />
          <Row label="Técnico/taller:" value={r.tecnico_nombre} bold />
          {v(r.tecnico_telefono) && <Row label="Tel:" value={r.tecnico_telefono} />}
        </>
      )}

      {fmtM(r.costo_final) && (
        <>
          <Divisor />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
            <span>TOTAL SERVICIO:</span>
            <span>{fmtM(r.costo_final)}</span>
          </div>
        </>
      )}

      <Divisor />
      <Firmas />
      <Divisor />
      <Pie />
    </div>
  );
}

/* ─── Ticket 110mm (horizontal / ancho) ───────────────────────────────────── */
function Ticket110({ r, logoUrl }) {
  const est = ESTADO_COLOR[r.estado] ?? ESTADO_COLOR.RECIBIDO;
  return (
    <div id="ticket" style={{ width: '110mm', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.45', background: 'white', color: '#000', padding: '4mm' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '5px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
          {logoUrl && logoUrl !== '/logo.png' && (
            <img src={logoUrl} alt="Logo" style={{ height: '64px', width: '90px', objectFit: 'contain', flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', lineHeight: '1.3', wordBreak: 'break-word' }}>{r.empresa_nombre ?? 'MEGAELECTRA'}</div>
            {v(r.empresa_ruc)       && <div style={{ fontSize: '9px', marginTop: '2px' }}><span style={{ fontWeight: 'bold' }}>NIT:</span> {r.empresa_ruc}</div>}
            {v(r.sucursal_nombre)   && <div style={{ fontSize: '9px' }}><span style={{ fontWeight: 'bold' }}>Sucursal:</span> {r.sucursal_nombre}</div>}
            {v(r.sucursal_telefono) && <div style={{ fontSize: '9px' }}><span style={{ fontWeight: 'bold' }}>Tel:</span> {r.sucursal_telefono}</div>}
          </div>
        </div>
        <div style={{ borderLeft: '1px dashed #999', paddingLeft: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center', marginBottom: '3px', letterSpacing: '0.5px' }}>ORDEN DE SERVICIO</div>
          <Row label="N°:" value={r.numero} />
          <div style={{ margin: '2px 0' }}>
            <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px', backgroundColor: est.bg, color: est.fg }}>
              {ESTADO_LABEL[r.estado] ?? r.estado}
            </span>
          </div>
          <Row label="Recepción:" value={fmt(r.fecha_recepcion)} />
          {v(r.fecha_estimada_entrega) && <Row label="Entrega est.:" value={fmt(r.fecha_estimada_entrega)} />}
        </div>
      </div>

      <Divisor />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>CLIENTE</div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', wordBreak: 'break-word' }}>{r.cliente_nombre}</div>
          {v(r.documento) && <div style={{ fontSize: '9px' }}>CI/RUC: {r.documento}</div>}
          {v(r.cliente_telefono) && <div style={{ fontSize: '9px' }}>Tel: {r.cliente_telefono}</div>}
        </div>
        <div style={{ borderLeft: '1px dashed #999', paddingLeft: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>EQUIPO</div>
          <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{r.descripcion_producto ?? '—'}</div>
          {specLinea(r) && <div style={{ fontSize: '9px' }}>{specLinea(r)}</div>}
        </div>
      </div>

      <Divisor />

      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>FALLA REPORTADA</div>
        <div style={{ fontSize: '10px' }}>{r.falla_reportada ?? '—'}</div>
      </div>

      {(v(r.diagnostico) || v(r.trabajo_realizado)) && (
        <>
          <Divisor />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px', fontSize: '9px' }}>
            {v(r.diagnostico) && <div><div style={{ fontWeight: 'bold' }}>DIAGNÓSTICO</div><div>{r.diagnostico}</div></div>}
            {v(r.trabajo_realizado) && <div><div style={{ fontWeight: 'bold' }}>TRABAJO REALIZADO</div><div>{r.trabajo_realizado}</div>{v(r.repuestos_usados) && <div style={{ marginTop: '2px' }}>Repuestos: {r.repuestos_usados}</div>}</div>}
          </div>
        </>
      )}

      <Divisor />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px' }}>
        <div>{v(r.tecnico_nombre) && <span><strong>Técnico:</strong> {r.tecnico_nombre}{v(r.tecnico_telefono) ? ` · Tel: ${r.tecnico_telefono}` : ''}</span>}</div>
        {fmtM(r.costo_final) && <span style={{ fontWeight: 'bold', fontSize: '12px' }}>TOTAL: {fmtM(r.costo_final)}</span>}
      </div>

      <Divisor />
      <Firmas fontSize="9px" />
      <Divisor />
      <Pie fontSize="9px" />
    </div>
  );
}

/* ─── Ticket A4 (formal, 1 copia por hoja) ─────────────────────────────────── */
function TicketA4({ r, seguimiento, logoUrl }) {
  const est = ESTADO_COLOR[r.estado] ?? ESTADO_COLOR.RECIBIDO;

  return (
    <div id="ticket" style={{ width: '190mm', background: 'white', fontFamily: 'Arial, sans-serif', fontSize: '10px', lineHeight: '1.45', color: '#111' }}>

      {/* ── Cabecera: datos empresa | logo | caja orden ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', lineHeight: '1.2', marginBottom: '4px' }}>{r.empresa_nombre ?? 'MEGAELECTRA'}</div>
          {v(r.empresa_ruc)       && <div><strong>NIT:</strong> {r.empresa_ruc}</div>}
          {v(r.empresa_direccion) && <div><strong>Dirección:</strong> {r.empresa_direccion}</div>}
          {v(r.empresa_telefono)  && <div><strong>Teléfono:</strong> {r.empresa_telefono}</div>}
          {v(r.sucursal_nombre)   && <div><strong>Sucursal:</strong> {r.sucursal_nombre}</div>}
        </div>

        <div style={{ textAlign: 'center' }}>
          {logoUrl && logoUrl !== '/logo.png'
            ? <img src={logoUrl} alt="Logo" style={{ height: '72px', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
            : <div style={{ height: '72px' }} />
          }
        </div>

        <div style={{ border: '1.5px solid #1a1a1a', padding: '8px 12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', textAlign: 'center', textTransform: 'uppercase', borderBottom: '1px solid #1a1a1a', paddingBottom: '4px', marginBottom: '6px' }}>ORDEN DE SERVICIO</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              <tr>
                <td style={{ color: '#555', paddingRight: '10px', whiteSpace: 'nowrap' }}>N°:</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{r.numero}</td>
              </tr>
              <tr>
                <td style={{ color: '#555', paddingRight: '10px' }}>Estado:</td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px', backgroundColor: est.bg, color: est.fg }}>
                    {ESTADO_LABEL[r.estado] ?? r.estado}
                  </span>
                  {r.garantia && (
                    <span style={{ fontSize: '8px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px', backgroundColor: '#dcfce7', color: '#15803d', marginLeft: '4px' }}>Garantía</span>
                  )}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#555', paddingRight: '10px' }}>Recepción:</td>
                <td style={{ textAlign: 'right' }}>{fmtDt(r.fecha_recepcion)}</td>
              </tr>
              {v(r.fecha_estimada_entrega) && (
                <tr>
                  <td style={{ color: '#555', paddingRight: '10px' }}>Entrega est.:</td>
                  <td style={{ textAlign: 'right' }}>{fmt(r.fecha_estimada_entrega)}</td>
                </tr>
              )}
              {v(r.fecha_real_entrega) && (
                <tr>
                  <td style={{ color: '#555', paddingRight: '10px' }}>Entregado:</td>
                  <td style={{ textAlign: 'right' }}>{fmtDt(r.fecha_real_entrega)}</td>
                </tr>
              )}
              {r.prioridad && r.prioridad !== 'NORMAL' && (
                <tr>
                  <td style={{ color: '#555', paddingRight: '10px' }}>Prioridad:</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{r.prioridad}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ borderTop: '1.5px solid #1a1a1a', marginBottom: '8px' }} />

      {/* ── Cliente + Recepción ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '3px' }}>Cliente</div>
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '2px' }}>{r.cliente_nombre}</div>
          {v(r.documento)        && <div style={{ color: '#444' }}>CI/RUC: {r.documento}</div>}
          {v(r.cliente_telefono) && <div style={{ color: '#444' }}>Tel: {r.cliente_telefono}</div>}
          {v(r.cliente_direccion)&& <div style={{ color: '#444' }}>Dir: {r.cliente_direccion}</div>}
        </div>
        <div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '3px' }}>Recepción</div>
          {v(r.usuario_recibe) && <div style={{ color: '#444' }}>Recibido por: {r.usuario_recibe}</div>}
          {fmtM(r.costo_estimado) && <div style={{ color: '#444', fontWeight: 'bold' }}>Costo estimado: {fmtM(r.costo_estimado)}</div>}
        </div>
      </div>

      {/* ── Equipo recibido ── */}
      <div style={{ border: '1px solid #e5e7eb', marginBottom: '8px' }}>
        <div style={{ backgroundColor: '#1c1917', color: '#facc15', padding: '4px 10px', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Equipo recibido</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
              {['Descripción', 'Marca', 'Modelo', 'N° de serie', 'Color'].map((h, i) => (
                <th key={i} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 'bold', fontSize: '8.5px', color: '#4b5563' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '5px 8px' }}>{r.descripcion_producto ?? '—'}</td>
              <td style={{ padding: '5px 8px' }}>{r.marca_producto ?? '—'}</td>
              <td style={{ padding: '5px 8px' }}>{r.modelo_producto ?? '—'}</td>
              <td style={{ padding: '5px 8px', fontFamily: 'Courier, monospace' }}>{r.numero_serie ?? '—'}</td>
              <td style={{ padding: '5px 8px' }}>{r.color_producto ?? '—'}</td>
            </tr>
          </tbody>
        </table>
        {v(r.tipo_servicio) && (
          <div style={{ padding: '6px 8px', borderTop: '1px solid #e5e7eb', fontSize: '9px' }}>
            <strong>Tipo de servicio:</strong> {r.tipo_servicio}
          </div>
        )}
      </div>

      {/* ── Falla reportada ── */}
      <div style={{ border: '1px solid #e5e7eb', marginBottom: '8px' }}>
        <div style={{ backgroundColor: '#1c1917', color: '#facc15', padding: '4px 10px', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Falla reportada por el cliente</div>
        <div style={{ padding: '8px 10px' }}>{r.falla_reportada ?? '—'}</div>
      </div>

      {/* ── Accesorios + Condición ── */}
      {(v(r.accesorios_recibidos) || v(r.condicion_fisica)) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
          {v(r.accesorios_recibidos) && (
            <div style={{ border: '1px solid #e5e7eb', backgroundColor: '#fafafa', padding: '6px 10px' }}>
              <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Accesorios recibidos</div>
              <div>{r.accesorios_recibidos}</div>
            </div>
          )}
          {v(r.condicion_fisica) && (
            <div style={{ border: '1px solid #e5e7eb', backgroundColor: '#fafafa', padding: '6px 10px' }}>
              <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Condición física del equipo</div>
              <div>{r.condicion_fisica}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Técnico externo ── */}
      {v(r.tecnico_nombre) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e5e7eb', backgroundColor: '#fafafa', padding: '7px 10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280' }}>Técnico / taller:</span>
          <span style={{ fontWeight: 'bold', flex: 1 }}>{r.tecnico_nombre}</span>
          {v(r.tecnico_telefono) && <span style={{ color: '#6b7280' }}>Tel: {r.tecnico_telefono}</span>}
          {v(r.fecha_envio_tecnico) && <span style={{ color: '#6b7280' }}>Enviado: {fmt(r.fecha_envio_tecnico)}</span>}
        </div>
      )}

      {/* ── Diagnóstico y reparación ── */}
      {(v(r.diagnostico) || v(r.trabajo_realizado)) && (
        <div style={{ border: '1px solid #e5e7eb', marginBottom: '8px' }}>
          <div style={{ backgroundColor: '#1c1917', color: '#facc15', padding: '4px 10px', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Diagnóstico y reparación</div>
          <div style={{ padding: '8px 10px' }}>
            {v(r.diagnostico) && (
              <div style={{ marginBottom: r.trabajo_realizado ? '8px' : 0 }}>
                <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '3px' }}>Diagnóstico</div>
                <div>{r.diagnostico}</div>
              </div>
            )}
            {v(r.trabajo_realizado) && (
              <div style={{ borderTop: r.diagnostico ? '1px solid #e5e7eb' : 'none', paddingTop: r.diagnostico ? '8px' : 0 }}>
                <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '3px' }}>Trabajo realizado</div>
                <div>{r.trabajo_realizado}</div>
                {v(r.repuestos_usados) && (
                  <div style={{ marginTop: '8px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
                    <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '2px' }}>Repuestos / materiales</div>
                    <div>{r.repuestos_usados}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Historial de estados ── */}
      {(seguimiento ?? []).length > 0 && (
        <div style={{ border: '1px solid #e5e7eb', marginBottom: '8px' }}>
          <div style={{ backgroundColor: '#1c1917', color: '#facc15', padding: '4px 10px', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Historial de estados</div>
          {seguimiento.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '5px 10px', borderTop: i > 0 ? '1px solid #e5e7eb' : 'none' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '4px', backgroundColor: (ESTADO_COLOR[s.estado_nuevo] ?? {}).fg ?? '#facc15', marginTop: '3px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '8px', color: '#9ca3af', minWidth: '82px' }}>{fmtDt(s.fecha)}</span>
                  {s.estado_anterior && <span style={{ fontSize: '8px', color: '#9ca3af' }}>{ESTADO_LABEL[s.estado_anterior] ?? s.estado_anterior} →</span>}
                  <span style={{ fontWeight: 'bold', fontSize: '9px' }}>{ESTADO_LABEL[s.estado_nuevo] ?? s.estado_nuevo}</span>
                </div>
                {v(s.observacion) && <div style={{ fontSize: '9px', color: '#4b5563', marginTop: '2px' }}>{s.observacion}</div>}
                {v(s.usuario_nombre) && <div style={{ fontSize: '8px', color: '#9ca3af', marginTop: '1px' }}>{s.usuario_nombre}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Observaciones generales ── */}
      {v(r.observaciones) && (
        <div style={{ border: '1px solid #e5e7eb', backgroundColor: '#fafafa', padding: '8px 10px', marginBottom: '8px' }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Observaciones generales</div>
          <div style={{ color: '#4b5563', marginTop: '2px' }}>{r.observaciones}</div>
        </div>
      )}

      {/* ── Costo total ── */}
      {fmtM(r.costo_final) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <div style={{ backgroundColor: '#fef9c3', border: '1px solid #fde047', borderRadius: '4px', padding: '8px 18px', textAlign: 'right' }}>
            <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#713f12', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Total del servicio</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#15803d' }}>{fmtM(r.costo_final)}</div>
          </div>
        </div>
      )}

      {/* ── Firmas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '10px' }}>
        {['Firma del cliente', 'Nombre y apellido', 'Firma del responsable'].map((label, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ height: '24px' }} />
            <div style={{ borderTop: '1px solid #888', paddingTop: '4px', fontSize: '9px', color: '#555' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Pie ── */}
      <div style={{ borderTop: '1.5px solid #1a1a1a', paddingTop: '6px', textAlign: 'center', fontSize: '9px', color: '#555' }}>
        <span>Generado el {new Date().toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</span>
        <span style={{ marginLeft: '8px' }}>— {r.empresa_nombre ?? ''}</span>
      </div>
    </div>
  );
}

/* ─── Componentes compartidos ─────────────────────────────────────────────── */
const Divisor = () => <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />;

const Row = ({ label, value, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
    <span style={{ fontWeight: bold ? 'bold' : undefined, whiteSpace: 'nowrap' }}>{label}</span>
    <span style={{ fontWeight: bold ? 'bold' : undefined, textAlign: 'right' }}>{value}</span>
  </div>
);

const Firmas = ({ fontSize = '10px' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '6px', fontSize }}>
    {['Firma cliente', 'Firma responsable'].map(label => (
      <div key={label} style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ borderTop: '1px solid #000', paddingTop: '2px' }}>{label}</div>
      </div>
    ))}
  </div>
);

const Pie = ({ fontSize = '11px' }) => (
  <div style={{ textAlign: 'center', fontSize, marginTop: '4px' }}>
    <div style={{ fontWeight: 'bold' }}>Documento interno de servicio técnico</div>
    <div style={{ marginTop: '2px' }}>Generado el {new Date().toLocaleString('es-BO')}</div>
  </div>
);

/* ─── Página principal ────────────────────────────────────────────────────── */
export default function ServicioTecnicoImprimirDirecto() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [data,      setData]     = useState(null);
  const [cargando,  setCargando] = useState(true);
  const [formato,   setFormato]  = useState('80mm');
  const { logoUrl } = useEmpresa() ?? {};

  useEffect(() => {
    servicioTecnicoService.getRecibo(id)
      .then(res => setData(res.data))
      .catch(() => navigate(`/servicio-tecnico/${id}`))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!data)    return null;

  const { recibo: r, seguimiento = [] } = data;

  return (
    <>
      {/* Barra de acciones */}
      <div className="no-print flex flex-wrap items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <button
          onClick={() => window.print()}
          className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors"
        >
          🖨️ Imprimir
        </button>

        {/* Selector de formato */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-300 dark:border-zinc-600 p-1">
          {['80mm', '110mm', 'A4'].map(f => (
            <button
              key={f}
              onClick={() => setFormato(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                formato === f
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate(`/servicio-tecnico/${id}`)}
          className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
        >
          ← Volver
        </button>
      </div>

      {/* Preview */}
      <div className="flex justify-center p-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        {formato === 'A4'
          ? <TicketA4  r={r} seguimiento={seguimiento} logoUrl={logoUrl} />
          : formato === '110mm'
          ? <Ticket110 r={r} seguimiento={seguimiento} logoUrl={logoUrl} />
          : <Ticket80  r={r} seguimiento={seguimiento} logoUrl={logoUrl} />
        }
      </div>

      {/* CSS de impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          #ticket, #ticket * { visibility: visible !important; }
          html, body, #root {
            height: auto !important;
            overflow: visible !important;
          }
          .overflow-hidden, .overflow-y-auto {
            overflow: visible !important;
          }
          .h-screen {
            height: auto !important;
          }
          .min-h-screen {
            min-height: auto !important;
          }
          ${formato === 'A4' ? `
          #ticket {
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #000 !important;
            width: 186mm !important;
            font-size: 11px !important;
          }
          @page { size: auto; margin: 10mm; }
          ` : `
          #ticket {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            padding: 2mm !important;
            background: white !important;
            color: #000 !important;
          }
          ${formato === '110mm'
            ? `#ticket { width: 102mm !important; font-size: 10px !important; }
               @page { size: 110mm auto; margin: 0; }`
            : `#ticket { width: 72mm !important; font-size: 11px !important; }
               @page { size: 80mm auto; margin: 0; }`
          }
          `}
        }
      `}</style>
    </>
  );
}
