import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../services/reportes.service';
import { exportarCSV } from '../../utils/exportCsv';

// ── Helpers ───────────────────────────────────────────────────────────────
const hoy = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const fmt = (n) =>
  Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => Number(n || 0).toLocaleString('es-BO');

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
    { key: 'numero',          label: 'N°',           bold: true },
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
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">
          Consultar
        </button>
        <button onClick={() => exportarCSV(filas, 'ventas', cols.map(c => ({ key: c.key, label: c.label })))}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition-colors">
          ↓ CSV
        </button>
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
    { key: 'vendedor',    label: 'Vendedor',    bold: true },
    { key: 'sucursal',    label: 'Sucursal' },
    { key: 'num_ventas',  label: 'Nº Ventas',   align: 'right', render: v => fmtN(v) },
    { key: 'total_ventas',label: 'Total Bs',    align: 'right', render: v => fmt(v) },
    { key: 'total_bonos', label: 'Bonos Bs',    align: 'right', render: v => <span className="text-green-600 dark:text-green-400">{fmt(v)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <button onClick={() => exportarCSV(filas, 'ventas_vendedor', cols.map(c => ({ key: c.key, label: c.label })))}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition-colors">↓ CSV</button>
      </div>
      <Resumen items={[
        { label: 'Vendedores', valor: fmtN(filas.length) },
        { label: 'Total ventas', valor: `Bs ${fmt(totalVentas)}`, color: 'text-yellow-600 dark:text-yellow-400' },
        { label: 'Total bonos', valor: `Bs ${fmt(totalBonos)}`, color: 'text-green-600 dark:text-green-400' },
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
    { key: 'cliente',         label: 'Cliente',         bold: true },
    { key: 'tipo_cliente',    label: 'Tipo' },
    { key: 'num_compras',     label: 'Compras',         align: 'right', render: v => fmtN(v) },
    { key: 'total_comprado',  label: 'Total Bs',        align: 'right', render: v => fmt(v) },
    { key: 'saldo_pendiente', label: 'Saldo Bs',        align: 'right', render: v => Number(v) > 0 ? <span className="text-red-500">{fmt(v)}</span> : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <button onClick={() => exportarCSV(filas, 'ventas_cliente', cols.map(c => ({ key: c.key, label: c.label })))}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition-colors">↓ CSV</button>
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
    { key: 'codigo_interno',    label: 'Código' },
    { key: 'producto',          label: 'Producto',     bold: true },
    { key: 'marca',             label: 'Marca' },
    { key: 'categoria',         label: 'Categoría' },
    { key: 'cantidad_vendida',  label: 'Unidades',     align: 'right', render: v => fmtN(v) },
    { key: 'precio_promedio',   label: 'P. Prom Bs',   align: 'right', render: v => fmt(v) },
    { key: 'monto_total',       label: 'Total Bs',     align: 'right', render: v => fmt(v) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <button onClick={() => exportarCSV(filas, 'ventas_producto', cols.map(c => ({ key: c.key, label: c.label })))}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition-colors">↓ CSV</button>
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
        <button onClick={() => exportarCSV(filas, 'compras', cols.map(c => ({ key: c.key, label: c.label })))}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition-colors">↓ CSV</button>
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
    { key: 'cliente',         label: 'Cliente',         bold: true },
    { key: 'tipo_cliente',    label: 'Tipo' },
    { key: 'telefono',        label: 'Teléfono' },
    { key: 'limite_credito',  label: 'Límite Bs',       align: 'right', render: v => fmt(v) },
    { key: 'total_pendiente', label: 'Saldo Bs',        align: 'right', render: v => <span className="text-red-500 font-semibold">{fmt(v)}</span> },
    { key: 'dias_credito',    label: 'Días crédito',    align: 'right' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => exportarCSV(filas, 'cuentas_cobrar', cols.map(c => ({ key: c.key, label: c.label })))}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition-colors">↓ CSV</button>
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
    { key: 'codigo',          label: 'Código' },
    { key: 'proveedor',       label: 'Proveedor',       bold: true },
    { key: 'contacto_principal', label: 'Contacto' },
    { key: 'telefono',        label: 'Teléfono' },
    { key: 'plazo_credito_dias', label: 'Plazo (días)', align: 'right' },
    { key: 'total_pendiente', label: 'Saldo Bs',        align: 'right', render: v => <span className="text-red-500 font-semibold">{fmt(v)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => exportarCSV(filas, 'cuentas_pagar', cols.map(c => ({ key: c.key, label: c.label })))}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition-colors">↓ CSV</button>
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
    { key: 'cantidad_vendida',label: 'Unidades',     align: 'right', render: v => fmtN(v) },
    { key: 'ingresos',        label: 'Ingresos Bs',  align: 'right', render: v => fmt(v) },
    { key: 'costo_ventas',    label: 'Costo Bs',     align: 'right', render: v => fmt(v) },
    { key: 'utilidad_bruta',  label: 'Utilidad Bs',  align: 'right', render: v => <span className={Number(v) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{fmt(v)}</span> },
    { key: 'margen_pct',      label: 'Margen %',     align: 'right', render: v => <span className={Number(v) >= 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-500 font-semibold'}>{v}%</span> },
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
        <button onClick={() => exportarCSV(filas, 'rentabilidad', cols.map(c => ({ key: c.key, label: c.label })))}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition-colors">↓ CSV</button>
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
              {fila('Ventas brutas',       data.ingresos_brutos)}
              {fila('(-) Descuentos',      data.descuentos,        true, true)}
              {fila('(-) Devoluciones',    data.devoluciones,      true, true)}
              {fila('= Ingresos netos',    data.ingresos_netos,    false, false, false, true)}
              {fila('(-) Costo de ventas', data.costo_ventas,      true, true)}
              <div>
                {fila('= Utilidad bruta',  data.utilidad_bruta,    false, false, false, true)}
                <p className="text-right text-xs text-zinc-400 mb-1">Margen: {data.margen_bruto}%</p>
              </div>
              {fila('(-) Gastos operativos', data.gastos_operativos, true, true)}
              <div>
                {fila('= Resultado neto',  data.resultado_neto,    false, false, true)}
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
    { key: 'vendedor',         label: 'Vendedor',       bold: true },
    { key: 'sucursal',         label: 'Sucursal' },
    { key: 'num_ventas',       label: 'Ventas',         align: 'right', render: v => fmtN(v) },
    { key: 'unidades_vendidas',label: 'Unidades',       align: 'right', render: v => fmtN(v) },
    { key: 'total_ventas',     label: 'Monto ventas Bs',align: 'right', render: v => fmt(v) },
    { key: 'total_bonos',      label: 'Bonos Bs',       align: 'right', render: v => <span className="text-green-600 dark:text-green-400 font-semibold">{fmt(v)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">Consultar</button>
        <button onClick={() => exportarCSV(filas, 'bonos_vendedores', cols.map(c => ({ key: c.key, label: c.label })))}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition-colors">↓ CSV</button>
      </div>
      <Resumen items={[
        { label: 'Vendedores', valor: fmtN(filas.length) },
        { label: 'Total bonos', valor: `Bs ${fmt(totalBonos)}`, color: 'text-green-600 dark:text-green-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} />
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
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${colores[estado] || 'bg-zinc-100 text-zinc-600'}`}>
      {estado}
    </span>
  );
}

// ── Tabs config ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'ventas',             label: 'Ventas período',    icono: '🛍️', comp: RptVentas },
  { id: 'ventas-vendedor',    label: 'Por vendedor',      icono: '👤', comp: RptVentasVendedor },
  { id: 'ventas-cliente',     label: 'Por cliente',       icono: '👥', comp: RptVentasCliente },
  { id: 'ventas-producto',    label: 'Por producto',      icono: '📦', comp: RptVentasProducto },
  { id: 'compras',            label: 'Compras',           icono: '🛒', comp: RptCompras },
  { id: 'cuentas-cobrar',     label: 'Ctas. por cobrar',  icono: '💵', comp: RptCuentasCobrar },
  { id: 'cuentas-pagar',      label: 'Ctas. por pagar',   icono: '💴', comp: RptCuentasPagar },
  { id: 'rentabilidad',       label: 'Rentabilidad',      icono: '📈', comp: RptRentabilidad },
  { id: 'estado-resultados',  label: 'Estado resultados', icono: '📊', comp: RptEstadoResultados },
  { id: 'bonos',              label: 'Bonos vendedores',  icono: '🎯', comp: RptBonos },
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

      {/* Tabs navegación */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === t.id
                ? 'bg-yellow-400 text-zinc-900 shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <span className="text-base leading-none">{t.icono}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
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
