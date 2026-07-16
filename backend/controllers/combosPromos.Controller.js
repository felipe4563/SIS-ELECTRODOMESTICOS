const db        = require('../config/db');
const PDFDocument = require('pdfkit');
const path      = require('path');
const fs        = require('fs');

const getIp    = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, ?, ?, ?, ?)`,
    [userId, tabla, String(id), accion, ip]
  ).catch(e => console.error('[auditLog]', accion, tabla, e.message));

// ── COMBOS ────────────────────────────────────────────────────────────────

const autoDesactivarVencidos = () =>
  db.promise().query(
    `UPDATE combos SET activo = 0
     WHERE activo = 1 AND fecha_fin IS NOT NULL AND fecha_fin < CURDATE()`
  );

const getCombos = async (req, res) => {
  try {
    await autoDesactivarVencidos();
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
    await autoDesactivarVencidos();
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

const autoDesactivarPromocionesVencidas = () =>
  db.promise().query(
    `UPDATE promociones SET activo = 0
     WHERE activo = 1 AND fecha_fin IS NOT NULL AND fecha_fin < CURDATE()`
  );

const getPromociones = async (req, res) => {
  try {
    await autoDesactivarPromocionesVencidas();
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
    await autoDesactivarPromocionesVencidas();
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

const exportarCombos = async (req, res) => {
  try {
    const { filtro } = req.query;

    let comboWhere = '';
    if (filtro === 'activos')   comboWhere = 'WHERE c.activo = 1';
    if (filtro === 'inactivos') comboWhere = 'WHERE c.activo = 0';

    const [[empresaRows], [detalleRows]] = await Promise.all([
      db.promise().query(`SELECT * FROM empresas WHERE activo = 1 LIMIT 1`),
      db.promise().query(`
        SELECT c.id_combo, c.codigo, c.nombre, c.descripcion, c.precio_combo,
               c.fecha_inicio, c.fecha_fin, c.activo,
               cd.cantidad,
               p.codigo_interno AS prod_codigo,
               p.producto        AS prod_nombre,
               p.precio_publico  AS prod_precio
        FROM combos c
        LEFT JOIN combo_detalle cd ON cd.id_combo = c.id_combo
        LEFT JOIN productos p ON p.id_producto = cd.id_producto
        ${comboWhere}
        ORDER BY c.nombre ASC, p.producto ASC
      `),
    ]);

    // Agrupar por combo
    const comboMap = new Map();
    for (const r of detalleRows) {
      if (!comboMap.has(r.id_combo)) {
        comboMap.set(r.id_combo, {
          id_combo: r.id_combo, codigo: r.codigo, nombre: r.nombre,
          descripcion: r.descripcion, precio_combo: r.precio_combo,
          fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin, activo: r.activo,
          productos: [],
        });
      }
      if (r.prod_codigo) {
        comboMap.get(r.id_combo).productos.push({
          codigo:    r.prod_codigo,
          nombre:    r.prod_nombre,
          cantidad:  parseFloat(r.cantidad) || 1,
          precio:    parseFloat(r.prod_precio) || 0,
        });
      }
    }
    const rows = [...comboMap.values()];

    const empresa = empresaRows[0] ?? {};
    const fecha   = new Date().toISOString().slice(0, 10);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape', bufferPages: true });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      const buf = Buffer.concat(chunks);
      res.setHeader('Content-Disposition', `attachment; filename="combos_${fecha}.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(buf);
    });

    // ── Colores ──────────────────────────────────────────────────────────
    const YELLOW  = '#FBBF24';
    const DARK    = '#1C1C1E';
    const GRAY    = '#6B7280';
    const LIGHT   = '#F4F4F5';
    const WHITE   = '#FFFFFF';
    const pageW   = doc.page.width;
    const margin  = 40;
    const contentW = pageW - margin * 2;

    // ── Cabecera con logo y datos empresa ─────────────────────────────────
    let headerBottom = margin;

    // Logo (si existe y el archivo está en disco)
    if (empresa.logo_url) {
      const logoPath = path.join(__dirname, '..', empresa.logo_url.replace(/^\//, ''));
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, margin, margin, { width: 60, height: 60 });
      }
    }

    const textX = empresa.logo_url ? margin + 70 : margin;

    doc.font('Helvetica-Bold').fontSize(16).fillColor(DARK)
       .text(empresa.nombre_comercial || empresa.razon_social || 'Empresa', textX, margin, { width: contentW - 70 });

    doc.font('Helvetica').fontSize(8).fillColor(GRAY);
    const infoLines = [
      empresa.razon_social && empresa.nombre_comercial ? `Razón social: ${empresa.razon_social}` : null,
      empresa.nit       ? `NIT: ${empresa.nit}`           : null,
      empresa.direccion ? empresa.direccion                : null,
      empresa.telefono  ? `Tel: ${empresa.telefono}`       : null,
      empresa.email     ? empresa.email                    : null,
    ].filter(Boolean);

    infoLines.forEach(line => {
      doc.text(line, textX, doc.y, { width: contentW - 70 });
    });

    headerBottom = Math.max(doc.y, margin + 65) + 6;

    // Línea separadora amarilla
    doc.moveTo(margin, headerBottom).lineTo(pageW - margin, headerBottom)
       .strokeColor(YELLOW).lineWidth(2).stroke();
    headerBottom += 10;

    // ── Título del reporte ────────────────────────────────────────────────
    const tituloFiltro = filtro === 'activos' ? ' — Activos' : filtro === 'inactivos' ? ' — Inactivos' : '';
    doc.font('Helvetica-Bold').fontSize(13).fillColor(DARK)
       .text(`Reporte de Combos${tituloFiltro}`, margin, headerBottom);
    doc.font('Helvetica').fontSize(8).fillColor(GRAY)
       .text(`Generado: ${new Date().toLocaleDateString('es-BO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}   Total: ${rows.length} combo${rows.length !== 1 ? 's' : ''}`,
             margin, doc.y + 2);

    let y = doc.y + 14;
    const startX = margin;

    const fmtD = d => {
      if (!d) return '—';
      const iso = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
      return new Date(iso + 'T12:00:00').toLocaleDateString('es-BO', { day:'2-digit', month:'2-digit', year:'2-digit' });
    };
    const fmtN = v => parseFloat(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const ORANGE   = '#F97316';
    const GREEN    = '#16A34A';
    const BLUE_D   = '#1D4ED8';
    const footerText = `${empresa.nombre_comercial || empresa.razon_social || ''} · Reporte generado el ${fecha}`;

    const ensureSpace = (needed) => {
      if (y + needed > doc.page.height - 65) {
        doc.addPage();
        y = margin;
      }
    };

    // Columnas cabecera del combo
    const hCols = [
      { label: 'Código',       w: 80,  align: 'left'   },
      { label: 'Nombre',       w: 185, align: 'left'   },
      { label: 'Descripción',  w: 205, align: 'left'   },
      { label: 'Precio (Bs.)', w: 80,  align: 'right'  },
      { label: 'Vigencia',     w: 110, align: 'center' },
      { label: 'Estado',       w: 60,  align: 'center' },
    ];
    // Columnas sub-detalle de productos
    const pCols = [
      { label: 'Código',        w: 90,  align: 'left'   },
      { label: 'Producto',      w: 295, align: 'left'   },
      { label: 'Cantidad',      w: 60,  align: 'center' },
      { label: 'Precio Unit.',  w: 85,  align: 'right'  },
      { label: 'Precio Línea',  w: 80,  align: 'right'  },
    ];
    const INDENT = 20;

    rows.forEach((combo) => {
      const totalCatalogo = combo.productos.reduce((s, p) => s + p.cantidad * p.precio, 0);
      const ahorro       = totalCatalogo - parseFloat(combo.precio_combo);
      const porcAhorro   = totalCatalogo > 0 ? (ahorro / totalCatalogo * 100) : 0;
      const estadoText   = combo.activo ? 'Activo' : 'Inactivo';
      const estadoColor  = combo.activo ? GREEN : GRAY;
      const headH = 22;

      ensureSpace(headH + 4);

      // ── Fila cabecera del combo (fondo amarillo) ──────────────────────
      doc.rect(startX, y, contentW, headH).fill(YELLOW);
      let cx = startX;
      const vigencia = (() => {
        const a = fmtD(combo.fecha_inicio), b = fmtD(combo.fecha_fin);
        if (!a && !b) return '—'; if (a && b) return `${a} → ${b}`;
        return a ? `desde ${a}` : `hasta ${b}`;
      })();
      const hVals = [
        combo.codigo,
        combo.nombre,
        combo.descripcion || '—',
        fmtN(combo.precio_combo),
        vigencia,
        estadoText,
      ];
      hVals.forEach((val, ci) => {
        const col   = hCols[ci];
        const color = ci === 5 ? estadoColor : DARK;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(color)
           .text(String(val), cx + 4, y + 7, { width: col.w - 8, align: col.align, lineBreak: false });
        cx += col.w;
      });
      y += headH;

      // ── Sub-cabecera columnas productos ──────────────────────────────
      ensureSpace(18 + 4);
      doc.rect(startX + INDENT, y, contentW - INDENT, 18).fill('#F1F5F9');
      let px = startX + INDENT;
      pCols.forEach(col => {
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#475569')
           .text(col.label, px + 3, y + 5, { width: col.w - 6, align: col.align });
        px += col.w;
      });
      y += 18;

      if (combo.productos.length === 0) {
        ensureSpace(16);
        doc.rect(startX + INDENT, y, contentW - INDENT, 16).fill(WHITE);
        doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
           .text('Sin productos asignados', startX + INDENT + 8, y + 4, { width: contentW - INDENT - 16 });
        y += 16;
      } else {
        combo.productos.forEach((prod, pi) => {
          ensureSpace(17);
          const rowBg = pi % 2 === 0 ? WHITE : '#F8FAFC';
          doc.rect(startX + INDENT, y, contentW - INDENT, 17).fill(rowBg);
          const linea = prod.cantidad * prod.precio;
          const pVals = [
            prod.codigo,
            prod.nombre,
            String(parseInt(prod.cantidad) === prod.cantidad ? prod.cantidad : prod.cantidad.toFixed(2)),
            `Bs. ${fmtN(prod.precio)}`,
            `Bs. ${fmtN(linea)}`,
          ];
          let rx = startX + INDENT;
          pVals.forEach((val, ci) => {
            const col = pCols[ci];
            doc.font('Helvetica').fontSize(7.5).fillColor(DARK)
               .text(String(val), rx + 3, y + 5, { width: col.w - 6, align: col.align, lineBreak: false });
            rx += col.w;
          });
          doc.moveTo(startX + INDENT, y + 17).lineTo(startX + contentW, y + 17)
             .strokeColor('#E2E8F0').lineWidth(0.3).stroke();
          y += 17;
        });

        // ── Fila resumen del combo ─────────────────────────────────────
        ensureSpace(18);
        doc.rect(startX + INDENT, y, contentW - INDENT, 18).fill('#FEF9C3');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK)
           .text('Precio catálogo:', startX + INDENT + 8, y + 5);
        doc.font('Helvetica').fontSize(7.5).fillColor(DARK)
           .text(`Bs. ${fmtN(totalCatalogo)}`, startX + INDENT + 95, y + 5);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK)
           .text('Precio combo:', startX + INDENT + 190, y + 5);
        doc.font('Helvetica').fontSize(7.5).fillColor(BLUE_D)
           .text(`Bs. ${fmtN(combo.precio_combo)}`, startX + INDENT + 275, y + 5);
        if (ahorro > 0) {
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GREEN)
             .text(`Ahorro: Bs. ${fmtN(ahorro)} (${porcAhorro.toFixed(0)}%)`, startX + INDENT + 370, y + 5);
        }
        y += 18;
      }

      y += 8; // espacio entre combos
    });

    // Pie de página en todas las hojas
    const rangeCombos = doc.bufferedPageRange();
    for (let i = rangeCombos.start; i < rangeCombos.start + rangeCombos.count; i++) {
      doc.switchToPage(i);
      // Se usa height - 55 para quedar dentro del área de contenido (< height - margin = height - 40)
      // Evita que PDFKit agregue una página extra al detectar desbordamiento de margen
      doc.font('Helvetica').fontSize(7).fillColor(GRAY)
         .text(footerText, margin, doc.page.height - 55, { width: contentW, align: 'center' });
    }
    doc.flushPages();
    doc.end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al exportar combos' });
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

// ── PRODUCTOS PARA SELECTOR DE COMBOS ────────────────────────────────────
// Lista liviana: solo los campos necesarios para armar el detalle de un combo.
// Protegida por "ver combos" para no requerir permiso de "ver productos".
const getProductosParaCombo = async (req, res) => {
  try {
    const { q } = req.query;
    let sql = `
      SELECT p.id_producto, p.codigo_interno, p.producto AS nombre,
             p.precio_publico
      FROM productos p
      WHERE p.activo = 1
    `;
    const params = [];
    if (q) {
      sql += ` AND (p.producto LIKE ? OR p.codigo_interno LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ` ORDER BY p.producto ASC LIMIT 300`;
    const [rows] = await db.promise().query(sql, params);
    return res.json({ productos: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// ── ITEMS PARA SELECTOR DE PROMOCIONES ──────────────────────────────────────
const getItemsParaPromocion = async (req, res) => {
  try {
    const { tipo = 'PRODUCTO', q } = req.query;
    let rows = [];

    if (tipo === 'PRODUCTO') {
      let sql = `SELECT p.id_producto AS id, p.codigo_interno AS codigo, p.producto AS nombre
                 FROM productos p WHERE p.activo = 1`;
      const params = [];
      if (q) { sql += ` AND (p.producto LIKE ? OR p.codigo_interno LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }
      sql += ` ORDER BY p.producto ASC LIMIT 300`;
      [rows] = await db.promise().query(sql, params);
    } else if (tipo === 'CATEGORIA') {
      let sql = `SELECT id_categoria AS id, NULL AS codigo, nombre FROM categorias WHERE 1=1`;
      const params = [];
      if (q) { sql += ` AND nombre LIKE ?`; params.push(`%${q}%`); }
      sql += ` ORDER BY nombre ASC`;
      [rows] = await db.promise().query(sql, params);
    } else if (tipo === 'MARCA') {
      let sql = `SELECT id_marca AS id, NULL AS codigo, nombre FROM marcas WHERE 1=1`;
      const params = [];
      if (q) { sql += ` AND nombre LIKE ?`; params.push(`%${q}%`); }
      sql += ` ORDER BY nombre ASC`;
      [rows] = await db.promise().query(sql, params);
    }

    return res.json({ items: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener items' });
  }
};

// ── EXPORTAR PROMOCIONES PDF ─────────────────────────────────────────────────
const exportarPromociones = async (req, res) => {
  try {
    const { filtro } = req.query;

    let where = '';
    if (filtro === 'activos')   where = 'WHERE pr.activo = 1';
    if (filtro === 'inactivos') where = 'WHERE pr.activo = 0';

    const [[empresaRows], [detalleRows]] = await Promise.all([
      db.promise().query(`SELECT * FROM empresas WHERE activo = 1 LIMIT 1`),
      db.promise().query(`
        SELECT pr.id_promocion, pr.codigo, pr.nombre, pr.descripcion,
               pr.tipo_descuento, pr.valor_descuento,
               pr.aplica_a, pr.cantidad_minima,
               pr.fecha_inicio, pr.fecha_fin, pr.activo,
               pp.id_producto, pp.id_categoria, pp.id_marca,
               p.codigo_interno  AS prod_codigo,
               p.producto        AS prod_nombre,
               cat.nombre        AS cat_nombre,
               m.nombre          AS marca_nombre
        FROM promociones pr
        LEFT JOIN promocion_producto pp ON pp.id_promocion = pr.id_promocion
        LEFT JOIN productos p   ON p.id_producto     = pp.id_producto
        LEFT JOIN categorias cat ON cat.id_categoria = pp.id_categoria
        LEFT JOIN marcas m       ON m.id_marca       = pp.id_marca
        ${where}
        ORDER BY pr.fecha_inicio DESC, pr.nombre ASC
      `),
    ]);

    // Agrupar por promoción
    const promoMap = new Map();
    for (const r of detalleRows) {
      if (!promoMap.has(r.id_promocion)) {
        promoMap.set(r.id_promocion, {
          id_promocion: r.id_promocion, codigo: r.codigo, nombre: r.nombre,
          descripcion: r.descripcion, tipo_descuento: r.tipo_descuento,
          valor_descuento: r.valor_descuento, aplica_a: r.aplica_a,
          cantidad_minima: r.cantidad_minima,
          fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin, activo: r.activo,
          items: [],
        });
      }
      const promo = promoMap.get(r.id_promocion);
      if (r.aplica_a === 'PRODUCTO'  && r.prod_nombre)  promo.items.push({ codigo: r.prod_codigo, nombre: r.prod_nombre });
      if (r.aplica_a === 'CATEGORIA' && r.cat_nombre)   promo.items.push({ nombre: r.cat_nombre });
      if (r.aplica_a === 'MARCA'     && r.marca_nombre) promo.items.push({ nombre: r.marca_nombre });
    }
    const rows = [...promoMap.values()];

    const empresa = empresaRows[0] ?? {};
    const fecha   = new Date().toISOString().slice(0, 10);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape', bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      const buf = Buffer.concat(chunks);
      res.setHeader('Content-Disposition', `attachment; filename="promociones_${fecha}.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(buf);
    });

    const YELLOW = '#FBBF24', DARK = '#1C1C1E', GRAY = '#6B7280', WHITE = '#FFFFFF';
    const GREEN  = '#16A34A', BLUE_D = '#1D4ED8', AMBER = '#D97706';
    const pageW  = doc.page.width, margin = 40, contentW = pageW - margin * 2;
    let headerBottom = margin;

    if (empresa.logo_url) {
      const logoPath = path.join(__dirname, '..', empresa.logo_url.replace(/^\//, ''));
      if (fs.existsSync(logoPath)) doc.image(logoPath, margin, margin, { width: 60, height: 60 });
    }
    const textX = empresa.logo_url ? margin + 70 : margin;
    doc.font('Helvetica-Bold').fontSize(16).fillColor(DARK)
       .text(empresa.nombre_comercial || empresa.razon_social || 'Empresa', textX, margin, { width: contentW - 70 });
    doc.font('Helvetica').fontSize(8).fillColor(GRAY);
    [
      empresa.razon_social && empresa.nombre_comercial ? `Razón social: ${empresa.razon_social}` : null,
      empresa.nit       ? `NIT: ${empresa.nit}`      : null,
      empresa.direccion ? empresa.direccion           : null,
      empresa.telefono  ? `Tel: ${empresa.telefono}`  : null,
      empresa.email     ? empresa.email               : null,
    ].filter(Boolean).forEach(l => doc.text(l, textX, doc.y, { width: contentW - 70 }));

    headerBottom = Math.max(doc.y, margin + 65) + 6;
    doc.moveTo(margin, headerBottom).lineTo(pageW - margin, headerBottom).strokeColor(YELLOW).lineWidth(2).stroke();
    headerBottom += 10;

    const tituloFiltro = filtro === 'activos' ? ' — Activas' : filtro === 'inactivos' ? ' — Inactivas' : '';
    doc.font('Helvetica-Bold').fontSize(13).fillColor(DARK)
       .text(`Reporte de Promociones${tituloFiltro}`, margin, headerBottom);
    doc.font('Helvetica').fontSize(8).fillColor(GRAY)
       .text(`Generado: ${new Date().toLocaleDateString('es-BO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}   Total: ${rows.length} promoción${rows.length !== 1 ? 'es' : ''}`,
             margin, doc.y + 2);

    let y = doc.y + 14;
    const startX = margin;
    const today = new Date().toISOString().slice(0, 10);

    const fmtD = d => {
      if (!d) return '—';
      const iso = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
      return new Date(iso + 'T12:00:00').toLocaleDateString('es-BO', { day:'2-digit', month:'2-digit', year:'2-digit' });
    };

    const footerTextP = `${empresa.nombre_comercial || empresa.razon_social || ''} · Reporte generado el ${fecha}`;

    const ensureSpace = (needed) => {
      if (y + needed > doc.page.height - 65) {
        doc.addPage();
        y = margin;
      }
    };

    const getEstado = (r) => {
      const fi = r.fecha_inicio ? (r.fecha_inicio instanceof Date ? r.fecha_inicio.toISOString().slice(0,10) : String(r.fecha_inicio).slice(0,10)) : null;
      const ff = r.fecha_fin    ? (r.fecha_fin    instanceof Date ? r.fecha_fin.toISOString().slice(0,10)    : String(r.fecha_fin).slice(0,10))    : null;
      if (!r.activo) return ff && ff < today ? { label: 'Vencida', color: AMBER } : { label: 'Inactiva', color: GRAY };
      if (fi && fi > today) return { label: 'Próxima', color: BLUE_D };
      if (ff && ff < today) return { label: 'Vencida',  color: AMBER };
      return { label: 'Vigente', color: GREEN };
    };

    const APLICA_LABEL = { PRODUCTO: 'Producto', CATEGORIA: 'Categoría', MARCA: 'Marca', TODOS: 'Todos' };

    // Columnas cabecera de promoción
    const hCols = [
      { label: 'Código',      w: 80,  align: 'left'   },
      { label: 'Nombre',      w: 170, align: 'left'   },
      { label: 'Descuento',   w: 90,  align: 'center' },
      { label: 'Aplica a',    w: 75,  align: 'center' },
      { label: 'Cant. Mín.',  w: 60,  align: 'center' },
      { label: 'Vigencia',    w: 115, align: 'center' },
      { label: 'Estado',      w: 60,  align: 'center' },
    ];
    // Columnas sub-detalle de items
    const iCols = [
      { label: 'Código',   w: 100, align: 'left' },
      { label: 'Nombre',   w: 450, align: 'left' },
    ];
    const INDENT = 20;

    rows.forEach((promo) => {
      const estado   = getEstado(promo);
      const descTxt  = promo.tipo_descuento === 'PORCENTAJE'
        ? `${parseFloat(promo.valor_descuento).toFixed(0)}%`
        : `Bs. ${parseFloat(promo.valor_descuento).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const tipoTxt  = promo.tipo_descuento === 'PORCENTAJE' ? 'Porcentaje' : 'Monto fijo';
      const vigencia = (() => {
        const a = fmtD(promo.fecha_inicio), b = fmtD(promo.fecha_fin);
        if (!a && !b) return '—'; if (a && b) return `${a} → ${b}`;
        return a ? `desde ${a}` : `hasta ${b}`;
      })();
      const headH = 22;

      ensureSpace(headH + 4);

      // ── Fila cabecera de la promoción (fondo amarillo) ─────────────
      doc.rect(startX, y, contentW, headH).fill(YELLOW);
      let cx = startX;
      const hVals = [
        promo.codigo,
        promo.nombre,
        `${descTxt}  (${tipoTxt})`,
        APLICA_LABEL[promo.aplica_a] || promo.aplica_a,
        String(parseInt(promo.cantidad_minima) || 1),
        vigencia,
        estado.label,
      ];
      hVals.forEach((val, ci) => {
        const col   = hCols[ci];
        const color = ci === 6 ? estado.color : DARK;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(color)
           .text(String(val), cx + 4, y + 7, { width: col.w - 8, align: col.align, lineBreak: false });
        cx += col.w;
      });
      y += headH;

      // ── Descripción (si existe) ────────────────────────────────────
      if (promo.descripcion) {
        ensureSpace(14);
        doc.rect(startX + INDENT, y, contentW - INDENT, 14).fill('#FFFBEB');
        doc.font('Helvetica').fontSize(7).fillColor('#92400E')
           .text(promo.descripcion, startX + INDENT + 6, y + 4,
                 { width: contentW - INDENT - 12, lineBreak: false });
        y += 14;
      }

      // ── Sub-detalle de items ───────────────────────────────────────
      if (promo.aplica_a === 'TODOS') {
        ensureSpace(17);
        doc.rect(startX + INDENT, y, contentW - INDENT, 17).fill('#F0FDF4');
        doc.font('Helvetica').fontSize(7.5).fillColor(GREEN)
           .text('Aplica a todos los productos del catálogo', startX + INDENT + 8, y + 5);
        y += 17;
      } else if (promo.items.length === 0) {
        ensureSpace(17);
        doc.rect(startX + INDENT, y, contentW - INDENT, 17).fill(WHITE);
        doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
           .text('Sin ítems asignados', startX + INDENT + 8, y + 5);
        y += 17;
      } else {
        // Sub-cabecera de items
        ensureSpace(18);
        doc.rect(startX + INDENT, y, contentW - INDENT, 18).fill('#F1F5F9');
        let px = startX + INDENT;
        iCols.forEach(col => {
          doc.font('Helvetica-Bold').fontSize(7).fillColor('#475569')
             .text(col.label, px + 3, y + 5, { width: col.w - 6, align: col.align });
          px += col.w;
        });
        y += 18;

        promo.items.forEach((item, ii) => {
          ensureSpace(16);
          doc.rect(startX + INDENT, y, contentW - INDENT, 16).fill(ii % 2 === 0 ? WHITE : '#F8FAFC');
          let rx = startX + INDENT;
          const iVals = [item.codigo || '—', item.nombre || '—'];
          iVals.forEach((val, ci) => {
            const col = iCols[ci];
            doc.font('Helvetica').fontSize(7.5).fillColor(DARK)
               .text(String(val), rx + 3, y + 4, { width: col.w - 6, align: col.align, lineBreak: false });
            rx += col.w;
          });
          doc.moveTo(startX + INDENT, y + 16).lineTo(startX + contentW, y + 16)
             .strokeColor('#E2E8F0').lineWidth(0.3).stroke();
          y += 16;
        });

        // Resumen cantidad
        ensureSpace(16);
        doc.rect(startX + INDENT, y, contentW - INDENT, 16).fill('#FEF9C3');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK)
           .text(`Total ${APLICA_LABEL[promo.aplica_a] || promo.aplica_a}s: ${promo.items.length}`,
                 startX + INDENT + 8, y + 4);
        y += 16;
      }

      y += 8; // espacio entre promociones
    });

    // Pie de página en todas las hojas
    const rangePromos = doc.bufferedPageRange();
    for (let i = rangePromos.start; i < rangePromos.start + rangePromos.count; i++) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(7).fillColor(GRAY)
         .text(footerTextP, margin, doc.page.height - 55, { width: contentW, align: 'center' });
    }
    doc.flushPages();
    doc.end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al exportar promociones' });
  }
};

module.exports = {
  getCombos, getCombo, createCombo, updateCombo, deleteCombo,
  getComboDetalle, upsertComboDetalle,
  uploadImagenCombo, exportarCombos,
  getProductosParaCombo,
  getPromociones, getPromocion, getPromocionesVigentes,
  createPromocion, updatePromocion, deletePromocion,
  getAplicaciones, upsertAplicaciones,
  getItemsParaPromocion, exportarPromociones,
};
