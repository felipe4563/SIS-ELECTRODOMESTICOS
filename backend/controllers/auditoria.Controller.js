const db = require('../config/db');

// ── Log de auditoría ───────────────────────────────────────────────────────
async function getAuditoria(req, res) {
  try {
    const { id_usuario, tabla, accion, fecha_desde, fecha_hasta, buscar } = req.query;

    const where  = [];
    const params = [];

    if (id_usuario)  { where.push('a.id_usuario = ?');          params.push(id_usuario); }
    if (tabla)       { where.push('a.tabla = ?');               params.push(tabla); }
    if (accion)      { where.push('a.accion = ?');              params.push(accion); }
    if (fecha_desde) { where.push('DATE(a.fecha) >= ?');        params.push(fecha_desde); }
    if (fecha_hasta) { where.push('DATE(a.fecha) <= ?');        params.push(fecha_hasta); }
    if (buscar)      { where.push('(a.tabla LIKE ? OR a.accion LIKE ? OR a.ip_origen LIKE ?)');
                       params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`); }

    const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await db.promise().query(`
      SELECT a.id_auditoria, a.tabla, a.id_registro, a.accion,
        a.datos_antes, a.datos_despues, a.ip_origen,
        DATE_FORMAT(a.fecha, '%Y-%m-%d %H:%i:%s') AS fecha,
        a.id_usuario,
        CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
        u.username
      FROM auditoria a
      LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
      ${whereStr}
      ORDER BY a.fecha DESC
      LIMIT 500
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Tablas distintas (para filtro) ─────────────────────────────────────────
async function getTablas(req, res) {
  try {
    const [rows] = await db.promise().query(`
      SELECT DISTINCT tabla FROM auditoria ORDER BY tabla
    `);
    res.json(rows.map(r => r.tabla));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Usuarios para filtro ────────────────────────────────────────────────────
async function getUsuariosAudit(req, res) {
  try {
    const [rows] = await db.promise().query(`
      SELECT DISTINCT u.id_usuario,
        CONCAT(u.nombres, ' ', u.apellidos) AS nombre, u.username
      FROM auditoria a
      JOIN usuarios u ON u.id_usuario = a.id_usuario
      ORDER BY nombre
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Sesiones activas ────────────────────────────────────────────────────────
async function getSesiones(req, res) {
  try {
    const [rows] = await db.promise().query(`
      SELECT s.id_sesion, s.ip_origen, s.user_agent,
        DATE_FORMAT(s.fecha_inicio, '%Y-%m-%d %H:%i:%s') AS fecha_inicio,
        DATE_FORMAT(s.fecha_expiracion, '%Y-%m-%d %H:%i:%s') AS fecha_expiracion,
        s.cerrada,
        u.id_usuario,
        CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
        u.username, r.nombre AS rol
      FROM sesiones s
      JOIN usuarios u ON u.id_usuario = s.id_usuario
      JOIN roles r ON r.id_rol = u.id_rol
      WHERE s.cerrada = 0 AND s.fecha_expiracion > NOW()
      ORDER BY s.fecha_inicio DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Cerrar sesión forzada ───────────────────────────────────────────────────
async function cerrarSesion(req, res) {
  try {
    const { id } = req.params;
    const ip = req.ip || req.socket?.remoteAddress || null;

    const [[sesion]] = await db.promise().query(
      'SELECT id_usuario FROM sesiones WHERE id_sesion = ?', [id]
    );
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });

    await db.promise().query(
      'UPDATE sesiones SET cerrada = 1 WHERE id_sesion = ?', [id]
    );

    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'sesiones', ?, 'DELETE', ?)`,
      [req.user.id_usuario, id, ip]
    );

    res.json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAuditoria, getTablas, getUsuariosAudit, getSesiones, cerrarSesion };
