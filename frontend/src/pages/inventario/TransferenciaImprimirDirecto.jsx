import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transferenciasService } from '../../services/transferencias.service';
import { useEmpresa } from '../../contexts/EmpresaContext';

const fmtN        = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtFecha     = s => s ? new Date(s).toLocaleString('es-BO') : '—';
const fmtFechaCorta = s => s ? new Date(s).toLocaleDateString('es-BO') : '—';
const nombreCompleto = (n, a) => [n, a].filter(Boolean).join(' ') || '—';

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

const specLinea = d => [d.marca && `Marca: ${d.marca}`, d.modelo && `Mod: ${d.modelo}`, d.color && `Color: ${d.color}`, d.capacidad && `Cap: ${d.capacidad}`].filter(Boolean).join('  ·  ');

const sumarTotales = (detalle = []) => detalle.reduce((acc, d) => ({
  enviada:  acc.enviada  + Number(d.cantidad_enviada  ?? 0),
  recibida: acc.recibida + Number(d.cantidad_recibida ?? 0),
}), { enviada: 0, recibida: 0 });

const PRODUCTOS_POR_HOJA_A4 = 3;
const chunkArray = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out.length ? out : [[]];
};

/* ─── Ticket 80mm (portrait) ──────────────────────────────────────────────── */
function Ticket80({ t, detalle, empresa: e, logoUrl }) {
  return (
    <div
      id="ticket"
      style={{ width: '80mm', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5', background: 'white', color: '#000', padding: '4mm' }}
    >
      {/* Empresa */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
        {logoUrl && logoUrl !== '/logo.png' && (
          <img src={logoUrl} alt="Logo" style={{ height: '80px', width: '112px', objectFit: 'contain', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: '1.3', wordBreak: 'break-word' }}>{e?.nombre_comercial || e?.razon_social || 'MEGAELECTRA'}</div>
          {e?.nit       && <div style={{ fontSize: '10px', marginTop: '3px' }}><span style={{ fontWeight: 'bold' }}>NIT:</span> {e.nit}</div>}
          {e?.direccion && <div style={{ fontSize: '10px' }}><span style={{ fontWeight: 'bold' }}>Dir:</span> {e.direccion}</div>}
          {e?.telefono  && <div style={{ fontSize: '10px' }}><span style={{ fontWeight: 'bold' }}>Tel:</span> {e.telefono}</div>}
        </div>
      </div>

      <Divisor />

      {/* Info transferencia */}
      <div style={{ marginBottom: '4px' }}>
        <Row label="NOTA TRANSF." value={t.numero} bold />
        <Row label="Estado:" value={ESTADO_LABEL[t.estado] ?? t.estado} bold />
        <Row label="Solicitud:" value={fmtFecha(t.fecha_solicitud)} />
        {t.fecha_envio && <Row label="Envío:" value={fmtFecha(t.fecha_envio)} />}
        {t.fecha_recepcion && <Row label="Recepción:" value={fmtFecha(t.fecha_recepcion)} />}
      </div>

      <Divisor />

      {/* Origen → Destino */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontWeight: 'bold' }}>ORIGEN · {t.deposito_origen_codigo}</div>
        <div>{t.deposito_origen_nombre}</div>
        <div style={{ textAlign: 'center', margin: '2px 0' }}>↓</div>
        <div style={{ fontWeight: 'bold' }}>DESTINO · {t.deposito_destino_codigo}</div>
        <div>{t.deposito_destino_nombre}</div>
      </div>

      <Divisor />

      {/* Solicita / Envía / Recibe */}
      <div style={{ marginBottom: '4px' }}>
        <Row label="Solicita:" value={nombreCompleto(t.solicita_nombres, t.solicita_apellidos)} bold />
        <Row label="Envía:" value={nombreCompleto(t.envia_nombres, t.envia_apellidos)} />
        <Row label="Recibe:" value={nombreCompleto(t.recibe_nombres, t.recibe_apellidos)} />
      </div>

      <Divisor />

      {/* Detalle */}
      <DetalleProductos detalle={detalle} />

      <Divisor />
      <TotalesEnvRec detalle={detalle} />

      <ObservacionesTicket t={t} fontSize="10px" />

      <Divisor />
      <Pie />
    </div>
  );
}

/* ─── Ticket 110mm (horizontal / ancho) ───────────────────────────────────── */
function Ticket110({ t, detalle, empresa: e, logoUrl }) {
  return (
    <div
      id="ticket"
      style={{ width: '110mm', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.45', background: 'white', color: '#000', padding: '4mm' }}
    >
      {/* ── Cabecera: Logo+Empresa | Info transferencia ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '5px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
          {logoUrl && logoUrl !== '/logo.png' && (
            <img src={logoUrl} alt="Logo" style={{ height: '64px', width: '90px', objectFit: 'contain', flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', lineHeight: '1.3', wordBreak: 'break-word' }}>{e?.nombre_comercial || e?.razon_social || 'MEGAELECTRA'}</div>
            {e?.nit       && <div style={{ fontSize: '9px', marginTop: '2px' }}><span style={{ fontWeight: 'bold' }}>NIT:</span> {e.nit}</div>}
            {e?.direccion && <div style={{ fontSize: '9px' }}><span style={{ fontWeight: 'bold' }}>Dir:</span> {e.direccion}</div>}
            {e?.telefono  && <div style={{ fontSize: '9px' }}><span style={{ fontWeight: 'bold' }}>Tel:</span> {e.telefono}</div>}
          </div>
        </div>

        <div style={{ borderLeft: '1px dashed #999', paddingLeft: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center', marginBottom: '3px', letterSpacing: '0.5px' }}>NOTA DE TRANSFERENCIA</div>
          <Row label="N°:" value={t.numero} />
          <Row label="Estado:" value={ESTADO_LABEL[t.estado] ?? t.estado} bold />
          <Row label="Solicitud:" value={fmtFechaCorta(t.fecha_solicitud)} />
          {t.fecha_envio && <Row label="Envío:" value={fmtFechaCorta(t.fecha_envio)} />}
          {t.fecha_recepcion && <Row label="Recepción:" value={fmtFechaCorta(t.fecha_recepcion)} />}
        </div>
      </div>

      <Divisor />

      {/* ── Origen → Destino ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <div style={{ flex: 1, padding: '4px 6px', border: '1px dashed #b45309', backgroundColor: '#fffbeb' }}>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#b45309' }}>ORIGEN · {t.deposito_origen_codigo}</div>
          <div style={{ fontSize: '8px', color: '#b45309' }}>{t.deposito_origen_nombre}</div>
        </div>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>→</span>
        <div style={{ flex: 1, padding: '4px 6px', border: '1px dashed #1d4ed8', backgroundColor: '#eff6ff' }}>
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#1d4ed8' }}>DESTINO · {t.deposito_destino_codigo}</div>
          <div style={{ fontSize: '8px', color: '#1d4ed8' }}>{t.deposito_destino_nombre}</div>
        </div>
      </div>

      {/* ── Solicita / Envía / Recibe ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '4px' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '9px', marginBottom: '2px' }}>SOLICITA</div>
          <div style={{ fontSize: '9px' }}>{nombreCompleto(t.solicita_nombres, t.solicita_apellidos)}</div>
        </div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '9px', marginBottom: '2px' }}>ENVÍA</div>
          <div style={{ fontSize: '9px' }}>{nombreCompleto(t.envia_nombres, t.envia_apellidos)}</div>
        </div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '9px', marginBottom: '2px' }}>RECIBE</div>
          <div style={{ fontSize: '9px' }}>{nombreCompleto(t.recibe_nombres, t.recibe_apellidos)}</div>
        </div>
      </div>

      <Divisor />

      {/* ── Detalle de productos — tabla ancha ── */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '10px', letterSpacing: '0.5px', marginBottom: '4px' }}>DETALLE DE PRODUCTOS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '18mm 1fr 14mm 16mm 16mm 16mm', gap: '0 3px', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '3px' }}>
          {['Código', 'Descripción', 'U.M.', 'Enviada', 'Recibida', 'Pendiente'].map((h, i) => (
            <span key={i} style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>
        {detalle.map((d, i) => {
          const pendiente = Number(d.cantidad_enviada ?? 0) - Number(d.cantidad_recibida ?? 0);
          const spec = specLinea(d);
          return (
            <div key={d.id_detalle} style={{ marginBottom: '3px', borderBottom: i < detalle.length - 1 ? '1px dotted #ccc' : 'none', paddingBottom: '3px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '18mm 1fr 14mm 16mm 16mm 16mm', gap: '0 3px', alignItems: 'start' }}>
                <span style={{ fontSize: '7px', fontFamily: 'monospace', color: '#666' }}>{d.codigo_interno}</span>
                <span style={{ fontSize: '9px', fontWeight: 'bold', wordBreak: 'break-word', lineHeight: '1.3' }}>{d.producto_nombre}</span>
                <span style={{ fontSize: '8px', color: '#9ca3af' }}>{d.unidad_nombre}</span>
                <span style={{ fontSize: '9px', textAlign: 'right' }}>{fmtN(d.cantidad_enviada)}</span>
                <span style={{ fontSize: '9px', textAlign: 'right', color: '#15803d' }}>{fmtN(d.cantidad_recibida)}</span>
                <span style={{ fontSize: '9px', textAlign: 'right', color: pendiente > 0 ? '#c2410c' : '#9ca3af' }}>{fmtN(pendiente)}</span>
              </div>
              {d.producto_detalle && (
                <div style={{ fontSize: '8px', color: '#555', paddingLeft: '20mm' }}>{d.producto_detalle}</div>
              )}
              {spec && (
                <div style={{ fontSize: '8px', color: '#666', paddingLeft: '20mm' }}>{spec}</div>
              )}
            </div>
          );
        })}
      </div>

      <Divisor />
      <TotalesEnvRec detalle={detalle} fontSize="9px" />

      <ObservacionesTicket t={t} fontSize="9px" />

      <Divisor />
      <Pie fontSize="9px" />
    </div>
  );
}

/* ─── Ticket A4 (formal, 2 copias por hoja — mismo diseño que VentaImprimir) ──
   Si hay muchos productos, se pagina en hojas de PRODUCTOS_POR_HOJA_A4 ítems,
   cada hoja repite la cabecera completa (mismo número de transferencia) y
   muestra los totales de esa hoja — no crea transferencias nuevas. */
function TicketA4({ t, detalle, empresa: e, logoUrl }) {
  const est     = ESTADO_COLOR[t.estado] ?? ESTADO_COLOR.ANULADA;
  const paginas = chunkArray(detalle, PRODUCTOS_POR_HOJA_A4);

  const renderCopia = (detalleHoja, pagina, totalPaginas) => (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', lineHeight: '1.45', color: '#111' }}>

      {/* Franja superior */}
      <div style={{ height: '3px', background: '#1a1a1a', marginBottom: '10px' }} />

      {/* ── Cabecera: datos empresa | logo | caja documento ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>

        <div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', lineHeight: '1.2', marginBottom: '4px' }}>{e?.nombre_comercial || e?.razon_social || 'MEGAELECTRA'}</div>
          {e?.nit       && <div><strong>NIT:</strong> {e.nit}</div>}
          {e?.direccion && <div><strong>Dirección:</strong> {e.direccion}</div>}
          {e?.telefono  && <div><strong>Teléfono:</strong> {e.telefono}</div>}
        </div>

        <div style={{ textAlign: 'center' }}>
          {logoUrl && logoUrl !== '/logo.png'
            ? <img src={logoUrl} alt="Logo" style={{ height: '72px', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
            : <div style={{ height: '72px' }} />
          }
        </div>

        <div style={{ border: '1.5px solid #1a1a1a', padding: '8px 12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', textAlign: 'center', textTransform: 'uppercase', borderBottom: '1px solid #1a1a1a', paddingBottom: '4px', marginBottom: '6px' }}>NOTA DE TRANSFERENCIA</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              <tr>
                <td style={{ color: '#555', paddingRight: '10px', whiteSpace: 'nowrap' }}>N°:</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{t.numero}</td>
              </tr>
              {totalPaginas > 1 && (
                <tr>
                  <td style={{ color: '#555', paddingRight: '10px' }}>Página:</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{pagina} de {totalPaginas}</td>
                </tr>
              )}
              <tr>
                <td style={{ color: '#555', paddingRight: '10px' }}>Estado:</td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '3px', backgroundColor: est.bg, color: est.fg }}>
                    {ESTADO_LABEL[t.estado] ?? t.estado}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ color: '#555', paddingRight: '10px' }}>Solicitud:</td>
                <td style={{ textAlign: 'right' }}>{fmtFecha(t.fecha_solicitud)}</td>
              </tr>
              {t.fecha_envio && (
                <tr>
                  <td style={{ color: '#555', paddingRight: '10px' }}>Envío:</td>
                  <td style={{ textAlign: 'right' }}>{fmtFecha(t.fecha_envio)}</td>
                </tr>
              )}
              {t.fecha_recepcion && (
                <tr>
                  <td style={{ color: '#555', paddingRight: '10px' }}>Recepción:</td>
                  <td style={{ textAlign: 'right' }}>{fmtFecha(t.fecha_recepcion)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ borderTop: '1.5px solid #1a1a1a', marginBottom: '8px' }} />

      {/* ── Origen/Destino + Solicita/Envía/Recibe ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '3px' }}>Origen → Destino</div>
          <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{t.deposito_origen_codigo} — {t.deposito_origen_nombre}</div>
          <div style={{ fontSize: '9px', color: '#444', margin: '2px 0' }}>↓</div>
          <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{t.deposito_destino_codigo} — {t.deposito_destino_nombre}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '3px' }}>Solicita</div>
            <div style={{ fontSize: '9px', fontWeight: 'bold' }}>{nombreCompleto(t.solicita_nombres, t.solicita_apellidos)}</div>
          </div>
          <div>
            <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '3px' }}>Envía</div>
            <div style={{ fontSize: '9px', fontWeight: 'bold' }}>{nombreCompleto(t.envia_nombres, t.envia_apellidos)}</div>
          </div>
          <div>
            <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '3px' }}>Recibe</div>
            <div style={{ fontSize: '9px', fontWeight: 'bold' }}>{nombreCompleto(t.recibe_nombres, t.recibe_apellidos)}</div>
          </div>
        </div>
      </div>

      {/* ── Tabla de productos ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '10px' }}>
        <thead>
          <tr style={{ borderTop: '1px solid #1a1a1a', borderBottom: '1.5px solid #1a1a1a' }}>
            {['Código', 'Producto', 'U.M.', 'Enviada', 'Recibida', 'Pendiente'].map((h, i) => (
              <th key={i} style={{ padding: '4px 6px', textAlign: i >= 3 ? 'right' : 'left', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {detalleHoja.map((d) => {
            const pendiente = Number(d.cantidad_enviada ?? 0) - Number(d.cantidad_recibida ?? 0);
            const spec = specLinea(d);
            return (
              <tr key={d.id_detalle} style={{ borderBottom: '1px solid #ebebeb' }}>
                <td style={{ padding: '4px 6px', verticalAlign: 'top', fontSize: '8px', fontFamily: 'Courier, monospace', color: '#666' }}>{d.codigo_interno}</td>
                <td style={{ padding: '4px 6px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 'bold' }}>{d.producto_nombre}</div>
                  {d.producto_detalle && (
                    <div style={{ fontSize: '8px', color: '#555', marginTop: '1px' }}>{d.producto_detalle}</div>
                  )}
                  {spec && (
                    <div style={{ fontSize: '8px', color: '#666', marginTop: '1px' }}>{spec}</div>
                  )}
                </td>
                <td style={{ padding: '4px 6px', textAlign: 'left', verticalAlign: 'top', fontSize: '8px', color: '#9ca3af' }}>{d.unidad_nombre}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{fmtN(d.cantidad_enviada)}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold', whiteSpace: 'nowrap', color: '#15803d' }}>{fmtN(d.cantidad_recibida)}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', color: pendiente > 0 ? '#c2410c' : '#9ca3af' }}>{fmtN(pendiente)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Observaciones (izquierda) + Totales (derecha), a la misma altura ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start', marginBottom: '12px' }}>

        <div style={{ fontSize: '10px' }}>
          <ObservacionesTicket t={t} tituloSolo />
        </div>

        <table style={{ borderCollapse: 'collapse', minWidth: '70mm', fontSize: '10px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2px 8px', color: '#555' }}>Total enviado{totalPaginas > 1 ? ' (esta hoja)' : ''}:</td>
              <td style={{ padding: '2px 8px', textAlign: 'right' }}>{fmtN(sumarTotales(detalleHoja).enviada)}</td>
            </tr>
            <tr style={{ borderTop: '1.5px solid #1a1a1a' }}>
              <td style={{ padding: '5px 8px', fontWeight: 'bold', fontSize: '12px' }}>TOTAL RECIBIDO{totalPaginas > 1 ? ' (ESTA HOJA)' : ''}:</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>{fmtN(sumarTotales(detalleHoja).recibida)}</td>
            </tr>
            {totalPaginas > 1 && (
              <tr>
                <td style={{ padding: '4px 8px 0', color: '#777', fontSize: '8px' }} colSpan={2}>
                  Total general enviado: {fmtN(sumarTotales(detalle).enviada)} · recibido: {fmtN(sumarTotales(detalle).recibida)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Firmas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '10px' }}>
        {[
          ['Solicitado por', nombreCompleto(t.solicita_nombres, t.solicita_apellidos)],
          ['Enviado por',    nombreCompleto(t.envia_nombres, t.envia_apellidos)],
          ['Recibido por',   nombreCompleto(t.recibe_nombres, t.recibe_apellidos)],
        ].map(([label, nom], i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ height: '24px' }} />
            <div style={{ borderTop: '1px solid #888', paddingTop: '4px', fontSize: '9px', color: '#555' }}>{label}</div>
            <div style={{ fontSize: '8px', color: '#111827', marginTop: '2px' }}>{nom}</div>
          </div>
        ))}
      </div>

      {/* ── Pie ── */}
      <div style={{ borderTop: '1.5px solid #1a1a1a', paddingTop: '6px', textAlign: 'center', fontSize: '9px', color: '#555' }}>
        <span>Generado el {new Date().toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</span>
        <span style={{ marginLeft: '8px' }}>— {e?.razon_social ?? ''}</span>
      </div>
    </div>
  );

  return (
    <div id="ticket" style={{ width: '190mm', background: 'white' }}>
      {paginas.map((detalleHoja, i) => (
        <div key={i} className="tf-hoja" style={{ pageBreakAfter: i < paginas.length - 1 ? 'always' : 'auto' }}>
          {renderCopia(detalleHoja, i + 1, paginas.length)}

          {/* Línea de corte */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10mm 0' }}>
            <div style={{ flex: 1, borderTop: '1px dashed #bbb' }} />
            <span style={{ fontSize: '9px', color: '#bbb', letterSpacing: '2px', whiteSpace: 'nowrap', userSelect: 'none' }}>✂ &nbsp; CORTAR AQUÍ &nbsp; ✂</span>
            <div style={{ flex: 1, borderTop: '1px dashed #bbb' }} />
          </div>

          {renderCopia(detalleHoja, i + 1, paginas.length)}
        </div>
      ))}
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

const TotalesEnvRec = ({ detalle, fontSize = '10px' }) => {
  const totales = sumarTotales(detalle);
  return (
    <div style={{ fontSize }}>
      <Row label="Total enviado:" value={fmtN(totales.enviada)} />
      <Row label="TOTAL RECIBIDO:" value={fmtN(totales.recibida)} bold />
    </div>
  );
};

const ObservacionesTicket = ({ t, fontSize = '10px', tituloSolo = false }) => {
  const items = [
    ['Observaciones (solicitud)',  t.observaciones],
    ['Observaciones (envío)',      t.observaciones_envio],
    ['Observaciones (recepción)',  t.observaciones_recepcion],
  ].filter(([, v]) => v);
  if (!items.length) return null;
  return (
    <>
      {!tituloSolo && <Divisor />}
      <div style={{ fontSize }}>
        {items.map(([label, val], i) => (
          <div key={label} style={{ marginTop: i > 0 ? '4px' : 0 }}>
            <div style={{ fontWeight: 'bold' }}>{label.toUpperCase()}:</div>
            <div>{val}</div>
          </div>
        ))}
      </div>
    </>
  );
};

const Pie = ({ fontSize = '11px' }) => (
  <div style={{ textAlign: 'center', fontSize, marginTop: '4px' }}>
    <div style={{ fontWeight: 'bold' }}>Documento interno de control de stock</div>
    <div style={{ marginTop: '2px' }}>Generado el {new Date().toLocaleString('es-BO')}</div>
  </div>
);

const DetalleProductos = ({ detalle }) => (
  <div style={{ marginBottom: '4px' }}>
    <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px', letterSpacing: '0.5px' }}>DETALLE</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 16mm 16mm', gap: '0 2px', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '2px' }}>
      {['Descripción', 'Enviada', 'Recibida'].map((h, i) => (
        <span key={i} style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: i > 0 ? 'center' : 'left' }}>{h}</span>
      ))}
    </div>
    {detalle.map((d, i) => {
      const pendiente = Number(d.cantidad_enviada ?? 0) - Number(d.cantidad_recibida ?? 0);
      const spec = specLinea(d);
      return (
        <div key={d.id_detalle} style={{ marginBottom: '5px', borderBottom: i < detalle.length - 1 ? '1px dotted #ccc' : 'none', paddingBottom: '3px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 16mm 16mm', gap: '0 2px', alignItems: 'start' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', wordBreak: 'break-word', lineHeight: '1.3' }}>{d.producto_nombre}</span>
            <span style={{ fontSize: '10px', textAlign: 'center' }}>{fmtN(d.cantidad_enviada)}</span>
            <span style={{ fontSize: '10px', textAlign: 'center', color: '#15803d' }}>{fmtN(d.cantidad_recibida)}</span>
          </div>
          {d.producto_detalle && (
            <div style={{ fontSize: '9px', color: '#333', paddingLeft: '2px', marginTop: '1px' }}>{d.producto_detalle}</div>
          )}
          <div style={{ fontSize: '9px', color: '#444', paddingLeft: '2px' }}>
            Cod: {d.codigo_interno} · UM: {d.unidad_nombre}
            {pendiente > 0 && <span style={{ color: '#c2410c' }}> · Pend: {fmtN(pendiente)}</span>}
          </div>
          {spec && (
            <div style={{ fontSize: '9px', color: '#444', paddingLeft: '2px' }}>{spec}</div>
          )}
        </div>
      );
    })}
  </div>
);

/* ─── Página principal ────────────────────────────────────────────────────── */
export default function TransferenciaImprimirDirecto() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [data,      setData]     = useState(null);
  const [cargando,  setCargando] = useState(true);
  const [formato,   setFormato]  = useState('80mm');
  const { empresa, logoUrl } = useEmpresa() ?? {};

  useEffect(() => {
    transferenciasService.getOne(id)
      .then(r => setData(r.data))
      .catch(() => navigate(`/inventario/transferencias/${id}`))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!data)    return null;

  const { detalle, ...transferencia } = data;

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
          onClick={() => navigate(`/inventario/transferencias/${id}`)}
          className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
        >
          ← Volver
        </button>
      </div>

      {/* Preview */}
      <div className="flex justify-center p-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        {formato === 'A4'
          ? <TicketA4  t={transferencia} detalle={detalle ?? []} empresa={empresa} logoUrl={logoUrl} />
          : formato === '110mm'
          ? <Ticket110 t={transferencia} detalle={detalle ?? []} empresa={empresa} logoUrl={logoUrl} />
          : <Ticket80  t={transferencia} detalle={detalle ?? []} empresa={empresa} logoUrl={logoUrl} />
        }
      </div>

      {/* CSS de impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          #ticket, #ticket * { visibility: visible !important; }
          ${formato === 'A4' ? `
          #ticket {
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #000 !important;
            width: 190mm !important;
            font-size: 11px !important;
          }
          @page { size: auto; margin: 14mm; }
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
