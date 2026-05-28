import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../services/reportes.service';
import { exportarCSV } from '../../utils/exportCsv';

// ── Helpers ───────────────────────────────────────────────────────────────
const hoy = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const fmt  = (n) => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => Number(n || 0).toLocaleString('es-BO');

// ── Exportar a Excel/PDF via backend ─────────────────────────────────────
async function descargarExport(tipo, formato, filtros = {}) {
  try {
    const r = await reportesService.exportarReporte(tipo, formato, filtros);
    const ext  = formato === 'excel' ? 'xlsx' : 'pdf';
    const mime = formato === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';
    const url = URL.createObjectURL(new Blob([r.data], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tipo}-${filtros.fecha_desde || ''}-${filtros.fecha_hasta || ''}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // silently ignore — backend will return error blob
  }
}

// ── Componentes base ──────────────────────────────────────────────────────
function FiltroFechas({ filtros, onChange }) {
  return (
    <>
      <div>
        <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Desde</label>
        <input type="date" value={filtros.fecha_desde} onChange={e => onChange('fecha_desde', e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400" />
      </div>
      <div>
        <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Hasta</label>
        <input type="date" value={filtros.fecha_hasta} onChange={e => onChange('fecha_hasta', e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400" />
      </div>
    </>
  );
}

function BtnCSV({ filas, nombre, cols }) {
  return (
    <button onClick={() => exportarCSV(filas, nombre, cols.map(c => ({ key: c.key, label: c.label })))}
      className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition-colors">
      ↓ CSV
    </button>
  );
}

function BtnExcel({ tipo, filtros }) {
  return (
    <button onClick={() => descargarExport(tipo, 'excel', filtros)}
      className="px-3 py-2 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-700 dark:text-green-400 font-semibold text-sm rounded-xl transition-colors border border-green-200 dark:border-green-500/30">
      ↓ Excel
    </button>
  );
}

function BtnPDF({ tipo, filtros }) {
  return (
    <button onClick={() => descargarExport(tipo, 'pdf', filtros)}
      className="px-3 py-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 font-semibold text-sm rounded-xl transition-colors border border-red-200 dark:border-red-500/30">
      ↓ PDF
    </button>
  );
}

function Tabla({ columnas, filas, cargando, vacio }) {
  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!filas || filas.length === 0) {
    return <p className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">{vacio || 'Sin resultados'}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            {columnas.map(c => (
              <th key={c.key} className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {filas.map((fila, i) => (
            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
              {columnas.map(c => (
                <td key={c.key} className={`px-3 py-2.5 text-zinc-700 dark:text-zinc-300 ${c.align === 'right' ? 'text-right font-mono' : ''} ${c.bold ? 'font-semibold text-zinc-900 dark:text-white' : ''}`}>
                  {c.render ? c.render(fila[c.key], fila) : (fila[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Resumen({ items }) {
  return (
    <div className="flex flex-wrap gap-3 px-1 pb-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="text-zinc-400 dark:text-zinc-500">{it.label}:</span>
          <span className={`font-semibold ${it.color || 'text-zinc-900 dark:text-white'}`}>{it.valor}</span>
        </div>
      ))}
    </div>
  );
}

// ── Badge de estado ───────────────────────────────────────────────────────
function EstadoBadge({ estado }) {
  const colores = {
    EMITIDA:     'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    PAGADA:      'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    PARCIAL:     'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    ANULADA:     'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    BORRADOR:    'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400',
    DEVUELTA:    'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    CONFIRMADO:  'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    RECIBIDO:    'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    PRE_PEDIDO:  'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400',
    POR_LLEGAR:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    ABIERTA:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    CERRADA:     'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${colores[estado] || 'bg-zinc-100 text-zinc-600'}`}>
      {estado}
    </span>
  );
}

function EfectoBadge({ efecto }) {
  const c = efecto === 'ENTRADA' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
          : efecto === 'SALIDA'  ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400';
  return <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${c}`}>{efecto}</span>;
}

// ── REPORTE: Ventas por período ───────────────────────────────────────────
function RptVentas() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getVentas(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);

  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));
  const totales = filas.reduce((a, r) => ({ total: a.total + Number(r.total), cant: a.cant + 1 }), { total: 0, cant: 0 });

  const cols = [
    { key: 'numero',          label: 'N°',          bold: true },
    { key: 'fecha',           label: 'Fecha' },
    { key: 'cliente',         label: 'Cliente' },
    { key: 'vendedor',        label: 'Vendedor' },
    { key: 'sucursal',        label: 'Sucursal' },
    { key: 'condicion_pago',  label: 'Condición' },
    { key: 'total',           label: 'Total',        align: 'right', render: v => `Bs ${fmt(v)}` },
    { key: 'saldo_pendiente', label: 'Saldo',        align: 'right', render: v => Number(v) > 0 ? <span className="text-red-500">{`Bs ${fmt(v)}`}</span> : <span className="text-green-500">Pagado</span> },
    { key: 'estado',          label: 'Estado',       render: v => <EstadoBadge estado={v} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <BtnCSV filas={filas} nombre="ventas" cols={cols} />
        <BtnExcel tipo="ventas" filtros={filtros} />
        <BtnPDF tipo="ventas" filtros={filtros} />
      </div>
      <Resumen items={[
        { label: 'Transacciones', valor: fmtN(totales.cant) },
        { label: 'Total', valor: `Bs ${fmt(totales.total)}`, color: 'text-yellow-600 dark:text-yellow-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}

// ── REPORTE: Ventas por vendedor ──────────────────────────────────────────
function RptVentasVendedor() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getVentasVendedor(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totalVentas = filas.reduce((a, r) => a + Number(r.total_ventas), 0);
  const totalBonos  = filas.reduce((a, r) => a + Number(r.total_bonos), 0);

  const cols = [
    { key: 'vendedor',    label: 'Vendedor',   bold: true },
    { key: 'sucursal',    label: 'Sucursal' },
    { key: 'num_ventas',  label: 'Nº Ventas',  align: 'right', render: v => fmtN(v) },
    { key: 'total_ventas',label: 'Total Bs',   align: 'right', render: v => fmt(v) },
    { key: 'total_bonos', label: 'Bonos Bs',   align: 'right', render: v => <span className="text-green-600 dark:text-green-400">{fmt(v)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <BtnCSV filas={filas} nombre="ventas_vendedor" cols={cols} />
      </div>
      <Resumen items={[
        { label: 'Vendedores', valor: fmtN(filas.length) },
        { label: 'Total ventas', valor: `Bs ${fmt(totalVentas)}`, color: 'text-yellow-600 dark:text-yellow-400' },
        { label: 'Total bonos',  valor: `Bs ${fmt(totalBonos)}`,  color: 'text-green-600 dark:text-green-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}

// ── REPORTE: Ventas por cliente ───────────────────────────────────────────
function RptVentasCliente() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getVentasCliente(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const cols = [
    { key: 'codigo',          label: 'Código' },
    { key: 'cliente',         label: 'Cliente',        bold: true },
    { key: 'tipo_cliente',    label: 'Tipo' },
    { key: 'num_compras',     label: 'Compras',        align: 'right', render: v => fmtN(v) },
    { key: 'total_comprado',  label: 'Total Bs',       align: 'right', render: v => fmt(v) },
    { key: 'saldo_pendiente', label: 'Saldo Bs',       align: 'right', render: v => Number(v) > 0 ? <span className="text-red-500">{fmt(v)}</span> : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <BtnCSV filas={filas} nombre="ventas_cliente" cols={cols} />
      </div>
      <Resumen items={[{ label: 'Clientes', valor: fmtN(filas.length) }]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}

// ── REPORTE: Ventas por producto ──────────────────────────────────────────
function RptVentasProducto() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getVentasProducto(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const cols = [
    { key: 'codigo_interno',   label: 'Código' },
    { key: 'producto',         label: 'Producto',    bold: true },
    { key: 'marca',            label: 'Marca' },
    { key: 'categoria',        label: 'Categoría' },
    { key: 'cantidad_vendida', label: 'Unidades',    align: 'right', render: v => fmtN(v) },
    { key: 'precio_promedio',  label: 'P. Prom Bs',  align: 'right', render: v => fmt(v) },
    { key: 'monto_total',      label: 'Total Bs',    align: 'right', render: v => fmt(v) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <BtnCSV filas={filas} nombre="ventas_producto" cols={cols} />
      </div>
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}

// ── REPORTE: Compras ──────────────────────────────────────────────────────
function RptCompras() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getCompras(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const total = filas.reduce((a, r) => a + Number(r.total), 0);

  const cols = [
    { key: 'numero',          label: 'N°',         bold: true },
    { key: 'fecha_pedido',    label: 'Fecha' },
    { key: 'proveedor',       label: 'Proveedor' },
    { key: 'sucursal',        label: 'Sucursal' },
    { key: 'condicion_pago',  label: 'Condición' },
    { key: 'total',           label: 'Total Bs',   align: 'right', render: v => fmt(v) },
    { key: 'saldo_pendiente', label: 'Saldo Bs',   align: 'right', render: v => Number(v) > 0 ? <span className="text-red-500">{fmt(v)}</span> : '—' },
    { key: 'estado',          label: 'Estado',     render: v => <EstadoBadge estado={v} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <BtnCSV filas={filas} nombre="compras" cols={cols} />
        <BtnExcel tipo="compras" filtros={filtros} />
        <BtnPDF tipo="compras" filtros={filtros} />
      </div>
      <Resumen items={[
        { label: 'Compras', valor: fmtN(filas.length) },
        { label: 'Total', valor: `Bs ${fmt(total)}`, color: 'text-blue-600 dark:text-blue-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}

// ── REPORTE: Cuentas por cobrar ───────────────────────────────────────────
function RptCuentasCobrar() {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    reportesService.getCuentasCobrar()
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, []);

  const total = filas.reduce((a, r) => a + Number(r.total_pendiente), 0);

  const cols = [
    { key: 'codigo',          label: 'Código' },
    { key: 'cliente',         label: 'Cliente',        bold: true },
    { key: 'tipo_cliente',    label: 'Tipo' },
    { key: 'telefono',        label: 'Teléfono' },
    { key: 'limite_credito',  label: 'Límite Bs',      align: 'right', render: v => fmt(v) },
    { key: 'total_pendiente', label: 'Saldo Bs',       align: 'right', render: v => <span className="text-red-500 font-semibold">{fmt(v)}</span> },
    { key: 'dias_credito',    label: 'Días crédito',   align: 'right' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <BtnCSV filas={filas} nombre="cuentas_cobrar" cols={cols} />
        <BtnExcel tipo="cuentas-cobrar" filtros={{}} />
        <BtnPDF tipo="cuentas-cobrar" filtros={{}} />
      </div>
      <Resumen items={[
        { label: 'Clientes con deuda', valor: fmtN(filas.length) },
        { label: 'Total por cobrar', valor: `Bs ${fmt(total)}`, color: 'text-red-600 dark:text-red-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="No hay cuentas pendientes" />
    </div>
  );
}

// ── REPORTE: Cuentas por pagar ────────────────────────────────────────────
function RptCuentasPagar() {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    reportesService.getCuentasPagar()
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, []);

  const total = filas.reduce((a, r) => a + Number(r.total_pendiente), 0);

  const cols = [
    { key: 'codigo',             label: 'Código' },
    { key: 'proveedor',          label: 'Proveedor',      bold: true },
    { key: 'contacto_principal', label: 'Contacto' },
    { key: 'telefono',           label: 'Teléfono' },
    { key: 'plazo_credito_dias', label: 'Plazo (días)',   align: 'right' },
    { key: 'total_pendiente',    label: 'Saldo Bs',       align: 'right', render: v => <span className="text-red-500 font-semibold">{fmt(v)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <BtnCSV filas={filas} nombre="cuentas_pagar" cols={cols} />
        <BtnExcel tipo="cuentas-pagar" filtros={{}} />
        <BtnPDF tipo="cuentas-pagar" filtros={{}} />
      </div>
      <Resumen items={[
        { label: 'Proveedores con deuda', valor: fmtN(filas.length) },
        { label: 'Total por pagar', valor: `Bs ${fmt(total)}`, color: 'text-red-600 dark:text-red-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="No hay cuentas pendientes" />
    </div>
  );
}

// ── REPORTE: Rentabilidad ─────────────────────────────────────────────────
function RptRentabilidad() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy(), agrupar_por: 'producto' });
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getRentabilidad(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totIngresos = filas.reduce((a, r) => a + Number(r.ingresos), 0);
  const totUtilidad = filas.reduce((a, r) => a + Number(r.utilidad_bruta || 0), 0);

  const cols = [
    { key: 'grupo',           label: filtros.agrupar_por === 'marca' ? 'Marca' : filtros.agrupar_por === 'categoria' ? 'Categoría' : 'Producto', bold: true },
    { key: 'cantidad_vendida',label: 'Unidades',    align: 'right', render: v => fmtN(v) },
    { key: 'ingresos',        label: 'Ingresos Bs', align: 'right', render: v => fmt(v) },
    { key: 'costo_ventas',    label: 'Costo Bs',    align: 'right', render: v => fmt(v) },
    { key: 'utilidad_bruta',  label: 'Utilidad Bs', align: 'right', render: v => <span className={Number(v) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{fmt(v)}</span> },
    { key: 'margen_pct',      label: 'Margen %',    align: 'right', render: v => <span className={Number(v) >= 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-500 font-semibold'}>{v}%</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <div>
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Agrupar por</label>
          <select value={filtros.agrupar_por} onChange={e => f('agrupar_por', e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400">
            <option value="producto">Producto</option>
            <option value="marca">Marca</option>
            <option value="categoria">Categoría</option>
          </select>
        </div>
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <BtnCSV filas={filas} nombre="rentabilidad" cols={cols} />
        <BtnExcel tipo="rentabilidad" filtros={filtros} />
        <BtnPDF tipo="rentabilidad" filtros={filtros} />
      </div>
      <Resumen items={[
        { label: 'Ingresos', valor: `Bs ${fmt(totIngresos)}`, color: 'text-zinc-900 dark:text-white' },
        { label: 'Utilidad bruta', valor: `Bs ${fmt(totUtilidad)}`, color: totUtilidad >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500' },
        { label: 'Margen', valor: totIngresos > 0 ? `${((totUtilidad / totIngresos) * 100).toFixed(1)}%` : '—', color: 'text-yellow-600 dark:text-yellow-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}

// ── REPORTE: Estado de resultados ─────────────────────────────────────────
function RptEstadoResultados() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getEstadoResultados(filtros)
      .then(r => { setData(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const fila = (label, valor, indent, negativo, total, subtotal) => (
    <div className={`flex justify-between py-2.5 ${indent ? 'pl-6' : ''} ${total ? 'border-t-2 border-zinc-900 dark:border-white mt-1' : subtotal ? 'border-t border-zinc-200 dark:border-zinc-700' : ''}`}>
      <span className={`text-sm ${total ? 'font-bold text-zinc-900 dark:text-white' : subtotal ? 'font-semibold text-zinc-700 dark:text-zinc-300' : 'text-zinc-600 dark:text-zinc-400'}`}>{label}</span>
      <span className={`text-sm font-mono font-semibold ${total ? 'text-zinc-900 dark:text-white text-base' : negativo ? Number(valor) < 0 ? 'text-red-500' : 'text-red-400' : Number(valor) >= 0 ? 'text-zinc-900 dark:text-white' : 'text-red-500'}`}>
        {negativo ? `(Bs ${fmt(Math.abs(valor))})` : `Bs ${fmt(valor)}`}
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
      </div>
      {cargando && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {data && !cargando && (
        <div className="max-w-xl">
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="font-bold text-zinc-900 dark:text-white">Estado de Resultados</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{data.periodo.desde} al {data.periodo.hasta}</p>
            </div>
            <div className="px-6 py-4 divide-y divide-zinc-100 dark:divide-zinc-800">
              {fila('Ventas brutas',        data.ingresos_brutos)}
              {fila('(-) Descuentos',       data.descuentos,        true, true)}
              {fila('(-) Devoluciones',     data.devoluciones,      true, true)}
              {fila('= Ingresos netos',     data.ingresos_netos,    false, false, false, true)}
              {fila('(-) Costo de ventas',  data.costo_ventas,      true, true)}
              <div>
                {fila('= Utilidad bruta',   data.utilidad_bruta,    false, false, false, true)}
                <p className="text-right text-xs text-zinc-400 mb-1">Margen: {data.margen_bruto}%</p>
              </div>
              {fila('(-) Gastos operativos',data.gastos_operativos, true, true)}
              <div>
                {fila('= Resultado neto',   data.resultado_neto,    false, false, true)}
                <p className="text-right text-xs text-zinc-400 mt-0.5">Margen neto: {data.margen_neto}%</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── REPORTE: Bonos por vendedor ───────────────────────────────────────────
function RptBonos() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getBonosVendedores(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totalBonos = filas.reduce((a, r) => a + Number(r.total_bonos), 0);

  const cols = [
    { key: 'vendedor',          label: 'Vendedor',        bold: true },
    { key: 'sucursal',          label: 'Sucursal' },
    { key: 'num_ventas',        label: 'Ventas',          align: 'right', render: v => fmtN(v) },
    { key: 'unidades_vendidas', label: 'Unidades',        align: 'right', render: v => fmtN(v) },
    { key: 'total_ventas',      label: 'Monto ventas Bs', align: 'right', render: v => fmt(v) },
    { key: 'total_bonos',       label: 'Bonos Bs',        align: 'right', render: v => <span className="text-green-600 dark:text-green-400 font-semibold">{fmt(v)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <BtnCSV filas={filas} nombre="bonos_vendedores" cols={cols} />
      </div>
      <Resumen items={[
        { label: 'Vendedores', valor: fmtN(filas.length) },
        { label: 'Total bonos', valor: `Bs ${fmt(totalBonos)}`, color: 'text-green-600 dark:text-green-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
    </div>
  );
}

// ── REPORTE: Stock consolidado ────────────────────────────────────────────
function RptStockConsolidado() {
  const [filtros, setFiltros] = useState({ con_stock: '1' });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getStockConsolidado(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totalUnidades = filas.reduce((a, r) => a + Number(r.cantidad), 0);
  const alertas       = filas.filter(r => Number(r.cantidad_disponible) <= Number(r.stock_minimo)).length;

  const cols = [
    { key: 'codigo_interno',        label: 'Código' },
    { key: 'producto',              label: 'Producto',     bold: true },
    { key: 'marca',                 label: 'Marca' },
    { key: 'categoria',             label: 'Categoría' },
    { key: 'deposito',              label: 'Depósito' },
    { key: 'cantidad',              label: 'Cantidad',     align: 'right', render: v => fmtN(v) },
    { key: 'cantidad_reservada',    label: 'Reservado',    align: 'right', render: v => fmtN(v) },
    { key: 'cantidad_disponible',   label: 'Disponible',   align: 'right', render: (v, r) => (
        <span className={Number(v) <= Number(r.stock_minimo) ? 'text-red-500 font-semibold' : 'text-green-600 dark:text-green-400 font-semibold'}>
          {fmtN(v)}
        </span>
      )
    },
    { key: 'costo_promedio',        label: 'Costo Prom.',  align: 'right', render: v => fmt(v) },
    { key: 'precio_publico',        label: 'P. Público',   align: 'right', render: v => `Bs ${fmt(v)}` },
    { key: 'stock_minimo',          label: 'Mínimo',       align: 'right', render: v => fmtN(v) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="con_stock" checked={filtros.con_stock === '1'}
            onChange={e => f('con_stock', e.target.checked ? '1' : '')}
            className="w-4 h-4 accent-yellow-400" />
          <label htmlFor="con_stock" className="text-sm text-zinc-600 dark:text-zinc-400">Solo con stock</label>
        </div>
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <BtnCSV filas={filas} nombre="stock" cols={cols} />
        <BtnExcel tipo="stock" filtros={filtros} />
        <BtnPDF tipo="stock" filtros={filtros} />
      </div>
      <Resumen items={[
        { label: 'Líneas', valor: fmtN(filas.length) },
        { label: 'Total unidades', valor: fmtN(totalUnidades) },
        { label: 'Bajo mínimo', valor: fmtN(alertas), color: alertas > 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="Sin registros de stock" />
    </div>
  );
}

// ── REPORTE: Kardex de producto ───────────────────────────────────────────
function RptKardex() {
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [data, setData]       = useState(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoProds, setCargandoProds] = useState(false);

  useEffect(() => {
    if (busqueda.length < 2) { setProductos([]); return; }
    setCargandoProds(true);
    import('../../services/productos.service').then(m => {
      m.productosService.getAll()
        .then(r => {
          const todos = r.data?.productos || r.data || [];
          const q = busqueda.toLowerCase();
          setProductos(todos.filter(p =>
            p.producto?.toLowerCase().includes(q) || p.codigo_interno?.toLowerCase().includes(q)
          ).slice(0, 20));
          setCargandoProds(false);
        })
        .catch(() => setCargandoProds(false));
    });
  }, [busqueda]);

  const consultar = (prod) => {
    setSeleccionado(prod);
    setBusqueda('');
    setProductos([]);
    setCargando(true);
    reportesService.getKardexProducto(prod.id_producto, filtros)
      .then(r => { setData(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  };

  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const colsMov = [
    { key: 'fecha',             label: 'Fecha' },
    { key: 'tipo_movimiento',   label: 'Tipo',         bold: true },
    { key: 'efecto',            label: 'Efecto',       render: v => <EfectoBadge efecto={v} /> },
    { key: 'deposito',          label: 'Depósito' },
    { key: 'cantidad',          label: 'Cantidad',     align: 'right', render: v => fmtN(v) },
    { key: 'costo_unitario',    label: 'Costo Unit.',  align: 'right', render: v => fmt(v) },
    { key: 'saldo_cantidad',    label: 'Saldo Cant.',  align: 'right', render: v => fmtN(v) },
    { key: 'documento_tipo',    label: 'Doc. Tipo' },
    { key: 'documento_numero',  label: 'Doc. N°' },
    { key: 'usuario',           label: 'Usuario' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative">
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Buscar producto</label>
          <input
            type="text"
            value={seleccionado && !busqueda ? `${seleccionado.codigo_interno} – ${seleccionado.producto}` : busqueda}
            onChange={e => { setBusqueda(e.target.value); setSeleccionado(null); }}
            placeholder="Nombre o código..."
            className="w-64 px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400"
          />
          {productos.length > 0 && (
            <div className="absolute top-full left-0 z-20 mt-1 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden">
              {cargandoProds && <div className="px-3 py-2 text-xs text-zinc-400">Buscando...</div>}
              {productos.map(p => (
                <button key={p.id_producto} onClick={() => consultar(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  <span className="font-mono text-xs text-zinc-400 mr-2">{p.codigo_interno}</span>
                  <span className="text-zinc-800 dark:text-zinc-200">{p.producto}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <FiltroFechas filtros={filtros} onChange={f} />
        {seleccionado && (
          <button onClick={() => consultar(seleccionado)}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">
            Actualizar
          </button>
        )}
      </div>

      {!seleccionado && !data && (
        <p className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">Busca y selecciona un producto para ver su kardex</p>
      )}
      {data && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-zinc-900 dark:text-white">{data.producto?.producto}</p>
              <p className="text-xs text-zinc-400">{data.producto?.codigo_interno} · {data.movimientos?.length} movimientos</p>
            </div>
            <BtnCSV filas={data.movimientos || []} nombre="kardex" cols={colsMov} />
          </div>
          <Tabla columnas={colsMov} filas={data.movimientos || []} cargando={cargando} vacio="Sin movimientos en el período" />
        </>
      )}
    </div>
  );
}

// ── REPORTE: Arqueos de caja ──────────────────────────────────────────────
function RptArqueosCaja() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getArqueosCaja(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const cols = [
    { key: 'caja',                  label: 'Caja',          bold: true },
    { key: 'sucursal',              label: 'Sucursal' },
    { key: 'usuario',               label: 'Usuario' },
    { key: 'fecha_apertura',        label: 'Apertura' },
    { key: 'fecha_cierre',          label: 'Cierre',        render: v => v || '—' },
    { key: 'monto_apertura',        label: 'Apertura Bs',   align: 'right', render: v => fmt(v) },
    { key: 'monto_cierre_sistema',  label: 'Sistema Bs',    align: 'right', render: v => v != null ? fmt(v) : '—' },
    { key: 'monto_cierre_real',     label: 'Real Bs',       align: 'right', render: v => v != null ? fmt(v) : '—' },
    { key: 'diferencia',            label: 'Diferencia Bs', align: 'right', render: v => v != null ? (
        <span className={Number(v) < 0 ? 'text-red-500 font-semibold' : Number(v) > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>{fmt(v)}</span>
      ) : '—'
    },
    { key: 'estado',                label: 'Estado',        render: v => <EstadoBadge estado={v} /> },
  ];

  const totalAperturas = filas.reduce((a, r) => a + Number(r.monto_apertura), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <BtnCSV filas={filas} nombre="arqueos_caja" cols={cols} />
      </div>
      <Resumen items={[
        { label: 'Arqueos', valor: fmtN(filas.length) },
        { label: 'Total apertura', valor: `Bs ${fmt(totalAperturas)}` },
        { label: 'Abiertos', valor: fmtN(filas.filter(r => r.estado === 'ABIERTA').length), color: 'text-yellow-600 dark:text-yellow-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="Sin arqueos en el período" />
    </div>
  );
}

// ── REPORTE: Gastos por categoría ─────────────────────────────────────────
function RptGastosCategoria() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [data, setData]       = useState(null);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getGastosCategoria(filtros)
      .then(r => { setData(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const filas = data?.categorias || [];
  const tot   = data?.totales;

  const cols = [
    { key: 'categoria',    label: 'Categoría',    bold: true },
    { key: 'num_gastos',   label: 'N° Gastos',    align: 'right', render: v => fmtN(v) },
    { key: 'total_monto',  label: 'Total Bs',     align: 'right', render: v => `Bs ${fmt(v)}` },
    { key: 'efectivo',     label: 'Efectivo Bs',  align: 'right', render: v => fmt(v) },
    { key: 'otros_metodos',label: 'Otros Bs',     align: 'right', render: v => fmt(v) },
  ];

  const totalMonto = filas.reduce((a, r) => a + Number(r.total_monto), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <BtnCSV filas={filas} nombre="gastos_categoria" cols={cols} />
        <BtnExcel tipo="gastos-categoria" filtros={filtros} />
        <BtnPDF tipo="gastos-categoria" filtros={filtros} />
      </div>
      {tot && (
        <Resumen items={[
          { label: 'Total gastos', valor: fmtN(tot.cantidad) },
          { label: 'Monto total', valor: `Bs ${fmt(tot.total)}`, color: 'text-red-600 dark:text-red-400' },
        ]} />
      )}

      {/* Barras por categoría */}
      {!cargando && filas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          {filas.map((r, i) => {
            const pct = totalMonto > 0 ? (Number(r.total_monto) / totalMonto) * 100 : 0;
            const colores = ['bg-yellow-400','bg-blue-400','bg-purple-400','bg-green-400','bg-orange-400','bg-pink-400'];
            return (
              <div key={i} className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3">
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{r.categoria}</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">Bs {fmt(r.total_monto)}</span>
                </div>
                <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div className={`h-full ${colores[i % colores.length]} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-zinc-400 mt-1">{pct.toFixed(1)}% · {r.num_gastos} gastos</p>
              </div>
            );
          })}
        </div>
      )}

      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="Sin gastos en el período" />
    </div>
  );
}

// ── REPORTE: Top productos ────────────────────────────────────────────────
function RptTopProductos() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy(), limit: 10 });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getTopProductos(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const maxQty = filas.length > 0 ? Number(filas[0].cantidad_vendida) : 1;
  const totalMonto = filas.reduce((a, r) => a + Number(r.monto_total), 0);

  const cols = [
    { key: 'codigo_interno',   label: 'Código' },
    { key: 'producto',         label: 'Producto',     bold: true },
    { key: 'marca',            label: 'Marca' },
    { key: 'categoria',        label: 'Categoría' },
    { key: 'cantidad_vendida', label: 'Unidades',     align: 'right', render: v => fmtN(v) },
    { key: 'precio_promedio',  label: 'P. Prom Bs',   align: 'right', render: v => fmt(v) },
    { key: 'monto_total',      label: 'Total Bs',     align: 'right', render: v => fmt(v) },
    { key: 'total_bonos',      label: 'Bonos Bs',     align: 'right', render: v => <span className="text-green-600 dark:text-green-400">{fmt(v)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <div>
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Top N</label>
          <select value={filtros.limit} onChange={e => f('limit', e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400">
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
          </select>
        </div>
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <BtnCSV filas={filas} nombre="top_productos" cols={cols} />
        <BtnExcel tipo="top-productos" filtros={filtros} />
        <BtnPDF tipo="top-productos" filtros={filtros} />
      </div>

      <Resumen items={[
        { label: 'Productos', valor: fmtN(filas.length) },
        { label: 'Total vendido', valor: `Bs ${fmt(totalMonto)}`, color: 'text-yellow-600 dark:text-yellow-400' },
      ]} />

      {/* Barras visuales */}
      {!cargando && filas.length > 0 && (
        <div className="space-y-2">
          {filas.map((p, i) => {
            const pct = (Number(p.cantidad_vendida) / maxQty) * 100;
            return (
              <div key={p.codigo_interno} className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-400 w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{p.producto}</span>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white ml-2 shrink-0">{fmtN(p.cantidad_vendida)} uds</span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 w-24 text-right">Bs {fmt(p.monto_total)}</span>
              </div>
            );
          })}
        </div>
      )}

      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="Sin ventas en el período" />
    </div>
  );
}

// ── Tabs config ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'ventas',             label: 'Ventas período',    icono: '🛍️', comp: RptVentas },
  { id: 'ventas-vendedor',    label: 'Por vendedor',      icono: '👤', comp: RptVentasVendedor },
  { id: 'ventas-cliente',     label: 'Por cliente',       icono: '👥', comp: RptVentasCliente },
  { id: 'ventas-producto',    label: 'Por producto',      icono: '📦', comp: RptVentasProducto },
  { id: 'top-productos',      label: 'Top productos',     icono: '🏆', comp: RptTopProductos },
  { id: 'compras',            label: 'Compras',           icono: '🛒', comp: RptCompras },
  { id: 'cuentas-cobrar',     label: 'Ctas. por cobrar',  icono: '💵', comp: RptCuentasCobrar },
  { id: 'cuentas-pagar',      label: 'Ctas. por pagar',   icono: '💴', comp: RptCuentasPagar },
  { id: 'rentabilidad',       label: 'Rentabilidad',      icono: '📈', comp: RptRentabilidad },
  { id: 'estado-resultados',  label: 'Estado resultados', icono: '📊', comp: RptEstadoResultados },
  { id: 'bonos',              label: 'Bonos vendedores',  icono: '🎯', comp: RptBonos },
  { id: 'stock',              label: 'Stock',             icono: '🏭', comp: RptStockConsolidado },
  { id: 'kardex',             label: 'Kardex',            icono: '📋', comp: RptKardex },
  { id: 'arqueos-caja',       label: 'Arqueos caja',      icono: '💰', comp: RptArqueosCaja },
  { id: 'gastos-categoria',   label: 'Gastos',            icono: '💸', comp: RptGastosCategoria },
];

// ── Página principal ──────────────────────────────────────────────────────
export default function Reportes() {
  const [tab, setTab] = useState('ventas');
  const tabActual = TABS.find(t => t.id === tab);
  const Comp = tabActual?.comp;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Reportes</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Análisis y estadísticas del negocio</p>
      </div>

      {/* Tabs navegación — scroll horizontal en móvil */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-1.5 min-w-max pb-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                tab === t.id
                  ? 'bg-yellow-400 text-zinc-900 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <span className="text-base leading-none">{t.icono}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panel del reporte activo */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xl">{tabActual?.icono}</span>
          <h2 className="font-semibold text-zinc-900 dark:text-white">{tabActual?.label}</h2>
        </div>
        {Comp && <Comp />}
      </div>
    </div>
  );
}
