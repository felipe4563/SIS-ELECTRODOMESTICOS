const db = require('../config/db');

const TIPOS_VALIDOS = ['VENTA', 'COMPRA', 'AMBOS', 'RETENCION'];

const getImpuestos = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`SELECT * FROM impuestos ORDER BY nombre ASC`);
    return res.json({ impuestos: rows });
  } catch (err) {
    console.error('[getImpuestos]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const createImpuesto = async (req, res) => {
  const { codigo, nombre, porcentaje, tipo, es_default } = req.body;
  if (!codigo?.trim() || !nombre?.trim() || porcentaje === undefined || porcentaje === null)
    return res.status(400).json({ error: 'Código, nombre y porcentaje son requeridos' });
  if (!TIPOS_VALIDOS.includes(tipo))
    return res.status(400).json({ error: 'Tipo inválido. Use: VENTA, COMPRA, AMBOS o RETENCION' });
  if (Number(porcentaje) < 0 || Number(porcentaje) > 100)
    return res.status(400).json({ error: 'El porcentaje debe estar entre 0 y 100' });

  try {
    const [result] = await db.promise().query(
      `INSERT INTO impuestos (codigo, nombre, porcentaje, tipo, es_default) VALUES (?, ?, ?, ?, ?)`,
      [codigo.trim().toUpperCase(), nombre.trim(), porcentaje, tipo, es_default ? 1 : 0]
    );

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'impuestos', ?, 'INSERT', ?)`,
      [req.user.id_usuario, result.insertId, ip]
    );

    const [nuevo] = await db.promise().query(`SELECT * FROM impuestos WHERE id_impuesto = ?`, [result.insertId]);
    return res.status(201).json({ impuesto: nuevo[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El código de impuesto ya existe' });
    console.error('[createImpuesto]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const updateImpuesto = async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, porcentaje, tipo, es_default, activo } = req.body;
  if (!codigo?.trim() || !nombre?.trim() || porcentaje === undefined || porcentaje === null)
    return res.status(400).json({ error: 'Código, nombre y porcentaje son requeridos' });
  if (!TIPOS_VALIDOS.includes(tipo))
    return res.status(400).json({ error: 'Tipo inválido' });

  try {
    const [result] = await db.promise().query(
      `UPDATE impuestos SET codigo = ?, nombre = ?, porcentaje = ?, tipo = ?, es_default = ?, activo = ? WHERE id_impuesto = ?`,
      [codigo.trim().toUpperCase(), nombre.trim(), porcentaje, tipo, es_default ? 1 : 0,
       activo !== undefined ? (activo ? 1 : 0) : 1, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Impuesto no encontrado' });

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'impuestos', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );

    const [updated] = await db.promise().query(`SELECT * FROM impuestos WHERE id_impuesto = ?`, [id]);
    return res.json({ impuesto: updated[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El código de impuesto ya existe' });
    console.error('[updateImpuesto]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const deleteImpuesto = async (req, res) => {
  const { id } = req.params;
  try {
    const [[rowsCD], [rowsPD]] = await Promise.all([
      db.promise().query(`SELECT COUNT(*) AS cnt FROM compra_detalle WHERE id_impuesto = ?`, [id]),
      db.promise().query(`SELECT COUNT(*) AS cnt FROM productos WHERE id_impuesto_default = ? AND activo = 1`, [id]),
    ]);
    if (rowsCD[0].cnt > 0 || rowsPD[0].cnt > 0)
      return res.status(400).json({ error: 'No se puede desactivar: el impuesto está en uso en compras o productos' });

    const [result] = await db.promise().query(`UPDATE impuestos SET activo = 0 WHERE id_impuesto = ?`, [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Impuesto no encontrado' });

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, 'impuestos', ?, 'DELETE', ?)`,
      [req.user.id_usuario, id, ip]
    );
    return res.json({ mensaje: 'Impuesto desactivado correctamente' });
  } catch (err) {
    console.error('[deleteImpuesto]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getImpuestos, createImpuesto, updateImpuesto, deleteImpuesto };
