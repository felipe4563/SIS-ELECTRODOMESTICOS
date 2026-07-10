import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, Tabla, Resumen } from './ReportesShared';

export default function RptComprasProveedor() {
  const [filtros, setFiltros] = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas]     = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getComprasProveedor(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totales = filas.reduce((a, r) => ({
    total: a.total + Number(r.total_comprado),
    cant:  a.cant  + Number(r.num_compras),
  }), { total: 0, cant: 0 });

  const cols = [
    { key: 'codigo',           label: 'Código',     bold: true },
    { key: 'proveedor',        label: 'Proveedor' },
    { key: 'contacto_principal', label: 'Contacto' },
    { key: 'telefono',         label: 'Teléfono' },
    { key: 'num_compras',      label: 'Compras',    align: 'right', render: v => fmtN(v) },
    { key: 'total_comprado',   label: 'Total Bs',   align: 'right', render: v => `Bs ${fmt(v)}` },
    { key: 'total_pendiente',  label: 'Pendiente',  align: 'right', render: v => Number(v) > 0
        ? <span className="text-red-500">Bs {fmt(v)}</span>
        : <span className="text-green-500">Al día</span> },
    { key: 'ultima_compra',    label: 'Última compra' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <BtnConsultar onClick={buscar} />
      </div>
      <Resumen items={[
        { label: 'Proveedores', valor: fmtN(filas.length) },
        { label: 'Órdenes',     valor: fmtN(totales.cant) },
        { label: 'Total',       valor: `Bs ${fmt(totales.total)}`, color: 'text-yellow-600 dark:text-yellow-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="Sin compras en el período" />
    </div>
  );
}
