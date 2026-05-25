const db = require('../config/db');

const TIPOS_VALIDOS = ['ALMACEN', 'DEPOSITO_PEQUENO', 'PUNTO_VENTA', 'TRANSITO'];

// GET /api/depositos
const getDepositos = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT d.*, s.nombre AS sucursal_nombre
       FROM depositos d
       JOIN sucursales s ON d.id_sucursal = s.id_sucursal
       ORDER BY s.nombre ASC, d.nombre ASC`
    );
    return res.json({ depositos: rows });
  } catch (err) {
    console.error('[getDepositos]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// GET /api/depositos/:id
const getDeposito = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT d.*, s.nombre AS sucursal_nombre
       FROM depositos d
       JOIN sucursales s ON d.id_sucursal = s.id_sucursal
       WHERE d.id_deposito = ?`, [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Depósito no encontrado' });
    return res.json({ deposito: rows[0] });
  } catch (err) {
    console.error('[getDeposito]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// POST /api/depositos
const createDeposito = async (req, res) => {
  const { id_sucursal, codigo, nombre, tipo, direccion, encargado, permite_venta } = req.body;

  if (!id_sucursal || !codigo?.trim() || !nombre?.trim() || !tipo)
    return res.status(400).json({ error: 'Sucursal, código, nombre y tipo son requeridos' });
  if (!TIPOS_VALIDOS.includes(tipo))
    return res.status(400).json({ error: 'Tipo de depósito inválido' });

  try {
    const [result] = await db.promise().query(
      `INSERT INTO depositos (id_sucursal, codigo, nombre, tipo, direccion, encargado, permite_venta)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_sucursal, codigo.trim(), nombre.trim(), tipo,
       direccion ?? null, encargado ?? null, permite_venta ? 1 : 1]
    );

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'depositos', ?, 'INSERT', ?)`,
      [req.user.id_usuario, result.insertId, ip]
    );

    const [nuevo] = await db.promise().query(
      `SELECT d.*, s.nombre AS sucursal_nombre
       FROM depositos d JOIN sucursales s ON d.id_sucursal = s.id_sucursal
       WHERE d.id_deposito = ?`, [result.insertId]
    );
    return res.status(201).json({ deposito: nuevo[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El código de depósito ya existe' });
    console.error('[createDeposito]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// PUT /api/depositos/:id
const updateDeposito = async (req, res) => {
  const { id } = req.params;
  const { id_sucursal, codigo, nombre, tipo, direccion, encargado, permite_venta, activo } = req.body;

  if (!id_sucursal || !codigo?.trim() || !nombre?.trim() || !tipo)
    return res.status(400).json({ error: 'Sucursal, código, nombre y tipo son requeridos' });
  if (!TIPOS_VALIDOS.includes(tipo))
    return res.status(400).json({ error: 'Tipo de depósito inválido' });

  try {
    const [result] = await db.promise().query(
      `UPDATE depositos
       SET id_sucursal = ?, codigo = ?, nombre = ?, tipo = ?,
           direccion = ?, encargado = ?, permite_venta = ?, activo = ?
       WHERE id_deposito = ?`,
      [id_sucursal, codigo.trim(), nombre.trim(), tipo,
       direccion ?? null, encargado ?? null,
       permite_venta ? 1 : 0, activo !== undefined ? (activo ? 1 : 0) : 1, id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Depósito no encontrado' });

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'depositos', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );

    const [updated] = await db.promise().query(
      `SELECT d.*, s.nombre AS sucursal_nombre
       FROM depositos d JOIN sucursales s ON d.id_sucursal = s.id_sucursal
       WHERE d.id_deposito = ?`, [id]
    );
    return res.json({ deposito: updated[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El código de depósito ya existe' });
    console.error('[updateDeposito]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// DELETE /api/depositos/:id
const deleteDeposito = async (req, res) => {
  const { id } = req.params;
  try {
    const [[rowsK], [rowsV], [rowsC], [rowsT], [rowsA], [rowsD], [rowsS]] = await Promise.all([
      db.promise().query(`SELECT COUNT(*) AS cnt FROM kardex WHERE id_deposito = ?`, [id]),
      db.promise().query(`SELECT COUNT(*) AS cnt FROM ventas WHERE id_deposito = ?`, [id]),
      db.promise().query(`SELECT COUNT(*) AS cnt FROM compras WHERE id_deposito_destino = ?`, [id]),
      db.promise().query(`SELECT COUNT(*) AS cnt FROM transferencias WHERE id_deposito_origen = ? OR id_deposito_destino = ?`, [id, id]),
      db.promise().query(`SELECT COUNT(*) AS cnt FROM ajustes_inventario WHERE id_deposito = ?`, [id]),
      db.promise().query(`SELECT COUNT(*) AS cnt FROM devoluciones_venta WHERE id_deposito = ?`, [id]),
      db.promise().query(`SELECT COUNT(*) AS cnt FROM stock WHERE id_deposito = ? AND cantidad > 0`, [id]),
    ]);

    if (rowsK[0].cnt > 0)
      return res.status(400).json({ error: 'No se puede desactivar: el depósito tiene movimientos en el kardex' });
    if (rowsV[0].cnt > 0)
      return res.status(400).json({ error: 'No se puede desactivar: el depósito tiene ventas asociadas' });
    if (rowsC[0].cnt > 0)
      return res.status(400).json({ error: 'No se puede desactivar: el depósito tiene compras asociadas' });
    if (rowsT[0].cnt > 0)
      return res.status(400).json({ error: 'No se puede desactivar: el depósito tiene transferencias asociadas' });
    if (rowsA[0].cnt > 0)
      return res.status(400).json({ error: 'No se puede desactivar: el depósito tiene ajustes de inventario asociados' });
    if (rowsD[0].cnt > 0)
      return res.status(400).json({ error: 'No se puede desactivar: el depósito tiene devoluciones asociadas' });
    if (rowsS[0].cnt > 0)
      return res.status(400).json({ error: 'No se puede desactivar: el depósito tiene existencias físicas de productos' });

    const [result] = await db.promise().query(
      `UPDATE depositos SET activo = 0 WHERE id_deposito = ?`, [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Depósito no encontrado' });

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'depositos', ?, 'DELETE', ?)`,
      [req.user.id_usuario, id, ip]
    );
    return res.json({ mensaje: 'Depósito desactivado correctamente' });
  } catch (err) {
    console.error('[deleteDeposito]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getDepositos, getDeposito, createDeposito, updateDeposito, deleteDeposito };
