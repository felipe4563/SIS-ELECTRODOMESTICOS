const db = require('../config/db');

const getUnidades = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT * FROM unidades_medida ORDER BY nombre ASC`
    );
    return res.json({ unidades: rows });
  } catch (err) {
    console.error('[getUnidades]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const createUnidad = async (req, res) => {
  const { codigo, nombre } = req.body;
  if (!codigo?.trim() || !nombre?.trim())
    return res.status(400).json({ error: 'Código y nombre son requeridos' });
  try {
    const [result] = await db.promise().query(
      `INSERT INTO unidades_medida (codigo, nombre) VALUES (?, ?)`,
      [codigo.trim().toUpperCase(), nombre.trim()]
    );
    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'unidades_medida', ?, 'INSERT', ?)`,
      [req.user.id_usuario, result.insertId, ip]
    );
    const [nueva] = await db.promise().query(`SELECT * FROM unidades_medida WHERE id_unidad = ?`, [result.insertId]);
    return res.status(201).json({ unidad: nueva[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ya existe una unidad con ese código' });
    console.error('[createUnidad]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const updateUnidad = async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, activo } = req.body;
  if (!codigo?.trim() || !nombre?.trim())
    return res.status(400).json({ error: 'Código y nombre son requeridos' });
  try {
    const [result] = await db.promise().query(
      `UPDATE unidades_medida SET codigo = ?, nombre = ?, activo = ? WHERE id_unidad = ?`,
      [codigo.trim().toUpperCase(), nombre.trim(), activo !== undefined ? (activo ? 1 : 0) : 1, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Unidad no encontrada' });
    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'unidades_medida', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );
    const [updated] = await db.promise().query(`SELECT * FROM unidades_medida WHERE id_unidad = ?`, [id]);
    return res.json({ unidad: updated[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ya existe una unidad con ese código' });
    console.error('[updateUnidad]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const deleteUnidad = async (req, res) => {
  const { id } = req.params;
  try {
    const [productos] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM productos WHERE id_unidad = ? AND activo = 1`, [id]
    );
    if (productos[0].total > 0)
      return res.status(409).json({ error: 'No se puede desactivar: tiene productos activos asociados' });

    const [result] = await db.promise().query(
      `UPDATE unidades_medida SET activo = 0 WHERE id_unidad = ?`, [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Unidad no encontrada' });
    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'unidades_medida', ?, 'DELETE', ?)`,
      [req.user.id_usuario, id, ip]
    );
    return res.json({ mensaje: 'Unidad desactivada correctamente' });
  } catch (err) {
    console.error('[deleteUnidad]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getUnidades, createUnidad, updateUnidad, deleteUnidad };
