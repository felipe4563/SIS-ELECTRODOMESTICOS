const db = require('../config/db');

const getBancos = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`SELECT * FROM bancos ORDER BY nombre ASC`);
    return res.json({ bancos: rows });
  } catch (err) {
    console.error('[getBancos]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const createBanco = async (req, res) => {
  const { codigo, nombre, sigla, pais } = req.body;
  if (!codigo?.trim() || !nombre?.trim())
    return res.status(400).json({ error: 'Código y nombre son requeridos' });

  try {
    const [result] = await db.promise().query(
      `INSERT INTO bancos (codigo, nombre, sigla, pais) VALUES (?, ?, ?, ?)`,
      [codigo.trim().toUpperCase(), nombre.trim(), sigla ?? null, pais ?? 'Bolivia']
    );

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'bancos', ?, 'INSERT', ?)`,
      [req.user.id_usuario, result.insertId, ip]
    );

    const [nuevo] = await db.promise().query(`SELECT * FROM bancos WHERE id_banco = ?`, [result.insertId]);
    return res.status(201).json({ banco: nuevo[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El código de banco ya existe' });
    console.error('[createBanco]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const updateBanco = async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, sigla, pais, activo } = req.body;
  if (!codigo?.trim() || !nombre?.trim())
    return res.status(400).json({ error: 'Código y nombre son requeridos' });

  try {
    const [result] = await db.promise().query(
      `UPDATE bancos SET codigo = ?, nombre = ?, sigla = ?, pais = ?, activo = ? WHERE id_banco = ?`,
      [codigo.trim().toUpperCase(), nombre.trim(), sigla ?? null, pais ?? 'Bolivia',
       activo !== undefined ? (activo ? 1 : 0) : 1, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Banco no encontrado' });

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'bancos', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );

    const [updated] = await db.promise().query(`SELECT * FROM bancos WHERE id_banco = ?`, [id]);
    return res.json({ banco: updated[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El código de banco ya existe' });
    console.error('[updateBanco]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const deleteBanco = async (req, res) => {
  const { id } = req.params;
  try {
    const [[uso]] = await db.promise().query(
      `SELECT COUNT(*) AS cnt FROM proveedor_cuentas_pago WHERE id_banco = ? AND activo = 1`, [id]
    );
    if (uso.cnt > 0)
      return res.status(400).json({ error: 'No se puede desactivar: el banco tiene cuentas de proveedores asociadas' });

    const [result] = await db.promise().query(`UPDATE bancos SET activo = 0 WHERE id_banco = ?`, [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Banco no encontrado' });

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'bancos', ?, 'DELETE', ?)`,
      [req.user.id_usuario, id, ip]
    );
    return res.json({ mensaje: 'Banco desactivado correctamente' });
  } catch (err) {
    console.error('[deleteBanco]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getBancos, createBanco, updateBanco, deleteBanco };
