export function exportarCSV(datos, nombreArchivo, columnas) {
  if (!datos || datos.length === 0) return;
  const cabecera = columnas.map(c => `"${c.label}"`).join(',');
  const filas = datos.map(row =>
    columnas.map(c => {
      const v = row[c.key] ?? '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    }).join(',')
  );
  const csv = [cabecera, ...filas].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
