const db = require('../config/db');
const { isValidEmail } = require('../utils/validators');

const getIp    = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, ?, ?, ?, ?)`,
    [userId, tabla, String(id), accion, ip]
  );

// ── Clientes ──────────────────────────────────────────────────────────────

const getClientes = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT c.*,
              COUNT(DISTINCT cd.id_direccion) AS total_direcciones
       FROM clientes c
       LEFT JOIN cliente_direcciones cd ON cd.id_cliente = c.id_cliente
       GROUP BY c.id_cliente
       ORDER BY c.nombres ASC, c.apellidos ASC`
    );
    return res.json({ clientes: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

const getCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const [[row]] = await db.promise().query(
      `SELECT * FROM clientes WHERE id_cliente = ?`, [id]
    );
    if (!row) return res.status(404).json({ error: 'Cliente no encontrado' });
    return res.json({ cliente: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

const createCliente = async (req, res) => {
  try {
    const {
      tipo_cliente = 'MINORISTA', tipo_documento = 'CI', documento,
      razon_social, nombres, apellidos, telefono, celular, email,
      fecha_nacimiento, descuento_default = 0,
    } = req.body;

    if (!nombres && !razon_social) return res.status(400).json({ error: 'Debe ingresar nombres o razón social' });
    if (email?.trim() && !isValidEmail(email)) {
      return res.status(400).json({ error: 'El formato del email no es válido' });
    }

    const [[{ nextId }]] = await db.promise().query(
      `SELECT COALESCE(MAX(id_cliente), 0) + 1 AS nextId FROM clientes`
    );
    const codigo = `CLI-${String(nextId).padStart(5, '0')}`;

    const [result] = await db.promise().query(
      `INSERT INTO clientes
         (codigo, tipo_cliente, tipo_documento, documento, razon_social,
          nombres, apellidos, telefono, celular, email, fecha_nacimiento, descuento_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo, tipo_cliente, tipo_documento,
       documento || null, razon_social || null, nombres || null, apellidos || null,
       telefono || null, celular || null, email || null,
       fecha_nacimiento || null, descuento_default]
    );

    await auditLog(req.user.id_usuario, 'clientes', result.insertId, 'CREATE', getIp(req));
    const [[created]] = await db.promise().query(
      `SELECT * FROM clientes WHERE id_cliente = ?`, [result.insertId]
    );
    return res.status(201).json({ cliente: created });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código ya existe' });
    console.error(err);
    return res.status(500).json({ error: 'Error al crear cliente' });
  }
};

const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo, tipo_cliente, tipo_documento, documento,
      razon_social, nombres, apellidos, telefono, celular, email,
      fecha_nacimiento, descuento_default, activo,
    } = req.body;

    const [[exists]] = await db.promise().query(
      `SELECT id_cliente FROM clientes WHERE id_cliente = ?`, [id]
    );
    if (!exists) return res.status(404).json({ error: 'Cliente no encontrado' });
    if (email?.trim() && !isValidEmail(email)) {
      return res.status(400).json({ error: 'El formato del email no es válido' });
    }

    await db.promise().query(
      `UPDATE clientes SET
         codigo = ?, tipo_cliente = ?, tipo_documento = ?, documento = ?,
         razon_social = ?, nombres = ?, apellidos = ?, telefono = ?, celular = ?,
         email = ?, fecha_nacimiento = ?, descuento_default = ?, activo = ?
       WHERE id_cliente = ?`,
      [codigo?.toUpperCase(), tipo_cliente, tipo_documento,
       documento || null, razon_social || null, nombres || null, apellidos || null,
       telefono || null, celular || null, email || null,
       fecha_nacimiento || null, descuento_default ?? 0, activo ? 1 : 0, id]
    );

    await auditLog(req.user.id_usuario, 'clientes', id, 'UPDATE', getIp(req));
    const [[updated]] = await db.promise().query(
      `SELECT * FROM clientes WHERE id_cliente = ?`, [id]
    );
    return res.json({ cliente: updated });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código ya existe' });
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;

    // Protección: no desactivar si tiene ventas activas
    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM ventas WHERE id_cliente = ? AND estado != 'ANULADA'`, [id]
    ).catch(() => [[{ total: 0 }]]);

    if (total > 0)
      return res.status(409).json({ error: 'No se puede desactivar: tiene ventas registradas' });

    await db.promise().query(
      `UPDATE clientes SET activo = 0 WHERE id_cliente = ?`, [id]
    );
    await auditLog(req.user.id_usuario, 'clientes', id, 'DELETE', getIp(req));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al desactivar cliente' });
  }
};

// ── Crédito ───────────────────────────────────────────────────────────────

const updateCredito = async (req, res) => {
  try {
    const { id } = req.params;
    const { permite_credito, limite_credito, dias_credito } = req.body;

    const [[exists]] = await db.promise().query(
      `SELECT id_cliente FROM clientes WHERE id_cliente = ?`, [id]
    );
    if (!exists) return res.status(404).json({ error: 'Cliente no encontrado' });

    await db.promise().query(
      `UPDATE clientes SET permite_credito = ?, limite_credito = ?, dias_credito = ? WHERE id_cliente = ?`,
      [permite_credito ? 1 : 0, limite_credito ?? 0, dias_credito ?? 0, id]
    );

    await auditLog(req.user.id_usuario, 'clientes', id, 'UPDATE_CREDITO', getIp(req));
    const [[updated]] = await db.promise().query(
      `SELECT id_cliente, permite_credito, limite_credito, saldo_actual, dias_credito FROM clientes WHERE id_cliente = ?`, [id]
    );
    return res.json({ credito: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar crédito' });
  }
};

// ── Direcciones ───────────────────────────────────────────────────────────

const getDirecciones = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT * FROM cliente_direcciones WHERE id_cliente = ? ORDER BY es_principal DESC, id_direccion ASC`,
      [req.params.id]
    );
    return res.json({ direcciones: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener direcciones' });
  }
};

const createDireccion = async (req, res) => {
  try {
    const { id } = req.params;
    const { etiqueta, direccion, ciudad, referencias, es_principal = false } = req.body;

    if (!direccion) return res.status(400).json({ error: 'La dirección es requerida' });

    if (es_principal) {
      await db.promise().query(
        `UPDATE cliente_direcciones SET es_principal = 0 WHERE id_cliente = ?`, [id]
      );
    }

    const [result] = await db.promise().query(
      `INSERT INTO cliente_direcciones (id_cliente, etiqueta, direccion, ciudad, referencias, es_principal)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, etiqueta || null, direccion, ciudad || null, referencias || null, es_principal ? 1 : 0]
    );

    await auditLog(req.user.id_usuario, 'cliente_direcciones', result.insertId, 'CREATE', getIp(req));
    const [[created]] = await db.promise().query(
      `SELECT * FROM cliente_direcciones WHERE id_direccion = ?`, [result.insertId]
    );
    return res.status(201).json({ direccion: created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al crear dirección' });
  }
};

const updateDireccion = async (req, res) => {
  try {
    const { id, idD } = req.params;
    const { etiqueta, direccion, ciudad, referencias, es_principal = false } = req.body;

    if (!direccion) return res.status(400).json({ error: 'La dirección es requerida' });

    if (es_principal) {
      await db.promise().query(
        `UPDATE cliente_direcciones SET es_principal = 0 WHERE id_cliente = ? AND id_direccion != ?`,
        [id, idD]
      );
    }

    await db.promise().query(
      `UPDATE cliente_direcciones SET etiqueta = ?, direccion = ?, ciudad = ?, referencias = ?, es_principal = ?
       WHERE id_direccion = ? AND id_cliente = ?`,
      [etiqueta || null, direccion, ciudad || null, referencias || null, es_principal ? 1 : 0, idD, id]
    );

    await auditLog(req.user.id_usuario, 'cliente_direcciones', idD, 'UPDATE', getIp(req));
    const [[updated]] = await db.promise().query(
      `SELECT * FROM cliente_direcciones WHERE id_direccion = ?`, [idD]
    );
    return res.json({ direccion: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar dirección' });
  }
};

const deleteDireccion = async (req, res) => {
  try {
    const { id, idD } = req.params;
    await db.promise().query(
      `DELETE FROM cliente_direcciones WHERE id_direccion = ? AND id_cliente = ?`, [idD, id]
    );
    await auditLog(req.user.id_usuario, 'cliente_direcciones', idD, 'DELETE', getIp(req));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al eliminar dirección' });
  }
};

module.exports = {
  getClientes, getCliente, createCliente, updateCliente, deleteCliente,
  updateCredito,
  getDirecciones, createDireccion, updateDireccion, deleteDireccion,
};
