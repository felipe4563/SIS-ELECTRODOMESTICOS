import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';

export default function EtiquetasImprimir() {
  const navigate        = useNavigate();
  const { state }       = useLocation();
  const [items, setItems]             = useState([]);
  const [barcodeUrls, setBarcodeUrls] = useState({});

  useEffect(() => {
    if (!state?.etiquetas?.length) { navigate(-1); return; }
    setItems(state.etiquetas.map(e => ({ ...e, copias: e.copias ?? 1 })));
  }, []); // eslint-disable-line

  useEffect(() => {
    if (items.length === 0) return;
    const urls = {};
    for (const item of items) {
      if (!item.codigo_barras || urls[item.codigo_barras]) continue;
      try {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        JsBarcode(svg, item.codigo_barras, {
          format:       'CODE128',
          width:        1.4,
          height:       48,
          displayValue: true,
          fontSize:     8,
          margin:       2,
          textMargin:   1,
        });
        const svgStr = new XMLSerializer().serializeToString(svg);
        urls[item.codigo_barras] =
          'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
      } catch { /* código inválido — se ignora */ }
    }
    setBarcodeUrls(urls);
  }, [items]);

  const setCopias = (idx, val) =>
    setItems(prev => prev.map((it, i) =>
      i === idx ? { ...it, copias: Math.max(1, Math.min(99, Number(val) || 1)) } : it
    ));

  const printLabels = items.flatMap(item =>
    Array.from({ length: item.copias }, () => item)
  );

  return (
    <>
      {/* ── Barra acciones (solo pantalla) ─────────────────────────────── */}
      <div className="no-print fixed top-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          ← Volver
        </button>
        <span className="font-semibold text-zinc-900 dark:text-white text-sm">
          Etiquetas de productos
        </span>
        <button
          onClick={() => window.print()}
          className="px-4 py-1.5 rounded-xl bg-yellow-400 text-zinc-900 text-sm font-semibold hover:bg-yellow-500 transition-colors"
        >
          🖨 Imprimir
        </button>
      </div>

      {/* ── Vista previa (solo pantalla) ───────────────────────────────── */}
      <div className="no-print pt-16 pb-8 px-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        <div className="max-w-2xl mx-auto space-y-3 pt-4">
          <p className="text-xs text-zinc-500 mb-2">
            Etiquetas 30mm × 20mm — Code 128. Ajusta las copias por producto.
          </p>
          {items.map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-4"
            >
              <div className="shrink-0 bg-white p-1 rounded">
                {barcodeUrls[item.codigo_barras] ? (
                  <img
                    src={barcodeUrls[item.codigo_barras]}
                    alt={item.codigo_barras}
                    className="h-12 w-auto"
                  />
                ) : (
                  <div className="h-12 w-24 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {item.nombre}
                </p>
                <p className="text-xs font-mono text-zinc-500">{item.codigo_barras}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs text-zinc-500">Copias</label>
                <input
                  type="number" min="1" max="99"
                  value={item.copias}
                  onChange={e => setCopias(idx, e.target.value)}
                  className="w-16 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Zona de impresión (solo al imprimir) ───────────────────────── */}
      <div className="print-zone">
        {printLabels.map((item, idx) => (
          <div key={`${item.codigo_barras ?? ''}-${idx}`} className="etiqueta">
            {barcodeUrls[item.codigo_barras] && (
              <img
                src={barcodeUrls[item.codigo_barras]}
                alt={item.codigo_barras}
                style={{ width: '28mm', height: 'auto', display: 'block' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── CSS de impresión ───────────────────────────────────────────── */}
      <style>{`
        .print-zone { display: none; }
        .etiqueta:last-child { page-break-after: avoid; }
        @media print {
          @page { size: 30mm 20mm; margin: 0; }
          .no-print  { display: none !important; }
          .print-zone { display: block !important; }
          .etiqueta {
            page-break-after: always;
            width: 30mm;
            height: 20mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1mm;
            box-sizing: border-box;
            overflow: hidden;
            background: white;
          }
        }
      `}</style>
    </>
  );
}
