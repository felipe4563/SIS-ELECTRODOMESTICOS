const db = require('../config/db');
const getIp   = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?,?,?,?,?)`,
    [userId, tabla, String(id), accion, ip]
  ).catch(e => console.error('[auditLog]', accion, tabla, e.message));

// ── Cajas ─────────────────────────────────────────────────────────────────

async function getCajas(req, res) {
  try {
    const verTodos = req.ability.can('ver_arqueo_todos', 'caja') || req.ability.can('gestionar', 'caja');
    const filtroSucursal = verTodos ? '' : 'AND c.id_sucursal = ?';
    const params = verTodos ? [] : [req.user.id_sucursal];

    const [rows] = await db.promise().query(`
      SELECT c.id_caja, c.nombre, c.activo, c.id_sucursal,
        s.nombre AS sucursal,
        aq.id_arqueo,
        aq.id_usuario AS usuario_turno_id,
        CONCAT(u.nombres, ' ', u.apellidos) AS usuario_turno,
        aq.fecha_apertura,
        aq.monto_apertura
      FROM cajas c
      JOIN sucursales s ON s.id_sucursal = c.id_sucursal
      LEFT JOIN arqueos_caja aq ON aq.id_caja = c.id_caja AND aq.estado = 'ABIERTA'
      LEFT JOIN usuarios u ON u.id_usuario = aq.id_usuario
      WHERE c.activo = 1 ${filtroSucursal}
      ORDER BY s.nombre, c.nombre
    `, params);
    res.json({ cajas: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener cajas' });
  }
}

async function crearCaja(req, res) {
  try {
    const { id_sucursal, nombre } = req.body;
    if (!id_sucursal || !nombre?.trim()) {
      return res.status(400).json({ mensaje: 'Sucursal y nombre son requeridos' });
    }
    const [result] = await db.promise().query(
      'INSERT INTO cajas (id_sucursal, nombre) VALUES (?, ?)',
      [id_sucursal, nombre.trim()]
    );
    await auditLog(req.user.id_usuario, 'cajas', result.insertId, 'INSERT', getIp(req));
    res.status(201).json({ id_caja: result.insertId, mensaje: 'Caja creada correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear caja' });
  }
}

async function updateCaja(req, res) {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ mensaje: 'Nombre requerido' });
    await db.promise().query(
      'UPDATE cajas SET nombre = ?, activo = ? WHERE id_caja = ?',
      [nombre.trim(), activo ?? 1, id]
    );
    await auditLog(req.user.id_usuario, 'cajas', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Caja actualizada correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al actualizar caja' });
  }
}

// ── Arqueos ───────────────────────────────────────────────────────────────

async function getArqueos(req, res) {
  try {
    const { id_caja, estado, fecha_desde, fecha_hasta } = req.query;
    const where  = [];
    const params = [];

    // Scope: si no tiene ver_arqueo_todos → solo sus propios arqueos
    const verTodos = req.ability.can('ver_arqueo_todos', 'caja');
    if (!verTodos) {
      where.push('aq.id_usuario = ?');
      params.push(req.user.id_usuario);
    }

    if (id_caja)     { where.push('aq.id_caja = ?');               params.push(id_caja); }
    if (estado)      { where.push('aq.estado = ?');                params.push(estado); }
    if (fecha_desde) { where.push('DATE(aq.fecha_apertura) >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { where.push('DATE(aq.fecha_apertura) <= ?'); params.push(fecha_hasta); }

    const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await db.promise().query(`
      SELECT aq.id_arqueo, aq.id_caja, aq.id_usuario, aq.estado,
        aq.fecha_apertura, aq.fecha_cierre,
        aq.monto_apertura, aq.monto_cierre_sistema, aq.monto_cierre_real, aq.diferencia,
        aq.observaciones,
        c.nombre AS caja,
        s.nombre AS sucursal,
        CONCAT(u.nombres, ' ', u.apellidos) AS usuario
      FROM arqueos_caja aq
      JOIN cajas c ON c.id_caja = aq.id_caja
      JOIN sucursales s ON s.id_sucursal = c.id_sucursal
      JOIN usuarios u ON u.id_usuario = aq.id_usuario
      ${whereStr}
      ORDER BY aq.fecha_apertura DESC
      LIMIT 300
    `, params);

    res.json({ arqueos: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener arqueos' });
  }
}

async function getArqueoActual(req, res) {
  try {
    const [[arqueo]] = await db.promise().query(`
      SELECT aq.*, c.nombre AS caja, c.id_sucursal, s.nombre AS sucursal,
        CONCAT(u.nombres, ' ', u.apellidos) AS usuario
      FROM arqueos_caja aq
      JOIN cajas c ON c.id_caja = aq.id_caja
      JOIN sucursales s ON s.id_sucursal = c.id_sucursal
      JOIN usuarios u ON u.id_usuario = aq.id_usuario
      WHERE aq.id_usuario = ? AND aq.estado = 'ABIERTA'
      ORDER BY aq.fecha_apertura DESC LIMIT 1
    `, [req.user.id_usuario]);
    res.json({ arqueo: arqueo ?? null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener arqueo actual' });
  }
}

async function getArqueo(req, res) {
  try {
    const { id } = req.params;

    const [[arqueo]] = await db.promise().query(`
      SELECT aq.*, c.nombre AS caja, c.id_sucursal, s.nombre AS sucursal,
        CONCAT(u.nombres, ' ', u.apellidos) AS usuario
      FROM arqueos_caja aq
      JOIN cajas c ON c.id_caja = aq.id_caja
      JOIN sucursales s ON s.id_sucursal = c.id_sucursal
      JOIN usuarios u ON u.id_usuario = aq.id_usuario
      WHERE aq.id_arqueo = ?
    `, [id]);

    if (!arqueo) return res.status(404).json({ mensaje: 'Arqueo no encontrado' });

    const verTodos = req.ability.can('ver_arqueo_todos', 'caja');
    if (!verTodos && arqueo.id_usuario !== req.user.id_usuario) {
      return res.status(403).json({ mensaje: 'No tenés acceso a este arqueo' });
    }

    const fechaHasta = arqueo.fecha_cierre ?? new Date();

    // Cobros de todos los métodos durante el turno (filtrado por arqueo para separar cajas)
    const [cobros] = await db.promise().query(`
      SELECT pv.id_pago, pv.numero, pv.fecha, pv.monto, pv.metodo_pago,
        v.numero AS venta_numero,
        CONCAT(cl.nombres, ' ', COALESCE(cl.apellidos, '')) AS cliente
      FROM pagos_venta pv
      JOIN ventas v  ON v.id_venta   = pv.id_venta
      JOIN clientes cl ON cl.id_cliente = pv.id_cliente
      WHERE pv.id_arqueo = ?
      ORDER BY pv.fecha
    `, [arqueo.id_arqueo]);

    // Gastos de todos los métodos durante el turno
    const [gastos] = await db.promise().query(`
      SELECT g.id_gasto, g.numero, g.fecha_creacion AS fecha, g.monto, g.metodo_pago,
        g.descripcion,
        cg.nombre AS categoria
      FROM gastos g
      LEFT JOIN categorias_gasto cg ON cg.id_categoria_gasto = g.id_categoria_gasto
      WHERE g.estado != 'ANULADO'
        AND (
          g.id_arqueo = ?
          OR (g.id_arqueo IS NULL AND g.id_sucursal = ? AND g.fecha_creacion >= ? AND g.fecha_creacion <= ?)
        )
      ORDER BY g.fecha_creacion
    `, [arqueo.id_arqueo, arqueo.id_sucursal, arqueo.fecha_apertura, fechaHasta]);

    // Pagos a proveedores de todos los métodos durante el turno
    const [pagosCompra] = await db.promise().query(`
      SELECT pc.id_pago, pc.numero, pc.fecha, pc.monto, pc.metodo_pago,
        COALESCE(p.razon_social, p.nombre_comercial) AS proveedor
      FROM pagos_compra pc
      LEFT JOIN proveedores p ON p.id_proveedor = pc.id_proveedor
      WHERE pc.id_sucursal = ?
        AND pc.fecha >= ?
        AND pc.fecha <= ?
      ORDER BY pc.fecha
    `, [arqueo.id_sucursal, arqueo.fecha_apertura, fechaHasta]);

    let monto_cierre_sistema_provisional = null;
    if (arqueo.estado === 'ABIERTA') {
      // El cuadre solo cuenta efectivo (lo que físicamente está en caja)
      const totalCobros    = cobros.filter(c => c.metodo_pago === 'EFECTIVO').reduce((s, c) => s + Number(c.monto), 0);
      const totalGastos    = gastos.filter(g => g.metodo_pago === 'EFECTIVO').reduce((s, g) => s + Number(g.monto), 0);
      const totalPagosComp = pagosCompra.filter(p => p.metodo_pago === 'EFECTIVO').reduce((s, p) => s + Number(p.monto), 0);
      monto_cierre_sistema_provisional =
        Number(arqueo.monto_apertura) + totalCobros - totalGastos - totalPagosComp;
    }

    res.json({ arqueo, cobros, gastos, pagosCompra, monto_cierre_sistema_provisional });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener arqueo' });
  }
}

async function abrirCaja(req, res) {
  try {
    const { id_caja } = req.params;
    const { monto_apertura = 0 } = req.body;

    const [[caja]] = await db.promise().query(
      'SELECT * FROM cajas WHERE id_caja = ? AND activo = 1', [id_caja]
    );
    if (!caja) return res.status(404).json({ mensaje: 'Caja no encontrada' });

    // Verificar que la caja pertenezca a la sucursal del usuario (salvo acceso global)
    const tieneAccesoTotal = req.ability.can('ver_arqueo_todos', 'caja') || req.ability.can('gestionar', 'caja');
    if (!tieneAccesoTotal && Number(caja.id_sucursal) !== Number(req.user.id_sucursal)) {
      return res.status(403).json({ mensaje: 'No tienes acceso a cajas de otra sucursal' });
    }

    const [[abierto]] = await db.promise().query(
      "SELECT id_arqueo FROM arqueos_caja WHERE id_caja = ? AND estado = 'ABIERTA'", [id_caja]
    );
    if (abierto) return res.status(400).json({ mensaje: 'Esta caja ya tiene un turno abierto' });

    const [result] = await db.promise().query(
      `INSERT INTO arqueos_caja (id_caja, id_usuario, monto_apertura, estado)
       VALUES (?, ?, ?, 'ABIERTA')`,
      [id_caja, req.user.id_usuario, monto_apertura]
    );

    await auditLog(req.user.id_usuario, 'arqueos_caja', result.insertId, 'INSERT', getIp(req));
    res.status(201).json({ id_arqueo: result.insertId, mensaje: 'Caja abierta correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al abrir caja' });
  }
}

async function _cerrarArqueo(req, res, omitirCheckDueno) {
  try {
    const { id } = req.params;
    const { monto_cierre_real, observaciones } = req.body;

    if (monto_cierre_real === undefined || monto_cierre_real === null) {
      return res.status(400).json({ mensaje: 'Ingresá el monto físico real' });
    }

    const [[arqueo]] = await db.promise().query(`
      SELECT aq.*, c.id_sucursal
      FROM arqueos_caja aq
      JOIN cajas c ON c.id_caja = aq.id_caja
      WHERE aq.id_arqueo = ?
    `, [id]);

    if (!arqueo) return res.status(404).json({ mensaje: 'Arqueo no encontrado' });
    if (arqueo.estado !== 'ABIERTA') return res.status(400).json({ mensaje: 'El arqueo ya está cerrado' });

    if (!omitirCheckDueno && arqueo.id_usuario !== req.user.id_usuario) {
      return res.status(403).json({ mensaje: 'Solo el cajero que abrió el turno puede cerrarlo' });
    }

    // Cobros en efectivo del turno (filtrado por arqueo para separar cajas)
    const [[{ total_cobros }]] = await db.promise().query(`
      SELECT COALESCE(SUM(monto), 0) AS total_cobros
      FROM pagos_venta
      WHERE id_arqueo = ? AND metodo_pago = 'EFECTIVO'
    `, [arqueo.id_arqueo]);

    // Gastos en efectivo del turno
    const [[{ total_gastos }]] = await db.promise().query(`
      SELECT COALESCE(SUM(monto), 0) AS total_gastos
      FROM gastos
      WHERE metodo_pago = 'EFECTIVO' AND estado != 'ANULADO'
        AND (
          id_arqueo = ?
          OR (id_arqueo IS NULL AND id_sucursal = ? AND fecha_creacion >= ?)
        )
    `, [arqueo.id_arqueo, arqueo.id_sucursal, arqueo.fecha_apertura]);

    // Pagos a proveedores en efectivo del turno
    const [[{ total_pagos_compra }]] = await db.promise().query(`
      SELECT COALESCE(SUM(monto), 0) AS total_pagos_compra
      FROM pagos_compra
      WHERE id_sucursal = ? AND metodo_pago = 'EFECTIVO' AND fecha >= ?
    `, [arqueo.id_sucursal, arqueo.fecha_apertura]);

    const monto_cierre_sistema =
      Number(arqueo.monto_apertura) +
      Number(total_cobros) -
      Number(total_gastos) -
      Number(total_pagos_compra);

    await db.promise().query(`
      UPDATE arqueos_caja
      SET estado = 'CERRADA', fecha_cierre = NOW(),
          monto_cierre_sistema = ?, monto_cierre_real = ?, observaciones = ?
      WHERE id_arqueo = ?
    `, [monto_cierre_sistema, monto_cierre_real, observaciones ?? null, id]);

    const accionCierre = omitirCheckDueno ? 'FORZAR_CIERRE' : 'UPDATE';
    await auditLog(req.user.id_usuario, 'arqueos_caja', id, accionCierre, getIp(req));
    res.json({ mensaje: 'Caja cerrada correctamente', monto_cierre_sistema });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al cerrar caja' });
  }
}

async function cerrarCaja(req, res) { return _cerrarArqueo(req, res, false); }

// ── Libro Caja ────────────────────────────────────────────────────────────
// Ingresos (cobros de ventas) + egresos (pagos a proveedores y gastos),
// ordenados cronológicamente con saldo acumulado. No depende de un arqueo
// puntual: se filtra por sucursal y rango de fechas, así cubre también los
// gastos que nunca pasaron por una caja abierta.

async function getLibroCaja(req, res) {
  try {
    let { id_sucursal, fecha_desde, fecha_hasta, metodo_pago, page = 1, limit = 20 } = req.query;

    const safeLimit = Math.min(Number(limit) || 20, 200);
    const safePage  = Math.max(Number(page) || 1, 1);

    const verTodos = req.ability.can('ver_arqueo_todos', 'caja');
    if (!verTodos) id_sucursal = req.user.id_sucursal;

    const desde = fecha_desde ? `${fecha_desde} 00:00:00` : '1970-01-01 00:00:00';
    const hasta = fecha_hasta ? `${fecha_hasta} 23:59:59` : '2999-12-31 23:59:59';

    const sucCond  = alias => id_sucursal ? `AND ${alias}.id_sucursal = ?` : '';
    const sucParam = id_sucursal ? [id_sucursal] : [];

    const metCond  = alias => metodo_pago ? `AND ${alias}.metodo_pago = ?` : '';
    const metParam = metodo_pago ? [metodo_pago] : [];

    const [ingresos] = await db.promise().query(`
      SELECT pv.id_pago, pv.numero, pv.fecha, pv.monto, pv.metodo_pago,
        v.numero AS venta_numero,
        CONCAT(cl.nombres, ' ', COALESCE(cl.apellidos, '')) AS referencia
      FROM pagos_venta pv
      JOIN ventas v    ON v.id_venta    = pv.id_venta
      JOIN clientes cl ON cl.id_cliente = pv.id_cliente
      WHERE pv.fecha >= ? AND pv.fecha <= ? ${sucCond('pv')} ${metCond('pv')}
      ORDER BY pv.fecha
    `, [desde, hasta, ...sucParam, ...metParam]);

    const [egresosCompra] = await db.promise().query(`
      SELECT pc.id_pago, pc.numero, pc.fecha, pc.monto, pc.metodo_pago,
        c.numero AS compra_numero,
        COALESCE(p.razon_social, p.nombre_comercial) AS referencia
      FROM pagos_compra pc
      LEFT JOIN compras c     ON c.id_compra    = pc.id_compra
      LEFT JOIN proveedores p ON p.id_proveedor = pc.id_proveedor
      WHERE pc.fecha >= ? AND pc.fecha <= ? ${sucCond('pc')} ${metCond('pc')}
      ORDER BY pc.fecha
    `, [desde, hasta, ...sucParam, ...metParam]);

    const [gastos] = await db.promise().query(`
      SELECT g.id_gasto, g.numero, g.fecha_creacion AS fecha, g.monto, g.metodo_pago,
        g.descripcion AS referencia,
        cg.nombre AS categoria
      FROM gastos g
      LEFT JOIN categorias_gasto cg ON cg.id_categoria_gasto = g.id_categoria_gasto
      WHERE g.estado != 'ANULADO' AND g.fecha_creacion >= ? AND g.fecha_creacion <= ? ${sucCond('g')} ${metCond('g')}
      ORDER BY g.fecha_creacion
    `, [desde, hasta, ...sucParam, ...metParam]);

    const movimientos = [
      ...ingresos.map(r => ({
        id: `V${r.id_pago}`, fecha: r.fecha, tipo: 'INGRESO', origen: 'VENTA',
        numero: r.numero, documento: r.venta_numero, referencia: r.referencia?.trim() || null,
        metodo_pago: r.metodo_pago, monto: Number(r.monto),
      })),
      ...egresosCompra.map(r => ({
        id: `C${r.id_pago}`, fecha: r.fecha, tipo: 'EGRESO', origen: 'COMPRA',
        numero: r.numero, documento: r.compra_numero, referencia: r.referencia ?? null,
        metodo_pago: r.metodo_pago, monto: Number(r.monto),
      })),
      ...gastos.map(r => ({
        id: `G${r.id_gasto}`, fecha: r.fecha, tipo: 'EGRESO', origen: 'GASTO',
        numero: r.numero, documento: r.categoria ?? null, referencia: r.referencia,
        metodo_pago: r.metodo_pago, monto: Number(r.monto),
      })),
    ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const totalIngresos = ingresos.reduce((s, r) => s + Number(r.monto), 0);
    const totalEgresos   = egresosCompra.reduce((s, r) => s + Number(r.monto), 0)
                          + gastos.reduce((s, r) => s + Number(r.monto), 0);

    let saldo = 0;
    for (const m of movimientos) {
      saldo += m.tipo === 'INGRESO' ? m.monto : -m.monto;
      m.saldo = +saldo.toFixed(2);
    }

    // El saldo corrido se calcula sobre TODO el rango en orden cronológico
    // (arriba). Para mostrar los más recientes primero, invertimos recién acá
    // y paginamos ya en orden de exhibición — cada fila conserva el saldo que
    // le corresponde, solo cambia el orden en que se listan.
    const total = movimientos.length;
    const offset = (safePage - 1) * safeLimit;
    const pagina = [...movimientos].reverse().slice(offset, offset + safeLimit);

    res.json({
      movimientos: pagina,
      total,
      page: safePage,
      limit: safeLimit,
      totales: {
        ingresos: +totalIngresos.toFixed(2),
        egresos:  +totalEgresos.toFixed(2),
        saldo:    +saldo.toFixed(2),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener el libro caja' });
  }
}

module.exports = {
  getCajas, crearCaja, updateCaja,
  getArqueos, getArqueoActual, getArqueo,
  abrirCaja, cerrarCaja,
  getLibroCaja,
};
