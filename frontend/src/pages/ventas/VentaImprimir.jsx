import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ventasService } from '../../services/ventas.service';
import { useEmpresa } from '../../contexts/EmpresaContext';

const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fmtFecha = s => s ? new Date(s).toLocaleString('es-BO') : '—';
const fmtFechaCorta = s => s ? new Date(s).toLocaleDateString('es-BO') : '—';

/* ─── Ticket 80mm (portrait) ──────────────────────────────────────────────── */
function Ticket80({ data, logoUrl }) {
  const clienteNombre = data.cliente_razon || `${data.cliente_nombres ?? ''} ${data.cliente_apellidos ?? ''}`.trim();
  const empresa = data.empresa_comercial || data.empresa_razon || 'MEGAELECTRA';

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
          <div style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: '1.3', wordBreak: 'break-word', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{empresa}</div>
          {data.empresa_nit && (
            <div style={{ fontSize: '10px', marginTop: '3px' }}>
              <span style={{ fontWeight: 'bold' }}>NIT:</span> {data.empresa_nit}
            </div>
          )}
          {data.sucursal_nombre && <div style={{ fontSize: '10px' }}><span style={{ fontWeight: 'bold' }}>Sucursal:</span> {data.sucursal_nombre}</div>}
          {data.sucursal_direccion && <div style={{ fontSize: '10px' }}><span style={{ fontWeight: 'bold' }}>Dir:</span> {data.sucursal_direccion}</div>}
          {data.sucursal_telefono && <div style={{ fontSize: '10px' }}><span style={{ fontWeight: 'bold' }}>Tel:</span> {data.sucursal_telefono}</div>}
        </div>
      </div>

      <Divisor />

      {/* Info venta */}
      <div style={{ marginBottom: '4px' }}>
        <Row label="RECIBO" value={data.numero} bold />
        {data.numero_factura && <Row label="N° Factura:" value={data.numero_factura} />}
        <Row label="Fecha:" value={fmtFecha(data.fecha)} />
        {data.usuario_registro_nombre && data.usuario_registro_nombre !== data.vendedor_nombre && (
          <Row label="Usuario:" value={data.usuario_registro_nombre} />
        )}
        <Row label="Vendedor:" value={data.vendedor_nombre} bold />
      </div>

      <Divisor />

      {/* Cliente */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontWeight: 'bold' }}>CLIENTE</div>
        <div>{clienteNombre}</div>
        {data.cliente_documento && <div>{data.tipo_documento}: {data.cliente_documento}</div>}
      </div>

      <Divisor />

      {/* Detalle */}
      <DetalleProductos data={data} cols="1fr 20mm 22mm" />

      <Divisor />

      {/* Totales */}
      <Totales data={data} />

      {/* Entrega */}
      {data.requiere_entrega && data.direccion_entrega && (
        <>
          <Divisor />
          <div style={{ fontSize: '10px' }}>
            <div style={{ fontWeight: 'bold' }}>ENTREGA:</div>
            <div>{data.direccion_entrega}</div>
            {data.fecha_entrega && <div>Fecha: {fmtFecha(data.fecha_entrega)}</div>}
          </div>
        </>
      )}

      <Divisor />
      <Nota />
      <Divisor />
      <Pie />
    </div>
  );
}

/* ─── Ticket 110mm (horizontal / ancho) ───────────────────────────────────── */
function Ticket110({ data, logoUrl }) {
  const clienteNombre = data.cliente_razon || `${data.cliente_nombres ?? ''} ${data.cliente_apellidos ?? ''}`.trim();
  const empresa = data.empresa_comercial || data.empresa_razon || 'MEGAELECTRA';

  return (
    <div
      id="ticket"
      style={{ width: '110mm', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.45', background: 'white', color: '#000', padding: '4mm' }}
    >
      {/* ── Cabecera: Logo+Empresa | Info venta ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '5px', alignItems: 'flex-start' }}>
        {/* Columna izquierda: logo + empresa */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
          {logoUrl && logoUrl !== '/logo.png' && (
            <img src={logoUrl} alt="Logo" style={{ height: '64px', width: '90px', objectFit: 'contain', flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '1.3', wordBreak: 'break-word' }}>{empresa}</div>
            {data.empresa_nit && <div style={{ fontSize: '9px', marginTop: '2px' }}><span style={{ fontWeight: 'bold' }}>NIT:</span> {data.empresa_nit}</div>}
            {data.sucursal_nombre && <div style={{ fontSize: '9px' }}><span style={{ fontWeight: 'bold' }}>Sucursal:</span> {data.sucursal_nombre}</div>}
            {data.sucursal_direccion && <div style={{ fontSize: '9px' }}><span style={{ fontWeight: 'bold' }}>Dir:</span> {data.sucursal_direccion}</div>}
            {data.sucursal_telefono && <div style={{ fontSize: '9px' }}><span style={{ fontWeight: 'bold' }}>Tel:</span> {data.sucursal_telefono}</div>}
          </div>
        </div>

        {/* Columna derecha: datos del comprobante */}
        <div style={{ borderLeft: '1px dashed #999', paddingLeft: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center', marginBottom: '3px', letterSpacing: '0.5px' }}>RECIBO</div>
          <Row label="N°:" value={data.numero} />
          {data.numero_factura && <Row label="Fact.:" value={data.numero_factura} />}
          <Row label="Fecha:" value={fmtFechaCorta(data.fecha)} />
          <Row label="Hora:" value={data.fecha ? new Date(data.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '—'} />
          {data.usuario_registro_nombre && data.usuario_registro_nombre !== data.vendedor_nombre && (
            <Row label="Usuario:" value={data.usuario_registro_nombre} />
          )}
          <Row label="Vendedor:" value={data.vendedor_nombre} bold />
        </div>
      </div>

      <Divisor />

      {/* ── Sección media: Cliente | Condición/Entrega ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px' }}>
        {/* Cliente */}
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>CLIENTE</div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', wordBreak: 'break-word' }}>{clienteNombre}</div>
          {data.cliente_documento && <div style={{ fontSize: '9px' }}>{data.tipo_documento}: {data.cliente_documento}</div>}
        </div>

        {/* Condición + Entrega */}
        <div style={{ borderLeft: '1px dashed #999', paddingLeft: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>CONDICIÓN</div>
          <div style={{ fontSize: '10px' }}>{data.condicion_pago === 'CREDITO' ? `Crédito (${data.dias_credito} días)` : 'Contado'}</div>
          {data.requiere_entrega && data.direccion_entrega && (
            <>
              <div style={{ fontWeight: 'bold', fontSize: '10px', marginTop: '4px', marginBottom: '2px' }}>ENTREGA</div>
              <div style={{ fontSize: '9px' }}>{data.direccion_entrega}</div>
              {data.fecha_entrega && <div style={{ fontSize: '9px' }}>Fecha: {fmtFechaCorta(data.fecha_entrega)}</div>}
            </>
          )}
        </div>
      </div>

      <Divisor />

      {/* ── Detalle de productos — tabla ancha ── */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '10px', letterSpacing: '0.5px', marginBottom: '4px' }}>DETALLE DE PRODUCTOS</div>
        {/* Cabecera */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 18mm 12mm 14mm 22mm', gap: '0 3px', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '3px' }}>
          {['Descripción', 'P.Unit', 'Cant.', 'Dto.', 'Subtotal'].map((h, i) => (
            <span key={i} style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>
        {(data.detalle ?? []).map((d, i) => {
          const base = Number(d.cantidad) * Number(d.precio_unitario);
          const desc = base * (Number(d.descuento_porc ?? 0) / 100);
          const sub  = base - desc;
          return (
            <div key={i} style={{ marginBottom: '4px', borderBottom: i < (data.detalle?.length - 1) ? '1px dotted #ccc' : 'none', paddingBottom: '3px' }}>
              {/* Fila principal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 18mm 12mm 14mm 22mm', gap: '0 3px', alignItems: 'start' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', wordBreak: 'break-word', lineHeight: '1.3' }}>{d.producto}</span>
                <span style={{ fontSize: '9px', textAlign: 'right' }}>Bs {fmtMonto(d.precio_unitario)}</span>
                <span style={{ fontSize: '9px', textAlign: 'right' }}>{fmtMonto(d.cantidad)}</span>
                <span style={{ fontSize: '9px', textAlign: 'right' }}>{Number(d.descuento_porc) > 0 ? `${d.descuento_porc}%` : '—'}</span>
                <span style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'right' }}>Bs {fmtMonto(sub)}</span>
              </div>
              {/* Especificaciones en línea */}
              {(d.marca || d.modelo || d.color || d.numero_serie) && (
                <div style={{ fontSize: '8px', color: '#444', paddingLeft: '2px', marginTop: '1px' }}>
                  {[d.marca && `Marca: ${d.marca}`, d.modelo && `Mod: ${d.modelo}`, d.color && `Color: ${d.color}`, d.numero_serie && `S/N: ${d.numero_serie}`].filter(Boolean).join('  ·  ')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Divisor />

      {/* ── Totales alineados a la derecha ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: '52mm' }}>
          <Row label="Subtotal:" value={`Bs ${fmtMonto(data.subtotal)}`} />
          {Number(data.descuento_monto) > 0 && (
            <Row label={`Descuento (${data.descuento_porc}%):`} value={`-Bs ${fmtMonto(data.descuento_monto)}`} />
          )}
          {Number(data.impuesto) > 0 && (
            <Row label="Impuesto:" value={`Bs ${fmtMonto(data.impuesto)}`} />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', borderTop: '1px solid #000', paddingTop: '2px', marginTop: '2px' }}>
            <span>TOTAL:</span>
            <span>Bs {fmtMonto(data.total)}</span>
          </div>
          {Number(data.saldo_pendiente) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#000', fontSize: '11px' }}>
              <span>SALDO PENDIENTE:</span>
              <span>Bs {fmtMonto(data.saldo_pendiente)}</span>
            </div>
          )}
        </div>
      </div>

      <Divisor />
      <Nota />
      <Divisor />
      <Pie />
    </div>
  );
}

/* ─── Ticket A4 (formal, 2 copias por hoja) ───────────────────────────────── */
function TicketA4({ data, logoUrl }) {
  const clienteNombre = data.cliente_razon || `${data.cliente_nombres ?? ''} ${data.cliente_apellidos ?? ''}`.trim();
  const empresa = data.empresa_comercial || data.empresa_razon || 'MEGAELECTRA';

  const renderCopia = () => (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', lineHeight: '1.45', color: '#111' }}>

      {/* Franja superior */}
      <div style={{ height: '3px', background: '#1a1a1a', marginBottom: '10px' }} />

      {/* ── Cabecera: datos empresa | logo | caja recibo ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>

        {/* Izquierda: datos empresa */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', lineHeight: '1.2', marginBottom: '4px' }}>{empresa}</div>
          {data.empresa_nit        && <div><strong>NIT:</strong> {data.empresa_nit}</div>}
          {data.sucursal_nombre    && <div><strong>Sucursal:</strong> {data.sucursal_nombre}</div>}
          {data.sucursal_direccion && <div><strong>Dirección:</strong> {data.sucursal_direccion}</div>}
          {data.sucursal_telefono  && <div><strong>Teléfono:</strong> {data.sucursal_telefono}</div>}
        </div>

        {/* Centro: logo */}
        <div style={{ textAlign: 'center' }}>
          {logoUrl && logoUrl !== '/logo.png'
            ? <img src={logoUrl} alt="Logo" style={{ height: '72px', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
            : <div style={{ height: '72px' }} />
          }
        </div>

        {/* Caja RECIBO */}
        <div style={{ border: '1.5px solid #1a1a1a', padding: '8px 12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '3px', textAlign: 'center', textTransform: 'uppercase', borderBottom: '1px solid #1a1a1a', paddingBottom: '4px', marginBottom: '6px' }}>RECIBO</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              <tr>
                <td style={{ color: '#555', paddingRight: '10px', whiteSpace: 'nowrap' }}>N°:</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{data.numero}</td>
              </tr>
              {data.numero_factura && (
                <tr>
                  <td style={{ color: '#555', paddingRight: '10px' }}>Factura:</td>
                  <td style={{ textAlign: 'right' }}>{data.numero_factura}</td>
                </tr>
              )}
              <tr>
                <td style={{ color: '#555', paddingRight: '10px' }}>Fecha:</td>
                <td style={{ textAlign: 'right' }}>{fmtFecha(data.fecha)}</td>
              </tr>
              {data.usuario_registro_nombre && data.usuario_registro_nombre !== data.vendedor_nombre && (
                <tr>
                  <td style={{ color: '#555', paddingRight: '10px' }}>Usuario:</td>
                  <td style={{ textAlign: 'right' }}>{data.usuario_registro_nombre}</td>
                </tr>
              )}
              <tr>
                <td style={{ color: '#555', paddingRight: '10px' }}>Vendedor:</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{data.vendedor_nombre}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ borderTop: '1.5px solid #1a1a1a', marginBottom: '8px' }} />

      {/* ── Cliente + Condición ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '3px' }}>Cliente</div>
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '2px' }}>{clienteNombre}</div>
          {data.cliente_documento && <div style={{ color: '#444' }}>{data.tipo_documento}: {data.cliente_documento}</div>}
        </div>
        <div>
          <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '3px' }}>Condición de pago</div>
          <div>{data.condicion_pago === 'CREDITO' ? `Crédito — ${data.dias_credito} días` : 'Contado'}</div>
          {data.requiere_entrega && data.direccion_entrega && (
            <>
              <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginTop: '5px', marginBottom: '2px' }}>Entrega</div>
              <div>{data.direccion_entrega}</div>
              {data.fecha_entrega && <div>Fecha: {fmtFecha(data.fecha_entrega)}</div>}
            </>
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #d0d0d0', marginBottom: '8px' }} />

      {/* ── Tabla de productos ── */}
      <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '4px' }}>Detalle de productos</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '10px' }}>
        <thead>
          <tr style={{ borderTop: '1px solid #1a1a1a', borderBottom: '1.5px solid #1a1a1a' }}>
            {['Descripción', 'P. Unit.', 'Cant.', 'Dto.', 'Subtotal'].map((h, i) => (
              <th key={i} style={{ padding: '4px 6px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(data.detalle ?? []).map((d, i) => {
            const base = Number(d.cantidad) * Number(d.precio_unitario);
            const desc = base * (Number(d.descuento_porc ?? 0) / 100);
            const sub  = base - desc;
            return (
              <tr key={i} style={{ borderBottom: '1px solid #ebebeb' }}>
                <td style={{ padding: '4px 6px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 'bold' }}>{d.producto}</div>
                  {(d.marca || d.modelo || d.color || d.numero_serie) && (
                    <div style={{ fontSize: '8px', color: '#666', marginTop: '1px' }}>
                      {[d.marca && `Marca: ${d.marca}`, d.modelo && `Mod: ${d.modelo}`, d.color && `Color: ${d.color}`, d.numero_serie && `S/N: ${d.numero_serie}`].filter(Boolean).join('  ·  ')}
                    </div>
                  )}
                </td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>Bs {fmtMonto(d.precio_unitario)}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top' }}>{fmtMonto(d.cantidad)}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top' }}>{Number(d.descuento_porc) > 0 ? `${d.descuento_porc}%` : '—'}</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Bs {fmtMonto(sub)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Totales ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '70mm', fontSize: '10px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2px 8px', color: '#555' }}>Subtotal:</td>
              <td style={{ padding: '2px 8px', textAlign: 'right' }}>Bs {fmtMonto(data.subtotal)}</td>
            </tr>
            {Number(data.descuento_monto) > 0 && (
              <tr>
                <td style={{ padding: '2px 8px', color: '#555' }}>Descuento ({data.descuento_porc}%):</td>
                <td style={{ padding: '2px 8px', textAlign: 'right' }}>-Bs {fmtMonto(data.descuento_monto)}</td>
              </tr>
            )}
            {Number(data.impuesto) > 0 && (
              <tr>
                <td style={{ padding: '2px 8px', color: '#555' }}>Impuesto:</td>
                <td style={{ padding: '2px 8px', textAlign: 'right' }}>Bs {fmtMonto(data.impuesto)}</td>
              </tr>
            )}
            <tr style={{ borderTop: '1.5px solid #1a1a1a' }}>
              <td style={{ padding: '5px 8px', fontWeight: 'bold', fontSize: '12px' }}>TOTAL:</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>Bs {fmtMonto(data.total)}</td>
            </tr>
            {Number(data.saldo_pendiente) > 0 && (
              <tr style={{ borderTop: '1px solid #ccc' }}>
                <td style={{ padding: '3px 8px', color: '#555' }}>Saldo pendiente:</td>
                <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 'bold' }}>Bs {fmtMonto(data.saldo_pendiente)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Firmas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '10px' }}>
        {['Firma del Vendedor', 'Firma del Cliente / Receptor'].map((label, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ height: '24px' }} />
            <div style={{ borderTop: '1px solid #888', paddingTop: '4px', fontSize: '9px', color: '#555' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Pie ── */}
      <div style={{ borderTop: '1.5px solid #1a1a1a', paddingTop: '6px', textAlign: 'center', fontSize: '9px', color: '#555', fontStyle: 'italic' }}>
        NOTA: NO SE ACEPTAN CAMBIOS NI DEVOLUCIONES. VERIFIQUE ANTES DE RETIRAR EL PRODUCTO.
        <span style={{ fontStyle: 'normal', marginLeft: '8px' }}>— Gracias por su compra. Conserve su comprobante.</span>
      </div>
    </div>
  );

  return (
    <div id="ticket" style={{ width: '190mm', background: 'white' }}>
      {renderCopia()}

      {/* Línea de corte */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10mm 0' }}>
        <div style={{ flex: 1, borderTop: '1px dashed #bbb' }} />
        <span style={{ fontSize: '9px', color: '#bbb', letterSpacing: '2px', whiteSpace: 'nowrap', userSelect: 'none' }}>✂ &nbsp; CORTAR AQUÍ &nbsp; ✂</span>
        <div style={{ flex: 1, borderTop: '1px dashed #bbb' }} />
      </div>

      {renderCopia()}
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

const Nota = () => (
  <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', padding: '4px 0', lineHeight: '1.4' }}>
    NOTA: NO SE ACEPTAN CAMBIOS NI DEVOLUCIONES.<br />
    VERIFIQUE ANTES DE RETIRAR EL PRODUCTO.
  </div>
);

const Pie = () => (
  <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '4px' }}>
    <div>Gracias por su compra</div>
    <div style={{ marginTop: '2px' }}>Conserve su comprobante</div>
  </div>
);

const Totales = ({ data }) => (
  <div style={{ marginBottom: '4px' }}>
    <Row label="Subtotal:" value={`Bs ${fmtMonto(data.subtotal)}`} />
    {Number(data.descuento_monto) > 0 && (
      <Row label={`Descuento (${data.descuento_porc}%):`} value={`-Bs ${fmtMonto(data.descuento_monto)}`} />
    )}
    {Number(data.impuesto) > 0 && (
      <Row label="Impuesto:" value={`Bs ${fmtMonto(data.impuesto)}`} />
    )}
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>
      <span>TOTAL:</span>
      <span>Bs {fmtMonto(data.total)}</span>
    </div>
    <Row label="Condición:" value={data.condicion_pago === 'CREDITO' ? `Crédito (${data.dias_credito} días)` : 'Contado'} />
    {Number(data.saldo_pendiente) > 0 && (
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
        <span>SALDO PENDIENTE:</span>
        <span>Bs {fmtMonto(data.saldo_pendiente)}</span>
      </div>
    )}
  </div>
);

const DetalleProductos = ({ data }) => (
  <div style={{ marginBottom: '4px' }}>
    <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px', letterSpacing: '0.5px' }}>DETALLE</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 20mm 22mm', gap: '0 2px', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '2px' }}>
      {['Descripción', 'Cant', 'Subtotal'].map((h, i) => (
        <span key={i} style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: i > 0 ? 'center' : 'left' }}>{h}</span>
      ))}
    </div>
    {(data.detalle ?? []).map((d, i) => {
      const base = Number(d.cantidad) * Number(d.precio_unitario);
      const desc = base * (Number(d.descuento_porc ?? 0) / 100);
      const sub  = base - desc;
      return (
        <div key={i} style={{ marginBottom: '5px', borderBottom: i < (data.detalle?.length - 1) ? '1px dotted #ccc' : 'none', paddingBottom: '3px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 20mm 22mm', gap: '0 2px', alignItems: 'start' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', wordBreak: 'break-word', lineHeight: '1.3' }}>{d.producto}</span>
            <span style={{ fontSize: '10px', textAlign: 'center' }}>{fmtMonto(d.cantidad)}</span>
            <span style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'right' }}>Bs {fmtMonto(sub)}</span>
          </div>
          <div style={{ fontSize: '9px', color: '#444', paddingLeft: '2px' }}>
            P.Unit: Bs {fmtMonto(d.precio_unitario)}
            {Number(d.descuento_porc) > 0 && ` · Dto. ${d.descuento_porc}%`}
          </div>
          {(d.marca || d.modelo || d.color) && (
            <table style={{ fontSize: '9px', color: '#333', marginTop: '2px', marginLeft: '2px', borderCollapse: 'collapse' }}>
              <tbody>
                {d.marca    && <tr><td style={{ fontWeight: 'bold', paddingRight: '4px', whiteSpace: 'nowrap' }}>Marca:</td><td>{d.marca}</td></tr>}
                {d.modelo   && <tr><td style={{ fontWeight: 'bold', paddingRight: '4px', whiteSpace: 'nowrap' }}>Modelo:</td><td>{d.modelo}</td></tr>}
                {d.color    && <tr><td style={{ fontWeight: 'bold', paddingRight: '4px', whiteSpace: 'nowrap' }}>Color:</td><td>{d.color}</td></tr>}
                {d.numero_serie && <tr><td style={{ fontWeight: 'bold', paddingRight: '4px', whiteSpace: 'nowrap' }}>S/N:</td><td style={{ fontFamily: 'monospace' }}>{d.numero_serie}</td></tr>}
              </tbody>
            </table>
          )}
          {d.numero_serie && !d.marca && !d.modelo && !d.color && (
            <div style={{ fontSize: '9px', color: '#333', paddingLeft: '2px', fontFamily: 'monospace' }}>S/N: {d.numero_serie}</div>
          )}
        </div>
      );
    })}
  </div>
);

/* ─── Página principal ────────────────────────────────────────────────────── */
export default function VentaImprimir() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [data,      setData]     = useState(null);
  const [cargando,  setCargando] = useState(true);
  const [formato,   setFormato]  = useState('80mm');
  const { logoUrl } = useEmpresa() ?? {};

  useEffect(() => {
    ventasService.ticket(id)
      .then(r => setData(r.data))
      .catch(() => navigate('/ventas'))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!data)    return null;

  const isA4 = formato === 'A4';

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
          onClick={() => navigate(`/ventas/${id}`)}
          className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
        >
          ← Volver
        </button>
      </div>

      {/* Preview del ticket */}
      <div className="flex justify-center p-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        {formato === 'A4'
          ? <TicketA4  data={data} logoUrl={logoUrl} />
          : formato === '110mm'
          ? <Ticket110 data={data} logoUrl={logoUrl} />
          : <Ticket80  data={data} logoUrl={logoUrl} />
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
