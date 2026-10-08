// Driver mínimo para impresoras térmicas "cat printer" (familia GB01/GB02/GT01/MX*,
// que incluye modelos chinos genéricos vendidos con la app "Tiny Print", como la X6).
// Protocolo reconstruido a partir de documentación pública de ingeniería inversa
// (no es ESC/POS — estas impresoras usan un protocolo propietario por BLE).

const SERVICE_UUID      = '0000ae30-0000-1000-8000-00805f9b34fb';
const CHAR_WRITE_UUID   = '0000ae01-0000-1000-8000-00805f9b34fb';
const CHAR_NOTIFY_UUID  = '0000ae02-0000-1000-8000-00805f9b34fb';

const CMD = {
  BITMAP_ROW:    0xa2,
  FEED:          0xa1,
  GET_STATE:     0xa3,
  SET_QUALITY:   0xa4,
  LATTICE:       0xa6,
  SET_ENERGY:    0xaf,
  SET_SPEED:     0xbd,
  DRAWING_MODE:  0xbe,
};

const LATTICE_START = new Uint8Array([0xaa, 0x55, 0x17, 0x38, 0x44, 0x5f, 0x5f, 0x5f, 0x44, 0x38, 0x2c]);
const LATTICE_END   = new Uint8Array([0xaa, 0x55, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x17]);

const DOTS_WIDTH    = 384; // ancho imprimible en puntos (~48mm a 203dpi) de esta familia de impresoras
const BYTES_PER_ROW = DOTS_WIDTH / 8;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function crc8(bytes) {
  let crc = 0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x80) ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

function buildFrame(cmd, payload = new Uint8Array(0)) {
  const len = payload.length;
  const frame = new Uint8Array(8 + len);
  frame[0] = 0x51; frame[1] = 0x78; frame[2] = cmd; frame[3] = 0x00;
  frame[4] = len & 0xff; frame[5] = (len >> 8) & 0xff;
  frame.set(payload, 6);
  frame[6 + len] = crc8(payload);
  frame[7 + len] = 0xff;
  return frame;
}

export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

// ── Conexión ────────────────────────────────────────────────────────────────
export async function connectCatPrinter() {
  if (!isBluetoothSupported()) {
    throw new Error('Este navegador no soporta Web Bluetooth. Usá Chrome, Edge, o Brave (activando "Web Bluetooth API" en brave://flags).');
  }

  // Muchas de estas impresoras chinas no anuncian el UUID del servicio en el
  // paquete de publicidad BLE, así que filtrar por servicio las excluye del
  // selector. Listamos todos los dispositivos cercanos (igual que hace la
  // app Tiny Print) y el usuario elige la suya por nombre.
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [SERVICE_UUID, '0000af30-0000-1000-8000-00805f9b34fb'],
  });
  const server = await device.gatt.connect();
  let service;
  try {
    service = await server.getPrimaryService(SERVICE_UUID);
  } catch {
    try {
      service = await server.getPrimaryService('0000af30-0000-1000-8000-00805f9b34fb');
    } catch {
      device.gatt.disconnect();
      throw new Error(`"${device.name || 'El dispositivo'}" no expone el servicio Bluetooth esperado por esta impresora. Puede ser un modelo distinto al GB01/GB02/MX — avisale a soporte con el nombre exacto del dispositivo.`);
    }
  }
  const writeChar   = await service.getCharacteristic(CHAR_WRITE_UUID);
  const notifyChar  = await service.getCharacteristic(CHAR_NOTIFY_UUID);

  let paused = false;
  const onNotify = (e) => {
    const v = e.target.value;
    if (v && v.byteLength > 6) paused = !!(v.getUint8(6) & 0x10);
  };
  await notifyChar.startNotifications();
  notifyChar.addEventListener('characteristicvaluechanged', onNotify);

  const write = async (frame) => {
    let waited = 0;
    while (paused && waited < 3000) { await sleep(20); waited += 20; }
    if (writeChar.writeValueWithoutResponse) await writeChar.writeValueWithoutResponse(frame);
    else await writeChar.writeValue(frame);
    await sleep(12);
  };
  const sendCmd = (cmd, payload) => write(buildFrame(cmd, payload));

  const disconnect = () => {
    try { notifyChar.removeEventListener('characteristicvaluechanged', onNotify); } catch { /* noop */ }
    try { device.gatt.disconnect(); } catch { /* noop */ }
  };

  async function printCanvas(canvas) {
    const rows = canvasToRows(canvas);
    await sendCmd(CMD.GET_STATE,    new Uint8Array([0x00]));
    await sendCmd(CMD.SET_QUALITY,  new Uint8Array([0x32]));
    await sendCmd(CMD.SET_SPEED,    new Uint8Array([0x32]));
    await sendCmd(CMD.SET_ENERGY,   new Uint8Array([0x00, 0x50])); // 0x5000 LE — intensidad media
    await sendCmd(CMD.DRAWING_MODE, new Uint8Array([0x00]));       // modo imagen
    await sendCmd(CMD.LATTICE, LATTICE_START);
    for (const row of rows) await sendCmd(CMD.BITMAP_ROW, row);
    await sendCmd(CMD.LATTICE, LATTICE_END);

    const blank = new Uint8Array(BYTES_PER_ROW);
    for (let i = 0; i < 24; i++) await sendCmd(CMD.BITMAP_ROW, blank); // margen para cortar
  }

  return {
    device,
    printCanvas,
    disconnect,
    get connected() { return !!device.gatt?.connected; },
  };
}

// ── Rasterizado de la etiqueta (QR + nombre + código) a bitmap 1-bit ─────────
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawTruncado(ctx, texto, cx, y, maxWidth) {
  let t = texto;
  while (t.length > 1 && ctx.measureText(t).width > maxWidth) {
    t = t.slice(0, -1);
  }
  if (t !== texto && t.length > 1) t = t.slice(0, -1) + '…';
  ctx.fillText(t, cx, y);
}

export async function renderLabelToCanvas(item, qrDataUrl) {
  const mm = px => Math.round(DOTS_WIDTH * (px / 48)); // la impresora imprime ~48mm de ancho

  const qrSize     = mm(26);
  const marginTop  = mm(2);
  const gap1       = mm(1);
  const nameH      = mm(2.4);
  const gap2       = mm(0.6);
  const codeH      = mm(3);
  const marginBot  = mm(2);

  const canvas = document.createElement('canvas');
  canvas.width  = DOTS_WIDTH;
  canvas.height = marginTop + qrSize + gap1 + nameH + gap2 + codeH + marginBot;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (qrDataUrl) {
    const img = await loadImage(qrDataUrl);
    ctx.drawImage(img, Math.round((DOTS_WIDTH - qrSize) / 2), marginTop, qrSize, qrSize);
  }

  const maxTextWidth = mm(36);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.font = `${Math.round(nameH * 0.8)}px sans-serif`;
  drawTruncado(ctx, item.nombre || '', DOTS_WIDTH / 2, marginTop + qrSize + gap1 + nameH * 0.75, maxTextWidth);

  ctx.font = `bold ${Math.round(codeH * 0.75)}px monospace`;
  drawTruncado(ctx, item.codigo_interno || '', DOTS_WIDTH / 2, marginTop + qrSize + gap1 + nameH + gap2 + codeH * 0.75, maxTextWidth);

  return canvas;
}

function canvasToRows(canvas) {
  const { width, height } = canvas;
  const ctx  = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, width, height).data;
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(BYTES_PER_ROW);
    for (let x = 0; x < DOTS_WIDTH && x < width; x++) {
      const i   = (y * width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 128) row[x >> 3] |= (1 << (x & 7));
    }
    rows.push(row);
  }
  return rows;
}
