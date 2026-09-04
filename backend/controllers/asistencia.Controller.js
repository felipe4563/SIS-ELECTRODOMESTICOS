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
      `SELECT a.id_asistencia, a.hora_entrada, a.hora_salida, a.estado,
              s.nombre AS sucursal_nombre
       FROM asistencias a
       JOIN usuarios u ON u.id_usuario = a.id_usuario
       LEFT JOIN sucursales s ON s.id_sucursal = u.id_sucursal_default
       WHERE a.id_usuario = ? AND a.fecha = CURDATE()`,
      [req.user.id_usuario]
    );
    res.json({ asistencia: rows[0] || null });
  } catch (err) {
    console.error('[getMiAsistenciaHoy]', err);
    res.status(500).json({ error: 'Error al obtener asistencia del día' });
  }
};

// GET /api/asistencia/mi-historial — últimos N días del propio usuario logueado
const getMiHistorial = async (req, res) => {
  const dias = Math.min(Number(req.query.dias) || 7, 30);
  try {
    const [rows] = await db.promise().query(
      `SELECT id_asistencia, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
              hora_entrada, hora_salida, estado, motivo_falta
       FROM asistencias
       WHERE id_usuario = ? AND fecha < CURDATE()
       ORDER BY fecha DESC
       LIMIT ?`,
      [req.user.id_usuario, dias]
    );
    res.json({ historial: rows });
  } catch (err) {
    console.error('[getMiHistorial]', err);
    res.status(500).json({ error: 'Error al obtener historial de asistencia' });
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

// Expresión SQL que decide PRESENTE/TARDANZA usando el reloj de MySQL
// (CURTIME/CURDATE), nunca el reloj del proceso Node — evita desajustes de
// zona horaria entre el contenedor (UTC) y el negocio (America/La_Paz).
const ESTADO_CASE_SQL = `CASE WHEN u.hora_entrada_esperada IS NOT NULL
                                AND CURTIME() > ADDTIME(u.hora_entrada_esperada, '00:10:00')
                               THEN 'TARDANZA' ELSE 'PRESENTE' END`;

// POST /api/asistencia/entrada  body: { lat, lng }
const marcarEntrada = async (req, res) => {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Ubicación GPS requerida' });
  }
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return res.status(400).json({ error: 'Ubicación GPS inválida' });
  }
  try {
    const [existe] = await db.promise().query(
      `SELECT id_asistencia, hora_entrada FROM asistencias WHERE id_usuario = ? AND fecha = CURDATE()`,
      [req.user.id_usuario]
    );

    // Ya hay una entrada real marcada hoy: bloquear.
    if (existe.length > 0 && existe[0].hora_entrada !== null) {
      return res.status(400).json({ error: 'Ya marcaste entrada hoy' });
    }

    const val = await validarUbicacion(req.user.id_usuario, latNum, lngNum);
    if (!val.ok) return res.status(400).json({ error: val.error });

    let idAsistencia;
    if (existe.length > 0) {
      // Ya existe una fila de hoy sin hora_entrada (FALTA generada por el cron):
      // convertirla en una marcación real en vez de bloquear.
      idAsistencia = existe[0].id_asistencia;
      await db.promise().query(
        `UPDATE asistencias a
         JOIN usuarios u ON u.id_usuario = a.id_usuario
         SET a.hora_entrada = CURTIME(), a.lat_entrada = ?, a.lng_entrada = ?,
             a.estado = ${ESTADO_CASE_SQL}
         WHERE a.id_asistencia = ?`,
        [latNum, lngNum, idAsistencia]
      );
    } else {
      const [result] = await db.promise().query(
        `INSERT INTO asistencias (id_usuario, fecha, hora_entrada, lat_entrada, lng_entrada, estado)
         SELECT ?, CURDATE(), CURTIME(), ?, ?, ${ESTADO_CASE_SQL}
         FROM usuarios u WHERE u.id_usuario = ?`,
        [req.user.id_usuario, latNum, lngNum, req.user.id_usuario]
      );
      idAsistencia = result.insertId;
    }

    const [[fila]] = await db.promise().query(
      `SELECT estado FROM asistencias WHERE id_asistencia = ?`, [idAsistencia]
    );
    res.status(201).json({ mensaje: 'Entrada registrada', estado: fila.estado });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ya marcaste entrada hoy' });
    }
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
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return res.status(400).json({ error: 'Ubicación GPS inválida' });
  }
  try {
    const [rows] = await db.promise().query(
      `SELECT id_asistencia, hora_salida FROM asistencias WHERE id_usuario = ? AND fecha = CURDATE()`,
      [req.user.id_usuario]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Todavía no marcaste entrada hoy' });
    if (rows[0].hora_salida) return res.status(400).json({ error: 'Ya marcaste salida hoy' });

    const val = await validarUbicacion(req.user.id_usuario, latNum, lngNum);
    if (!val.ok) return res.status(400).json({ error: val.error });

    await db.promise().query(
      `UPDATE asistencias SET hora_salida = CURTIME(), lat_salida = ?, lng_salida = ? WHERE id_asistencia = ?`,
      [latNum, lngNum, rows[0].id_asistencia]
    );
    res.json({ mensaje: 'Salida registrada' });
  } catch (err) {
    console.error('[marcarSalida]', err);
    res.status(500).json({ error: 'Error al marcar salida' });
  }
};

// GET /api/asistencia?fecha_desde=&fecha_hasta=&id_usuario=&id_sucursal=&estado=
const getAsistencias = async (req, res) => {
  const { fecha_desde, fecha_hasta, id_usuario, id_sucursal, estado, page = 1, limit = 20 } = req.query;
  const cond = [];
  const params = [];
  if (fecha_desde) { cond.push('a.fecha >= ?'); params.push(fecha_desde); }
  if (fecha_hasta) { cond.push('a.fecha <= ?'); params.push(fecha_hasta); }
  if (id_usuario)  { cond.push('a.id_usuario = ?'); params.push(id_usuario); }
  if (id_sucursal) { cond.push('u.id_sucursal_default = ?'); params.push(id_sucursal); }
  if (estado)      { cond.push('a.estado = ?'); params.push(estado); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

  const limitNum = Math.min(Number(limit) || 20, 200);
  const offset = (Number(page) - 1) * limitNum;

  try {
    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM asistencias a
       JOIN usuarios u ON u.id_usuario = a.id_usuario
       LEFT JOIN sucursales s ON s.id_sucursal = u.id_sucursal_default
       ${where}`,
      params
    );

    const [rows] = await db.promise().query(
      `SELECT a.id_asistencia, DATE_FORMAT(a.fecha, '%Y-%m-%d') AS fecha, a.hora_entrada, a.hora_salida, a.estado, a.motivo_falta,
              CONCAT(u.nombres, ' ', u.apellidos) AS empleado, u.id_usuario,
              s.nombre AS sucursal_nombre
       FROM asistencias a
       JOIN usuarios u ON u.id_usuario = a.id_usuario
       LEFT JOIN sucursales s ON s.id_sucursal = u.id_sucursal_default
       ${where}
       ORDER BY a.fecha DESC, empleado ASC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({ asistencias: rows, total: Number(total), page: Number(page), limit: limitNum });
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

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'asistencias', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );

    res.json({ mensaje: 'Falta justificada' });
  } catch (err) {
    console.error('[justificarFalta]', err);
    res.status(500).json({ error: 'Error al justificar falta' });
  }
};

// Genera faltas del día anterior para usuarios activos con horario asignado
// que no tengan fila de asistencia ese día. Usado por el cron (Task 4).
// "Ayer" se calcula con CURDATE() de MySQL, no con Date de Node, para que
// use el mismo reloj/calendario que el resto de la lógica de asistencia.
const generarFaltasDelDia = async () => {
  const [[{ fecha }]] = await db.promise().query(
    `SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d') AS fecha`
  );
  const [pendientes] = await db.promise().query(
    `SELECT u.id_usuario FROM usuarios u
     WHERE u.activo = 1 AND u.hora_entrada_esperada IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM asistencias a
         WHERE a.id_usuario = u.id_usuario AND a.fecha = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
       )`
  );
  for (const u of pendientes) {
    await db.promise().query(
      `INSERT INTO asistencias (id_usuario, fecha, estado) VALUES (?, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'FALTA')`,
      [u.id_usuario]
    );
  }
  return { total: pendientes.length, fecha };
};

module.exports = { getMiAsistenciaHoy, getMiHistorial, marcarEntrada, marcarSalida, validarUbicacion, distanciaMetros, getAsistencias, justificarFalta, generarFaltasDelDia };
