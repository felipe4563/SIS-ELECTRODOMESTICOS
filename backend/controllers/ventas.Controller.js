const db    = require('../config/db');
const getIp = req => req.ip || req.socket?.remoteAddress || null;

const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?,?,?,?,?)`,
    [userId, tabla, String(id), accion, ip]
  );

// ── Helpers ───────────────────────────────────────────────────────────────────

async function generarNumero(prefijo, tabla) {
  const hoy = new Date();
  const ym  = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const [[{ cnt }]] = await db.promise().query(
    `SELECT COUNT(*) AS cnt FROM ${tabla} WHERE numero LIKE ?`, [`${prefijo}-${ym}-%`]
  );
  return `${prefijo}-${ym}-${String(Number(cnt) + 1).padStart(4, '0')}`;
}

async function tipoMov(codigo) {
  const [[tm]] = await db.promise().query(
    `SELECT id_tipo_movimiento FROM tipos_movimiento WHERE codigo = ?`, [codigo]
  );
  return tm ?? null;
}

function calcTotalesVenta(items, body) {
  let subtotal = 0;
  for (const it of items) {
    const base = Number(it.cantidad) * Number(it.precio_unitario);
    const desc = base * (Number(it.descuento_porc ?? 0) / 100);
    const imp  = (base - desc) * (Number(it.impuesto_porc ?? 0) / 100);
    it._subtotal = +(base - desc + imp).toFixed(2);
    subtotal    += it._subtotal;
  }
  const descPorc  = +(Number(body.descuento_porc  ?? 0)).toFixed(2);
  const descMonto = +(subtotal * descPorc / 100).toFixed(2);
  const impuesto  = +(Number(body.impuesto ?? 0)).toFixed(2);
  const total     = +(subtotal - descMonto + impuesto).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), descuento_porc: descPorc, descuento_monto: descMonto, impuesto, total };
}

// ── Listar ventas ─────────────────────────────────────────────────────────────

const getVentas = async (req, res) => {
  try {
    const { estado, tipo_venta, id_cliente, id_sucursal, id_vendedor, fecha_desde, fecha_hasta, q } = req.query;
    const conds = [], vals = [];

    if (estado)      { conds.push('v.estado = ?');                         vals.push(estado); }
    if (tipo_venta)  { conds.push('v.tipo_venta = ?');                     vals.push(tipo_venta); }
    if (id_cliente)  { conds.push('v.id_cliente = ?');                     vals.push(id_cliente); }
    if (id_sucursal) { conds.push('v.id_sucursal = ?');                    vals.push(id_sucursal); }
    if (id_vendedor) { conds.push('v.id_vendedor = ?');                    vals.push(id_vendedor); }
    if (fecha_desde) { conds.push('DATE(v.fecha) >= ?');                   vals.push(fecha_desde); }
    if (fecha_hasta) { conds.push('DATE(v.fecha) <= ?');                   vals.push(fecha_hasta); }
    if (q)           {
      conds.push('(v.numero LIKE ? OR c.razon_social LIKE ? OR CONCAT(c.nombres," ",c.apellidos) LIKE ? OR v.numero_factura LIKE ?)');
      vals.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [rows] = await db.promise().query(
      `SELECT v.id_venta, v.numero, v.numero_factura, v.tipo_venta, v.estado,
              v.condicion_pago, v.fecha, v.total, v.saldo_pendiente,
              c.razon_social AS cliente_razon, c.nombres AS cliente_nombres, c.apellidos AS cliente_apellidos,
              c.codigo AS cliente_codigo,
              s.nombre AS sucursal_nombre,
              d.nombre AS deposito_nombre,
              CONCAT(u.nombres,' ',u.apellidos) AS vendedor_nombre
       FROM ventas v
       JOIN clientes  c ON c.id_cliente  = v.id_cliente
       JOIN sucursales s ON s.id_sucursal = v.id_sucursal
       JOIN depositos  d ON d.id_deposito = v.id_deposito
       JOIN usuarios   u ON u.id_usuario  = v.id_vendedor
       ${where}
       ORDER BY v.fecha DESC
       LIMIT 500`, vals
    );
    res.json({ ventas: rows });
  } catch (err) {
    console.error('[getVentas]', err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
};

// ── Obtener una venta ─────────────────────────────────────────────────────────

const getVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const [[venta]] = await db.promise().query(
      `SELECT v.*,
              c.razon_social AS cliente_razon, c.nombres AS cliente_nombres, c.apellidos AS cliente_apellidos,
              c.documento AS cliente_documento, c.telefono AS cliente_telefono,
              c.tipo_documento, c.tipo_cliente, c.permite_credito, c.limite_credito, c.saldo_actual AS cliente_saldo,
              s.nombre AS sucursal_nombre,
              d.nombre AS deposito_nombre, d.codigo AS deposito_codigo,
              mon.codigo AS moneda_codigo, mon.simbolo AS moneda_simbolo,
              CONCAT(u.nombres,' ',u.apellidos) AS vendedor_nombre
       FROM ventas v
       JOIN clientes   c   ON c.id_cliente   = v.id_cliente
       JOIN sucursales s   ON s.id_sucursal  = v.id_sucursal
       JOIN depositos  d   ON d.id_deposito  = v.id_deposito
       JOIN monedas    mon ON mon.id_moneda  = v.id_moneda
       JOIN usuarios   u   ON u.id_usuario   = v.id_vendedor
       WHERE v.id_venta = ?`, [id]
    );
    if (!venta) return res.status(404).json({ mensaje: 'Venta no encontrada' });

    const [detalle] = await db.promise().query(
      `SELECT vd.*, p.producto, p.codigo_interno, p.codigo_barras, p.imagen_url,
              um.nombre AS unidad_nombre
       FROM venta_detalle vd
       JOIN productos      p  ON p.id_producto = vd.id_producto
       JOIN unidades_medida um ON um.id_unidad  = p.id_unidad
       WHERE vd.id_venta = ?`, [id]
    );

    const [cuotas] = await db.promise().query(
      `SELECT * FROM venta_cuotas WHERE id_venta = ? ORDER BY numero_cuota`, [id]
    );

    const [pagos] = await db.promise().query(
      `SELECT pv.*, CONCAT(u.nombres,' ',u.apellidos) AS usuario_nombre
       FROM pagos_venta pv
       JOIN usuarios u ON u.id_usuario = pv.id_usuario
       WHERE pv.id_venta = ?
       ORDER BY pv.fecha DESC`, [id]
    );

    const [devoluciones] = await db.promise().query(
      `SELECT dv.*, CONCAT(u.nombres,' ',u.apellidos) AS usuario_nombre
       FROM devoluciones_venta dv
       JOIN usuarios u ON u.id_usuario = dv.id_usuario
       WHERE dv.id_venta = ?
       ORDER BY dv.fecha DESC`, [id]
    );

    res.json({ ...venta, detalle, cuotas, pagos, devoluciones });
  } catch (err) {
    console.error('[getVenta]', err);
    res.status(500).json({ error: 'Error al obtener venta' });
  }
};

// ── Crear venta (BORRADOR) ────────────────────────────────────────────────────

const createVenta = async (req, res) => {
  try {
    const {
      tipo_venta = 'MENOR', id_sucursal, id_deposito, id_cliente, id_moneda = 1,
      tipo_cambio = 1, condicion_pago = 'CONTADO', dias_credito = 0,
      descuento_porc = 0, impuesto = 0, requiere_entrega = 0,
      direccion_entrega, fecha_entrega, observaciones, items = [],
    } = req.body;

    if (!id_sucursal || !id_deposito || !id_cliente) {
      return res.status(400).json({ mensaje: 'Sucursal, depósito y cliente son obligatorios' });
    }
    if (!items.length) {
      return res.status(400).json({ mensaje: 'Debe agregar al menos un producto' });
    }

    // Validate credit
    if (condicion_pago === 'CREDITO') {
      const [[cli]] = await db.promise().query(
        `SELECT permite_credito, limite_credito, saldo_actual FROM clientes WHERE id_cliente = ?`, [id_cliente]
      );
      if (!cli?.permite_credito) {
        return res.status(400).json({ mensaje: 'El cliente no tiene habilitado el crédito' });
      }
    }

    // Validate stock per item
    for (const it of items) {
      const [[st]] = await db.promise().query(
        `SELECT COALESCE(cantidad_disponible, 0) AS disponible FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [it.id_producto, id_deposito]
      );
      const disponible = Number(st?.disponible ?? 0);
      if (disponible < Number(it.cantidad)) {
        const [[prod]] = await db.promise().query(`SELECT producto FROM productos WHERE id_producto = ?`, [it.id_producto]);
        return res.status(400).json({ mensaje: `Stock insuficiente para "${prod?.producto ?? it.id_producto}". Disponible: ${disponible}` });
      }
    }

    const { subtotal, descuento_monto, total } = calcTotalesVenta(items, { descuento_porc, impuesto });
    const numero = await generarNumero('VEN', 'ventas');

    const [ins] = await db.promise().query(
      `INSERT INTO ventas (numero, tipo_venta, id_sucursal, id_deposito, id_cliente, id_vendedor,
        id_moneda, tipo_cambio, condicion_pago, dias_credito, fecha_vencimiento,
        subtotal, descuento_porc, descuento_monto, impuesto, total, saldo_pendiente,
        estado, requiere_entrega, direccion_entrega, fecha_entrega, observaciones)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'BORRADOR',?,?,?,?)`,
      [
        numero, tipo_venta, id_sucursal, id_deposito, id_cliente, req.user.id_usuario,
        id_moneda, tipo_cambio, condicion_pago, dias_credito,
        condicion_pago === 'CREDITO' && dias_credito > 0
          ? new Date(Date.now() + dias_credito * 864e5).toISOString().slice(0, 10)
          : null,
        subtotal, descuento_porc, descuento_monto, impuesto, total,
        requiere_entrega, direccion_entrega ?? null, fecha_entrega ?? null, observaciones ?? null,
      ]
    );
    const id_venta = ins.insertId;

    for (const it of items) {
      // Get costo_promedio from stock
      const [[st]] = await db.promise().query(
        `SELECT COALESCE(costo_promedio, 0) AS costo FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [it.id_producto, id_deposito]
      );
      const costo_unitario = Number(st?.costo ?? 0);
      // Get bono_vendedor from productos
      const [[prod]] = await db.promise().query(`SELECT bono FROM productos WHERE id_producto = ?`, [it.id_producto]);
      const bono_vendedor = Number(prod?.bono ?? 0);

      const base = Number(it.cantidad) * Number(it.precio_unitario);
      const desc = base * (Number(it.descuento_porc ?? 0) / 100);
      const imp  = (base - desc) * (Number(it.impuesto_porc ?? 0) / 100);
      const subtotalItem = +(base - desc + imp).toFixed(2);

      await db.promise().query(
        `INSERT INTO venta_detalle (id_venta, id_producto, cantidad, precio_unitario,
          descuento_porc, descuento_monto, impuesto_porc, subtotal, costo_unitario, bono_vendedor, observacion)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [id_venta, it.id_producto, it.cantidad, it.precio_unitario,
          it.descuento_porc ?? 0, +(base * (Number(it.descuento_porc ?? 0) / 100)).toFixed(2),
          it.impuesto_porc ?? 0, subtotalItem, costo_unitario, bono_vendedor, it.observacion ?? null]
      );
    }

    await auditLog(req.user.id_usuario, 'ventas', id_venta, 'INSERT', getIp(req));
    res.status(201).json({ id_venta, numero, mensaje: 'Venta creada como borrador' });
  } catch (err) {
    console.error('[createVenta]', err);
    res.status(500).json({ error: 'Error al crear venta' });
  }
};

// ── Actualizar venta borrador ─────────────────────────────────────────────────

const updateVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const [[venta]] = await db.promise().query(`SELECT estado FROM ventas WHERE id_venta = ?`, [id]);
    if (!venta) return res.status(404).json({ mensaje: 'Venta no encontrada' });
    if (venta.estado !== 'BORRADOR') return res.status(400).json({ mensaje: 'Solo se puede editar una venta en borrador' });

    const {
      id_cliente, id_moneda, tipo_cambio, condicion_pago, dias_credito,
      descuento_porc = 0, impuesto = 0, requiere_entrega, direccion_entrega,
      fecha_entrega, observaciones, items = [],
    } = req.body;

    if (!items.length) return res.status(400).json({ mensaje: 'Debe agregar al menos un producto' });

    const { subtotal, descuento_monto, total } = calcTotalesVenta(items, { descuento_porc, impuesto });

    await db.promise().query(
      `UPDATE ventas SET id_cliente=?, id_moneda=?, tipo_cambio=?, condicion_pago=?, dias_credito=?,
        fecha_vencimiento=?, subtotal=?, descuento_porc=?, descuento_monto=?, impuesto=?, total=?,
        requiere_entrega=?, direccion_entrega=?, fecha_entrega=?, observaciones=?
       WHERE id_venta = ?`,
      [
        id_cliente, id_moneda, tipo_cambio, condicion_pago, dias_credito,
        condicion_pago === 'CREDITO' && dias_credito > 0
          ? new Date(Date.now() + dias_credito * 864e5).toISOString().slice(0, 10)
          : null,
        subtotal, descuento_porc, descuento_monto, impuesto, total,
        requiere_entrega ?? 0, direccion_entrega ?? null, fecha_entrega ?? null, observaciones ?? null,
        id,
      ]
    );

    // Replace detalle
    await db.promise().query(`DELETE FROM venta_detalle WHERE id_venta = ?`, [id]);
    const [[ventaFull]] = await db.promise().query(`SELECT id_deposito FROM ventas WHERE id_venta = ?`, [id]);

    for (const it of items) {
      const [[st]] = await db.promise().query(
        `SELECT COALESCE(costo_promedio, 0) AS costo FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [it.id_producto, ventaFull.id_deposito]
      );
      const costo_unitario = Number(st?.costo ?? 0);
      const [[prod]] = await db.promise().query(`SELECT bono FROM productos WHERE id_producto = ?`, [it.id_producto]);
      const bono_vendedor = Number(prod?.bono ?? 0);

      const base = Number(it.cantidad) * Number(it.precio_unitario);
      const desc = base * (Number(it.descuento_porc ?? 0) / 100);
      const imp  = (base - desc) * (Number(it.impuesto_porc ?? 0) / 100);
      const subtotalItem = +(base - desc + imp).toFixed(2);

      await db.promise().query(
        `INSERT INTO venta_detalle (id_venta, id_producto, cantidad, precio_unitario,
          descuento_porc, descuento_monto, impuesto_porc, subtotal, costo_unitario, bono_vendedor, observacion)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [id, it.id_producto, it.cantidad, it.precio_unitario,
          it.descuento_porc ?? 0, +(base * (Number(it.descuento_porc ?? 0) / 100)).toFixed(2),
          it.impuesto_porc ?? 0, subtotalItem, costo_unitario, bono_vendedor, it.observacion ?? null]
      );
    }

    await auditLog(req.user.id_usuario, 'ventas', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Venta actualizada' });
  } catch (err) {
    console.error('[updateVenta]', err);
    res.status(500).json({ error: 'Error al actualizar venta' });
  }
};

// ── Emitir venta ──────────────────────────────────────────────────────────────

const emitirVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_factura } = req.body;

    const [[venta]] = await db.promise().query(
      `SELECT v.*, c.saldo_actual AS cliente_saldo, c.permite_credito, c.limite_credito, c.dias_credito AS cli_dias_credito
       FROM ventas v JOIN clientes c ON c.id_cliente = v.id_cliente
       WHERE v.id_venta = ?`, [id]
    );
    if (!venta) return res.status(404).json({ mensaje: 'Venta no encontrada' });
    if (venta.estado !== 'BORRADOR') return res.status(400).json({ mensaje: 'Solo se puede emitir una venta en borrador' });

    // Credit validation
    if (venta.condicion_pago === 'CREDITO') {
      if (!venta.permite_credito) return res.status(400).json({ mensaje: 'El cliente no tiene crédito habilitado' });
      const nuevoSaldo = Number(venta.cliente_saldo) + Number(venta.total);
      if (nuevoSaldo > Number(venta.limite_credito)) {
        return res.status(400).json({
          mensaje: `Excede el límite de crédito del cliente. Límite: ${venta.limite_credito}, Saldo actual: ${venta.cliente_saldo}, Venta: ${venta.total}`,
          requiere_aprobacion: true,
        });
      }
    }

    const [detalle] = await db.promise().query(
      `SELECT vd.id_detalle, vd.id_producto, vd.cantidad, vd.precio_unitario, vd.subtotal, vd.costo_unitario,
              p.producto
       FROM venta_detalle vd JOIN productos p ON p.id_producto = vd.id_producto
       WHERE vd.id_venta = ?`, [id]
    );

    // Validate stock for all items first
    for (const item of detalle) {
      const [[st]] = await db.promise().query(
        `SELECT COALESCE(cantidad_disponible, 0) AS disponible FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [item.id_producto, venta.id_deposito]
      );
      const disponible = Number(st?.disponible ?? 0);
      if (disponible < Number(item.cantidad)) {
        return res.status(400).json({
          mensaje: `Stock insuficiente para "${item.producto}". Disponible: ${disponible}, requerido: ${item.cantidad}`
        });
      }
    }

    const tm = await tipoMov('VENTA');
    if (!tm) return res.status(500).json({ mensaje: 'Falta tipo_movimiento VENTA en la BD' });

    // Decrease stock and insert kardex for each item
    for (const item of detalle) {
      await db.promise().query(
        `UPDATE stock SET cantidad = cantidad - ?, fecha_ult_movimiento = NOW()
         WHERE id_producto = ? AND id_deposito = ?`,
        [item.cantidad, item.id_producto, venta.id_deposito]
      );

      const [[nuevoStock]] = await db.promise().query(
        `SELECT COALESCE(cantidad, 0) AS cant, COALESCE(costo_promedio, 0) AS costo
         FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [item.id_producto, venta.id_deposito]
      );

      await db.promise().query(
        `INSERT INTO kardex (id_producto, id_deposito, id_tipo_movimiento, cantidad, costo_unitario,
          saldo_cantidad, saldo_costo, documento_tipo, documento_id, documento_numero, id_usuario)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          item.id_producto, venta.id_deposito, tm.id_tipo_movimiento,
          item.cantidad, Number(nuevoStock?.costo ?? 0),
          Number(nuevoStock?.cant ?? 0), Number(nuevoStock?.costo ?? 0),
          'VENTA', id, venta.numero, req.user.id_usuario,
        ]
      );
    }

    // Generate cuotas if CREDITO
    if (venta.condicion_pago === 'CREDITO' && venta.dias_credito > 0) {
      const diasCuota = venta.dias_credito;
      const montoCuota = +(Number(venta.total)).toFixed(2);
      const fechaVenc  = new Date(Date.now() + diasCuota * 864e5).toISOString().slice(0, 10);
      await db.promise().query(
        `INSERT INTO venta_cuotas (id_venta, numero_cuota, fecha_vencimiento, monto) VALUES (?,1,?,?)`,
        [id, fechaVenc, montoCuota]
      );
    }

    // Update venta: emitida, saldo_pendiente = total, numero_factura
    await db.promise().query(
      `UPDATE ventas SET estado = 'EMITIDA', saldo_pendiente = total, numero_factura = ?, fecha = NOW()
       WHERE id_venta = ?`,
      [numero_factura ?? null, id]
    );

    // Update cliente saldo_actual
    await db.promise().query(
      `UPDATE clientes SET saldo_actual = saldo_actual + ? WHERE id_cliente = ?`,
      [venta.total, venta.id_cliente]
    );

    await auditLog(req.user.id_usuario, 'ventas', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Venta emitida correctamente' });
  } catch (err) {
    console.error('[emitirVenta]', err);
    res.status(500).json({ error: 'Error al emitir venta' });
  }
};

// ── Registrar cobro ───────────────────────────────────────────────────────────

const registrarCobro = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_cuota, metodo_pago, id_moneda = 1, tipo_cambio = 1, monto, numero_referencia, observaciones } = req.body;

    if (!monto || Number(monto) <= 0) return res.status(400).json({ mensaje: 'El monto debe ser mayor a 0' });
    if (!metodo_pago)                 return res.status(400).json({ mensaje: 'Método de pago requerido' });

    const [[venta]] = await db.promise().query(
      `SELECT v.id_venta, v.estado, v.saldo_pendiente, v.id_cliente, v.id_sucursal, v.numero
       FROM ventas v WHERE v.id_venta = ?`, [id]
    );
    if (!venta) return res.status(404).json({ mensaje: 'Venta no encontrada' });
    if (!['EMITIDA', 'PARCIAL'].includes(venta.estado)) {
      return res.status(400).json({ mensaje: 'Solo se puede cobrar una venta emitida o parcial' });
    }

    const montoNum = +Number(monto).toFixed(2);
    if (montoNum > Number(venta.saldo_pendiente)) {
      return res.status(400).json({ mensaje: `El monto (${montoNum}) supera el saldo pendiente (${venta.saldo_pendiente})` });
    }

    const numero = await generarNumero('COB', 'pagos_venta');

    await db.promise().query(
      `INSERT INTO pagos_venta (numero, id_venta, id_cuota, id_cliente, id_sucursal, metodo_pago,
        id_moneda, tipo_cambio, monto, numero_referencia, id_usuario, observaciones)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [numero, id, id_cuota ?? null, venta.id_cliente, venta.id_sucursal,
        metodo_pago, id_moneda, tipo_cambio, montoNum,
        numero_referencia ?? null, req.user.id_usuario, observaciones ?? null]
    );

    // Update cuota if specified
    if (id_cuota) {
      await db.promise().query(
        `UPDATE venta_cuotas
         SET monto_pagado = monto_pagado + ?,
             estado = CASE
               WHEN monto_pagado + ? >= monto THEN 'PAGADA'
               WHEN monto_pagado + ? > 0       THEN 'PARCIAL'
               ELSE estado
             END
         WHERE id_cuota = ?`,
        [montoNum, montoNum, montoNum, id_cuota]
      );
    }

    // Update venta saldo_pendiente
    const nuevoSaldo = +(Number(venta.saldo_pendiente) - montoNum).toFixed(2);
    const nuevoEstado = nuevoSaldo <= 0 ? 'PAGADA' : 'PARCIAL';
    await db.promise().query(
      `UPDATE ventas SET saldo_pendiente = ?, estado = ? WHERE id_venta = ?`,
      [nuevoSaldo, nuevoEstado, id]
    );

    // Update cliente saldo_actual
    await db.promise().query(
      `UPDATE clientes SET saldo_actual = GREATEST(0, saldo_actual - ?) WHERE id_cliente = ?`,
      [montoNum, venta.id_cliente]
    );

    await auditLog(req.user.id_usuario, 'pagos_venta', id, 'INSERT', getIp(req));
    res.json({ numero, mensaje: 'Cobro registrado', nuevo_saldo: nuevoSaldo, nuevo_estado: nuevoEstado });
  } catch (err) {
    console.error('[registrarCobro]', err);
    res.status(500).json({ error: 'Error al registrar cobro' });
  }
};

// ── Anular cobro ──────────────────────────────────────────────────────────────

const anularCobro = async (req, res) => {
  try {
    const { id_pago } = req.params;

    const [[pago]] = await db.promise().query(`SELECT * FROM pagos_venta WHERE id_pago = ?`, [id_pago]);
    if (!pago) return res.status(404).json({ mensaje: 'Cobro no encontrado' });

    const [[venta]] = await db.promise().query(`SELECT estado FROM ventas WHERE id_venta = ?`, [pago.id_venta]);
    if (venta?.estado === 'ANULADA') return res.status(400).json({ mensaje: 'La venta está anulada' });

    // Reverse: increase saldo_pendiente, update venta estado
    await db.promise().query(
      `UPDATE ventas SET saldo_pendiente = saldo_pendiente + ?,
        estado = CASE WHEN estado = 'PAGADA' THEN 'PARCIAL' ELSE estado END
       WHERE id_venta = ?`,
      [pago.monto, pago.id_venta]
    );

    // Reverse cuota if linked
    if (pago.id_cuota) {
      await db.promise().query(
        `UPDATE venta_cuotas
         SET monto_pagado = GREATEST(0, monto_pagado - ?),
             estado = CASE
               WHEN GREATEST(0, monto_pagado - ?) <= 0 THEN 'PENDIENTE'
               ELSE 'PARCIAL'
             END
         WHERE id_cuota = ?`,
        [pago.monto, pago.monto, pago.id_cuota]
      );
    }

    // Reverse cliente saldo
    await db.promise().query(
      `UPDATE clientes SET saldo_actual = saldo_actual + ? WHERE id_cliente = ?`,
      [pago.monto, pago.id_cliente]
    );

    await db.promise().query(`DELETE FROM pagos_venta WHERE id_pago = ?`, [id_pago]);

    await auditLog(req.user.id_usuario, 'pagos_venta', id_pago, 'DELETE', getIp(req));
    res.json({ mensaje: 'Cobro anulado' });
  } catch (err) {
    console.error('[anularCobro]', err);
    res.status(500).json({ error: 'Error al anular cobro' });
  }
};

// ── Anular venta ──────────────────────────────────────────────────────────────

const anularVenta = async (req, res) => {
  try {
    const { id } = req.params;

    const [[venta]] = await db.promise().query(
      `SELECT v.*, d.id_deposito FROM ventas v JOIN depositos d ON d.id_deposito = v.id_deposito
       WHERE v.id_venta = ?`, [id]
    );
    if (!venta) return res.status(404).json({ mensaje: 'Venta no encontrada' });
    if (['ANULADA', 'DEVUELTA'].includes(venta.estado)) {
      return res.status(400).json({ mensaje: 'La venta ya está anulada o devuelta' });
    }

    if (venta.estado === 'BORRADOR') {
      // Just mark as anulada, no stock reversal needed
      await db.promise().query(`UPDATE ventas SET estado = 'ANULADA' WHERE id_venta = ?`, [id]);
      return res.json({ mensaje: 'Venta borrador anulada' });
    }

    // Reverse stock for emitted sales
    const [detalle] = await db.promise().query(
      `SELECT id_producto, cantidad, precio_unitario FROM venta_detalle WHERE id_venta = ?`, [id]
    );

    const tm = await tipoMov('DEVOLUCION_VTA');
    if (!tm) return res.status(500).json({ mensaje: 'Falta tipo_movimiento DEVOLUCION_VTA en la BD' });

    for (const item of detalle) {
      await db.promise().query(
        `UPDATE stock SET cantidad = cantidad + ?, fecha_ult_movimiento = NOW()
         WHERE id_producto = ? AND id_deposito = ?`,
        [item.cantidad, item.id_producto, venta.id_deposito]
      );

      const [[nuevoStock]] = await db.promise().query(
        `SELECT COALESCE(cantidad, 0) AS cant, COALESCE(costo_promedio, 0) AS costo
         FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [item.id_producto, venta.id_deposito]
      );

      await db.promise().query(
        `INSERT INTO kardex (id_producto, id_deposito, id_tipo_movimiento, cantidad, costo_unitario,
          saldo_cantidad, saldo_costo, documento_tipo, documento_id, documento_numero, id_usuario, observaciones)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          item.id_producto, venta.id_deposito, tm.id_tipo_movimiento,
          item.cantidad, Number(nuevoStock?.costo ?? 0),
          Number(nuevoStock?.cant ?? 0), Number(nuevoStock?.costo ?? 0),
          'DEVOLUCION', id, venta.numero, req.user.id_usuario, 'Anulación de venta',
        ]
      );
    }

    // Reverse saldo pendiente from client
    await db.promise().query(
      `UPDATE clientes SET saldo_actual = GREATEST(0, saldo_actual - ?) WHERE id_cliente = ?`,
      [venta.saldo_pendiente, venta.id_cliente]
    );

    await db.promise().query(`UPDATE ventas SET estado = 'ANULADA' WHERE id_venta = ?`, [id]);

    await auditLog(req.user.id_usuario, 'ventas', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Venta anulada correctamente' });
  } catch (err) {
    console.error('[anularVenta]', err);
    res.status(500).json({ error: 'Error al anular venta' });
  }
};

// ── Crear devolución ──────────────────────────────────────────────────────────

const crearDevolucion = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, items = [] } = req.body;

    if (!items.length) return res.status(400).json({ mensaje: 'Debe incluir al menos un producto a devolver' });

    const [[venta]] = await db.promise().query(
      `SELECT id_venta, estado, id_deposito, numero FROM ventas WHERE id_venta = ?`, [id]
    );
    if (!venta) return res.status(404).json({ mensaje: 'Venta no encontrada' });
    if (!['EMITIDA', 'PARCIAL', 'PAGADA'].includes(venta.estado)) {
      return res.status(400).json({ mensaje: 'Solo se puede devolver una venta emitida, parcial o pagada' });
    }

    // Validate items are in the original venta
    const [detalleOriginal] = await db.promise().query(
      `SELECT id_producto, cantidad, precio_unitario FROM venta_detalle WHERE id_venta = ?`, [id]
    );
    const mapOriginal = Object.fromEntries(detalleOriginal.map(d => [d.id_producto, d]));

    let total = 0;
    for (const it of items) {
      const original = mapOriginal[it.id_producto];
      if (!original) return res.status(400).json({ mensaje: `Producto ${it.id_producto} no está en la venta` });
      if (Number(it.cantidad) > Number(original.cantidad)) {
        return res.status(400).json({ mensaje: `Cantidad a devolver excede la original para producto ${it.id_producto}` });
      }
      const precio = it.precio_unitario ?? original.precio_unitario;
      it._precio = precio;
      it._subtotal = +(Number(it.cantidad) * Number(precio)).toFixed(2);
      total += it._subtotal;
    }

    const numero = await generarNumero('DEV', 'devoluciones_venta');

    const [ins] = await db.promise().query(
      `INSERT INTO devoluciones_venta (numero, id_venta, id_deposito, motivo, total, estado, id_usuario)
       VALUES (?,?,?,?,?,?,?)`,
      [numero, id, venta.id_deposito, motivo ?? null, +total.toFixed(2), 'PENDIENTE', req.user.id_usuario]
    );
    const id_devolucion = ins.insertId;

    for (const it of items) {
      await db.promise().query(
        `INSERT INTO devolucion_venta_detalle (id_devolucion, id_producto, cantidad, precio_unitario, subtotal, motivo)
         VALUES (?,?,?,?,?,?)`,
        [id_devolucion, it.id_producto, it.cantidad, it._precio, it._subtotal, it.motivo ?? null]
      );
    }

    await auditLog(req.user.id_usuario, 'devoluciones_venta', id_devolucion, 'INSERT', getIp(req));
    res.status(201).json({ id_devolucion, numero, mensaje: 'Devolución creada' });
  } catch (err) {
    console.error('[crearDevolucion]', err);
    res.status(500).json({ error: 'Error al crear devolución' });
  }
};

// ── Aprobar devolución ────────────────────────────────────────────────────────

const aprobarDevolucion = async (req, res) => {
  try {
    const { id_devolucion } = req.params;

    const [[dev]] = await db.promise().query(
      `SELECT dv.*, v.id_cliente, v.numero AS venta_numero, v.saldo_pendiente, v.estado AS venta_estado
       FROM devoluciones_venta dv JOIN ventas v ON v.id_venta = dv.id_venta
       WHERE dv.id_devolucion = ?`, [id_devolucion]
    );
    if (!dev) return res.status(404).json({ mensaje: 'Devolución no encontrada' });
    if (dev.estado !== 'PENDIENTE') return res.status(400).json({ mensaje: 'Solo se puede aprobar una devolución pendiente' });

    const [detalle] = await db.promise().query(
      `SELECT * FROM devolucion_venta_detalle WHERE id_devolucion = ?`, [id_devolucion]
    );

    const tm = await tipoMov('DEVOLUCION_VTA');
    if (!tm) return res.status(500).json({ mensaje: 'Falta tipo_movimiento DEVOLUCION_VTA en la BD' });

    // Restock each item
    for (const item of detalle) {
      await db.promise().query(
        `INSERT INTO stock (id_producto, id_deposito, cantidad, costo_promedio, fecha_ult_movimiento)
         VALUES (?,?,?,0,NOW())
         ON DUPLICATE KEY UPDATE cantidad = cantidad + ?, fecha_ult_movimiento = NOW()`,
        [item.id_producto, dev.id_deposito, item.cantidad, item.cantidad]
      );

      const [[nuevoStock]] = await db.promise().query(
        `SELECT COALESCE(cantidad, 0) AS cant, COALESCE(costo_promedio, 0) AS costo
         FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [item.id_producto, dev.id_deposito]
      );

      await db.promise().query(
        `INSERT INTO kardex (id_producto, id_deposito, id_tipo_movimiento, cantidad, costo_unitario,
          saldo_cantidad, saldo_costo, documento_tipo, documento_id, documento_numero, id_usuario)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          item.id_producto, dev.id_deposito, tm.id_tipo_movimiento,
          item.cantidad, item.precio_unitario,
          Number(nuevoStock?.cant ?? 0), Number(nuevoStock?.costo ?? 0),
          'DEVOLUCION', dev.id_venta, dev.venta_numero, req.user.id_usuario,
        ]
      );
    }

    // Update devolucion estado
    await db.promise().query(
      `UPDATE devoluciones_venta SET estado = 'APROBADA' WHERE id_devolucion = ?`, [id_devolucion]
    );

    // Update venta saldo_pendiente (credit the return amount)
    const nuevoSaldo = Math.max(0, Number(dev.saldo_pendiente) - Number(dev.total));
    await db.promise().query(
      `UPDATE ventas SET saldo_pendiente = ?,
        estado = CASE WHEN ? <= 0 THEN 'DEVUELTA' ELSE estado END
       WHERE id_venta = ?`,
      [nuevoSaldo, nuevoSaldo, dev.id_venta]
    );

    // Update cliente saldo
    await db.promise().query(
      `UPDATE clientes SET saldo_actual = GREATEST(0, saldo_actual - ?) WHERE id_cliente = ?`,
      [dev.total, dev.id_cliente]
    );

    await auditLog(req.user.id_usuario, 'devoluciones_venta', id_devolucion, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Devolución aprobada y stock reintegrado' });
  } catch (err) {
    console.error('[aprobarDevolucion]', err);
    res.status(500).json({ error: 'Error al aprobar devolución' });
  }
};

// ── Rechazar devolución ───────────────────────────────────────────────────────

const rechazarDevolucion = async (req, res) => {
  try {
    const { id_devolucion } = req.params;
    const [[dev]] = await db.promise().query(`SELECT estado FROM devoluciones_venta WHERE id_devolucion = ?`, [id_devolucion]);
    if (!dev) return res.status(404).json({ mensaje: 'Devolución no encontrada' });
    if (dev.estado !== 'PENDIENTE') return res.status(400).json({ mensaje: 'Solo se puede rechazar una devolución pendiente' });
    await db.promise().query(`UPDATE devoluciones_venta SET estado = 'RECHAZADA' WHERE id_devolucion = ?`, [id_devolucion]);
    res.json({ mensaje: 'Devolución rechazada' });
  } catch (err) {
    console.error('[rechazarDevolucion]', err);
    res.status(500).json({ error: 'Error al rechazar devolución' });
  }
};

// ── Datos para impresión ──────────────────────────────────────────────────────

const getTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const [[venta]] = await db.promise().query(
      `SELECT v.*,
              c.razon_social AS cliente_razon, c.nombres AS cliente_nombres, c.apellidos AS cliente_apellidos,
              c.documento AS cliente_documento, c.tipo_documento,
              s.nombre AS sucursal_nombre, s.direccion AS sucursal_direccion, s.telefono AS sucursal_telefono,
              d.nombre AS deposito_nombre,
              mon.codigo AS moneda_codigo, mon.simbolo AS moneda_simbolo,
              CONCAT(u.nombres,' ',u.apellidos) AS vendedor_nombre,
              e.razon_social AS empresa_razon, e.nombre_comercial AS empresa_comercial, e.nit AS empresa_nit,
              e.telefono AS empresa_telefono, e.direccion AS empresa_direccion
       FROM ventas v
       JOIN clientes   c   ON c.id_cliente   = v.id_cliente
       JOIN sucursales s   ON s.id_sucursal  = v.id_sucursal
       JOIN depositos  d   ON d.id_deposito  = v.id_deposito
       JOIN monedas    mon ON mon.id_moneda  = v.id_moneda
       JOIN usuarios   u   ON u.id_usuario   = v.id_vendedor
       LEFT JOIN empresas e ON e.activo = 1
       WHERE v.id_venta = ?`, [id]
    );
    if (!venta) return res.status(404).json({ mensaje: 'Venta no encontrada' });

    const [detalle] = await db.promise().query(
      `SELECT vd.*, p.producto, p.codigo_interno
       FROM venta_detalle vd JOIN productos p ON p.id_producto = vd.id_producto
       WHERE vd.id_venta = ?`, [id]
    );

    res.json({ ...venta, detalle });
  } catch (err) {
    console.error('[getTicket]', err);
    res.status(500).json({ error: 'Error al obtener datos del ticket' });
  }
};

module.exports = {
  getVentas, getVenta,
  createVenta, updateVenta, emitirVenta,
  registrarCobro, anularCobro,
  anularVenta,
  crearDevolucion, aprobarDevolucion, rechazarDevolucion,
  getTicket,
};
