const db = require('../config/db');

const getCategorias = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT c.*, p.nombre AS padre_nombre,
              COUNT(DISTINCT h.id_categoria) AS total_subcategorias
       FROM categorias c
       LEFT JOIN categorias p ON c.id_categoria_padre = p.id_categoria
       LEFT JOIN categorias h ON h.id_categoria_padre = c.id_categoria
       GROUP BY c.id_categoria
       ORDER BY c.id_categoria_padre IS NOT NULL, p.nombre, c.nombre`
    );
    return res.json({ categorias: rows });
  } catch (err) {
    console.error('[getCategorias]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const createCategoria = async (req, res) => {
  const { nombre, descripcion, id_categoria_padre } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const [result] = await db.promise().query(
      `INSERT INTO categorias (nombre, descripcion, id_categoria_padre) VALUES (?, ?, ?)`,
      [nombre.trim(), descripcion?.trim() || null, id_categoria_padre || null]
    );
    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'categorias', ?, 'INSERT', ?)`,
      [req.user.id_usuario, result.insertId, ip]
    );
    const [nueva] = await db.promise().query(
      `SELECT c.*, p.nombre AS padre_nombre FROM categorias c
       LEFT JOIN categorias p ON c.id_categoria_padre = p.id_categoria
       WHERE c.id_categoria = ?`, [result.insertId]
    );
    return res.status(201).json({ categoria: nueva[0] });
  } catch (err) {
    console.error('[createCategoria]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const updateCategoria = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, id_categoria_padre, activo } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre es requerido' });

  // Evitar que una categoría sea su propio padre o ancestro
  if (id_categoria_padre && Number(id_categoria_padre) === Number(id))
    return res.status(400).json({ error: 'Una categoría no puede ser su propio padre' });

  try {
    const [result] = await db.promise().query(
      `UPDATE categorias SET nombre = ?, descripcion = ?, id_categoria_padre = ?, activo = ? WHERE id_categoria = ?`,
      [nombre.trim(), descripcion?.trim() || null, id_categoria_padre || null, activo !== undefined ? (activo ? 1 : 0) : 1, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Categoría no encontrada' });
    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'categorias', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );
    const [updated] = await db.promise().query(
      `SELECT c.*, p.nombre AS padre_nombre FROM categorias c
       LEFT JOIN categorias p ON c.id_categoria_padre = p.id_categoria
       WHERE c.id_categoria = ?`, [id]
    );
    return res.json({ categoria: updated[0] });
  } catch (err) {
    console.error('[updateCategoria]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const deleteCategoria = async (req, res) => {
  const { id } = req.params;
  try {
    const [hijos] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM categorias WHERE id_categoria_padre = ? AND activo = 1`, [id]
    );
    if (hijos[0].total > 0)
      return res.status(409).json({ error: 'No se puede desactivar: tiene subcategorías activas' });

    const [productos] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM productos WHERE id_categoria = ? AND activo = 1`, [id]
    );
    if (productos[0].total > 0)
      return res.status(409).json({ error: 'No se puede desactivar: tiene productos activos asociados' });

    const [result] = await db.promise().query(
      `UPDATE categorias SET activo = 0 WHERE id_categoria = ?`, [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Categoría no encontrada' });
    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'categorias', ?, 'DELETE', ?)`,
      [req.user.id_usuario, id, ip]
    );
    return res.json({ mensaje: 'Categoría desactivada correctamente' });
  } catch (err) {
    console.error('[deleteCategoria]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getCategorias, createCategoria, updateCategoria, deleteCategoria };
