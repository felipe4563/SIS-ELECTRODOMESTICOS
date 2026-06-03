const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');

// GET /api/empresa/publico  (sin auth — para Login)
const getEmpresaPublico = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT razon_social, nombre_comercial, logo_url FROM empresas WHERE activo = 1 LIMIT 1`
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// GET /api/empresa
const getEmpresa = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT * FROM empresas WHERE activo = 1 LIMIT 1`
    );
    return res.json({ empresa: rows[0] ?? null });
  } catch (err) {
    console.error('[getEmpresa]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// POST /api/empresa
const createEmpresa = async (req, res) => {
  const { razon_social, nombre_comercial, nit, direccion, telefono, email } = req.body;

  if (!razon_social?.trim())
    return res.status(400).json({ error: 'La razón social es requerida' });

  try {
    const [existing] = await db.promise().query(
      `SELECT id_empresa FROM empresas WHERE activo = 1 LIMIT 1`
    );
    if (existing.length > 0)
      return res.status(409).json({ error: 'Ya existe una empresa registrada' });

    const [result] = await db.promise().query(
      `INSERT INTO empresas (razon_social, nombre_comercial, nit, direccion, telefono, email, activo)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [razon_social.trim(), nombre_comercial ?? null, nit ?? null,
       direccion ?? null, telefono ?? null, email ?? null]
    );

    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'empresas', ?, 'INSERT', ?)`,
      [req.user.id_usuario, result.insertId, ip]
    );

    const [created] = await db.promise().query(
      `SELECT * FROM empresas WHERE id_empresa = ?`, [result.insertId]
    );
    return res.status(201).json({ empresa: created[0] });
  } catch (err) {
    console.error('[createEmpresa]', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// PUT /api/empresa/:id
const updateEmpresa = async (req, res) => {
  const { id } = req.params;
  const { razon_social, nombre_comercial, nit, direccion, telefono, email } = req.body;

  if (!razon_social?.trim())
    return res.status(400).json({ error: 'La razón social es requerida' });

  try {
    const [result] = await db.promise().query(
      `UPDATE empresas
       SET razon_social = ?, nombre_comercial = ?, nit = ?,
           direccion = ?, telefono = ?, email = ?
       WHERE id_empresa = ? AND activo = 1`,
      [razon_social.trim(), nombre_comercial ?? null, nit ?? null,
       direccion ?? null, telefono ?? null, email ?? null, id]
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

// POST /api/empresa/:id/logo
const uploadLogo = async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

  try {
    const [rows] = await db.promise().query(
      `SELECT logo_url FROM empresas WHERE id_empresa = ? AND activo = 1`, [id]
    );
    if (rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Borrar logo anterior si era un archivo local
    const old = rows[0].logo_url;
    if (old && old.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', old);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;

    await db.promise().query(
      `UPDATE empresas SET logo_url = ? WHERE id_empresa = ?`, [logoUrl, id]
    );

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
    console.error('[uploadLogo]', err);
    return res.status(500).json({ error: 'Error al subir el logo' });
  }
};

module.exports = { getEmpresaPublico, getEmpresa, createEmpresa, updateEmpresa, uploadLogo };
