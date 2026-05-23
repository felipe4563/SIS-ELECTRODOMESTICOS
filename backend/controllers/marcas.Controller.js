const db = require('../config/db');

const getMarcas = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT * FROM marcas ORDER BY nombre ASC`
    );
    return res.json({ marcas: rows });
  } catch (err) {
    console.error('[getMarcas]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const createMarca = async (req, res) => {
  const { nombre, pais_origen, logo_url } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const [result] = await db.promise().query(
      `INSERT INTO marcas (nombre, pais_origen, logo_url) VALUES (?, ?, ?)`,
      [nombre.trim(), pais_origen?.trim() || null, logo_url?.trim() || null]
    );
    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'marcas', ?, 'INSERT', ?)`,
      [req.user.id_usuario, result.insertId, ip]
    );
    const [nueva] = await db.promise().query(`SELECT * FROM marcas WHERE id_marca = ?`, [result.insertId]);
    return res.status(201).json({ marca: nueva[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ya existe una marca con ese nombre' });
    console.error('[createMarca]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const updateMarca = async (req, res) => {
  const { id } = req.params;
  const { nombre, pais_origen, logo_url, activo } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const [result] = await db.promise().query(
      `UPDATE marcas SET nombre = ?, pais_origen = ?, logo_url = ?, activo = ? WHERE id_marca = ?`,
      [nombre.trim(), pais_origen?.trim() || null, logo_url?.trim() || null, activo !== undefined ? (activo ? 1 : 0) : 1, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Marca no encontrada' });
    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'marcas', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );
    const [updated] = await db.promise().query(`SELECT * FROM marcas WHERE id_marca = ?`, [id]);
    return res.json({ marca: updated[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ya existe una marca con ese nombre' });
    console.error('[updateMarca]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const deleteMarca = async (req, res) => {
  const { id } = req.params;
  try {
    const [productos] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM productos WHERE id_marca = ? AND activo = 1`, [id]
    );
    if (productos[0].total > 0)
      return res.status(409).json({ error: 'No se puede desactivar: tiene productos activos asociados' });

    const [result] = await db.promise().query(
      `UPDATE marcas SET activo = 0 WHERE id_marca = ?`, [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Marca no encontrada' });
    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'marcas', ?, 'DELETE', ?)`,
      [req.user.id_usuario, id, ip]
    );
    return res.json({ mensaje: 'Marca desactivada correctamente' });
  } catch (err) {
    console.error('[deleteMarca]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getMarcas, createMarca, updateMarca, deleteMarca };
