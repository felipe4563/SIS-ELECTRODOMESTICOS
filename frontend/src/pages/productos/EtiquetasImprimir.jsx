import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { isBluetoothSupported, connectTomatePrinter, renderLabelDetallado, renderLabelSimple } from '../../lib/tomatePrinter';
import { useEmpresa } from '../../contexts/EmpresaContext';

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://appmg.arletgroup.com';

export default function EtiquetasImprimir() {
  const navigate     = useNavigate();
  const { state }    = useLocation();
  const { empresa }  = useEmpresa() ?? {};
  const empresaNombre = empresa?.nombre_comercial || empresa?.razon_social || '';
  const [items, setItems]   = useState([]);
  const [qrUrls, setQrUrls] = useState({});
  const [modo, setModo]     = useState('detallado'); // 'detallado' | 'simple'

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

  // Si el producto tiene series cargadas, una etiqueta por cada serie (con su
  // número real). Si no, se respeta la cantidad de copias y el campo de
  // serie queda vacío para completarlo a mano.
  const printLabels = items.flatMap(item =>
    item.series?.length
      ? item.series.map(s => ({ ...item, numero_serie: s.numero_serie ?? s }))
      : Array.from({ length: item.copias }, () => ({ ...item, numero_serie: '' }))
  );

  // La primera página de un lote de impresión se rasterizaba mal si todavía
  // no habían terminado de cargar/decodificar los QR — bloqueamos los
  // botones de imprimir hasta que estén listos para evitar esa carrera.
  const qrListo = items.every(item => !item.codigo_interno || qrUrls[item.codigo_interno]);

  const [btEstado, setBtEstado] = useState('idle'); // idle | conectando | imprimiendo | error
  const [btProgreso, setBtProgreso] = useState({ actual: 0, total: 0 });
  const [btError, setBtError] = useState('');

  const imprimirPorBluetooth = async () => {
    setBtError('');
    if (!isBluetoothSupported()) {
      setBtError('Este navegador no soporta Bluetooth. Usá Chrome, Edge o Brave (con el flag "Web Bluetooth API" activado en brave://flags).');
      setBtEstado('error');
      return;
    }
    let printer;
    try {
      setBtEstado('conectando');
      printer = await connectTomatePrinter();
      setBtEstado('imprimiendo');
      setBtProgreso({ actual: 0, total: printLabels.length });
      for (let i = 0; i < printLabels.length; i++) {
        const item = printLabels[i];
        const canvas = modo === 'detallado'
          ? await renderLabelDetallado(item, qrUrls[item.codigo_interno], empresaNombre)
          : await renderLabelSimple(item, qrUrls[item.codigo_interno]);
        await printer.printCanvas(canvas);
        setBtProgreso({ actual: i + 1, total: printLabels.length });
      }
      setBtEstado('idle');
    } catch (err) {
      setBtError(err?.message || 'No se pudo imprimir por Bluetooth. Verificá que la impresora esté encendida y cerca.');
      setBtEstado('error');
    } finally {
      printer?.disconnect();
    }
  };

  return (
    <>
      {/* ── Barra acciones (solo pantalla) ─────────────────────────────── */}
      <div className="no-print fixed top-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-center justify-between shadow-sm gap-3 flex-wrap">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          ← Volver
        </button>
        <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 p-0.5">
          <button
            onClick={() => setModo('detallado')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              modo === 'detallado' ? 'bg-yellow-400 text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Detallado
          </button>
          <button
            onClick={() => setModo('simple')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              modo === 'simple' ? 'bg-yellow-400 text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Solo QR
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={imprimirPorBluetooth}
            disabled={!qrListo || btEstado === 'conectando' || btEstado === 'imprimiendo'}
            className="px-4 py-1.5 rounded-xl border border-blue-400 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
          >
            {btEstado === 'conectando' && '🔵 Conectando…'}
            {btEstado === 'imprimiendo' && `🔵 Imprimiendo ${btProgreso.actual}/${btProgreso.total}…`}
            {(btEstado === 'idle' || btEstado === 'error') && '🔵 Imprimir por Bluetooth'}
          </button>
          <button
            onClick={() => window.print()}
            disabled={!qrListo}
            className="px-4 py-1.5 rounded-xl bg-yellow-400 text-zinc-900 text-sm font-semibold hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {qrListo ? '🖨 Imprimir' : 'Generando QR…'}
          </button>
        </div>
      </div>

      {/* ── Vista previa (solo pantalla) ───────────────────────────────── */}
      <div className="no-print pt-16 pb-8 px-4 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        <div className="max-w-2xl mx-auto space-y-3 pt-4">
          <p className="text-xs text-zinc-500 mb-2">
            Rollo de etiquetas 40mm × 60mm. <strong>Detallado</strong> imprime empresa, producto, marca,
            modelo, color, capacidad y N° de serie junto al QR. <strong>Solo QR</strong> imprime únicamente
            el código QR con el nombre y código del producto. Los productos con series cargadas imprimen
            una etiqueta por cada serie; el resto respeta la cantidad de copias.
          </p>
          {btError && (
            <div className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              ⚠ {btError}
            </div>
          )}
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
                <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                  {[item.marca, item.modelo, item.color, item.capacidad].filter(Boolean).join(' · ')}
                </p>
                {item.series?.length > 0 ? (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                    {item.series.length} serie{item.series.length === 1 ? '' : 's'} cargada{item.series.length === 1 ? '' : 's'} → {item.series.length} etiqueta{item.series.length === 1 ? '' : 's'}
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                    {APP_URL}/p/{item.codigo_interno}
                  </p>
                )}
              </div>
              {!(item.series?.length > 0) && (
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs text-zinc-500">Copias</label>
                  <input
                    type="number" min="1" max="99"
                    value={item.copias}
                    onChange={e => setCopias(idx, e.target.value)}
                    className="w-16 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Zona de impresión (solo al imprimir) ───────────────────────── */}
      <div className="print-zone">
        {printLabels.map((item, idx) => (
          <div key={`${item.codigo_interno ?? ''}-${item.numero_serie ?? ''}-${idx}`} className="etiqueta">
            {modo === 'detallado' ? (
              // Contenido diseñado en horizontal (60×40) y rotado 90° con CSS
              // para que entre en el rollo físico de 40×60.
              <div className="etq-rot">
                <div className="etq-fila-sup">
                  <div className="etq-qr">
                    {qrUrls[item.codigo_interno] && (
                      <img src={qrUrls[item.codigo_interno]} alt={item.codigo_interno} style={{ width: '100%', height: '100%', display: 'block' }} />
                    )}
                  </div>
                  <div className="etq-datos">
                    {empresaNombre && <p className="etq-empresa">{empresaNombre}</p>}
                    <p className="etq-campo">{item.nombre}</p>
                    {item.marca     && <p className="etq-campo">Marca: {item.marca}</p>}
                    {item.modelo    && <p className="etq-campo">Modelo: {item.modelo}</p>}
                    {item.color     && <p className="etq-campo">Color: {item.color}</p>}
                    {item.capacidad && <p className="etq-campo">Cap: {item.capacidad}</p>}
                  </div>
                </div>
                <div className="etq-serie">
                  N° Serie: {item.numero_serie || '_______________'}
                </div>
              </div>
            ) : (
              <div className="etq-simple">
                {qrUrls[item.codigo_interno] && (
                  <img src={qrUrls[item.codigo_interno]} alt={item.codigo_interno} className="etq-simple-qr" />
                )}
                <p className="etq-simple-nombre">{item.nombre}</p>
                <p className="etq-simple-codigo">{item.codigo_interno}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── CSS de impresión ───────────────────────────────────────────── */}
      <style>{`
        .print-zone { display: none; }
        .etiqueta:last-child { page-break-after: avoid; }
        @media print {
          /* El rollo de etiquetas es físicamente de 40mm de ancho (across
             el cabezal) × 60mm de largo (sentido de avance del papel). */
          @page { size: 40mm 60mm; margin: 0; }
          .no-print  { display: none !important; }
          .print-zone { display: block !important; }
          .etiqueta {
            page-break-after: always;
            width: 40mm;
            height: 60mm;
            overflow: hidden;
            background: white;
            font-family: sans-serif;
            color: #000;
            /* Centrado por flexbox en vez de position:absolute + top/left
               50% — ese centrado por porcentaje dependía de que el
               navegador ya tuviera resuelta la altura final de la etiqueta,
               y en la primera página de un lote (antes de que terminara de
               asentarse el layout) se calculaba mal y el contenido salía
               comprimido/encimado. Flexbox no tiene ese problema. */
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* Modo detallado: caja natural de 60×40, rotada 90° para entrar
             en la etiqueta de 40×60. */
          .etq-rot {
            width: 60mm;
            height: 40mm;
            flex-shrink: 0;
            transform: rotate(90deg);
            padding: 2mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }
          /* Alturas fijas (no flex:1) para que el reparto de espacio no
             dependa de cuándo termina de cargar la imagen del QR — con
             flex:1 la primera etiqueta de un lote podía calcular mal la
             altura antes de que el QR cargara y empujaba el renglón de
             N° de serie hacia arriba, encimado con el resto del texto. */
          .etq-fila-sup {
            display: flex;
            flex-direction: row;
            gap: 2mm;
            height: 27mm;
          }
          .etq-qr {
            width: 24mm;
            height: 24mm;
            flex-shrink: 0;
            align-self: center;
          }
          .etq-datos {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 0.3mm;
            overflow: hidden;
          }
          .etq-empresa {
            font-size: 6.5pt;
            font-weight: 700;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .etq-campo {
            font-size: 5.5pt;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .etq-serie {
            height: 9mm;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 6.5pt;
            font-weight: 700;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* Modo simple: QR + nombre + código, centrado, sin rotar. */
          .etq-simple {
            width: 100%;
            height: 100%;
            padding: 2mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1mm;
          }
          .etq-simple-qr {
            width: 28mm;
            height: 28mm;
            display: block;
          }
          .etq-simple-nombre {
            font-size: 5.5pt;
            text-align: center;
            max-width: 36mm;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .etq-simple-codigo {
            font-size: 7pt;
            font-weight: 700;
            font-family: monospace;
            letter-spacing: 0.02em;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
}
