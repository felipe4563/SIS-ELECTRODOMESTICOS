const db = require('../config/db');

// GET /api/monedas
const getMonedas = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT * FROM monedas ORDER BY es_moneda_base DESC, nombre ASC`
    );
    return res.json({ monedas: rows });
  } catch (err) {
    console.error('[getMonedas]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// POST /api/monedas
const createMoneda = async (req, res) => {
  const { codigo, nombre, simbolo, decimales, es_moneda_base } = req.body;

  if (!codigo?.trim() || !nombre?.trim() || !simbolo?.trim())
    return res.status(400).json({ error: 'Código, nombre y símbolo son requeridos' });

  try {
    if (es_moneda_base) {
      await db.promise().query(
        `UPDATE monedas SET es_moneda_base = 0`
      );
    }

    const [result] = await db.promise().query(
      `INSERT INTO monedas (codigo, nombre, simbolo, decimales, es_moneda_base)
       VALUES (?, ?, ?, ?, ?)`,
      [codigo.trim().toUpperCase(), nombre.trim(), simbolo.trim(),
       decimales ?? 2, es_moneda_base ? 1 : 0]
    );

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'monedas', ?, 'INSERT', ?)`,
      [req.user.id_usuario, result.insertId, ip]
    );

    const [nueva] = await db.promise().query(
      `SELECT * FROM monedas WHERE id_moneda = ?`, [result.insertId]
    );
    return res.status(201).json({ moneda: nueva[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El código de moneda ya existe' });
    console.error('[createMoneda]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// PUT /api/monedas/:id
const updateMoneda = async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, simbolo, decimales, es_moneda_base, activo } = req.body;

  if (!codigo?.trim() || !nombre?.trim() || !simbolo?.trim())
    return res.status(400).json({ error: 'Código, nombre y símbolo son requeridos' });

  try {
    if (es_moneda_base) {
      await db.promise().query(
        `UPDATE monedas SET es_moneda_base = 0 WHERE id_moneda != ?`, [id]
      );
    }

    const [result] = await db.promise().query(
      `UPDATE monedas
       SET codigo = ?, nombre = ?, simbolo = ?, decimales = ?, es_moneda_base = ?, activo = ?
       WHERE id_moneda = ?`,
      [codigo.trim().toUpperCase(), nombre.trim(), simbolo.trim(),
       decimales ?? 2, es_moneda_base ? 1 : 0,
       activo !== undefined ? (activo ? 1 : 0) : 1, id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Moneda no encontrada' });

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'monedas', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );

    const [updated] = await db.promise().query(
      `SELECT * FROM monedas WHERE id_moneda = ?`, [id]
    );
    return res.json({ moneda: updated[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El código de moneda ya existe' });
    console.error('[updateMoneda]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// DELETE /api/monedas/:id
const deleteMoneda = async (req, res) => {
  const { id } = req.params;
  try {
    const [mon] = await db.promise().query(
      `SELECT es_moneda_base FROM monedas WHERE id_moneda = ?`, [id]
    );
    if (mon.length === 0)
      return res.status(404).json({ error: 'Moneda no encontrada' });
    if (mon[0].es_moneda_base)
      return res.status(400).json({ error: 'No se puede desactivar la moneda base' });

    await db.promise().query(
      `UPDATE monedas SET activo = 0 WHERE id_moneda = ?`, [id]
    );

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'monedas', ?, 'DELETE', ?)`,
      [req.user.id_usuario, id, ip]
    );
    return res.json({ mensaje: 'Moneda desactivada correctamente' });
  } catch (err) {
    console.error('[deleteMoneda]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getMonedas, createMoneda, updateMoneda, deleteMoneda };
