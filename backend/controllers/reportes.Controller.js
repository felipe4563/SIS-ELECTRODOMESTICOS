const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');
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
      groupBy = 'm.id_marca, m.nombre';
    } else if (agrupar === 'categoria') {
      selectGroup = `cat.id_categoria AS id_grupo, cat.nombre AS grupo`;
      groupBy = 'cat.id_categoria, cat.nombre';
    } else {
      selectGroup = `p.id_producto AS id_grupo, CONCAT(p.codigo_interno,' - ',p.producto) AS grupo`;
      groupBy = 'p.id_producto, p.codigo_interno, p.producto';
    }

    let sql = `
      SELECT ${selectGroup},
        SUM(vd.cantidad) AS cantidad_vendida,
        SUM(vd.subtotal) AS ingresos,
        SUM(COALESCE(vd.cantidad * vd.costo_unitario, 0)) AS costo_ventas,
        SUM(vd.subtotal) - SUM(COALESCE(vd.cantidad * vd.costo_unitario, 0)) AS utilidad_bruta,
        CASE WHEN SUM(vd.subtotal) > 0
          THEN ROUND((SUM(vd.subtotal) - SUM(COALESCE(vd.cantidad * vd.costo_unitario, 0))) / SUM(vd.subtotal) * 100, 2)
          ELSE 0 END AS margen_pct
      FROM venta_detalle vd
      JOIN ventas v ON v.id_venta=vd.id_venta
      JOIN productos p ON p.id_producto=vd.id_producto
      LEFT JOIN marcas m ON m.id_marca=p.id_marca
      LEFT JOIN categorias cat ON cat.id_categoria=p.id_categoria
      WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado NOT IN ('ANULADA','BORRADOR')
    `;
    const params = [desde, hasta];
    if (id_categoria) { sql += ' AND p.id_categoria=?'; params.push(id_categoria); }
    if (id_marca)     { sql += ' AND p.id_marca=?';     params.push(id_marca); }
    sql += ` GROUP BY ${groupBy} ORDER BY utilidad_bruta DESC LIMIT 200`;

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

// ── Labels legibles para columnas PDF ────────────────────────────────────
const COL_LABELS = {
  numero: 'N°', fecha: 'Fecha', fecha_pedido: 'Fecha',
  cliente: 'Cliente', vendedor: 'Vendedor', sucursal: 'Sucursal',
  condicion_pago: 'Condición', total: 'Total Bs',
  saldo_pendiente: 'Saldo Bs', estado: 'Estado',
  proveedor: 'Proveedor', codigo: 'Código', codigo_interno: 'Código',
  producto: 'Producto', marca: 'Marca', categoria: 'Categoría',
  cantidad_vendida: 'Unidades', monto_total: 'Total Bs',
  precio_promedio: 'P. Prom Bs', tipo_cliente: 'Tipo',
  telefono: 'Teléfono', limite_credito: 'Límite Bs',
  total_pendiente: 'Saldo Bs', dias_credito: 'Días créd.',
  contacto_principal: 'Contacto', plazo_credito_dias: 'Plazo días',
  deposito: 'Depósito', cantidad: 'Cantidad', disponible: 'Disponible',
  costo_promedio: 'Costo Prom.', precio_publico: 'P. Público',
  stock_minimo: 'Mínimo', grupo: 'Grupo', ingresos: 'Ingresos Bs',
  costo_ventas: 'Costo Bs', utilidad_bruta: 'Utilidad Bs',
  margen_pct: 'Margen %', num_gastos: 'N° Gastos',
  total_monto: 'Total Bs', efectivo: 'Efectivo Bs',
  otros_metodos: 'Otros Bs', num_ventas: 'N° Ventas',
  total_ventas: 'Total ventas', total_bonos: 'Bonos Bs',
};

// ── PDF Stock Consolidado por Depósito ────────────────────────────────────
async function exportarStockPDF(req, res) {
  try {
    const [[empresa]] = await db.promise().query(
      `SELECT razon_social, nombre_comercial, nit, direccion, telefono, email, logo_url
       FROM empresas WHERE activo=1 LIMIT 1`
    ).catch(() => [[null]]);

    const [depositos] = await db.promise().query(
      `SELECT d.id_deposito, d.codigo, d.nombre AS nombre_dep, s.nombre AS sucursal
       FROM depositos d
       JOIN sucursales s ON s.id_sucursal = d.id_sucursal
       WHERE d.activo = 1
       ORDER BY s.nombre, d.nombre`
    );

    const { busqueda = '', filMarca = '', filCat = '', filEstado = '' } = req.query;

    const where = ['p.activo = 1'];
    const params = [];
    if (busqueda) {
      where.push('(p.producto LIKE ? OR p.codigo_interno LIKE ? OR COALESCE(p.codigo_barras,\'\') LIKE ?)');
      const q = `%${busqueda}%`;
      params.push(q, q, q);
    }
    if (filMarca) { where.push('m.nombre = ?');   params.push(filMarca); }
    if (filCat)   { where.push('cat.nombre = ?'); params.push(filCat);   }

    const [stockRows] = await db.promise().query(
      `SELECT p.id_producto, p.codigo_interno, p.producto,
         m.nombre AS marca, cat.nombre AS categoria,
         um.codigo AS unidad,
         st.id_deposito,
         COALESCE(st.cantidad_disponible, 0) AS disponible,
         COALESCE(st.cantidad_reservada,  0) AS reservado,
         p.stock_minimo
       FROM stock st
       JOIN productos p    ON p.id_producto    = st.id_producto
       JOIN marcas m       ON m.id_marca        = p.id_marca
       JOIN categorias cat ON cat.id_categoria  = p.id_categoria
       JOIN unidades_medida um ON um.id_unidad  = p.id_unidad
       WHERE ${where.join(' AND ')}
       ORDER BY st.id_deposito, p.producto`,
      params
    );

    // Filtro por estado (requiere sumar disponible total por producto)
    let filas = stockRows;
    if (filEstado) {
      const totales = {};
      for (const r of stockRows) {
        if (!totales[r.id_producto]) totales[r.id_producto] = { min: Number(r.stock_minimo), total: 0 };
        totales[r.id_producto].total += Number(r.disponible);
      }
      const validos = new Set(
        Object.entries(totales)
          .filter(([, { min, total }]) => {
            if (filEstado === 'sin')  return total === 0;
            if (filEstado === 'bajo') return total > 0 && total <= min;
            if (filEstado === 'ok')   return total > min;
            return true;
          })
          .map(([id]) => Number(id))
      );
      filas = stockRows.filter(r => validos.has(r.id_producto));
    }

    // Agrupar por deposito
    const byDep = {};
    for (const r of filas) {
      if (!byDep[r.id_deposito]) byDep[r.id_deposito] = [];
      byDep[r.id_deposito].push(r);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="stock_consolidado_${hoy()}.pdf"`);

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape', autoFirstPage: true });
    doc.pipe(res);

    const PW = doc.page.width - 60;  // 781
    const PH = doc.page.height;       // 595
    const ML = 30;

    // Columnas: anchos suman exactamente PW=781
    const COLS = [
      { label: 'CÓDIGO',    w: 80,  align: 'left'   },
      { label: 'PRODUCTO',  w: 250, align: 'left'   },
      { label: 'MARCA',     w: 90,  align: 'left'   },
      { label: 'CATEGORÍA', w: 95,  align: 'left'   },
      { label: 'UNID.',     w: 38,  align: 'center' },
      { label: 'DISP.',     w: 55,  align: 'right'  },
      { label: 'RESERV.',   w: 55,  align: 'right'  },
      { label: 'MÍN.',      w: 48,  align: 'right'  },
      { label: 'ESTADO',    w: 70,  align: 'center' },
    ];

    const ROW_H  = 15;
    const HEAD_H = 18;

    function colX(i) {
      return ML + COLS.slice(0, i).reduce((s, c) => s + c.w, 0);
    }

    function needPage(y, extra) {
      if (y + (extra || ROW_H) > PH - 30) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
        return 30;
      }
      return y;
    }

    function drawCompanyHeader() {
      let y = 30;
      let logoW = 0;
      if (empresa?.logo_url?.startsWith('/uploads/')) {
        const logoFile = path.join(__dirname, '..', empresa.logo_url);
        if (fs.existsSync(logoFile)) {
          try { doc.image(logoFile, ML, y, { height: 46, fit: [88, 46] }); logoW = 96; }
          catch (_) {}
        }
      }
      const tx = ML + logoW;
      const nombre = empresa?.nombre_comercial || empresa?.razon_social || 'MEGAELECTRA';
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a')
         .text(nombre, tx, y, { width: PW - logoW, lineBreak: false });
      y += 16;
      doc.font('Helvetica').fontSize(8).fillColor('#64748b');
      if (empresa?.nit)       { doc.text(`NIT: ${empresa.nit}`, tx, y, { lineBreak: false }); y += 10; }
      if (empresa?.direccion) { doc.text(empresa.direccion,      tx, y, { lineBreak: false }); y += 10; }
      const cnt = [empresa?.telefono, empresa?.email].filter(Boolean).join('  ·  ');
      if (cnt)                { doc.text(cnt,                     tx, y, { lineBreak: false }); y += 10; }
      const sepY = Math.max(y, 80) + 4;
      doc.moveTo(ML, sepY).lineTo(ML + PW, sepY).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
      let ty = sepY + 8;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a')
         .text('STOCK CONSOLIDADO POR DEPÓSITO', ML, ty, { width: PW, align: 'center', lineBreak: false });
      ty += 14;
      const filtrosActivos = [
        busqueda && `Búsqueda: "${busqueda}"`,
        filMarca && `Marca: ${filMarca}`,
        filCat   && `Categoría: ${filCat}`,
        filEstado === 'sin'  && 'Estado: Sin stock',
        filEstado === 'bajo' && 'Estado: Bajo mínimo',
        filEstado === 'ok'   && 'Estado: Stock OK',
      ].filter(Boolean);
      const subtitulo = filtrosActivos.length
        ? filtrosActivos.join('  ·  ')
        : `Generado: ${new Date().toLocaleString('es-BO')}  ·  ${depositos.length} depósito${depositos.length !== 1 ? 's' : ''}`;
      doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
         .text(subtitulo, ML, ty, { width: PW, align: 'center', lineBreak: false });
      if (filtrosActivos.length) {
        ty += 11;
        doc.font('Helvetica').fontSize(7.5).fillColor('#cbd5e1')
           .text(`Generado: ${new Date().toLocaleString('es-BO')}`, ML, ty, { width: PW, align: 'center', lineBreak: false });
      }
      return ty + 16;
    }

    function drawTableHead(y) {
      doc.rect(ML, y, PW, HEAD_H).fill('#1e293b');
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('white');
      COLS.forEach((col, i) => {
        doc.text(col.label, colX(i) + 2, y + 5, { width: col.w - 4, align: col.align, lineBreak: false });
      });
      return y + HEAD_H;
    }

    function drawDataRow(prod, idx, y) {
      const disp = Number(prod.disponible);
      const res  = Number(prod.reservado);
      const min  = Number(prod.stock_minimo);
      const isOut = disp === 0;
      const isLow = disp > 0 && disp <= min;
      const bg = isOut ? '#fff1f2' : isLow ? '#fff7ed' : idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(ML, y, PW, ROW_H).fill(bg);
      doc.font('Helvetica').fontSize(6.8).fillColor('#334155');
      const vals = [
        prod.codigo_interno,
        prod.producto,
        prod.marca,
        prod.categoria,
        prod.unidad,
        disp.toLocaleString('es-BO'),
        res > 0 ? res.toLocaleString('es-BO') : '—',
        min.toLocaleString('es-BO'),
      ];
      vals.forEach((v, i) => {
        doc.text(String(v ?? ''), colX(i) + 2, y + 4, { width: COLS[i].w - 4, align: COLS[i].align, lineBreak: false });
      });
      const eLabel = isOut ? 'Sin stock' : isLow ? 'Bajo mín.' : 'OK';
      const eColor = isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a';
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(eColor)
         .text(eLabel, colX(8) + 2, y + 4, { width: COLS[8].w - 4, align: 'center', lineBreak: false });
      return y + ROW_H;
    }

    let y = drawCompanyHeader();

    for (let di = 0; di < depositos.length; di++) {
      const dep   = depositos[di];
      const prods = byDep[dep.id_deposito] || [];

      if (di > 0) y += 6;
      // Espacio mínimo: cabecera sección + cabecera tabla + 1 fila
      y = needPage(y, 22 + HEAD_H + ROW_H);

      // Cabecera de sección (depósito)
      doc.rect(ML, y, PW, 22).fill('#1e293b');
      const depLabel = dep.codigo ? `${dep.codigo} – ${dep.nombre_dep}` : dep.nombre_dep;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#fbbf24')
         .text(depLabel, ML + 8, y + 3, { lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8')
         .text(`Sucursal: ${dep.sucursal}  ·  ${prods.length} producto${prods.length !== 1 ? 's' : ''}`,
               ML + 8, y + 13, { lineBreak: false });
      y += 22;

      if (prods.length === 0) {
        y = needPage(y, 16);
        doc.rect(ML, y, PW, 16).fill('#f8fafc');
        doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8')
           .text('Sin productos con stock en este depósito', ML + 8, y + 4, { lineBreak: false });
        y += 16;
        continue;
      }

      y = drawTableHead(y);

      for (let i = 0; i < prods.length; i++) {
        const prev = y;
        y = needPage(y);
        if (y !== prev) y = drawTableHead(y);
        y = drawDataRow(prods[i], i, y);
      }

      // Fila resumen del depósito
      y = needPage(y, 14);
      const totDisp = prods.reduce((s, p) => s + Number(p.disponible), 0);
      const sinStk  = prods.filter(p => Number(p.disponible) === 0).length;
      const bajMin  = prods.filter(p => Number(p.disponible) > 0 && Number(p.disponible) <= Number(p.stock_minimo)).length;
      doc.rect(ML, y, PW, 14).fill('#e2e8f0');
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#475569')
         .text(`Total disponible: ${totDisp.toLocaleString('es-BO')}  ·  Sin stock: ${sinStk}  ·  Bajo mínimo: ${bajMin}`,
               ML + 8, y + 4, { lineBreak: false });
      y += 14;
    }

    doc.font('Helvetica').fontSize(7).fillColor('#cbd5e1')
       .text(`Stock Consolidado · ${new Date().toLocaleDateString('es-BO')}`,
             ML, PH - 20, { width: PW, align: 'right', lineBreak: false });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}

// ── Exportar reporte PDF ───────────────────────────────────────────────────
async function exportarReporte(req, res) {
  try {
    const { tipo } = req.query;
    if (tipo === 'stock') return exportarStockPDF(req, res);
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

    // ── Datos de empresa ────────────────────────────────────────────────────
    const [[empresa]] = await db.promise().query(
      `SELECT razon_social, nombre_comercial, nit, direccion, telefono, email, logo_url
       FROM empresas WHERE activo=1 LIMIT 1`
    ).catch(() => [[null]]);

    const nombre = `${titulo.replace(/\s+/g, '-')}_${desde}_${hasta}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}.pdf"`);

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    const pageW   = doc.page.width  - 60;
    const marginL = 30;
    const colW    = Math.floor(pageW / columnas.length);
    const rowH    = 15;

    // ── Encabezado empresa ──────────────────────────────────────────────────
    const headerTop = 30;
    let logoW = 0;

    if (empresa?.logo_url && empresa.logo_url.startsWith('/uploads/')) {
      const logoFile = path.join(__dirname, '..', empresa.logo_url);
      if (fs.existsSync(logoFile)) {
        try {
          doc.image(logoFile, marginL, headerTop, { height: 52, fit: [100, 52] });
          logoW = 108;
        } catch (_) { /* skip si imagen no soportada */ }
      }
    }

    const textX    = marginL + logoW;
    const nombreEm = empresa?.nombre_comercial || empresa?.razon_social || 'MEGAELECTRA';
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a')
       .text(nombreEm, textX, headerTop, { width: pageW - logoW });

    let infoY = headerTop + 18;
    doc.font('Helvetica').fontSize(8).fillColor('#475569');
    if (empresa?.nit)       { doc.text(`NIT: ${empresa.nit}`,           textX, infoY); infoY += 11; }
    if (empresa?.direccion) { doc.text(empresa.direccion,               textX, infoY); infoY += 11; }
    const contacto = [empresa?.telefono, empresa?.email].filter(Boolean).join('  ·  ');
    if (contacto)           { doc.text(contacto,                         textX, infoY); infoY += 11; }

    // Línea separadora
    const sepY = Math.max(infoY, headerTop + 56) + 6;
    doc.moveTo(marginL, sepY).lineTo(marginL + pageW, sepY)
       .strokeColor('#e2e8f0').lineWidth(1).stroke();

    // ── Título del reporte ──────────────────────────────────────────────────
    let titleY = sepY + 10;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a')
       .text(titulo.toUpperCase(), marginL, titleY, { width: pageW, align: 'center' });
    titleY += 16;
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
       .text(`Período: ${desde}  al  ${hasta}   ·   ${rows.length} registro${rows.length !== 1 ? 's' : ''}`, marginL, titleY, { width: pageW, align: 'center' });
    titleY += 14;

    // ── Tabla ───────────────────────────────────────────────────────────────
    let y = titleY + 4;

    const drawRow = (vals, bg, fontName, fontColor) => {
      doc.rect(marginL, y, pageW, rowH).fill(bg);
      doc.font(fontName).fontSize(7).fillColor(fontColor);
      vals.forEach((val, i) => {
        doc.text(String(val ?? ''), marginL + 2 + i * colW, y + 4, { width: colW - 4, lineBreak: false });
      });
      doc.fillColor('black');
      y += rowH;
      if (y > doc.page.height - 40) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
        y = 30;
      }
    };

    const headers = columnas.map(c => (COL_LABELS[c] || c.replace(/_/g, ' ')).toUpperCase());
    drawRow(headers, '#1e293b', 'Helvetica-Bold', 'white');
    rows.forEach((row, i) => {
      drawRow(columnas.map(c => row[c]), i % 2 === 0 ? '#f8fafc' : 'white', 'Helvetica', '#1e293b');
    });

    // Pie de página
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
       .text(`Generado el ${new Date().toLocaleString('es-BO')}`, marginL, doc.page.height - 25, { width: pageW, align: 'right' });

    doc.end();
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
