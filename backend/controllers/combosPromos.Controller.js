const db = require('../config/db');

const getIp    = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, ?, ?, ?, ?)`,
    [userId, tabla, String(id), accion, ip]
  );

// ── COMBOS ────────────────────────────────────────────────────────────────

const getCombos = async (req, res) => {
  try {
    const { activo, q } = req.query;
    let sql = `
      SELECT c.*,
             COUNT(cd.id_combo_detalle) AS total_productos
      FROM combos c
      LEFT JOIN combo_detalle cd ON cd.id_combo = c.id_combo
      WHERE 1=1
    `;
    const params = [];

    if (activo !== undefined) {
      sql += ` AND c.activo = ?`;
      params.push(activo === '1' || activo === 'true' ? 1 : 0);
    }
    if (q) {
      sql += ` AND (c.nombre LIKE ? OR c.codigo LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += ` GROUP BY c.id_combo ORDER BY c.nombre ASC`;
    const [rows] = await db.promise().query(sql, params);
    return res.json({ combos: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener combos' });
  }
};

const getCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const [[combo]] = await db.promise().query(
      `SELECT * FROM combos WHERE id_combo = ?`, [id]
    );
    if (!combo) return res.status(404).json({ error: 'Combo no encontrado' });

    const [detalle] = await db.promise().query(
      `SELECT cd.*, p.producto AS producto_nombre, p.codigo_interno, p.precio_publico
       FROM combo_detalle cd
       JOIN productos p ON p.id_producto = cd.id_producto
       WHERE cd.id_combo = ?
       ORDER BY p.producto ASC`,
      [id]
    );

    return res.json({ combo: { ...combo, detalle } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener combo' });
  }
};

const createCombo = async (req, res) => {
  try {
    const {
      nombre, descripcion, precio_combo,
      fecha_inicio, fecha_fin, imagen_url, detalle = []
    } = req.body;

    if (!nombre)           return res.status(400).json({ error: 'El nombre es requerido' });
    if (precio_combo == null) return res.status(400).json({ error: 'El precio es requerido' });

    const [[{ nextId }]] = await db.promise().query(
      `SELECT COALESCE(MAX(id_combo), 0) + 1 AS nextId FROM combos`
    );
    const codigo = `COMBO-${String(nextId).padStart(4, '0')}`;

    const [result] = await db.promise().query(
      `INSERT INTO combos (codigo, nombre, descripcion, precio_combo, fecha_inicio, fecha_fin, imagen_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [codigo, nombre, descripcion || null, precio_combo,
       fecha_inicio || null, fecha_fin || null, imagen_url || null]
    );

    const newId = result.insertId;

    if (detalle.length > 0) {
      const vals = detalle.map(d => [newId, d.id_producto, d.cantidad]);
      await db.promise().query(
        `INSERT INTO combo_detalle (id_combo, id_producto, cantidad) VALUES ?`, [vals]
      );
    }

    await auditLog(req.user.id_usuario, 'combos', newId, 'CREATE', getIp(req));
    const [[created]] = await db.promise().query(`SELECT * FROM combos WHERE id_combo = ?`, [newId]);
    return res.status(201).json({ combo: created });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código ya existe' });
    console.error(err);
    return res.status(500).json({ error: 'Error al crear combo' });
  }
};

const updateCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo, nombre, descripcion, precio_combo,
      fecha_inicio, fecha_fin, imagen_url, activo
    } = req.body;

    const [[exists]] = await db.promise().query(
      `SELECT id_combo FROM combos WHERE id_combo = ?`, [id]
    );
    if (!exists) return res.status(404).json({ error: 'Combo no encontrado' });

    await db.promise().query(
      `UPDATE combos SET
         codigo = ?, nombre = ?, descripcion = ?, precio_combo = ?,
         fecha_inicio = ?, fecha_fin = ?, imagen_url = ?, activo = ?
       WHERE id_combo = ?`,
      [codigo?.toUpperCase(), nombre, descripcion || null, precio_combo,
       fecha_inicio || null, fecha_fin || null, imagen_url || null,
       activo !== undefined ? (activo ? 1 : 0) : 1, id]
    );

    await auditLog(req.user.id_usuario, 'combos', id, 'UPDATE', getIp(req));
    const [[updated]] = await db.promise().query(`SELECT * FROM combos WHERE id_combo = ?`, [id]);
    return res.json({ combo: updated });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código ya existe' });
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar combo' });
  }
};

const deleteCombo = async (req, res) => {
  try {
    const { id } = req.params;
    await db.promise().query(`UPDATE combos SET activo = 0 WHERE id_combo = ?`, [id]);
    await auditLog(req.user.id_usuario, 'combos', id, 'DELETE', getIp(req));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al desactivar combo' });
  }
};

// ── COMBO DETALLE ─────────────────────────────────────────────────────────

const getComboDetalle = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT cd.*, p.producto AS producto_nombre, p.codigo_interno, p.precio_publico
       FROM combo_detalle cd
       JOIN productos p ON p.id_producto = cd.id_producto
       WHERE cd.id_combo = ?
       ORDER BY p.producto ASC`,
      [req.params.id]
    );
    return res.json({ detalle: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener productos del combo' });
  }
};

const upsertComboDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    const { detalle = [] } = req.body;

    await db.promise().query(`DELETE FROM combo_detalle WHERE id_combo = ?`, [id]);

    if (detalle.length > 0) {
      const vals = detalle.map(d => [id, d.id_producto, d.cantidad]);
      await db.promise().query(
        `INSERT INTO combo_detalle (id_combo, id_producto, cantidad) VALUES ?`, [vals]
      );
    }

    await auditLog(req.user.id_usuario, 'combo_detalle', id, 'UPDATE', getIp(req));

    const [rows] = await db.promise().query(
      `SELECT cd.*, p.producto AS producto_nombre, p.codigo_interno, p.precio_publico
       FROM combo_detalle cd
       JOIN productos p ON p.id_producto = cd.id_producto
       WHERE cd.id_combo = ?
       ORDER BY p.producto ASC`,
      [id]
    );
    return res.json({ detalle: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar productos del combo' });
  }
};

// ── PROMOCIONES ───────────────────────────────────────────────────────────

const getPromociones = async (req, res) => {
  try {
    const { activo, q } = req.query;
    let sql = `
      SELECT p.*,
             COUNT(pp.id_promo_prod) AS total_aplicaciones
      FROM promociones p
      LEFT JOIN promocion_producto pp ON pp.id_promocion = p.id_promocion
      WHERE 1=1
    `;
    const params = [];

    if (activo !== undefined) {
      sql += ` AND p.activo = ?`;
      params.push(activo === '1' || activo === 'true' ? 1 : 0);
    }
    if (q) {
      sql += ` AND (p.nombre LIKE ? OR p.codigo LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += ` GROUP BY p.id_promocion ORDER BY p.fecha_inicio DESC`;
    const [rows] = await db.promise().query(sql, params);
    return res.json({ promociones: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener promociones' });
  }
};

const getPromocion = async (req, res) => {
  try {
    const { id } = req.params;
    const [[promo]] = await db.promise().query(
      `SELECT * FROM promociones WHERE id_promocion = ?`, [id]
    );
    if (!promo) return res.status(404).json({ error: 'Promoción no encontrada' });

    const [aplicaciones] = await db.promise().query(
      `SELECT pp.*,
              p.producto AS producto_nombre, p.codigo_interno,
              c.nombre AS categoria_nombre,
              m.nombre AS marca_nombre
       FROM promocion_producto pp
       LEFT JOIN productos p ON p.id_producto = pp.id_producto
       LEFT JOIN categorias c ON c.id_categoria = pp.id_categoria
       LEFT JOIN marcas m ON m.id_marca = pp.id_marca
       WHERE pp.id_promocion = ?`,
      [id]
    );

    return res.json({ promocion: { ...promo, aplicaciones } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener promoción' });
  }
};

const getPromocionesVigentes = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [promos] = await db.promise().query(
      `SELECT * FROM promociones
       WHERE activo = 1 AND fecha_inicio <= ? AND fecha_fin >= ?`,
      [today, today]
    );

    if (!promos.length) return res.json({ promociones: [] });

    const ids = promos.map(p => p.id_promocion);
    const [aplics] = await db.promise().query(
      `SELECT id_promo_prod, id_promocion, id_producto, id_categoria, id_marca
       FROM promocion_producto
       WHERE id_promocion IN (?)`,
      [ids]
    );

    const aplicsMap = {};
    for (const a of aplics) {
      if (!aplicsMap[a.id_promocion]) aplicsMap[a.id_promocion] = [];
      aplicsMap[a.id_promocion].push({
        id_promo_prod: a.id_promo_prod,
        id_producto:   a.id_producto,
        id_categoria:  a.id_categoria,
        id_marca:      a.id_marca,
      });
    }

    const promociones = promos.map(p => ({
      ...p,
      aplicaciones: aplicsMap[p.id_promocion] ?? [],
    }));

    return res.json({ promociones });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener promociones vigentes' });
  }
};

const createPromocion = async (req, res) => {
  try {
    const {
      nombre, descripcion,
      tipo_descuento = 'PORCENTAJE', valor_descuento,
      fecha_inicio, fecha_fin,
      cantidad_minima = 1, aplica_a = 'PRODUCTO'
    } = req.body;

    if (!nombre)             return res.status(400).json({ error: 'El nombre es requerido' });
    if (valor_descuento == null) return res.status(400).json({ error: 'El valor de descuento es requerido' });
    if (!fecha_inicio || !fecha_fin) return res.status(400).json({ error: 'Las fechas son requeridas' });

    const [[{ nextId }]] = await db.promise().query(
      `SELECT COALESCE(MAX(id_promocion), 0) + 1 AS nextId FROM promociones`
    );
    const codigo = `PROMO-${String(nextId).padStart(4, '0')}`;

    const [result] = await db.promise().query(
      `INSERT INTO promociones
         (codigo, nombre, descripcion, tipo_descuento, valor_descuento,
          fecha_inicio, fecha_fin, cantidad_minima, aplica_a)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo, nombre, descripcion || null, tipo_descuento,
       valor_descuento, fecha_inicio, fecha_fin, cantidad_minima, aplica_a]
    );

    const newId = result.insertId;
    await auditLog(req.user.id_usuario, 'promociones', newId, 'CREATE', getIp(req));
    const [[created]] = await db.promise().query(
      `SELECT * FROM promociones WHERE id_promocion = ?`, [newId]
    );
    return res.status(201).json({ promocion: created });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código ya existe' });
    console.error(err);
    return res.status(500).json({ error: 'Error al crear promoción' });
  }
};

const updatePromocion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo, nombre, descripcion, tipo_descuento,
      valor_descuento, fecha_inicio, fecha_fin,
      cantidad_minima, aplica_a, activo
    } = req.body;

    const [[exists]] = await db.promise().query(
      `SELECT id_promocion FROM promociones WHERE id_promocion = ?`, [id]
    );
    if (!exists) return res.status(404).json({ error: 'Promoción no encontrada' });

    await db.promise().query(
      `UPDATE promociones SET
         codigo = ?, nombre = ?, descripcion = ?, tipo_descuento = ?,
         valor_descuento = ?, fecha_inicio = ?, fecha_fin = ?,
         cantidad_minima = ?, aplica_a = ?, activo = ?
       WHERE id_promocion = ?`,
      [codigo?.toUpperCase(), nombre, descripcion || null, tipo_descuento,
       valor_descuento, fecha_inicio, fecha_fin, cantidad_minima ?? 1,
       aplica_a, activo !== undefined ? (activo ? 1 : 0) : 1, id]
    );

    await auditLog(req.user.id_usuario, 'promociones', id, 'UPDATE', getIp(req));
    const [[updated]] = await db.promise().query(
      `SELECT * FROM promociones WHERE id_promocion = ?`, [id]
    );
    return res.json({ promocion: updated });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código ya existe' });
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar promoción' });
  }
};

const deletePromocion = async (req, res) => {
  try {
    const { id } = req.params;
    await db.promise().query(`UPDATE promociones SET activo = 0 WHERE id_promocion = ?`, [id]);
    await auditLog(req.user.id_usuario, 'promociones', id, 'DELETE', getIp(req));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al desactivar promoción' });
  }
};

// ── PROMOCIÓN APLICACIONES ────────────────────────────────────────────────

const getAplicaciones = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT pp.*,
              p.producto AS producto_nombre, p.codigo_interno,
              c.nombre AS categoria_nombre,
              m.nombre AS marca_nombre
       FROM promocion_producto pp
       LEFT JOIN productos p ON p.id_producto = pp.id_producto
       LEFT JOIN categorias c ON c.id_categoria = pp.id_categoria
       LEFT JOIN marcas m ON m.id_marca = pp.id_marca
       WHERE pp.id_promocion = ?`,
      [req.params.id]
    );
    return res.json({ aplicaciones: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener aplicaciones' });
  }
};

const upsertAplicaciones = async (req, res) => {
  try {
    const { id } = req.params;
    const { aplicaciones = [] } = req.body;

    await db.promise().query(`DELETE FROM promocion_producto WHERE id_promocion = ?`, [id]);

    if (aplicaciones.length > 0) {
      const vals = aplicaciones.map(a => [
        id,
        a.id_producto  || null,
        a.id_categoria || null,
        a.id_marca     || null,
      ]);
      await db.promise().query(
        `INSERT INTO promocion_producto (id_promocion, id_producto, id_categoria, id_marca) VALUES ?`,
        [vals]
      );
    }

    await auditLog(req.user.id_usuario, 'promocion_producto', id, 'UPDATE', getIp(req));

    const [rows] = await db.promise().query(
      `SELECT pp.*,
              p.producto AS producto_nombre, p.codigo_interno,
              c.nombre AS categoria_nombre,
              m.nombre AS marca_nombre
       FROM promocion_producto pp
       LEFT JOIN productos p ON p.id_producto = pp.id_producto
       LEFT JOIN categorias c ON c.id_categoria = pp.id_categoria
       LEFT JOIN marcas m ON m.id_marca = pp.id_marca
       WHERE pp.id_promocion = ?`,
      [id]
    );
    return res.json({ aplicaciones: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar aplicaciones' });
  }
};

const uploadImagenCombo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
    const imagenUrl = `/uploads/combos/${req.file.filename}`;
    await db.promise().query(`UPDATE combos SET imagen_url = ? WHERE id_combo = ?`, [imagenUrl, id]);
    await auditLog(req.user.id_usuario, 'combos', id, 'UPDATE', getIp(req));
    return res.json({ imagen_url: imagenUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al subir imagen' });
  }
};

module.exports = {
  getCombos, getCombo, createCombo, updateCombo, deleteCombo,
  getComboDetalle, upsertComboDetalle,
  uploadImagenCombo,
  getPromociones, getPromocion, getPromocionesVigentes,
  createPromocion, updatePromocion, deletePromocion,
  getAplicaciones, upsertAplicaciones,
};
