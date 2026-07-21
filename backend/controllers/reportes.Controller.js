const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');
const PDFDocument = require('pdfkit');
const { isValidDate } = require('../utils/validators');
const { tiene_permiso } = require('../middlewares/authMiddleware');

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
    const puedeVerTodas = tiene_permiso(req, 'dashboard', 'ver_todas_sucursales');
    const puedeVer      = tiene_permiso(req, 'dashboard', 'ver');

    if (!puedeVer && !puedeVerTodas) {
      return res.status(403).json({ error: 'Sin permiso para ver el dashboard' });
    }

    // Ver_todas_sucursales: usa filtro de query (null = todas).
    // Solo ver: fuerza la sucursal propia.
    const id_sucursal = puedeVerTodas
      ? (req.query.id_sucursal || null)
      : (req.user.id_sucursal || null);

    const filtroV  = id_sucursal ? ' AND id_sucursal=?' : '';
    const filtroVC = id_sucursal ? ' AND v.id_sucursal=?' : '';
    const filtroC  = id_sucursal ? ' AND id_sucursal=?' : '';
    const ps       = id_sucursal ? [id_sucursal] : [];

    const [[ventasHoy]] = await db.promise().query(`
      SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad
      FROM ventas WHERE DATE(fecha) = CURDATE() AND estado NOT IN ('ANULADA','BORRADOR') ${filtroV}
    `, ps);

    const [[ventasMes]] = await db.promise().query(`
      SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad
      FROM ventas WHERE YEAR(fecha)=YEAR(CURDATE()) AND MONTH(fecha)=MONTH(CURDATE())
        AND estado NOT IN ('ANULADA','BORRADOR') ${filtroV}
    `, ps);

    const [[comprasMes]] = await db.promise().query(`
      SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad
      FROM compras WHERE YEAR(fecha_pedido)=YEAR(CURDATE()) AND MONTH(fecha_pedido)=MONTH(CURDATE())
        AND estado != 'ANULADO' ${filtroC}
    `, ps);

    const [[alertas]] = id_sucursal
      ? await db.promise().query(`
          SELECT COUNT(*) AS cantidad FROM alertas_stock a
          JOIN depositos d ON d.id_deposito=a.id_deposito
          WHERE a.atendida=0 AND d.id_sucursal=?
        `, [id_sucursal])
      : await db.promise().query(`SELECT COUNT(*) AS cantidad FROM alertas_stock WHERE atendida=0`);

    const [[arqueos]] = id_sucursal
      ? await db.promise().query(`
          SELECT COUNT(*) AS cantidad FROM arqueos_caja a
          JOIN cajas c ON c.id_caja=a.id_caja
          WHERE a.estado='ABIERTA' AND c.id_sucursal=?
        `, [id_sucursal])
      : await db.promise().query(`SELECT COUNT(*) AS cantidad FROM arqueos_caja WHERE estado='ABIERTA'`);

    const [topProductos] = await db.promise().query(`
      SELECT p.producto, p.codigo_interno,
        SUM(vd.cantidad) AS cantidad_vendida, SUM(vd.subtotal) AS monto_total
      FROM venta_detalle vd
      JOIN ventas v ON v.id_venta=vd.id_venta
      JOIN productos p ON p.id_producto=vd.id_producto
      WHERE YEAR(v.fecha)=YEAR(CURDATE()) AND MONTH(v.fecha)=MONTH(CURDATE())
        AND v.estado NOT IN ('ANULADA','BORRADOR') ${filtroVC}
      GROUP BY vd.id_producto, p.producto, p.codigo_interno
      ORDER BY cantidad_vendida DESC LIMIT 5
    `, ps);

    const [ventasDiarias] = await db.promise().query(`
      SELECT DATE(fecha) AS dia, COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad
      FROM ventas
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        AND estado NOT IN ('ANULADA','BORRADOR') ${filtroV}
      GROUP BY DATE(fecha) ORDER BY dia
    `, ps);

    const [[cuentasCobrar]] = await db.promise().query(
      `SELECT COALESCE(SUM(saldo_actual),0) AS total FROM clientes WHERE saldo_actual > 0`
    );
    const [[cuentasPagar]] = await db.promise().query(
      `SELECT COALESCE(SUM(saldo_actual),0) AS total FROM proveedores WHERE saldo_actual > 0`
    );

    // Solo incluir lista de sucursales para quien puede filtrar por todas
    let sucursales = [];
    if (puedeVerTodas) {
      [sucursales] = await db.promise().query(
        `SELECT id_sucursal, nombre, tipo FROM sucursales WHERE activo = 1 ORDER BY tipo DESC, nombre ASC`
      );
    }

    // Sucursal + punto de venta del usuario logueado
    let sucursalUsuario = null;
    if (req.user.id_sucursal) {
      const [[suc]] = await db.promise().query(
        `SELECT s.id_sucursal, s.nombre AS sucursal_nombre, s.tipo AS sucursal_tipo, s.ciudad,
                d.id_deposito, d.nombre AS deposito_nombre, d.tipo AS deposito_tipo
         FROM sucursales s
         LEFT JOIN depositos d ON d.id_sucursal = s.id_sucursal AND d.activo = 1
         WHERE s.id_sucursal = ? AND s.activo = 1
         ORDER BY (d.tipo = 'PUNTO_VENTA') DESC
         LIMIT 1`,
        [req.user.id_sucursal]
      );
      if (suc) sucursalUsuario = suc;
    }

    res.json({
      ventasHoy,
      ventasMes,
      comprasMes,
      alertas:       alertas.cantidad,
      arqueos:       arqueos.cantidad,
      cuentasCobrar: cuentasCobrar.total,
      cuentasPagar:  cuentasPagar.total,
      topProductos,
      ventasDiarias,
      id_sucursal_filtro: id_sucursal,
      sucursales,
      sucursalUsuario,
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
        COALESCE(SUM(c.saldo_pendiente), 0) AS total_pendiente
      FROM proveedores pr
      JOIN compras c ON c.id_proveedor = pr.id_proveedor
        AND c.condicion_pago = 'CREDITO'
        AND c.estado IN ('POR_LLEGAR','PARCIAL','RECIBIDO')
      GROUP BY pr.id_proveedor, pr.codigo, pr.razon_social, pr.contacto_principal, pr.telefono, pr.plazo_credito_dias
      HAVING total_pendiente > 0
      ORDER BY total_pendiente DESC
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

// ── Bonos por vendedor — detalle por producto ──────────────────────────────
async function getBonosVendedoresDetalle(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT
        u.id_usuario,
        CONCAT(u.nombres,' ',u.apellidos) AS vendedor,
        s.nombre AS sucursal,
        v.id_venta,
        v.numero   AS numero_venta,
        DATE_FORMAT(v.fecha,'%Y-%m-%d') AS fecha_venta,
        p.codigo_interno,
        p.producto,
        COALESCE(m.nombre,'') AS marca,
        COALESCE(vd.numero_serie,'')  AS numero_serie,
        vd.cantidad,
        vd.precio_unitario,
        vd.descuento_porc,
        vd.subtotal,
        COALESCE(vd.bono_vendedor,0) AS bono_vendedor
      FROM venta_detalle vd
      JOIN ventas v      ON v.id_venta      = vd.id_venta
      JOIN usuarios u    ON u.id_usuario    = v.id_vendedor
      JOIN sucursales s  ON s.id_sucursal   = v.id_sucursal
      JOIN productos p   ON p.id_producto   = vd.id_producto
      LEFT JOIN marcas m ON m.id_marca      = p.id_marca
      WHERE DATE(v.fecha) BETWEEN ? AND ?
        AND v.estado NOT IN ('ANULADA','BORRADOR')
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND v.id_sucursal = ?'; params.push(id_sucursal); }
    sql += ' ORDER BY u.apellidos ASC, u.nombres ASC, v.fecha ASC, vd.id_detalle ASC';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
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
      SELECT k.id_kardex,
        DATE_FORMAT(k.fecha,'%Y-%m-%d %H:%i') AS fecha,
        tm.nombre AS tipo_movimiento, tm.efecto,
        d.nombre AS deposito,
        k.cantidad, k.costo_unitario,
        k.saldo_cantidad, k.saldo_costo,
        k.documento_tipo, k.documento_numero,
        k.observaciones,
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

    const { busqueda = '', filMarca = '', filCat = '', filEstado = '', id_sucursal = '', con_stock = '' } = req.query;

    const [depositos] = await db.promise().query(
      `SELECT d.id_deposito, d.codigo, d.nombre AS nombre_dep, s.nombre AS sucursal
       FROM depositos d
       JOIN sucursales s ON s.id_sucursal = d.id_sucursal
       WHERE d.activo = 1${id_sucursal ? ' AND d.id_sucursal = ?' : ''}
       ORDER BY s.nombre, d.nombre`,
      id_sucursal ? [id_sucursal] : []
    );

    const where = ['p.activo = 1'];
    const params = [];
    if (busqueda) {
      where.push('(p.producto LIKE ? OR p.codigo_interno LIKE ? OR COALESCE(p.codigo_barras,\'\') LIKE ?)');
      const q = `%${busqueda}%`;
      params.push(q, q, q);
    }
    if (filMarca) { where.push('m.nombre = ?');   params.push(filMarca); }
    if (filCat)   { where.push('cat.nombre = ?'); params.push(filCat);   }
    if (id_sucursal) { where.push('st.id_deposito IN (SELECT id_deposito FROM depositos WHERE id_sucursal = ?)'); params.push(id_sucursal); }
    if (con_stock === '1') { where.push('st.cantidad > 0'); }

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
      const sucursalNombre = id_sucursal && depositos.length > 0 ? depositos[0].sucursal : null;
      const filtrosActivos = [
        sucursalNombre       && `Sucursal: ${sucursalNombre}`,
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

// ── Helpers PDF compartidos ────────────────────────────────────────────────
async function getEmpresaData() {
  const [[emp]] = await db.promise().query(
    `SELECT razon_social, nombre_comercial, nit, direccion, telefono, email, logo_url
     FROM empresas WHERE activo=1 LIMIT 1`
  ).catch(() => [[null]]);
  return emp;
}

function drawPdfHeader(doc, empresa, titulo, subtitulo) {
  const marginL = 30;
  const pageW   = doc.page.width - 60;
  let logoW = 0;
  if (empresa?.logo_url && empresa.logo_url.startsWith('/uploads/')) {
    const logoFile = path.join(__dirname, '..', empresa.logo_url);
    if (fs.existsSync(logoFile)) {
      try { doc.image(logoFile, marginL, 30, { height: 48, fit: [90, 48] }); logoW = 98; } catch (_) {}
    }
  }
  const textX = marginL + logoW;
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a')
     .text(empresa?.nombre_comercial || empresa?.razon_social || '', textX, 30, { width: pageW - logoW });
  let iy = 46;
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
  if (empresa?.nit)       { doc.text(`NIT: ${empresa.nit}`,    textX, iy); iy += 10; }
  if (empresa?.direccion) { doc.text(empresa.direccion,         textX, iy); iy += 10; }
  const ct = [empresa?.telefono, empresa?.email].filter(Boolean).join('  ·  ');
  if (ct) { doc.text(ct, textX, iy); iy += 10; }
  const sepY = Math.max(iy, 82) + 4;
  doc.moveTo(marginL, sepY).lineTo(marginL + pageW, sepY).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
  let ty = sepY + 10;
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a')
     .text(titulo.toUpperCase(), marginL, ty, { width: pageW, align: 'center' });
  ty += 16;
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
     .text(subtitulo, marginL, ty, { width: pageW, align: 'center' });
  return ty + 18;
}

function drawSummaryBoxes(doc, boxes, y) {
  const marginL = 30;
  const pageW   = doc.page.width - 60;
  const bw = Math.floor(pageW / boxes.length) - 4;
  boxes.forEach((b, i) => {
    const bx = marginL + i * (bw + 4);
    doc.roundedRect(bx, y, bw, 34, 4).fill('#f1f5f9');
    doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(b.label.toUpperCase(), bx + 6, y + 7, { width: bw - 12 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(b.color || '#0f172a').text(b.valor, bx + 6, y + 18, { width: bw - 12 });
  });
  return y + 44;
}

// ── Cuentas por Cobrar PDF detallado ───────────────────────────────────────
async function exportarCuentasCobrarPDF(req, res) {
  try {
    const empresa = await getEmpresaData();

    // Clientes con saldo pendiente
    const [clientes] = await db.promise().query(`
      SELECT c.id_cliente, c.codigo,
        COALESCE(c.razon_social, CONCAT(c.nombres,' ',c.apellidos)) AS cliente,
        c.tipo_cliente, c.telefono, c.limite_credito, c.dias_credito,
        c.saldo_actual AS total_pendiente
      FROM clientes c
      WHERE c.saldo_actual > 0
      ORDER BY c.saldo_actual DESC
    `);

    if (clientes.length === 0) {
      // Devuelve PDF vacío con mensaje
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="cuentas-cobrar.pdf"');
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      doc.pipe(res);
      const y0 = drawPdfHeader(doc, empresa, 'Cuentas por Cobrar', `Generado: ${new Date().toLocaleString('es-BO')}`);
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('No hay cuentas por cobrar pendientes.', 30, y0 + 20, { align: 'center', width: doc.page.width - 60 });
      doc.end(); return;
    }

    // Ventas pendientes por cliente
    const ids = clientes.map(c => c.id_cliente);
    const [ventas] = await db.promise().query(`
      SELECT v.id_cliente, v.numero, DATE_FORMAT(v.fecha,'%d/%m/%Y') AS fecha,
        v.total, v.saldo_pendiente,
        COALESCE(DATE_FORMAT(DATE_ADD(v.fecha, INTERVAL c.dias_credito DAY),'%d/%m/%Y'), '—') AS vencimiento,
        v.estado
      FROM ventas v
      JOIN clientes c ON c.id_cliente = v.id_cliente
      WHERE v.id_cliente IN (?) AND v.condicion_pago='CREDITO'
        AND v.saldo_pendiente > 0 AND v.estado NOT IN ('ANULADA','BORRADOR')
      ORDER BY v.id_cliente, v.fecha DESC
    `, [ids]);

    const ventasPorCliente = {};
    ventas.forEach(v => {
      if (!ventasPorCliente[v.id_cliente]) ventasPorCliente[v.id_cliente] = [];
      ventasPorCliente[v.id_cliente].push(v);
    });

    const totalGeneral = clientes.reduce((a, c) => a + Number(c.total_pendiente), 0);
    const fmt = n => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="cuentas-cobrar.pdf"');
    const doc = new PDFDocument({ margin: 30, size: 'A4', autoFirstPage: true });
    doc.pipe(res);

    const ML = 30, PW = doc.page.width - 60;
    const fechaGen = new Date().toLocaleString('es-BO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    let y = drawPdfHeader(doc, empresa, 'Cuentas por Cobrar', `Generado: ${fechaGen}   ·   ${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} con saldo pendiente`);

    y = drawSummaryBoxes(doc, [
      { label: 'Clientes con deuda',   valor: String(clientes.length), color: '#0f172a' },
      { label: 'Total por cobrar',     valor: `Bs ${fmt(totalGeneral)}`, color: '#dc2626' },
    ], y);

    // Columnas cabecera tabla de clientes
    const COLS_C = [
      { key: 'codigo',          w: 50,  label: 'CÓDIGO',         align: 'left' },
      { key: 'cliente',         w: 160, label: 'CLIENTE',        align: 'left' },
      { key: 'tipo_cliente',    w: 55,  label: 'TIPO',           align: 'left' },
      { key: 'telefono',        w: 70,  label: 'TELÉFONO',       align: 'left' },
      { key: 'limite_credito',  w: 65,  label: 'LÍMITE Bs',      align: 'right' },
      { key: 'dias_credito',    w: 45,  label: 'DÍAS CRED.',     align: 'right' },
      { key: 'total_pendiente', w: 70,  label: 'SALDO Bs',       align: 'right' },
    ];
    const COLS_V = [
      { key: 'numero',          w: 100, label: 'N° VENTA',       align: 'left' },
      { key: 'fecha',           w: 70,  label: 'FECHA',          align: 'left' },
      { key: 'vencimiento',     w: 70,  label: 'VENCIMIENTO',    align: 'left' },
      { key: 'total',           w: 80,  label: 'TOTAL Bs',       align: 'right' },
      { key: 'saldo_pendiente', w: 80,  label: 'PENDIENTE Bs',   align: 'right' },
      { key: 'estado',          w: 65,  label: 'ESTADO',         align: 'left' },
    ];

    const checkPage = (needed = 14) => {
      if (y + needed > doc.page.height - 40) {
        doc.addPage({ size: 'A4', margin: 30 });
        y = 30;
      }
    };

    const drawHdr = (cols, bgColor, textColor, indent = 0) => {
      let x = ML + indent;
      doc.rect(x, y, PW - indent, 14).fill(bgColor);
      cols.forEach(c => {
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textColor)
           .text(c.label, x + 3, y + 4, { width: c.w - 6, align: c.align, lineBreak: false });
        x += c.w;
      });
      y += 14;
    };

    const drawDataRow = (cols, vals, bgColor, fontColor, indent = 0, rowH = 13) => {
      let x = ML + indent;
      doc.rect(x, y, PW - indent, rowH).fill(bgColor);
      cols.forEach(c => {
        const v = vals[c.key] ?? '';
        doc.font('Helvetica').fontSize(7).fillColor(fontColor)
           .text(String(v), x + 3, y + 3, { width: c.w - 6, align: c.align, lineBreak: false });
        x += c.w;
      });
      y += rowH;
    };

    // Cabecera tabla principal
    checkPage(20);
    drawHdr(COLS_C, '#1e293b', 'white');

    clientes.forEach((cl, idx) => {
      const vts = ventasPorCliente[cl.id_cliente] || [];
      const rowsNeeded = 14 + (vts.length > 0 ? 12 + vts.length * 12 : 0);
      checkPage(rowsNeeded);

      // Fila cliente
      drawDataRow(COLS_C, { ...cl, total_pendiente: fmt(cl.total_pendiente), limite_credito: fmt(cl.limite_credito) },
        idx % 2 === 0 ? '#f8fafc' : 'white', '#0f172a');

      // Sub-filas de ventas
      if (vts.length > 0) {
        // Mini cabecera ventas
        let x = ML + 15;
        doc.rect(x, y, PW - 15, 12).fill('#e2e8f0');
        COLS_V.forEach(c => {
          doc.font('Helvetica-Bold').fontSize(6).fillColor('#475569')
             .text(c.label, x + 2, y + 3, { width: c.w - 4, align: c.align, lineBreak: false });
          x += c.w;
        });
        y += 12;

        vts.forEach(v => {
          checkPage(12);
          drawDataRow(COLS_V, { ...v, total: fmt(v.total), saldo_pendiente: fmt(v.saldo_pendiente) },
            '#fafafa', '#374151', 15, 12);
        });
      }
    });

    // Fila de total
    checkPage(16);
    const totX = ML;
    doc.rect(totX, y, PW, 16).fill('#0f172a');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('white')
       .text('TOTAL GENERAL', totX + 3, y + 4, { width: PW - 80, lineBreak: false })
       .text(`Bs ${fmt(totalGeneral)}`, totX + PW - 77, y + 4, { width: 74, align: 'right', lineBreak: false });
    y += 16;

    // Pie
    y += 8;
    doc.font('Helvetica').fontSize(6.5).fillColor('#94a3b8')
       .text(`${empresa?.razon_social || ''}  ·  Documento generado por el sistema  ·  ${fechaGen}`,
         ML, y, { width: PW, align: 'center' });

    doc.end();
  } catch (err) {
    console.error('[exportarCuentasCobrarPDF]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}

// ── Cuentas por Pagar PDF detallado ────────────────────────────────────────
async function exportarCuentasPagarPDF(req, res) {
  try {
    const empresa = await getEmpresaData();

    const [proveedores] = await db.promise().query(`
      SELECT pr.id_proveedor, pr.codigo, pr.razon_social AS proveedor,
        pr.contacto_principal, pr.telefono, pr.plazo_credito_dias,
        COALESCE(SUM(c.saldo_pendiente), 0) AS total_pendiente
      FROM proveedores pr
      JOIN compras c ON c.id_proveedor = pr.id_proveedor
        AND c.condicion_pago = 'CREDITO'
        AND c.estado IN ('POR_LLEGAR','PARCIAL','RECIBIDO')
      GROUP BY pr.id_proveedor, pr.codigo, pr.razon_social, pr.contacto_principal, pr.telefono, pr.plazo_credito_dias
      HAVING total_pendiente > 0
      ORDER BY total_pendiente DESC
    `);

    if (proveedores.length === 0) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="cuentas-pagar.pdf"');
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      doc.pipe(res);
      const y0 = drawPdfHeader(doc, empresa, 'Cuentas por Pagar', `Generado: ${new Date().toLocaleString('es-BO')}`);
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('No hay cuentas por pagar pendientes.', 30, y0 + 20, { align: 'center', width: doc.page.width - 60 });
      doc.end(); return;
    }

    const ids = proveedores.map(p => p.id_proveedor);
    const [compras] = await db.promise().query(`
      SELECT c.id_proveedor, c.numero, DATE_FORMAT(c.fecha_pedido,'%d/%m/%Y') AS fecha_pedido,
        c.total, c.saldo_pendiente, c.estado, c.dias_credito,
        COALESCE(DATE_FORMAT(DATE_ADD(c.fecha_pedido, INTERVAL c.dias_credito DAY),'%d/%m/%Y'), '—') AS vencimiento
      FROM compras c
      WHERE c.id_proveedor IN (?) AND c.condicion_pago='CREDITO'
        AND c.saldo_pendiente > 0 AND c.estado IN ('POR_LLEGAR','PARCIAL','RECIBIDO')
      ORDER BY c.id_proveedor, c.fecha_pedido DESC
    `, [ids]);

    const comprasPorProv = {};
    compras.forEach(c => {
      if (!comprasPorProv[c.id_proveedor]) comprasPorProv[c.id_proveedor] = [];
      comprasPorProv[c.id_proveedor].push(c);
    });

    const totalGeneral = proveedores.reduce((a, p) => a + Number(p.total_pendiente), 0);
    const fmt = n => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="cuentas-pagar.pdf"');
    const doc = new PDFDocument({ margin: 30, size: 'A4', autoFirstPage: true });
    doc.pipe(res);

    const ML = 30, PW = doc.page.width - 60;
    const fechaGen = new Date().toLocaleString('es-BO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    let y = drawPdfHeader(doc, empresa, 'Cuentas por Pagar', `Generado: ${fechaGen}   ·   ${proveedores.length} proveedor${proveedores.length !== 1 ? 'es' : ''} con saldo pendiente`);

    y = drawSummaryBoxes(doc, [
      { label: 'Proveedores con deuda', valor: String(proveedores.length), color: '#0f172a' },
      { label: 'Total por pagar',       valor: `Bs ${fmt(totalGeneral)}`, color: '#dc2626' },
    ], y);

    const COLS_P = [
      { key: 'codigo',           w: 50,  label: 'CÓDIGO',       align: 'left' },
      { key: 'proveedor',        w: 165, label: 'PROVEEDOR',    align: 'left' },
      { key: 'contacto_principal', w: 90, label: 'CONTACTO',   align: 'left' },
      { key: 'telefono',         w: 70,  label: 'TELÉFONO',    align: 'left' },
      { key: 'plazo_credito_dias', w: 50, label: 'PLAZO días', align: 'right' },
      { key: 'total_pendiente',  w: 70,  label: 'SALDO Bs',    align: 'right' },
    ];
    const COLS_C = [
      { key: 'numero',          w: 100, label: 'N° COMPRA',    align: 'left' },
      { key: 'fecha_pedido',    w: 70,  label: 'FECHA',         align: 'left' },
      { key: 'vencimiento',     w: 70,  label: 'VENCIMIENTO',   align: 'left' },
      { key: 'total',           w: 80,  label: 'TOTAL Bs',      align: 'right' },
      { key: 'saldo_pendiente', w: 80,  label: 'PENDIENTE Bs',  align: 'right' },
      { key: 'estado',          w: 65,  label: 'ESTADO',        align: 'left' },
    ];

    const checkPage = (needed = 14) => {
      if (y + needed > doc.page.height - 40) {
        doc.addPage({ size: 'A4', margin: 30 });
        y = 30;
      }
    };

    const drawHdr = (cols, bgColor, textColor, indent = 0) => {
      let x = ML + indent;
      doc.rect(x, y, PW - indent, 14).fill(bgColor);
      cols.forEach(c => {
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textColor)
           .text(c.label, x + 3, y + 4, { width: c.w - 6, align: c.align, lineBreak: false });
        x += c.w;
      });
      y += 14;
    };

    const drawDataRow = (cols, vals, bgColor, fontColor, indent = 0, rowH = 13) => {
      let x = ML + indent;
      doc.rect(x, y, PW - indent, rowH).fill(bgColor);
      cols.forEach(c => {
        const v = vals[c.key] ?? '';
        doc.font('Helvetica').fontSize(7).fillColor(fontColor)
           .text(String(v), x + 3, y + 3, { width: c.w - 6, align: c.align, lineBreak: false });
        x += c.w;
      });
      y += rowH;
    };

    checkPage(20);
    drawHdr(COLS_P, '#1e293b', 'white');

    proveedores.forEach((pv, idx) => {
      const cmps = comprasPorProv[pv.id_proveedor] || [];
      const rowsNeeded = 14 + (cmps.length > 0 ? 12 + cmps.length * 12 : 0);
      checkPage(rowsNeeded);

      drawDataRow(COLS_P, { ...pv, total_pendiente: fmt(pv.total_pendiente) },
        idx % 2 === 0 ? '#f8fafc' : 'white', '#0f172a');

      if (cmps.length > 0) {
        let x = ML + 15;
        doc.rect(x, y, PW - 15, 12).fill('#e2e8f0');
        COLS_C.forEach(c => {
          doc.font('Helvetica-Bold').fontSize(6).fillColor('#475569')
             .text(c.label, x + 2, y + 3, { width: c.w - 4, align: c.align, lineBreak: false });
          x += c.w;
        });
        y += 12;

        cmps.forEach(c => {
          checkPage(12);
          drawDataRow(COLS_C, { ...c, total: fmt(c.total), saldo_pendiente: fmt(c.saldo_pendiente) },
            '#fafafa', '#374151', 15, 12);
        });
      }
    });

    checkPage(16);
    const totX = ML;
    doc.rect(totX, y, PW, 16).fill('#0f172a');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('white')
       .text('TOTAL GENERAL', totX + 3, y + 4, { width: PW - 80, lineBreak: false })
       .text(`Bs ${fmt(totalGeneral)}`, totX + PW - 77, y + 4, { width: 74, align: 'right', lineBreak: false });
    y += 16;
    y += 8;
    doc.font('Helvetica').fontSize(6.5).fillColor('#94a3b8')
       .text(`${empresa?.razon_social || ''}  ·  Documento generado por el sistema  ·  ${fechaGen}`,
         ML, y, { width: PW, align: 'center' });

    doc.end();
  } catch (err) {
    console.error('[exportarCuentasPagarPDF]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}

// ── Transferencias PDF detallado ───────────────────────────────────────────
async function exportarTransferenciasPDF(req, res) {
  try {
    const empresa = await getEmpresaData();
    const desde   = req.query.fecha_desde || inicioMes();
    const hasta   = req.query.fecha_hasta || hoy();
    const { id_sucursal, estado } = req.query;

    let sql = `
      SELECT t.id_transferencia, t.numero,
        DATE_FORMAT(t.fecha_solicitud,'%d/%m/%Y %H:%i') AS fecha_solicitud,
        DATE_FORMAT(t.fecha_envio,'%d/%m/%Y %H:%i')     AS fecha_envio,
        DATE_FORMAT(t.fecha_recepcion,'%d/%m/%Y %H:%i') AS fecha_recepcion,
        dor.nombre AS deposito_origen,  sor.nombre AS sucursal_origen,
        dde.nombre AS deposito_destino, sde.nombre AS sucursal_destino,
        t.estado, t.observaciones,
        COUNT(td.id_detalle)                 AS num_productos,
        COALESCE(SUM(td.cantidad_enviada),0) AS total_enviado,
        CONCAT(us.nombres,' ',us.apellidos)  AS solicitante,
        CONCAT(ue.nombres,' ',ue.apellidos)  AS enviado_por,
        CONCAT(ur.nombres,' ',ur.apellidos)  AS recibido_por
      FROM transferencias t
      JOIN depositos dor  ON dor.id_deposito = t.id_deposito_origen
      JOIN sucursales sor ON sor.id_sucursal  = dor.id_sucursal
      JOIN depositos dde  ON dde.id_deposito = t.id_deposito_destino
      JOIN sucursales sde ON sde.id_sucursal  = dde.id_sucursal
      LEFT JOIN transferencia_detalle td ON td.id_transferencia = t.id_transferencia
      LEFT JOIN usuarios us ON us.id_usuario = t.id_usuario_solicita
      LEFT JOIN usuarios ue ON ue.id_usuario = t.id_usuario_envia
      LEFT JOIN usuarios ur ON ur.id_usuario = t.id_usuario_recibe
      WHERE DATE(t.fecha_solicitud) BETWEEN ? AND ?
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND (sor.id_sucursal=? OR sde.id_sucursal=?)'; params.push(id_sucursal, id_sucursal); }
    if (estado)      { sql += ' AND t.estado=?'; params.push(estado); }
    sql += ' GROUP BY t.id_transferencia ORDER BY t.fecha_solicitud DESC LIMIT 500';

    const [transferencias] = await db.promise().query(sql, params);
    const fechaGen = new Date().toLocaleString('es-BO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="transferencias.pdf"');

    if (transferencias.length === 0) {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      doc.pipe(res);
      const y0 = drawPdfHeader(doc, empresa, 'Reporte de Transferencias', `Período: ${desde} al ${hasta}   ·   Generado: ${fechaGen}`);
      doc.font('Helvetica').fontSize(9).fillColor('#64748b')
         .text('Sin transferencias en el período seleccionado.', 30, y0 + 20, { align: 'center', width: doc.page.width - 60 });
      doc.end(); return;
    }

    // Detalle de productos por transferencia
    const ids = transferencias.map(t => t.id_transferencia);
    const [detalles] = await db.promise().query(`
      SELECT td.id_transferencia, p.codigo_interno, p.producto AS nombre_producto,
        td.cantidad_enviada, COALESCE(td.cantidad_recibida, 0) AS cantidad_recibida,
        (td.cantidad_enviada - COALESCE(td.cantidad_recibida, 0)) AS diferencia,
        td.observacion
      FROM transferencia_detalle td
      JOIN productos p ON p.id_producto = td.id_producto
      WHERE td.id_transferencia IN (?)
      ORDER BY td.id_transferencia, p.producto
    `, [ids]);

    const detPor = {};
    detalles.forEach(d => {
      if (!detPor[d.id_transferencia]) detPor[d.id_transferencia] = [];
      detPor[d.id_transferencia].push(d);
    });

    const totalUnidades = transferencias.reduce((a, t) => a + Number(t.total_enviado), 0);
    const fmtN = n => Number(n || 0).toLocaleString('es-BO');

    // Conteo por estado
    const porEstado = {};
    transferencias.forEach(t => { porEstado[t.estado] = (porEstado[t.estado] || 0) + 1; });
    const estadoResumen = Object.entries(porEstado).map(([k, v]) => `${k}: ${v}`).join('   ·   ');

    const doc = new PDFDocument({ margin: 30, size: 'A4', autoFirstPage: true });
    doc.pipe(res);

    const ML = 30, PW = doc.page.width - 60;
    const subtitulo = [
      `Período: ${desde} al ${hasta}`,
      estado ? `Estado: ${estado}` : null,
      `Generado: ${fechaGen}`,
    ].filter(Boolean).join('   ·   ');

    let y = drawPdfHeader(doc, empresa, 'Reporte de Transferencias', subtitulo);
    y = drawSummaryBoxes(doc, [
      { label: 'Transferencias',  valor: fmtN(transferencias.length), color: '#0f172a' },
      { label: 'Total unidades',  valor: fmtN(totalUnidades),         color: '#0f172a' },
    ], y);

    // Línea de distribución por estado
    doc.font('Helvetica').fontSize(6.5).fillColor('#64748b')
       .text(estadoResumen, ML, y, { width: PW });
    y += 13;

    // ── Columnas tabla principal ────────────────────────────────────────────
    const COLS_T = [
      { key: 'numero',      w: 85,  label: 'N° TRANSFERENCIA', align: 'left' },
      { key: 'fecha_sol',   w: 80,  label: 'F. SOLICITUD',     align: 'left' },
      { key: 'origen',      w: 110, label: 'ORIGEN',           align: 'left' },
      { key: 'destino',     w: 110, label: 'DESTINO',          align: 'left' },
      { key: 'num_prods',   w: 40,  label: 'PRODS',            align: 'right' },
      { key: 'total_env',   w: 45,  label: 'UNIDS',            align: 'right' },
      { key: 'estado',      w: 65,  label: 'ESTADO',           align: 'left' },
    ];
    // ── Columnas sub-tabla productos ────────────────────────────────────────
    const COLS_D = [
      { key: 'codigo_interno',    w: 68,  label: 'CÓDIGO',      align: 'left' },
      { key: 'nombre_producto',   w: 222, label: 'PRODUCTO',    align: 'left' },
      { key: 'cantidad_enviada',  w: 65,  label: 'ENVIADO',     align: 'right' },
      { key: 'cantidad_recibida', w: 65,  label: 'RECIBIDO',    align: 'right' },
      { key: 'diferencia',        w: 55,  label: 'DIFERENCIA',  align: 'right' },
      { key: 'observacion',       w: 45,  label: 'OBS.',        align: 'left' },
    ];

    const checkPage = (needed = 14) => {
      if (y + needed > doc.page.height - 40) {
        doc.addPage({ size: 'A4', margin: 30 });
        y = 30;
      }
    };

    const drawHdrRow = (cols, bgColor, textColor, indent = 0) => {
      let x = ML + indent;
      doc.rect(x, y, PW - indent, 14).fill(bgColor);
      cols.forEach(c => {
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(textColor)
           .text(c.label, x + 3, y + 4, { width: c.w - 6, align: c.align, lineBreak: false });
        x += c.w;
      });
      y += 14;
    };

    const ESTADO_COLOR = {
      RECIBIDA: '#16a34a', ANULADA: '#dc2626',
      EN_TRANSITO: '#d97706', PARCIAL: '#2563eb', SOLICITADA: '#64748b',
    };

    checkPage(20);
    drawHdrRow(COLS_T, '#1e293b', 'white');

    transferencias.forEach((tr, idx) => {
      const dets    = detPor[tr.id_transferencia] || [];
      const bgMain  = idx % 2 === 0 ? '#f8fafc' : 'white';
      const needed  = 22 + 11 + (dets.length > 0 ? 14 + dets.length * 11 : 0) + 7;
      checkPage(needed);

      // ── Fila principal de la transferencia ─────────────────────────────
      const mainH = 22;
      doc.rect(ML, y, PW, mainH).fill(bgMain);
      let x = ML;
      COLS_T.forEach(c => {
        if (c.key === 'origen' || c.key === 'destino') {
          const suc = c.key === 'origen' ? tr.sucursal_origen  : tr.sucursal_destino;
          const dep = c.key === 'origen' ? tr.deposito_origen  : tr.deposito_destino;
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#0f172a')
             .text(suc || '', x + 3, y + 4,  { width: c.w - 6, lineBreak: false });
          doc.font('Helvetica').fontSize(6).fillColor('#64748b')
             .text(dep || '', x + 3, y + 13, { width: c.w - 6, lineBreak: false });
        } else if (c.key === 'estado') {
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor(ESTADO_COLOR[tr.estado] || '#64748b')
             .text(tr.estado, x + 3, y + 7, { width: c.w - 6, lineBreak: false });
        } else {
          const val = c.key === 'numero'    ? tr.numero :
                      c.key === 'fecha_sol' ? tr.fecha_solicitud :
                      c.key === 'num_prods' ? fmtN(tr.num_productos) :
                      c.key === 'total_env' ? fmtN(tr.total_enviado) : '';
          doc.font(c.key === 'numero' ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor('#0f172a')
             .text(String(val), x + 3, y + 7, { width: c.w - 6, align: c.align, lineBreak: false });
        }
        x += c.w;
      });
      y += mainH;

      // ── Fila de info: responsables y fechas ────────────────────────────
      const infoParts = [];
      if (tr.solicitante)    infoParts.push(`Solicitado por: ${tr.solicitante}`);
      if (tr.enviado_por)    infoParts.push(`Enviado por: ${tr.enviado_por}`);
      if (tr.recibido_por)   infoParts.push(`Recibido por: ${tr.recibido_por}`);
      if (tr.fecha_envio)    infoParts.push(`F. envío: ${tr.fecha_envio}`);
      if (tr.fecha_recepcion) infoParts.push(`F. recepción: ${tr.fecha_recepcion}`);
      if (tr.observaciones)  infoParts.push(`Obs: ${tr.observaciones}`);

      if (infoParts.length > 0) {
        doc.rect(ML, y, PW, 11).fill('#f1f5f9');
        doc.font('Helvetica').fontSize(6).fillColor('#475569')
           .text(infoParts.join('   ·   '), ML + 4, y + 3, { width: PW - 8, lineBreak: false });
        y += 11;
      }

      // ── Sub-tabla de productos ─────────────────────────────────────────
      if (dets.length > 0) {
        drawHdrRow(COLS_D, '#e2e8f0', '#475569', 15);
        dets.forEach(d => {
          checkPage(11);
          let dx = ML + 15;
          doc.rect(dx, y, PW - 15, 11).fill('#fafafa');
          COLS_D.forEach(c => {
            let v   = d[c.key] ?? '';
            let clr = '#374151';
            if (c.key === 'diferencia') {
              const n = Number(v);
              clr = n > 0 ? '#dc2626' : n < 0 ? '#2563eb' : '#374151';
              v = fmtN(v);
            } else if (c.key === 'cantidad_enviada' || c.key === 'cantidad_recibida') {
              v = fmtN(v);
            }
            doc.font('Helvetica').fontSize(6.5).fillColor(clr)
               .text(String(v), dx + 2, y + 3, { width: c.w - 4, align: c.align, lineBreak: false });
            dx += c.w;
          });
          y += 11;
        });
      }

      // Separador entre transferencias
      y += 3;
      doc.moveTo(ML, y).lineTo(ML + PW, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      y += 4;
    });

    // ── Fila total general ──────────────────────────────────────────────────
    checkPage(18);
    doc.rect(ML, y, PW, 18).fill('#0f172a');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('white')
       .text('TOTAL GENERAL', ML + 3, y + 5, { width: 180, lineBreak: false })
       .text(
         `${fmtN(transferencias.length)} transferencia${transferencias.length !== 1 ? 's' : ''}   ·   ${fmtN(totalUnidades)} unidades`,
         ML + 183, y + 5, { width: PW - 186, align: 'right', lineBreak: false }
       );
    y += 18;

    // ── Pie de página ───────────────────────────────────────────────────────
    y += 8;
    doc.font('Helvetica').fontSize(6.5).fillColor('#94a3b8')
       .text(
         `${empresa?.razon_social || ''}  ·  Documento generado por el sistema  ·  ${fechaGen}`,
         ML, y, { width: PW, align: 'center' }
       );

    doc.end();
  } catch (err) {
    console.error('[exportarTransferenciasPDF]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}

// ── Top Productos PDF ─────────────────────────────────────────────────────
async function exportarTopProductosPDF(req, res) {
  try {
    const empresa = await getEmpresaData();
    const desde   = req.query.fecha_desde || inicioMes();
    const hasta   = req.query.fecha_hasta || hoy();
    const limit   = Math.min(parseInt(req.query.limit || 10, 10), 100);
    const { id_sucursal } = req.query;

    let sql = `
      SELECT p.codigo_interno, p.producto, m.nombre AS marca, cat.nombre AS categoria,
        SUM(vd.cantidad) AS cantidad_vendida,
        SUM(vd.subtotal) AS monto_total,
        COALESCE(SUM(vd.bono_vendedor),0) AS total_bonos,
        AVG(vd.precio_unitario) AS precio_promedio
      FROM venta_detalle vd
      JOIN ventas v      ON v.id_venta = vd.id_venta
      JOIN productos p   ON p.id_producto = vd.id_producto
      JOIN marcas m      ON m.id_marca = p.id_marca
      JOIN categorias cat ON cat.id_categoria = p.id_categoria
      WHERE DATE(v.fecha) BETWEEN ? AND ?
        AND v.estado NOT IN ('ANULADA','BORRADOR')
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND v.id_sucursal = ?'; params.push(id_sucursal); }
    sql += ` GROUP BY vd.id_producto ORDER BY cantidad_vendida DESC LIMIT ${limit}`;

    const [rows] = await db.promise().query(sql, params);

    const N  = (n, d = 2) => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: d, maximumFractionDigits: d });
    const fmtBs = n => `Bs ${N(n)}`;
    const fechaGen = new Date().toLocaleString('es-BO');

    const totalUnidades = rows.reduce((s, r) => s + Number(r.cantidad_vendida), 0);
    const totalMonto    = rows.reduce((s, r) => s + Number(r.monto_total), 0);
    const totalBonos    = rows.reduce((s, r) => s + Number(r.total_bonos), 0);
    const maxQty        = rows.length > 0 ? Number(rows[0].cantidad_vendida) : 1;

    const doc  = new PDFDocument({ margin: 0, size: 'A4' });
    const ML   = 36, MR = 36;
    const PW   = doc.page.width - ML - MR;   // 523
    const GOLD = '#FACC15';
    const DARK = '#18181B';
    const SLATE = '#64748B';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Top-Productos_${desde}_${hasta}.pdf"`);
    doc.pipe(res);

    // ── CABECERA ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 88).fill(DARK);

    let logoW = 0;
    if (empresa?.logo_url && empresa.logo_url.startsWith('/uploads/')) {
      const logoFile = path.join(__dirname, '..', empresa.logo_url);
      if (fs.existsSync(logoFile)) {
        try {
          doc.image(logoFile, ML, 18, { height: 48, fit: [90, 48] });
          logoW = 98;
        } catch (_) {}
      }
    }

    const nombreEm = empresa?.nombre_comercial || empresa?.razon_social || 'MEGAELECTRA';
    doc.font('Helvetica-Bold').fontSize(15).fillColor('white')
       .text(nombreEm, ML + logoW, 20, { width: PW - logoW - 110 });
    let infoY = 39;
    doc.font('Helvetica').fontSize(7.5).fillColor('#A1A1AA');
    if (empresa?.nit)       { doc.text(`NIT: ${empresa.nit}`, ML + logoW, infoY, { width: PW - logoW - 110 }); infoY += 10; }
    if (empresa?.direccion) { doc.text(empresa.direccion,      ML + logoW, infoY, { width: PW - logoW - 110 }); infoY += 10; }
    const contacto = [empresa?.telefono, empresa?.email].filter(Boolean).join('  ·  ');
    if (contacto)           { doc.text(contacto,               ML + logoW, infoY, { width: PW - logoW - 110 }); }

    // Badge "TOP PRODUCTOS" alineado a la derecha dentro de la cabecera
    const badgeW = 108, badgeH = 24, badgeX = doc.page.width - MR - badgeW, badgeY = 20;
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4).fill(GOLD);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
       .text('TOP PRODUCTOS', badgeX, badgeY + 8, { width: badgeW, align: 'center' });

    // Período
    doc.font('Helvetica').fontSize(7.5).fillColor('#D4D4D8')
       .text(`Período: ${desde}  al  ${hasta}`, doc.page.width - MR - badgeW, badgeY + 28, { width: badgeW, align: 'center' });

    // Línea dorada inferior de cabecera
    doc.rect(0, 88, doc.page.width, 3).fill(GOLD);

    let y = 103;

    // ── TARJETAS DE RESUMEN ────────────────────────────────────────────────
    const cards = [
      { label: 'Total unidades vendidas', value: N(totalUnidades, 0), sub: `${rows.length} producto${rows.length !== 1 ? 's' : ''}` },
      { label: 'Ingresos totales',         value: fmtBs(totalMonto),   sub: 'período seleccionado' },
      { label: 'Total bonos vendedor',     value: fmtBs(totalBonos),   sub: 'acumulado' },
    ];
    const cw = Math.floor(PW / cards.length) - 6;
    cards.forEach((c, i) => {
      const cx = ML + i * (cw + 9);
      doc.roundedRect(cx, y, cw, 52, 5).fill('#F4F4F5');
      doc.font('Helvetica').fontSize(7).fillColor(SLATE)
         .text(c.label.toUpperCase(), cx + 10, y + 10, { width: cw - 20 });
      doc.font('Helvetica-Bold').fontSize(14).fillColor(DARK)
         .text(c.value, cx + 10, y + 21, { width: cw - 20 });
      doc.font('Helvetica').fontSize(7).fillColor('#A1A1AA')
         .text(c.sub, cx + 10, y + 39, { width: cw - 20 });
      doc.rect(cx, y, 3, 52).fill(GOLD);
    });
    y += 64;

    // ── RANKING VISUAL ─────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(8).fillColor(SLATE)
       .text('RANKING POR UNIDADES VENDIDAS', ML, y, { width: PW });
    y += 14;

    const barMaxW = PW - 170;
    rows.slice(0, Math.min(rows.length, 10)).forEach((row, i) => {
      const pct     = Number(row.cantidad_vendida) / maxQty;
      const barW    = Math.max(4, Math.round(barMaxW * pct));
      const rowY    = y + i * 17;
      const isFirst = i === 0;

      // Número de posición
      doc.font('Helvetica-Bold').fontSize(8)
         .fillColor(isFirst ? GOLD : SLATE)
         .text(String(i + 1), ML, rowY + 3, { width: 14, align: 'right' });

      // Barra
      doc.rect(ML + 18, rowY + 4, barMaxW, 9).fill('#F4F4F5');
      doc.rect(ML + 18, rowY + 4, barW, 9).fill(isFirst ? GOLD : '#D4D4D8');

      // Nombre producto
      doc.font(isFirst ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5)
         .fillColor(DARK)
         .text(row.producto, ML + 18, rowY, { width: barMaxW, lineBreak: false });

      // Cantidad a la derecha
      doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
         .text(`${N(row.cantidad_vendida, 0)} u.`, ML + 18 + barMaxW + 6, rowY + 3, { width: 60, align: 'right' });

      // % del total
      const pctTotal = totalUnidades > 0 ? ((Number(row.cantidad_vendida) / totalUnidades) * 100).toFixed(1) : '0.0';
      doc.font('Helvetica').fontSize(7).fillColor(SLATE)
         .text(`${pctTotal}%`, ML + 18 + barMaxW + 70, rowY + 4, { width: 30, align: 'right' });
    });
    y += Math.min(rows.length, 10) * 17 + 16;

    // ── TABLA DETALLADA ────────────────────────────────────────────────────
    const tCols = [
      { label: '#',          w: 16,  align: 'right',  key: null },
      { label: 'Código',     w: 52,  align: 'left',   key: 'codigo_interno' },
      { label: 'Producto',   w: 148, align: 'left',   key: 'producto' },
      { label: 'Marca',      w: 58,  align: 'left',   key: 'marca' },
      { label: 'Categoría',  w: 62,  align: 'left',   key: 'categoria' },
      { label: 'Unidades',   w: 44,  align: 'right',  key: 'cantidad_vendida' },
      { label: 'P. Prom Bs', w: 54,  align: 'right',  key: 'precio_promedio' },
      { label: 'Total Bs',   w: 58,  align: 'right',  key: 'monto_total' },
      { label: '% Total',    w: 36,  align: 'right',  key: null },
    ];
    // Ajuste proporcional si excede PW
    const tTotalW = tCols.reduce((s, c) => s + c.w, 0);
    const tScale  = PW / tTotalW;
    tCols.forEach(c => { c.w = Math.floor(c.w * tScale); });

    // Verificar espacio restante en página
    if (y + 14 + rows.length * 13 + 20 > doc.page.height - 40) {
      if (y + 40 > doc.page.height - 40) {
        doc.addPage({ size: 'A4', margin: 0 });
        y = 36;
      }
    }

    doc.font('Helvetica-Bold').fontSize(8).fillColor(SLATE)
       .text('DETALLE COMPLETO', ML, y, { width: PW });
    y += 10;

    const drawTHead = () => {
      doc.rect(ML, y, PW, 14).fill(DARK);
      let cx = ML + 2;
      tCols.forEach(col => {
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('white')
           .text(col.label, cx, y + 4, { width: col.w - 2, align: col.align, lineBreak: false });
        cx += col.w;
      });
      y += 14;
    };

    const drawTRow = (row, idx, rankNum) => {
      const bg = idx % 2 === 0 ? '#FAFAFA' : 'white';
      doc.rect(ML, y, PW, 13).fill(bg);

      const pctTotal = totalUnidades > 0
        ? ((Number(row.cantidad_vendida) / totalUnidades) * 100).toFixed(1) + '%'
        : '—';

      const vals = [
        rankNum,
        row.codigo_interno,
        row.producto,
        row.marca,
        row.categoria,
        N(row.cantidad_vendida, 0),
        N(row.precio_promedio),
        N(row.monto_total),
        pctTotal,
      ];

      let cx = ML + 2;
      tCols.forEach((col, ci) => {
        const isBold = ci === 2 || ci === 0;
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7)
           .fillColor(ci === 0 && rankNum <= 3 ? GOLD : DARK)
           .text(String(vals[ci] ?? ''), cx, y + 3, { width: col.w - 4, align: col.align, lineBreak: false });
        cx += col.w;
      });

      // Highlight primer puesto
      if (rankNum === 1) {
        doc.rect(ML, y, 3, 13).fill(GOLD);
      }

      y += 13;
    };

    const drawTFooter = () => {
      doc.rect(ML, y, PW, 14).fill('#1E293B');
      const totals = ['', '', 'TOTALES', '', '', N(totalUnidades, 0), '', N(totalMonto), '100%'];
      let cx = ML + 2;
      tCols.forEach((col, ci) => {
        doc.font('Helvetica-Bold').fontSize(7).fillColor(GOLD)
           .text(String(totals[ci] ?? ''), cx, y + 4, { width: col.w - 4, align: col.align, lineBreak: false });
        cx += col.w;
      });
      y += 14;
    };

    drawTHead();

    rows.forEach((row, i) => {
      if (y > doc.page.height - 50) {
        drawTFooter();
        doc.addPage({ size: 'A4', margin: 0 });
        y = 36;
        drawTHead();
      }
      drawTRow(row, i, i + 1);
    });

    drawTFooter();

    // ── PIE DE PÁGINA ──────────────────────────────────────────────────────
    y += 10;
    doc.moveTo(ML, y).lineTo(ML + PW, y).strokeColor('#E4E4E7').lineWidth(0.5).stroke();
    y += 6;
    doc.font('Helvetica').fontSize(6.5).fillColor('#A1A1AA')
       .text(`${nombreEm}  ·  Reporte Top Productos  ·  Período: ${desde} al ${hasta}`, ML, y, { width: PW, align: 'left' })
       .text(`Generado el ${fechaGen}`, ML, y, { width: PW, align: 'right' });

    doc.end();
  } catch (err) {
    console.error('[exportarTopProductosPDF]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}

// ── Ventas PDF ────────────────────────────────────────────────────────────
async function exportarVentasPDF(req, res) {
  try {
    const empresa  = await getEmpresaData();
    const desde    = req.query.fecha_desde || inicioMes();
    const hasta    = req.query.fecha_hasta || hoy();
    const { id_sucursal } = req.query;

    let sql = `
      SELECT v.numero, DATE_FORMAT(v.fecha,'%d/%m/%Y %H:%i') AS fecha, v.tipo_venta,
        COALESCE(c.razon_social, CONCAT(c.nombres,' ',c.apellidos)) AS cliente,
        CONCAT(u.nombres,' ',u.apellidos) AS vendedor,
        s.nombre AS sucursal,
        v.total, v.descuento_monto, v.saldo_pendiente, v.estado, v.condicion_pago
      FROM ventas v
      JOIN clientes c ON c.id_cliente = v.id_cliente
      JOIN usuarios u ON u.id_usuario = v.id_vendedor
      JOIN sucursales s ON s.id_sucursal = v.id_sucursal
      WHERE DATE(v.fecha) BETWEEN ? AND ? AND v.estado != 'BORRADOR'
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND v.id_sucursal = ?'; params.push(id_sucursal); }
    sql += ' ORDER BY v.fecha DESC LIMIT 5000';

    const [rows] = await db.promise().query(sql, params);

    const N      = (n, d = 2) => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: d, maximumFractionDigits: d });
    const fechaGen = new Date().toLocaleString('es-BO');

    // ── Totales para resumen ────────────────────────────────────────────────
    const pagadas      = rows.filter(r => r.estado === 'PAGADA');
    const emitidas     = rows.filter(r => r.estado === 'EMITIDA' || r.estado === 'PARCIAL');
    const anuladas     = rows.filter(r => r.estado === 'ANULADA' || r.estado === 'DEVUELTA');
    const totalPagado  = pagadas.reduce((s, r) => s + Number(r.total), 0);
    const totalContado = pagadas.filter(r => r.condicion_pago === 'CONTADO').reduce((s, r) => s + Number(r.total), 0);
    const totalCredito = pagadas.filter(r => r.condicion_pago === 'CREDITO').reduce((s, r) => s + Number(r.total), 0);
    const totalSaldo   = emitidas.reduce((s, r) => s + Number(r.saldo_pendiente), 0);
    const totalDesc    = rows.reduce((s, r) => s + Number(r.descuento_monto || 0), 0);
    const totalGeneral = rows.filter(r => r.estado !== 'ANULADA' && r.estado !== 'DEVUELTA')
                             .reduce((s, r) => s + Number(r.total), 0);

    const ESTADO_COLOR = {
      PAGADA:   { bg: '#DCFCE7', txt: '#15803D', label: 'Pagada' },
      EMITIDA:  { bg: '#DBEAFE', txt: '#1D4ED8', label: 'Emitida' },
      PARCIAL:  { bg: '#FEF3C7', txt: '#B45309', label: 'Parcial' },
      ANULADA:  { bg: '#FEE2E2', txt: '#DC2626', label: 'Anulada' },
      DEVUELTA: { bg: '#F3E8FF', txt: '#7C3AED', label: 'Devuelta' },
    };

    const doc  = new PDFDocument({ margin: 0, size: 'A4', layout: 'landscape' });
    const ML   = 32, MR = 32;
    const PW   = doc.page.width - ML - MR;
    const GOLD = '#FACC15';
    const DARK = '#18181B';
    const SLATE = '#64748B';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Ventas_${desde}_${hasta}.pdf"`);
    doc.pipe(res);

    // ── CABECERA ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 82).fill(DARK);

    let logoW = 0;
    if (empresa?.logo_url && empresa.logo_url.startsWith('/uploads/')) {
      const logoFile = path.join(__dirname, '..', empresa.logo_url);
      if (fs.existsSync(logoFile)) {
        try {
          doc.image(logoFile, ML, 15, { height: 44, fit: [84, 44] });
          logoW = 92;
        } catch (_) {}
      }
    }

    const nombreEm = empresa?.nombre_comercial || empresa?.razon_social || 'MEGAELECTRA';
    doc.font('Helvetica-Bold').fontSize(14).fillColor('white')
       .text(nombreEm, ML + logoW, 16, { width: PW - logoW - 140 });
    let infoY = 34;
    doc.font('Helvetica').fontSize(7).fillColor('#A1A1AA');
    if (empresa?.nit)       { doc.text(`NIT: ${empresa.nit}`, ML + logoW, infoY, { width: PW - logoW - 140 }); infoY += 9; }
    if (empresa?.direccion) { doc.text(empresa.direccion,      ML + logoW, infoY, { width: PW - logoW - 140 }); infoY += 9; }
    const ctc = [empresa?.telefono, empresa?.email].filter(Boolean).join('  ·  ');
    if (ctc)                { doc.text(ctc,                    ML + logoW, infoY, { width: PW - logoW - 140 }); }

    // Badge derecho
    const badgeW = 130, badgeX = doc.page.width - MR - badgeW;
    doc.roundedRect(badgeX, 16, badgeW, 22, 3).fill(GOLD);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
       .text('REPORTE DE VENTAS', badgeX, 24, { width: badgeW, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor('#D4D4D8')
       .text(`Período: ${desde}  al  ${hasta}`, badgeX, 42, { width: badgeW, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor('#A1A1AA')
       .text(`${rows.length} registro${rows.length !== 1 ? 's' : ''}`, badgeX, 55, { width: badgeW, align: 'center' });

    doc.rect(0, 82, doc.page.width, 3).fill(GOLD);
    let y = 97;

    // ── TARJETAS RESUMEN ──────────────────────────────────────────────────
    const cards = [
      { label: 'Total facturado',  value: `Bs ${N(totalGeneral)}`,  sub: `${rows.length - anuladas.length} ventas activas` },
      { label: 'Total cobrado',    value: `Bs ${N(totalPagado)}`,   sub: `${pagadas.length} pagadas` },
      { label: 'Contado',          value: `Bs ${N(totalContado)}`,  sub: 'ventas al contado' },
      { label: 'Crédito',          value: `Bs ${N(totalCredito)}`,  sub: 'ventas a crédito' },
      { label: 'Saldo pendiente',  value: `Bs ${N(totalSaldo)}`,    sub: `${emitidas.length} por cobrar` },
      { label: 'Descuentos',       value: `Bs ${N(totalDesc)}`,     sub: 'total descontado' },
    ];
    const cw = Math.floor(PW / cards.length) - 5;
    cards.forEach((c, i) => {
      const cx = ML + i * (cw + 6);
      doc.roundedRect(cx, y, cw, 48, 4).fill('#F4F4F5');
      doc.font('Helvetica').fontSize(6).fillColor(SLATE)
         .text(c.label.toUpperCase(), cx + 8, y + 8, { width: cw - 16 });
      doc.font('Helvetica-Bold').fontSize(i < 2 ? 11 : 10).fillColor(DARK)
         .text(c.value, cx + 8, y + 18, { width: cw - 16 });
      doc.font('Helvetica').fontSize(6).fillColor('#A1A1AA')
         .text(c.sub, cx + 8, y + 35, { width: cw - 16 });
      doc.rect(cx, y, 3, 48).fill(i === 4 && totalSaldo > 0 ? '#EF4444' : GOLD);
    });
    y += 60;

    // ── DISTRIBUCIÓN POR ESTADO ───────────────────────────────────────────
    const porEstado = Object.entries(
      rows.reduce((acc, r) => { acc[r.estado] = (acc[r.estado] || 0) + 1; return acc; }, {})
    ).sort((a, b) => b[1] - a[1]);

    if (porEstado.length > 0) {
      doc.font('Helvetica-Bold').fontSize(7).fillColor(SLATE)
         .text('DISTRIBUCIÓN POR ESTADO', ML, y, { width: PW });
      y += 10;
      const chipW = 90, chipH = 20, gap = 8;
      porEstado.forEach(([ estado, cnt ], i) => {
        const ec = ESTADO_COLOR[estado] || { bg: '#F4F4F5', txt: SLATE, label: estado };
        const cx = ML + i * (chipW + gap);
        if (cx + chipW > ML + PW) return;
        doc.roundedRect(cx, y, chipW, chipH, 3).fill(ec.bg);
        doc.font('Helvetica-Bold').fontSize(7).fillColor(ec.txt)
           .text(ec.label, cx + 6, y + 4, { width: chipW - 12 });
        doc.font('Helvetica').fontSize(7).fillColor(ec.txt)
           .text(`${cnt} venta${cnt !== 1 ? 's' : ''}`, cx + 6, y + 12, { width: chipW - 12 });
      });
      y += 30;
    }

    // ── TABLA ─────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(7).fillColor(SLATE)
       .text('DETALLE DE VENTAS', ML, y, { width: PW });
    y += 10;

    const tCols = [
      { label: 'N° Venta',   w: 70,  align: 'left',  key: 'numero' },
      { label: 'Fecha',      w: 72,  align: 'left',  key: 'fecha' },
      { label: 'Cliente',    w: 150, align: 'left',  key: 'cliente' },
      { label: 'Vendedor',   w: 100, align: 'left',  key: 'vendedor' },
      { label: 'Sucursal',   w: 72,  align: 'left',  key: 'sucursal' },
      { label: 'Condición',  w: 52,  align: 'center',key: 'condicion_pago' },
      { label: 'Descuento',  w: 56,  align: 'right', key: 'descuento_monto' },
      { label: 'Total Bs',   w: 62,  align: 'right', key: 'total' },
      { label: 'Saldo Bs',   w: 62,  align: 'right', key: 'saldo_pendiente' },
      { label: 'Estado',     w: 52,  align: 'center',key: 'estado' },
    ];
    const tTotal = tCols.reduce((s, c) => s + c.w, 0);
    const tScale = PW / tTotal;
    tCols.forEach(c => { c.w = Math.floor(c.w * tScale); });

    const ROW_H = 13;

    const drawHead = () => {
      doc.rect(ML, y, PW, 14).fill(DARK);
      let cx = ML + 2;
      tCols.forEach(col => {
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('white')
           .text(col.label, cx, y + 4, { width: col.w - 3, align: col.align, lineBreak: false });
        cx += col.w;
      });
      y += 14;
    };

    const drawRow = (row, idx) => {
      const ec  = ESTADO_COLOR[row.estado] || { bg: '#F4F4F5', txt: SLATE };
      const bg  = idx % 2 === 0 ? '#FAFAFA' : 'white';
      doc.rect(ML, y, PW, ROW_H).fill(bg);

      const saldo = Number(row.saldo_pendiente);
      const desc  = Number(row.descuento_monto || 0);

      const vals = [
        row.numero,
        row.fecha,
        row.cliente,
        row.vendedor,
        row.sucursal,
        row.condicion_pago,
        desc > 0 ? N(desc) : '—',
        N(row.total),
        saldo > 0 ? N(saldo) : 'Pagado',
        (ESTADO_COLOR[row.estado]?.label || row.estado),
      ];

      let cx = ML + 2;
      tCols.forEach((col, ci) => {
        let color = DARK;
        if (ci === 0) color = '#1D4ED8';
        if (ci === 8) color = saldo > 0 ? '#DC2626' : '#15803D';
        if (ci === 9) color = ec.txt;

        doc.font(ci === 0 || ci === 7 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7)
           .fillColor(color)
           .text(String(vals[ci] ?? ''), cx, y + 3, { width: col.w - 4, align: col.align, lineBreak: false });
        cx += col.w;
      });
      y += ROW_H;
    };

    const drawFoot = () => {
      doc.rect(ML, y, PW, 14).fill('#1E293B');
      const tots = ['', `${rows.length} reg.`, 'TOTALES', '', '', '', `Bs ${N(totalDesc)}`, `Bs ${N(totalGeneral)}`, `Bs ${N(totalSaldo)}`, ''];
      let cx = ML + 2;
      tCols.forEach((col, ci) => {
        doc.font('Helvetica-Bold').fontSize(7).fillColor(GOLD)
           .text(String(tots[ci] ?? ''), cx, y + 4, { width: col.w - 4, align: col.align, lineBreak: false });
        cx += col.w;
      });
      y += 14;
    };

    drawHead();

    rows.forEach((row, i) => {
      if (y > doc.page.height - 48) {
        drawFoot();
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
        y = 32;
        drawHead();
      }
      drawRow(row, i);
    });

    drawFoot();

    // ── PIE ───────────────────────────────────────────────────────────────
    y += 8;
    if (y < doc.page.height - 30) {
      doc.moveTo(ML, y).lineTo(ML + PW, y).strokeColor('#E4E4E7').lineWidth(0.5).stroke();
      y += 5;
      doc.font('Helvetica').fontSize(6).fillColor('#A1A1AA')
         .text(`${nombreEm}  ·  Reporte de Ventas  ·  Período: ${desde} al ${hasta}`, ML, y, { width: PW, align: 'left' })
         .text(`Generado el ${fechaGen}`, ML, y, { width: PW, align: 'right' });
    }

    doc.end();
  } catch (err) {
    console.error('[exportarVentasPDF]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}

// ── Compras PDF detallado ─────────────────────────────────────────────────
async function exportarComprasPDF(req, res) {
  try {
    const empresa   = await getEmpresaData();
    const desde     = req.query.fecha_desde || inicioMes();
    const hasta     = req.query.fecha_hasta || hoy();
    const { id_sucursal, id_proveedor, estado } = req.query;

    let sql = `
      SELECT c.numero, DATE_FORMAT(c.fecha_pedido,'%d/%m/%Y') AS fecha_pedido,
        pr.razon_social AS proveedor, s.nombre AS sucursal,
        c.total, c.saldo_pendiente, c.estado, c.condicion_pago
      FROM compras c
      JOIN proveedores pr ON pr.id_proveedor = c.id_proveedor
      JOIN sucursales s   ON s.id_sucursal   = c.id_sucursal
      WHERE c.fecha_pedido BETWEEN ? AND ? AND c.estado != 'ANULADO'
    `;
    const params = [desde, hasta];
    if (id_sucursal)  { sql += ' AND c.id_sucursal=?';  params.push(id_sucursal); }
    if (id_proveedor) { sql += ' AND c.id_proveedor=?'; params.push(id_proveedor); }
    if (estado)       { sql += ' AND c.estado=?';        params.push(estado); }
    sql += ' ORDER BY c.fecha_pedido DESC LIMIT 5000';

    const [rows] = await db.promise().query(sql, params);

    const N       = (n, d = 2) => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: d, maximumFractionDigits: d });
    const fechaGen = new Date().toLocaleString('es-BO');

    // ── Totales ───────────────────────────────────────────────────────────
    const activas      = rows.filter(r => r.estado !== 'ANULADO');
    const recibidas    = rows.filter(r => r.estado === 'RECIBIDO');
    const pendientes   = rows.filter(r => r.estado === 'POR_LLEGAR' || r.estado === 'PARCIAL');
    const totalGeneral = activas.reduce((s, r) => s + Number(r.total), 0);
    const totalPagado  = recibidas.reduce((s, r) => s + (Number(r.total) - Number(r.saldo_pendiente)), 0);
    const totalSaldo   = pendientes.reduce((s, r) => s + Number(r.saldo_pendiente), 0);
    const totalContado = activas.filter(r => r.condicion_pago === 'CONTADO').reduce((s, r) => s + Number(r.total), 0);
    const totalCredito = activas.filter(r => r.condicion_pago === 'CREDITO').reduce((s, r) => s + Number(r.total), 0);

    const ESTADO_COLOR = {
      RECIBIDO:   { bg: '#DCFCE7', txt: '#15803D', label: 'Recibido' },
      POR_LLEGAR: { bg: '#DBEAFE', txt: '#1D4ED8', label: 'Por llegar' },
      PARCIAL:    { bg: '#FEF3C7', txt: '#B45309', label: 'Parcial' },
      ANULADO:    { bg: '#FEE2E2', txt: '#DC2626', label: 'Anulado' },
    };

    const doc   = new PDFDocument({ margin: 0, size: 'A4', layout: 'landscape' });
    const ML    = 32, MR = 32;
    const PW    = doc.page.width - ML - MR;
    const GOLD  = '#FACC15';
    const DARK  = '#18181B';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Compras_${desde}_${hasta}.pdf"`);
    doc.pipe(res);

    // ── CABECERA ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 82).fill(DARK);

    let logoW = 0;
    if (empresa?.logo_url && empresa.logo_url.startsWith('/uploads/')) {
      const logoFile = path.join(__dirname, '..', empresa.logo_url);
      if (fs.existsSync(logoFile)) {
        try { doc.image(logoFile, ML, 15, { height: 44, fit: [84, 44] }); logoW = 92; } catch (_) {}
      }
    }

    const nombreEm = empresa?.nombre_comercial || empresa?.razon_social || 'EMPRESA';
    doc.font('Helvetica-Bold').fontSize(14).fillColor('white')
       .text(nombreEm, ML + logoW, 16, { width: PW - logoW - 140 });
    let infoY = 34;
    doc.font('Helvetica').fontSize(7).fillColor('#A1A1AA');
    if (empresa?.nit)       { doc.text(`NIT: ${empresa.nit}`, ML + logoW, infoY, { width: PW - logoW - 140 }); infoY += 9; }
    if (empresa?.direccion) { doc.text(empresa.direccion,      ML + logoW, infoY, { width: PW - logoW - 140 }); infoY += 9; }
    const ctc = [empresa?.telefono, empresa?.email].filter(Boolean).join('  ·  ');
    if (ctc)                { doc.text(ctc,                    ML + logoW, infoY, { width: PW - logoW - 140 }); }

    const badgeW = 130, badgeX = doc.page.width - MR - badgeW;
    doc.roundedRect(badgeX, 16, badgeW, 22, 3).fill(GOLD);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
       .text('REPORTE DE COMPRAS', badgeX, 24, { width: badgeW, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor('#D4D4D8')
       .text(`Período: ${desde}  al  ${hasta}`, badgeX, 42, { width: badgeW, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor('#A1A1AA')
       .text(`${rows.length} registro${rows.length !== 1 ? 's' : ''}`, badgeX, 55, { width: badgeW, align: 'center' });

    doc.rect(0, 82, doc.page.width, 3).fill(GOLD);
    let y = 97;

    // ── TARJETAS RESUMEN ──────────────────────────────────────────────────
    const cards = [
      { label: 'Total facturado', value: `Bs ${N(totalGeneral)}`,  sub: `${activas.length} órdenes activas` },
      { label: 'Total pagado',    value: `Bs ${N(totalPagado)}`,   sub: `${recibidas.length} recibidas` },
      { label: 'Contado',         value: `Bs ${N(totalContado)}`,  sub: `${activas.filter(r => r.condicion_pago === 'CONTADO').length} pedidos` },
      { label: 'Crédito',         value: `Bs ${N(totalCredito)}`,  sub: `${activas.filter(r => r.condicion_pago === 'CREDITO').length} pedidos` },
      { label: 'Saldo pendiente', value: `Bs ${N(totalSaldo)}`,    sub: `${pendientes.length} por completar`, warn: totalSaldo > 0 },
    ];
    const cardW = Math.floor((PW - 16) / cards.length);
    cards.forEach((c, i) => {
      const cx = ML + i * (cardW + 4);
      doc.roundedRect(cx, y, cardW, 50, 4).fill(c.warn ? '#FFF1F2' : '#FAFAFA');
      doc.rect(cx, y, 3, 50).fill(c.warn ? '#DC2626' : GOLD);
      doc.font('Helvetica').fontSize(7).fillColor('#71717A').text(c.label, cx + 8, y + 8, { width: cardW - 12 });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(c.warn ? '#DC2626' : DARK).text(c.value, cx + 8, y + 19, { width: cardW - 12 });
      doc.font('Helvetica').fontSize(6.5).fillColor('#A1A1AA').text(c.sub, cx + 8, y + 34, { width: cardW - 12 });
    });
    y += 62;

    // ── CHIPS DE DISTRIBUCIÓN ─────────────────────────────────────────────
    const byEstado = {};
    rows.forEach(r => { byEstado[r.estado] = (byEstado[r.estado] || 0) + 1; });
    let cx2 = ML;
    Object.entries(byEstado).forEach(([est, cnt]) => {
      const ec = ESTADO_COLOR[est] || { bg: '#F4F4F5', txt: '#52525B', label: est };
      const chipW = Math.max(70, doc.widthOfString(`${ec.label}: ${cnt}`, { fontSize: 7 }) + 16);
      doc.roundedRect(cx2, y, chipW, 16, 8).fill(ec.bg);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(ec.txt)
         .text(`${ec.label}: ${cnt}`, cx2 + 6, y + 4.5, { width: chipW - 12 });
      cx2 += chipW + 6;
    });
    y += 26;

    // ── TABLA ─────────────────────────────────────────────────────────────
    const COLS = [
      { label: 'N° Orden',   w: 62,  align: 'left'  },
      { label: 'Fecha',      w: 66,  align: 'left'  },
      { label: 'Proveedor',  w: 0,   align: 'left'  },   // flex
      { label: 'Sucursal',   w: 80,  align: 'left'  },
      { label: 'Condición',  w: 62,  align: 'center'},
      { label: 'Total Bs',   w: 72,  align: 'right' },
      { label: 'Saldo Bs',   w: 72,  align: 'right' },
      { label: 'Estado',     w: 72,  align: 'center'},
    ];
    const fixedW = COLS.reduce((s, c) => s + c.w, 0);
    COLS[2].w = PW - fixedW;

    const drawHeader = () => {
      doc.rect(ML, y, PW, 18).fill(DARK);
      let cx = ML;
      COLS.forEach(col => {
        doc.font('Helvetica-Bold').fontSize(7).fillColor(GOLD)
           .text(col.label, cx + 4, y + 5, { width: col.w - 8, align: col.align });
        cx += col.w;
      });
      y += 18;
    };
    drawHeader();

    const ROW_H = 16;
    rows.forEach((r, idx) => {
      if (y + ROW_H > doc.page.height - 40) {
        doc.addPage({ margin: 0, size: 'A4', layout: 'landscape' });
        doc.rect(0, 0, doc.page.width, 3).fill(GOLD);
        y = 14;
        drawHeader();
      }
      if (idx % 2 === 0) doc.rect(ML, y, PW, ROW_H).fill('#F9FAFB');

      let cx = ML;
      const cells = [
        { v: r.numero,         align: 'left',   color: '#2563EB', bold: true  },
        { v: r.fecha_pedido,   align: 'left',   color: '#52525B', bold: false },
        { v: r.proveedor,      align: 'left',   color: DARK,      bold: false },
        { v: r.sucursal,       align: 'left',   color: '#52525B', bold: false },
        { v: r.condicion_pago, align: 'center', color: '#52525B', bold: false },
        { v: `Bs ${N(r.total)}`,                           align: 'right',  color: DARK, bold: true  },
        { v: Number(r.saldo_pendiente) > 0 ? `Bs ${N(r.saldo_pendiente)}` : 'Pagado',
           align: 'right', color: Number(r.saldo_pendiente) > 0 ? '#DC2626' : '#15803D', bold: Number(r.saldo_pendiente) === 0 },
        { v: null,             align: 'center', color: null,      bold: false },  // estado badge handled below
      ];

      cells.forEach((cell, ci) => {
        const col = COLS[ci];
        if (ci === 7) {
          const ec = ESTADO_COLOR[r.estado] || { bg: '#F4F4F5', txt: '#52525B', label: r.estado };
          const bw = Math.min(col.w - 10, 64), bh = 11;
          const bx = cx + (col.w - bw) / 2, by = y + (ROW_H - bh) / 2;
          doc.roundedRect(bx, by, bw, bh, 3).fill(ec.bg);
          doc.font('Helvetica-Bold').fontSize(6).fillColor(ec.txt)
             .text(ec.label, bx + 2, by + 2.5, { width: bw - 4, align: 'center' });
        } else {
          doc.font(cell.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7).fillColor(cell.color)
             .text(String(cell.v ?? ''), cx + 4, y + 4.5, { width: col.w - 8, align: cell.align, lineBreak: false });
        }
        cx += col.w;
      });
      y += ROW_H;
    });

    // ── FILA TOTALES ──────────────────────────────────────────────────────
    if (y + ROW_H > doc.page.height - 40) {
      doc.addPage({ margin: 0, size: 'A4', layout: 'landscape' });
      y = 14;
    }
    doc.rect(ML, y, PW, ROW_H + 2).fill(DARK);
    let cx3 = ML;
    const totRow = ['TOTALES', '', '', '', `${activas.length} pedidos`, `Bs ${N(totalGeneral)}`, `Bs ${N(totalSaldo)}`, ''];
    totRow.forEach((v, ci) => {
      doc.font('Helvetica-Bold').fontSize(7).fillColor(GOLD)
         .text(v, cx3 + 4, y + 5, { width: COLS[ci].w - 8, align: COLS[ci].align });
      cx3 += COLS[ci].w;
    });
    y += ROW_H + 10;

    // ── PIE DE PÁGINA ─────────────────────────────────────────────────────
    doc.rect(ML, y, PW, 0.5).fill('#E4E4E7');
    y += 6;
    doc.font('Helvetica').fontSize(6).fillColor('#A1A1AA')
       .text(`${nombreEm}  ·  Reporte de Compras  ·  Período: ${desde} al ${hasta}`, ML, y, { width: PW, align: 'left' })
       .text(`Generado el ${fechaGen}`, ML, y, { width: PW, align: 'right' });

    doc.end();
  } catch (err) {
    console.error('[exportarComprasPDF]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}

// ── Exportar reporte PDF ───────────────────────────────────────────────────
async function exportarReporte(req, res) {
  try {
    const { tipo } = req.query;
    if (tipo === 'stock')           return exportarStockPDF(req, res);
    if (tipo === 'cuentas-cobrar')  return exportarCuentasCobrarPDF(req, res);
    if (tipo === 'cuentas-pagar')   return exportarCuentasPagarPDF(req, res);
    if (tipo === 'transferencias')  return exportarTransferenciasPDF(req, res);
    if (tipo === 'top-productos')   return exportarTopProductosPDF(req, res);
    if (tipo === 'ventas')          return exportarVentasPDF(req, res);
    if (tipo === 'compras')         return exportarComprasPDF(req, res);
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

// ── Compras por proveedor ─────────────────────────────────────────────────
async function getComprasProveedor(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT pr.codigo, pr.razon_social AS proveedor,
        pr.contacto_principal, pr.telefono,
        COUNT(c.id_compra) AS num_compras,
        SUM(c.total) AS total_comprado,
        SUM(c.saldo_pendiente) AS total_pendiente,
        MAX(c.fecha_pedido) AS ultima_compra
      FROM compras c
      JOIN proveedores pr ON pr.id_proveedor=c.id_proveedor
      JOIN sucursales s ON s.id_sucursal=c.id_sucursal
      WHERE c.fecha_pedido BETWEEN ? AND ? AND c.estado != 'ANULADO'
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND c.id_sucursal=?'; params.push(id_sucursal); }
    sql += ' GROUP BY c.id_proveedor ORDER BY total_comprado DESC';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Alertas de stock mínimo ───────────────────────────────────────────────
async function getAlertasStock(req, res) {
  try {
    const { id_sucursal, id_deposito } = req.query;
    let sql = `
      SELECT p.codigo_interno, p.producto, m.nombre AS marca, cat.nombre AS categoria,
        d.nombre AS deposito, s.nombre AS sucursal,
        p.stock_minimo,
        COALESCE(st.cantidad_disponible, 0) AS cantidad_disponible,
        COALESCE(st.cantidad, 0) AS cantidad_total,
        CASE
          WHEN COALESCE(st.cantidad_disponible, 0) = 0 THEN 'SIN_STOCK'
          ELSE 'BAJO_MINIMO'
        END AS estado_stock
      FROM productos p
      JOIN marcas m ON m.id_marca=p.id_marca
      JOIN categorias cat ON cat.id_categoria=p.id_categoria
      JOIN stock st ON st.id_producto=p.id_producto
      JOIN depositos d ON d.id_deposito=st.id_deposito
      JOIN sucursales s ON s.id_sucursal=d.id_sucursal
      WHERE p.activo=1 AND p.stock_minimo > 0
        AND COALESCE(st.cantidad_disponible, 0) < p.stock_minimo
    `;
    const params = [];
    if (id_sucursal) { sql += ' AND d.id_sucursal=?'; params.push(id_sucursal); }
    if (id_deposito) { sql += ' AND st.id_deposito=?'; params.push(id_deposito); }
    sql += ' ORDER BY COALESCE(st.cantidad_disponible, 0) ASC, p.producto LIMIT 500';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Transferencias ────────────────────────────────────────────────────────
async function getTransferencias(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal, estado } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT t.numero,
        DATE_FORMAT(t.fecha_solicitud,'%Y-%m-%d %H:%i') AS fecha_solicitud,
        DATE_FORMAT(t.fecha_envio,'%Y-%m-%d %H:%i') AS fecha_envio,
        DATE_FORMAT(t.fecha_recepcion,'%Y-%m-%d %H:%i') AS fecha_recepcion,
        dor.nombre AS deposito_origen, sor.nombre AS sucursal_origen,
        dde.nombre AS deposito_destino, sde.nombre AS sucursal_destino,
        t.estado,
        COUNT(td.id_detalle) AS num_productos,
        COALESCE(SUM(td.cantidad_enviada), 0) AS total_enviado,
        CONCAT(us.nombres,' ',us.apellidos) AS solicitante
      FROM transferencias t
      JOIN depositos dor ON dor.id_deposito=t.id_deposito_origen
      JOIN sucursales sor ON sor.id_sucursal=dor.id_sucursal
      JOIN depositos dde ON dde.id_deposito=t.id_deposito_destino
      JOIN sucursales sde ON sde.id_sucursal=dde.id_sucursal
      LEFT JOIN transferencia_detalle td ON td.id_transferencia=t.id_transferencia
      LEFT JOIN usuarios us ON us.id_usuario=t.id_usuario_solicita
      WHERE DATE(t.fecha_solicitud) BETWEEN ? AND ?
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND (sor.id_sucursal=? OR sde.id_sucursal=?)'; params.push(id_sucursal, id_sucursal); }
    if (estado) { sql += ' AND t.estado=?'; params.push(estado); }
    sql += ' GROUP BY t.id_transferencia ORDER BY t.fecha_solicitud DESC LIMIT 500';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Devoluciones ──────────────────────────────────────────────────────────
async function getDevoluciones(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal, estado } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT dv.numero, DATE_FORMAT(dv.fecha,'%Y-%m-%d %H:%i') AS fecha,
        v.numero AS venta_numero,
        COALESCE(c.razon_social, CONCAT(c.nombres,' ',c.apellidos)) AS cliente,
        s.nombre AS sucursal,
        dv.motivo, dv.total, dv.estado,
        CONCAT(u.nombres,' ',u.apellidos) AS usuario
      FROM devoluciones_venta dv
      JOIN ventas v ON v.id_venta=dv.id_venta
      JOIN clientes c ON c.id_cliente=v.id_cliente
      JOIN depositos d ON d.id_deposito=dv.id_deposito
      JOIN sucursales s ON s.id_sucursal=d.id_sucursal
      LEFT JOIN usuarios u ON u.id_usuario=dv.id_usuario
      WHERE DATE(dv.fecha) BETWEEN ? AND ?
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND d.id_sucursal=?'; params.push(id_sucursal); }
    if (estado) { sql += ' AND dv.estado=?'; params.push(estado); }
    sql += ' ORDER BY dv.fecha DESC LIMIT 500';

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
  getComprasProveedor,
  getCuentasCobrar,
  getCuentasPagar,
  getRentabilidad,
  getEstadoResultados,
  getBonosVendedores,
  getBonosVendedoresDetalle,
  getStockConsolidado,
  getKardexProducto,
  getArqueosCaja,
  getGastosCategoria,
  getTopProductos,
  getAlertasStock,
  getTransferencias,
  getDevoluciones,
  exportarReporte,
  getFormDataSucursales,
};

async function getFormDataSucursales(req, res) {
  try {
    const [rows] = await db.promise().query(
      `SELECT id_sucursal, nombre, tipo FROM sucursales WHERE activo = 1 ORDER BY tipo DESC, nombre ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
