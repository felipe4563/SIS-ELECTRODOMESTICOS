const db = require('../config/db');
const { invalidarCacheRol } = require('../middlewares/authMiddleware');

// GET /api/roles
const getRoles = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT r.*,
        COUNT(DISTINCT rp.id_permiso) AS total_permisos,
        COUNT(DISTINCT u.id_usuario)  AS total_usuarios
      FROM roles r
      LEFT JOIN rol_permiso rp ON rp.id_rol = r.id_rol
      LEFT JOIN usuarios u ON u.id_rol = r.id_rol AND u.activo = 1
      GROUP BY r.id_rol
      ORDER BY r.id_rol
    `);
    res.json({ roles: rows });
  } catch (err) {
    console.error('[getRoles]', err);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
};

// GET /api/roles/permisos
const getPermisos = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT p.*, m.nombre AS modulo_nombre, m.codigo AS modulo_codigo
      FROM permisos p
      JOIN modulos m ON m.id_modulo = p.id_modulo
      ORDER BY m.orden, p.id_permiso
    `);
    res.json({ permisos: rows });
  } catch (err) {
    console.error('[getPermisos]', err);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
};

// GET /api/roles/:id/permisos
const getRolPermisos = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT id_permiso FROM rol_permiso WHERE id_rol = ?`,
      [req.params.id]
    );
    res.json({ permisos: rows.map(r => r.id_permiso) });
  } catch (err) {
    console.error('[getRolPermisos]', err);
    res.status(500).json({ error: 'Error al obtener permisos del rol' });
  }
};

// POST /api/roles
const createRol = async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const [result] = await db.promise().query(
      `INSERT INTO roles (nombre, descripcion) VALUES (?, ?)`,
      [nombre.trim(), descripcion?.trim() || null]
    );

    const [newRows] = await db.promise().query(
      `SELECT id_rol, nombre, descripcion, es_sistema, activo FROM roles WHERE id_rol = ?`,
      [result.insertId]
    );

    const ip = req.ip || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, datos_despues, ip_origen) VALUES (?, 'roles', ?, 'INSERT', ?, ?)`,
      [req.user.id_usuario, result.insertId, JSON.stringify(newRows[0]), ip]
    );
    res.status(201).json({ id_rol: result.insertId, mensaje: 'Rol creado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un rol con ese nombre' });
    console.error('[createRol]', err);
    res.status(500).json({ error: 'Error al crear rol' });
  }
};

// PUT /api/roles/:id
const updateRol = async (req, res) => {
  const { nombre, descripcion } = req.body;
  const { id } = req.params;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const [oldRows] = await db.promise().query(`SELECT id_rol, nombre, descripcion, es_sistema, activo FROM roles WHERE id_rol = ?`, [id]);
    if (oldRows.length === 0) return res.status(404).json({ error: 'Rol no encontrado' });
    const rolAntes = oldRows[0];

    await db.promise().query(
      `UPDATE roles SET nombre = ?, descripcion = ? WHERE id_rol = ?`,
      [nombre.trim(), descripcion?.trim() || null, id]
    );

    const [newRows] = await db.promise().query(`SELECT id_rol, nombre, descripcion, es_sistema, activo FROM roles WHERE id_rol = ?`, [id]);
    const rolDespues = newRows[0];

    // Invalidar el caché si el rol es editado
    invalidarCacheRol(Number(id));

    const ip = req.ip || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, datos_antes, datos_despues, ip_origen) VALUES (?, 'roles', ?, 'UPDATE', ?, ?, ?)`,
      [req.user.id_usuario, id, JSON.stringify(rolAntes), JSON.stringify(rolDespues), ip]
    );
    res.json({ mensaje: 'Rol actualizado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un rol con ese nombre' });
    console.error('[updateRol]', err);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
};

// DELETE /api/roles/:id
const deleteRol = async (req, res) => {
  const { id } = req.params;
  try {
    const [check] = await db.promise().query(`SELECT id_rol, nombre, descripcion, es_sistema, activo FROM roles WHERE id_rol = ?`, [id]);
    if (check.length === 0) return res.status(404).json({ error: 'Rol no encontrado' });
    const rolAntes = check[0];
    if (rolAntes.es_sistema) return res.status(400).json({ error: 'No se puede eliminar un rol del sistema' });

    const [users] = await db.promise().query(
      `SELECT COUNT(*) AS n FROM usuarios WHERE id_rol = ? AND activo = 1`, [id]
    );
    if (users[0].n > 0) return res.status(400).json({ error: 'El rol tiene usuarios activos asignados' });

    await db.promise().query(`DELETE FROM rol_permiso WHERE id_rol = ?`, [id]);
    await db.promise().query(`DELETE FROM roles WHERE id_rol = ?`, [id]);

    // Limpiar caché
    invalidarCacheRol(Number(id));

    const ip = req.ip || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, datos_antes, ip_origen) VALUES (?, 'roles', ?, 'DELETE', ?, ?)`,
      [req.user.id_usuario, id, JSON.stringify(rolAntes), ip]
    );
    res.json({ mensaje: 'Rol eliminado' });
  } catch (err) {
    console.error('[deleteRol]', err);
    res.status(500).json({ error: 'Error al eliminar rol' });
  }
};

// PUT /api/roles/:id/permisos
const asignarPermisos = async (req, res) => {
  const { id } = req.params;
  const { permisos } = req.body;

  if (!Array.isArray(permisos)) return res.status(400).json({ error: 'permisos debe ser un array' });

  try {
    const [check] = await db.promise().query(`SELECT id_rol FROM roles WHERE id_rol = ?`, [id]);
    if (check.length === 0) return res.status(404).json({ error: 'Rol no encontrado' });

    const [oldPerms] = await db.promise().query(
      `SELECT id_permiso FROM rol_permiso WHERE id_rol = ?`, [id]
    );
    const permisosAntes = oldPerms.map(p => p.id_permiso);

    await db.promise().query(`DELETE FROM rol_permiso WHERE id_rol = ?`, [id]);

    if (permisos.length > 0) {
      const values = permisos.map(pid => [Number(id), Number(pid)]);
      await db.promise().query(`INSERT INTO rol_permiso (id_rol, id_permiso) VALUES ?`, [values]);
    }

    // Invalidar el caché del rol para que los cambios tengan efecto inmediato
    invalidarCacheRol(Number(id));

    const ip = req.ip || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, datos_antes, datos_despues, ip_origen) VALUES (?, 'rol_permiso', ?, 'UPDATE', ?, ?, ?)`,
      [req.user.id_usuario, id, JSON.stringify(permisosAntes), JSON.stringify(permisos), ip]
    );
    res.json({ mensaje: 'Permisos asignados correctamente' });
  } catch (err) {
    console.error('[asignarPermisos]', err);
    res.status(500).json({ error: 'Error al asignar permisos' });
  }
};

module.exports = { getRoles, getPermisos, getRolPermisos, createRol, updateRol, deleteRol, asignarPermisos };
