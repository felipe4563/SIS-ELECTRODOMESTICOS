const db     = require('../config/db');
const bcrypt = require('bcrypt');

// GET /api/usuarios
const getUsuarios = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT u.id_usuario, u.username, u.nombres, u.apellidos, u.email,
             u.telefono, u.documento, u.id_rol, u.id_sucursal_default,
             u.foto_url, u.debe_cambiar_pass, u.ultimo_login, u.activo,
             u.fecha_creacion,
             r.nombre AS rol_nombre,
             s.nombre AS sucursal_nombre,
             COUNT(DISTINCT us.id_sucursal) AS total_sucursales
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      LEFT JOIN sucursales s ON s.id_sucursal = u.id_sucursal_default
      LEFT JOIN usuario_sucursal us ON us.id_usuario = u.id_usuario
      GROUP BY u.id_usuario
      ORDER BY u.activo DESC, u.nombres, u.apellidos
    `);
    res.json({ usuarios: rows });
  } catch (err) {
    console.error('[getUsuarios]', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// GET /api/usuarios/:id
const getUsuario = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT u.id_usuario, u.username, u.nombres, u.apellidos, u.email,
             u.telefono, u.documento, u.id_rol, u.id_sucursal_default,
             u.foto_url, u.debe_cambiar_pass, u.ultimo_login, u.activo,
             r.nombre AS rol_nombre, s.nombre AS sucursal_nombre
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      LEFT JOIN sucursales s ON s.id_sucursal = u.id_sucursal_default
      WHERE u.id_usuario = ?
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const [sucursales] = await db.promise().query(`
      SELECT s.id_sucursal, s.nombre, s.codigo
      FROM usuario_sucursal us
      JOIN sucursales s ON s.id_sucursal = us.id_sucursal
      WHERE us.id_usuario = ?
    `, [req.params.id]);

    res.json({ usuario: rows[0], sucursales });
  } catch (err) {
    console.error('[getUsuario]', err);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

// POST /api/usuarios
const createUsuario = async (req, res) => {
  const { username, password, nombres, apellidos, documento, email, telefono, id_rol, id_sucursal_default } = req.body;

  if (!username?.trim() || !password || !nombres?.trim() || !apellidos?.trim() || !id_rol) {
    return res.status(400).json({ error: 'username, contraseña, nombres, apellidos y rol son requeridos' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.promise().query(
      `INSERT INTO usuarios (username, password_hash, nombres, apellidos, documento, email, telefono, id_rol, id_sucursal_default, debe_cambiar_pass)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [username.trim(), hash, nombres.trim(), apellidos.trim(),
       documento?.trim() || null, email?.trim() || null,
       telefono?.trim() || null, id_rol, id_sucursal_default || null]
    );

    const ip = req.ip || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'usuarios', ?, 'INSERT', ?)`,
      [req.user.id_usuario, result.insertId, ip]
    );

    res.status(201).json({ id_usuario: result.insertId, mensaje: 'Usuario creado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.sqlMessage?.includes('username')) return res.status(409).json({ error: 'El username ya está en uso' });
      if (err.sqlMessage?.includes('email'))    return res.status(409).json({ error: 'El email ya está en uso' });
      return res.status(409).json({ error: 'Datos duplicados' });
    }
    console.error('[createUsuario]', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

// PUT /api/usuarios/:id
const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, documento, email, telefono, id_rol, id_sucursal_default, activo } = req.body;

  if (!nombres?.trim() || !apellidos?.trim() || !id_rol) {
    return res.status(400).json({ error: 'nombres, apellidos y rol son requeridos' });
  }

  try {
    await db.promise().query(
      `UPDATE usuarios SET nombres=?, apellidos=?, documento=?, email=?, telefono=?,
       id_rol=?, id_sucursal_default=?, activo=? WHERE id_usuario=?`,
      [nombres.trim(), apellidos.trim(), documento?.trim() || null,
       email?.trim() || null, telefono?.trim() || null,
       id_rol, id_sucursal_default || null, activo ? 1 : 0, id]
    );

    const ip = req.ip || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'usuarios', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );

    res.json({ mensaje: 'Usuario actualizado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El email ya está en uso' });
    console.error('[updateUsuario]', err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// DELETE /api/usuarios/:id (soft delete)
const deleteUsuario = async (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.id_usuario) {
    return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
  }
  try {
    await db.promise().query(`UPDATE usuarios SET activo = 0 WHERE id_usuario = ?`, [id]);
    await db.promise().query(`UPDATE sesiones SET cerrada = 1 WHERE id_usuario = ? AND cerrada = 0`, [id]);

    const ip = req.ip || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'usuarios', ?, 'DELETE', ?)`,
      [req.user.id_usuario, id, ip]
    );

    res.json({ mensaje: 'Usuario desactivado' });
  } catch (err) {
    console.error('[deleteUsuario]', err);
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
};

// POST /api/usuarios/:id/reset-password
const resetPassword = async (req, res) => {
  const { id } = req.params;
  const { nueva_password } = req.body;

  if (!nueva_password || nueva_password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const hash = await bcrypt.hash(nueva_password, 10);
    await db.promise().query(
      `UPDATE usuarios SET password_hash = ?, debe_cambiar_pass = 1 WHERE id_usuario = ?`,
      [hash, id]
    );
    await db.promise().query(`UPDATE sesiones SET cerrada = 1 WHERE id_usuario = ? AND cerrada = 0`, [id]);

    const ip = req.ip || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'usuarios', ?, 'RESET_PASSWORD', ?)`,
      [req.user.id_usuario, id, ip]
    );

    res.json({ mensaje: 'Contraseña reseteada. El usuario deberá cambiarla al iniciar sesión.' });
  } catch (err) {
    console.error('[resetPassword]', err);
    res.status(500).json({ error: 'Error al resetear contraseña' });
  }
};

// PUT /api/usuarios/:id/sucursales
const asignarSucursales = async (req, res) => {
  const { id } = req.params;
  const { sucursales } = req.body;

  if (!Array.isArray(sucursales)) return res.status(400).json({ error: 'sucursales debe ser un array' });

  try {
    await db.promise().query(`DELETE FROM usuario_sucursal WHERE id_usuario = ?`, [id]);

    if (sucursales.length > 0) {
      const values = sucursales.map(sid => [Number(id), Number(sid)]);
      await db.promise().query(`INSERT INTO usuario_sucursal (id_usuario, id_sucursal) VALUES ?`, [values]);
    }

    const ip = req.ip || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'usuario_sucursal', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );

    res.json({ mensaje: 'Sucursales asignadas correctamente' });
  } catch (err) {
    console.error('[asignarSucursales]', err);
    res.status(500).json({ error: 'Error al asignar sucursales' });
  }
};

// POST /api/usuarios/:id/cerrar-sesiones
const cerrarSesiones = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.promise().query(
      `UPDATE sesiones SET cerrada = 1 WHERE id_usuario = ? AND cerrada = 0`, [id]
    );

    const ip = req.ip || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'sesiones', ?, 'CERRAR_SESIONES', ?)`,
      [req.user.id_usuario, id, ip]
    );

    res.json({ mensaje: `${result.affectedRows} sesión(es) cerrada(s)` });
  } catch (err) {
    console.error('[cerrarSesiones]', err);
    res.status(500).json({ error: 'Error al cerrar sesiones' });
  }
};

// PUT /api/usuarios/mi-perfil
const updateMiPerfil = async (req, res) => {
  const id = req.user.id_usuario;
  const { nombres, apellidos, email, telefono } = req.body;

  if (!nombres?.trim() || !apellidos?.trim()) {
    return res.status(400).json({ error: 'nombres y apellidos son requeridos' });
  }

  try {
    await db.promise().query(
      `UPDATE usuarios SET nombres=?, apellidos=?, email=?, telefono=? WHERE id_usuario=?`,
      [nombres.trim(), apellidos.trim(), email?.trim() || null, telefono?.trim() || null, id]
    );

    const ip = req.ip || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'usuarios', ?, 'UPDATE', ?)`,
      [id, id, ip]
    );

    res.json({ mensaje: 'Perfil actualizado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El email ya está en uso' });
    console.error('[updateMiPerfil]', err);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

module.exports = {
  getUsuarios, getUsuario, createUsuario, updateUsuario, deleteUsuario,
  resetPassword, asignarSucursales, cerrarSesiones, updateMiPerfil,
};
