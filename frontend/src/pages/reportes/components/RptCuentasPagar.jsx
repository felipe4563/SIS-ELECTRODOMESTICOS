import { useState, useEffect } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { fmt, fmtN, BtnPDF, Tabla, Resumen } from './ReportesShared';

export default function RptCuentasPagar() {
  const [filas, setFilas]       = useState([]);
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
        <BtnPDF tipo="cuentas-pagar" filtros={{}} />
      </div>
      <Resumen items={[
        { label: 'Proveedores con deuda', valor: fmtN(filas.length) },
        { label: 'Total por pagar',       valor: `Bs ${fmt(total)}`, color: 'text-red-600 dark:text-red-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="No hay cuentas pendientes" />
    </div>
  );
}
