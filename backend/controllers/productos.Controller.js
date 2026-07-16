const db = require('../config/db');
const { randomBytes } = require('crypto');

const getIp    = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, ?, ?, ?, ?)`,
    [userId, tabla, String(id), accion, ip]
  ).catch(e => console.error('[auditLog]', accion, tabla, e.message));

// ── Helpers ───────────────────────────────────────────────────────────────

const toNum = v => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

// Registrar cambio de precio en histórico si realmente cambió
const registrarHistoricoPrecio = async (idProducto, anterior, nuevo, idUsuario) => {
  const cambioReal    = anterior.precio_real    !== nuevo.precio_real;
  const cambioPublico = anterior.precio_publico !== nuevo.precio_publico;
  if (!cambioReal && !cambioPublico) return;
  await db.promise().query(
    `INSERT INTO producto_precio_historico
       (id_producto, precio_real_ant, precio_real_nuevo, precio_pub_ant, precio_pub_nuevo, id_usuario)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idProducto,
     anterior.precio_real, nuevo.precio_real,
     anterior.precio_publico, nuevo.precio_publico,
     idUsuario]
  );
};

// Crear stock = 0 en cada depósito existente para un producto nuevo
const crearStockEnDepositos = async (idProducto) => {
  const [depositos] = await db.promise().query(
    `SELECT id_deposito FROM depositos WHERE activo = 1`
  );
  if (depositos.length === 0) return;
  const values = depositos.map(d => [idProducto, d.id_deposito]);
  await db.promise().query(
    `INSERT IGNORE INTO stock (id_producto, id_deposito, cantidad, cantidad_reservada, costo_promedio)
     VALUES ?`,
    [values.map(v => [...v, 0, 0, 0])]
  );
};

// ── Datos para formulario de creación/edición ─────────────────────────────
const getFormData = async (req, res) => {
  try {
    const [[marcas], [categorias], [unidades], [monedas], [proveedores]] = await Promise.all([
      db.promise().query(`SELECT id_marca, nombre FROM marcas WHERE activo = 1 ORDER BY nombre`),
      db.promise().query(`SELECT id_categoria, nombre FROM categorias WHERE activo = 1 ORDER BY nombre`),
      db.promise().query(`SELECT id_unidad, nombre, codigo AS simbolo FROM unidades_medida WHERE activo = 1 ORDER BY nombre`),
      db.promise().query(`SELECT id_moneda, nombre, simbolo FROM monedas WHERE activo = 1 ORDER BY nombre`),
      db.promise().query(`SELECT id_proveedor, razon_social FROM proveedores WHERE activo = 1 ORDER BY razon_social`),
    ]);
    res.json({ marcas, categorias, unidades, monedas, proveedores });
  } catch (err) {
    console.error('[getFormData productos]', err);
    res.status(500).json({ error: 'Error al obtener datos del formulario' });
  }
};

// ── Listado ───────────────────────────────────────────────────────────────

const getProductos = async (req, res) => {
  try {
    const q      = req.query.q?.trim() ?? '';
    const limit  = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
    const page   = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    const conds  = [];
    const params = [];
    if (q) {
      conds.push('(p.producto LIKE ? OR p.codigo_interno LIKE ? OR p.codigo_barras LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [rows] = await db.promise().query(
      `SELECT p.*,
              m.nombre  AS marca_nombre,
              c.nombre  AS categoria_nombre,
              u.nombre  AS unidad_nombre,
              u.codigo  AS unidad_simbolo,
              mo.simbolo AS moneda_simbolo,
              mo.nombre  AS moneda_nombre,
              pr.razon_social AS proveedor_nombre,
              COALESCE(SUM(s.cantidad), 0) AS stock_total
       FROM productos p
       JOIN marcas m         ON m.id_marca     = p.id_marca
       JOIN categorias c     ON c.id_categoria = p.id_categoria
       JOIN unidades_medida u ON u.id_unidad   = p.id_unidad
       JOIN monedas mo        ON mo.id_moneda  = p.id_moneda_costo
       LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor_default
       LEFT JOIN stock s     ON s.id_producto  = p.id_producto
       ${where}
       GROUP BY p.id_producto
       ORDER BY m.nombre ASC, p.producto ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return res.json({ productos: rows, page, limit });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener productos' });
  }
};

const getProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const [[row]] = await db.promise().query(
      `SELECT p.*,
              m.nombre  AS marca_nombre,
              c.nombre  AS categoria_nombre,
              u.nombre  AS unidad_nombre,
              u.codigo  AS unidad_simbolo,
              mo.simbolo AS moneda_simbolo,
              mo.nombre  AS moneda_nombre,
              pr.razon_social AS proveedor_nombre
       FROM productos p
       JOIN marcas m          ON m.id_marca     = p.id_marca
       JOIN categorias c      ON c.id_categoria = p.id_categoria
       JOIN unidades_medida u  ON u.id_unidad   = p.id_unidad
       JOIN monedas mo         ON mo.id_moneda  = p.id_moneda_costo
       LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor_default
       WHERE p.id_producto = ?`, [id]
    );
    if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
    return res.json({ producto: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener producto' });
  }
};

const createProducto = async (req, res) => {
  try {
    const {
      codigo_barras,
      id_marca, id_categoria, id_unidad, id_moneda_costo,
      producto, detalle, capacidad, caracteristicas, modelo, color,
      precio_real, costo_logistica = 0, costo_mcm = 0, precio_publico,
      bono = 0, precio_mayor = 0,
      id_proveedor_default, stock_minimo = 0, stock_maximo = 0,
      imagen_url, notas,
    } = req.body;

    if (!id_marca || !id_categoria || !id_unidad || !id_moneda_costo)
      return res.status(400).json({ error: 'Marca, categoría, unidad y moneda son requeridos' });
    if (!producto) return res.status(400).json({ error: 'El nombre del producto es requerido' });

    const [result] = await db.promise().query(
      `INSERT INTO productos
         (codigo_interno, codigo_barras, id_marca, id_categoria, id_unidad, id_moneda_costo,
          producto, detalle, capacidad, caracteristicas, modelo, color,
          precio_real, costo_logistica, costo_mcm, precio_publico,
          bono, precio_mayor, id_proveedor_default,
          stock_minimo, stock_maximo, imagen_url, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomBytes(10).toString('hex'), codigo_barras || null,
        id_marca, id_categoria, id_unidad, id_moneda_costo,
        producto, detalle || null, capacidad || null, caracteristicas || null, modelo || null, color || null,
        toNum(precio_real), toNum(costo_logistica), toNum(costo_mcm), toNum(precio_publico),
        toNum(bono), toNum(precio_mayor),
        id_proveedor_default || null,
        toNum(stock_minimo), toNum(stock_maximo),
        imagen_url || null, notas || null,
      ]
    );

    const idProducto = result.insertId;
    const codigo_interno = `PROD-${String(idProducto).padStart(5, '0')}`;
    await db.promise().query(`UPDATE productos SET codigo_interno = ? WHERE id_producto = ?`, [codigo_interno, idProducto]);
    await crearStockEnDepositos(idProducto);
    await auditLog(req.user.id_usuario, 'productos', idProducto, 'CREATE', getIp(req));

    const [[created]] = await db.promise().query(
      `SELECT p.*, m.nombre AS marca_nombre, c.nombre AS categoria_nombre
       FROM productos p
       JOIN marcas m     ON m.id_marca     = p.id_marca
       JOIN categorias c ON c.id_categoria = p.id_categoria
       WHERE p.id_producto = ?`, [idProducto]
    );
    return res.status(201).json({ producto: created });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código interno o código de barras ya existe' });
    console.error(err);
    return res.status(500).json({ error: 'Error al crear producto' });
  }
};

const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const [[anterior]] = await db.promise().query(
      `SELECT precio_real, precio_publico FROM productos WHERE id_producto = ?`, [id]
    );
    if (!anterior) return res.status(404).json({ error: 'Producto no encontrado' });

    const {
      codigo_interno, codigo_barras,
      id_marca, id_categoria, id_unidad, id_moneda_costo,
      producto, detalle, capacidad, caracteristicas, modelo, color,
      precio_real, costo_logistica = 0, costo_mcm = 0, precio_publico,
      bono = 0, precio_mayor = 0,
      id_proveedor_default, stock_minimo = 0, stock_maximo = 0,
      imagen_url, notas, activo,
    } = req.body;

    const nuevoPrecioReal    = toNum(precio_real);
    const nuevoPrecioPublico = toNum(precio_publico);

    await db.promise().query(
      `UPDATE productos SET
         codigo_interno = ?, codigo_barras = ?,
         id_marca = ?, id_categoria = ?, id_unidad = ?, id_moneda_costo = ?,
         producto = ?, detalle = ?, capacidad = ?, caracteristicas = ?, modelo = ?, color = ?,
         precio_real = ?, costo_logistica = ?, costo_mcm = ?, precio_publico = ?,
         bono = ?, precio_mayor = ?,
         id_proveedor_default = ?,
         stock_minimo = ?, stock_maximo = ?,
         imagen_url = ?, notas = ?, activo = ?
       WHERE id_producto = ?`,
      [
        codigo_interno?.toUpperCase(), codigo_barras || null,
        id_marca, id_categoria, id_unidad, id_moneda_costo,
        producto, detalle || null, capacidad || null, caracteristicas || null, modelo || null, color || null,
        nuevoPrecioReal, toNum(costo_logistica), toNum(costo_mcm), nuevoPrecioPublico,
        toNum(bono), toNum(precio_mayor),
        id_proveedor_default || null,
        toNum(stock_minimo), toNum(stock_maximo),
        imagen_url || null, notas || null, activo ? 1 : 0,
        id,
      ]
    );

    await registrarHistoricoPrecio(
      id,
      { precio_real: toNum(anterior.precio_real), precio_publico: toNum(anterior.precio_publico) },
      { precio_real: nuevoPrecioReal, precio_publico: nuevoPrecioPublico },
      req.user.id_usuario
    );

    await auditLog(req.user.id_usuario, 'productos', id, 'UPDATE', getIp(req));
    const [[updated]] = await db.promise().query(
      `SELECT p.*, m.nombre AS marca_nombre, c.nombre AS categoria_nombre
       FROM productos p
       JOIN marcas m     ON m.id_marca     = p.id_marca
       JOIN categorias c ON c.id_categoria = p.id_categoria
       WHERE p.id_producto = ?`, [id]
    );
    return res.json({ producto: updated });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código interno o código de barras ya existe' });
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;

    // Protección: no desactivar si tiene movimientos de stock
    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM stock WHERE id_producto = ? AND (cantidad > 0 OR cantidad_reservada > 0)`, [id]
    ).catch(() => [[{ total: 0 }]]);

    if (total > 0)
      return res.status(409).json({ error: 'No se puede desactivar: el producto tiene stock registrado' });

    await db.promise().query(`UPDATE productos SET activo = 0 WHERE id_producto = ?`, [id]);
    await auditLog(req.user.id_usuario, 'productos', id, 'DELETE', getIp(req));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al desactivar producto' });
  }
};

// ── Imagen de producto ────────────────────────────────────────────────────

const uploadImagen = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    const imagenUrl = `/uploads/productos/${req.file.filename}`;
    await db.promise().query(`UPDATE productos SET imagen_url = ? WHERE id_producto = ?`, [imagenUrl, id]);
    await auditLog(req.user.id_usuario, 'productos', id, 'UPDATE', getIp(req));

    return res.json({ imagen_url: imagenUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al subir imagen' });
  }
};

// ── Histórico de precios ──────────────────────────────────────────────────

const getHistoricoPrecios = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().query(
      `SELECT h.*, u.nombres, u.apellidos
       FROM producto_precio_historico h
       LEFT JOIN usuarios u ON u.id_usuario = h.id_usuario
       WHERE h.id_producto = ?
       ORDER BY h.fecha DESC
       LIMIT 100`, [id]
    );
    return res.json({ historico: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener histórico' });
  }
};

// ── Stock por depósito ────────────────────────────────────────────────────

const getStock = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().query(
      `SELECT s.*, d.nombre AS deposito_nombre, d.codigo AS deposito_codigo
       FROM stock s
       JOIN depositos d ON d.id_deposito = s.id_deposito
       WHERE s.id_producto = ?
       ORDER BY d.nombre ASC`, [id]
    );
    return res.json({ stock: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener stock' });
  }
};

// ── Importación masiva desde Excel ────────────────────────────────────────

module.exports = {
  getFormData,
  getProductos, getProducto, createProducto, updateProducto, deleteProducto,
  getHistoricoPrecios, getStock,
  uploadImagen,
};
