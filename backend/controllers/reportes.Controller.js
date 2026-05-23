const db = require('../config/db');

const hoy = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const defaultDesde = (q) => q.fecha_desde || inicioMes();
const defaultHasta = (q) => q.fecha_hasta || hoy();

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
};
