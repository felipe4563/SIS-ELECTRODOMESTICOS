import { useState, useEffect, useCallback, useMemo } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { exportarArqueosPDF } from './ArqueosPDF';
import { useEmpresa } from '../../../contexts/EmpresaContext';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, Tabla, Resumen, EstadoBadge } from './ReportesShared';

const SELECT = 'border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors';

export default function RptArqueosCaja() {
  const { empresa, logoUrl }          = useEmpresa();
  const [filtros, setFiltros]         = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas]             = useState([]);
  const [cargando, setCargando]       = useState(false);
  const [idUsuario, setIdUsuario]     = useState('');
  const [exportando, setExportando]   = useState(false);
  const [errorExport, setErrorExport] = useState('');

  const buscar = useCallback(() => {
    setCargando(true);
    setIdUsuario('');
    setErrorExport('');
    reportesService.getArqueosCaja(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  const handleExportPDF = async () => {
    setExportando(true);
    setErrorExport('');
    try {
      await exportarArqueosPDF({ filas: filasFiltradas, filtros, empresa, logoUrl });
    } catch (e) {
      setErrorExport(e.message || 'Error al generar PDF');
    } finally {
      setExportando(false);
    }
  };

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const usuarios = useMemo(() =>
    filas.map(r => r.usuario)
         .filter((v, i, arr) => arr.indexOf(v) === i)
         .sort((a, b) => a.localeCompare(b)),
    [filas]
  );

  const filasFiltradas = idUsuario
    ? filas.filter(r => r.usuario === idUsuario)
    : filas;

  const totalAperturas = filasFiltradas.reduce((a, r) => a + Number(r.monto_apertura), 0);
  const abiertos       = filasFiltradas.filter(r => r.estado === 'ABIERTA').length;

  const cols = [
    { key: 'caja',                 label: 'Caja',          bold: true },
    { key: 'sucursal',             label: 'Sucursal' },
    { key: 'usuario',              label: 'Usuario' },
    { key: 'fecha_apertura',       label: 'Apertura' },
    { key: 'fecha_cierre',         label: 'Cierre',        render: v => v || '—' },
    { key: 'monto_apertura',       label: 'Apertura Bs',   align: 'right', render: v => fmt(v) },
    { key: 'monto_cierre_sistema', label: 'Sistema Bs',    align: 'right', render: v => v != null ? fmt(v) : '—' },
    { key: 'monto_cierre_real',    label: 'Real Bs',       align: 'right', render: v => v != null ? fmt(v) : '—' },
    { key: 'diferencia',           label: 'Diferencia Bs', align: 'right', render: v => v != null ? (
        <span className={Number(v) < 0 ? 'text-red-500 font-semibold' : Number(v) > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>{fmt(v)}</span>
      ) : '—'
    },
    { key: 'estado', label: 'Estado', render: v => <EstadoBadge estado={v} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <BtnConsultar onClick={buscar} />
        <button
          onClick={handleExportPDF}
          disabled={exportando || filasFiltradas.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                     bg-yellow-400 text-zinc-900 hover:bg-yellow-300
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exportando
            ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-zinc-700 border-t-transparent rounded-full" /> Generando...</>
            : <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Exportar PDF
              </>
          }
        </button>
      </div>

      {errorExport && (
        <p className="text-sm text-red-500 dark:text-red-400">{errorExport}</p>
      )}

      {/* Filtro por usuario */}
      {usuarios.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap">
            Usuario
          </label>
          <select
            value={idUsuario}
            onChange={e => setIdUsuario(e.target.value)}
            className={SELECT}
          >
            <option value="">Todos ({filas.length})</option>
            {usuarios.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          {idUsuario && (
            <button
              onClick={() => setIdUsuario('')}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline whitespace-nowrap"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      <Resumen items={[
        { label: 'Arqueos',        valor: fmtN(filasFiltradas.length) },
        { label: 'Total apertura', valor: `Bs ${fmt(totalAperturas)}` },
        { label: 'Abiertos',       valor: fmtN(abiertos), color: abiertos > 0 ? 'text-yellow-600 dark:text-yellow-400' : '' },
      ]} />

      <Tabla columnas={cols} filas={filasFiltradas} cargando={cargando} vacio="Sin arqueos en el período" />
    </div>
  );
}
