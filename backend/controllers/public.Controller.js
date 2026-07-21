const db = require('../config/db');

/* ─── Producto por código interno ─────────────────────────────── */
exports.getProductoPorCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;

    const [[producto]] = await db.promise().query(
      `SELECT p.id_producto, p.id_categoria, p.id_marca,
              p.codigo_interno, p.producto, p.imagen_url, p.modelo, p.color,
              p.capacidad, p.caracteristicas, p.detalle, p.precio_publico,
              m.nombre AS marca, c.nombre AS categoria,
              COALESCE(SUM(s.cantidad), 0) AS stock_total
       FROM productos p
       LEFT JOIN marcas     m ON m.id_marca     = p.id_marca
       LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
       LEFT JOIN stock      s ON s.id_producto  = p.id_producto
       WHERE p.codigo_interno = ? AND p.activo = 1
       GROUP BY p.id_producto`,
      [codigo]
    );

    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    const [[empresa]] = await db.promise().query(
      `SELECT logo_url, razon_social, nombre_comercial,
              COALESCE(nombre_comercial, razon_social) AS nombre,
              nit, direccion, telefono, email
       FROM empresas WHERE activo = 1 LIMIT 1`
    ).catch(() => [[null]]);

    const [promociones] = await db.promise().query(
      `SELECT pr.nombre, pr.descripcion, pr.tipo_descuento, pr.valor_descuento, pr.cantidad_minima
       FROM promociones pr
       WHERE pr.activo = 1
         AND pr.fecha_inicio <= CURDATE()
         AND pr.fecha_fin    >= CURDATE()
         AND (
           pr.aplica_a = 'TODOS'
           OR (pr.aplica_a = 'PRODUCTO'  AND EXISTS (
                 SELECT 1 FROM promocion_producto pp
                 WHERE pp.id_promocion = pr.id_promocion AND pp.id_producto = ?))
           OR (pr.aplica_a = 'CATEGORIA' AND EXISTS (
                 SELECT 1 FROM promocion_producto pp
                 WHERE pp.id_promocion = pr.id_promocion AND pp.id_categoria = ?))
           OR (pr.aplica_a = 'MARCA'     AND EXISTS (
                 SELECT 1 FROM promocion_producto pp
                 WHERE pp.id_promocion = pr.id_promocion AND pp.id_marca = ?))
         )`,
      [producto.id_producto, producto.id_categoria, producto.id_marca]
    ).catch(() => [[]]);

    const [combosRaw] = await db.promise().query(
      `SELECT c.id_combo, c.nombre, c.descripcion, c.precio_combo, c.imagen_url
       FROM combos c
       JOIN combo_detalle cd ON cd.id_combo = c.id_combo AND cd.id_producto = ?
       WHERE c.activo = 1
         AND (c.fecha_inicio IS NULL OR c.fecha_inicio <= CURDATE())
         AND (c.fecha_fin    IS NULL OR c.fecha_fin    >= CURDATE())`,
      [producto.id_producto]
    ).catch(() => [[]]);

    let combos = combosRaw;
    if (combosRaw.length > 0) {
      const comboIds = combosRaw.map(c => c.id_combo);
      const [detalle] = await db.promise().query(
        `SELECT cd.id_combo, p.producto, p.imagen_url AS producto_imagen, cd.cantidad
         FROM combo_detalle cd
         JOIN productos p ON p.id_producto = cd.id_producto
         WHERE cd.id_combo IN (?)`,
        [comboIds]
      ).catch(() => [[]]);

      const detalleMap = {};
      for (const row of detalle) {
        if (!detalleMap[row.id_combo]) detalleMap[row.id_combo] = [];
        detalleMap[row.id_combo].push({
          producto: row.producto,
          imagen_url: row.producto_imagen,
          cantidad: row.cantidad,
        });
      }
      combos = combosRaw.map(({ id_combo, ...rest }) => ({
        ...rest,
        productos: detalleMap[id_combo] ?? [],
      }));
    }

    const stockTotal = Number(producto.stock_total);
    let disponibilidad;
    if (stockTotal > 5)      disponibilidad = 'Disponible';
    else if (stockTotal > 0) disponibilidad = 'Stock limitado';
    else                     disponibilidad = 'Sin stock';

    const [imagenes] = await db.promise().query(
      `SELECT imagen_url, es_principal
       FROM producto_imagenes
       WHERE id_producto = ?
       ORDER BY es_principal DESC, orden ASC, id_imagen ASC`,
      [producto.id_producto]
    ).catch(() => [[]]);

    const { id_producto, id_categoria, id_marca, stock_total, ...datos } = producto;
    res.json({
      ...datos,
      disponibilidad,
      imagenes,
      empresa: empresa ? {
        logo_url:         empresa.logo_url,
        nombre:           empresa.nombre,
        razon_social:     empresa.razon_social,
        nombre_comercial: empresa.nombre_comercial,
        nit:              empresa.nit,
        direccion:        empresa.direccion,
        telefono:         empresa.telefono,
        email:            empresa.email,
      } : null,
      promociones,
      combos,
    });
  } catch (err) {
    console.error('[public] Error al obtener producto:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ─── Lista pública de productos ──────────────────────────────── */
exports.getProductos = async (req, res) => {
  try {
    const {
      page = 1, limit = 12,
      categoria, marca, color, buscar,
      orden = 'nombre',
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    const where  = ['p.activo = 1', 'p.precio_publico > 0'];

    if (categoria) { where.push('p.id_categoria = ?'); params.push(Number(categoria)); }
    if (marca)     { where.push('m.nombre = ?');       params.push(marca);             }
    if (color)     { where.push('p.color = ?');        params.push(color);             }
    if (buscar)    { where.push('(p.producto LIKE ? OR p.modelo LIKE ? OR p.codigo_interno LIKE ?)');
                     const q = `%${buscar}%`; params.push(q, q, q); }

    const orderMap = {
      nombre:      'p.producto ASC',
      precio_asc:  'p.precio_publico ASC',
      precio_desc: 'p.precio_publico DESC',
      nuevo:       'p.id_producto DESC',
    };
    const orderBy = orderMap[orden] ?? 'p.producto ASC';
    const whereSQL = where.join(' AND ');

    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM productos p
       LEFT JOIN marcas m ON m.id_marca = p.id_marca
       WHERE ${whereSQL}`, params
    );

    const [productos] = await db.promise().query(
      `SELECT p.id_producto, p.codigo_interno, p.producto, p.imagen_url,
              p.modelo, p.color, p.capacidad, p.precio_publico,
              m.nombre AS marca, c.nombre AS categoria,
              COALESCE(SUM(s.cantidad), 0) AS stock_total
       FROM productos p
       LEFT JOIN marcas     m ON m.id_marca     = p.id_marca
       LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
       LEFT JOIN stock      s ON s.id_producto  = p.id_producto
       WHERE ${whereSQL}
       GROUP BY p.id_producto
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({
      productos: productos.map(p => ({
        ...p,
        stock_total: Number(p.stock_total),
        disponible:  Number(p.stock_total) > 0,
      })),
      paginacion: {
        total:   Number(total),
        pagina:  Number(page),
        limite:  Number(limit),
        paginas: Math.ceil(Number(total) / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[public] Error al listar productos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ─── Categorías públicas ─────────────────────────────────────── */
exports.getCategorias = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT c.id_categoria, c.nombre,
              COUNT(p.id_producto) AS total_productos
       FROM categorias c
       LEFT JOIN productos p ON p.id_categoria = c.id_categoria AND p.activo = 1 AND p.precio_publico > 0
       WHERE c.activo = 1
       GROUP BY c.id_categoria
       ORDER BY c.nombre ASC`
    );
    res.json({ categorias: rows });
  } catch (err) {
    console.error('[public] Error al obtener categorías:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ─── Marcas públicas ─────────────────────────────────────────── */
exports.getMarcas = async (req, res) => {
  try {
    const { categoria } = req.query;
    const params = [];
    let join = '';
    let extraWhere = '';

    if (categoria) {
      join      = 'JOIN productos p ON p.id_marca = m.id_marca AND p.activo = 1 AND p.precio_publico > 0';
      extraWhere = 'AND p.id_categoria = ?';
      params.push(Number(categoria));
    }

    const [rows] = await db.promise().query(
      `SELECT DISTINCT m.id_marca, m.nombre, m.logo_url
       FROM marcas m
       ${join}
       WHERE m.activo = 1 ${extraWhere}
       ORDER BY m.nombre ASC`,
      params
    );
    res.json({ marcas: rows });
  } catch (err) {
    console.error('[public] Error al obtener marcas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ─── Promociones activas ─────────────────────────────────────── */
exports.getPromociones = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT id_promocion, nombre, descripcion, tipo_descuento,
              valor_descuento, aplica_a, fecha_inicio, fecha_fin
       FROM promociones
       WHERE activo = 1
         AND fecha_inicio <= CURDATE()
         AND fecha_fin    >= CURDATE()
       ORDER BY fecha_fin ASC`
    );
    res.json({ promociones: rows });
  } catch (err) {
    console.error('[public] Error al obtener promociones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ─── Combos activos ──────────────────────────────────────────── */
exports.getCombos = async (req, res) => {
  try {
    const [combosRaw] = await db.promise().query(
      `SELECT id_combo, nombre, descripcion, precio_combo, imagen_url, fecha_fin
       FROM combos
       WHERE activo = 1
         AND (fecha_inicio IS NULL OR fecha_inicio <= CURDATE())
         AND (fecha_fin    IS NULL OR fecha_fin    >= CURDATE())
       ORDER BY fecha_fin ASC`
    );

    if (combosRaw.length === 0) return res.json({ combos: [] });

    const comboIds = combosRaw.map(c => c.id_combo);
    const [detalle] = await db.promise().query(
      `SELECT cd.id_combo, p.producto, p.imagen_url AS producto_imagen,
              p.precio_publico, cd.cantidad
       FROM combo_detalle cd
       JOIN productos p ON p.id_producto = cd.id_producto
       WHERE cd.id_combo IN (?)`,
      [comboIds]
    );

    const detalleMap = {};
    for (const row of detalle) {
      if (!detalleMap[row.id_combo]) detalleMap[row.id_combo] = [];
      detalleMap[row.id_combo].push({
        producto:      row.producto,
        imagen_url:    row.producto_imagen,
        precio_publico: Number(row.precio_publico),
        cantidad:      row.cantidad,
      });
    }

    const combos = combosRaw.map(({ id_combo, ...rest }) => ({
      ...rest,
      precio_combo: Number(rest.precio_combo),
      productos: detalleMap[id_combo] ?? [],
    }));

    res.json({ combos });
  } catch (err) {
    console.error('[public] Error al obtener combos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ─── Colores disponibles ─────────────────────────────────────── */
exports.getColores = async (req, res) => {
  try {
    const { categoria } = req.query;
    const where = ["p.activo = 1", "p.precio_publico > 0", "p.color IS NOT NULL", "p.color != ''"];
    const params = [];
    if (categoria) { where.push('p.id_categoria = ?'); params.push(Number(categoria)); }
    const [rows] = await db.promise().query(
      `SELECT DISTINCT p.color FROM productos p WHERE ${where.join(' AND ')} ORDER BY p.color ASC`,
      params
    );
    res.json({ colores: rows.map(r => r.color) });
  } catch (err) {
    console.error('[public] Error al obtener colores:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ─── Empresa pública ─────────────────────────────────────────── */
exports.getEmpresa = async (req, res) => {
  try {
    const [[empresa]] = await db.promise().query(
      `SELECT razon_social, nombre_comercial, nit, direccion, telefono, email, logo_url
       FROM empresas WHERE activo = 1 LIMIT 1`
    );
    if (!empresa) return res.status(404).json({ error: 'No encontrado' });
    res.json(empresa);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
};
