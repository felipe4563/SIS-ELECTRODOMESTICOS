import { useState, useEffect } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { fmt, fmtN, BtnPDF, Tabla, Resumen } from './ReportesShared';

export default function RptCuentasCobrar() {
  const [filas, setFilas]       = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    reportesService.getCuentasCobrar()
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, []);

  const total = filas.reduce((a, r) => a + Number(r.total_pendiente), 0);

  const cols = [
    { key: 'codigo',          label: 'Código' },
    { key: 'cliente',         label: 'Cliente',       bold: true },
    { key: 'tipo_cliente',    label: 'Tipo' },
    { key: 'telefono',        label: 'Teléfono' },
    { key: 'limite_credito',  label: 'Límite Bs',     align: 'right', render: v => fmt(v) },
    { key: 'total_pendiente', label: 'Saldo Bs',      align: 'right', render: v => <span className="text-red-500 font-semibold">{fmt(v)}</span> },
    { key: 'dias_credito',    label: 'Días crédito',  align: 'right' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <BtnPDF tipo="cuentas-cobrar" filtros={{}} />
      </div>
      <Resumen items={[
        { label: 'Clientes con deuda',  valor: fmtN(filas.length) },
        { label: 'Total por cobrar',    valor: `Bs ${fmt(total)}`, color: 'text-red-600 dark:text-red-400' },
      ]} />
      <Tabla columnas={cols} filas={filas} cargando={cargando} vacio="No hay cuentas pendientes" />
    </div>
  );
}
