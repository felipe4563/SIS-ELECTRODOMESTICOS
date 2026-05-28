const db = require('../config/db');
const getIp   = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?,?,?,?,?)`,
    [userId, tabla, String(id), accion, ip]
  );

// ── Cajas ─────────────────────────────────────────────────────────────────

async function getCajas(req, res) {
  try {
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
      WHERE c.activo = 1
      ORDER BY s.nombre, c.nombre
    `);
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
    if (!arqueo) return res.status(404).json({ mensaje: 'Sin turno abierto' });
    res.json({ arqueo });
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

    const fechaHasta = arqueo.fecha_cierre ?? new Date();

    // Cobros en efectivo durante el turno
    const [cobros] = await db.promise().query(`
      SELECT pv.id_pago, pv.numero, pv.fecha, pv.monto,
        v.numero AS venta_numero,
        CONCAT(cl.nombres, ' ', COALESCE(cl.apellidos, '')) AS cliente
      FROM pagos_venta pv
      JOIN ventas v  ON v.id_venta   = pv.id_venta
      JOIN clientes cl ON cl.id_cliente = pv.id_cliente
      WHERE pv.id_sucursal = ?
        AND pv.metodo_pago = 'EFECTIVO'
        AND pv.fecha >= ?
        AND pv.fecha <= ?
      ORDER BY pv.fecha
    `, [arqueo.id_sucursal, arqueo.fecha_apertura, fechaHasta]);

    // Gastos en efectivo durante el turno
    const [gastos] = await db.promise().query(`
      SELECT g.id_gasto, g.numero, g.fecha_creacion AS fecha, g.monto,
        g.descripcion,
        cg.nombre AS categoria
      FROM gastos g
      LEFT JOIN categorias_gasto cg ON cg.id_categoria_gasto = g.id_categoria_gasto
      WHERE g.id_sucursal = ?
        AND g.metodo_pago = 'EFECTIVO'
        AND g.estado != 'ANULADO'
        AND g.fecha_creacion >= ?
        AND g.fecha_creacion <= ?
      ORDER BY g.fecha_creacion
    `, [arqueo.id_sucursal, arqueo.fecha_apertura, fechaHasta]);

    // Pagos a proveedores en efectivo durante el turno
    const [pagosCompra] = await db.promise().query(`
      SELECT pc.id_pago, pc.numero, pc.fecha, pc.monto,
        COALESCE(p.razon_social, p.nombre_comercial) AS proveedor
      FROM pagos_compra pc
      LEFT JOIN proveedores p ON p.id_proveedor = pc.id_proveedor
      WHERE pc.id_sucursal = ?
        AND pc.metodo_pago = 'EFECTIVO'
        AND pc.fecha >= ?
        AND pc.fecha <= ?
      ORDER BY pc.fecha
    `, [arqueo.id_sucursal, arqueo.fecha_apertura, fechaHasta]);

    let monto_cierre_sistema_provisional = null;
    if (arqueo.estado === 'ABIERTA') {
      const totalCobros     = cobros.reduce((s, c) => s + Number(c.monto), 0);
      const totalGastos     = gastos.reduce((s, g) => s + Number(g.monto), 0);
      const totalPagosComp  = pagosCompra.reduce((s, p) => s + Number(p.monto), 0);
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

    // Cobros en efectivo del turno
    const [[{ total_cobros }]] = await db.promise().query(`
      SELECT COALESCE(SUM(monto), 0) AS total_cobros
      FROM pagos_venta
      WHERE id_sucursal = ? AND metodo_pago = 'EFECTIVO' AND fecha >= ?
    `, [arqueo.id_sucursal, arqueo.fecha_apertura]);

    // Gastos en efectivo del turno
    const [[{ total_gastos }]] = await db.promise().query(`
      SELECT COALESCE(SUM(monto), 0) AS total_gastos
      FROM gastos
      WHERE id_sucursal = ? AND metodo_pago = 'EFECTIVO' AND estado != 'ANULADO'
        AND fecha_creacion >= ?
    `, [arqueo.id_sucursal, arqueo.fecha_apertura]);

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

async function cerrarCaja(req, res)   { return _cerrarArqueo(req, res, false); }
async function forzarCierre(req, res) { return _cerrarArqueo(req, res, true); }

module.exports = {
  getCajas, crearCaja, updateCaja,
  getArqueos, getArqueoActual, getArqueo,
  abrirCaja, cerrarCaja, forzarCierre,
};
