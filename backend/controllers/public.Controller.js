const db = require('../config/db');

exports.getProductoPorCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;

    // 1. Producto principal
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

    // 2. Logo y nombre de la empresa
    const [[empresa]] = await db.promise().query(
      `SELECT logo_url, COALESCE(nombre_comercial, razon_social) AS nombre
       FROM empresas WHERE activo = 1 LIMIT 1`
    ).catch(() => [[null]]);

    // 3. Promociones activas que aplican a este producto
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

    // 4. Combos activos que contienen este producto
    const [combos] = await db.promise().query(
      `SELECT c.nombre, c.descripcion, c.precio_combo, c.imagen_url
       FROM combos c
       JOIN combo_detalle cd ON cd.id_combo = c.id_combo AND cd.id_producto = ?
       WHERE c.activo = 1
         AND (c.fecha_inicio IS NULL OR c.fecha_inicio <= CURDATE())
         AND (c.fecha_fin    IS NULL OR c.fecha_fin    >= CURDATE())`,
      [producto.id_producto]
    ).catch(() => [[]]);

    const stockTotal = Number(producto.stock_total);
    let disponibilidad;
    if (stockTotal > 5)      disponibilidad = 'Disponible';
    else if (stockTotal > 0) disponibilidad = 'Stock limitado';
    else                     disponibilidad = 'Sin stock';

    const { id_producto, id_categoria, id_marca, stock_total, ...datos } = producto;
    res.json({
      ...datos,
      disponibilidad,
      empresa: empresa ? { logo_url: empresa.logo_url, nombre: empresa.nombre } : null,
      promociones,
      combos,
    });
  } catch (err) {
    console.error('[public] Error al obtener producto:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
