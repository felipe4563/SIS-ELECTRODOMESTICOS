const db = require('../config/db');

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

module.exports = { getTiposCambio, getTipoCambioHoy, createTipoCambio, deleteTipoCambio };
