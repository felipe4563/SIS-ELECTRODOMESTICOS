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

const resolveBackupPath = (id) => {
  if (!id || typeof id !== 'string') return null;
  const resolved = path.resolve(BACKUP_DIR, id);
  if (!resolved.startsWith(path.resolve(BACKUP_DIR) + path.sep)) return null;
  return resolved;
};

exports.descargarBackup = async (req, res) => {
  try {
    const filepath = resolveBackupPath(req.params.id);
    if (!filepath)
      return res.status(400).json({ mensaje: 'Archivo inválido' });

    if (!fs.existsSync(filepath))
      return res.status(404).json({ mensaje: 'Backup no encontrado' });

    res.download(filepath, req.params.id);
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

exports.restaurarBackup = async (req, res) => {
  try {
    const filepath = resolveBackupPath(req.body.id);
    if (!filepath) return res.status(400).json({ mensaje: 'Archivo inválido' });

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
    const filepath = resolveBackupPath(req.params.id);
    if (!filepath || !req.params.id.endsWith('.sql'))
      return res.status(400).json({ mensaje: 'Archivo inválido' });

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

// Normaliza las cabeceras del Excel eliminando espacios extra
function normalizarHeaders(data) {
  if (!data.length) return data;
  return data.map(row => {
    const normalized = {};
    for (const key of Object.keys(row)) {
      normalized[key.trim()] = row[key];
    }
    return normalized;
  });
}

// Detecta si el archivo usa el formato de lista de precios del usuario
function esFormatoListaPrecios(headers) {
  const h = headers.map(h => h.trim().toUpperCase());
  return h.includes('MARCA') && h.includes('REAL BS.') && !h.includes('CODIGO_INTERNO');
}

// Resuelve o crea una marca por nombre
async function resolverMarca(conn, nombre) {
  const [[row]] = await conn.query(`SELECT id_marca FROM marcas WHERE nombre = ?`, [nombre]);
  if (row) return row.id_marca;
  const [ins] = await conn.query(`INSERT INTO marcas (nombre, activo) VALUES (?, 1)`, [nombre]);
  return ins.insertId;
}

// Resuelve o crea una categoría por nombre
async function resolverCategoria(conn, nombre) {
  const [[row]] = await conn.query(`SELECT id_categoria FROM categorias WHERE nombre = ?`, [nombre]);
  if (row) return row.id_categoria;
  const [ins] = await conn.query(`INSERT INTO categorias (nombre, activo) VALUES (?, 1)`, [nombre]);
  return ins.insertId;
}

// Resuelve o crea un proveedor por nombre
async function resolverProveedor(conn, nombre) {
  const [[row]] = await conn.query(`SELECT id_proveedor FROM proveedores WHERE razon_social = ?`, [nombre]);
  if (row) return row.id_proveedor;
  let codigo = nombre.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) || 'PROV';
  // Si el codigo ya existe, agregar sufijo numérico
  const [[codExiste]] = await conn.query(`SELECT id_proveedor FROM proveedores WHERE codigo = ?`, [codigo]);
  if (codExiste) codigo = codigo.slice(0, 17) + String(Date.now()).slice(-3);
  const [ins] = await conn.query(
    `INSERT INTO proveedores (codigo, razon_social, activo) VALUES (?, ?, 1)`,
    [codigo, nombre]
  );
  return ins.insertId;
}

exports.importarProductos = async (req, res) => {
  if (!req.file) return res.status(400).json({ mensaje: 'No se recibió archivo' });

  try {
    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const dataRaw = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (dataRaw.length === 0) return res.status(400).json({ mensaje: 'El archivo está vacío' });

    const data   = normalizarHeaders(dataRaw);
    const keys   = Object.keys(data[0]);
    const usandoListaPrecios = esFormatoListaPrecios(keys);

    const conn   = db.promise();
    const errores = [];
    let creados = 0, actualizados = 0;
    let marcasCreadas = 0, categoriasCreadas = 0, proveedoresCreados = 0;

    const [[moneda]] = await conn.query(`SELECT id_moneda FROM monedas WHERE es_moneda_base = 1 LIMIT 1`);
    const idMoneda   = moneda?.id_moneda ?? 1;
    let [[uniDefault]] = await conn.query(`SELECT id_unidad FROM unidades_medida LIMIT 1`);
    if (!uniDefault) {
      await conn.query(
        `INSERT IGNORE INTO unidades_medida (codigo, nombre, activo) VALUES ('UND', 'Unidad', 1)`
      );
      [[uniDefault]] = await conn.query(`SELECT id_unidad FROM unidades_medida LIMIT 1`);
    }
    const idUnidadDefault = uniDefault.id_unidad;

    const [depositos] = await conn.query(`SELECT id_deposito, codigo, nombre FROM depositos WHERE activo = 1`);
    const depositoMap = {};
    for (const dep of depositos) {
      const norm = s => s.trim().toUpperCase().replace(/[\s\-()\[\]\/]/g, '');
      depositoMap[norm(dep.codigo)] = dep.id_deposito;
      depositoMap[norm(dep.nombre)] = dep.id_deposito;
    }
    let depositosCreados = 0;

    const resolverDeposito = async (colName) => {
      const norm = colName.trim().toUpperCase().replace(/[\s\-()\[\]\/]/g, '');
      if (depositoMap[norm]) return depositoMap[norm];
      for (const [key, id] of Object.entries(depositoMap)) {
        if (key.includes(norm) || norm.includes(key)) return id;
      }

      // Auto-crear: buscar sucursal principal o crear una
      let [[suc]] = await conn.query(
        `SELECT id_sucursal FROM sucursales WHERE activo = 1 ORDER BY (tipo = 'PRINCIPAL') DESC LIMIT 1`
      );
      if (!suc) {
        const [[emp]] = await conn.query(`SELECT id_empresa FROM empresas LIMIT 1`);
        const idEmpresa = emp?.id_empresa ?? 1;
        const [insSuc] = await conn.query(
          `INSERT INTO sucursales (id_empresa, codigo, nombre, tipo, activo) VALUES (?,?,?,?,1)`,
          [idEmpresa, 'PRINCIPAL', 'Sucursal Principal', 'PRINCIPAL']
        );
        suc = { id_sucursal: insSuc.insertId };
      }

      const codigoDep = colName.trim().toUpperCase().replace(/\s+/g, '').slice(0, 20);
      const [insDep] = await conn.query(
        `INSERT INTO depositos (id_sucursal, codigo, nombre, tipo, activo) VALUES (?,?,?,?,1)`,
        [suc.id_sucursal, codigoDep, colName.trim(), 'PUNTO_VENTA']
      );
      const newId = insDep.insertId;
      depositoMap[norm] = newId;
      depositosCreados++;
      return newId;
    };

    const COLS_PRODUCTO_LP = new Set([
      'MARCA','PRODUCTO','DETALLE','CAP.','CARACTERISTICAS','MODELO',
      'COLOR','REAL BS.','LOG','MCM','PRECIO PUBLICO','BONO','PROVEEDOR',
      'TOTAL CAJAS','UTILIDAD',
    ]);
    const stockCols = usandoListaPrecios
      ? keys.filter(k => !COLS_PRODUCTO_LP.has(k.toUpperCase()))
      : [];
    let stockActualizados = 0;

    if (usandoListaPrecios) {
      // ── Formato lista de precios: MARCA, PRODUCTO, DETALLE, CAP., CARACTERISTICAS, MODELO, COLOR, REAL BS., LOG, MCM, PRECIO PUBLICO, BONO, ...
      for (let i = 0; i < data.length; i++) {
        const fila = i + 2;
        const r    = data[i];

        const marcaNombre     = String(r['MARCA'] || '').trim();
        const productoBase    = String(r['PRODUCTO'] || '').trim();

        // Saltar filas completamente vacías
        if (!marcaNombre && !productoBase) continue;

        const detalle         = String(r['DETALLE'] || '').trim();
        const capacidad       = String(r['CAP.'] || '').trim();
        const caracteristicas = String(r['CARACTERISTICAS'] || '').trim();
        const modelo          = String(r['MODELO'] || '').trim();
        const color           = String(r['COLOR'] || '').trim();
        const precioReal      = Number(r['REAL BS.']) || 0;
        const costoLog        = Number(r['LOG']) || 0;
        const costoMcm        = Number(r['MCM']) || (precioReal + costoLog);
        const precioPublico   = Number(r['PRECIO PUBLICO']) || 0;
        const bono            = Number(r['BONO']) || 0;
        const proveedorNombre = String(r['PROVEEDOR'] || '').trim();

        if (!marcaNombre || !productoBase) {
          errores.push({ fila, campo: 'MARCA/PRODUCTO', msg: 'Ambos campos son requeridos' });
          continue;
        }

        // codigo_interno = MODELO si está, si no genera uno
        const codigoInterno = modelo ||
          `${marcaNombre.replace(/[^A-Z0-9]/gi, '').slice(0, 5)}-${productoBase.replace(/[^A-Z0-9]/gi, '').slice(0, 4)}-${detalle.replace(/[^A-Z0-9]/gi, '').slice(0, 4)}-${i}`
            .toUpperCase();

        // Nombre del producto: PRODUCTO + " " + DETALLE
        const nombreProducto = detalle ? `${productoBase} ${detalle}` : productoBase;

        try {
          const [[marcaExiste]] = await conn.query(`SELECT id_marca FROM marcas WHERE nombre = ?`, [marcaNombre]);
          const idMarca = await resolverMarca(conn, marcaNombre);
          if (!marcaExiste) marcasCreadas++;

          // Categoría = nombre del PRODUCTO (ej: COCINA, FREIDORA, LAVADORA)
          const [[catExiste]] = await conn.query(`SELECT id_categoria FROM categorias WHERE nombre = ?`, [productoBase]);
          const idCategoria = await resolverCategoria(conn, productoBase);
          if (!catExiste) categoriasCreadas++;

          let idProveedorDefault = null;
          if (proveedorNombre) {
            const [[provExiste]] = await conn.query(`SELECT id_proveedor FROM proveedores WHERE razon_social = ?`, [proveedorNombre]);
            idProveedorDefault = await resolverProveedor(conn, proveedorNombre);
            if (!provExiste) proveedoresCreados++;
          }

          const [[existe]] = await conn.query(
            `SELECT id_producto FROM productos WHERE codigo_interno = ?`, [codigoInterno]
          );

          const campos = {
            codigo_interno:  codigoInterno,
            id_marca:        idMarca,
            id_categoria:    idCategoria,
            id_unidad:       idUnidadDefault,
            producto:        nombreProducto,
            detalle:         detalle || null,
            modelo:          modelo  || null,
            color:           color   || null,
            capacidad:       capacidad || null,
            caracteristicas: caracteristicas || null,
            id_moneda_costo: idMoneda,
            precio_real:     precioReal,
            costo_logistica: costoLog,
            costo_mcm:       costoMcm,
            precio_publico:  precioPublico,
            bono:            bono,
            precio_mayor:        0,
            stock_minimo:        0,
            stock_maximo:        0,
            id_proveedor_default: idProveedorDefault,
            estado:              'NUEVO',
            activo:              1,
          };

          let idProducto;
          if (existe) {
            idProducto = existe.id_producto;
            const { codigo_interno: _ci, ...camposUpdate } = campos;
            await conn.query(`UPDATE productos SET ? WHERE id_producto = ?`, [camposUpdate, idProducto]);
            actualizados++;
          } else {
            const [ins] = await conn.query(`INSERT INTO productos SET ?`, [campos]);
            idProducto = ins.insertId;
            creados++;
          }

          for (const col of stockCols) {
            const cantidad = Number(r[col]) || 0;
            if (cantidad <= 0) continue;
            const idDeposito = await resolverDeposito(col);
            if (!idDeposito) continue;
            await conn.query(
              `INSERT INTO stock (id_producto, id_deposito, cantidad) VALUES (?,?,?)
               ON DUPLICATE KEY UPDATE cantidad = ?`,
              [idProducto, idDeposito, cantidad, cantidad]
            );
            stockActualizados++;
          }
        } catch (e) {
          errores.push({ fila, campo: '-', msg: e.message });
        }
      }
    } else {
      // ── Formato plantilla estándar: codigo_interno, producto, marca, categoria, unidad, ...
      for (let i = 0; i < data.length; i++) {
        const fila = i + 2;
        const r    = data[i];

        // Saltar filas completamente vacías
        if (!r.codigo_interno && !r.producto) continue;

        if (!r.codigo_interno) { errores.push({ fila, campo: 'codigo_interno', msg: 'Requerido' }); continue; }
        if (!r.producto)       { errores.push({ fila, campo: 'producto',       msg: 'Requerido' }); continue; }

        try {
          const [[marca]] = await conn.query(`SELECT id_marca FROM marcas WHERE nombre = ?`, [r.marca || '']);
          const [[cat]]   = await conn.query(`SELECT id_categoria FROM categorias WHERE nombre = ?`, [r.categoria || '']);
          const [[uni]]   = await conn.query(`SELECT id_unidad FROM unidades_medida WHERE nombre = ?`, [r.unidad || '']);

          if (!marca) { errores.push({ fila, campo: 'marca',     msg: `Marca "${r.marca}" no existe` }); continue; }
          if (!cat)   { errores.push({ fila, campo: 'categoria', msg: `Categoría "${r.categoria}" no existe` }); continue; }
          if (!uni)   { errores.push({ fila, campo: 'unidad',    msg: `Unidad "${r.unidad}" no existe` }); continue; }

          const ESTADOS_VALIDOS = ['NUEVO','USADO','EXHIBICION','RECONDICIONADO','DESCONTINUADO'];
          const estado = ESTADOS_VALIDOS.includes(r.estado?.toUpperCase()) ? r.estado.toUpperCase() : 'NUEVO';

          const [[existe]] = await conn.query(
            `SELECT id_producto FROM productos WHERE codigo_interno = ?`, [r.codigo_interno]
          );

          const campos = {
            codigo_interno:  String(r.codigo_interno),
            codigo_barras:   r.codigo_barras   || null,
            id_marca:        marca.id_marca,
            id_categoria:    cat.id_categoria,
            id_unidad:       uni.id_unidad,
            producto:        String(r.producto),
            detalle:         r.detalle         || null,
            modelo:          r.modelo          || null,
            color:           r.color           || null,
            capacidad:       r.capacidad       || null,
            caracteristicas: r.caracteristicas || null,
            id_moneda_costo: idMoneda,
            precio_real:     Number(r.precio_real)     || 0,
            costo_logistica: Number(r.costo_logistica) || 0,
            costo_mcm:       Number(r.costo_mcm)       || 0,
            precio_publico:  Number(r.precio_publico)  || 0,
            bono:            Number(r.bono)            || 0,
            precio_mayor:    Number(r.precio_mayor)    || 0,
            stock_minimo:    Number(r.stock_minimo)    || 0,
            stock_maximo:    Number(r.stock_maximo)    || 0,
            estado,
            notas:           r.notas || null,
          };

          if (existe) {
            const { codigo_interno: _ci, ...camposUpdate } = campos;
            await conn.query(`UPDATE productos SET ? WHERE id_producto = ?`, [camposUpdate, existe.id_producto]);
            actualizados++;
          } else {
            await conn.query(`INSERT INTO productos SET ?`, [campos]);
            creados++;
          }
        } catch (e) {
          errores.push({ fila, campo: '-', msg: e.message });
        }
      }
    }

    res.json({
      ok: true,
      formato: usandoListaPrecios ? 'lista_precios' : 'plantilla',
      creados,
      actualizados,
      errores,
      marcasCreadas,
      categoriasCreadas,
      proveedoresCreados,
      stockActualizados,
      depositosCreados,
    });
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

exports.getCatalogoSucursales = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT id_sucursal, nombre, tipo FROM sucursales WHERE activo = 1 ORDER BY tipo DESC, nombre ASC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ mensaje: e.message });
  }
};

exports.generarCatalogoPDF = async (req, res) => {
  try {
    const { id_marca, id_categoria, id_sucursal } = req.query;

    let where = 'p.activo = 1';
    const params = [];
    if (id_marca)     { where += ' AND p.id_marca = ?';     params.push(id_marca); }
    if (id_categoria) { where += ' AND p.id_categoria = ?'; params.push(id_categoria); }

    const stockJoin = id_sucursal
      ? `LEFT JOIN stock s ON s.id_producto = p.id_producto
           AND s.id_deposito IN (SELECT id_deposito FROM depositos WHERE id_sucursal = ${db.escape(id_sucursal)})`
      : `LEFT JOIN stock s ON s.id_producto = p.id_producto`;

    const [prods] = await db.promise().query(`
      SELECT p.codigo_interno, p.codigo_barras, p.producto, p.detalle, p.modelo,
             p.color, p.capacidad, p.precio_publico, p.precio_mayor, p.bono,
             m.nombre AS marca, c.nombre AS categoria,
             COALESCE(SUM(s.cantidad), 0) AS stock_total
      FROM productos p
      LEFT JOIN marcas m     ON m.id_marca     = p.id_marca
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      ${stockJoin}
      WHERE ${where}
      GROUP BY p.id_producto
      HAVING stock_total > 0
      ORDER BY c.nombre, m.nombre, p.producto
    `, params);

    const [[emp]] = await db.promise().query(`SELECT * FROM empresas LIMIT 1`);

    let sucursalNombre = null;
    if (id_sucursal) {
      const [[suc]] = await db.promise().query(
        `SELECT nombre FROM sucursales WHERE id_sucursal = ?`, [id_sucursal]
      );
      sucursalNombre = suc?.nombre ?? null;
    }

    const doc = new PDFDoc({
      size: 'A4',
      margin: 0,
      info: { Title: 'Catálogo de Productos', Author: emp?.razon_social || 'Megaelectra' },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="catalogo.pdf"');
    doc.pipe(res);

    const PW = doc.page.width;   // 595.28
    const PH = doc.page.height;  // 841.89
    const MX = 36;
    const CW = PW - MX * 2;     // 523.28

    const logoUrl   = emp?.logo_url;
    const logoPath  = logoUrl?.startsWith('/uploads/') ? path.join(__dirname, '..', logoUrl) : null;
    const tieneLogo = logoPath && fs.existsSync(logoPath);

    const HEADER_H = 90;
    const THEAD_H  = 18;
    const ROW_H    = 15;
    const CAT_H    = 20;
    const FOOTER_Y = PH - 26;

    // Columns — widths sum to CW (523): 62+193+80+78+48+62 = 523
    const cols = [
      { label: 'Código',             w: 62,  align: 'left',  bold: false },
      { label: 'Producto / Descripción', w: 193, align: 'left',  bold: false },
      { label: 'P. Público',         w: 80,  align: 'right', bold: true  },
      { label: 'P. Mayor',           w: 78,  align: 'right', bold: true  },
      { label: 'Bono',               w: 48,  align: 'right', bold: false },
      { label: 'Stock',              w: 62,  align: 'right', bold: true  },
    ];

    const colX = [];
    let cx = MX;
    cols.forEach(c => { colX.push(cx); cx += c.w; });

    const fmtBs  = n => `Bs ${Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fechaLarga = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });

    let y = 0, pageNum = 0, isFirst = true;

    const drawPageHeader = () => {
      pageNum++;
      // Dark header band
      doc.rect(0, 0, PW, HEADER_H).fill('#0f172a');
      // Gold accent bottom stripe
      doc.rect(0, HEADER_H - 4, PW, 4).fill('#f59e0b');

      let nameX = MX;
      if (tieneLogo) {
        try {
          doc.image(logoPath, MX + 2, 14, { height: 62, fit: [68, 62] });
          nameX = MX + 78;
        } catch {}
      }

      const nameW = PW - nameX - MX - 50;

      doc.fillColor('#f59e0b').fontSize(7).font('Helvetica-Bold')
         .text('CATÁLOGO DE PRODUCTOS', nameX, 18, { width: nameW, characterSpacing: 0.6 });

      doc.fillColor('#f8fafc').fontSize(15).font('Helvetica-Bold')
         .text(emp?.nombre_comercial || emp?.razon_social || 'Megaelectra', nameX, 30, { width: nameW });

      const infoLine = sucursalNombre
        ? `Sucursal ${sucursalNombre}  ·  ${fechaLarga}`
        : fechaLarga;
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
         .text(infoLine, nameX, 52, { width: nameW });

      // Page number top-right
      doc.fillColor('#64748b').fontSize(7).font('Helvetica')
         .text(`Pág. ${pageNum}`, PW - MX - 32, 18, { width: 32, align: 'right' });
    };

    const drawTableHead = (yy) => {
      doc.rect(MX, yy, CW, THEAD_H).fill('#1e293b');
      cols.forEach((col, i) => {
        doc.fillColor('#f59e0b').fontSize(7).font('Helvetica-Bold')
           .text(col.label, colX[i] + 3, yy + 5, { width: col.w - 6, align: col.align, lineBreak: false });
      });
      return yy + THEAD_H;
    };

    const drawFooter = () => {
      doc.rect(MX, FOOTER_Y - 2, CW, 0.5).fill('#e2e8f0');
      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica')
         .text(
           `${emp?.nombre_comercial || emp?.razon_social || 'Megaelectra'}  ·  ${prods.length} productos con stock  ·  Generado ${new Date().toLocaleString('es-BO')}`,
           MX, FOOTER_Y + 4, { width: CW, align: 'center' }
         );
    };

    const newPage = () => {
      if (!isFirst) { drawFooter(); doc.addPage(); }
      isFirst = false;
      drawPageHeader();
      y = HEADER_H + 8;
      y = drawTableHead(y);
      y += 2;
    };

    newPage();

    let lastCat = null, rowIdx = 0;

    for (const p of prods) {
      // Category section divider
      if (p.categoria !== lastCat) {
        if (y + CAT_H + ROW_H > FOOTER_Y - 24) newPage();
        doc.rect(MX, y, CW, CAT_H).fill('#f59e0b');
        doc.rect(MX, y, 4, CAT_H).fill('#b45309');
        doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold')
           .text((p.categoria || 'Sin categoría').toUpperCase(), MX + 10, y + 6, { width: CW - 20, lineBreak: false });
        y += CAT_H;
        lastCat = p.categoria;
        rowIdx  = 0;
      }

      if (y + ROW_H > FOOTER_Y - 24) newPage();

      const bg = rowIdx % 2 === 0 ? '#ffffff' : '#f1f5f9';
      doc.rect(MX, y, CW, ROW_H).fill(bg);
      doc.rect(MX, y, 1.5, ROW_H).fill('#e2e8f0');

      const nombre = [p.producto, p.capacidad, p.modelo, p.color].filter(Boolean).join(' · ');

      const vals = [
        p.codigo_interno || '—',
        nombre.length > 54 ? nombre.slice(0, 54) + '…' : nombre,
        fmtBs(p.precio_publico),
        fmtBs(p.precio_mayor),
        Number(p.bono) > 0 ? fmtBs(p.bono) : '—',
        String(p.stock_total),
      ];

      cols.forEach((col, i) => {
        let color = '#334155';
        if (i === 2) color = '#0f766e'; // precio público: teal
        if (i === 3) color = '#1d4ed8'; // precio mayor: blue
        if (i === 4 && Number(p.bono) > 0) color = '#b45309'; // bono: amber
        if (i === 5) color = '#1e293b'; // stock: dark

        doc.fillColor(color)
           .fontSize(7)
           .font(col.bold ? 'Helvetica-Bold' : 'Helvetica')
           .text(vals[i], colX[i] + 3, y + 4, { width: col.w - 6, align: col.align, lineBreak: false });
      });

      y += ROW_H;
      rowIdx++;
    }

    // Summary row
    if (y + 22 < FOOTER_Y - 10) {
      y += 8;
      doc.rect(MX, y, CW, 0.5).fill('#e2e8f0');
      y += 6;
      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
         .text(
           `${prods.length} producto${prods.length !== 1 ? 's' : ''} con stock disponible`,
           MX, y, { width: CW }
         );
    }

    drawFooter();
    doc.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al generar catálogo: ' + e.message });
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
