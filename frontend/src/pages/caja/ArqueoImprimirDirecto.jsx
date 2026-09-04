import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cajaService } from '../../services/caja.service';
import { useEmpresa } from '../../contexts/EmpresaContext';

const fmt = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtFecha = f => f ? new Date(f).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fmtCorta = f => f ? new Date(f).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function groupByMethod(arr) {
  return (arr ?? []).reduce((acc, item) => {
    const m = item.metodo_pago || 'OTRO';
    acc[m] = (acc[m] || 0) + Number(item.monto);
    return acc;
  }, {});
}

/* Calcula todos los totales/cuadre a partir de los mismos datos que usan
   ArqueoDetalle.jsx y ResumenCajaPDF — mismos nombres, misma matemática. */
function calcular({ arqueo, cobros = [], gastos = [], pagosCompra = [], monto_cierre_sistema_provisional }) {
  const cobrosPM  = groupByMethod(cobros);
  const gastosPM  = groupByMethod(gastos);
  const comprasPM = groupByMethod(pagosCompra);

  const totalCobros  = cobros.reduce((s, c) => s + Number(c.monto), 0);
  const totalGastos  = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const totalCompras = pagosCompra.reduce((s, p) => s + Number(p.monto), 0);

  const cobrosEf  = cobrosPM['EFECTIVO'] || 0;
  const gastosEf  = gastosPM['EFECTIVO'] || 0;
  const comprasEf = comprasPM['EFECTIVO'] || 0;

  const esperado = monto_cierre_sistema_provisional ?? Number(arqueo.monto_cierre_sistema ?? 0);
  const difNum   = Number(arqueo.diferencia ?? 0);

  return { cobrosPM, gastosPM, comprasPM, totalCobros, totalGastos, totalCompras, cobrosEf, gastosEf, comprasEf, esperado, difNum };
}

/* Lista compacta de productos vendidos (para tickets 80/110mm) */
const ProductosVendidosCompacto = ({ ventasDetalle, fontSize = '10px' }) => {
  if (!ventasDetalle?.length) return null;
  const totalVendido = ventasDetalle.reduce((s, i) => s + Number(i.subtotal ?? 0), 0);
  return (
    <div style={{ fontSize }}>
      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>PRODUCTOS VENDIDOS</div>
      {ventasDetalle.map((it, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
          <span style={{ wordBreak: 'break-word' }}>{fmt(it.cantidad)} × {it.producto}</span>
          <span style={{ whiteSpace: 'nowrap' }}>Bs {fmt(it.subtotal)}</span>
        </div>
      ))}
      <Row label="Total vendido:" value={fmt(totalVendido)} bold />
    </div>
  );
};

/* ─── Ticket 80mm ─────────────────────────────────────────────────────────── */
function Ticket80({ arqueo, calc, ventasDetalle, empresa: e, logoUrl, esAbierta }) {
  return (
    <div
      id="ticket"
      style={{ width: '80mm', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5', background: 'white', color: '#000', padding: '4mm' }}
    >
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

      <div style={{ marginBottom: '4px' }}>
        <Row label={esAbierta ? 'RESUMEN DE TURNO' : 'CIERRE DE TURNO'} value="" bold />
        <Row label="Caja:" value={arqueo.caja} bold />
        <Row label="Sucursal:" value={arqueo.sucursal} />
        <Row label="Cajero:" value={arqueo.usuario} />
        <Row label="Estado:" value={arqueo.estado} bold />
        <Row label="Apertura:" value={fmtFecha(arqueo.fecha_apertura)} />
        {!esAbierta && <Row label="Cierre:" value={fmtFecha(arqueo.fecha_cierre)} />}
      </div>

      <Divisor />
      <TotalesPorMetodo calc={calc} />
      {ventasDetalle?.length > 0 && (
        <>
          <Divisor />
          <ProductosVendidosCompacto ventasDetalle={ventasDetalle} />
        </>
      )}
      <Divisor />
      <CuadreEfectivo arqueo={arqueo} calc={calc} esAbierta={esAbierta} />

      {!esAbierta && arqueo.observaciones && (
        <>
          <Divisor />
          <div style={{ fontSize: '10px' }}>
            <div style={{ fontWeight: 'bold' }}>OBSERVACIONES:</div>
            <div>{arqueo.observaciones}</div>
          </div>
        </>
      )}

      <Divisor />
      <Pie e={e} />
    </div>
  );
}

/* ─── Ticket 110mm ────────────────────────────────────────────────────────── */
function Ticket110({ arqueo, calc, ventasDetalle, empresa: e, logoUrl, esAbierta }) {
  return (
    <div
      id="ticket"
      style={{ width: '110mm', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.45', background: 'white', color: '#000', padding: '4mm' }}
    >
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
          <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center', marginBottom: '3px', letterSpacing: '0.5px' }}>
            {esAbierta ? 'RESUMEN DE TURNO' : 'CIERRE DE TURNO'}
          </div>
          <Row label="Caja:" value={arqueo.caja} />
          <Row label="Cajero:" value={arqueo.usuario} />
          <Row label="Estado:" value={arqueo.estado} bold />
          <Row label="Apertura:" value={fmtCorta(arqueo.fecha_apertura)} />
          {!esAbierta && <Row label="Cierre:" value={fmtCorta(arqueo.fecha_cierre)} />}
        </div>
      </div>

      <Divisor />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>TOTALES POR MÉTODO</div>
          <TotalesPorMetodo calc={calc} fontSize="9px" />
        </div>
        <div style={{ borderLeft: '1px dashed #999', paddingLeft: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>CUADRE DE EFECTIVO</div>
          <CuadreEfectivo arqueo={arqueo} calc={calc} esAbierta={esAbierta} fontSize="9px" />
        </div>
      </div>

      {ventasDetalle?.length > 0 && (
        <>
          <Divisor />
          <ProductosVendidosCompacto ventasDetalle={ventasDetalle} fontSize="9px" />
        </>
      )}

      {!esAbierta && arqueo.observaciones && (
        <>
          <Divisor />
          <div style={{ fontSize: '9px' }}>
            <div style={{ fontWeight: 'bold' }}>OBSERVACIONES:</div>
            <div>{arqueo.observaciones}</div>
          </div>
        </>
      )}

      <Divisor />
      <Pie e={e} fontSize="9px" />
    </div>
  );
}

/* ─── Ticket A4 (detallado) ──────────────────────────────────────────────────
   Un solo encabezado arriba de todo el documento, seguido de las secciones en
   flujo continuo (resumen, productos vendidos, cobros, gastos, pagos a
   proveedores). Las tablas no se recortan manualmente en "hojas" — si una
   tabla es más larga que una página física, el navegador la corta solo al
   imprimir y repite la fila de encabezados de columna automáticamente. */
function TicketA4({ arqueo, calc, cobros, gastos, pagosCompra, ventasDetalle, empresa: e, logoUrl, esAbierta }) {
  const totalVendido = ventasDetalle.reduce((s, i) => s + Number(i.subtotal ?? 0), 0);

  const Header = () => (
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
        <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', textAlign: 'center', textTransform: 'uppercase', borderBottom: '1px solid #1a1a1a', paddingBottom: '4px', marginBottom: '6px' }}>
          {esAbierta ? 'RESUMEN DE TURNO' : 'CIERRE DE TURNO'}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <tbody>
            <tr>
              <td style={{ color: '#555', paddingRight: '10px', whiteSpace: 'nowrap' }}>Caja:</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{arqueo.caja}</td>
            </tr>
            <tr>
              <td style={{ color: '#555', paddingRight: '10px' }}>Sucursal:</td>
              <td style={{ textAlign: 'right' }}>{arqueo.sucursal}</td>
            </tr>
            <tr>
              <td style={{ color: '#555', paddingRight: '10px' }}>Cajero:</td>
              <td style={{ textAlign: 'right' }}>{arqueo.usuario}</td>
            </tr>
            <tr>
              <td style={{ color: '#555', paddingRight: '10px' }}>Estado:</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{arqueo.estado}</td>
            </tr>
            <tr>
              <td style={{ color: '#555', paddingRight: '10px' }}>Apertura:</td>
              <td style={{ textAlign: 'right' }}>{fmtFecha(arqueo.fecha_apertura)}</td>
            </tr>
            {!esAbierta && (
              <tr>
                <td style={{ color: '#555', paddingRight: '10px' }}>Cierre:</td>
                <td style={{ textAlign: 'right' }}>{fmtFecha(arqueo.fecha_cierre)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const Footer = () => (
    <div style={{ borderTop: '1.5px solid #1a1a1a', paddingTop: '6px', textAlign: 'center', fontSize: '9px', color: '#555', marginTop: '14px' }}>
      <span>Generado el {new Date().toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</span>
      <span style={{ marginLeft: '8px' }}>— {e?.razon_social ?? ''}</span>
    </div>
  );

  const TablaSeccion = ({ titulo, columnas, filas, montoTotal, colorTotal }) => (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', borderTop: '1.5px solid #1a1a1a', paddingTop: '8px' }}>{titulo}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
        <thead>
          <tr style={{ borderTop: '1px solid #1a1a1a', borderBottom: '1.5px solid #1a1a1a' }}>
            {columnas.map((h, i) => (
              <th key={i} style={{ padding: '4px 6px', textAlign: h.right ? 'right' : 'left', fontWeight: 'bold', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #ebebeb' }}>
              {columnas.map((c, j) => (
                <td key={j} style={{ padding: '4px 6px', textAlign: c.right ? 'right' : 'left', fontWeight: c.bold ? 'bold' : undefined, whiteSpace: c.nowrap ? 'nowrap' : undefined }}>
                  {c.render ? c.render(f) : f[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '1.5px solid #1a1a1a' }}>
            <td colSpan={columnas.length - 1} style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px' }}>Total</td>
            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', color: colorTotal }}>Bs {fmt(montoTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div id="ticket" style={{ width: '190mm', background: 'white', fontFamily: 'Arial, sans-serif', fontSize: '10px', lineHeight: '1.45', color: '#111' }}>
      <Header />
      <div style={{ borderTop: '1.5px solid #1a1a1a', marginBottom: '10px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '12px', pageBreakInside: 'avoid' }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '6px' }}>Totales por método de pago</div>
          <TotalesPorMetodoA4 calc={calc} />
        </div>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', marginBottom: '6px' }}>Cuadre de efectivo</div>
          <CuadreEfectivoA4 arqueo={arqueo} calc={calc} esAbierta={esAbierta} />
        </div>
      </div>

      {!esAbierta && arqueo.observaciones && (
        <div style={{ marginTop: '8px', padding: '6px 8px', backgroundColor: '#fef9c3', border: '0.5px solid #fbbf24', pageBreakInside: 'avoid' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#713f12', marginBottom: '2px' }}>OBSERVACIONES</div>
          <div style={{ fontSize: '9px', color: '#713f12' }}>{arqueo.observaciones}</div>
        </div>
      )}

      {ventasDetalle.length > 0 && (
        <TablaSeccion
          titulo="Productos vendidos"
          filas={ventasDetalle}
          montoTotal={totalVendido}
          colorTotal="#15803d"
          columnas={[
            { key: 'venta_numero', label: 'Venta', nowrap: true },
            { key: 'producto', label: 'Producto' },
            { key: 'marca', label: 'Marca', render: f => f.marca || '—' },
            { key: 'modelo', label: 'Modelo', render: f => f.modelo || '—' },
            { key: 'color', label: 'Color', render: f => f.color || '—' },
            { key: 'numero_serie', label: 'N° Serie', render: f => f.numero_serie || '—' },
            { key: 'cantidad', label: 'Cant', right: true, render: f => fmt(f.cantidad) },
            { key: 'subtotal', label: 'Subtotal Bs', right: true, bold: true, nowrap: true, render: f => fmt(f.subtotal) },
          ]}
        />
      )}

      {cobros.length > 0 && (
        <TablaSeccion
          titulo="Cobros"
          filas={cobros}
          montoTotal={calc.totalCobros}
          colorTotal="#15803d"
          columnas={[
            { key: 'numero', label: 'N° Pago' },
            { key: 'venta_numero', label: 'Venta' },
            { key: 'cliente', label: 'Cliente' },
            { key: 'metodo_pago', label: 'Método', render: f => (f.metodo_pago ?? '').replace(/_/g, ' ') },
            { key: 'fecha', label: 'Fecha', render: f => fmtCorta(f.fecha) },
            { key: 'monto', label: 'Monto Bs', right: true, bold: true, nowrap: true, render: f => fmt(f.monto) },
          ]}
        />
      )}

      {gastos.length > 0 && (
        <TablaSeccion
          titulo="Gastos"
          filas={gastos}
          montoTotal={calc.totalGastos}
          colorTotal="#dc2626"
          columnas={[
            { key: 'numero', label: 'N° Gasto' },
            { key: 'categoria', label: 'Categoría' },
            { key: 'descripcion', label: 'Descripción' },
            { key: 'metodo_pago', label: 'Método', render: f => (f.metodo_pago ?? '').replace(/_/g, ' ') },
            { key: 'fecha', label: 'Fecha', render: f => fmtCorta(f.fecha) },
            { key: 'monto', label: 'Monto Bs', right: true, bold: true, nowrap: true, render: f => fmt(f.monto) },
          ]}
        />
      )}

      {pagosCompra.length > 0 && (
        <TablaSeccion
          titulo="Pago a proveedores"
          filas={pagosCompra}
          montoTotal={calc.totalCompras}
          colorTotal="#dc2626"
          columnas={[
            { key: 'numero', label: 'N° Pago' },
            { key: 'proveedor', label: 'Proveedor' },
            { key: 'metodo_pago', label: 'Método', render: f => (f.metodo_pago ?? '').replace(/_/g, ' ') },
            { key: 'fecha', label: 'Fecha', render: f => fmtCorta(f.fecha) },
            { key: 'monto', label: 'Monto Bs', right: true, bold: true, nowrap: true, render: f => fmt(f.monto) },
          ]}
        />
      )}

      <Footer />
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

const TotalesPorMetodo = ({ calc, fontSize = '10px' }) => {
  const { cobrosPM, gastosPM, comprasPM, totalCobros, totalGastos, totalCompras } = calc;
  const hayAlgo = totalCobros > 0 || totalGastos > 0 || totalCompras > 0;
  return (
    <div style={{ fontSize }}>
      {totalCobros > 0 && (
        <div style={{ marginBottom: '3px' }}>
          <div style={{ fontWeight: 'bold' }}>COBROS</div>
          {Object.entries(cobrosPM).map(([m, v]) => (
            <Row key={m} label={m.replace(/_/g, ' ')} value={fmt(v)} />
          ))}
          <Row label="Total cobros:" value={fmt(totalCobros)} bold />
        </div>
      )}
      {totalGastos > 0 && (
        <div style={{ marginBottom: '3px' }}>
          <div style={{ fontWeight: 'bold' }}>GASTOS</div>
          {Object.entries(gastosPM).map(([m, v]) => (
            <Row key={m} label={m.replace(/_/g, ' ')} value={fmt(v)} />
          ))}
          <Row label="Total gastos:" value={fmt(totalGastos)} bold />
        </div>
      )}
      {totalCompras > 0 && (
        <div style={{ marginBottom: '3px' }}>
          <div style={{ fontWeight: 'bold' }}>PAGO A PROVEEDORES</div>
          {Object.entries(comprasPM).map(([m, v]) => (
            <Row key={m} label={m.replace(/_/g, ' ')} value={fmt(v)} />
          ))}
          <Row label="Total pagos:" value={fmt(totalCompras)} bold />
        </div>
      )}
      {!hayAlgo && <div style={{ color: '#666' }}>Sin movimientos registrados</div>}
    </div>
  );
};

const CuadreEfectivo = ({ arqueo, calc, esAbierta, fontSize = '10px' }) => {
  const { cobrosEf, gastosEf, comprasEf, esperado, difNum } = calc;
  return (
    <div style={{ fontSize }}>
      <Row label="Monto apertura:" value={fmt(arqueo.monto_apertura)} />
      {cobrosEf > 0 && <Row label="+ Cobros efectivo:" value={fmt(cobrosEf)} />}
      {gastosEf > 0 && <Row label="- Gastos efectivo:" value={fmt(gastosEf)} />}
      {comprasEf > 0 && <Row label="- Pagos proveedores:" value={fmt(comprasEf)} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '2px', marginTop: '2px' }}>
        <span>TOTAL ESPERADO:</span>
        <span>{fmt(esperado)}</span>
      </div>
      {!esAbierta && (
        <>
          <Row label="Conteo físico real:" value={fmt(arqueo.monto_cierre_real)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>DIFERENCIA:</span>
            <span>{difNum >= 0 ? '+' : ''}{fmt(arqueo.diferencia)}</span>
          </div>
        </>
      )}
    </div>
  );
};

const TotalesPorMetodoA4 = ({ calc }) => {
  const { cobrosPM, gastosPM, comprasPM, totalCobros, totalGastos, totalCompras } = calc;
  const hayAlgo = totalCobros > 0 || totalGastos > 0 || totalCompras > 0;
  const Bloque = ({ titulo, datos, total, color }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '8px' }}>
      <tbody>
        <tr><td colSpan={2} style={{ fontWeight: 'bold', paddingBottom: '2px' }}>{titulo}</td></tr>
        {Object.entries(datos).map(([m, v]) => (
          <tr key={m}>
            <td style={{ padding: '1.5px 0', color: '#555' }}>{m.replace(/_/g, ' ')}</td>
            <td style={{ padding: '1.5px 0', textAlign: 'right' }}>Bs {fmt(v)}</td>
          </tr>
        ))}
        <tr style={{ borderTop: '1px solid #d4d4d8' }}>
          <td style={{ padding: '2px 0', fontWeight: 'bold' }}>Total</td>
          <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 'bold', color }}>Bs {fmt(total)}</td>
        </tr>
      </tbody>
    </table>
  );
  if (!hayAlgo) return <div style={{ fontSize: '9px', color: '#777' }}>Sin movimientos registrados</div>;
  return (
    <>
      {totalCobros > 0 && <Bloque titulo="Cobros" datos={cobrosPM} total={totalCobros} color="#15803d" />}
      {totalGastos > 0 && <Bloque titulo="Gastos" datos={gastosPM} total={totalGastos} color="#dc2626" />}
      {totalCompras > 0 && <Bloque titulo="Pago a proveedores" datos={comprasPM} total={totalCompras} color="#dc2626" />}
    </>
  );
};

const CuadreEfectivoA4 = ({ arqueo, calc, esAbierta }) => {
  const { cobrosEf, gastosEf, comprasEf, esperado, difNum } = calc;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', backgroundColor: '#fafafa', padding: '6px' }}>
      <tbody>
        <tr>
          <td style={{ padding: '2px 6px', color: '#555' }}>Monto apertura</td>
          <td style={{ padding: '2px 6px', textAlign: 'right' }}>Bs {fmt(arqueo.monto_apertura)}</td>
        </tr>
        {cobrosEf > 0 && (
          <tr>
            <td style={{ padding: '2px 6px', color: '#555' }}>+ Cobros en efectivo</td>
            <td style={{ padding: '2px 6px', textAlign: 'right', color: '#15803d' }}>Bs {fmt(cobrosEf)}</td>
          </tr>
        )}
        {gastosEf > 0 && (
          <tr>
            <td style={{ padding: '2px 6px', color: '#555' }}>- Gastos en efectivo</td>
            <td style={{ padding: '2px 6px', textAlign: 'right', color: '#dc2626' }}>Bs {fmt(gastosEf)}</td>
          </tr>
        )}
        {comprasEf > 0 && (
          <tr>
            <td style={{ padding: '2px 6px', color: '#555' }}>- Pagos a proveedores</td>
            <td style={{ padding: '2px 6px', textAlign: 'right', color: '#dc2626' }}>Bs {fmt(comprasEf)}</td>
          </tr>
        )}
        <tr style={{ borderTop: '1.5px solid #1a1a1a' }}>
          <td style={{ padding: '4px 6px', fontWeight: 'bold', fontSize: '10px' }}>Total esperado (sistema)</td>
          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px' }}>Bs {fmt(esperado)}</td>
        </tr>
        {!esAbierta && (
          <>
            <tr>
              <td style={{ padding: '3px 6px', color: '#555' }}>Conteo físico real</td>
              <td style={{ padding: '3px 6px', textAlign: 'right' }}>Bs {fmt(arqueo.monto_cierre_real)}</td>
            </tr>
            <tr style={{ borderTop: '2px solid #1a1a1a' }}>
              <td style={{ padding: '4px 6px', fontWeight: 'bold', fontSize: '10px', color: difNum === 0 ? '#52525b' : difNum > 0 ? '#15803d' : '#dc2626' }}>DIFERENCIA</td>
              <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', color: difNum === 0 ? '#52525b' : difNum > 0 ? '#15803d' : '#dc2626' }}>
                {difNum >= 0 ? '+' : ''}Bs {fmt(arqueo.diferencia)}
              </td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  );
};

const Pie = ({ e, fontSize = '11px' }) => (
  <div style={{ textAlign: 'center', fontSize, marginTop: '4px' }}>
    <div style={{ fontWeight: 'bold' }}>Documento interno de turno</div>
    <div style={{ marginTop: '2px' }}>Generado el {new Date().toLocaleString('es-BO')} — {e?.razon_social ?? ''}</div>
  </div>
);

/* ─── Página principal ────────────────────────────────────────────────────── */
export default function ArqueoImprimirDirecto() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(true);
  const [formato,  setFormato]  = useState('80mm');
  const { empresa, logoUrl } = useEmpresa() ?? {};

  useEffect(() => {
    cajaService.getArqueo(id)
      .then(r => setData(r.data))
      .catch(() => navigate(`/caja/arqueos/${id}`))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!data)    return null;

  const { arqueo, cobros = [], gastos = [], pagosCompra = [], ventasDetalle = [], monto_cierre_sistema_provisional } = data;
  const esAbierta = arqueo.estado === 'ABIERTA';
  const calc = calcular({ arqueo, cobros, gastos, pagosCompra, monto_cierre_sistema_provisional });

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
          onClick={() => navigate(`/caja/arqueos/${id}`)}
          className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
        >
          ← Volver
        </button>
      </div>

      {/* Preview */}
      <div className="flex justify-center p-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        {formato === 'A4'
          ? <TicketA4  arqueo={arqueo} calc={calc} cobros={cobros} gastos={gastos} pagosCompra={pagosCompra} ventasDetalle={ventasDetalle} empresa={empresa} logoUrl={logoUrl} esAbierta={esAbierta} />
          : formato === '110mm'
          ? <Ticket110 arqueo={arqueo} calc={calc} ventasDetalle={ventasDetalle} empresa={empresa} logoUrl={logoUrl} esAbierta={esAbierta} />
          : <Ticket80  arqueo={arqueo} calc={calc} ventasDetalle={ventasDetalle} empresa={empresa} logoUrl={logoUrl} esAbierta={esAbierta} />
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
