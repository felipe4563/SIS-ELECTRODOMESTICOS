const db     = require('../config/db');
const getIp  = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?, ?, ?, ?, ?)`,
    [userId, tabla, String(id), accion, ip]
  ).catch(e => console.error('[auditLog]', accion, tabla, e.message));

// ── Stock Consolidado ────────────────────────────────────────────────────────
// Con ver_todos_depositos devuelve todos los depósitos; con solo ver filtra al id_sucursal del usuario.

const RESUMEN_VACIO = { total: 0, unidades: 0, sinStock: 0, bajoMin: 0, ok: 0 };
const FACETAS_VACIAS = { marcas: [], productos: [], modelos: [], colores: [], capacidades: [] };

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
    if (depositoIds.length === 0) {
      return res.json({
        depositos: [], productos: [], total: 0, page: 1, limit: 20,
        resumen: { ...RESUMEN_VACIO }, facetas: { ...FACETAS_VACIAS },
      });
    }

    const {
      busqueda, marca, producto, modelo, color, capacidad, estado, depositos: depositosParam,
      page = 1, limit = 20,
    } = req.query;

    const safeLimit = Math.min(Number(limit) || 20, 200);
    const safePage  = Math.max(Number(page) || 1, 1);
    const offset    = (safePage - 1) * safeLimit;

    // ── Depósitos "visibles" para totales/resumen: intersección del param con los permitidos ──
    let depositosVisiblesIds = depositoIds;
    if (depositosParam !== undefined) {
      const solicitados = String(depositosParam)
        .split(',')
        .map(s => Number(s.trim()))
        .filter(n => !isNaN(n));
      depositosVisiblesIds = depositoIds.filter(id => solicitados.includes(id));
    }

    // ── Filtro base (sin estado) ──
    const filtrosBaseArr  = ['p.activo = 1'];
    const paramsBase       = [];

    if (busqueda) {
      filtrosBaseArr.push('(p.producto LIKE ? OR p.codigo_interno LIKE ? OR p.codigo_barras LIKE ? OR m.nombre LIKE ? OR p.modelo LIKE ?)');
      const q = `%${busqueda}%`;
      paramsBase.push(q, q, q, q, q);
    }
    if (marca)     { filtrosBaseArr.push('m.nombre = ?');   paramsBase.push(marca); }
    if (producto)  { filtrosBaseArr.push('p.producto = ?'); paramsBase.push(producto); }
    if (modelo)    { filtrosBaseArr.push('p.modelo = ?');   paramsBase.push(modelo); }
    if (color)     { filtrosBaseArr.push('p.color = ?');    paramsBase.push(color); }
    if (capacidad) { filtrosBaseArr.push('p.capacidad = ?');paramsBase.push(capacidad); }

    const filtrosBase = filtrosBaseArr.join(' AND ');

    const totalDispExpr = depositosVisiblesIds.length
      ? `COALESCE((SELECT SUM(s2.cantidad_disponible) FROM stock s2 WHERE s2.id_producto = p.id_producto AND s2.id_deposito IN (${depositosVisiblesIds.map(() => '?').join(',')})), 0)`
      : `0`;
    const totalDispParams = depositosVisiblesIds.length ? depositosVisiblesIds : [];

    const derivedSql = `
      SELECT p.id_producto, p.codigo_interno, p.codigo_barras, p.producto, p.detalle, p.modelo, p.color, p.capacidad,
             p.stock_minimo, p.activo, m.nombre AS marca_nombre, c.nombre AS categoria_nombre,
             u.nombre AS unidad_nombre, u.codigo AS unidad_codigo,
             ${totalDispExpr} AS total_disp
      FROM productos p
      JOIN marcas m ON m.id_marca = p.id_marca
      JOIN categorias c ON c.id_categoria = p.id_categoria
      JOIN unidades_medida u ON u.id_unidad = p.id_unidad
      WHERE ${filtrosBase}
    `;
    const derivedParams = [...paramsBase, ...totalDispParams];

    const estadoWhereArr = [];
    if (estado === 'sin')  estadoWhereArr.push('x.total_disp = 0');
    if (estado === 'bajo') estadoWhereArr.push('x.total_disp > 0 AND x.total_disp <= x.stock_minimo');
    if (estado === 'ok')   estadoWhereArr.push('x.total_disp > x.stock_minimo');
    const estadoWhereSql = estadoWhereArr.length ? `WHERE ${estadoWhereArr.join(' AND ')}` : '';

    // ── 1) Count ──
    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM (${derivedSql}) x ${estadoWhereSql}`,
      [...derivedParams]
    );

    // ── 2) Resumen (sin filtro de estado) ──
    const [[resumenRow]] = await db.promise().query(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(t.total_disp), 0) AS unidades,
         SUM(CASE WHEN t.total_disp = 0 THEN 1 ELSE 0 END) AS sinStock,
         SUM(CASE WHEN t.total_disp > 0 AND t.total_disp <= t.stock_minimo THEN 1 ELSE 0 END) AS bajoMin,
         SUM(CASE WHEN t.total_disp > t.stock_minimo THEN 1 ELSE 0 END) AS ok
       FROM (${derivedSql}) t`,
      [...derivedParams]
    );

    // ── 3) Página ──
    const [pageRows] = await db.promise().query(
      `SELECT * FROM (${derivedSql}) x ${estadoWhereSql}
       ORDER BY x.marca_nombre ASC, x.producto ASC
       LIMIT ? OFFSET ?`,
      [...derivedParams, safeLimit, offset]
    );

    // ── Pivot de stock, solo para los productos de esta página ──
    const productos = pageRows.map(r => ({
      id_producto:      r.id_producto,
      codigo_interno:   r.codigo_interno,
      codigo_barras:    r.codigo_barras,
      producto:         r.producto,
      detalle:          r.detalle,
      modelo:           r.modelo,
      color:            r.color,
      capacidad:        r.capacidad,
      stock_minimo:     r.stock_minimo,
      activo:           r.activo,
      marca_nombre:     r.marca_nombre,
      categoria_nombre: r.categoria_nombre,
      unidad_nombre:    r.unidad_nombre,
      unidad_codigo:    r.unidad_codigo,
      stock: {},
    }));

    if (productos.length > 0) {
      const pageProductIds = productos.map(p => p.id_producto);
      const [stockRows] = await db.promise().query(
        `SELECT id_producto, id_deposito,
                COALESCE(cantidad, 0)            AS cantidad,
                COALESCE(cantidad_reservada, 0)  AS cantidad_reservada,
                COALESCE(cantidad_disponible, 0) AS cantidad_disponible,
                COALESCE(costo_promedio, 0)      AS costo_promedio
         FROM stock
         WHERE id_producto IN (${pageProductIds.map(() => '?').join(',')})
           AND id_deposito IN (${depositoIds.map(() => '?').join(',')})`,
        [...pageProductIds, ...depositoIds]
      );

      const porProducto = new Map(productos.map(p => [p.id_producto, p]));
      for (const r of stockRows) {
        const p = porProducto.get(r.id_producto);
        if (!p) continue;
        p.stock[r.id_deposito] = {
          cantidad:            r.cantidad,
          cantidad_reservada:  r.cantidad_reservada,
          cantidad_disponible: r.cantidad_disponible,
          costo_promedio:      r.costo_promedio,
        };
      }
    }

    // ── Facetas (independientes de busqueda/estado/depositos) ──
    const [[marcasRows], [productosRows], [modelosRows], [coloresRows], [capacidadesRows]] = await Promise.all([
      db.promise().query(
        `SELECT DISTINCT m.nombre FROM productos p JOIN marcas m ON m.id_marca = p.id_marca WHERE p.activo = 1 ORDER BY m.nombre`
      ),
      db.promise().query(
        `SELECT DISTINCT p.producto FROM productos p JOIN marcas m ON m.id_marca = p.id_marca
         WHERE p.activo = 1 ${marca ? 'AND m.nombre = ?' : ''} AND p.producto IS NOT NULL AND p.producto <> ''
         ORDER BY p.producto`,
        marca ? [marca] : []
      ),
      db.promise().query(
        `SELECT DISTINCT p.modelo FROM productos p JOIN marcas m ON m.id_marca = p.id_marca
         WHERE p.activo = 1 ${marca ? 'AND m.nombre = ?' : ''} ${producto ? 'AND p.producto = ?' : ''}
           AND p.modelo IS NOT NULL AND p.modelo <> ''
         ORDER BY p.modelo`,
        [...(marca ? [marca] : []), ...(producto ? [producto] : [])]
      ),
      db.promise().query(
        `SELECT DISTINCT p.color FROM productos p JOIN marcas m ON m.id_marca = p.id_marca
         WHERE p.activo = 1 ${marca ? 'AND m.nombre = ?' : ''} ${producto ? 'AND p.producto = ?' : ''} ${modelo ? 'AND p.modelo = ?' : ''}
           AND p.color IS NOT NULL AND p.color <> ''
         ORDER BY p.color`,
        [...(marca ? [marca] : []), ...(producto ? [producto] : []), ...(modelo ? [modelo] : [])]
      ),
      db.promise().query(
        `SELECT DISTINCT p.capacidad FROM productos p JOIN marcas m ON m.id_marca = p.id_marca
         WHERE p.activo = 1 ${marca ? 'AND m.nombre = ?' : ''} ${producto ? 'AND p.producto = ?' : ''} ${modelo ? 'AND p.modelo = ?' : ''} ${color ? 'AND p.color = ?' : ''}
           AND p.capacidad IS NOT NULL AND p.capacidad <> ''
         ORDER BY p.capacidad`,
        [...(marca ? [marca] : []), ...(producto ? [producto] : []), ...(modelo ? [modelo] : []), ...(color ? [color] : [])]
      ),
    ]);

    res.json({
      depositos,
      productos,
      total: Number(total),
      page: safePage,
      limit: safeLimit,
      resumen: {
        total:    Number(resumenRow.total) || 0,
        unidades: Number(resumenRow.unidades) || 0,
        sinStock: Number(resumenRow.sinStock) || 0,
        bajoMin:  Number(resumenRow.bajoMin) || 0,
        ok:       Number(resumenRow.ok) || 0,
      },
      facetas: {
        marcas:      marcasRows.map(r => r.nombre),
        productos:   productosRows.map(r => r.producto),
        modelos:     modelosRows.map(r => r.modelo),
        colores:     coloresRows.map(r => r.color),
        capacidades: capacidadesRows.map(r => r.capacidad),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener stock consolidado' });
  }
};

// Exportar TODO el stock que matchea los filtros (sin paginar, para PDF/impresión),
// con un tope de seguridad — usa los mismos filtros que getStockConsolidado pero
// no aplica LIMIT/OFFSET de página.
const EXPORT_LIMIT = 3000;

const exportarStockConsolidado = async (req, res) => {
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
    if (depositoIds.length === 0) return res.json({ depositos: [], productos: [], truncated: false });

    const { busqueda, marca, producto, modelo, color, capacidad, estado, depositos: depositosParam } = req.query;

    let depositosVisiblesIds = depositoIds;
    if (depositosParam !== undefined) {
      const solicitados = String(depositosParam)
        .split(',')
        .map(s => Number(s.trim()))
        .filter(n => !isNaN(n));
      depositosVisiblesIds = depositoIds.filter(id => solicitados.includes(id));
    }

    const filtrosBaseArr = ['p.activo = 1'];
    const paramsBase     = [];

    if (busqueda) {
      filtrosBaseArr.push('(p.producto LIKE ? OR p.codigo_interno LIKE ? OR p.codigo_barras LIKE ? OR m.nombre LIKE ? OR p.modelo LIKE ?)');
      const q = `%${busqueda}%`;
      paramsBase.push(q, q, q, q, q);
    }
    if (marca)     { filtrosBaseArr.push('m.nombre = ?');    paramsBase.push(marca); }
    if (producto)  { filtrosBaseArr.push('p.producto = ?');  paramsBase.push(producto); }
    if (modelo)    { filtrosBaseArr.push('p.modelo = ?');    paramsBase.push(modelo); }
    if (color)     { filtrosBaseArr.push('p.color = ?');     paramsBase.push(color); }
    if (capacidad) { filtrosBaseArr.push('p.capacidad = ?'); paramsBase.push(capacidad); }

    const filtrosBase = filtrosBaseArr.join(' AND ');

    const totalDispExpr = depositosVisiblesIds.length
      ? `COALESCE((SELECT SUM(s2.cantidad_disponible) FROM stock s2 WHERE s2.id_producto = p.id_producto AND s2.id_deposito IN (${depositosVisiblesIds.map(() => '?').join(',')})), 0)`
      : `0`;
    const totalDispParams = depositosVisiblesIds.length ? depositosVisiblesIds : [];

    const derivedSql = `
      SELECT p.id_producto, p.codigo_interno, p.codigo_barras, p.producto, p.detalle, p.modelo, p.color, p.capacidad,
             p.stock_minimo, p.activo, m.nombre AS marca_nombre, c.nombre AS categoria_nombre,
             u.nombre AS unidad_nombre, u.codigo AS unidad_codigo,
             ${totalDispExpr} AS total_disp
      FROM productos p
      JOIN marcas m ON m.id_marca = p.id_marca
      JOIN categorias c ON c.id_categoria = p.id_categoria
      JOIN unidades_medida u ON u.id_unidad = p.id_unidad
      WHERE ${filtrosBase}
    `;
    const derivedParams = [...paramsBase, ...totalDispParams];

    const estadoWhereArr = [];
    if (estado === 'sin')  estadoWhereArr.push('x.total_disp = 0');
    if (estado === 'bajo') estadoWhereArr.push('x.total_disp > 0 AND x.total_disp <= x.stock_minimo');
    if (estado === 'ok')   estadoWhereArr.push('x.total_disp > x.stock_minimo');
    const estadoWhereSql = estadoWhereArr.length ? `WHERE ${estadoWhereArr.join(' AND ')}` : '';

    const [allRows] = await db.promise().query(
      `SELECT * FROM (${derivedSql}) x ${estadoWhereSql}
       ORDER BY x.marca_nombre ASC, x.producto ASC
       LIMIT ?`,
      [...derivedParams, EXPORT_LIMIT + 1]
    );
    const truncated = allRows.length > EXPORT_LIMIT;
    if (truncated) allRows.length = EXPORT_LIMIT;

    const productos = allRows.map(r => ({
      id_producto:      r.id_producto,
      codigo_interno:   r.codigo_interno,
      codigo_barras:    r.codigo_barras,
      producto:         r.producto,
      detalle:          r.detalle,
      modelo:           r.modelo,
      color:            r.color,
      capacidad:        r.capacidad,
      stock_minimo:     r.stock_minimo,
      activo:           r.activo,
      marca_nombre:     r.marca_nombre,
      categoria_nombre: r.categoria_nombre,
      unidad_nombre:    r.unidad_nombre,
      unidad_codigo:    r.unidad_codigo,
      stock: {},
    }));

    if (productos.length > 0) {
      const idsExport = productos.map(p => p.id_producto);
      const [stockRows] = await db.promise().query(
        `SELECT id_producto, id_deposito,
                COALESCE(cantidad, 0)            AS cantidad,
                COALESCE(cantidad_reservada, 0)  AS cantidad_reservada,
                COALESCE(cantidad_disponible, 0) AS cantidad_disponible,
                COALESCE(costo_promedio, 0)      AS costo_promedio
         FROM stock
         WHERE id_producto IN (${idsExport.map(() => '?').join(',')})
           AND id_deposito IN (${depositoIds.map(() => '?').join(',')})`,
        [...idsExport, ...depositoIds]
      );
      const porProducto = new Map(productos.map(p => [p.id_producto, p]));
      for (const r of stockRows) {
        const p = porProducto.get(r.id_producto);
        if (!p) continue;
        p.stock[r.id_deposito] = {
          cantidad:            r.cantidad,
          cantidad_reservada:  r.cantidad_reservada,
          cantidad_disponible: r.cantidad_disponible,
          costo_promedio:      r.costo_promedio,
        };
      }
    }

    res.json({ depositos, productos, truncated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al exportar stock consolidado' });
  }
};

// ── Kardex ────────────────────────────────────────────────────────────────────
// Query params: id_producto, id_deposito, fecha_desde, fecha_hasta, documento_tipo

const getKardex = async (req, res) => {
  try {
    const { id_producto, id_deposito, fecha_desde, fecha_hasta, documento_tipo, marca, producto, modelo, color, capacidad, page = 1, limit = 20 } = req.query;
    const safeLimit = Math.min(Number(limit) || 20, 200);
    const offset = (Number(page) - 1) * safeLimit;

    const where  = [];
    const params = [];

    if (id_producto)   { where.push('k.id_producto = ?');     params.push(id_producto); }
    if (id_deposito)   { where.push('k.id_deposito = ?');     params.push(id_deposito); }
    if (fecha_desde)   { where.push('k.fecha >= ?');          params.push(fecha_desde); }
    if (fecha_hasta)   { where.push('k.fecha <= ?');          params.push(fecha_hasta + ' 23:59:59'); }
    if (documento_tipo){ where.push('k.documento_tipo = ?');  params.push(documento_tipo); }
    if (marca)          { where.push('m.nombre = ?');          params.push(marca); }
    if (producto)       { where.push('p.producto = ?');        params.push(producto); }
    if (modelo)          { where.push('p.modelo = ?');          params.push(modelo); }
    if (color)           { where.push('p.color = ?');           params.push(color); }
    if (capacidad)       { where.push('p.capacidad = ?');       params.push(capacidad); }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM kardex k
       JOIN productos p         ON p.id_producto         = k.id_producto
       LEFT JOIN marcas m       ON m.id_marca            = p.id_marca
       JOIN depositos d         ON d.id_deposito         = k.id_deposito
       JOIN tipos_movimiento tm ON tm.id_tipo_movimiento = k.id_tipo_movimiento
       LEFT JOIN usuarios u     ON u.id_usuario          = k.id_usuario
       ${whereSql}`,
      params
    );

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
      LEFT JOIN marcas m       ON m.id_marca            = p.id_marca
      JOIN depositos d         ON d.id_deposito         = k.id_deposito
      JOIN tipos_movimiento tm ON tm.id_tipo_movimiento = k.id_tipo_movimiento
      LEFT JOIN usuarios u     ON u.id_usuario          = k.id_usuario
      ${whereSql}
      ORDER BY k.fecha DESC
      LIMIT ? OFFSET ?`;

    const [rows] = await db.promise().query(sql, [...params, safeLimit, offset]);
    res.json({ kardex: rows, total: Number(total), page: Number(page), limit: safeLimit });
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
      `SELECT p.id_producto, p.codigo_interno, p.producto, p.imagen_url,
              p.modelo, p.color, p.detalle AS producto_detalle, p.capacidad, m.nombre AS marca
       FROM productos p
       JOIN marcas m ON m.id_marca = p.id_marca
       WHERE p.activo = 1
       ORDER BY p.producto ASC`
    );

    res.json({ productos, depositos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener datos del formulario' });
  }
};

module.exports = { getStockConsolidado, exportarStockConsolidado, getKardex, getAlertas, atenderAlerta, editarStockMinimo, getKardexFormData, getStockDeposito };
