// Página de prueba descartable para verificar si una impresora térmica
// (como la "MTP-3B-YC-8010" de 80mm) es compatible con Web Bluetooth (BLE)
// o si usa Bluetooth clásico (SPP) — en cuyo caso el navegador no puede
// hablarle directamente. Ver tomatePrinter.js para el mismo problema con
// la impresora de etiquetas.
import { useState, useRef } from 'react';

const ESC = 0x1b;

function strToBytes(s) {
  return new TextEncoder().encode(s);
}

// ── Protocolo "cat printer" GB01/GT01/MX (ver catPrinter.js) — hipótesis a
// probar contra la DP30 usando el mismo canal de escritura 0xFF02 que ya
// detectamos, por si esta impresora comparte ese chip/protocolo en vez de
// hablar TSPL por BLE.
const CAT_CMD = {
  BITMAP_ROW:   0xa2,
  FEED:         0xa1,
  GET_STATE:    0xa3,
  SET_QUALITY:  0xa4,
  LATTICE:      0xa6,
  SET_ENERGY:   0xaf,
  SET_SPEED:    0xbd,
  DRAWING_MODE: 0xbe,
};
const CAT_LATTICE_START = new Uint8Array([0xaa, 0x55, 0x17, 0x38, 0x44, 0x5f, 0x5f, 0x5f, 0x44, 0x38, 0x2c]);
const CAT_LATTICE_END   = new Uint8Array([0xaa, 0x55, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x17]);
const CAT_DOTS_WIDTH    = 384;
const CAT_BYTES_PER_ROW = CAT_DOTS_WIDTH / 8;

function catCrc8(bytes) {
  let crc = 0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x80) ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

function catBuildFrame(cmd, payload = new Uint8Array(0)) {
  const len = payload.length;
  const frame = new Uint8Array(8 + len);
  frame[0] = 0x51; frame[1] = 0x78; frame[2] = cmd; frame[3] = 0x00;
  frame[4] = len & 0xff; frame[5] = (len >> 8) & 0xff;
  frame.set(payload, 6);
  frame[6 + len] = catCrc8(payload);
  frame[7 + len] = 0xff;
  return frame;
}

export default function TestImpresoraBT() {
  const [log, setLog] = useState([]);
  const [device, setDevice] = useState(null);
  const [writeChar, setWriteChar] = useState(null);
  const [notifyChars, setNotifyChars] = useState([]);
  // Estado del protocolo "familia ff00" (ver tomLadder/thermoprint
  // REVERSE_ENGINEERING.md): control de flujo por créditos + MTU negociado,
  // reportados por notificaciones en la característica de control (0xFF03).
  const flowRef = useRef({ creditos: 4, mtu: 237 });

  const addLog = (msg) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()}  ${msg}`]);

  const conectar = async () => {
    setLog([]);
    if (!navigator.bluetooth) {
      addLog('❌ Este navegador no soporta Web Bluetooth.');
      return;
    }
    try {
      addLog('Abriendo selector de dispositivos Bluetooth...');
      const dev = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10/FFE0
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // RN4870/UART
          '000018f0-0000-1000-8000-00805f9b34fb', // servicio ESC/POS genérico usado por varias impresoras chinas
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // otro servicio común en impresoras BLE genéricas
          '0000ae30-0000-1000-8000-00805f9b34fb', // "cat printer" GB01/GT01/MX (ver catPrinter.js)
          '0000fff0-0000-1000-8000-00805f9b34fb', // HC-08 y clones
          '0000ffb0-0000-1000-8000-00805f9b34fb', // otro UART genérico frecuente
          '0000ff00-0000-1000-8000-00805f9b34fb', // visto en la MTP-3
        ],
      });
      setDevice(dev);
      addLog(`Dispositivo elegido: "${dev.name || '(sin nombre)'}" — id: ${dev.id}`);

      addLog('Conectando a GATT server...');
      const server = await dev.gatt.connect();
      addLog('✅ Conectado a GATT server.');

      addLog('Buscando servicios disponibles...');
      const services = await server.getPrimaryServices();
      addLog(`Servicios encontrados: ${services.length}`);

      const PROP_NAMES = ['broadcast', 'read', 'writeWithoutResponse', 'write', 'notify', 'indicate', 'authenticatedSignedWrites', 'reliableWrite', 'writableAuxiliaries'];
      let candidata = null;
      const notifCands = [];
      for (const service of services) {
        addLog(`— Servicio: ${service.uuid}`);
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          const props = PROP_NAMES.filter(n => c.properties[n]).join(', ');
          addLog(`    · Característica: ${c.uuid}  [${props}]`);
          if (c.properties.write || c.properties.writeWithoutResponse) {
            // Preferimos writeWithoutResponse (más rápido, sin esperar ack por cada paquete).
            if (!candidata || (c.properties.writeWithoutResponse && !candidata.properties.writeWithoutResponse)) {
              candidata = c;
            }
            addLog(`      ↳ Esta característica puede usarse para escribir (candidata para imprimir).`);
          }
          if (c.properties.notify || c.properties.indicate) {
            notifCands.push(c);
          }
        }
      }

      if (candidata) {
        setWriteChar(candidata);
        addLog(`✅ Característica elegida para imprimir: ${candidata.uuid}`);
      } else {
        addLog('⚠️ No se detectó ninguna característica de escritura.');
      }

      if (notifCands.length) {
        setNotifyChars(notifCands);
        addLog(`Suscribiéndome a ${notifCands.length} característica(s) de notificación para escuchar respuestas...`);
        for (const nc of notifCands) {
          try {
            await nc.startNotifications();
            nc.addEventListener('characteristicvaluechanged', (e) => {
              const v = e.target.value;
              const bytes = [];
              for (let i = 0; i < v.byteLength; i++) bytes.push(v.getUint8(i).toString(16).padStart(2, '0'));
              addLog(`📩 Notificación de ${nc.uuid}: ${bytes.join(' ')}`);
              // Protocolo "familia ff00": 0x01=crédito otorgado, 0x02=MTU (lo,hi).
              if (v.byteLength >= 2 && v.getUint8(0) === 0x01) {
                flowRef.current.creditos += v.getUint8(1);
                addLog(`   ↳ crédito actualizado: ${flowRef.current.creditos}`);
              } else if (v.byteLength >= 3 && v.getUint8(0) === 0x02) {
                const mtu = v.getUint8(1) | (v.getUint8(2) << 8);
                flowRef.current.mtu = Math.max(20, mtu - 3);
                addLog(`   ↳ MTU actualizado: payload máx ${flowRef.current.mtu} bytes`);
              }
            });
          } catch (err) {
            addLog(`(no se pudo suscribir a ${nc.uuid}: ${err.message})`);
          }
        }
      }
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
      addLog('Si el dispositivo apareció en la lista pero falló acá, es probable que use Bluetooth clásico (SPP) en vez de BLE — Web Bluetooth no puede hablarle en ese caso.');
    }
  };

  const imprimirPrueba = async () => {
    if (!writeChar) {
      addLog('❌ No hay característica de escritura detectada. Conectá primero.');
      return;
    }
    try {
      const texto = strToBytes('PRUEBA DE IMPRESION\nSIS-ELECTRODOMESTICOS\n\n\n\n');
      const init = new Uint8Array([ESC, 0x40]); // ESC @ — inicializar impresora
      const data = new Uint8Array([...init, ...texto]);

      addLog(`Enviando ${data.length} bytes...`);
      const CHUNK = 100;
      for (let i = 0; i < data.length; i += CHUNK) {
        const trozo = data.subarray(i, i + CHUNK);
        if (writeChar.properties.writeWithoutResponse) {
          await writeChar.writeValueWithoutResponse(trozo);
        } else {
          await writeChar.writeValue(trozo);
        }
        await new Promise(r => setTimeout(r, 20));
      }
      addLog('✅ Datos enviados. Revisá si imprimió algo físicamente.');
    } catch (err) {
      addLog(`❌ Error al imprimir: ${err.message}`);
    }
  };

  const probarProtocoloCatPrinter = async () => {
    if (!writeChar) {
      addLog('❌ No hay característica de escritura detectada. Conectá primero.');
      return;
    }
    try {
      const escribir = async (frame) => {
        if (writeChar.properties.writeWithoutResponse) await writeChar.writeValueWithoutResponse(frame);
        else await writeChar.writeValue(frame);
        await new Promise(r => setTimeout(r, 15));
      };
      const mandarCmd = (cmd, payload) => escribir(catBuildFrame(cmd, payload));

      addLog('Probando protocolo "cat printer" (GB01/GT01/MX)...');
      await mandarCmd(CAT_CMD.GET_STATE,    new Uint8Array([0x00]));
      await mandarCmd(CAT_CMD.SET_QUALITY,  new Uint8Array([0x32]));
      await mandarCmd(CAT_CMD.SET_SPEED,    new Uint8Array([0x32]));
      await mandarCmd(CAT_CMD.SET_ENERGY,   new Uint8Array([0x00, 0x50]));
      await mandarCmd(CAT_CMD.DRAWING_MODE, new Uint8Array([0x00]));
      await mandarCmd(CAT_CMD.LATTICE, CAT_LATTICE_START);

      // Patrón de prueba: 40 filas con una franja negra en el medio —
      // si el protocolo es el correcto, debería imprimirse una banda
      // negra reconocible, no una etiqueta completa.
      for (let y = 0; y < 40; y++) {
        const row = new Uint8Array(CAT_BYTES_PER_ROW);
        if (y >= 10 && y < 30) row.fill(0xff);
        await mandarCmd(CAT_CMD.BITMAP_ROW, row);
      }
      await mandarCmd(CAT_CMD.LATTICE, CAT_LATTICE_END);

      const blank = new Uint8Array(CAT_BYTES_PER_ROW);
      for (let i = 0; i < 24; i++) await mandarCmd(CAT_CMD.BITMAP_ROW, blank);

      addLog('✅ Patrón de prueba enviado (protocolo cat printer). Revisá si imprimió una franja negra.');
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
    }
  };

  // ── Protocolo Niimbot (clones D11/B21, muy común en etiquetadoras BLE
  // genéricas) — paquete: 55 55 [cmd] [len] [payload...] [checksum XOR] AA AA
  const niimbotPacket = (cmd, payload = []) => {
    let checksum = cmd ^ payload.length;
    for (const b of payload) checksum ^= b;
    return new Uint8Array([0x55, 0x55, cmd, payload.length, ...payload, checksum, 0xaa, 0xaa]);
  };

  const probarProtocoloNiimbot = async () => {
    if (!writeChar) {
      addLog('❌ No hay característica de escritura detectada. Conectá primero.');
      return;
    }
    try {
      const escribir = async (bytes) => {
        if (writeChar.properties.writeWithoutResponse) await writeChar.writeValueWithoutResponse(bytes);
        else await writeChar.writeValue(bytes);
      };

      addLog('Probando protocolo Niimbot — mandando HEARTBEAT (0xDC)...');
      await escribir(niimbotPacket(0xdc, [0x01]));
      await new Promise(r => setTimeout(r, 1500));

      addLog('Mandando GET_INFO batería (0x40)...');
      await escribir(niimbotPacket(0x40, [0x03]));
      await new Promise(r => setTimeout(r, 1500));

      addLog('Listo. Si no viste ninguna "📩 Notificación" arriba, esta impresora no respondió a ninguno de los dos comandos.');
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
    }
  };

  // ── Protocolo "familia ff00" / L11 binario (ver tomLadder/thermoprint) ──
  // GS v 0 (comando ESC/POS estándar de bitmap raster) + wakeup/enable/stop
  // propios de esta familia de impresoras BLE baratas, respetando el control
  // de flujo por créditos que reporta la propia impresora por notificación.
  const esperarCredito = async () => {
    let esperado = 0;
    while (flowRef.current.creditos <= 0 && esperado < 3000) {
      await new Promise(r => setTimeout(r, 20));
      esperado += 20;
    }
  };

  const enviarConCreditos = async (bytes) => {
    const CHUNK = flowRef.current.mtu;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      await esperarCredito();
      const trozo = bytes.subarray(i, i + CHUNK);
      await writeChar.writeValueWithoutResponse(trozo);
      flowRef.current.creditos -= 1;
    }
  };

  const probarProtocoloL11 = async () => {
    if (!writeChar) {
      addLog('❌ No hay característica de escritura detectada. Conectá primero.');
      return;
    }
    try {
      addLog(`Probando protocolo L11/ff00 (créditos actuales: ${flowRef.current.creditos}, MTU payload: ${flowRef.current.mtu})...`);

      // Imagen de prueba: texto simple, 320px de ancho (40mm a 203dpi, igual
      // que las etiquetas reales) para confirmar orientación y legibilidad.
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PRUEBA DP30', canvas.width / 2, 50);
      ctx.font = '20px sans-serif';
      ctx.fillText('protocolo L11', canvas.width / 2, 90);

      const width = canvas.width;
      const height = canvas.height;
      const bytesPerRow = Math.ceil(width / 8);
      const data = ctx.getImageData(0, 0, width, height).data;
      const bitmap = new Uint8Array(bytesPerRow * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum < 128) bitmap[y * bytesPerRow + (x >> 3)] |= (0x80 >> (x & 7));
        }
      }

      const wakeup  = new Uint8Array(15).fill(0x00);
      const enable  = new Uint8Array([0x10, 0xff, 0xf1, 0x02]);
      const header  = new Uint8Array([
        0x1d, 0x76, 0x30, 0x00,
        bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
        height & 0xff, (height >> 8) & 0xff,
      ]);
      const feed    = new Uint8Array([0x1d, 0x0c]); // avanzar hasta el gap
      const stop    = new Uint8Array([0x10, 0xff, 0xf1, 0x45]);

      addLog('Enviando wakeup...');
      await enviarConCreditos(wakeup);
      addLog('Enviando enable...');
      await enviarConCreditos(enable);
      addLog('Enviando bitmap...');
      await enviarConCreditos(header);
      await enviarConCreditos(bitmap);
      addLog('Enviando feed (avanzar al gap)...');
      await enviarConCreditos(feed);
      addLog('Enviando stop...');
      await enviarConCreditos(stop);

      addLog('✅ Secuencia L11 completa enviada. Revisá la impresora.');
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
    }
  };

  const desconectar = () => {
    try { device?.gatt?.disconnect(); } catch { /* noop */ }
    setDevice(null);
    setWriteChar(null);
    addLog('Desconectado.');
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 20, fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Test de impresora Bluetooth (descartable)</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={conectar} style={{ padding: '8px 16px' }}>Conectar y explorar servicios</button>
        <button onClick={imprimirPrueba} disabled={!writeChar} style={{ padding: '8px 16px' }}>Imprimir texto de prueba (ESC/POS)</button>
        <button onClick={probarProtocoloCatPrinter} disabled={!writeChar} style={{ padding: '8px 16px' }}>Probar protocolo cat printer</button>
        <button onClick={probarProtocoloNiimbot} disabled={!writeChar} style={{ padding: '8px 16px' }}>Probar handshake Niimbot</button>
        <button onClick={probarProtocoloL11} disabled={!writeChar} style={{ padding: '8px 16px', background: '#fde047' }}>Probar protocolo L11 (ff00)</button>
        <button onClick={desconectar} disabled={!device} style={{ padding: '8px 16px' }}>Desconectar</button>
      </div>
      <div style={{ background: '#111', color: '#0f0', padding: 12, borderRadius: 6, minHeight: 200, whiteSpace: 'pre-wrap', fontSize: 12 }}>
        {log.length === 0 ? '(sin actividad todavía)' : log.join('\n')}
      </div>
    </div>
  );
}
