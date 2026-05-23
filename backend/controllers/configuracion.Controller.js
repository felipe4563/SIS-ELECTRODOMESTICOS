const db = require('../config/db');

// GET /api/configuracion
const getParametros = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT * FROM configuracion_sistema ORDER BY clave ASC`
    );
    return res.json({ parametros: rows });
  } catch (err) {
    console.error('[getParametros]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// PUT /api/configuracion/:clave
const updateParametro = async (req, res) => {
  const { clave } = req.params;
  const { valor } = req.body;

  if (valor === undefined || valor === null)
    return res.status(400).json({ error: 'El valor es requerido' });

  try {
    const [existing] = await db.promise().query(
      `SELECT id_config FROM configuracion_sistema WHERE clave = ?`, [clave]
    );
    if (existing.length === 0)
      return res.status(404).json({ error: 'Parámetro no encontrado' });

    await db.promise().query(
      `UPDATE configuracion_sistema SET valor = ? WHERE clave = ?`,
      [String(valor), clave]
    );

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'configuracion_sistema', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, existing[0].id_config, ip]
    );

    const [updated] = await db.promise().query(
      `SELECT * FROM configuracion_sistema WHERE clave = ?`, [clave]
    );
    return res.json({ parametro: updated[0] });
  } catch (err) {
    console.error('[updateParametro]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getParametros, updateParametro };
