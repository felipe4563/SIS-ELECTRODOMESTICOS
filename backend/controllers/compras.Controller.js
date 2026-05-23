const db    = require('../config/db');
const getIp = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?,?,?,?,?)`,
    [userId, tabla, String(id), accion, ip]
  );

// ── Helpers ───────────────────────────────────────────────────────────────────

async function generarNumero(prefijo) {
  const hoy = new Date();
  const ym  = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const [[{ cnt }]] = await db.promise().query(
    `SELECT COUNT(*) AS cnt FROM compras WHERE numero LIKE ?`, [`${prefijo}-${ym}-%`]
  );
  return `${prefijo}-${ym}-${String(Number(cnt) + 1).padStart(4, '0')}`;
}

async function generarNumeroPago() {
  const hoy = new Date();
  const ym  = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const [[{ cnt }]] = await db.promise().query(
    `SELECT COUNT(*) AS cnt FROM pagos_compra WHERE numero LIKE ?`, [`PAG-${ym}-%`]
  );
  return `PAG-${ym}-${String(Number(cnt) + 1).padStart(4, '0')}`;
}

function calcTotales(items, body) {
  let subtotal = 0;
  for (const it of items) {
    const base = Number(it.cantidad) * Number(it.precio_unitario);
    const desc = base * (Number(it.descuento_porc ?? 0) / 100);
    const imp  = (base - desc) * (Number(it.impuesto_porc ?? 0) / 100);
    it._subtotal = +(base - desc + imp).toFixed(2);
    subtotal    += it._subtotal;
  }
  const flete      = +(Number(body.flete       ?? 0)).toFixed(2);
  const otros      = +(Number(body.otros_costos ?? 0)).toFixed(2);
  const descGlobal = +(Number(body.descuento    ?? 0)).toFixed(2);
  const impGlobal  = +(Number(body.impuesto     ?? 0)).toFixed(2);
  const total      = +(subtotal - descGlobal + impGlobal + flete + otros).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), descuento: descGlobal, impuesto: impGlobal, flete, otros_costos: otros, total };
}

// ── Listar compras ────────────────────────────────────────────────────────────

const getCompras = async (req, res) => {
  try {
    const { estado, id_proveedor, id_sucursal, fecha_desde, fecha_hasta, q } = req.query;
    const conds = [], vals = [];

    if (estado)       { conds.push('c.estado = ?');                         vals.push(estado); }
    if (id_proveedor) { conds.push('c.id_proveedor = ?');                   vals.push(id_proveedor); }
    if (id_sucursal)  { conds.push('c.id_sucursal = ?');                    vals.push(id_sucursal); }
    if (fecha_desde)  { conds.push('DATE(c.fecha_pedido) >= ?');            vals.push(fecha_desde); }
    if (fecha_hasta)  { conds.push('DATE(c.fecha_pedido) <= ?');            vals.push(fecha_hasta); }
    if (q)            { conds.push('(c.numero LIKE ? OR p.razon_social LIKE ? OR c.numero_factura LIKE ?)');
                        vals.push(`%${q}%`, `%${q}%`, `%${q}%`); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [rows] = await db.promise().query(
      `SELECT c.id_compra, c.numero, c.numero_factura, c.estado, c.condicion_pago,
              c.fecha_pedido, c.fecha_estim_llegada, c.fecha_recepcion,
              c.total, c.saldo_pendiente, c.fecha_creacion,
              p.razon_social AS proveedor_nombre, p.codigo AS proveedor_codigo,
              s.nombre AS sucursal_nombre,
              d.nombre AS deposito_nombre,
              u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos
       FROM compras c
       JOIN proveedores p ON p.id_proveedor = c.id_proveedor
       JOIN sucursales  s ON s.id_sucursal  = c.id_sucursal
       JOIN depositos   d ON d.id_deposito  = c.id_deposito_destino
       JOIN usuarios    u ON u.id_usuario   = c.id_usuario_crea
       ${where}
       ORDER BY c.fecha_creacion DESC
       LIMIT 300`, vals
    );
    res.json({ compras: rows });
  } catch (err) {
    console.error('[getCompras]', err);
    res.status(500).json({ error: 'Error al obtener compras' });
  }
};

// ── Obtener una compra ────────────────────────────────────────────────────────

const getCompra = async (req, res) => {
  try {
    const { id } = req.params;

    const [[compra]] = await db.promise().query(
      `SELECT c.*,
              p.razon_social AS proveedor_nombre, p.codigo AS proveedor_codigo,
              p.telefono AS proveedor_telefono,
              s.nombre AS sucursal_nombre,
              d.nombre AS deposito_nombre, d.codigo AS deposito_codigo,
              mon.codigo AS moneda_codigo, mon.simbolo AS moneda_simbolo,
              uc.nombres AS crea_nombres,    uc.apellidos AS crea_apellidos,
              ua.nombres AS aprueba_nombres, ua.apellidos AS aprueba_apellidos,
              ur.nombres AS recibe_nombres,  ur.apellidos AS recibe_apellidos
       FROM compras c
       JOIN proveedores p  ON p.id_proveedor = c.id_proveedor
       JOIN sucursales  s  ON s.id_sucursal  = c.id_sucursal
       JOIN depositos   d  ON d.id_deposito  = c.id_deposito_destino
       JOIN monedas     mon ON mon.id_moneda = c.id_moneda
       JOIN usuarios    uc ON uc.id_usuario  = c.id_usuario_crea
       LEFT JOIN usuarios ua ON ua.id_usuario = c.id_usuario_aprueba
       LEFT JOIN usuarios ur ON ur.id_usuario = c.id_usuario_recibe
       WHERE c.id_compra = ?`, [id]
    );
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });

    const [detalle] = await db.promise().query(
      `SELECT cd.*,
              p.codigo_interno, p.producto, p.detalle AS producto_detalle,
              m.nombre AS marca_nombre,
              u.nombre AS unidad_nombre, u.codigo AS unidad_codigo
       FROM compra_detalle cd
       JOIN productos     p ON p.id_producto = cd.id_producto
       JOIN marcas        m ON m.id_marca    = p.id_marca
       JOIN unidades_medida u ON u.id_unidad = p.id_unidad
       WHERE cd.id_compra = ?
       ORDER BY cd.id_detalle`, [id]
    );

    const [cuotas] = await db.promise().query(
      `SELECT * FROM compra_cuotas WHERE id_compra = ? ORDER BY numero_cuota`, [id]
    );

    const [pagos] = await db.promise().query(
      `SELECT pg.*,
              u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos,
              cc.numero_cuota
       FROM pagos_compra pg
       JOIN usuarios u ON u.id_usuario = pg.id_usuario
       LEFT JOIN compra_cuotas cc ON cc.id_cuota = pg.id_cuota
       WHERE pg.id_compra = ?
       ORDER BY pg.fecha DESC`, [id]
    );

    res.json({ compra, detalle, cuotas, pagos });
  } catch (err) {
    console.error('[getCompra]', err);
    res.status(500).json({ error: 'Error al obtener compra' });
  }
};

// ── Crear pre-pedido ──────────────────────────────────────────────────────────

const createCompra = async (req, res) => {
  try {
    const {
      id_proveedor, id_sucursal, id_deposito_destino, id_moneda,
      tipo_cambio = 1, fecha_pedido, fecha_estim_llegada, observaciones, items,
    } = req.body;

    if (!id_proveedor || !id_sucursal || !id_deposito_destino || !id_moneda)
      return res.status(400).json({ error: 'Proveedor, sucursal, depósito y moneda son requeridos' });
    if (!Array.isArray(items) || !items.length)
      return res.status(400).json({ error: 'Debe agregar al menos un producto' });

    const tots  = calcTotales(items, req.body);
    const numero = await generarNumero('CMP');

    const [r] = await db.promise().query(
      `INSERT INTO compras
         (numero, id_proveedor, id_sucursal, id_deposito_destino, id_moneda, tipo_cambio,
          estado, condicion_pago, dias_credito, fecha_pedido, fecha_estim_llegada,
          subtotal, descuento, impuesto, flete, otros_costos, total, saldo_pendiente,
          id_usuario_crea, observaciones)
       VALUES (?,?,?,?,?,?, 'PRE_PEDIDO','CONTADO',0, ?,?, ?,?,?,?,?,?,?, ?,?)`,
      [numero, id_proveedor, id_sucursal, id_deposito_destino, id_moneda, tipo_cambio,
       fecha_pedido || new Date().toISOString().slice(0, 10), fecha_estim_llegada || null,
       tots.subtotal, tots.descuento, tots.impuesto, tots.flete, tots.otros_costos,
       tots.total, tots.total,
       req.user.id_usuario, observaciones || null]
    );
    const id_compra = r.insertId;

    for (const it of items) {
      await db.promise().query(
        `INSERT INTO compra_detalle
           (id_compra, id_producto, cantidad, cantidad_recibida, precio_unitario,
            descuento_porc, descuento_monto, impuesto_porc, subtotal, observacion)
         VALUES (?,?,?,0,?, ?,?,?,?,?)`,
        [id_compra, it.id_producto, it.cantidad, it.precio_unitario,
         it.descuento_porc ?? 0, it.descuento_monto ?? 0,
         it.impuesto_porc ?? 0, it._subtotal, it.observacion || null]
      );
    }

    await auditLog(req.user.id_usuario, 'compras', id_compra, 'INSERT', getIp(req));
    res.status(201).json({ id_compra, numero });
  } catch (err) {
    console.error('[createCompra]', err);
    res.status(500).json({ error: 'Error al crear compra' });
  }
};

// ── Editar pre-pedido ─────────────────────────────────────────────────────────

const updateCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const [[compra]] = await db.promise().query(
      `SELECT estado FROM compras WHERE id_compra = ?`, [id]
    );
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    if (compra.estado !== 'PRE_PEDIDO')
      return res.status(409).json({ error: 'Solo se pueden editar compras en estado PRE_PEDIDO' });

    const {
      id_proveedor, id_sucursal, id_deposito_destino, id_moneda,
      tipo_cambio = 1, fecha_pedido, fecha_estim_llegada, observaciones, items,
    } = req.body;

    if (!Array.isArray(items) || !items.length)
      return res.status(400).json({ error: 'Debe agregar al menos un producto' });

    const tots = calcTotales(items, req.body);

    await db.promise().query(
      `UPDATE compras SET
         id_proveedor=?, id_sucursal=?, id_deposito_destino=?, id_moneda=?, tipo_cambio=?,
         fecha_pedido=?, fecha_estim_llegada=?,
         subtotal=?, descuento=?, impuesto=?, flete=?, otros_costos=?,
         total=?, saldo_pendiente=?, observaciones=?
       WHERE id_compra = ?`,
      [id_proveedor, id_sucursal, id_deposito_destino, id_moneda, tipo_cambio,
       fecha_pedido, fecha_estim_llegada || null,
       tots.subtotal, tots.descuento, tots.impuesto, tots.flete, tots.otros_costos,
       tots.total, tots.total, observaciones || null, id]
    );

    await db.promise().query(`DELETE FROM compra_detalle WHERE id_compra = ?`, [id]);
    for (const it of items) {
      await db.promise().query(
        `INSERT INTO compra_detalle
           (id_compra, id_producto, cantidad, cantidad_recibida, precio_unitario,
            descuento_porc, descuento_monto, impuesto_porc, subtotal, observacion)
         VALUES (?,?,?,0,?,?,?,?,?,?)`,
        [id, it.id_producto, it.cantidad, it.precio_unitario,
         it.descuento_porc ?? 0, it.descuento_monto ?? 0,
         it.impuesto_porc ?? 0, it._subtotal, it.observacion || null]
      );
    }

    await auditLog(req.user.id_usuario, 'compras', id, 'UPDATE', getIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('[updateCompra]', err);
    res.status(500).json({ error: 'Error al actualizar compra' });
  }
};

// ── Confirmar pedido PRE_PEDIDO → POR_LLEGAR ──────────────────────────────────

const confirmarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { condicion_pago = 'CONTADO', dias_credito = 0, num_cuotas = 1 } = req.body;

    const [[compra]] = await db.promise().query(
      `SELECT id_compra, estado, total, fecha_pedido FROM compras WHERE id_compra = ?`, [id]
    );
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    if (compra.estado !== 'PRE_PEDIDO')
      return res.status(409).json({ error: 'Solo se pueden confirmar compras en estado PRE_PEDIDO' });

    await db.promise().query(
      `UPDATE compras SET
         estado='POR_LLEGAR', condicion_pago=?, dias_credito=?,
         id_usuario_aprueba=?, fecha_confirmacion=CURDATE()
       WHERE id_compra = ?`,
      [condicion_pago, Number(dias_credito), req.user.id_usuario, id]
    );

    if (condicion_pago === 'CREDITO' && Number(dias_credito) > 0) {
      const nCuotas   = Math.max(1, Number(num_cuotas));
      const montoBase = +(Number(compra.total) / nCuotas).toFixed(2);
      const fechaBase = new Date(compra.fecha_pedido);

      for (let i = 1; i <= nCuotas; i++) {
        const diasEsta = Math.round((Number(dias_credito) / nCuotas) * i);
        const fVenc    = new Date(fechaBase);
        fVenc.setDate(fVenc.getDate() + diasEsta);
        await db.promise().query(
          `INSERT INTO compra_cuotas (id_compra, numero_cuota, fecha_vencimiento, monto)
           VALUES (?,?,?,?)`,
          [id, i, fVenc.toISOString().slice(0, 10), montoBase]
        );
      }
    }

    await auditLog(req.user.id_usuario, 'compras', id, 'UPDATE', getIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('[confirmarPedido]', err);
    res.status(500).json({ error: 'Error al confirmar pedido' });
  }
};

// ── Recibir mercadería → stock + kardex ───────────────────────────────────────

const recibirMercaderia = async (req, res) => {
  try {
    const { id } = req.params;
    const { recepciones, observaciones } = req.body;

    if (!Array.isArray(recepciones) || !recepciones.length)
      return res.status(400).json({ error: 'Debe indicar las cantidades recibidas' });

    const [[comp]] = await db.promise().query(
      `SELECT * FROM compras WHERE id_compra = ?`, [id]
    );
    if (!comp) return res.status(404).json({ error: 'Compra no encontrada' });
    if (!['POR_LLEGAR', 'PARCIAL'].includes(comp.estado))
      return res.status(409).json({ error: 'Solo se puede recibir en estado POR_LLEGAR o PARCIAL' });

    const [[tipoMov]] = await db.promise().query(
      `SELECT id_tipo_movimiento FROM tipos_movimiento WHERE codigo = 'COMPRA' LIMIT 1`
    );
    if (!tipoMov)
      return res.status(500).json({ error: 'Tipo de movimiento COMPRA no configurado en la base de datos' });

    const [detalles] = await db.promise().query(
      `SELECT * FROM compra_detalle WHERE id_compra = ?`, [id]
    );

    for (const rec of recepciones) {
      const detalle = detalles.find(d => d.id_detalle === Number(rec.id_detalle));
      if (!detalle) continue;

      const cantNueva     = +Number(rec.cantidad_recibida).toFixed(4);
      const maxPendiente  = +(Number(detalle.cantidad) - Number(detalle.cantidad_recibida)).toFixed(4);
      const cantReal      = +Math.min(cantNueva, maxPendiente).toFixed(4);
      if (cantReal <= 0) continue;

      await db.promise().query(
        `UPDATE compra_detalle SET cantidad_recibida = cantidad_recibida + ? WHERE id_detalle = ?`,
        [cantReal, detalle.id_detalle]
      );

      const [[stockRow]] = await db.promise().query(
        `SELECT cantidad, costo_promedio FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [detalle.id_producto, comp.id_deposito_destino]
      );

      const cantActual  = stockRow ? +Number(stockRow.cantidad) : 0;
      const costoActual = stockRow ? +Number(stockRow.costo_promedio) : 0;
      const costoNuevo  = +Number(detalle.precio_unitario);
      const costoPromNuevo = (cantActual + cantReal) > 0
        ? +((cantActual * costoActual + cantReal * costoNuevo) / (cantActual + cantReal)).toFixed(4)
        : costoNuevo;

      await db.promise().query(
        `INSERT INTO stock (id_producto, id_deposito, cantidad, costo_promedio, fecha_ult_movimiento)
         VALUES (?,?,?,?,NOW())
         ON DUPLICATE KEY UPDATE
           cantidad             = cantidad + ?,
           costo_promedio       = ?,
           fecha_ult_movimiento = NOW()`,
        [detalle.id_producto, comp.id_deposito_destino, cantReal, costoPromNuevo,
         cantReal, costoPromNuevo]
      );

      const [[stockNuevo]] = await db.promise().query(
        `SELECT cantidad, costo_promedio FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [detalle.id_producto, comp.id_deposito_destino]
      );

      await db.promise().query(
        `INSERT INTO kardex
           (id_producto, id_deposito, id_tipo_movimiento, fecha, cantidad, costo_unitario,
            saldo_cantidad, saldo_costo,
            documento_tipo, documento_id, documento_numero, id_usuario, observaciones)
         VALUES (?,?,?,NOW(), ?,?, ?,?, 'COMPRA',?,?,?,?)`,
        [detalle.id_producto, comp.id_deposito_destino, tipoMov.id_tipo_movimiento,
         cantReal, costoNuevo,
         stockNuevo.cantidad,
         +(Number(stockNuevo.cantidad) * Number(stockNuevo.costo_promedio)).toFixed(4),
         comp.id_compra, comp.numero,
         req.user.id_usuario, observaciones || null]
      );
    }

    const [detRefresh] = await db.promise().query(
      `SELECT cantidad, cantidad_recibida FROM compra_detalle WHERE id_compra = ?`, [id]
    );
    const allDone    = detRefresh.every(d => +Number(d.cantidad_recibida) >= +Number(d.cantidad));
    const nuevoEstado = allDone ? 'RECIBIDO' : 'PARCIAL';

    await db.promise().query(
      `UPDATE compras SET estado=?, fecha_recepcion=CURDATE(), id_usuario_recibe=?
       WHERE id_compra = ?`,
      [nuevoEstado, req.user.id_usuario, id]
    );

    await auditLog(req.user.id_usuario, 'compras', id, 'UPDATE', getIp(req));
    res.json({ ok: true, estado: nuevoEstado });
  } catch (err) {
    console.error('[recibirMercaderia]', err);
    res.status(500).json({ error: 'Error al recibir mercadería' });
  }
};

// ── Anular compra ─────────────────────────────────────────────────────────────

const anularCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const [[compra]] = await db.promise().query(
      `SELECT estado FROM compras WHERE id_compra = ?`, [id]
    );
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    if (['RECIBIDO', 'ANULADO'].includes(compra.estado))
      return res.status(409).json({ error: `No se puede anular una compra en estado ${compra.estado}` });

    await db.promise().query(`UPDATE compras SET estado='ANULADO' WHERE id_compra = ?`, [id]);
    await auditLog(req.user.id_usuario, 'compras', id, 'UPDATE', getIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('[anularCompra]', err);
    res.status(500).json({ error: 'Error al anular compra' });
  }
};

// ── Registrar pago ────────────────────────────────────────────────────────────

const createPago = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      metodo_pago, id_moneda, tipo_cambio = 1, monto,
      id_cuota, id_cuenta_proveedor,
      numero_referencia, comprobante_url, observaciones, fecha,
    } = req.body;

    if (!metodo_pago || !id_moneda || !monto)
      return res.status(400).json({ error: 'Método de pago, moneda y monto son requeridos' });

    const [[compra]] = await db.promise().query(
      `SELECT id_compra, id_sucursal, id_proveedor, saldo_pendiente FROM compras WHERE id_compra = ?`, [id]
    );
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });

    const montoPago = +Number(monto).toFixed(2);
    if (montoPago <= 0)
      return res.status(400).json({ error: 'El monto debe ser mayor a cero' });

    const numeroPago = await generarNumeroPago();

    const [r] = await db.promise().query(
      `INSERT INTO pagos_compra
         (numero, id_compra, id_cuota, id_proveedor, id_sucursal, fecha,
          metodo_pago, id_cuenta_proveedor, id_moneda, tipo_cambio, monto,
          numero_referencia, comprobante_url, id_usuario, observaciones)
       VALUES (?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?)`,
      [numeroPago, id, id_cuota || null, compra.id_proveedor, compra.id_sucursal,
       fecha ? new Date(fecha) : new Date(),
       metodo_pago, id_cuenta_proveedor || null, id_moneda, tipo_cambio, montoPago,
       numero_referencia || null, comprobante_url || null,
       req.user.id_usuario, observaciones || null]
    );

    await db.promise().query(
      `UPDATE compras SET saldo_pendiente = GREATEST(0, saldo_pendiente - ?) WHERE id_compra = ?`,
      [montoPago, id]
    );

    if (id_cuota) {
      await db.promise().query(
        `UPDATE compra_cuotas SET
           monto_pagado = monto_pagado + ?,
           estado = CASE
             WHEN (monto_pagado + ?) >= monto THEN 'PAGADA'
             WHEN (monto_pagado + ?)  > 0     THEN 'PARCIAL'
             ELSE estado END
         WHERE id_cuota = ?`,
        [montoPago, montoPago, montoPago, id_cuota]
      );
    }

    await auditLog(req.user.id_usuario, 'pagos_compra', r.insertId, 'INSERT', getIp(req));
    res.status(201).json({ id_pago: r.insertId, numero: numeroPago });
  } catch (err) {
    console.error('[createPago]', err);
    res.status(500).json({ error: 'Error al registrar pago' });
  }
};

// ── Anular pago ───────────────────────────────────────────────────────────────

const anularPago = async (req, res) => {
  try {
    const { id, idPago } = req.params;
    const [[pago]] = await db.promise().query(
      `SELECT * FROM pagos_compra WHERE id_pago = ? AND id_compra = ?`, [idPago, id]
    );
    if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });

    await db.promise().query(
      `UPDATE compras SET saldo_pendiente = saldo_pendiente + ? WHERE id_compra = ?`,
      [pago.monto, id]
    );

    if (pago.id_cuota) {
      await db.promise().query(
        `UPDATE compra_cuotas SET
           monto_pagado = GREATEST(0, monto_pagado - ?),
           estado = CASE
             WHEN GREATEST(0, monto_pagado - ?) = 0 THEN 'PENDIENTE'
             ELSE 'PARCIAL' END
         WHERE id_cuota = ?`,
        [pago.monto, pago.monto, pago.id_cuota]
      );
    }

    await db.promise().query(`DELETE FROM pagos_compra WHERE id_pago = ?`, [idPago]);
    await auditLog(req.user.id_usuario, 'pagos_compra', idPago, 'DELETE', getIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('[anularPago]', err);
    res.status(500).json({ error: 'Error al anular pago' });
  }
};

module.exports = {
  getCompras, getCompra,
  createCompra, updateCompra,
  confirmarPedido, recibirMercaderia, anularCompra,
  createPago, anularPago,
};
