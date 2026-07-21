import { useEffect, useRef, useState, useCallback } from 'react';

let jsQRLib = null;

export default function EscanerQR({ onScan, onClose }) {
  const videoRef        = useRef(null);
  const canvasRef       = useRef(null);
  const streamRef       = useRef(null);
  const rafRef          = useRef(null);
  const detectorRef     = useRef(null);
  const detectadoRef    = useRef(false);

  const [estado,    setEstado]    = useState('iniciando'); // iniciando | activo | error | detectado
  const [errorMsg,  setErrorMsg]  = useState('');

  const manejarDeteccion = useCallback((valor) => {
    if (detectadoRef.current) return;
    detectadoRef.current = true;
    setEstado('detectado');
    // Breve pausa visual antes de cerrar
    setTimeout(() => {
      onScan(valor.trim());
    }, 350);
  }, [onScan]);

  // Iniciar cámara
  useEffect(() => {
    let cancelado = false;

    const iniciar = async () => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        if (!cancelado) {
          setErrorMsg('Sin acceso a la cámara. Verificá los permisos del navegador.');
          setEstado('error');
        }
        return;
      }

      if (cancelado) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch {}
      }

      // BarcodeDetector nativo (Chrome 83+, Safari 17.4+, Edge 83+)
      if ('BarcodeDetector' in window) {
        try {
          detectorRef.current = new window.BarcodeDetector({
            formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'code_39', 'upc_a', 'upc_e'],
          });
        } catch {}
      }

      // jsQR como fallback (solo QR)
      if (!detectorRef.current && !jsQRLib) {
        try { jsQRLib = (await import('jsqr')).default; } catch {}
      }

      if (!cancelado) setEstado('activo');
    };

    iniciar();
    return () => {
      cancelado = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Loop de escaneo
  useEffect(() => {
    if (estado !== 'activo') return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;

    const tick = async () => {
      if (detectadoRef.current || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Opción 1: BarcodeDetector nativo
      if (detectorRef.current) {
        try {
          const hits = await detectorRef.current.detect(video);
          if (hits.length > 0) { manejarDeteccion(hits[0].rawValue); return; }
        } catch {}
      }

      // Opción 2: jsQR en canvas
      if (jsQRLib && canvas) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hit = jsQRLib(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (hit) { manejarDeteccion(hit.data); return; }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [estado, manejarDeteccion]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-950 rounded-t-2xl sm:rounded-2xl border border-zinc-800 w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-sm font-semibold text-white">Escanear código</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Visor */}
        <div className="relative bg-black" style={{ aspectRatio: '1' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Marco de guía */}
          {estado === 'activo' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative" style={{ width: 200, height: 200 }}>
                {/* Esquinas */}
                {[
                  { top: 0,    left: 0,    borderTop: '3px solid', borderLeft: '3px solid',   borderColor: '#facc15', width: 24, height: 24, borderRadius: '2px 0 0 0' },
                  { top: 0,    right: 0,   borderTop: '3px solid', borderRight: '3px solid',  borderColor: '#facc15', width: 24, height: 24, borderRadius: '0 2px 0 0' },
                  { bottom: 0, left: 0,    borderBottom: '3px solid', borderLeft: '3px solid', borderColor: '#facc15', width: 24, height: 24, borderRadius: '0 0 0 2px' },
                  { bottom: 0, right: 0,   borderBottom: '3px solid', borderRight: '3px solid', borderColor: '#facc15', width: 24, height: 24, borderRadius: '0 0 2px 0' },
                ].map((s, i) => (
                  <div key={i} style={{ position: 'absolute', ...s }} />
                ))}
                {/* Línea de escaneo */}
                <div style={{
                  position: 'absolute', left: 8, right: 8, height: 2,
                  background: 'linear-gradient(90deg, transparent, #facc15, transparent)',
                  animation: 'scanLine 1.8s ease-in-out infinite',
                }} />
              </div>
              {/* Overlay oscuro fuera del marco */}
              <div style={{
                position: 'absolute', inset: 0,
                background: `
                  radial-gradient(ellipse 220px 220px at 50% 50%,
                    transparent 95px,
                    rgba(0,0,0,0.55) 96px)
                `,
                pointerEvents: 'none',
              }} />
            </div>
          )}

          {/* Flash de detección */}
          {estado === 'detectado' && (
            <div className="absolute inset-0 bg-yellow-400/25 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-400/50">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          )}

          {/* Spinner de inicio */}
          {estado === 'iniciando' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-400">Iniciando cámara…</p>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Footer */}
        <div className="px-4 py-3 text-center">
          {estado === 'error' ? (
            <p className="text-sm text-red-400">{errorMsg}</p>
          ) : estado === 'detectado' ? (
            <p className="text-sm text-yellow-400 font-semibold">Código detectado</p>
          ) : (
            <p className="text-xs text-zinc-500">Apuntá la cámara al código QR o de barras</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 8px;   opacity: 1; }
          50%  { top: 184px; opacity: 0.8; }
          100% { top: 8px;   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
