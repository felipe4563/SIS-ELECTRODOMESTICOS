const db     = require('../config/db');
const getIp  = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, ?, ?, ?, ?)`,
    [userId, tabla, String(id), accion, ip]
  );

// ── Stock Consolidado ────────────────────────────────────────────────────────
// Con ver_todos_depositos devuelve todos los depósitos; con solo ver filtra al id_sucursal del usuario.

const getStockConsolidado = async (req, res) => {
  try {
    const verTodos   = req.ability.can('ver_todos_depositos', 'inventario');
    const idSucursal = req.user.id_sucursal;

    if (!verTodos && !idSucursal) {
      return res.status(400).json({ mensaje: 'El usuario no tiene una sucursal asignada. Contacta al administrador.' });
    }

    const [depositos] = await db.promise().query(
      `SELECT id_deposito, codigo, nombre
       FROM depositos WHERE activo = 1
       ${!verTodos ? 'AND id_sucursal = ?' : ''}
       ORDER BY nombre`,
      verTodos ? [] : [idSucursal]
    );

    const depositoIds = depositos.map(d => d.id_deposito);
    if (depositoIds.length === 0) return res.json({ depositos: [], productos: [] });

    const placeholders = depositoIds.map(() => '?').join(',');

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
                             AND s.id_deposito  IN (${placeholders})
       WHERE p.activo = 1
       ORDER BY m.nombre ASC, p.producto ASC`,
      depositoIds
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

// ── Editar stock mínimo ───────────────────────────────────────────────────────

const editarStockMinimo = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_minimo } = req.body;

    if (stock_minimo === undefined || stock_minimo === null ||
        isNaN(Number(stock_minimo)) || Number(stock_minimo) < 0) {
      return res.status(400).json({ mensaje: 'stock_minimo debe ser un número >= 0' });
    }

    const [[producto]] = await db.promise().query(
      `SELECT id_producto FROM productos WHERE id_producto = ? AND activo = 1`, [id]
    );
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

    await db.promise().query(
      `UPDATE productos SET stock_minimo = ? WHERE id_producto = ?`,
      [Number(stock_minimo), id]
    );

    await auditLog(req.user.id_usuario, 'productos', id, 'UPDATE', getIp(req));
    res.json({ ok: true, stock_minimo: Number(stock_minimo) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al actualizar stock mínimo' });
  }
};

// ── Stock por depósito específico (para formulario de transferencia) ──────────

const getStockDeposito = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().query(`
      SELECT p.id_producto, p.codigo_interno, p.producto,
             COALESCE(s.cantidad, 0)            AS cantidad,
             COALESCE(s.cantidad_reservada, 0)  AS cantidad_reservada,
             COALESCE(s.cantidad_disponible, 0) AS cantidad_disponible
      FROM productos p
      LEFT JOIN stock s ON s.id_producto = p.id_producto AND s.id_deposito = ?
      WHERE p.activo = 1
      ORDER BY p.producto ASC
    `, [id]);
    res.json({ stock: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener stock del depósito' });
  }
};

// ── Form-data para Kardex (productos + depósitos visibles por el usuario) ──────

const getKardexFormData = async (req, res) => {
  try {
    const verTodos   = req.ability.can('ver_todos_depositos', 'inventario');
    const idSucursal = req.user.id_sucursal;

    const [depositos] = await db.promise().query(
      `SELECT id_deposito, codigo, nombre
       FROM depositos WHERE activo = 1
       ${!verTodos ? 'AND id_sucursal = ?' : ''}
       ORDER BY nombre`,
      verTodos ? [] : (idSucursal ? [idSucursal] : [0])
    );

    const [productos] = await db.promise().query(
      `SELECT p.id_producto, p.codigo_interno, p.producto
       FROM productos p WHERE p.activo = 1
       ORDER BY p.producto ASC`
    );

    res.json({ productos, depositos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener datos del formulario' });
  }
};

module.exports = { getStockConsolidado, getKardex, getAlertas, atenderAlerta, editarStockMinimo, getKardexFormData, getStockDeposito };
