const db    = require('../config/db');
const https = require('https');

// Obtiene tasas de dolarbluebolivia.click (paralelo + oficial)
const obtenerTasasDolar = () => new Promise((resolve, reject) => {
  const req = https.get(
    'https://api.dolarbluebolivia.click/v1/officialRate',
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
    (res) => {
      if (res.statusCode >= 400)
        return reject(new Error(`API respondió con HTTP ${res.statusCode}`));
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const { blue, official, fetched_at } = json.data;
          resolve({
            paralelo: { compra: blue.buy,      venta: blue.sell     },
            oficial:  { compra: official.buy,  venta: official.sell },
            fetched_at,
          });
        } catch (e) {
          reject(new Error('Respuesta inesperada de la API de tasas'));
        }
      });
    }
  );
  req.on('error', reject);
  req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout al consultar tasas del dólar')); });
});

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
       ORDER BY tc.fecha DESC, tc.tipo ASC, mo.codigo ASC
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
  const { id_moneda_origen, id_moneda_destino, fecha, tipo = 'oficial', tasa_compra, tasa_venta } = req.body;

  if (!id_moneda_origen || !id_moneda_destino || !fecha || !tasa_compra || !tasa_venta)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (id_moneda_origen === id_moneda_destino)
    return res.status(400).json({ error: 'Las monedas origen y destino deben ser distintas' });
  if (Number(tasa_compra) <= 0 || Number(tasa_venta) <= 0)
    return res.status(400).json({ error: 'Las tasas deben ser mayores a 0' });
  if (!['oficial', 'paralelo'].includes(tipo))
    return res.status(400).json({ error: 'Tipo inválido' });

  try {
    const [result] = await db.promise().query(
      `INSERT INTO tipos_cambio (id_moneda_origen, id_moneda_destino, fecha, tipo, tasa_compra, tasa_venta)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_moneda_origen, id_moneda_destino, fecha, tipo, tasa_compra, tasa_venta]
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
  const { id_moneda_origen, id_moneda_destino, fecha, tipo = 'oficial', tasa_compra, tasa_venta } = req.body;

  if (!id_moneda_origen || !id_moneda_destino || !fecha || !tasa_compra || !tasa_venta)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (Number(id_moneda_origen) === Number(id_moneda_destino))
    return res.status(400).json({ error: 'Las monedas origen y destino deben ser distintas' });
  if (Number(tasa_compra) <= 0 || Number(tasa_venta) <= 0)
    return res.status(400).json({ error: 'Las tasas deben ser mayores a 0' });

  try {
    const [result] = await db.promise().query(
      `UPDATE tipos_cambio
       SET id_moneda_origen = ?, id_moneda_destino = ?, fecha = ?, tipo = ?, tasa_compra = ?, tasa_venta = ?
       WHERE id_tipo_cambio = ?`,
      [id_moneda_origen, id_moneda_destino, fecha, tipo, tasa_compra, tasa_venta, id]
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

// GET /api/tipos-cambio/dolar  — tasas paralelo + oficial, auto-guardadas en DB
const getTasasDolar = async (req, res) => {
  try {
    const { paralelo, oficial, fetched_at } = await obtenerTasasDolar();
    const fecha = (fetched_at || new Date().toISOString()).split('T')[0];

    // Buscar IDs de USD y BOB
    const [[usd]] = await db.promise().query(`SELECT id_moneda FROM monedas WHERE codigo = 'USD' AND activo = 1 LIMIT 1`);
    const [[bob]] = await db.promise().query(`SELECT id_moneda FROM monedas WHERE (codigo = 'BOB' OR es_moneda_base = 1) AND activo = 1 LIMIT 1`);

    if (usd && bob) {
      // Upsert oficial y paralelo del día
      for (const [tipo, tasa] of [['oficial', oficial], ['paralelo', paralelo]]) {
        await db.promise().query(
          `INSERT INTO tipos_cambio (id_moneda_origen, id_moneda_destino, fecha, tipo, tasa_compra, tasa_venta)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE tasa_compra = VALUES(tasa_compra), tasa_venta = VALUES(tasa_venta)`,
          [usd.id_moneda, bob.id_moneda, fecha, tipo, tasa.compra, tasa.venta]
        );
      }
    }

    return res.json({ fecha, paralelo, oficial, fetched_at });
  } catch (err) {
    console.error('[getTasasDolar]', err.message);
    return res.status(502).json({ error: `No se pudo obtener la tasa del dólar: ${err.message}` });
  }
};

module.exports = { getTiposCambio, getTipoCambioHoy, getTasasDolar, createTipoCambio, updateTipoCambio, deleteTipoCambio };
