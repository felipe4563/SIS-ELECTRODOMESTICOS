const db = require('../config/db');

// Distancia en metros entre dos coordenadas (fórmula haversine)
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/asistencia/hoy — estado del propio usuario logueado
const getMiAsistenciaHoy = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT id_asistencia, hora_entrada, hora_salida, estado
       FROM asistencias WHERE id_usuario = ? AND fecha = CURDATE()`,
      [req.user.id_usuario]
    );
    res.json({ asistencia: rows[0] || null });
  } catch (err) {
    console.error('[getMiAsistenciaHoy]', err);
    res.status(500).json({ error: 'Error al obtener asistencia del día' });
  }
};

async function validarUbicacion(id_usuario, lat, lng) {
  const [rows] = await db.promise().query(
    `SELECT s.latitud, s.longitud, s.radio_metros, s.nombre AS sucursal_nombre
     FROM usuarios u JOIN sucursales s ON s.id_sucursal = u.id_sucursal_default
     WHERE u.id_usuario = ?`,
    [id_usuario]
  );
  if (rows.length === 0) return { ok: false, error: 'El usuario no tiene sucursal asignada' };
  const s = rows[0];
  if (s.latitud === null || s.longitud === null) {
    return { ok: false, error: `La sucursal "${s.sucursal_nombre}" no tiene ubicación configurada. Contactá al administrador.` };
  }
  const distancia = distanciaMetros(Number(s.latitud), Number(s.longitud), lat, lng);
  if (distancia > s.radio_metros) {
    return { ok: false, error: `Estás a ${Math.round(distancia)} m de tu sucursal (máximo permitido: ${s.radio_metros} m).` };
  }
  return { ok: true };
}

// POST /api/asistencia/entrada  body: { lat, lng }
const marcarEntrada = async (req, res) => {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Ubicación GPS requerida' });
  }
  try {
    const [existe] = await db.promise().query(
      `SELECT id_asistencia FROM asistencias WHERE id_usuario = ? AND fecha = CURDATE()`,
      [req.user.id_usuario]
    );
    if (existe.length > 0) {
      return res.status(400).json({ error: 'Ya marcaste entrada hoy' });
    }

    const val = await validarUbicacion(req.user.id_usuario, Number(lat), Number(lng));
    if (!val.ok) return res.status(400).json({ error: val.error });

    const [[u]] = await db.promise().query(
      `SELECT hora_entrada_esperada FROM usuarios WHERE id_usuario = ?`, [req.user.id_usuario]
    );

    let estado = 'PRESENTE';
    if (u.hora_entrada_esperada) {
      const [h, m] = u.hora_entrada_esperada.split(':').map(Number);
      const esperada = new Date();
      esperada.setHours(h, m + 10, 0, 0); // 10 min de tolerancia
      if (new Date() > esperada) estado = 'TARDANZA';
    }

    await db.promise().query(
      `INSERT INTO asistencias (id_usuario, fecha, hora_entrada, lat_entrada, lng_entrada, estado)
       VALUES (?, CURDATE(), CURTIME(), ?, ?, ?)`,
      [req.user.id_usuario, lat, lng, estado]
    );
    res.status(201).json({ mensaje: 'Entrada registrada', estado });
  } catch (err) {
    console.error('[marcarEntrada]', err);
    res.status(500).json({ error: 'Error al marcar entrada' });
  }
};

// POST /api/asistencia/salida  body: { lat, lng }
const marcarSalida = async (req, res) => {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Ubicación GPS requerida' });
  }
  try {
    const [rows] = await db.promise().query(
      `SELECT id_asistencia, hora_salida FROM asistencias WHERE id_usuario = ? AND fecha = CURDATE()`,
      [req.user.id_usuario]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Todavía no marcaste entrada hoy' });
    if (rows[0].hora_salida) return res.status(400).json({ error: 'Ya marcaste salida hoy' });

    const val = await validarUbicacion(req.user.id_usuario, Number(lat), Number(lng));
    if (!val.ok) return res.status(400).json({ error: val.error });

    await db.promise().query(
      `UPDATE asistencias SET hora_salida = CURTIME(), lat_salida = ?, lng_salida = ? WHERE id_asistencia = ?`,
      [lat, lng, rows[0].id_asistencia]
    );
    res.json({ mensaje: 'Salida registrada' });
  } catch (err) {
    console.error('[marcarSalida]', err);
    res.status(500).json({ error: 'Error al marcar salida' });
  }
};

// GET /api/asistencia?fecha_desde=&fecha_hasta=&id_usuario=&id_sucursal=&estado=
const getAsistencias = async (req, res) => {
  const { fecha_desde, fecha_hasta, id_usuario, id_sucursal, estado } = req.query;
  const cond = [];
  const params = [];
  if (fecha_desde) { cond.push('a.fecha >= ?'); params.push(fecha_desde); }
  if (fecha_hasta) { cond.push('a.fecha <= ?'); params.push(fecha_hasta); }
  if (id_usuario)  { cond.push('a.id_usuario = ?'); params.push(id_usuario); }
  if (id_sucursal) { cond.push('u.id_sucursal_default = ?'); params.push(id_sucursal); }
  if (estado)      { cond.push('a.estado = ?'); params.push(estado); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

  try {
    const [rows] = await db.promise().query(
      `SELECT a.id_asistencia, a.fecha, a.hora_entrada, a.hora_salida, a.estado, a.motivo_falta,
              CONCAT(u.nombres, ' ', u.apellidos) AS empleado, u.id_usuario,
              s.nombre AS sucursal_nombre
       FROM asistencias a
       JOIN usuarios u ON u.id_usuario = a.id_usuario
       LEFT JOIN sucursales s ON s.id_sucursal = u.id_sucursal_default
       ${where}
       ORDER BY a.fecha DESC, empleado ASC
       LIMIT 500`,
      params
    );
    res.json({ asistencias: rows });
  } catch (err) {
    console.error('[getAsistencias]', err);
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
};

// PUT /api/asistencia/:id/justificar  body: { motivo }
const justificarFalta = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  if (!motivo?.trim()) return res.status(400).json({ error: 'El motivo es requerido' });
  try {
    const [result] = await db.promise().query(
      `UPDATE asistencias SET estado = 'JUSTIFICADA', motivo_falta = ?, id_usuario_edito = ?, fecha_edicion = NOW()
       WHERE id_asistencia = ? AND estado = 'FALTA'`,
      [motivo.trim(), req.user.id_usuario, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro no encontrado o no está en estado FALTA' });
    }
    res.json({ mensaje: 'Falta justificada' });
  } catch (err) {
    console.error('[justificarFalta]', err);
    res.status(500).json({ error: 'Error al justificar falta' });
  }
};

// Genera faltas del día anterior para usuarios activos con horario asignado
// que no tengan fila de asistencia ese día. Usado por el cron (Task 4).
const generarFaltasDelDia = async (fechaISO) => {
  const [pendientes] = await db.promise().query(
    `SELECT u.id_usuario FROM usuarios u
     WHERE u.activo = 1 AND u.hora_entrada_esperada IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM asistencias a WHERE a.id_usuario = u.id_usuario AND a.fecha = ?)`,
    [fechaISO]
  );
  for (const u of pendientes) {
    await db.promise().query(
      `INSERT INTO asistencias (id_usuario, fecha, estado) VALUES (?, ?, 'FALTA')`,
      [u.id_usuario, fechaISO]
    );
  }
  return pendientes.length;
};

module.exports = { getMiAsistenciaHoy, marcarEntrada, marcarSalida, validarUbicacion, distanciaMetros, getAsistencias, justificarFalta, generarFaltasDelDia };
