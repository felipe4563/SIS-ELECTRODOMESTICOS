import { StockReporteHTML } from './StockReporte';

/* ─── Botón "Imprimir" + documento oculto + CSS de impresión (window.print) ──
   Aísla toda la lógica de impresión directa del stock consolidado, separada
   del botón de descarga de PDF (StockReporte.jsx → descargarStockReportePDF). */
export default function StockImprimirBoton({ productos, depositos, empresa, logoUrl, filtros, preparando, onAntesDeImprimir }) {
  const handleClick = async () => {
    if (onAntesDeImprimir) await onAntesDeImprimir();
    // Espera un tick para que el documento oculto se actualice con los
    // productos recién cargados antes de disparar el diálogo de impresión.
    await new Promise(r => setTimeout(r, 50));
    window.print();
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={preparando}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all disabled:opacity-50"
      >
        <span className="hidden sm:inline">{preparando ? 'Preparando…' : 'Imprimir'}</span>
        <span className="sm:hidden">🖨️</span>
      </button>

      {/* Documento oculto — solo visible al imprimir (window.print) */}
      <div className="hidden print:block">
        <StockReporteHTML
          productos={productos}
          depositos={depositos}
          empresa={empresa}
          logoUrl={logoUrl}
          filtros={filtros}
        />
      </div>

      {/* CSS de impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #documento-stock, #documento-stock * { visibility: visible !important; }
          #documento-stock {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: #000 !important;
          }
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>
    </>
  );
}
