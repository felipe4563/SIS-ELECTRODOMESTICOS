import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://megaelectra.rusoft.dev';

export default function EtiquetasImprimir() {
  const navigate     = useNavigate();
  const { state }    = useLocation();
  const [items, setItems]   = useState([]);
  const [qrUrls, setQrUrls] = useState({});

  useEffect(() => {
    if (!state?.etiquetas?.length) { navigate(-1); return; }
    setItems(state.etiquetas.map(e => ({ ...e, copias: e.copias ?? 1 })));
  }, []); // eslint-disable-line

  useEffect(() => {
    if (items.length === 0) return;
    const generar = async () => {
      const urls = {};
      for (const item of items) {
        if (!item.codigo_interno || urls[item.codigo_interno]) continue;
        try {
          urls[item.codigo_interno] = await QRCode.toDataURL(
            `${APP_URL}/p/${item.codigo_interno}`,
            { width: 320, margin: 1, errorCorrectionLevel: 'M' }
          );
        } catch { /* código inválido — se ignora */ }
      }
      setQrUrls(urls);
    };
    generar();
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
          Etiquetas QR de productos
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
            Etiquetas 40mm × 40mm — Código QR con enlace al producto. Ajusta las copias por producto.
          </p>
          {items.map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-4"
            >
              <div className="shrink-0 bg-white p-1 rounded">
                {qrUrls[item.codigo_interno] ? (
                  <img
                    src={qrUrls[item.codigo_interno]}
                    alt={item.codigo_interno}
                    className="w-16 h-16"
                  />
                ) : (
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {item.nombre}
                </p>
                <p className="text-xs font-mono text-zinc-500">{item.codigo_interno}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                  {APP_URL}/p/{item.codigo_interno}
                </p>
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
          <div key={`${item.codigo_interno ?? ''}-${idx}`} className="etiqueta">
            {qrUrls[item.codigo_interno] && (
              <img
                src={qrUrls[item.codigo_interno]}
                alt={item.codigo_interno}
                style={{ width: '34mm', height: '34mm', display: 'block' }}
              />
            )}
            <p style={{
              fontSize: '7pt',
              textAlign: 'center',
              margin: '1mm 0 0 0',
              maxWidth: '38mm',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              fontFamily: 'sans-serif',
            }}>
              {item.nombre}
            </p>
          </div>
        ))}
      </div>

      {/* ── CSS de impresión ───────────────────────────────────────────── */}
      <style>{`
        .print-zone { display: none; }
        .etiqueta:last-child { page-break-after: avoid; }
        @media print {
          @page { size: 40mm 40mm; margin: 0; }
          .no-print  { display: none !important; }
          .print-zone { display: block !important; }
          .etiqueta {
            page-break-after: always;
            width: 40mm;
            height: 40mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2mm;
            box-sizing: border-box;
            overflow: hidden;
            background: white;
          }
        }
      `}</style>
    </>
  );
}
