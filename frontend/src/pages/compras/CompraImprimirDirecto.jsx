import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { comprasService } from '../../services/compras.service';
import { useEmpresa } from '../../contexts/EmpresaContext';

const fmt   = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN  = n => Number(n ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 4 });
const fecha = s => s ? new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fechaCorta = s => s ? new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('es-BO') : '—';
const fechaHora = s => s ? new Date(s).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const ESTADO_COLOR = {
  PRE_PEDIDO: { bg: '#f4f4f5', fg: '#52525b' },
  CONFIRMADO: { bg: '#eef2ff', fg: '#4338ca' },
  POR_LLEGAR: { bg: '#dbeafe', fg: '#1d4ed8' },
  PARCIAL:    { bg: '#fffbeb', fg: '#b45309' },
  RECIBIDO:   { bg: '#dcfce7', fg: '#15803d' },
  ANULADO:    { bg: '#fee2e2', fg: '#b91c1c' },
};
const ESTADO_LABEL = {
  PRE_PEDIDO: 'Pre-Pedido', CONFIRMADO: 'Confirmado', POR_LLEGAR: 'Por Llegar',
  PARCIAL: 'Parcial', RECIBIDO: 'Recibido', ANULADO: 'Anulado',
};

const specLinea = d => [d.modelo && `Mod: ${d.modelo}`, d.color && `Color: ${d.color}`, d.capacidad && `Cap: ${d.capacidad}`].filter(Boolean).join('  ·  ');
const pendienteDe = d => +(Number(d.cantidad) - Number(d.cantidad_recibida ?? 0)).toFixed(4);
const sumarPendiente = (detalle = []) => detalle.reduce((s, d) => s + pendienteDe(d), 0);

const PRODUCTOS_POR_HOJA_A4 = 8;
const chunkArray = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out.length ? out : [[]];
};

/* ─── Ticket 80mm (portrait) ──────────────────────────────────────────────── */
function Ticket80({ c, detalle, pagos, recepciones, empresa: e, logoUrl, fmtM }) {
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

      {/* Info compra */}
      <div style={{ marginBottom: '4px' }}>
        <Row label="ORDEN DE COMPRA" value={c.numero} bold />
        <Row label="Estado:" value={ESTADO_LABEL[c.estado] ?? c.estado} bold />
        {c.numero_factura && <Row label="Factura:" value={c.numero_factura} />}
        <Row label="Fecha pedido:" value={fecha(c.fecha_pedido)} />
        {c.fecha_estim_llegada && <Row label="Est. llegada:" value={fecha(c.fecha_estim_llegada)} />}
        {c.fecha_recepcion && <Row label="Recepción:" value={fecha(c.fecha_recepcion)} />}
      </div>

      <Divisor />

      {/* Proveedor */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontWeight: 'bold' }}>PROVEEDOR</div>
        <div style={{ fontWeight: 'bold' }}>{c.proveedor_nombre}</div>
        {c.proveedor_codigo   && <div>Cód: {c.proveedor_codigo}</div>}
        {c.proveedor_telefono && <div>Tel: {c.proveedor_telefono}</div>}
        <div style={{ marginTop: '2px' }}>Destino: {c.sucursal_nombre}</div>
        <div>Depósito: {c.deposito_nombre}</div>
      </div>

      <Divisor />

      {/* Detalle */}
      <DetalleProductos detalle={detalle} fmtM={fmtM} />

      <Divisor />
      <Totales c={c} fmtM={fmtM} />
      <PagosProveedor c={c} pagos={pagos} fmtM={fmtM} />

      {c.observaciones && (
        <>
          <Divisor />
          <div style={{ fontSize: '10px' }}>
            <div style={{ fontWeight: 'bold' }}>OBSERVACIONES:</div>
            <div>{c.observaciones}</div>
          </div>
        </>
      )}

      {recepciones?.length > 0 && (
        <>
          <Divisor />
          <HistorialRecepciones recepciones={recepciones} fontSize="10px" />
        </>
      )}

      <Divisor />
      <Pie e={e} />
    </div>
  );
}

/* ─── Ticket 110mm (horizontal / ancho) ───────────────────────────────────── */
function Ticket110({ c, detalle, pagos, recepciones, empresa: e, logoUrl, fmtM }) {
  return (
    <div
      id="ticket"
      style={{ width: '110mm', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.45', background: 'white', color: '#000', padding: '4mm' }}
    >
      {/* ── Cabecera: Logo+Empresa | Info orden ── */}
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
          <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center', marginBottom: '3px', letterSpacing: '0.5px' }}>ORDEN DE COMPRA</div>
          <Row label="N°:" value={c.numero} />
          <Row label="Estado:" value={ESTADO_LABEL[c.estado] ?? c.estado} bold />
          {c.numero_factura && <Row label="Factura:" value={c.numero_factura} />}
          <Row label="Pedido:" value={fechaCorta(c.fecha_pedido)} />
          {c.fecha_estim_llegada && <Row label="Est. llegada:" value={fechaCorta(c.fecha_estim_llegada)} />}
          {c.fecha_recepcion && <Row label="Recepción:" value={fechaCorta(c.fecha_recepcion)} />}
        </div>
      </div>

      <Divisor />

      {/* ── Proveedor | Destino ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>PROVEEDOR</div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', wordBreak: 'break-word' }}>{c.proveedor_nombre}</div>
          {c.proveedor_codigo   && <div style={{ fontSize: '9px' }}>Cód: {c.proveedor_codigo}</div>}
          {c.proveedor_telefono && <div style={{ fontSize: '9px' }}>Tel: {c.proveedor_telefono}</div>}
        </div>
        <div style={{ borderLeft: '1px dashed #999', paddingLeft: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>DESTINO</div>
          <div style={{ fontSize: '10px' }}>{c.sucursal_nombre}</div>
          <div style={{ fontSize: '9px' }}>Depósito: {c.deposito_nombre}</div>
          <div style={{ fontSize: '9px' }}>{c.condicion_pago === 'CREDITO' ? `Crédito (${c.dias_credito} días)` : 'Contado'} · {c.moneda_codigo}</div>
        </div>
      </div>

      <Divisor />

      {/* ── Detalle de productos — tabla ancha ── */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '10px', letterSpacing: '0.5px', marginBottom: '4px' }}>DETALLE DE PRODUCTOS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '14mm 1fr 10mm 10mm 16mm 20mm', gap: '0 3px', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '3px' }}>
          {['Código', 'Descripción', 'Cant.', 'Pend.', 'P.Unit', 'Subtotal'].map((h, i) => (
            <span key={i} style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>
        {detalle.map((d, i) => {
          const spec = specLinea(d);
          const pend = pendienteDe(d);
          return (
            <div key={d.id_detalle} style={{ marginBottom: '3px', borderBottom: i < detalle.length - 1 ? '1px dotted #ccc' : 'none', paddingBottom: '3px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '14mm 1fr 10mm 10mm 16mm 20mm', gap: '0 3px', alignItems: 'start' }}>
                <span style={{ fontSize: '7px', fontFamily: 'monospace', color: '#666' }}>{d.codigo_interno}</span>
                <span style={{ fontSize: '9px', fontWeight: 'bold', wordBreak: 'break-word', lineHeight: '1.3' }}>{d.producto}</span>
                <span style={{ fontSize: '9px', textAlign: 'right' }}>{fmtN(d.cantidad)}</span>
                <span style={{ fontSize: '9px', textAlign: 'right', color: pend > 0 ? '#b45309' : '#15803d', fontWeight: 'bold' }}>{fmtN(pend)}</span>
                <span style={{ fontSize: '9px', textAlign: 'right' }}>{fmtM(d.precio_unitario)}</span>
                <span style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'right' }}>{fmtM(d.subtotal)}</span>
              </div>
              {d.marca_nombre && (
                <div style={{ fontSize: '8px', color: '#555', paddingLeft: '14mm' }}>Marca: {d.marca_nombre}</div>
              )}
              {d.producto_detalle && (
                <div style={{ fontSize: '8px', color: '#555', paddingLeft: '14mm' }}>{d.producto_detalle}</div>
              )}
              {spec && (
                <div style={{ fontSize: '8px', color: '#666', paddingLeft: '14mm' }}>{spec}</div>
              )}
            </div>
          );
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '3px', marginTop: '2px' }}>
          <span>TOTAL PENDIENTE:</span>
          <span>{fmtN(sumarPendiente(detalle))}</span>
        </div>
      </div>

      <Divisor />
      <Totales c={c} fmtM={fmtM} fontSize="9px" />
      <PagosProveedor c={c} pagos={pagos} fmtM={fmtM} fontSize="9px" />

      {c.observaciones && (
        <>
          <Divisor />
          <div style={{ fontSize: '9px' }}>
            <div style={{ fontWeight: 'bold' }}>OBSERVACIONES:</div>
            <div>{c.observaciones}</div>
          </div>
        </>
      )}

      {recepciones?.length > 0 && (
        <>
          <Divisor />
          <HistorialRecepciones recepciones={recepciones} fontSize="9px" />
        </>
      )}

      <Divisor />
      <Pie e={e} fontSize="9px" />
    </div>
  );
}

/* ─── Ticket A4 (formal, 2 copias por hoja — mismo diseño que VentaImprimir) ──
   Si hay muchos productos, se pagina en hojas de PRODUCTOS_POR_HOJA_A4 ítems,
   cada hoja repite la cabecera completa (mismo número de compra) — no crea
   compras nuevas, solo reparte el detalle de productos entre hojas. */
function TicketA4({ c, detalle, cuotas, pagos, recepciones, empresa: e, logoUrl, fmtM }) {
  const est = ESTADO_COLOR[c.estado] ?? ESTADO_COLOR.ANULADO;
  const paginas = chunkArray(detalle, PRODUCTOS_POR_HOJA_A4);

  const renderCopia = (detalleHoja, pagina, totalPaginas) => (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', lineHeight: '1.45', color: '#111' }}>

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
          <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', textAlign: 'center', textTransform: 'uppercase', borderBottom: '1px solid #1a1a1a', paddingBottom: '4px', marginBottom: '6px' }}>ORDEN DE COMPRA</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              <tr>
                <td style={{ color: '#555', paddingRight: '10px', whiteSpace: 'nowrap' }}>N°:</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{c.numero}</td>
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
                    {ESTADO_LABEL[c.estado] ?? c.estado}
                  </span>
                </td>
              </tr>
              {c.numero_factura && (
                <tr>
                  <td style={{ color: '#555', paddingRight: '10px' }}>Factura:</td>
                  <td style={{ textAlign: 'right' }}>{c.numero_factura}</td>
                </tr>
              )}
              <tr>
                <td style={{ color: '#555', paddingRight: '10px' }}>Pedido:</td>
                <td style={{ textAlign: 'right' }}>{fecha(c.fecha_pedido)}</td>
              </tr>
              {c.fecha_estim_llegada && (
                <tr>
                  <td style={{ color: '#555', paddingRight: '10px' }}>Est. llegada:</td>
                  <td style={{ textAlign: 'right' }}>{fecha(c.fecha_estim_llegada)}</td>
                </tr>
              )}
              {c.fecha_recepcion && (
                <tr>
                  <td style={{ color: '#555', paddingRight: '10px' }}>Recepción:</td>
                  <td style={{ textAlign: 'right' }}>{fecha(c.fecha_recepcion)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ borderTop: '1.5px solid #1a1a1a', marginBottom: '8px' }} />

      {/* ── Proveedor + Destino/Pago ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '3px' }}>Proveedor</div>
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '2px' }}>{c.proveedor_nombre}</div>
          {c.proveedor_codigo   && <div style={{ color: '#444' }}>Cód: {c.proveedor_codigo}</div>}
          {c.proveedor_telefono && <div style={{ color: '#444' }}>Tel: {c.proveedor_telefono}</div>}
        </div>
        <div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '3px' }}>Destino / Condición</div>
          <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{c.sucursal_nombre}</div>
          <div style={{ color: '#444' }}>Depósito: {c.deposito_nombre}</div>
          <div style={{ color: '#444' }}>
            {c.condicion_pago === 'CREDITO' ? `Crédito — ${c.dias_credito} días` : 'Contado'} · Moneda: {c.moneda_codigo}
            {Number(c.tipo_cambio) !== 1 && ` · T.C.: ${c.tipo_cambio}`}
          </div>
        </div>
      </div>

      {/* ── Tabla de productos ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '10px' }}>
        <thead>
          <tr style={{ borderTop: '1px solid #1a1a1a', borderBottom: '1.5px solid #1a1a1a' }}>
            {['Código', 'Producto', 'Cant.', 'U.M.', 'Pendiente', 'P. Unit.', 'Subtotal'].map((h, i) => (
              <th key={i} style={{ padding: '4px 6px', textAlign: i >= 2 ? 'right' : 'left', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {detalleHoja.map((d) => {
            const spec = specLinea(d);
            const pend = pendienteDe(d);
            return (
              <tr key={d.id_detalle} style={{ borderBottom: '1px solid #ebebeb' }}>
                <td style={{ padding: '4px 6px', verticalAlign: 'top', fontSize: '8px', fontFamily: 'Courier, monospace', color: '#666' }}>{d.codigo_interno}</td>
                <td style={{ padding: '4px 6px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 'bold' }}>{d.producto}</div>
                  {d.marca_nombre && (
                    <div style={{ fontSize: '8px', color: '#666', marginTop: '1px' }}>Marca: {d.marca_nombre}</div>
                  )}
                  {d.producto_detalle && (
                    <div style={{ fontSize: '8px', color: '#555', marginTop: '1px' }}>{d.producto_detalle}</div>
                  )}
                  {spec && (
                    <div style={{ fontSize: '8px', color: '#666', marginTop: '1px' }}>{spec}</div>
                  )}
                </td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{fmtN(d.cantidad)}</td>
                <td style={{ padding: '4px 6px', textAlign: 'left', verticalAlign: 'top', fontSize: '8px', color: '#9ca3af' }}>{d.unidad_codigo}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold', whiteSpace: 'nowrap', color: pend > 0 ? '#b45309' : '#15803d' }}>{fmtN(pend)}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{fmtM(d.precio_unitario)}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{fmtM(d.subtotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Resumen de recepción — solo cuando hay varias hojas, para no sumar
           altura extra en compras de una sola página (evita que se desborde
           a una segunda hoja casi en blanco). En una sola hoja, el pendiente
           por producto ya se ve en la columna de la tabla. ── */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '60mm', fontSize: '9px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 8px', color: '#555' }}>Total pedido (esta hoja):</td>
                <td style={{ padding: '2px 8px', textAlign: 'right' }}>{fmtN(detalleHoja.reduce((s, d) => s + Number(d.cantidad), 0))}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Total pendiente (esta hoja):</td>
                <td style={{ padding: '2px 8px', textAlign: 'right', fontWeight: 'bold', color: sumarPendiente(detalleHoja) > 0 ? '#b45309' : '#15803d' }}>{fmtN(sumarPendiente(detalleHoja))}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 8px', color: '#777', fontSize: '8px' }} colSpan={2}>
                  Total general pendiente: {fmtN(sumarPendiente(detalle))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Observaciones / Cuotas (izquierda) + Totales (derecha), a la misma altura ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start', marginBottom: '12px' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '9px' }}>
          {c.observaciones && (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '10px' }}>OBSERVACIONES</div>
              <div style={{ color: '#374151' }}>{c.observaciones}</div>
            </div>
          )}
          {(cuotas ?? []).length > 0 && (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '10px' }}>PLAN DE CUOTAS</div>
              {cuotas.map(cu => (
                <Row key={cu.id_cuota}
                  label={`Cuota ${cu.numero_cuota} — ${fechaCorta(cu.fecha_vencimiento)}:`}
                  value={`${fmtM(cu.monto)} (${cu.estado})`} />
              ))}
            </div>
          )}
          <PagosProveedor c={c} pagos={pagos} fmtM={fmtM} fontSize="9px" />
          <HistorialRecepciones recepciones={recepciones} fontSize="9px" />
        </div>

        <table style={{ borderCollapse: 'collapse', minWidth: '70mm', fontSize: '10px' }}>
          <tbody>
            {Number(c.descuento) > 0 && (
              <tr>
                <td style={{ padding: '2px 8px', color: '#555' }}>Descuento:</td>
                <td style={{ padding: '2px 8px', textAlign: 'right', color: '#ef4444' }}>- {fmtM(c.descuento)}</td>
              </tr>
            )}
            {Number(c.impuesto) > 0 && (
              <tr>
                <td style={{ padding: '2px 8px', color: '#555' }}>Impuesto:</td>
                <td style={{ padding: '2px 8px', textAlign: 'right' }}>{fmtM(c.impuesto)}</td>
              </tr>
            )}
            {Number(c.flete) > 0 && (
              <tr>
                <td style={{ padding: '2px 8px', color: '#555' }}>Flete:</td>
                <td style={{ padding: '2px 8px', textAlign: 'right' }}>{fmtM(c.flete)}</td>
              </tr>
            )}
            {Number(c.otros_costos) > 0 && (
              <tr>
                <td style={{ padding: '2px 8px', color: '#555' }}>Otros costos:</td>
                <td style={{ padding: '2px 8px', textAlign: 'right' }}>{fmtM(c.otros_costos)}</td>
              </tr>
            )}
            <tr style={{ borderTop: '1.5px solid #1a1a1a' }}>
              <td style={{ padding: '5px 8px', fontWeight: 'bold', fontSize: '12px' }}>TOTAL:</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>{fmtM(c.total)}</td>
            </tr>
            {Number(c.saldo_pendiente) > 0 && Number(c.saldo_pendiente) !== Number(c.total) && (
              <tr style={{ borderTop: '1px solid #ccc' }}>
                <td style={{ padding: '3px 8px', color: '#dc2626', fontWeight: 'bold' }}>Saldo pendiente:</td>
                <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>{fmtM(c.saldo_pendiente)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Firmas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '10px' }}>
        {[
          ['Elaborado por', `${c.crea_nombres ?? ''} ${c.crea_apellidos ?? ''}`.trim()],
          ['Aprobado por',  `${c.aprueba_nombres ?? ''} ${c.aprueba_apellidos ?? ''}`.trim()],
          ['Conformidad proveedor', ''],
        ].map(([label, nom], i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ height: '24px' }} />
            <div style={{ borderTop: '1px solid #888', paddingTop: '4px', fontSize: '9px', color: '#555' }}>{label}</div>
            <div style={{ fontSize: '8px', color: '#111827', marginTop: '2px' }}>{nom || ' '}</div>
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

  // La orden de compra siempre imprime una sola copia por hoja (no doble copia
  // con corte, como sí hacen ventas/transferencias).
  return (
    <div id="ticket" style={{ width: '190mm', background: 'white' }}>
      {paginas.map((detalleHoja, i) => (
        <div key={i} style={{ pageBreakAfter: i < paginas.length - 1 ? 'always' : 'auto' }}>
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

const Totales = ({ c, fmtM, fontSize = '10px' }) => (
  <div style={{ fontSize }}>
    {Number(c.descuento) > 0 && <Row label="Descuento:" value={`-${fmtM(c.descuento)}`} />}
    {Number(c.impuesto) > 0 && <Row label="Impuesto:" value={fmtM(c.impuesto)} />}
    {Number(c.flete) > 0 && <Row label="Flete:" value={fmtM(c.flete)} />}
    {Number(c.otros_costos) > 0 && <Row label="Otros costos:" value={fmtM(c.otros_costos)} />}
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', borderTop: '1px solid #000', paddingTop: '2px', marginTop: '2px' }}>
      <span>TOTAL:</span>
      <span>{fmtM(c.total)}</span>
    </div>
    <Row label="Condición:" value={c.condicion_pago === 'CREDITO' ? `Crédito (${c.dias_credito} días)` : 'Contado'} />
    {Number(c.saldo_pendiente) > 0 && Number(c.saldo_pendiente) !== Number(c.total) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
        <span>SALDO PENDIENTE:</span>
        <span>{fmtM(c.saldo_pendiente)}</span>
      </div>
    )}
  </div>
);

const PagosProveedor = ({ c, pagos, fmtM, fontSize = '10px' }) => {
  const activos = (pagos ?? []).filter(p => p.estado !== 'ANULADO');
  if (activos.length === 0 && Number(c.saldo_pendiente) === 0) return null;
  const totalPagado = activos.reduce((s, p) => s + Number(p.monto), 0);
  return (
    <div style={{ fontSize, marginBottom: '2px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>PAGO A PROVEEDORES</div>
      {activos.length > 0 ? (
        activos.map(p => (
          <div key={p.id_pago} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span>
              {fechaCorta(p.fecha)} · {p.metodo_pago}
              {p.numero_referencia && <span style={{ color: '#666' }}> · Ref: {p.numero_referencia}</span>}
              {p.observaciones && <span style={{ color: '#666' }}> — {p.observaciones}</span>}
            </span>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{fmtM(p.monto)}</span>
          </div>
        ))
      ) : (
        <div style={{ color: '#666' }}>Sin abonos registrados</div>
      )}
      {activos.length > 0 && <Row label="Total pagado:" value={fmtM(totalPagado)} bold />}
      <Row label="Saldo actual:" value={fmtM(c.saldo_pendiente)} bold />
    </div>
  );
};

const HistorialRecepciones = ({ recepciones, fontSize = '9px' }) => {
  if (!recepciones?.length) return null;
  return (
    <div style={{ fontSize, marginBottom: '2px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>HISTORIAL DE RECEPCIONES</div>
      {recepciones.map(r => (
        <div key={r.id_recepcion} style={{ marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span>{fechaHora(r.fecha)}</span>
            <span style={{ color: '#666' }}>{r.usuario_nombres} {r.usuario_apellidos}</span>
          </div>
          {(r.items ?? []).map((it, i) => (
            <div key={i} style={{ color: '#444' }}>{fmtN(it.cantidad_recibida)} × {it.producto} ({it.codigo_interno})</div>
          ))}
          {r.observaciones && <div style={{ color: '#374151' }}>{r.observaciones}</div>}
        </div>
      ))}
    </div>
  );
};

const Pie = ({ e, fontSize = '11px' }) => (
  <div style={{ textAlign: 'center', fontSize, marginTop: '4px' }}>
    <div style={{ fontWeight: 'bold' }}>Documento interno de control de compras</div>
    <div style={{ marginTop: '2px' }}>Generado el {new Date().toLocaleString('es-BO')} — {e?.razon_social ?? ''}</div>
  </div>
);

const DetalleProductos = ({ detalle, fmtM }) => (
  <div style={{ marginBottom: '4px' }}>
    <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px', letterSpacing: '0.5px' }}>DETALLE</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 16mm 20mm', gap: '0 2px', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '2px' }}>
      {['Descripción', 'Cant', 'Subtotal'].map((h, i) => (
        <span key={i} style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: i > 0 ? 'center' : 'left' }}>{h}</span>
      ))}
    </div>
    {detalle.map((d, i) => {
      const spec = specLinea(d);
      const pend = pendienteDe(d);
      return (
        <div key={d.id_detalle} style={{ marginBottom: '5px', borderBottom: i < detalle.length - 1 ? '1px dotted #ccc' : 'none', paddingBottom: '3px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 16mm 20mm', gap: '0 2px', alignItems: 'start' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', wordBreak: 'break-word', lineHeight: '1.3' }}>{d.producto}</span>
            <span style={{ fontSize: '10px', textAlign: 'center' }}>{fmtN(d.cantidad)}</span>
            <span style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'right' }}>{fmtM(d.subtotal)}</span>
          </div>
          <div style={{ fontSize: '9px', color: '#444', paddingLeft: '2px' }}>
            Cod: {d.codigo_interno} · P.Unit: {fmtM(d.precio_unitario)}
          </div>
          <div style={{ fontSize: '9px', color: pend > 0 ? '#b45309' : '#15803d', fontWeight: 'bold', paddingLeft: '2px' }}>
            Recibido: {fmtN(d.cantidad_recibida ?? 0)} · Pendiente: {fmtN(pend)}
          </div>
          {d.marca_nombre && (
            <div style={{ fontSize: '9px', color: '#333', paddingLeft: '2px' }}>Marca: {d.marca_nombre}</div>
          )}
          {d.producto_detalle && (
            <div style={{ fontSize: '9px', color: '#333', paddingLeft: '2px' }}>{d.producto_detalle}</div>
          )}
          {spec && (
            <div style={{ fontSize: '9px', color: '#444', paddingLeft: '2px' }}>{spec}</div>
          )}
        </div>
      );
    })}
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '3px', marginTop: '2px' }}>
      <span>TOTAL PENDIENTE:</span>
      <span>{fmtN(sumarPendiente(detalle))}</span>
    </div>
  </div>
);

/* ─── Página principal ────────────────────────────────────────────────────── */
export default function CompraImprimirDirecto() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [data,      setData]     = useState(null);
  const [cargando,  setCargando] = useState(true);
  const [formato,   setFormato]  = useState('80mm');
  const { empresa, logoUrl } = useEmpresa() ?? {};

  useEffect(() => {
    comprasService.getOne(id)
      .then(r => setData(r.data))
      .catch(() => navigate(`/compras/${id}`))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!data)    return null;

  const { compra, detalle = [], cuotas = [], pagos = [], recepciones = [] } = data;
  const sym  = compra.moneda_simbolo ?? compra.moneda_codigo ?? '';
  const fmtM = n => `${sym} ${fmt(n)}`;

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
          onClick={() => navigate(`/compras/${id}`)}
          className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
        >
          ← Volver
        </button>
      </div>

      {/* Preview */}
      <div className="flex justify-center p-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        {formato === 'A4'
          ? <TicketA4  c={compra} detalle={detalle} cuotas={cuotas} pagos={pagos} recepciones={recepciones} empresa={empresa} logoUrl={logoUrl} fmtM={fmtM} />
          : formato === '110mm'
          ? <Ticket110 c={compra} detalle={detalle} pagos={pagos} recepciones={recepciones} empresa={empresa} logoUrl={logoUrl} fmtM={fmtM} />
          : <Ticket80  c={compra} detalle={detalle} pagos={pagos} recepciones={recepciones} empresa={empresa} logoUrl={logoUrl} fmtM={fmtM} />
        }
      </div>

      {/* CSS de impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          #ticket, #ticket * { visibility: visible !important; }
          /* El layout general de la app (App.jsx) fija html/body/main con altura de
             pantalla y overflow oculto — eso recorta el contenido a 1 sola hoja al
             imprimir. Hay que liberarlo para que el documento pueda paginar de verdad. */
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
