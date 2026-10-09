// Driver para impresoras de etiquetas térmicas BLE económicas tipo "Tomate T-IM5001"
// (la misma familia de hardware genérico que usan apps como "Print Label"). A
// diferencia de la "cat printer" (GB01, protocolo propietario por bitmap),
// estas usan TSPL (Thermal Shipping/Smart Label) — comandos de texto en
// ASCII, con el bitmap como payload binario dentro del comando BITMAP.
//
// No tenemos el hardware a mano para confirmar el UUID exacto del servicio
// BLE: estos módulos casi siempre son un clon HM-10 (servicio FFE0/char
// FFE1) o un módulo Microchip RN4870 "transparent UART" (servicio
// 49535343-...). Probamos ambos en orden. Si el dispositivo aparece en el
// selector pero falla la conexión al servicio, puede que use Bluetooth
// clásico (SPP) en vez de BLE — Chrome/Web Bluetooth no puede hablarle a
// Bluetooth clásico bajo ningún punto de vista; en ese caso solo queda la
// app Android "Print Label" o el cable USB.

const CANDIDATOS = [
  { servicio: '0000ffe0-0000-1000-8000-00805f9b34fb', write: '0000ffe1-0000-1000-8000-00805f9b34fb', nombre: 'HM-10/FFE0' },
  { servicio: '49535343-fe7d-4ae5-8fa9-9fafd205e455', write: '49535343-1e4d-4bd9-ba61-23c647249616', nombre: 'RN4870/UART' },
];

const DPI          = 203;
const DOTS_PER_MM   = DPI / 25.4; // ≈ 7.99 ≈ 8
// El rollo físico es de 40mm de ancho (across el cabezal) × 60mm de largo
// (sentido de avance) — esto es constante para los dos modos de etiqueta.
const LABEL_W_MM    = 40;
const LABEL_H_MM    = 60;
const DOTS_WIDTH    = Math.round(LABEL_W_MM * DOTS_PER_MM / 8) * 8; // múltiplo de 8
const DOTS_HEIGHT   = Math.round(LABEL_H_MM * DOTS_PER_MM / 8) * 8;
const BYTES_PER_ROW = DOTS_WIDTH / 8;

// El contenido "detallado" (QR a la izquierda + datos a la derecha) está
// diseñado naturalmente en horizontal (60×40) y después se rota 90° para
// que entre en el rollo de 40×60 — igual que se hace con CSS/transform en
// la versión para PC.
const CONTENT_W_MM = 60;
const CONTENT_H_MM = 40;
const CONTENT_DOTS_W = Math.round(CONTENT_W_MM * DOTS_PER_MM / 8) * 8;
const CONTENT_DOTS_H = Math.round(CONTENT_H_MM * DOTS_PER_MM / 8) * 8;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

function strToBytes(s) {
  return new TextEncoder().encode(s + '\r\n');
}

function concatBytes(arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

// ── Conexión ────────────────────────────────────────────────────────────────
export async function connectTomatePrinter() {
  if (!isBluetoothSupported()) {
    throw new Error('Este navegador no soporta Web Bluetooth. Usá Chrome, Edge o Brave (con el flag "Web Bluetooth API" activado en brave://flags).');
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: CANDIDATOS.map(c => c.servicio),
  });
  const server = await device.gatt.connect();

  let writeChar = null;
  for (const cand of CANDIDATOS) {
    try {
      const service = await server.getPrimaryService(cand.servicio);
      writeChar = await service.getCharacteristic(cand.write);
      break;
    } catch { /* probar el siguiente candidato */ }
  }

  if (!writeChar) {
    device.gatt.disconnect();
    throw new Error(
      `"${device.name || 'El dispositivo'}" no expone ninguno de los servicios Bluetooth esperados. ` +
      'Si el dispositivo aparece en la lista pero no conecta, es posible que use Bluetooth clásico (SPP) ' +
      'en vez de Bluetooth de baja energía — en ese caso el navegador no puede imprimir directamente y hay ' +
      'que usar la app Android "Print Label" o el cable USB.'
    );
  }

  const write = async (bytes) => {
    // Muchos módulos BLE baratos tienen un buffer interno chico; mandamos
    // de a trozos cortos con una pequeña pausa, igual que con la cat printer.
    const CHUNK = 100;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const trozo = bytes.subarray(i, i + CHUNK);
      if (writeChar.writeValueWithoutResponse) await writeChar.writeValueWithoutResponse(trozo);
      else await writeChar.writeValue(trozo);
      await sleep(15);
    }
  };

  const disconnect = () => {
    try { device.gatt.disconnect(); } catch { /* noop */ }
  };

  async function printCanvas(canvas) {
    const { widthBytes, heightDots, data } = canvasToPackedBitmap(canvas);

    const encabezado = concatBytes([
      strToBytes(`SIZE ${LABEL_W_MM} mm,${LABEL_H_MM} mm`),
      strToBytes('GAP 2 mm,0 mm'),
      strToBytes('DIRECTION 0'),
      strToBytes('CLS'),
      strToBytes(`BITMAP 0,0,${widthBytes},${heightDots},0,`),
    ]);
    const pie = strToBytes('PRINT 1,1');

    await write(concatBytes([encabezado, data, pie]));
  }

  return {
    device,
    printCanvas,
    disconnect,
    get connected() { return !!device.gatt?.connected; },
  };
}

// ── Rasterizado de las etiquetas (dos modos: detallado y simple) ──────────
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawTruncado(ctx, texto, x, y, maxWidth, align = 'left') {
  let t = texto;
  while (t.length > 1 && ctx.measureText(t).width > maxWidth) {
    t = t.slice(0, -1);
  }
  if (t !== texto && t.length > 1) t = t.slice(0, -1) + '…';
  ctx.textAlign = align;
  ctx.fillText(t, x, y);
}

// Dibuja el contenido "detallado" (QR izquierda, datos derecha, N° de serie
// abajo) en su orientación natural horizontal (60×40), y lo devuelve ya
// rotado 90° dentro de un lienzo de 40×60 — el tamaño físico real del rollo.
export async function renderLabelDetallado(item, qrDataUrl, empresaNombre) {
  const mm = valor => Math.round(valor * DOTS_PER_MM);

  const pad       = mm(2);
  const qrSize    = mm(24);
  const gapCol    = mm(2);
  const colDerechaX = pad + qrSize + gapCol;
  const colDerechaW = CONTENT_DOTS_W - pad - colDerechaX;
  const filaSerieH   = mm(10);
  const filaSuperiorH = CONTENT_DOTS_H - pad * 2 - filaSerieH;

  const contenido = document.createElement('canvas');
  contenido.width  = CONTENT_DOTS_W;
  contenido.height = CONTENT_DOTS_H;
  const ctx = contenido.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, contenido.width, contenido.height);
  ctx.fillStyle = '#000';

  if (qrDataUrl) {
    const img = await loadImage(qrDataUrl);
    ctx.drawImage(img, pad, pad + Math.round((filaSuperiorH - qrSize) / 2), qrSize, qrSize);
  }

  const campos = [
    empresaNombre && { texto: empresaNombre, bold: true, size: mm(2.6) },
    item.nombre   && { texto: item.nombre, bold: false, size: mm(2.2) },
    item.marca    && { texto: `Marca: ${item.marca}`,       bold: false, size: mm(2.1) },
    item.modelo   && { texto: `Modelo: ${item.modelo}`,     bold: false, size: mm(2.1) },
    item.color    && { texto: `Color: ${item.color}`,       bold: false, size: mm(2.1) },
    item.capacidad&& { texto: `Cap: ${item.capacidad}`,     bold: false, size: mm(2.1) },
  ].filter(Boolean);

  const lineGap = mm(0.6);
  const totalTexto = campos.reduce((s, c) => s + c.size + lineGap, 0) - lineGap;
  let y = pad + Math.round((filaSuperiorH - totalTexto) / 2) + campos[0]?.size;
  for (const c of campos) {
    ctx.font = `${c.bold ? 'bold ' : ''}${c.size}px sans-serif`;
    drawTruncado(ctx, c.texto, colDerechaX, y, colDerechaW, 'left');
    y += c.size + lineGap;
  }

  // N° de serie (sin línea separadora)
  const ySerie = pad + filaSuperiorH + mm(6);
  ctx.font = `bold ${mm(2.6)}px sans-serif`;
  const textoSerie = item.numero_serie ? `N° Serie: ${item.numero_serie}` : 'N° Serie: _______________';
  drawTruncado(ctx, textoSerie, CONTENT_DOTS_W / 2, ySerie, CONTENT_DOTS_W - pad * 2, 'center');

  return rotar90Centrado(contenido, DOTS_WIDTH, DOTS_HEIGHT);
}

// Etiqueta simple: solo QR + nombre + código, centrada en el lienzo final
// (40×60) — no necesita rotación porque no tiene orientación preferida.
export async function renderLabelSimple(item, qrDataUrl) {
  const mm = valor => Math.round(valor * DOTS_PER_MM);

  const canvas = document.createElement('canvas');
  canvas.width  = DOTS_WIDTH;
  canvas.height = DOTS_HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';

  const qrSize    = mm(28);
  const anchoUtil = DOTS_WIDTH - mm(4);
  const nombreH   = mm(2.4);
  const gap1      = mm(1.5);
  const gap2      = mm(1);
  const codigoH   = mm(3.2);
  const bloqueH   = qrSize + gap1 + nombreH + gap2 + codigoH;
  const yInicio   = Math.round((DOTS_HEIGHT - bloqueH) / 2);

  if (qrDataUrl) {
    const img = await loadImage(qrDataUrl);
    ctx.drawImage(img, Math.round((DOTS_WIDTH - qrSize) / 2), yInicio, qrSize, qrSize);
  }

  ctx.font = `${nombreH}px sans-serif`;
  drawTruncado(ctx, item.nombre || '', DOTS_WIDTH / 2, yInicio + qrSize + gap1 + nombreH * 0.8, anchoUtil, 'center');

  ctx.font = `bold ${codigoH}px monospace`;
  drawTruncado(ctx, item.codigo_interno || '', DOTS_WIDTH / 2, yInicio + qrSize + gap1 + nombreH + gap2 + codigoH * 0.8, anchoUtil, 'center');

  return canvas;
}

function rotar90Centrado(contenido, outW, outH) {
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, outW, outH);
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(contenido, -contenido.width / 2, -contenido.height / 2);
  return out;
}

function canvasToPackedBitmap(canvas) {
  const { width, height } = canvas;
  const ctx  = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, width, height).data;
  const widthBytes = BYTES_PER_ROW;
  const out = new Uint8Array(widthBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < DOTS_WIDTH && x < width; x++) {
      const i   = (y * width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 128) out[y * widthBytes + (x >> 3)] |= (0x80 >> (x & 7));
    }
  }
  return { widthBytes, heightDots: height, data: out };
}
