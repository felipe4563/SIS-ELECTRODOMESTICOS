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
    const { filtro } = req.query; // 'activos' | 'inactivos' | 'todos' (default)

    let comboWhere = '';
    const comboParams = [];
    if (filtro === 'activos')   { comboWhere = 'WHERE c.activo = 1'; }
    if (filtro === 'inactivos') { comboWhere = 'WHERE c.activo = 0'; }

    // Datos de empresa y combos en paralelo
    const [[empresaRows], [rows]] = await Promise.all([
      db.promise().query(`SELECT * FROM empresas WHERE activo = 1 LIMIT 1`),
      db.promise().query(`
        SELECT c.codigo, c.nombre, c.descripcion, c.precio_combo,
               c.fecha_inicio, c.fecha_fin, c.activo,
               COUNT(cd.id_combo_detalle) AS total_productos
        FROM combos c
        LEFT JOIN combo_detalle cd ON cd.id_combo = c.id_combo
        ${comboWhere}
        GROUP BY c.id_combo
        ORDER BY c.nombre ASC
      `, comboParams),
    ]);

    const empresa = empresaRows[0] ?? {};
    const fecha   = new Date().toISOString().slice(0, 10);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

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

    const tableTop = doc.y + 12;

    // ── Tabla ─────────────────────────────────────────────────────────────
    const cols = [
      { label: 'Código',        w: 80,  align: 'left'  },
      { label: 'Nombre',        w: 160, align: 'left'  },
      { label: 'Descripción',   w: 190, align: 'left'  },
      { label: 'Precio (Bs.)',  w: 75,  align: 'right' },
      { label: 'Inicio',        w: 60,  align: 'center'},
      { label: 'Fin',           w: 60,  align: 'center'},
      { label: 'Prods.',        w: 40,  align: 'center'},
      { label: 'Estado',        w: 55,  align: 'center'},
    ];

    const rowH   = 20;
    const headH  = 22;
    let   y      = tableTop;
    let   startX = margin;

    const fmtD = d => {
      if (!d) return '—';
      return new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-BO', { day:'2-digit', month:'2-digit', year:'2-digit' });
    };

    // Header row
    doc.rect(startX, y, contentW, headH).fill(YELLOW);
    let cx = startX;
    cols.forEach(col => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
         .text(col.label, cx + 4, y + 6, { width: col.w - 8, align: col.align });
      cx += col.w;
    });
    y += headH;

    // Data rows
    rows.forEach((r, i) => {
      if (y + rowH > doc.page.height - margin) {
        doc.addPage();
        y = margin;
        // Re-dibujar header en nueva página
        doc.rect(startX, y, contentW, headH).fill(YELLOW);
        let hx = startX;
        cols.forEach(col => {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
             .text(col.label, hx + 4, y + 6, { width: col.w - 8, align: col.align });
          hx += col.w;
        });
        y += headH;
      }

      const bg = i % 2 === 0 ? WHITE : LIGHT;
      doc.rect(startX, y, contentW, rowH).fill(bg);

      const cells = [
        r.codigo,
        r.nombre,
        r.descripcion || '—',
        Number(r.precio_combo).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        fmtD(r.fecha_inicio),
        fmtD(r.fecha_fin),
        String(r.total_productos),
        r.activo ? 'Activo' : 'Inactivo',
      ];

      let rx = startX;
      cells.forEach((cell, ci) => {
        const col   = cols[ci];
        const color = ci === 7 ? (r.activo ? '#16A34A' : GRAY) : DARK;
        doc.font('Helvetica').fontSize(7.5).fillColor(color)
           .text(String(cell), rx + 4, y + 6, { width: col.w - 8, align: col.align, lineBreak: false });
        rx += col.w;
      });

      // Línea inferior de fila
      doc.moveTo(startX, y + rowH).lineTo(startX + contentW, y + rowH)
         .strokeColor('#E4E4E7').lineWidth(0.3).stroke();
      y += rowH;
    });

    // Borde exterior tabla
    doc.rect(startX, tableTop, contentW, y - tableTop)
       .strokeColor('#D1D5DB').lineWidth(0.5).stroke();

    // ── Pie de página ─────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(7).fillColor(GRAY)
       .text(`${empresa.nombre_comercial || empresa.razon_social || ''} · Reporte generado el ${fecha}`,
             margin, doc.page.height - 30, { width: contentW, align: 'center' });

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
    if (filtro === 'activos')   where = 'WHERE p.activo = 1';
    if (filtro === 'inactivos') where = 'WHERE p.activo = 0';

    const [[empresaRows], [rows]] = await Promise.all([
      db.promise().query(`SELECT * FROM empresas WHERE activo = 1 LIMIT 1`),
      db.promise().query(`
        SELECT p.codigo, p.nombre, p.tipo_descuento, p.valor_descuento,
               p.aplica_a, p.cantidad_minima,
               p.fecha_inicio, p.fecha_fin, p.activo,
               COUNT(pp.id_promo_prod) AS total_aplicaciones
        FROM promociones p
        LEFT JOIN promocion_producto pp ON pp.id_promocion = p.id_promocion
        ${where}
        GROUP BY p.id_promocion
        ORDER BY p.fecha_inicio DESC
      `),
    ]);

    const empresa = empresaRows[0] ?? {};
    const fecha   = new Date().toISOString().slice(0, 10);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      const buf = Buffer.concat(chunks);
      res.setHeader('Content-Disposition', `attachment; filename="promociones_${fecha}.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(buf);
    });

    const YELLOW = '#FBBF24', DARK = '#1C1C1E', GRAY = '#6B7280', LIGHT = '#F4F4F5', WHITE = '#FFFFFF';
    const pageW = doc.page.width, margin = 40, contentW = pageW - margin * 2;
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
      empresa.nit       ? `NIT: ${empresa.nit}`     : null,
      empresa.direccion ? empresa.direccion          : null,
      empresa.telefono  ? `Tel: ${empresa.telefono}` : null,
      empresa.email     ? empresa.email              : null,
    ].filter(Boolean).forEach(l => doc.text(l, textX, doc.y, { width: contentW - 70 }));

    headerBottom = Math.max(doc.y, margin + 65) + 6;
    doc.moveTo(margin, headerBottom).lineTo(pageW - margin, headerBottom).strokeColor(YELLOW).lineWidth(2).stroke();
    headerBottom += 10;

    const tituloFiltro = filtro === 'activos' ? ' — Activas' : filtro === 'inactivos' ? ' — Inactivas' : '';
    doc.font('Helvetica-Bold').fontSize(13).fillColor(DARK).text(`Reporte de Promociones${tituloFiltro}`, margin, headerBottom);
    doc.font('Helvetica').fontSize(8).fillColor(GRAY)
       .text(`Generado: ${new Date().toLocaleDateString('es-BO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}   Total: ${rows.length} promoción${rows.length !== 1 ? 'es' : ''}`,
             margin, doc.y + 2);

    const tableTop = doc.y + 12;
    const cols = [
      { label: 'Código',       w: 75,  align: 'left'   },
      { label: 'Nombre',       w: 150, align: 'left'   },
      { label: 'Tipo',         w: 70,  align: 'center' },
      { label: 'Descuento',    w: 65,  align: 'right'  },
      { label: 'Aplica a',     w: 65,  align: 'center' },
      { label: 'Cant. Mín.',   w: 50,  align: 'center' },
      { label: 'Inicio',       w: 60,  align: 'center' },
      { label: 'Fin',          w: 60,  align: 'center' },
      { label: 'Estado',       w: 55,  align: 'center' },
    ];

    const rowH = 20, headH = 22;
    let y = tableTop;
    const startX = margin;
    const fmtD = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-BO', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—';
    const today = new Date().toISOString().slice(0, 10);

    const drawHeader = (yPos) => {
      doc.rect(startX, yPos, contentW, headH).fill(YELLOW);
      let cx = startX;
      cols.forEach(col => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
           .text(col.label, cx + 4, yPos + 6, { width: col.w - 8, align: col.align });
        cx += col.w;
      });
      return yPos + headH;
    };

    y = drawHeader(y);

    rows.forEach((r, i) => {
      if (y + rowH > doc.page.height - margin) {
        doc.addPage();
        y = drawHeader(margin);
      }
      doc.rect(startX, y, contentW, rowH).fill(i % 2 === 0 ? WHITE : LIGHT);

      const fi = r.fecha_inicio ? String(r.fecha_inicio).slice(0,10) : null;
      const ff = r.fecha_fin    ? String(r.fecha_fin).slice(0,10)    : null;
      let estado = 'Inactivo';
      if (r.activo) {
        if (fi && fi > today) estado = 'Próxima';
        else if (ff && ff < today) estado = 'Vencida';
        else estado = 'Vigente';
      } else if (ff && ff < today) estado = 'Vencida';

      const statusColor = { Vigente: '#16A34A', Próxima: '#2563EB', Vencida: '#D97706', Inactivo: GRAY }[estado] || GRAY;
      const cells = [
        r.codigo,
        r.nombre,
        r.tipo_descuento === 'PORCENTAJE' ? 'Porcentaje' : 'Monto fijo',
        r.tipo_descuento === 'PORCENTAJE'
          ? `${parseFloat(r.valor_descuento).toFixed(0)}%`
          : `Bs. ${parseFloat(r.valor_descuento).toFixed(2)}`,
        r.aplica_a,
        String(r.cantidad_minima ?? 1),
        fmtD(r.fecha_inicio),
        fmtD(r.fecha_fin),
        estado,
      ];

      let rx = startX;
      cells.forEach((cell, ci) => {
        const col = cols[ci];
        const color = ci === 8 ? statusColor : DARK;
        doc.font('Helvetica').fontSize(7.5).fillColor(color)
           .text(String(cell), rx + 4, y + 6, { width: col.w - 8, align: col.align, lineBreak: false });
        rx += col.w;
      });
      doc.moveTo(startX, y + rowH).lineTo(startX + contentW, y + rowH).strokeColor('#E4E4E7').lineWidth(0.3).stroke();
      y += rowH;
    });

    doc.rect(startX, tableTop, contentW, y - tableTop).strokeColor('#D1D5DB').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(GRAY)
       .text(`${empresa.nombre_comercial || empresa.razon_social || ''} · Reporte generado el ${fecha}`,
             margin, doc.page.height - 30, { width: contentW, align: 'center' });

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
