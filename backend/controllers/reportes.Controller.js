const db   = require('../config/db');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const { isValidDate } = require('../utils/validators');

const hoy = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const defaultDesde = (q) => q.fecha_desde || inicioMes();
const defaultHasta = (q) => q.fecha_hasta || hoy();

const validarFechas = (q, res) => {
  if (q.fecha_desde && !isValidDate(q.fecha_desde)) {
    res.status(400).json({ error: 'fecha_desde debe tener formato YYYY-MM-DD' });
    return false;
  }
  if (q.fecha_hasta && !isValidDate(q.fecha_hasta)) {
    res.status(400).json({ error: 'fecha_hasta debe tener formato YYYY-MM-DD' });
    return false;
  }
  return true;
};

// ── Dashboard KPIs ─────────────────────────────────────────────────────────
async function getDashboard(req, res) {
  try {
    const [[ventasHoy]] = await db.promise().query(`
      SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad
      FROM ventas WHERE DATE(fecha) = CURDATE() AND estado NOT IN ('ANULADA','BORRADOR')
    `);
    const [[ventasMes]] = await db.promise().query(`
      SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad
      FROM ventas WHERE YEAR(fecha)=YEAR(CURDATE()) AND MONTH(fecha)=MONTH(CURDATE())
        AND estado NOT IN ('ANULADA','BORRADOR')
    `);
    const [[comprasMes]] = await db.promise().query(`
      SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad
      FROM compras WHERE YEAR(fecha_pedido)=YEAR(CURDATE()) AND MONTH(fecha_pedido)=MONTH(CURDATE())
        AND estado != 'ANULADO'
    `);
    const [[alertas]] = await db.promise().query(`
      SELECT COUNT(*) AS cantidad FROM alertas_stock WHERE atendida=0
    `);
    const [[arqueos]] = await db.promise().query(`
      SELECT COUNT(*) AS cantidad FROM arqueos_caja WHERE estado='ABIERTA'
    `);
    const [topProductos] = await db.promise().query(`
      SELECT p.producto, p.codigo_interno,
        SUM(vd.cantidad) AS cantidad_vendida, SUM(vd.subtotal) AS monto_total
      FROM venta_detalle vd
      JOIN ventas v ON v.id_venta=vd.id_venta
      JOIN productos p ON p.id_producto=vd.id_producto
      WHERE YEAR(v.fecha)=YEAR(CURDATE()) AND MONTH(v.fecha)=MONTH(CURDATE())
        AND v.estado NOT IN ('ANULADA','BORRADOR')
      GROUP BY vd.id_producto, p.producto, p.codigo_interno
      ORDER BY cantidad_vendida DESC LIMIT 5
    `);
    const [ventasDiarias] = await db.promise().query(`
      SELECT DATE(fecha) AS dia, COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad
      FROM ventas
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        AND estado NOT IN ('ANULADA','BORRADOR')
      GROUP BY DATE(fecha) ORDER BY dia
    `);
    const [[cuentasCobrar]] = await db.promise().query(`
      SELECT COALESCE(SUM(saldo_actual),0) AS total FROM clientes WHERE saldo_actual > 0
    `);
    const [[cuentasPagar]] = await db.promise().query(`
      SELECT COALESCE(SUM(saldo_actual),0) AS total FROM proveedores WHERE saldo_actual > 0
    `);

    res.json({
      ventasHoy,
      ventasMes,
      comprasMes,
      alertas:      alertas.cantidad,
      arqueos:      arqueos.cantidad,
      cuentasCobrar: cuentasCobrar.total,
      cuentasPagar:  cuentasPagar.total,
      topProductos,
      ventasDiarias,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Ventas por período ─────────────────────────────────────────────────────
async function getVentas(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal, id_vendedor, id_cliente, estado } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT v.numero, DATE_FORMAT(v.fecha,'%Y-%m-%d %H:%i') AS fecha, v.tipo_venta,
        COALESCE(c.razon_social, CONCAT(c.nombres,' ',c.apellidos)) AS cliente,
        CONCAT(u.nombres,' ',u.apellidos) AS vendedor,
        s.nombre AS sucursal,
        v.total, v.descuento_monto, v.saldo_pendiente, v.estado, v.condicion_pago
      FROM ventas v
      JOIN clientes c ON c.id_cliente=v.id_cliente
      JOIN usuarios u ON u.id_usuario=v.id_vendedor
      JOIN sucursales s ON s.id_sucursal=v.id_sucursal
      WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado != 'BORRADOR'
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND v.id_sucursal=?'; params.push(id_sucursal); }
    if (id_vendedor) { sql += ' AND v.id_vendedor=?'; params.push(id_vendedor); }
    if (id_cliente)  { sql += ' AND v.id_cliente=?';  params.push(id_cliente); }
    if (estado)      { sql += ' AND v.estado=?';       params.push(estado); }
    sql += ' ORDER BY v.fecha DESC LIMIT 500';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Ventas por vendedor ────────────────────────────────────────────────────
async function getVentasVendedor(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT u.id_usuario, CONCAT(u.nombres,' ',u.apellidos) AS vendedor,
        s.nombre AS sucursal,
        COUNT(DISTINCT v.id_venta) AS num_ventas,
        SUM(v.total) AS total_ventas,
        COALESCE(SUM(vd.bono_vendedor),0) AS total_bonos
      FROM ventas v
      JOIN usuarios u ON u.id_usuario=v.id_vendedor
      JOIN sucursales s ON s.id_sucursal=v.id_sucursal
      JOIN venta_detalle vd ON vd.id_venta=v.id_venta
      WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado NOT IN ('ANULADA','BORRADOR')
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND v.id_sucursal=?'; params.push(id_sucursal); }
    sql += ' GROUP BY v.id_vendedor, s.id_sucursal ORDER BY total_ventas DESC';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Ventas por cliente ─────────────────────────────────────────────────────
async function getVentasCliente(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT c.codigo,
        COALESCE(c.razon_social, CONCAT(c.nombres,' ',c.apellidos)) AS cliente,
        c.tipo_cliente,
        COUNT(DISTINCT v.id_venta) AS num_compras,
        SUM(v.total) AS total_comprado,
        c.saldo_actual AS saldo_pendiente
      FROM ventas v
      JOIN clientes c ON c.id_cliente=v.id_cliente
      WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado NOT IN ('ANULADA','BORRADOR')
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND v.id_sucursal=?'; params.push(id_sucursal); }
    sql += ' GROUP BY v.id_cliente ORDER BY total_comprado DESC LIMIT 200';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Ventas por producto ────────────────────────────────────────────────────
async function getVentasProducto(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal, id_categoria, id_marca } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT p.codigo_interno, p.producto, m.nombre AS marca, cat.nombre AS categoria,
        SUM(vd.cantidad) AS cantidad_vendida,
        SUM(vd.subtotal) AS monto_total,
        AVG(vd.precio_unitario) AS precio_promedio
      FROM venta_detalle vd
      JOIN ventas v ON v.id_venta=vd.id_venta
      JOIN productos p ON p.id_producto=vd.id_producto
      JOIN marcas m ON m.id_marca=p.id_marca
      JOIN categorias cat ON cat.id_categoria=p.id_categoria
      WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado NOT IN ('ANULADA','BORRADOR')
    `;
    const params = [desde, hasta];
    if (id_sucursal)  { sql += ' AND v.id_sucursal=?';  params.push(id_sucursal); }
    if (id_categoria) { sql += ' AND p.id_categoria=?'; params.push(id_categoria); }
    if (id_marca)     { sql += ' AND p.id_marca=?';     params.push(id_marca); }
    sql += ' GROUP BY vd.id_producto ORDER BY cantidad_vendida DESC LIMIT 200';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Compras por período ────────────────────────────────────────────────────
async function getCompras(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal, id_proveedor, estado } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT c.numero, DATE_FORMAT(c.fecha_pedido,'%Y-%m-%d') AS fecha_pedido,
        pr.razon_social AS proveedor, s.nombre AS sucursal,
        c.total, c.saldo_pendiente, c.estado, c.condicion_pago
      FROM compras c
      JOIN proveedores pr ON pr.id_proveedor=c.id_proveedor
      JOIN sucursales s ON s.id_sucursal=c.id_sucursal
      WHERE c.fecha_pedido BETWEEN ? AND ? AND c.estado != 'ANULADO'
    `;
    const params = [desde, hasta];
    if (id_sucursal)  { sql += ' AND c.id_sucursal=?';  params.push(id_sucursal); }
    if (id_proveedor) { sql += ' AND c.id_proveedor=?'; params.push(id_proveedor); }
    if (estado)       { sql += ' AND c.estado=?';        params.push(estado); }
    sql += ' ORDER BY c.fecha_pedido DESC LIMIT 500';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Cuentas por cobrar ─────────────────────────────────────────────────────
async function getCuentasCobrar(req, res) {
  try {
    const [rows] = await db.promise().query(`
      SELECT c.codigo,
        COALESCE(c.razon_social, CONCAT(c.nombres,' ',c.apellidos)) AS cliente,
        c.tipo_cliente, c.telefono,
        c.limite_credito, c.saldo_actual AS total_pendiente,
        c.dias_credito
      FROM clientes c
      WHERE c.saldo_actual > 0
      ORDER BY c.saldo_actual DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Cuentas por pagar ──────────────────────────────────────────────────────
async function getCuentasPagar(req, res) {
  try {
    const [rows] = await db.promise().query(`
      SELECT pr.codigo, pr.razon_social AS proveedor,
        pr.contacto_principal, pr.telefono, pr.plazo_credito_dias,
        pr.saldo_actual AS total_pendiente
      FROM proveedores pr
      WHERE pr.saldo_actual > 0
      ORDER BY pr.saldo_actual DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Rentabilidad ───────────────────────────────────────────────────────────
async function getRentabilidad(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_categoria, id_marca, agrupar_por } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);
    const agrupar = agrupar_por || 'producto';

    let selectGroup, groupBy;
    if (agrupar === 'marca') {
      selectGroup = `m.id_marca AS id_grupo, m.nombre AS grupo`;
      groupBy = 'm.id_marca';
    } else if (agrupar === 'categoria') {
      selectGroup = `cat.id_categoria AS id_grupo, cat.nombre AS grupo`;
      groupBy = 'cat.id_categoria';
    } else {
      selectGroup = `p.id_producto AS id_grupo, CONCAT(p.codigo_interno,' - ',p.producto) AS grupo`;
      groupBy = 'p.id_producto';
    }

    let sql = `
      SELECT ${selectGroup},
        SUM(vd.cantidad) AS cantidad_vendida,
        SUM(vd.subtotal) AS ingresos,
        SUM(vd.cantidad * vd.costo_unitario) AS costo_ventas,
        SUM(vd.subtotal) - SUM(vd.cantidad * vd.costo_unitario) AS utilidad_bruta,
        CASE WHEN SUM(vd.subtotal) > 0
          THEN ROUND((SUM(vd.subtotal) - SUM(vd.cantidad * vd.costo_unitario)) / SUM(vd.subtotal) * 100, 2)
          ELSE 0 END AS margen_pct
      FROM venta_detalle vd
      JOIN ventas v ON v.id_venta=vd.id_venta
      JOIN productos p ON p.id_producto=vd.id_producto
      JOIN marcas m ON m.id_marca=p.id_marca
      JOIN categorias cat ON cat.id_categoria=p.id_categoria
      WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado NOT IN ('ANULADA','BORRADOR')
    `;
    const params = [desde, hasta];
    if (id_categoria) { sql += ' AND p.id_categoria=?'; params.push(id_categoria); }
    if (id_marca)     { sql += ' AND p.id_marca=?';     params.push(id_marca); }
    sql += ` GROUP BY ${groupBy} ORDER BY utilidad_bruta IS NULL, utilidad_bruta DESC LIMIT 200`;

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Estado de resultados ───────────────────────────────────────────────────
async function getEstadoResultados(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    const condV = id_sucursal ? ' AND id_sucursal=?' : '';
    const condG = id_sucursal ? ' AND id_sucursal=?' : '';
    const pV = id_sucursal ? [desde, hasta, id_sucursal] : [desde, hasta];
    const pG = id_sucursal ? [desde, hasta, id_sucursal] : [desde, hasta];

    const [[ventasRes]] = await db.promise().query(
      `SELECT COALESCE(SUM(total),0) AS total_ventas, COALESCE(SUM(descuento_monto),0) AS total_descuentos
       FROM ventas WHERE DATE(fecha) BETWEEN ? AND ? AND estado NOT IN ('ANULADA','BORRADOR') ${condV}`, pV
    );
    const [[costosRes]] = await db.promise().query(
      `SELECT COALESCE(SUM(vd.cantidad * vd.costo_unitario),0) AS costo_ventas
       FROM venta_detalle vd JOIN ventas v ON v.id_venta=vd.id_venta
       WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado NOT IN ('ANULADA','BORRADOR') ${id_sucursal ? ' AND v.id_sucursal=?' : ''}`, pV
    );
    const [[devRes]] = await db.promise().query(
      `SELECT COALESCE(SUM(total),0) AS total_devoluciones
       FROM devoluciones_venta WHERE DATE(fecha) BETWEEN ? AND ? AND estado='APROBADA'`, [desde, hasta]
    );
    const [[gastosRes]] = await db.promise().query(
      `SELECT COALESCE(SUM(monto),0) AS total_gastos
       FROM gastos WHERE fecha BETWEEN ? AND ? AND estado != 'ANULADO' ${condG}`, pG
    );

    const ingresos_brutos   = Number(ventasRes.total_ventas);
    const descuentos        = Number(ventasRes.total_descuentos);
    const devoluciones      = Number(devRes.total_devoluciones);
    const ingresos_netos    = ingresos_brutos - descuentos - devoluciones;
    const costo_ventas      = Number(costosRes.costo_ventas);
    const utilidad_bruta    = ingresos_netos - costo_ventas;
    const gastos_operativos = Number(gastosRes.total_gastos);
    const resultado_neto    = utilidad_bruta - gastos_operativos;

    res.json({
      periodo: { desde, hasta },
      ingresos_brutos,
      descuentos,
      devoluciones,
      ingresos_netos,
      costo_ventas,
      utilidad_bruta,
      margen_bruto: ingresos_netos > 0 ? ((utilidad_bruta / ingresos_netos) * 100).toFixed(2) : '0.00',
      gastos_operativos,
      resultado_neto,
      margen_neto: ingresos_netos > 0 ? ((resultado_neto / ingresos_netos) * 100).toFixed(2) : '0.00',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Bonos por vendedor ─────────────────────────────────────────────────────
async function getBonosVendedores(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT u.id_usuario, CONCAT(u.nombres,' ',u.apellidos) AS vendedor,
        s.nombre AS sucursal,
        COUNT(DISTINCT v.id_venta) AS num_ventas,
        SUM(v.total) AS total_ventas,
        COALESCE(SUM(vd.bono_vendedor),0) AS total_bonos,
        COALESCE(SUM(vd.cantidad),0) AS unidades_vendidas
      FROM venta_detalle vd
      JOIN ventas v ON v.id_venta=vd.id_venta
      JOIN usuarios u ON u.id_usuario=v.id_vendedor
      JOIN sucursales s ON s.id_sucursal=v.id_sucursal
      WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado NOT IN ('ANULADA','BORRADOR')
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND v.id_sucursal=?'; params.push(id_sucursal); }
    sql += ' GROUP BY v.id_vendedor, s.id_sucursal ORDER BY total_bonos DESC';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Stock consolidado ─────────────────────────────────────────────────────
async function getStockConsolidado(req, res) {
  try {
    const { id_deposito, id_sucursal, id_categoria, id_marca, con_stock } = req.query;
    let sql = `
      SELECT p.codigo_interno, p.producto, m.nombre AS marca, cat.nombre AS categoria,
        d.nombre AS deposito, s.nombre AS sucursal,
        COALESCE(st.cantidad,0) AS cantidad,
        COALESCE(st.cantidad_reservada,0) AS cantidad_reservada,
        COALESCE(st.cantidad_disponible,0) AS cantidad_disponible,
        COALESCE(st.costo_promedio,0) AS costo_promedio,
        p.precio_publico, p.stock_minimo, st.fecha_ult_movimiento
      FROM stock st
      JOIN productos p  ON p.id_producto=st.id_producto
      JOIN depositos d  ON d.id_deposito=st.id_deposito
      JOIN sucursales s ON s.id_sucursal=d.id_sucursal
      JOIN marcas m     ON m.id_marca=p.id_marca
      JOIN categorias cat ON cat.id_categoria=p.id_categoria
      WHERE p.activo=1
    `;
    const params = [];
    if (id_deposito)     { sql += ' AND st.id_deposito=?';  params.push(id_deposito); }
    if (id_sucursal)     { sql += ' AND d.id_sucursal=?';   params.push(id_sucursal); }
    if (id_categoria)    { sql += ' AND p.id_categoria=?';  params.push(id_categoria); }
    if (id_marca)        { sql += ' AND p.id_marca=?';      params.push(id_marca); }
    if (con_stock === '1') { sql += ' AND st.cantidad > 0'; }
    sql += ' ORDER BY p.producto, d.nombre LIMIT 2000';
    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Kardex por producto ────────────────────────────────────────────────────
async function getKardexProducto(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_producto } = req.params;
    const { id_deposito } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT DATE_FORMAT(k.fecha,'%Y-%m-%d %H:%i') AS fecha,
        tm.nombre AS tipo_movimiento, tm.efecto,
        d.nombre AS deposito,
        k.cantidad, k.costo_unitario,
        k.saldo_cantidad, k.saldo_costo,
        k.documento_tipo, k.documento_numero,
        CONCAT(u.nombres,' ',u.apellidos) AS usuario
      FROM kardex k
      JOIN tipos_movimiento tm ON tm.id_tipo_movimiento=k.id_tipo_movimiento
      JOIN depositos d         ON d.id_deposito=k.id_deposito
      LEFT JOIN usuarios u     ON u.id_usuario=k.id_usuario
      WHERE k.id_producto=? AND DATE(k.fecha) BETWEEN ? AND ?
    `;
    const params = [id_producto, desde, hasta];
    if (id_deposito) { sql += ' AND k.id_deposito=?'; params.push(id_deposito); }
    sql += ' ORDER BY k.fecha DESC LIMIT 500';

    const [[prod]] = await db.promise().query(
      'SELECT codigo_interno, producto FROM productos WHERE id_producto=?', [id_producto]
    );
    const [rows] = await db.promise().query(sql, params);
    res.json({ producto: prod || null, movimientos: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Arqueos de caja ───────────────────────────────────────────────────────
async function getArqueosCaja(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal, id_caja, estado } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT ac.id_arqueo, cj.nombre AS caja, s.nombre AS sucursal,
        CONCAT(u.nombres,' ',u.apellidos) AS usuario,
        DATE_FORMAT(ac.fecha_apertura,'%Y-%m-%d %H:%i') AS fecha_apertura,
        DATE_FORMAT(ac.fecha_cierre,'%Y-%m-%d %H:%i') AS fecha_cierre,
        ac.monto_apertura, ac.monto_cierre_sistema, ac.monto_cierre_real,
        ac.diferencia, ac.estado
      FROM arqueos_caja ac
      JOIN cajas cj     ON cj.id_caja=ac.id_caja
      JOIN sucursales s ON s.id_sucursal=cj.id_sucursal
      JOIN usuarios u   ON u.id_usuario=ac.id_usuario
      WHERE DATE(ac.fecha_apertura) BETWEEN ? AND ?
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND cj.id_sucursal=?'; params.push(id_sucursal); }
    if (id_caja)     { sql += ' AND ac.id_caja=?';     params.push(id_caja); }
    if (estado)      { sql += ' AND ac.estado=?';      params.push(estado); }
    sql += ' ORDER BY ac.fecha_apertura DESC';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Gastos por categoría ──────────────────────────────────────────────────
async function getGastosCategoria(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT cg.nombre AS categoria,
        COUNT(*) AS num_gastos,
        SUM(g.monto) AS total_monto,
        SUM(CASE WHEN g.metodo_pago='EFECTIVO' THEN g.monto ELSE 0 END) AS efectivo,
        SUM(CASE WHEN g.metodo_pago!='EFECTIVO' THEN g.monto ELSE 0 END) AS otros_metodos
      FROM gastos g
      JOIN categorias_gasto cg ON cg.id_categoria_gasto=g.id_categoria_gasto
      WHERE g.fecha BETWEEN ? AND ? AND g.estado != 'ANULADO'
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND g.id_sucursal=?'; params.push(id_sucursal); }
    sql += ' GROUP BY cg.id_categoria_gasto, cg.nombre ORDER BY total_monto DESC';

    const [rows] = await db.promise().query(sql, params);
    const [[tot]] = await db.promise().query(
      `SELECT COALESCE(SUM(monto),0) AS total, COUNT(*) AS cantidad
       FROM gastos WHERE fecha BETWEEN ? AND ? AND estado!='ANULADO'
       ${id_sucursal ? ' AND id_sucursal=?' : ''}`,
      id_sucursal ? [desde, hasta, id_sucursal] : [desde, hasta]
    );
    res.json({ categorias: rows, totales: tot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Top productos ─────────────────────────────────────────────────────────
async function getTopProductos(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal, id_categoria, id_marca } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);
    const limit = Math.min(parseInt(req.query.limit || 10, 10), 100);

    let sql = `
      SELECT p.codigo_interno, p.producto, m.nombre AS marca, cat.nombre AS categoria,
        SUM(vd.cantidad) AS cantidad_vendida,
        SUM(vd.subtotal) AS monto_total,
        COALESCE(SUM(vd.bono_vendedor),0) AS total_bonos,
        AVG(vd.precio_unitario) AS precio_promedio
      FROM venta_detalle vd
      JOIN ventas v     ON v.id_venta=vd.id_venta
      JOIN productos p  ON p.id_producto=vd.id_producto
      JOIN marcas m     ON m.id_marca=p.id_marca
      JOIN categorias cat ON cat.id_categoria=p.id_categoria
      WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado NOT IN ('ANULADA','BORRADOR')
    `;
    const params = [desde, hasta];
    if (id_sucursal)  { sql += ' AND v.id_sucursal=?';  params.push(id_sucursal); }
    if (id_categoria) { sql += ' AND p.id_categoria=?'; params.push(id_categoria); }
    if (id_marca)     { sql += ' AND p.id_marca=?';     params.push(id_marca); }
    sql += ` GROUP BY vd.id_producto ORDER BY cantidad_vendida DESC LIMIT ${limit}`;

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Exportar reporte (Excel o PDF) ────────────────────────────────────────
async function exportarReporte(req, res) {
  try {
    const { tipo, formato } = req.query;
    const desde = req.query.fecha_desde || inicioMes();
    const hasta = req.query.fecha_hasta || hoy();

    let rows = [], titulo = 'Reporte', columnas = [];

    if (tipo === 'ventas') {
      titulo = 'Reporte de Ventas';
      [rows] = await db.promise().query(
        `SELECT v.numero, DATE_FORMAT(v.fecha,'%Y-%m-%d %H:%i') AS fecha,
          COALESCE(c.razon_social,CONCAT(c.nombres,' ',c.apellidos)) AS cliente,
          CONCAT(u.nombres,' ',u.apellidos) AS vendedor, s.nombre AS sucursal,
          v.condicion_pago, v.total, v.saldo_pendiente, v.estado
         FROM ventas v
         JOIN clientes c ON c.id_cliente=v.id_cliente
         JOIN usuarios u ON u.id_usuario=v.id_vendedor
         JOIN sucursales s ON s.id_sucursal=v.id_sucursal
         WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado!='BORRADOR'
         ORDER BY v.fecha DESC LIMIT 5000`,
        [desde, hasta]
      );
      columnas = ['numero','fecha','cliente','vendedor','sucursal','condicion_pago','total','saldo_pendiente','estado'];

    } else if (tipo === 'compras') {
      titulo = 'Reporte de Compras';
      [rows] = await db.promise().query(
        `SELECT c.numero, DATE_FORMAT(c.fecha_pedido,'%Y-%m-%d') AS fecha_pedido,
          pr.razon_social AS proveedor, s.nombre AS sucursal,
          c.condicion_pago, c.total, c.saldo_pendiente, c.estado
         FROM compras c
         JOIN proveedores pr ON pr.id_proveedor=c.id_proveedor
         JOIN sucursales s ON s.id_sucursal=c.id_sucursal
         WHERE c.fecha_pedido BETWEEN ? AND ? AND c.estado!='ANULADO'
         ORDER BY c.fecha_pedido DESC LIMIT 5000`,
        [desde, hasta]
      );
      columnas = ['numero','fecha_pedido','proveedor','sucursal','condicion_pago','total','saldo_pendiente','estado'];

    } else if (tipo === 'stock') {
      titulo = 'Stock Consolidado';
      [rows] = await db.promise().query(
        `SELECT p.codigo_interno, p.producto, m.nombre AS marca, cat.nombre AS categoria,
          d.nombre AS deposito, s.nombre AS sucursal,
          COALESCE(st.cantidad,0) AS cantidad,
          COALESCE(st.cantidad_disponible,0) AS disponible,
          COALESCE(st.costo_promedio,0) AS costo_promedio,
          p.precio_publico, p.stock_minimo
         FROM stock st
         JOIN productos p  ON p.id_producto=st.id_producto
         JOIN depositos d  ON d.id_deposito=st.id_deposito
         JOIN sucursales s ON s.id_sucursal=d.id_sucursal
         JOIN marcas m     ON m.id_marca=p.id_marca
         JOIN categorias cat ON cat.id_categoria=p.id_categoria
         WHERE p.activo=1 ORDER BY p.producto LIMIT 5000`
      );
      columnas = ['codigo_interno','producto','marca','categoria','deposito','sucursal','cantidad','disponible','costo_promedio','precio_publico','stock_minimo'];

    } else if (tipo === 'cuentas-cobrar') {
      titulo = 'Cuentas por Cobrar';
      [rows] = await db.promise().query(
        `SELECT c.codigo, COALESCE(c.razon_social,CONCAT(c.nombres,' ',c.apellidos)) AS cliente,
          c.tipo_cliente, c.telefono, c.limite_credito, c.saldo_actual AS total_pendiente, c.dias_credito
         FROM clientes c WHERE c.saldo_actual > 0 ORDER BY c.saldo_actual DESC`
      );
      columnas = ['codigo','cliente','tipo_cliente','telefono','limite_credito','total_pendiente','dias_credito'];

    } else if (tipo === 'cuentas-pagar') {
      titulo = 'Cuentas por Pagar';
      [rows] = await db.promise().query(
        `SELECT pr.codigo, pr.razon_social AS proveedor, pr.contacto_principal,
          pr.telefono, pr.plazo_credito_dias, pr.saldo_actual AS total_pendiente
         FROM proveedores pr WHERE pr.saldo_actual > 0 ORDER BY pr.saldo_actual DESC`
      );
      columnas = ['codigo','proveedor','contacto_principal','telefono','plazo_credito_dias','total_pendiente'];

    } else if (tipo === 'top-productos') {
      titulo = 'Top Productos';
      [rows] = await db.promise().query(
        `SELECT p.codigo_interno, p.producto, m.nombre AS marca,
          SUM(vd.cantidad) AS cantidad_vendida, SUM(vd.subtotal) AS monto_total
         FROM venta_detalle vd
         JOIN ventas v    ON v.id_venta=vd.id_venta
         JOIN productos p ON p.id_producto=vd.id_producto
         JOIN marcas m    ON m.id_marca=p.id_marca
         WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado NOT IN ('ANULADA','BORRADOR')
         GROUP BY vd.id_producto ORDER BY cantidad_vendida DESC LIMIT 50`,
        [desde, hasta]
      );
      columnas = ['codigo_interno','producto','marca','cantidad_vendida','monto_total'];

    } else if (tipo === 'gastos-categoria') {
      titulo = 'Gastos por Categoría';
      [rows] = await db.promise().query(
        `SELECT cg.nombre AS categoria, COUNT(*) AS num_gastos, SUM(g.monto) AS total_monto
         FROM gastos g
         JOIN categorias_gasto cg ON cg.id_categoria_gasto=g.id_categoria_gasto
         WHERE g.fecha BETWEEN ? AND ? AND g.estado!='ANULADO'
         GROUP BY cg.id_categoria_gasto ORDER BY total_monto DESC`,
        [desde, hasta]
      );
      columnas = ['categoria','num_gastos','total_monto'];

    } else if (tipo === 'rentabilidad') {
      titulo = 'Rentabilidad';
      [rows] = await db.promise().query(
        `SELECT CONCAT(p.codigo_interno,' - ',p.producto) AS producto,
          SUM(vd.cantidad) AS cantidad_vendida, SUM(vd.subtotal) AS ingresos,
          SUM(vd.cantidad*vd.costo_unitario) AS costo_ventas,
          SUM(vd.subtotal)-SUM(vd.cantidad*vd.costo_unitario) AS utilidad_bruta,
          CASE WHEN SUM(vd.subtotal)>0
            THEN ROUND((SUM(vd.subtotal)-SUM(vd.cantidad*vd.costo_unitario))/SUM(vd.subtotal)*100,2)
            ELSE 0 END AS margen_pct
         FROM venta_detalle vd
         JOIN ventas v    ON v.id_venta=vd.id_venta
         JOIN productos p ON p.id_producto=vd.id_producto
         WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado NOT IN ('ANULADA','BORRADOR')
         GROUP BY vd.id_producto ORDER BY utilidad_bruta DESC LIMIT 500`,
        [desde, hasta]
      );
      columnas = ['producto','cantidad_vendida','ingresos','costo_ventas','utilidad_bruta','margen_pct'];

    } else {
      return res.status(400).json({ error: 'tipo no válido' });
    }

    const nombre = `${titulo.replace(/\s+/g, '-')}_${desde}_${hasta}`;

    if (formato === 'excel') {
      const datos = rows.map(r => {
        const o = {};
        columnas.forEach(c => { o[c] = r[c] != null ? r[c] : ''; });
        return o;
      });
      const ws = xlsx.utils.json_to_sheet(datos);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, titulo.slice(0, 31));
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${nombre}.xlsx"`);
      return res.send(buf);
    }

    if (formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nombre}.pdf"`);
      const doc = new PDFDocument({ margin: 25, size: 'A4', layout: 'landscape' });
      doc.pipe(res);

      const pageW = doc.page.width - 50;
      const colW  = Math.floor(pageW / columnas.length);
      const rowH  = 15;

      doc.fontSize(13).font('Helvetica-Bold').text(titulo, { align: 'center' });
      doc.fontSize(8).font('Helvetica').text(`Período: ${desde} al ${hasta}  |  ${rows.length} registros`, { align: 'center' });
      doc.moveDown(0.5);

      let y = doc.y;
      const drawRow = (cols, bg, fontName, fontColor) => {
        doc.rect(25, y, pageW, rowH).fill(bg);
        doc.font(fontName).fontSize(7).fill(fontColor);
        cols.forEach((val, i) => {
          doc.text(String(val ?? ''), 27 + i * colW, y + 4, { width: colW - 3, lineBreak: false });
        });
        doc.fill('black');
        y += rowH;
        if (y > doc.page.height - 40) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 25 });
          y = 30;
        }
      };

      drawRow(columnas.map(c => c.replace(/_/g,' ').toUpperCase()), '#1e293b', 'Helvetica-Bold', 'white');
      rows.forEach((row, i) => {
        drawRow(columnas.map(c => row[c]), i % 2 === 0 ? '#f8fafc' : 'white', 'Helvetica', 'black');
      });

      doc.end();
      return;
    }

    res.status(400).json({ error: 'formato debe ser excel o pdf' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getDashboard,
  getVentas,
  getVentasVendedor,
  getVentasCliente,
  getVentasProducto,
  getCompras,
  getCuentasCobrar,
  getCuentasPagar,
  getRentabilidad,
  getEstadoResultados,
  getBonosVendedores,
  getStockConsolidado,
  getKardexProducto,
  getArqueosCaja,
  getGastosCategoria,
  getTopProductos,
  exportarReporte,
};
