const fs = require('fs');

// Firmas de magic bytes por tipo MIME
const SIGNATURES = [
  {
    mime: 'image/jpeg',
    checks: [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  },
  {
    mime: 'image/png',
    checks: [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  },
  {
    mime: 'image/webp',
    // RIFF en bytes 0-3, WEBP en bytes 8-11
    checks: [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
    ],
  },
  {
    mime: 'application/pdf',
    checks: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  },
  {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    checks: [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }], // ZIP (PK..)
  },
  {
    mime: 'application/vnd.ms-excel', // .xls
    checks: [{ offset: 0, bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] }], // OLE2
  },
];

function matchesSignature(buf, sig) {
  return sig.checks.every(({ offset, bytes }) =>
    bytes.every((b, i) => buf[offset + i] === b)
  );
}

function readFirstBytes(file, n = 12) {
  if (file.buffer) {
    return file.buffer.slice(0, n);
  }
  const buf = Buffer.alloc(n);
  const fd  = fs.openSync(file.path, 'r');
  fs.readSync(fd, buf, 0, n, 0);
  fs.closeSync(fd);
  return buf;
}

function deleteIfDisk(file) {
  if (file?.path) {
    try { fs.unlinkSync(file.path); } catch {}
  }
}

/**
 * Middleware que valida magic bytes del archivo subido.
 * @param {string[]} allowedMimes — lista de MIME types permitidos
 */
function validateMagic(allowedMimes) {
  return (req, res, next) => {
    if (!req.file) return next();

    const buf  = readFirstBytes(req.file);
    const sigs = SIGNATURES.filter(s => allowedMimes.includes(s.mime));
    const ok   = sigs.some(sig => matchesSignature(buf, sig));

    if (!ok) {
      deleteIfDisk(req.file);
      return res.status(400).json({
        error: 'El contenido del archivo no coincide con un tipo permitido.',
      });
    }

    next();
  };
}

// Conjuntos predefinidos de uso común
const IMAGES_ONLY = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const IMAGES_AND_PDF = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const EXCEL_ONLY = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

module.exports = { validateMagic, IMAGES_ONLY, IMAGES_AND_PDF, EXCEL_ONLY };
