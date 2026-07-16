import { useState, useEffect, useCallback, useMemo } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { exportarBonosPDF } from './BonosPDF';
import { useEmpresa } from '../../../contexts/EmpresaContext';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, Tabla, Resumen } from './ReportesShared';

const SELECT = 'border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors';

export default function RptBonos() {
  const { empresa, logoUrl }        = useEmpresa();
  const [filtros, setFiltros]       = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [filas, setFilas]           = useState([]);
  const [cargando, setCargando]     = useState(false);
  const [idVendedor, setIdVendedor] = useState('');
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState('');

  const buscar = useCallback(() => {
    setCargando(true);
    setIdVendedor('');
    setErrorExport('');
    reportesService.getBonosVendedores(filtros)
      .then(r => { setFilas(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  const handleExportPDF = async () => {
    setExportando(true);
    setErrorExport('');
    try {
      await exportarBonosPDF({ filtros, empresa, logoUrl });
    } catch (e) {
      setErrorExport(e.message || 'Error al generar PDF');
    } finally {
      setExportando(false);
    }
  };

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  // Lista de vendedores únicos extraída del resultado
  const vendedores = useMemo(() =>
    filas.map(r => ({ id: r.id_usuario, nombre: r.vendedor }))
         .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
         .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [filas]
  );

  const filasFiltradas = idVendedor
    ? filas.filter(r => String(r.id_usuario) === idVendedor)
    : filas;

  const totalBonos = filasFiltradas.reduce((a, r) => a + Number(r.total_bonos), 0);

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
        <BtnConsultar onClick={buscar} />
        <button
          onClick={handleExportPDF}
          disabled={exportando || filas.length === 0}
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
                Exportar PDF detallado
              </>
          }
        </button>
      </div>
      {errorExport && (
        <p className="text-sm text-red-500 dark:text-red-400">{errorExport}</p>
      )}

      {/* Filtro por vendedor */}
      {vendedores.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap">
            Vendedor
          </label>
          <select
            value={idVendedor}
            onChange={e => setIdVendedor(e.target.value)}
            className={SELECT}
          >
            <option value="">Todos ({filas.length})</option>
            {vendedores.map(v => (
              <option key={v.id} value={v.id}>{v.nombre}</option>
            ))}
          </select>
          {idVendedor && (
            <button
              onClick={() => setIdVendedor('')}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline whitespace-nowrap"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      <Resumen items={[
        { label: 'Vendedores',   valor: fmtN(filasFiltradas.length) },
        { label: 'Total bonos',  valor: `Bs ${fmt(totalBonos)}`, color: 'text-green-600 dark:text-green-400' },
      ]} />
      <Tabla columnas={cols} filas={filasFiltradas} cargando={cargando} />
    </div>
  );
}
