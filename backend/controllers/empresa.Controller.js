const db = require('../config/db');

// GET /api/empresa
const getEmpresa = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT * FROM empresas WHERE activo = 1 LIMIT 1`
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'No se encontró información de la empresa' });
    return res.json({ empresa: rows[0] });
  } catch (err) {
    console.error('[getEmpresa]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// PUT /api/empresa/:id
const updateEmpresa = async (req, res) => {
  const { id } = req.params;
  const { razon_social, nombre_comercial, nit, direccion, telefono, email, logo_url } = req.body;

  if (!razon_social?.trim())
    return res.status(400).json({ error: 'La razón social es requerida' });

  try {
    const [result] = await db.promise().query(
      `UPDATE empresas
       SET razon_social = ?, nombre_comercial = ?, nit = ?,
           direccion = ?, telefono = ?, email = ?, logo_url = ?
       WHERE id_empresa = ? AND activo = 1`,
      [razon_social.trim(), nombre_comercial ?? null, nit ?? null,
       direccion ?? null, telefono ?? null, email ?? null, logo_url ?? null, id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Empresa no encontrada' });

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'empresas', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );

    const [updated] = await db.promise().query(
      `SELECT * FROM empresas WHERE id_empresa = ?`, [id]
    );
    return res.json({ empresa: updated[0] });
  } catch (err) {
    console.error('[updateEmpresa]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getEmpresa, updateEmpresa };
