const db    = require('../config/db');
const getIp = req => req.ip || req.socket?.remoteAddress || null;

const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?,?,?,?,?)`,
    [userId, tabla, String(id), accion, ip]
  );

async function generarNumero(prefijo, tabla) {
  const hoy = new Date();
  const ym  = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const [[{ cnt }]] = await db.promise().query(
    `SELECT COUNT(*) AS cnt FROM ${tabla} WHERE numero LIKE ?`, [`${prefijo}-${ym}-%`]
  );
  return `${prefijo}-${ym}-${String(Number(cnt) + 1).padStart(4, '0')}`;
}

function calcTotales(items, body) {
  let subtotal = 0;
  for (const it of items) {
    const base = Number(it.cantidad) * Number(it.precio_unitario);
    const desc = base * (Number(it.descuento_porc ?? 0) / 100);
    it._subtotal = +(base - desc).toFixed(2);
    subtotal    += it._subtotal;
  }
  const descPorc  = +(Number(body.descuento_porc  ?? 0)).toFixed(2);
  const descMonto = +(subtotal * descPorc / 100).toFixed(2);
  const impuesto  = +(Number(body.impuesto ?? 0)).toFixed(2);
  const total     = +(subtotal - descMonto + impuesto).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), descuento_porc: descPorc, descuento_monto: descMonto, impuesto, total };
}

// ── Listar ────────────────────────────────────────────────────────────────────

const getCotizaciones = async (req, res) => {
  try {
    const { estado, tipo_cotizacion, id_cliente, id_sucursal, fecha_desde, fecha_hasta, q,
            page = 1, limit = 50 } = req.query;
    const conds = [], vals = [];

    if (estado)          { conds.push('co.estado = ?');                                vals.push(estado); }
    if (tipo_cotizacion) { conds.push('co.tipo_cotizacion = ?');                       vals.push(tipo_cotizacion); }
    if (id_cliente)      { conds.push('co.id_cliente = ?');                            vals.push(id_cliente); }
    if (id_sucursal)     { conds.push('co.id_sucursal = ?');                           vals.push(id_sucursal); }
    if (fecha_desde)     { conds.push('DATE(co.fecha) >= ?');                          vals.push(fecha_desde); }
    if (fecha_hasta)     { conds.push('DATE(co.fecha) <= ?');                          vals.push(fecha_hasta); }
    if (q) {
      conds.push('(co.numero LIKE ? OR c.razon_social LIKE ? OR CONCAT(c.nombres," ",c.apellidos) LIKE ?)');
      vals.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const where  = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM cotizaciones co
       JOIN clientes c ON c.id_cliente = co.id_cliente
       ${where}`, vals
    );

    const [rows] = await db.promise().query(
      `SELECT co.id_cotizacion, co.numero, co.estado, co.tipo_cotizacion,
              co.fecha, co.fecha_vencimiento, co.total,
              c.razon_social AS cliente_razon, c.nombres AS cliente_nombres,
              c.apellidos AS cliente_apellidos, c.codigo AS cliente_codigo,
              s.nombre AS sucursal_nombre,
              CONCAT(u.nombres,' ',u.apellidos) AS vendedor_nombre
       FROM cotizaciones co
       JOIN clientes  c ON c.id_cliente  = co.id_cliente
       JOIN sucursales s ON s.id_sucursal = co.id_sucursal
       JOIN usuarios  u ON u.id_usuario  = co.id_vendedor
       ${where}
       ORDER BY co.fecha DESC
       LIMIT ? OFFSET ?`, [...vals, Number(limit), offset]
    );

    res.json({ cotizaciones: rows, total: Number(total), page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('[getCotizaciones]', err);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
};

// ── Obtener una ───────────────────────────────────────────────────────────────

const getCotizacion = async (req, res) => {
  try {
    const { id } = req.params;

    // Auto-update vencida
    await db.promise().query(
      `UPDATE cotizaciones SET estado='VENCIDA'
       WHERE id_cotizacion = ? AND estado IN ('BORRADOR','EMITIDA','APROBADA')
         AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento < CURDATE()`, [id]
    );

    const [[cot]] = await db.promise().query(
      `SELECT co.*,
              c.razon_social AS cliente_razon, c.nombres AS cliente_nombres,
              c.apellidos AS cliente_apellidos, c.documento AS cliente_documento,
              c.telefono AS cliente_telefono, c.tipo_documento, c.tipo_cliente,
              c.email AS cliente_email,
              s.nombre AS sucursal_nombre, s.direccion AS sucursal_direccion,
              s.telefono AS sucursal_telefono,
              mon.codigo AS moneda_codigo, mon.simbolo AS moneda_simbolo,
              CONCAT(u.nombres,' ',u.apellidos) AS vendedor_nombre,
              u.email AS vendedor_email
       FROM cotizaciones co
       JOIN clientes   c   ON c.id_cliente   = co.id_cliente
       JOIN sucursales s   ON s.id_sucursal  = co.id_sucursal
       JOIN monedas    mon ON mon.id_moneda  = co.id_moneda
       JOIN usuarios   u   ON u.id_usuario   = co.id_vendedor
       WHERE co.id_cotizacion = ?`, [id]
    );
    if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' });

    const [detalle] = await db.promise().query(
      `SELECT cd.*, p.producto, p.codigo_interno, p.codigo_barras,
              p.imagen_url, um.nombre AS unidad_nombre
       FROM cotizacion_detalle cd
       JOIN productos       p  ON p.id_producto = cd.id_producto
       JOIN unidades_medida um ON um.id_unidad  = p.id_unidad
       WHERE cd.id_cotizacion = ?`, [id]
    );

    res.json({ ...cot, detalle });
  } catch (err) {
    console.error('[getCotizacion]', err);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
};

// ── Crear (BORRADOR) ──────────────────────────────────────────────────────────

const createCotizacion = async (req, res) => {
  try {
    const {
      id_sucursal, id_cliente, id_moneda = 1, tipo_cambio = 1,
      tipo_cotizacion = 'CONTADO', fecha_vencimiento,
      descuento_porc = 0, impuesto = 0, observaciones, items = [],
    } = req.body;

    if (!id_sucursal || !id_cliente)
      return res.status(400).json({ mensaje: 'Sucursal y cliente son obligatorios' });
    if (!items.length)
      return res.status(400).json({ mensaje: 'Debe agregar al menos un producto' });

    const { subtotal, descuento_monto, total } = calcTotales(items, { descuento_porc, impuesto });
    const numero = await generarNumero('COT', 'cotizaciones');

    const fv = fecha_vencimiento && fecha_vencimiento.trim() !== '' ? fecha_vencimiento : null;

    const [ins] = await db.promise().query(
      `INSERT INTO cotizaciones (numero, id_cliente, id_sucursal, id_vendedor,
         id_moneda, tipo_cambio, tipo_cotizacion, fecha_vencimiento,
         subtotal, descuento_porc, descuento_monto, impuesto, total,
         estado, observaciones)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'BORRADOR',?)`,
      [numero, id_cliente, id_sucursal, req.user.id_usuario,
       id_moneda, tipo_cambio, tipo_cotizacion, fv,
       subtotal, descuento_porc, descuento_monto, impuesto, total,
       observaciones ?? null]
    );
    const id_cotizacion = ins.insertId;

    for (const it of items) {
      const base = Number(it.cantidad) * Number(it.precio_unitario);
      const desc = base * (Number(it.descuento_porc ?? 0) / 100);
      const sub  = +(base - desc).toFixed(2);
      await db.promise().query(
        `INSERT INTO cotizacion_detalle
           (id_cotizacion, id_producto, cantidad, precio_unitario,
            descuento_porc, descuento_monto, impuesto_porc, subtotal, observacion)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [id_cotizacion, it.id_producto, it.cantidad, it.precio_unitario,
         it.descuento_porc ?? 0, +(base * (Number(it.descuento_porc ?? 0) / 100)).toFixed(2),
         it.impuesto_porc ?? 0, sub, it.observacion ?? null]
      );
    }

    await auditLog(req.user.id_usuario, 'cotizaciones', id_cotizacion, 'INSERT', getIp(req));
    res.status(201).json({ id_cotizacion, numero, mensaje: 'Cotización creada como borrador' });
  } catch (err) {
    console.error('[createCotizacion]', err);
    res.status(500).json({ error: 'Error al crear cotización' });
  }
};

// ── Actualizar (BORRADOR) ─────────────────────────────────────────────────────

const updateCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const [[cot]] = await db.promise().query(
      `SELECT estado FROM cotizaciones WHERE id_cotizacion = ?`, [id]
    );
    if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' });
    if (cot.estado !== 'BORRADOR')
      return res.status(400).json({ mensaje: 'Solo se puede editar una cotización en borrador' });

    const {
      id_cliente, id_moneda, tipo_cambio, tipo_cotizacion, fecha_vencimiento,
      descuento_porc = 0, impuesto = 0, observaciones, items = [],
    } = req.body;

    if (!items.length)
      return res.status(400).json({ mensaje: 'Debe agregar al menos un producto' });

    const { subtotal, descuento_monto, total } = calcTotales(items, { descuento_porc, impuesto });
    const fv = fecha_vencimiento && fecha_vencimiento.trim() !== '' ? fecha_vencimiento : null;

    await db.promise().query(
      `UPDATE cotizaciones SET id_cliente=?, id_moneda=?, tipo_cambio=?,
         tipo_cotizacion=?, fecha_vencimiento=?,
         subtotal=?, descuento_porc=?, descuento_monto=?, impuesto=?, total=?,
         observaciones=?
       WHERE id_cotizacion = ?`,
      [id_cliente, id_moneda, tipo_cambio, tipo_cotizacion, fv,
       subtotal, descuento_porc, descuento_monto, impuesto, total,
       observaciones ?? null, id]
    );

    await db.promise().query(`DELETE FROM cotizacion_detalle WHERE id_cotizacion = ?`, [id]);
    for (const it of items) {
      const base = Number(it.cantidad) * Number(it.precio_unitario);
      const desc = base * (Number(it.descuento_porc ?? 0) / 100);
      const sub  = +(base - desc).toFixed(2);
      await db.promise().query(
        `INSERT INTO cotizacion_detalle
           (id_cotizacion, id_producto, cantidad, precio_unitario,
            descuento_porc, descuento_monto, impuesto_porc, subtotal, observacion)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [id, it.id_producto, it.cantidad, it.precio_unitario,
         it.descuento_porc ?? 0, +(base * (Number(it.descuento_porc ?? 0) / 100)).toFixed(2),
         it.impuesto_porc ?? 0, sub, it.observacion ?? null]
      );
    }

    await auditLog(req.user.id_usuario, 'cotizaciones', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Cotización actualizada' });
  } catch (err) {
    console.error('[updateCotizacion]', err);
    res.status(500).json({ error: 'Error al actualizar cotización' });
  }
};

// ── Emitir (BORRADOR → EMITIDA) ───────────────────────────────────────────────

const emitirCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const [[cot]] = await db.promise().query(
      `SELECT estado FROM cotizaciones WHERE id_cotizacion = ?`, [id]
    );
    if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' });
    if (cot.estado !== 'BORRADOR')
      return res.status(400).json({ mensaje: 'Solo se puede emitir una cotización en borrador' });

    await db.promise().query(
      `UPDATE cotizaciones SET estado='EMITIDA' WHERE id_cotizacion = ?`, [id]
    );
    await auditLog(req.user.id_usuario, 'cotizaciones', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Cotización emitida' });
  } catch (err) {
    console.error('[emitirCotizacion]', err);
    res.status(500).json({ error: 'Error al emitir cotización' });
  }
};

// ── Aprobar (EMITIDA → APROBADA) ──────────────────────────────────────────────

const aprobarCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const [[cot]] = await db.promise().query(
      `SELECT estado FROM cotizaciones WHERE id_cotizacion = ?`, [id]
    );
    if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' });
    if (cot.estado !== 'EMITIDA')
      return res.status(400).json({ mensaje: 'Solo se puede aprobar una cotización emitida' });

    await db.promise().query(
      `UPDATE cotizaciones SET estado='APROBADA' WHERE id_cotizacion = ?`, [id]
    );
    await auditLog(req.user.id_usuario, 'cotizaciones', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Cotización aprobada' });
  } catch (err) {
    console.error('[aprobarCotizacion]', err);
    res.status(500).json({ error: 'Error al aprobar cotización' });
  }
};

// ── Rechazar (EMITIDA/APROBADA → RECHAZADA) ───────────────────────────────────

const rechazarCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const [[cot]] = await db.promise().query(
      `SELECT estado FROM cotizaciones WHERE id_cotizacion = ?`, [id]
    );
    if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' });
    if (!['EMITIDA', 'APROBADA'].includes(cot.estado))
      return res.status(400).json({ mensaje: 'Solo se puede rechazar una cotización emitida o aprobada' });

    await db.promise().query(
      `UPDATE cotizaciones SET estado='RECHAZADA' WHERE id_cotizacion = ?`, [id]
    );
    await auditLog(req.user.id_usuario, 'cotizaciones', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Cotización rechazada' });
  } catch (err) {
    console.error('[rechazarCotizacion]', err);
    res.status(500).json({ error: 'Error al rechazar cotización' });
  }
};

// ── Convertir en venta ────────────────────────────────────────────────────────

const convertirVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_deposito, tipo_venta = 'MENOR', condicion_pago = 'CONTADO', dias_credito = 0 } = req.body;

    if (!id_deposito)
      return res.status(400).json({ mensaje: 'Debe seleccionar el depósito para descargar stock' });

    const [[cot]] = await db.promise().query(
      `SELECT * FROM cotizaciones WHERE id_cotizacion = ?`, [id]
    );
    if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' });
    if (cot.estado !== 'APROBADA')
      return res.status(400).json({ mensaje: 'Solo se puede convertir una cotización aprobada' });
    if (cot.id_venta_generada)
      return res.status(400).json({ mensaje: 'Esta cotización ya fue convertida en venta' });

    const [detalle] = await db.promise().query(
      `SELECT cd.*, p.bono, p.producto
       FROM cotizacion_detalle cd
       JOIN productos p ON p.id_producto = cd.id_producto
       WHERE cd.id_cotizacion = ?`, [id]
    );

    // Verify stock for all items
    for (const it of detalle) {
      const [[st]] = await db.promise().query(
        `SELECT COALESCE(cantidad_disponible, 0) AS disponible
         FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [it.id_producto, id_deposito]
      );
      const disponible = Number(st?.disponible ?? 0);
      if (disponible < Number(it.cantidad))
        return res.status(400).json({
          mensaje: `Stock insuficiente para "${it.producto}". Disponible: ${disponible}`
        });
    }

    const [[tmVenta]] = await db.promise().query(
      `SELECT id_tipo_movimiento FROM tipos_movimiento WHERE codigo = 'VENTA'`
    );
    if (!tmVenta) return res.status(500).json({ mensaje: 'Tipo de movimiento VENTA no encontrado' });

    const numeroVenta = await generarNumero('VEN', 'ventas');

    const [insVenta] = await db.promise().query(
      `INSERT INTO ventas (numero, tipo_venta, id_sucursal, id_deposito, id_cliente, id_vendedor,
         id_moneda, tipo_cambio, condicion_pago, dias_credito,
         subtotal, descuento_porc, descuento_monto, impuesto, total, saldo_pendiente,
         estado, observaciones)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'EMITIDA',?)`,
      [numeroVenta, tipo_venta, cot.id_sucursal, id_deposito, cot.id_cliente, req.user.id_usuario,
       cot.id_moneda, cot.tipo_cambio, condicion_pago, dias_credito,
       cot.subtotal, cot.descuento_porc, cot.descuento_monto, cot.impuesto, cot.total,
       condicion_pago === 'CREDITO' ? cot.total : 0,
       cot.observaciones ?? null]
    );
    const id_venta = insVenta.insertId;

    for (const it of detalle) {
      const [[st]] = await db.promise().query(
        `SELECT COALESCE(costo_promedio, 0) AS costo FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [it.id_producto, id_deposito]
      );
      const costo_unitario = Number(st?.costo ?? 0);

      await db.promise().query(
        `INSERT INTO venta_detalle (id_venta, id_producto, cantidad, precio_unitario,
           descuento_porc, descuento_monto, impuesto_porc, subtotal, costo_unitario, bono_vendedor)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [id_venta, it.id_producto, it.cantidad, it.precio_unitario,
         it.descuento_porc ?? 0, it.descuento_monto ?? 0,
         it.impuesto_porc ?? 0, it.subtotal, costo_unitario, Number(it.bono ?? 0)]
      );

      // Stock movement
      await db.promise().query(
        `UPDATE stock SET cantidad = cantidad - ?, fecha_ult_movimiento = NOW()
         WHERE id_producto = ? AND id_deposito = ?`,
        [it.cantidad, it.id_producto, id_deposito]
      );

      // Kardex entry
      const [[saldoRow]] = await db.promise().query(
        `SELECT COALESCE(cantidad, 0) AS saldo FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [it.id_producto, id_deposito]
      );
      await db.promise().query(
        `INSERT INTO kardex (id_producto, id_deposito, id_tipo_movimiento, cantidad,
           costo_unitario, saldo_cantidad, saldo_costo,
           documento_tipo, documento_id, documento_numero, id_usuario)
         VALUES (?,?,?,?,?,?,?,'VENTA',?,?,?)`,
        [it.id_producto, id_deposito, tmVenta.id_tipo_movimiento,
         -Number(it.cantidad), costo_unitario,
         Number(saldoRow?.saldo ?? 0), Number(saldoRow?.saldo ?? 0) * costo_unitario,
         id_venta, numeroVenta, req.user.id_usuario]
      );
    }

    // Mark cotizacion as CONVERTIDA
    await db.promise().query(
      `UPDATE cotizaciones SET estado='CONVERTIDA', id_venta_generada=? WHERE id_cotizacion = ?`,
      [id_venta, id]
    );

    await auditLog(req.user.id_usuario, 'cotizaciones', id, 'UPDATE', getIp(req));
    await auditLog(req.user.id_usuario, 'ventas', id_venta, 'INSERT', getIp(req));

    res.json({ id_venta, numero_venta: numeroVenta, mensaje: 'Cotización convertida en venta exitosamente' });
  } catch (err) {
    console.error('[convertirVenta]', err);
    res.status(500).json({ error: 'Error al convertir cotización en venta' });
  }
};

// ── Datos para PDF ────────────────────────────────────────────────────────────

const getPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const [[cot]] = await db.promise().query(
      `SELECT co.*,
              c.razon_social AS cliente_razon, c.nombres AS cliente_nombres,
              c.apellidos AS cliente_apellidos, c.documento AS cliente_documento,
              c.tipo_documento, c.telefono AS cliente_telefono, c.email AS cliente_email,
              s.nombre AS sucursal_nombre, s.direccion AS sucursal_direccion,
              s.telefono AS sucursal_telefono,
              mon.nombre AS moneda_nombre, mon.simbolo AS moneda_simbolo,
              CONCAT(u.nombres,' ',u.apellidos) AS vendedor_nombre
       FROM cotizaciones co
       JOIN clientes   c   ON c.id_cliente   = co.id_cliente
       JOIN sucursales s   ON s.id_sucursal  = co.id_sucursal
       JOIN monedas    mon ON mon.id_moneda  = co.id_moneda
       JOIN usuarios   u   ON u.id_usuario   = co.id_vendedor
       WHERE co.id_cotizacion = ?`, [id]
    );
    if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' });

    const [detalle] = await db.promise().query(
      `SELECT cd.*, p.producto, p.codigo_interno, um.nombre AS unidad_nombre
       FROM cotizacion_detalle cd
       JOIN productos       p  ON p.id_producto = cd.id_producto
       JOIN unidades_medida um ON um.id_unidad  = p.id_unidad
       WHERE cd.id_cotizacion = ?`, [id]
    );

    const [[empresa]] = await db.promise().query(`SELECT * FROM empresas LIMIT 1`);

    res.json({ cotizacion: { ...cot, detalle }, empresa: empresa ?? {} });
  } catch (err) {
    console.error('[getPDF]', err);
    res.status(500).json({ error: 'Error al obtener datos del PDF' });
  }
};

module.exports = {
  getCotizaciones, getCotizacion, createCotizacion, updateCotizacion,
  emitirCotizacion, aprobarCotizacion, rechazarCotizacion, convertirVenta, getPDF,
};
