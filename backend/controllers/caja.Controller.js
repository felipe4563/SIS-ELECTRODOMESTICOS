const db = require('../config/db');
const getIp   = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?,?,?,?,?)`,
    [userId, tabla, String(id), accion, ip]
  );

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

async function getArqueos(req, res) {
  try {
    const { id_caja, estado, fecha_desde, fecha_hasta } = req.query;
    const where  = [];
    const params = [];

    if (id_caja)     { where.push('aq.id_caja = ?');                    params.push(id_caja); }
    if (estado)      { where.push('aq.estado = ?');                     params.push(estado); }
    if (fecha_desde) { where.push('DATE(aq.fecha_apertura) >= ?');      params.push(fecha_desde); }
    if (fecha_hasta) { where.push('DATE(aq.fecha_apertura) <= ?');      params.push(fecha_hasta); }

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

    // Si está abierto, calcular provisional
    let monto_cierre_sistema_provisional = null;
    if (arqueo.estado === 'ABIERTA') {
      const totalCobros = cobros.reduce((s, c) => s + Number(c.monto), 0);
      monto_cierre_sistema_provisional = Number(arqueo.monto_apertura) + totalCobros;
    }

    res.json({ arqueo, cobros, monto_cierre_sistema_provisional });
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

    const [[{ total_cobros }]] = await db.promise().query(`
      SELECT COALESCE(SUM(monto), 0) AS total_cobros
      FROM pagos_venta
      WHERE id_sucursal = ? AND metodo_pago = 'EFECTIVO' AND fecha >= ?
    `, [arqueo.id_sucursal, arqueo.fecha_apertura]);

    const monto_cierre_sistema = Number(arqueo.monto_apertura) + Number(total_cobros);

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

module.exports = { getCajas, getArqueos, getArqueo, abrirCaja, cerrarCaja, forzarCierre };
