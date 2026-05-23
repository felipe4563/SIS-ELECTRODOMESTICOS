const db = require('../config/db');

// GET /api/sucursales
const getSucursales = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT s.*, e.nombre_comercial AS empresa_nombre
       FROM sucursales s
       JOIN empresas e ON s.id_empresa = e.id_empresa
       ORDER BY s.tipo DESC, s.nombre ASC`
    );
    return res.json({ sucursales: rows });
  } catch (err) {
    console.error('[getSucursales]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// GET /api/sucursales/:id
const getSucursal = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT * FROM sucursales WHERE id_sucursal = ?`, [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Sucursal no encontrada' });
    return res.json({ sucursal: rows[0] });
  } catch (err) {
    console.error('[getSucursal]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// POST /api/sucursales
const createSucursal = async (req, res) => {
  const { id_empresa, codigo, nombre, tipo, direccion, ciudad, telefono, responsable, es_punto_venta } = req.body;

  if (!codigo?.trim() || !nombre?.trim() || !tipo)
    return res.status(400).json({ error: 'Código, nombre y tipo son requeridos' });
  if (!['PRINCIPAL', 'SUCURSAL'].includes(tipo))
    return res.status(400).json({ error: 'Tipo inválido' });

  try {
    const [emp] = await db.promise().query(
      `SELECT id_empresa FROM empresas WHERE activo = 1 LIMIT 1`
    );
    if (emp.length === 0)
      return res.status(400).json({ error: 'No existe empresa registrada' });

    const empresaId = id_empresa ?? emp[0].id_empresa;

    const [result] = await db.promise().query(
      `INSERT INTO sucursales (id_empresa, codigo, nombre, tipo, direccion, ciudad, telefono, responsable, es_punto_venta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [empresaId, codigo.trim(), nombre.trim(), tipo,
       direccion ?? null, ciudad ?? null, telefono ?? null,
       responsable ?? null, es_punto_venta ? 1 : 1]
    );

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'sucursales', ?, 'INSERT', ?)`,
      [req.user.id_usuario, result.insertId, ip]
    );

    const [nueva] = await db.promise().query(
      `SELECT * FROM sucursales WHERE id_sucursal = ?`, [result.insertId]
    );
    return res.status(201).json({ sucursal: nueva[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El código de sucursal ya existe' });
    console.error('[createSucursal]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// PUT /api/sucursales/:id
const updateSucursal = async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, tipo, direccion, ciudad, telefono, responsable, es_punto_venta, activo } = req.body;

  if (!codigo?.trim() || !nombre?.trim() || !tipo)
    return res.status(400).json({ error: 'Código, nombre y tipo son requeridos' });

  try {
    const [result] = await db.promise().query(
      `UPDATE sucursales
       SET codigo = ?, nombre = ?, tipo = ?, direccion = ?,
           ciudad = ?, telefono = ?, responsable = ?, es_punto_venta = ?, activo = ?
       WHERE id_sucursal = ?`,
      [codigo.trim(), nombre.trim(), tipo, direccion ?? null,
       ciudad ?? null, telefono ?? null, responsable ?? null,
       es_punto_venta ? 1 : 0, activo !== undefined ? (activo ? 1 : 0) : 1, id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Sucursal no encontrada' });

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'sucursales', ?, 'UPDATE', ?)`,
      [req.user.id_usuario, id, ip]
    );

    const [updated] = await db.promise().query(
      `SELECT * FROM sucursales WHERE id_sucursal = ?`, [id]
    );
    return res.json({ sucursal: updated[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El código de sucursal ya existe' });
    console.error('[updateSucursal]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// DELETE /api/sucursales/:id  (soft delete)
const deleteSucursal = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.promise().query(
      `UPDATE sucursales SET activo = 0 WHERE id_sucursal = ?`, [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Sucursal no encontrada' });

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'sucursales', ?, 'DELETE', ?)`,
      [req.user.id_usuario, id, ip]
    );
    return res.json({ mensaje: 'Sucursal desactivada correctamente' });
  } catch (err) {
    console.error('[deleteSucursal]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getSucursales, getSucursal, createSucursal, updateSucursal, deleteSucursal };
