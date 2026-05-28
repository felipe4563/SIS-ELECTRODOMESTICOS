const db = require('../config/db');

async function generarNumeroCobro() {
  const now = new Date();
  const ym  = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [[row]] = await db.promise().query(
    `SELECT COUNT(*) AS cnt FROM pagos_venta WHERE numero LIKE ?`, [`COB-${ym}-%`]
  );
  return `COB-${ym}-${String(Number(row.cnt) + 1).padStart(4, '0')}`;
}

// GET /api/cobros
const getCobros = async (req, res) => {
  try {
    const { tipo, estado, fecha_desde, fecha_hasta, busqueda, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where  = ['1=1'];
    const params = [];

    if (tipo === 'CONTADO') { where.push(`v.condicion_pago = 'CONTADO'`); }
    else if (tipo === 'CREDITO') { where.push(`v.condicion_pago = 'CREDITO'`); }

    if (fecha_desde) { where.push('DATE(pv.fecha) >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { where.push('DATE(pv.fecha) <= ?'); params.push(fecha_hasta); }

    if (estado === 'PENDIENTE') {
      where.push(`v.estado IN ('EMITIDA','PARCIAL')`);
    } else if (estado === 'PAGADA') {
      where.push(`v.estado = 'PAGADA'`);
    } else if (estado === 'VENCIDA') {
      where.push(`EXISTS (SELECT 1 FROM venta_cuotas vc2 WHERE vc2.id_venta = v.id_venta AND vc2.estado = 'VENCIDA')`);
    }

    if (busqueda) {
      const b = `%${busqueda}%`;
      where.push(`(pv.numero LIKE ? OR v.numero LIKE ? OR c.nombres LIKE ? OR c.apellidos LIKE ? OR c.documento LIKE ? OR c.razon_social LIKE ?)`);
      params.push(b, b, b, b, b, b);
    }

    const w = where.join(' AND ');

    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM pagos_venta pv
       JOIN ventas v   ON pv.id_venta   = v.id_venta
       JOIN clientes c ON pv.id_cliente = c.id_cliente
       WHERE ${w}`, params
    );

    const [rows] = await db.promise().query(
      `SELECT pv.id_pago, pv.numero, pv.fecha, pv.monto, pv.metodo_pago, pv.numero_referencia, pv.observaciones,
              v.numero AS numero_venta, v.condicion_pago, v.estado AS estado_venta, v.total AS total_venta, v.saldo_pendiente,
              CONCAT(COALESCE(c.nombres,''), ' ', COALESCE(c.apellidos,'')) AS cliente_nombre,
              COALESCE(c.razon_social,'') AS razon_social, c.documento AS cliente_documento, c.celular,
              CONCAT(u.nombres,' ',u.apellidos) AS cobrador,
              m.simbolo AS moneda_simbolo
       FROM pagos_venta pv
       JOIN ventas   v ON pv.id_venta   = v.id_venta
       JOIN clientes c ON pv.id_cliente = c.id_cliente
       JOIN usuarios u ON pv.id_usuario = u.id_usuario
       JOIN monedas   m ON pv.id_moneda  = m.id_moneda
       WHERE ${w}
       ORDER BY pv.fecha DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({ total: Number(total), page: Number(page), limit: Number(limit), data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

// GET /api/cobros/cuentas-por-cobrar  (STATIC — must be registered before /:id)
const getCuentasPorCobrar = async (req, res) => {
  try {
    const { busqueda } = req.query;
    const where  = [`v.estado IN ('EMITIDA','PARCIAL') AND v.saldo_pendiente > 0`];
    const params = [];

    if (busqueda) {
      const b = `%${busqueda}%`;
      where.push(`(c.nombres LIKE ? OR c.apellidos LIKE ? OR c.documento LIKE ? OR c.razon_social LIKE ?)`);
      params.push(b, b, b, b);
    }

    const [rows] = await db.promise().query(
      `SELECT c.id_cliente, c.codigo, c.nombres, c.apellidos, c.razon_social,
              c.documento, c.tipo_documento, c.celular,
              SUM(v.saldo_pendiente) AS total_pendiente,
              COUNT(DISTINCT v.id_venta) AS num_ventas
       FROM clientes c
       JOIN ventas v ON v.id_cliente = c.id_cliente
       WHERE ${where.join(' AND ')}
       GROUP BY c.id_cliente
       ORDER BY total_pendiente DESC`, params
    );

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

// GET /api/cobros/cliente/:id_cliente/ventas-pendientes  (STATIC — before /:id)
const getVentasPendientes = async (req, res) => {
  const { id_cliente } = req.params;
  try {
    const [ventas] = await db.promise().query(
      `SELECT v.id_venta, v.numero, v.fecha, v.total, v.saldo_pendiente, v.condicion_pago, v.dias_credito, v.fecha_vencimiento
       FROM ventas v
       WHERE v.id_cliente = ? AND v.estado IN ('EMITIDA','PARCIAL') AND v.saldo_pendiente > 0
       ORDER BY v.fecha DESC`,
      [id_cliente]
    );

    for (const v of ventas) {
      if (v.condicion_pago === 'CREDITO') {
        const [cuotas] = await db.promise().query(
          `SELECT id_cuota, numero_cuota, fecha_vencimiento, monto, monto_pagado, estado
           FROM venta_cuotas
           WHERE id_venta = ? AND estado IN ('PENDIENTE','PARCIAL','VENCIDA')
           ORDER BY numero_cuota`,
          [v.id_venta]
        );
        v.cuotas = cuotas;
      } else {
        v.cuotas = [];
      }
    }

    res.json(ventas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

// GET /api/cobros/:id/recibo
const getRecibo = async (req, res) => {
  const { id } = req.params;
  try {
    const [[pago]] = await db.promise().query(
      `SELECT pv.*,
              v.numero AS numero_venta, v.condicion_pago, v.total AS total_venta, v.saldo_pendiente AS saldo_post,
              CONCAT(COALESCE(c.nombres,''), ' ', COALESCE(c.apellidos,'')) AS cliente_nombre,
              COALESCE(c.razon_social,'') AS razon_social, c.documento, c.tipo_documento, c.celular,
              CONCAT(u.nombres,' ',u.apellidos) AS cobrador,
              s.nombre AS sucursal_nombre,
              m.simbolo AS moneda_simbolo, m.codigo AS moneda_codigo,
              vc.numero_cuota, vc.monto AS cuota_monto,
              e.razon_social AS empresa_razon, e.nombre_comercial, e.nit AS empresa_nit, e.telefono AS empresa_telefono
       FROM pagos_venta pv
       JOIN ventas    v  ON pv.id_venta   = v.id_venta
       JOIN clientes  c  ON pv.id_cliente = c.id_cliente
       JOIN usuarios  u  ON pv.id_usuario = u.id_usuario
       JOIN sucursales s ON pv.id_sucursal = s.id_sucursal
       JOIN monedas   m  ON pv.id_moneda   = m.id_moneda
       LEFT JOIN venta_cuotas vc ON pv.id_cuota = vc.id_cuota
       LEFT JOIN empresas e ON e.activo = 1
       WHERE pv.id_pago = ? LIMIT 1`,
      [id]
    );
    if (!pago) return res.status(404).json({ error: 'Cobro no encontrado' });
    res.json(pago);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

// POST /api/cobros
const registrarCobro = async (req, res) => {
  const {
    id_venta, id_cuota, id_cliente, id_sucursal,
    metodo_pago, id_moneda, tipo_cambio = 1,
    monto, numero_referencia, observaciones,
  } = req.body;

  if (!id_venta || !id_cliente || !id_sucursal || !metodo_pago || !id_moneda || !monto) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    const [[venta]] = await db.promise().query(
      `SELECT id_venta, saldo_pendiente, total, estado, condicion_pago FROM ventas WHERE id_venta = ?`,
      [id_venta]
    );
    if (!venta)                      return res.status(404).json({ error: 'Venta no encontrada' });
    if (venta.estado === 'ANULADA')  return res.status(400).json({ error: 'La venta está anulada' });
    if (Number(venta.saldo_pendiente) <= 0) return res.status(400).json({ error: 'La venta no tiene saldo pendiente' });
    if (Number(monto) > Number(venta.saldo_pendiente)) {
      return res.status(400).json({ error: `El monto (${monto}) excede el saldo pendiente (${venta.saldo_pendiente})` });
    }

    const numero = await generarNumeroCobro();

    const [ins] = await db.promise().query(
      `INSERT INTO pagos_venta
         (numero, id_venta, id_cuota, id_cliente, id_sucursal, metodo_pago, id_moneda, tipo_cambio, monto, numero_referencia, id_usuario, observaciones)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [numero, id_venta, id_cuota || null, id_cliente, id_sucursal, metodo_pago,
       id_moneda, tipo_cambio, monto, numero_referencia || null, req.user.id_usuario, observaciones || null]
    );
    const id_pago = ins.insertId;

    // Actualizar cuota si aplica
    if (id_cuota) {
      const [[cuota]] = await db.promise().query(
        `SELECT id_cuota, monto, monto_pagado FROM venta_cuotas WHERE id_cuota = ?`, [id_cuota]
      );
      if (cuota) {
        const nuevoPagado  = Number(cuota.monto_pagado) + Number(monto);
        const estadoCuota  = nuevoPagado >= Number(cuota.monto) ? 'PAGADA' : 'PARCIAL';
        await db.promise().query(
          `UPDATE venta_cuotas SET monto_pagado = ?, estado = ? WHERE id_cuota = ?`,
          [nuevoPagado, estadoCuota, id_cuota]
        );
      }
    }

    // Actualizar venta
    const nuevoSaldo  = Math.max(0, Number(venta.saldo_pendiente) - Number(monto));
    const estadoVenta = nuevoSaldo === 0 ? 'PAGADA' : 'PARCIAL';
    await db.promise().query(
      `UPDATE ventas SET saldo_pendiente = ?, estado = ? WHERE id_venta = ?`,
      [nuevoSaldo, estadoVenta, id_venta]
    );

    // Actualizar saldo cliente
    await db.promise().query(
      `UPDATE clientes SET saldo_actual = GREATEST(0, saldo_actual - ?) WHERE id_cliente = ?`,
      [monto, id_cliente]
    );

    // Arqueo de caja si EFECTIVO
    if (metodo_pago === 'EFECTIVO') {
      const [[arqueo]] = await db.promise().query(
        `SELECT a.id_arqueo FROM arqueos_caja a
         JOIN cajas c ON a.id_caja = c.id_caja
         WHERE c.id_sucursal = ? AND a.estado = 'ABIERTA'
         ORDER BY a.fecha_apertura DESC LIMIT 1`,
        [id_sucursal]
      );
      if (arqueo) {
        await db.promise().query(
          `UPDATE arqueos_caja SET monto_cierre_sistema = monto_cierre_sistema + ? WHERE id_arqueo = ?`,
          [monto, arqueo.id_arqueo]
        );
      }
    }

    // Auditoría
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, datos_despues, ip_origen)
       VALUES (?, 'pagos_venta', ?, 'INSERT', ?, ?)`,
      [req.user.id_usuario, id_pago, JSON.stringify({ numero, id_venta, id_cuota, monto, metodo_pago }), req.ip]
    );

    res.status(201).json({ id_pago, numero, message: 'Cobro registrado correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/cobros/:id
const updateCobro = async (req, res) => {
  const { id } = req.params;
  const { numero_referencia, observaciones } = req.body;
  try {
    const [[pago]] = await db.promise().query(`SELECT id_pago FROM pagos_venta WHERE id_pago = ?`, [id]);
    if (!pago) return res.status(404).json({ error: 'Cobro no encontrado' });

    await db.promise().query(
      `UPDATE pagos_venta SET numero_referencia = ?, observaciones = ? WHERE id_pago = ?`,
      [numero_referencia || null, observaciones || null, id]
    );
    res.json({ message: 'Cobro actualizado' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/cobros/:id  (anular)
const anularCobro = async (req, res) => {
  const { id } = req.params;
  try {
    const [[pago]] = await db.promise().query(
      `SELECT pv.*, v.saldo_pendiente, v.total, v.estado AS estado_venta
       FROM pagos_venta pv
       JOIN ventas v ON pv.id_venta = v.id_venta
       WHERE pv.id_pago = ?`,
      [id]
    );
    if (!pago) return res.status(404).json({ error: 'Cobro no encontrado' });

    // Revertir cuota
    if (pago.id_cuota) {
      const [[cuota]] = await db.promise().query(
        `SELECT id_cuota, monto, monto_pagado FROM venta_cuotas WHERE id_cuota = ?`, [pago.id_cuota]
      );
      if (cuota) {
        const nuevoPagado = Math.max(0, Number(cuota.monto_pagado) - Number(pago.monto));
        const estadoCuota = nuevoPagado === 0 ? 'PENDIENTE' : 'PARCIAL';
        await db.promise().query(
          `UPDATE venta_cuotas SET monto_pagado = ?, estado = ? WHERE id_cuota = ?`,
          [nuevoPagado, estadoCuota, pago.id_cuota]
        );
      }
    }

    // Revertir venta
    const nuevoSaldo  = Number(pago.saldo_pendiente) + Number(pago.monto);
    const estadoVenta = nuevoSaldo >= Number(pago.total) ? 'EMITIDA' : 'PARCIAL';
    await db.promise().query(
      `UPDATE ventas SET saldo_pendiente = ?, estado = ? WHERE id_venta = ?`,
      [nuevoSaldo, estadoVenta, pago.id_venta]
    );

    // Revertir cliente
    await db.promise().query(
      `UPDATE clientes SET saldo_actual = saldo_actual + ? WHERE id_cliente = ?`,
      [pago.monto, pago.id_cliente]
    );

    // Revertir arqueo
    if (pago.metodo_pago === 'EFECTIVO') {
      const [[arqueo]] = await db.promise().query(
        `SELECT a.id_arqueo FROM arqueos_caja a
         JOIN cajas c ON a.id_caja = c.id_caja
         WHERE c.id_sucursal = ? AND a.estado = 'ABIERTA'
         ORDER BY a.fecha_apertura DESC LIMIT 1`,
        [pago.id_sucursal]
      );
      if (arqueo) {
        await db.promise().query(
          `UPDATE arqueos_caja SET monto_cierre_sistema = GREATEST(0, monto_cierre_sistema - ?) WHERE id_arqueo = ?`,
          [pago.monto, arqueo.id_arqueo]
        );
      }
    }

    // Auditoría antes de eliminar
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, datos_antes, ip_origen)
       VALUES (?, 'pagos_venta', ?, 'DELETE', ?, ?)`,
      [req.user.id_usuario, id, JSON.stringify(pago), req.ip]
    );

    await db.promise().query(`DELETE FROM pagos_venta WHERE id_pago = ?`, [id]);

    res.json({ message: 'Cobro anulado correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getCobros, getCuentasPorCobrar, getVentasPendientes,
  getRecibo, registrarCobro, updateCobro, anularCobro,
};
