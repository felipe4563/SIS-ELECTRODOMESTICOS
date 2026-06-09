const db = require('../config/db');
const { isValidEmail } = require('../utils/validators');

const getIp    = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, ?, ?, ?, ?)`,
    [userId, tabla, id, accion, ip]
  );

// ── PROVEEDORES ───────────────────────────────────────────────────────────

const getProveedores = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT p.*,
              COUNT(DISTINCT pc.id_contacto)  AS total_contactos,
              COUNT(DISTINCT pcp.id_cuenta)   AS total_cuentas
       FROM proveedores p
       LEFT JOIN proveedor_contactos pc      ON pc.id_proveedor  = p.id_proveedor
       LEFT JOIN proveedor_cuentas_pago pcp  ON pcp.id_proveedor = p.id_proveedor AND pcp.activo = 1
       GROUP BY p.id_proveedor
       ORDER BY p.razon_social ASC`
    );
    return res.json({ proveedores: rows });
  } catch (err) {
    console.error('[getProveedores]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getProveedor = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT * FROM proveedores WHERE id_proveedor = ?`, [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    return res.json({ proveedor: rows[0] });
  } catch (err) {
    console.error('[getProveedor]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const createProveedor = async (req, res) => {
  const {
    razon_social, nombre_comercial, nit, tipo_proveedor,
    direccion, ciudad, pais, telefono, email, contacto_principal, plazo_credito_dias,
  } = req.body;

  if (!razon_social?.trim())
    return res.status(400).json({ error: 'La razón social es requerida' });
  if (email?.trim() && !isValidEmail(email))
    return res.status(400).json({ error: 'El formato del email no es válido' });

  try {
    const [[{ nextId }]] = await db.promise().query(
      `SELECT COALESCE(MAX(id_proveedor), 0) + 1 AS nextId FROM proveedores`
    );
    const codigo = `PROV-${String(nextId).padStart(5, '0')}`;

    const [result] = await db.promise().query(
      `INSERT INTO proveedores
         (codigo, razon_social, nombre_comercial, nit, tipo_proveedor,
          direccion, ciudad, pais, telefono, email, contacto_principal, plazo_credito_dias)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo, razon_social.trim(),
        nombre_comercial?.trim() || null, nit?.trim() || null,
        tipo_proveedor || 'NACIONAL',
        direccion?.trim() || null, ciudad?.trim() || null, pais?.trim() || null,
        telefono?.trim() || null, email?.trim() || null,
        contacto_principal?.trim() || null, plazo_credito_dias ?? 0,
      ]
    );
    await auditLog(req.user.id_usuario, 'proveedores', result.insertId, 'INSERT', getIp(req));
    const [nuevo] = await db.promise().query(
      `SELECT * FROM proveedores WHERE id_proveedor = ?`, [result.insertId]
    );
    return res.status(201).json({ proveedor: nuevo[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El código de proveedor ya existe' });
    console.error('[createProveedor]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const updateProveedor = async (req, res) => {
  const { id } = req.params;
  const {
    codigo, razon_social, nombre_comercial, nit, tipo_proveedor,
    direccion, ciudad, pais, telefono, email, contacto_principal, plazo_credito_dias, activo,
  } = req.body;

  if (!codigo?.trim() || !razon_social?.trim())
    return res.status(400).json({ error: 'Código y razón social son requeridos' });
  if (email?.trim() && !isValidEmail(email))
    return res.status(400).json({ error: 'El formato del email no es válido' });

  try {
    const [result] = await db.promise().query(
      `UPDATE proveedores
       SET codigo = ?, razon_social = ?, nombre_comercial = ?, nit = ?, tipo_proveedor = ?,
           direccion = ?, ciudad = ?, pais = ?, telefono = ?, email = ?,
           contacto_principal = ?, plazo_credito_dias = ?, activo = ?
       WHERE id_proveedor = ?`,
      [
        codigo.trim().toUpperCase(), razon_social.trim(),
        nombre_comercial?.trim() || null, nit?.trim() || null,
        tipo_proveedor || 'NACIONAL',
        direccion?.trim() || null, ciudad?.trim() || null, pais?.trim() || null,
        telefono?.trim() || null, email?.trim() || null,
        contacto_principal?.trim() || null, plazo_credito_dias ?? 0,
        activo !== undefined ? (activo ? 1 : 0) : 1, id,
      ]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    await auditLog(req.user.id_usuario, 'proveedores', id, 'UPDATE', getIp(req));
    const [updated] = await db.promise().query(
      `SELECT * FROM proveedores WHERE id_proveedor = ?`, [id]
    );
    return res.json({ proveedor: updated[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El código de proveedor ya existe' });
    console.error('[updateProveedor]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const deleteProveedor = async (req, res) => {
  const { id } = req.params;
  try {
    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM compras WHERE id_proveedor = ? AND estado != 'ANULADA'`, [id]
    );
    if (total > 0)
      return res.status(409).json({ error: 'No se puede desactivar: tiene compras registradas' });

    const [result] = await db.promise().query(
      `UPDATE proveedores SET activo = 0 WHERE id_proveedor = ?`, [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    await auditLog(req.user.id_usuario, 'proveedores', id, 'DELETE', getIp(req));
    return res.json({ mensaje: 'Proveedor desactivado correctamente' });
  } catch (err) {
    console.error('[deleteProveedor]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// ── CONTACTOS ─────────────────────────────────────────────────────────────

const getContactos = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT * FROM proveedor_contactos WHERE id_proveedor = ? ORDER BY nombre ASC`,
      [req.params.id]
    );
    return res.json({ contactos: rows });
  } catch (err) {
    console.error('[getContactos]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const createContacto = async (req, res) => {
  const { nombre, cargo, telefono, email } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  if (email?.trim() && !isValidEmail(email))
    return res.status(400).json({ error: 'El formato del email no es válido' });
  try {
    const [result] = await db.promise().query(
      `INSERT INTO proveedor_contactos (id_proveedor, nombre, cargo, telefono, email)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, nombre.trim(), cargo?.trim() || null, telefono?.trim() || null, email?.trim() || null]
    );
    await auditLog(req.user.id_usuario, 'proveedor_contactos', result.insertId, 'INSERT', getIp(req));
    const [nuevo] = await db.promise().query(
      `SELECT * FROM proveedor_contactos WHERE id_contacto = ?`, [result.insertId]
    );
    return res.status(201).json({ contacto: nuevo[0] });
  } catch (err) {
    console.error('[createContacto]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const updateContacto = async (req, res) => {
  const { id, idC } = req.params;
  const { nombre, cargo, telefono, email } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  if (email?.trim() && !isValidEmail(email))
    return res.status(400).json({ error: 'El formato del email no es válido' });
  try {
    const [result] = await db.promise().query(
      `UPDATE proveedor_contactos SET nombre = ?, cargo = ?, telefono = ?, email = ?
       WHERE id_contacto = ? AND id_proveedor = ?`,
      [nombre.trim(), cargo?.trim() || null, telefono?.trim() || null, email?.trim() || null, idC, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Contacto no encontrado' });
    await auditLog(req.user.id_usuario, 'proveedor_contactos', idC, 'UPDATE', getIp(req));
    const [updated] = await db.promise().query(
      `SELECT * FROM proveedor_contactos WHERE id_contacto = ?`, [idC]
    );
    return res.json({ contacto: updated[0] });
  } catch (err) {
    console.error('[updateContacto]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const deleteContacto = async (req, res) => {
  const { id, idC } = req.params;
  try {
    const [result] = await db.promise().query(
      `DELETE FROM proveedor_contactos WHERE id_contacto = ? AND id_proveedor = ?`, [idC, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Contacto no encontrado' });
    await auditLog(req.user.id_usuario, 'proveedor_contactos', idC, 'DELETE', getIp(req));
    return res.json({ mensaje: 'Contacto eliminado' });
  } catch (err) {
    console.error('[deleteContacto]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// ── CUENTAS DE PAGO ───────────────────────────────────────────────────────

const getCuentas = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT cp.*, m.nombre AS moneda_nombre, m.simbolo AS moneda_simbolo,
              b.nombre AS banco_nombre, b.sigla AS banco_sigla
       FROM proveedor_cuentas_pago cp
       LEFT JOIN monedas m ON cp.id_moneda = m.id_moneda
       LEFT JOIN bancos  b ON cp.id_banco  = b.id_banco
       WHERE cp.id_proveedor = ?
       ORDER BY cp.es_principal DESC, cp.metodo ASC`,
      [req.params.id]
    );
    return res.json({ cuentas: rows });
  } catch (err) {
    console.error('[getCuentas]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const createCuenta = async (req, res) => {
  const { metodo, id_banco, tipo_cuenta, numero_cuenta, titular, qr_url, id_moneda, es_principal } = req.body;
  if (!metodo) return res.status(400).json({ error: 'El método de pago es requerido' });
  try {
    if (es_principal) {
      await db.promise().query(
        `UPDATE proveedor_cuentas_pago SET es_principal = 0 WHERE id_proveedor = ?`, [req.params.id]
      );
    }
    const [result] = await db.promise().query(
      `INSERT INTO proveedor_cuentas_pago
         (id_proveedor, metodo, id_banco, tipo_cuenta, numero_cuenta, titular, qr_url, id_moneda, es_principal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.id, metodo,
        id_banco || null, tipo_cuenta?.trim() || null,
        numero_cuenta?.trim() || null, titular?.trim() || null,
        qr_url?.trim() || null, id_moneda || null, es_principal ? 1 : 0,
      ]
    );
    await auditLog(req.user.id_usuario, 'proveedor_cuentas_pago', result.insertId, 'INSERT', getIp(req));
    const [nueva] = await db.promise().query(
      `SELECT cp.*, m.nombre AS moneda_nombre, m.simbolo AS moneda_simbolo,
              b.nombre AS banco_nombre, b.sigla AS banco_sigla
       FROM proveedor_cuentas_pago cp
       LEFT JOIN monedas m ON cp.id_moneda = m.id_moneda
       LEFT JOIN bancos  b ON cp.id_banco  = b.id_banco
       WHERE cp.id_cuenta = ?`, [result.insertId]
    );
    return res.status(201).json({ cuenta: nueva[0] });
  } catch (err) {
    console.error('[createCuenta]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const updateCuenta = async (req, res) => {
  const { id, idC } = req.params;
  const { metodo, id_banco, tipo_cuenta, numero_cuenta, titular, qr_url, id_moneda, es_principal, activo } = req.body;
  if (!metodo) return res.status(400).json({ error: 'El método de pago es requerido' });
  try {
    if (es_principal) {
      await db.promise().query(
        `UPDATE proveedor_cuentas_pago SET es_principal = 0 WHERE id_proveedor = ? AND id_cuenta != ?`,
        [id, idC]
      );
    }
    const [result] = await db.promise().query(
      `UPDATE proveedor_cuentas_pago
       SET metodo = ?, id_banco = ?, tipo_cuenta = ?, numero_cuenta = ?, titular = ?,
           qr_url = ?, id_moneda = ?, es_principal = ?, activo = ?
       WHERE id_cuenta = ? AND id_proveedor = ?`,
      [
        metodo, id_banco || null, tipo_cuenta?.trim() || null,
        numero_cuenta?.trim() || null, titular?.trim() || null,
        qr_url?.trim() || null, id_moneda || null,
        es_principal ? 1 : 0, activo !== undefined ? (activo ? 1 : 0) : 1,
        idC, id,
      ]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    await auditLog(req.user.id_usuario, 'proveedor_cuentas_pago', idC, 'UPDATE', getIp(req));
    const [updated] = await db.promise().query(
      `SELECT cp.*, m.nombre AS moneda_nombre, m.simbolo AS moneda_simbolo,
              b.nombre AS banco_nombre, b.sigla AS banco_sigla
       FROM proveedor_cuentas_pago cp
       LEFT JOIN monedas m ON cp.id_moneda = m.id_moneda
       LEFT JOIN bancos  b ON cp.id_banco  = b.id_banco
       WHERE cp.id_cuenta = ?`, [idC]
    );
    return res.json({ cuenta: updated[0] });
  } catch (err) {
    console.error('[updateCuenta]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

const deleteCuenta = async (req, res) => {
  const { id, idC } = req.params;
  try {
    const [result] = await db.promise().query(
      `UPDATE proveedor_cuentas_pago SET activo = 0 WHERE id_cuenta = ? AND id_proveedor = ?`, [idC, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    await auditLog(req.user.id_usuario, 'proveedor_cuentas_pago', idC, 'DELETE', getIp(req));
    return res.json({ mensaje: 'Cuenta desactivada correctamente' });
  } catch (err) {
    console.error('[deleteCuenta]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = {
  getProveedores, getProveedor, createProveedor, updateProveedor, deleteProveedor,
  getContactos, createContacto, updateContacto, deleteContacto,
  getCuentas, createCuenta, updateCuenta, deleteCuenta,
};
