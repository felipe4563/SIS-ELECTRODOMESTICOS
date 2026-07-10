const db    = require('../config/db');
const https = require('https');

// Scrapea el BCB y devuelve tasas oficial y referencial del día
const scrapearBCB = () => new Promise((resolve, reject) => {
  const req = https.get(
    'https://www.bcb.gob.bo/',
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
    (res) => {
      // Ignorar redirecciones menores (el BCB puede redirigir HTTP→HTTPS pero ya usamos HTTPS)
      if (res.statusCode >= 400)
        return reject(new Error(`BCB respondió con HTTP ${res.statusCode}`));
      let html = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { html += chunk; });
      res.on('end', () => {
        try {
          resolve(parsearTasas(html));
        } catch (e) {
          reject(e);
        }
      });
    }
  );
  req.on('error', reject);
  req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout al conectar con el BCB')); });
});

function parsearTasas(html) {
  // 1. Quitar tags HTML y normalizar espacios para trabajar con texto plano
  const texto = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

  // 2. Buscar todas las ocurrencias de "Compra" seguidas de un número decimal (punto o coma)
  //    Ejemplo en BCB: "Compra 6,86" o "Compra\n6,86"
  const compras = [...texto.matchAll(/Compra\s+([\d]+[,.][\d]+)/gi)]
    .map(m => parseFloat(m[1].replace(',', '.')));

  // 3. Igual para "Venta"
  const ventas = [...texto.matchAll(/Venta\s+([\d]+[,.][\d]+)/gi)]
    .map(m => parseFloat(m[1].replace(',', '.')));

  // 4. El BCB muestra dos bloques en orden: oficial primero, referencial después
  //    compras[0]/ventas[0] = oficial,  compras[1]/ventas[1] = referencial
  const oficial     = (compras[0] != null && ventas[0] != null)
    ? { compra: +compras[0].toFixed(4), venta: +ventas[0].toFixed(4) } : null;
  const referencial = (compras[1] != null && ventas[1] != null)
    ? { compra: +compras[1].toFixed(4), venta: +ventas[1].toFixed(4) } : null;

  if (!oficial && !referencial)
    throw new Error('No se encontraron tasas en la página del BCB. El sitio puede haber cambiado su estructura.');

  return { oficial, referencial };
}

// GET /api/tipos-cambio
const getTiposCambio = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT tc.*,
              mo.codigo AS moneda_origen_codigo, mo.nombre AS moneda_origen_nombre, mo.simbolo AS moneda_origen_simbolo,
              md.codigo AS moneda_destino_codigo, md.nombre AS moneda_destino_nombre, md.simbolo AS moneda_destino_simbolo
       FROM tipos_cambio tc
       JOIN monedas mo ON tc.id_moneda_origen  = mo.id_moneda
       JOIN monedas md ON tc.id_moneda_destino = md.id_moneda
       ORDER BY tc.fecha DESC, mo.codigo ASC
       LIMIT 100`
    );
    return res.json({ tipos_cambio: rows });
  } catch (err) {
    console.error('[getTiposCambio]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// GET /api/tipos-cambio/hoy
const getTipoCambioHoy = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT tc.*,
              mo.codigo AS moneda_origen_codigo, mo.simbolo AS moneda_origen_simbolo,
              md.codigo AS moneda_destino_codigo, md.simbolo AS moneda_destino_simbolo
       FROM tipos_cambio tc
       JOIN monedas mo ON tc.id_moneda_origen  = mo.id_moneda
       JOIN monedas md ON tc.id_moneda_destino = md.id_moneda
       WHERE tc.fecha = CURDATE()`
    );
    return res.json({ tipos_cambio: rows });
  } catch (err) {
    console.error('[getTipoCambioHoy]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// POST /api/tipos-cambio
const createTipoCambio = async (req, res) => {
  const { id_moneda_origen, id_moneda_destino, fecha, tasa_compra, tasa_venta } = req.body;

  if (!id_moneda_origen || !id_moneda_destino || !fecha || !tasa_compra || !tasa_venta)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (id_moneda_origen === id_moneda_destino)
    return res.status(400).json({ error: 'Las monedas origen y destino deben ser distintas' });
  if (Number(tasa_compra) <= 0 || Number(tasa_venta) <= 0)
    return res.status(400).json({ error: 'Las tasas deben ser mayores a 0' });

  try {
    const [result] = await db.promise().query(
      `INSERT INTO tipos_cambio (id_moneda_origen, id_moneda_destino, fecha, tasa_compra, tasa_venta)
       VALUES (?, ?, ?, ?, ?)`,
      [id_moneda_origen, id_moneda_destino, fecha, tasa_compra, tasa_venta]
    );

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'tipos_cambio', ?, 'INSERT', ?)`,
      [req.user.id_usuario, result.insertId, ip]
    );

    const [nuevo] = await db.promise().query(
      `SELECT tc.*,
              mo.codigo AS moneda_origen_codigo, mo.simbolo AS moneda_origen_simbolo,
              md.codigo AS moneda_destino_codigo, md.simbolo AS moneda_destino_simbolo
       FROM tipos_cambio tc
       JOIN monedas mo ON tc.id_moneda_origen  = mo.id_moneda
       JOIN monedas md ON tc.id_moneda_destino = md.id_moneda
       WHERE tc.id_tipo_cambio = ?`, [result.insertId]
    );
    return res.status(201).json({ tipo_cambio: nuevo[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ya existe un tipo de cambio para esa fecha y par de monedas' });
    console.error('[createTipoCambio]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// DELETE /api/tipos-cambio/:id
const deleteTipoCambio = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.promise().query(
      `DELETE FROM tipos_cambio WHERE id_tipo_cambio = ?`, [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Tipo de cambio no encontrado' });

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'tipos_cambio', ?, 'DELETE', ?)`,
      [req.user.id_usuario, id, ip]
    );
    return res.json({ mensaje: 'Tipo de cambio eliminado' });
  } catch (err) {
    console.error('[deleteTipoCambio]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// PUT /api/tipos-cambio/:id
const updateTipoCambio = async (req, res) => {
  const { id } = req.params;
  const { id_moneda_origen, id_moneda_destino, fecha, tasa_compra, tasa_venta } = req.body;

  if (!id_moneda_origen || !id_moneda_destino || !fecha || !tasa_compra || !tasa_venta)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (Number(id_moneda_origen) === Number(id_moneda_destino))
    return res.status(400).json({ error: 'Las monedas origen y destino deben ser distintas' });
  if (Number(tasa_compra) <= 0 || Number(tasa_venta) <= 0)
    return res.status(400).json({ error: 'Las tasas deben ser mayores a 0' });

  try {
    const [result] = await db.promise().query(
      `UPDATE tipos_cambio
       SET id_moneda_origen = ?, id_moneda_destino = ?, fecha = ?, tasa_compra = ?, tasa_venta = ?
       WHERE id_tipo_cambio = ?`,
      [id_moneda_origen, id_moneda_destino, fecha, tasa_compra, tasa_venta, id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Tipo de cambio no encontrado' });

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'tipos_cambio', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );

    const [updated] = await db.promise().query(
      `SELECT tc.*,
              mo.codigo AS moneda_origen_codigo, mo.simbolo AS moneda_origen_simbolo,
              md.codigo AS moneda_destino_codigo, md.simbolo AS moneda_destino_simbolo
       FROM tipos_cambio tc
       JOIN monedas mo ON tc.id_moneda_origen  = mo.id_moneda
       JOIN monedas md ON tc.id_moneda_destino = md.id_moneda
       WHERE tc.id_tipo_cambio = ?`, [id]
    );

    return res.json({ tipo_cambio: updated[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ya existe un tipo de cambio para esa fecha y par de monedas' });
    console.error('[updateTipoCambio]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// GET /api/tipos-cambio/bcb  — tasas del Banco Central de Bolivia
const getTasaBCB = async (req, res) => {
  try {
    const { oficial, referencial } = await scrapearBCB();
    const fecha = new Date().toISOString().split('T')[0];
    return res.json({ fecha, oficial, referencial });
  } catch (err) {
    console.error('[getTasaBCB]', err.message);
    return res.status(502).json({ error: `No se pudo obtener la tasa del BCB: ${err.message}` });
  }
};

module.exports = { getTiposCambio, getTipoCambioHoy, getTasaBCB, createTipoCambio, updateTipoCambio, deleteTipoCambio };
