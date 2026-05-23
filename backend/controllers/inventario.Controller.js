const db     = require('../config/db');
const getIp  = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, ?, ?, ?, ?)`,
    [userId, tabla, String(id), accion, ip]
  );

// ── Stock Consolidado ────────────────────────────────────────────────────────
// Devuelve { depositos, productos } donde cada producto tiene un map
// stock[id_deposito] = { cantidad, cantidad_reservada, cantidad_disponible, costo_promedio }

const getStockConsolidado = async (req, res) => {
  try {
    const [depositos] = await db.promise().query(
      `SELECT id_deposito, codigo, nombre
       FROM depositos WHERE activo = 1
       ORDER BY nombre`
    );

    const [rows] = await db.promise().query(
      `SELECT
         p.id_producto, p.codigo_interno, p.codigo_barras,
         p.producto, p.detalle, p.stock_minimo, p.activo,
         m.nombre  AS marca_nombre,
         c.nombre  AS categoria_nombre,
         u.nombre  AS unidad_nombre,
         u.codigo  AS unidad_codigo,
         s.id_deposito,
         COALESCE(s.cantidad, 0)             AS cantidad,
         COALESCE(s.cantidad_reservada, 0)   AS cantidad_reservada,
         COALESCE(s.cantidad_disponible, 0)  AS cantidad_disponible,
         COALESCE(s.costo_promedio, 0)       AS costo_promedio
       FROM productos p
       JOIN marcas m          ON m.id_marca     = p.id_marca
       JOIN categorias c      ON c.id_categoria = p.id_categoria
       JOIN unidades_medida u ON u.id_unidad    = p.id_unidad
       LEFT JOIN stock s      ON s.id_producto  = p.id_producto
       WHERE p.activo = 1
       ORDER BY m.nombre ASC, p.producto ASC`
    );

    // Pivotar filas por producto
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.id_producto)) {
        map.set(r.id_producto, {
          id_producto:      r.id_producto,
          codigo_interno:   r.codigo_interno,
          codigo_barras:    r.codigo_barras,
          producto:         r.producto,
          detalle:          r.detalle,
          stock_minimo:     r.stock_minimo,
          activo:           r.activo,
          marca_nombre:     r.marca_nombre,
          categoria_nombre: r.categoria_nombre,
          unidad_nombre:    r.unidad_nombre,
          unidad_codigo:    r.unidad_codigo,
          stock: {},
        });
      }
      if (r.id_deposito !== null) {
        map.get(r.id_producto).stock[r.id_deposito] = {
          cantidad:            r.cantidad,
          cantidad_reservada:  r.cantidad_reservada,
          cantidad_disponible: r.cantidad_disponible,
          costo_promedio:      r.costo_promedio,
        };
      }
    }

    res.json({ depositos, productos: [...map.values()] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener stock consolidado' });
  }
};

// ── Kardex ────────────────────────────────────────────────────────────────────
// Query params: id_producto, id_deposito, fecha_desde, fecha_hasta, documento_tipo

const getKardex = async (req, res) => {
  try {
    const { id_producto, id_deposito, fecha_desde, fecha_hasta, documento_tipo } = req.query;

    const where  = [];
    const params = [];

    if (id_producto)   { where.push('k.id_producto = ?');     params.push(id_producto); }
    if (id_deposito)   { where.push('k.id_deposito = ?');     params.push(id_deposito); }
    if (fecha_desde)   { where.push('k.fecha >= ?');          params.push(fecha_desde); }
    if (fecha_hasta)   { where.push('k.fecha <= ?');          params.push(fecha_hasta + ' 23:59:59'); }
    if (documento_tipo){ where.push('k.documento_tipo = ?');  params.push(documento_tipo); }

    const sql = `
      SELECT
        k.id_kardex, k.fecha,
        k.cantidad, k.costo_unitario, k.saldo_cantidad, k.saldo_costo,
        k.documento_tipo, k.documento_id, k.documento_numero, k.observaciones,
        p.id_producto, p.codigo_interno, p.producto AS producto_nombre,
        d.id_deposito, d.codigo AS deposito_codigo, d.nombre AS deposito_nombre,
        tm.nombre AS tipo_movimiento, tm.efecto,
        u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos
      FROM kardex k
      JOIN productos p         ON p.id_producto         = k.id_producto
      JOIN depositos d         ON d.id_deposito         = k.id_deposito
      JOIN tipos_movimiento tm ON tm.id_tipo_movimiento = k.id_tipo_movimiento
      LEFT JOIN usuarios u     ON u.id_usuario          = k.id_usuario
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY k.fecha DESC
      LIMIT 500`;

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener kardex' });
  }
};

// ── Alertas de stock mínimo ──────────────────────────────────────────────────
// Query params: atendida (0 | 1 | '' = todas)

const getAlertas = async (req, res) => {
  try {
    const { atendida } = req.query;
    const where  = [];
    const params = [];

    if (atendida !== undefined && atendida !== '') {
      where.push('a.atendida = ?');
      params.push(atendida === '1' || atendida === 'true' ? 1 : 0);
    }

    const sql = `
      SELECT
        a.id_alerta, a.cantidad_actual, a.stock_minimo,
        a.fecha_generada, a.atendida, a.fecha_atendida,
        p.id_producto, p.codigo_interno, p.producto AS producto_nombre,
        m.nombre AS marca_nombre,
        d.id_deposito, d.codigo AS deposito_codigo, d.nombre AS deposito_nombre,
        ua.nombres AS atendido_por_nombres, ua.apellidos AS atendido_por_apellidos
      FROM alertas_stock a
      JOIN productos p      ON p.id_producto = a.id_producto
      JOIN marcas m         ON m.id_marca    = p.id_marca
      JOIN depositos d      ON d.id_deposito = a.id_deposito
      LEFT JOIN usuarios ua ON ua.id_usuario = a.id_usuario_atendio
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY a.atendida ASC, a.fecha_generada DESC`;

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener alertas' });
  }
};

// ── Atender alerta ────────────────────────────────────────────────────────────

const atenderAlerta = async (req, res) => {
  try {
    const { id } = req.params;
    const userId  = req.user.id_usuario;

    const [[alerta]] = await db.promise().query(
      `SELECT * FROM alertas_stock WHERE id_alerta = ?`, [id]
    );
    if (!alerta)          return res.status(404).json({ mensaje: 'Alerta no encontrada' });
    if (alerta.atendida)  return res.status(400).json({ mensaje: 'La alerta ya fue atendida' });

    await db.promise().query(
      `UPDATE alertas_stock
       SET atendida = 1, fecha_atendida = NOW(), id_usuario_atendio = ?
       WHERE id_alerta = ?`,
      [userId, id]
    );

    await auditLog(userId, 'alertas_stock', id, 'UPDATE', getIp(req));
    res.json({ ok: true, mensaje: 'Alerta marcada como atendida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al atender alerta' });
  }
};

module.exports = { getStockConsolidado, getKardex, getAlertas, atenderAlerta };
