const db      = require('../config/db');
const path    = require('path');
const fs      = require('fs');
const XLSX    = require('xlsx');
const PDFDoc  = require('pdfkit');
const bwipjs  = require('bwip-js');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?,?,?,?,?)`,
    [userId, tabla, String(id), accion, ip]
  );

// ── helpers config_sistema ────────────────────────────────────────────────────
async function getConfig(clave) {
  const [[row]] = await db.promise().query(
    `SELECT valor FROM configuracion_sistema WHERE clave = ?`, [clave]
  );
  return row?.valor ?? null;
}

async function setConfig(clave, valor, descripcion = null, tipo = 'STRING') {
  await db.promise().query(
    `INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo_dato)
     VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE valor = VALUES(valor), fecha_modificacion = NOW()`,
    [clave, valor, descripcion, tipo]
  );
}

// ── BACKUP ────────────────────────────────────────────────────────────────────

async function generarSQLDump() {
  const conn = db.promise();
  const [tablesRes] = await conn.query('SHOW TABLES');
  const dbName = process.env.DB_NAME || 'bd_electrodomesticos';

  const SKIP_TABLES = ['sesiones'];
  const ORDER_PRIORITY = [
    'empresas','sucursales','depositos','monedas','tipos_cambio','bancos',
    'roles','modulos','permisos','rol_permiso','usuarios','usuario_sucursal',
    'marcas','categorias','unidades_medida','impuestos','proveedores',
    'proveedor_contactos','proveedor_cuentas_pago','clientes','cliente_direcciones',
    'configuracion_sistema','tipos_movimiento',
  ];

  const allTables = tablesRes.map(r => Object.values(r)[0]);
  const sorted = [
    ...ORDER_PRIORITY.filter(t => allTables.includes(t)),
    ...allTables.filter(t => !ORDER_PRIORITY.includes(t) && !SKIP_TABLES.includes(t)),
  ];

  let sql = `-- Backup Megaelectra\n-- Generado: ${new Date().toISOString()}\n-- Base: ${dbName}\n\n`;
  sql += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

  for (const tabla of sorted) {
    sql += `-- ═══ ${tabla} ═══\n`;
    sql += `TRUNCATE TABLE \`${tabla}\`;\n`;

    const [rows] = await conn.query(`SELECT * FROM \`${tabla}\``);
    if (rows.length > 0) {
      const cols = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
      for (const row of rows) {
        const vals = Object.values(row).map(v => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return v;
          if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
          if (Buffer.isBuffer(v)) return `'${v.toString('hex')}'`;
          return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
        }).join(', ');
        sql += `INSERT INTO \`${tabla}\` (${cols}) VALUES (${vals});\n`;
      }
    }
    sql += '\n';
  }

  sql += `SET FOREIGN_KEY_CHECKS=1;\n`;
  return sql;
}

exports.crearBackup = async (req, res) => {
  try {
    const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup_${ts}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    const sql = await generarSQLDump();
    fs.writeFileSync(filepath, sql, 'utf8');

    const stats  = fs.statSync(filepath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    auditLog(req.user?.id, 'backup', 0, 'OTRO', req.ip);
    res.json({ ok: true, archivo: filename, tamano_mb: sizeMB });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear backup: ' + e.message });
  }
};

exports.listarBackups = async (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          id: f,
          nombre: f,
          fecha: stats.mtime,
          tamano_mb: (stats.size / 1024 / 1024).toFixed(2),
        };
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json(files);
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

exports.descargarBackup = async (req, res) => {
  try {
    const { id } = req.params;
    if (id.includes('..') || id.includes('/') || id.includes('\\'))
      return res.status(400).json({ mensaje: 'Archivo inválido' });

    const filepath = path.join(BACKUP_DIR, id);
    if (!fs.existsSync(filepath))
      return res.status(404).json({ mensaje: 'Backup no encontrado' });

    res.download(filepath, id);
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

exports.restaurarBackup = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id || id.includes('..')) return res.status(400).json({ mensaje: 'Archivo inválido' });

    const filepath = path.join(BACKUP_DIR, id);
    if (!fs.existsSync(filepath)) return res.status(404).json({ mensaje: 'Backup no encontrado' });

    const sql  = fs.readFileSync(filepath, 'utf8');
    const conn = db.promise();
    const stmts = sql.split(';\n').map(s => s.trim()).filter(s => s && !s.startsWith('--'));

    for (const stmt of stmts) {
      if (stmt) await conn.query(stmt + ';').catch(() => {});
    }

    auditLog(req.user?.id, 'backup', 0, 'OTRO', req.ip);
    res.json({ ok: true, mensaje: 'Backup restaurado correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al restaurar: ' + e.message });
  }
};

exports.eliminarBackup = async (req, res) => {
  try {
    const { id } = req.params;
    if (id.includes('..') || !id.endsWith('.sql'))
      return res.status(400).json({ mensaje: 'Archivo inválido' });

    const filepath = path.join(BACKUP_DIR, id);
    if (!fs.existsSync(filepath)) return res.status(404).json({ mensaje: 'No encontrado' });

    fs.unlinkSync(filepath);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

// ── EXCEL ─────────────────────────────────────────────────────────────────────

const PLANTILLA_COLS = [
  'codigo_interno', 'codigo_barras', 'producto', 'detalle', 'modelo',
  'color', 'capacidad', 'caracteristicas', 'marca', 'categoria', 'unidad',
  'precio_real', 'costo_logistica', 'costo_mcm', 'precio_publico',
  'bono', 'precio_mayor', 'stock_minimo', 'stock_maximo', 'estado', 'notas',
];

exports.descargarPlantilla = async (req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([PLANTILLA_COLS]);

    ws['!cols'] = PLANTILLA_COLS.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_productos.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

exports.exportarProductos = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT p.codigo_interno, p.codigo_barras, p.producto, p.detalle, p.modelo,
             p.color, p.capacidad, p.caracteristicas,
             m.nombre AS marca, c.nombre AS categoria, u.nombre AS unidad,
             p.precio_real, p.costo_logistica, p.costo_mcm,
             p.precio_publico, p.bono, p.precio_mayor,
             p.stock_minimo, p.stock_maximo, p.estado, p.notas,
             COALESCE(SUM(s.cantidad), 0) AS stock_total
      FROM productos p
      LEFT JOIN marcas m     ON m.id_marca    = p.id_marca
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      LEFT JOIN unidades_medida u ON u.id_unidad = p.id_unidad
      LEFT JOIN stock s      ON s.id_producto = p.id_producto
      WHERE p.activo = 1
      GROUP BY p.id_producto
      ORDER BY p.producto
    `);

    const data = [
      [...PLANTILLA_COLS, 'stock_total'],
      ...rows.map(r => PLANTILLA_COLS.map(c => r[c] ?? '').concat(r.stock_total)),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = data[0].map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="catalogo_productos.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

exports.importarProductos = async (req, res) => {
  if (!req.file) return res.status(400).json({ mensaje: 'No se recibió archivo' });

  try {
    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (data.length === 0) return res.status(400).json({ mensaje: 'El archivo está vacío' });

    const conn = db.promise();
    const errores = [];
    let creados = 0, actualizados = 0;

    for (let i = 0; i < data.length; i++) {
      const fila = i + 2;
      const r    = data[i];

      if (!r.codigo_interno) { errores.push({ fila, campo: 'codigo_interno', msg: 'Requerido' }); continue; }
      if (!r.producto)       { errores.push({ fila, campo: 'producto',       msg: 'Requerido' }); continue; }

      try {
        // Resolver IDs
        const [[marca]] = await conn.query(`SELECT id_marca FROM marcas WHERE nombre = ?`, [r.marca || '']);
        const [[cat]]   = await conn.query(`SELECT id_categoria FROM categorias WHERE nombre = ?`, [r.categoria || '']);
        const [[uni]]   = await conn.query(`SELECT id_unidad FROM unidades_medida WHERE nombre = ?`, [r.unidad || '']);

        if (!marca) { errores.push({ fila, campo: 'marca', msg: `Marca "${r.marca}" no existe` }); continue; }
        if (!cat)   { errores.push({ fila, campo: 'categoria', msg: `Categoría "${r.categoria}" no existe` }); continue; }
        if (!uni)   { errores.push({ fila, campo: 'unidad', msg: `Unidad "${r.unidad}" no existe` }); continue; }

        const [[moneda]] = await conn.query(`SELECT id_moneda FROM monedas WHERE es_moneda_base = 1 LIMIT 1`);
        const idMoneda   = moneda?.id_moneda ?? 1;

        const ESTADOS_VALIDOS = ['NUEVO','USADO','EXHIBICION','RECONDICIONADO','DESCONTINUADO'];
        const estado = ESTADOS_VALIDOS.includes(r.estado?.toUpperCase()) ? r.estado.toUpperCase() : 'NUEVO';

        const campos = {
          codigo_barras:    r.codigo_barras    || null,
          id_marca:         marca.id_marca,
          id_categoria:     cat.id_categoria,
          id_unidad:        uni.id_unidad,
          producto:         String(r.producto),
          detalle:          r.detalle          || null,
          modelo:           r.modelo           || null,
          color:            r.color            || null,
          capacidad:        r.capacidad        || null,
          caracteristicas:  r.caracteristicas  || null,
          id_moneda_costo:  idMoneda,
          precio_real:      Number(r.precio_real)      || 0,
          costo_logistica:  Number(r.costo_logistica)  || 0,
          costo_mcm:        Number(r.costo_mcm)        || 0,
          precio_publico:   Number(r.precio_publico)   || 0,
          bono:             Number(r.bono)             || 0,
          precio_mayor:     Number(r.precio_mayor)     || 0,
          stock_minimo:     Number(r.stock_minimo)     || 0,
          stock_maximo:     Number(r.stock_maximo)     || 0,
          estado,
          notas:            r.notas || null,
        };

        const [[existe]] = await conn.query(
          `SELECT id_producto FROM productos WHERE codigo_interno = ?`, [r.codigo_interno]
        );

        if (existe) {
          await conn.query(`UPDATE productos SET ? WHERE id_producto = ?`, [campos, existe.id_producto]);
          actualizados++;
        } else {
          await conn.query(`INSERT INTO productos SET codigo_interno = ?, ?`, [r.codigo_interno, campos]);
          creados++;
        }
      } catch (e) {
        errores.push({ fila, campo: '-', msg: e.message });
      }
    }

    res.json({ ok: true, creados, actualizados, errores });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error al procesar archivo: ' + e.message });
  }
};

// ── CÓDIGO DE BARRAS ──────────────────────────────────────────────────────────

exports.generarCodigoBarras = async (req, res) => {
  try {
    const { id_producto } = req.params;
    const [[prod]] = await db.promise().query(
      `SELECT producto, codigo_interno, codigo_barras FROM productos WHERE id_producto = ?`,
      [id_producto]
    );
    if (!prod) return res.status(404).json({ mensaje: 'Producto no encontrado' });

    const code = prod.codigo_barras || prod.codigo_interno;
    const png  = await bwipjs.toBuffer({
      bcid:        'code128',
      text:        code,
      scale:       3,
      height:      10,
      includetext: true,
      textxalign:  'center',
    });

    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

exports.imprimirCodigoBarras = async (req, res) => {
  try {
    const ids  = String(req.query.ids || req.params.id_producto).split(',').map(Number).filter(Boolean);
    const copias = Math.min(Number(req.query.copias || 1), 50);

    if (!ids.length) return res.status(400).json({ mensaje: 'Sin productos' });

    const [prods] = await db.promise().query(
      `SELECT id_producto, producto, codigo_interno, codigo_barras FROM productos WHERE id_producto IN (?)`,
      [ids]
    );
    if (!prods.length) return res.status(404).json({ mensaje: 'No encontrados' });

    const doc = new PDFDoc({ size: [226, 850], margin: 10 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="codigos_barra.pdf"');
    doc.pipe(res);

    let primera = true;
    for (const prod of prods) {
      for (let c = 0; c < copias; c++) {
        if (!primera) doc.addPage();
        primera = false;

        const code = prod.codigo_barras || prod.codigo_interno;
        const png  = await bwipjs.toBuffer({
          bcid: 'code128', text: code, scale: 3, height: 10,
          includetext: true, textxalign: 'center',
        });

        const nombre = prod.producto.length > 32 ? prod.producto.slice(0, 32) + '…' : prod.producto;
        doc.fontSize(7).fillColor('#333').text(nombre, 0, 12, { width: 226, align: 'center' });
        doc.image(png, 10, 24, { width: 206 });
      }
    }

    doc.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: e.message });
  }
};

// ── CATÁLOGO PDF ──────────────────────────────────────────────────────────────

exports.getCatalogoMarcas = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT id_marca, nombre FROM marcas WHERE activo = 1 ORDER BY nombre`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

exports.getCatalogoCategorias = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT id_categoria, nombre FROM categorias WHERE activo = 1 ORDER BY nombre`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

exports.generarCatalogoPDF = async (req, res) => {
  try {
    const { id_marca, id_categoria } = req.query;

    let where = 'p.activo = 1';
    const params = [];
    if (id_marca)     { where += ' AND p.id_marca = ?';     params.push(id_marca); }
    if (id_categoria) { where += ' AND p.id_categoria = ?'; params.push(id_categoria); }

    const [prods] = await db.promise().query(`
      SELECT p.codigo_interno, p.codigo_barras, p.producto, p.detalle, p.modelo,
             p.color, p.capacidad, p.precio_publico, p.precio_mayor, p.bono,
             m.nombre AS marca, c.nombre AS categoria,
             COALESCE(SUM(s.cantidad), 0) AS stock_total
      FROM productos p
      LEFT JOIN marcas m     ON m.id_marca    = p.id_marca
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      LEFT JOIN stock s      ON s.id_producto = p.id_producto
      WHERE ${where}
      GROUP BY p.id_producto
      ORDER BY m.nombre, p.producto
    `, params);

    const [[emp]] = await db.promise().query(`SELECT * FROM empresas LIMIT 1`);

    const doc = new PDFDoc({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="catalogo.pdf"');
    doc.pipe(res);

    const W = doc.page.width - 80;

    // Encabezado
    doc.rect(40, 40, W, 50).fill('#18181b');
    doc.fillColor('#facc15').fontSize(16).font('Helvetica-Bold')
       .text(emp?.nombre_comercial || emp?.razon_social || 'Megaelectra', 55, 52, { width: W - 30 });
    doc.fillColor('#a1a1aa').fontSize(9).font('Helvetica')
       .text(`Catálogo de Productos — ${new Date().toLocaleDateString('es-BO')}`, 55, 72, { width: W - 30 });

    doc.moveDown(3);

    // Tabla header
    const colW = [60, 180, 70, 70, 70];
    const colX = [40];
    colW.forEach((w, i) => colX.push(colX[i] + w));
    const headers = ['Código', 'Producto', 'P. Público', 'P. Mayor', 'Stock'];

    let y = 110;
    doc.rect(40, y, W, 18).fill('#27272a');
    headers.forEach((h, i) => {
      doc.fillColor('#facc15').fontSize(8).font('Helvetica-Bold')
         .text(h, colX[i] + 3, y + 5, { width: colW[i] - 6 });
    });
    y += 18;

    let row = 0;
    for (const p of prods) {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }
      const bg = row % 2 === 0 ? '#fafafa' : '#f4f4f5';
      doc.rect(40, y, W, 16).fill(bg);

      const fmtN = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
      const vals = [
        p.codigo_interno,
        [p.producto, p.modelo, p.color].filter(Boolean).join(' / ').slice(0, 45),
        `Bs ${fmtN(p.precio_publico)}`,
        `Bs ${fmtN(p.precio_mayor)}`,
        String(p.stock_total),
      ];
      vals.forEach((v, i) => {
        doc.fillColor('#18181b').fontSize(7).font('Helvetica')
           .text(v, colX[i] + 3, y + 4, { width: colW[i] - 6, ellipsis: true });
      });

      y += 16;
      row++;
    }

    // Footer
    doc.fontSize(7).fillColor('#a1a1aa').font('Helvetica')
       .text(`Total: ${prods.length} productos`, 40, y + 10, { width: W });

    doc.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: e.message });
  }
};

// ── IMPRESORA ─────────────────────────────────────────────────────────────────

exports.getImpresora = async (req, res) => {
  try {
    const claves = ['impresora_nombre', 'impresora_puerto', 'impresora_tipo'];
    const result = {};
    for (const c of claves) result[c.replace('impresora_', '')] = await getConfig(c);
    res.json(result);
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

exports.updateImpresora = async (req, res) => {
  try {
    const { nombre, puerto, tipo } = req.body;
    await setConfig('impresora_nombre', nombre, 'Nombre de la impresora');
    await setConfig('impresora_puerto', puerto, 'Puerto de la impresora');
    await setConfig('impresora_tipo',   tipo,   'Tipo: TICKET o A4');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

// ── PLANTILLA FACTURA ─────────────────────────────────────────────────────────

exports.getPlantillaFactura = async (req, res) => {
  try {
    const val = await getConfig('factura_plantilla');
    res.json(val ? JSON.parse(val) : {
      encabezado: '', pie_pagina: '', logo_url: '', mostrar_logo: true,
      mostrar_qr: true, color_primario: '#18181b',
    });
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

exports.updatePlantillaFactura = async (req, res) => {
  try {
    await setConfig('factura_plantilla', JSON.stringify(req.body), 'Plantilla de factura', 'JSON');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

// ── ELIMINAR REGISTROS ────────────────────────────────────────────────────────

const TABLAS_PERMITIDAS = {
  auditoria:             'Registros de auditoría',
  sesiones:              'Sesiones cerradas',
  alertas_stock:         'Alertas de stock atendidas',
  kardex:                'Movimientos de kardex',
  producto_precio_historico: 'Historial de precios',
};

exports.getTablasBorrables = async (req, res) => {
  const result = Object.entries(TABLAS_PERMITIDAS).map(([tabla, label]) => ({ tabla, label }));
  res.json(result);
};

exports.eliminarRegistros = async (req, res) => {
  try {
    const { tabla, confirmacion } = req.body;
    if (confirmacion !== 'CONFIRMAR BORRADO') {
      return res.status(400).json({ mensaje: 'Confirmación incorrecta' });
    }
    if (!TABLAS_PERMITIDAS[tabla]) {
      return res.status(400).json({ mensaje: 'Tabla no permitida' });
    }

    let sql = `DELETE FROM \`${tabla}\``;
    if (tabla === 'sesiones')       sql += ` WHERE cerrada = 1`;
    if (tabla === 'alertas_stock')  sql += ` WHERE atendida = 1`;

    const [result] = await db.promise().query(sql);
    auditLog(req.user?.id, tabla, 0, 'DELETE', req.ip);

    res.json({ ok: true, eliminados: result.affectedRows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: e.message });
  }
};
