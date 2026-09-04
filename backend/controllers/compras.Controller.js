const db    = require('../config/db');
const fs    = require('fs');
const path  = require('path');
const getIp = req => req.ip || req.socket?.remoteAddress || null;
const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?,?,?,?,?)`,
    [userId, tabla, String(id), accion, ip]
  ).catch(e => console.error('[auditLog]', accion, tabla, e.message));

// ── Helpers ───────────────────────────────────────────────────────────────────

// Cierra la cuota pagada al monto efectivamente pagado y traslada la
// diferencia (de más o de menos) a la siguiente cuota pendiente. Si la cuota
// pagada es la última y queda saldo por trasladar, genera una cuota nueva.
async function cascadaCuota(id_cuota, montoPagoNuevo) {
  const [[cuota]] = await db.promise().query(
    `SELECT id_cuota, id_compra, numero_cuota, monto, monto_pagado FROM compra_cuotas WHERE id_cuota = ?`,
    [id_cuota]
  );
  if (!cuota) return;

  const pagadoAcumulado = +(Number(cuota.monto_pagado) + montoPagoNuevo).toFixed(2);
  let diferencia        = +(pagadoAcumulado - Number(cuota.monto)).toFixed(2);

  // Si pagó de menos, la cuota tocada se achica al monto realmente recibido
  // (el faltante se traslada a la siguiente). Si pagó igual o de más, conserva
  // su monto original -queda completamente cubierta- y el excedente se
  // traslada intacto; inflarla al monto pagado lo contaría dos veces al
  // cascadear (una vez acá, otra vez al cubrir la siguiente cuota).
  const montoCuotaTocada = diferencia < 0 ? pagadoAcumulado : Number(cuota.monto);
  await db.promise().query(
    `UPDATE compra_cuotas SET monto = ?, monto_pagado = ?, estado = 'PAGADA' WHERE id_cuota = ?`,
    [montoCuotaTocada, montoCuotaTocada, id_cuota]
  );

  if (diferencia === 0) return;

  let numeroActual = cuota.numero_cuota;

  // Excedente (pagó de más): sigue cubriendo cuotas completas hasta agotarlo,
  // no se detiene en la primera siguiente si esta no alcanza a absorberlo todo.
  while (diferencia > 0) {
    const [[siguiente]] = await db.promise().query(
      `SELECT id_cuota, numero_cuota, monto FROM compra_cuotas
       WHERE id_compra = ? AND numero_cuota > ? AND estado != 'PAGADA'
       ORDER BY numero_cuota ASC LIMIT 1`,
      [cuota.id_compra, numeroActual]
    );
    if (!siguiente) return; // no hay más cuotas (el pago ya no puede superar el saldo total, validado antes)

    if (diferencia >= Number(siguiente.monto)) {
      diferencia = +(diferencia - Number(siguiente.monto)).toFixed(2);
      await db.promise().query(
        `UPDATE compra_cuotas SET monto_pagado = monto, estado = 'PAGADA' WHERE id_cuota = ?`,
        [siguiente.id_cuota]
      );
      numeroActual = siguiente.numero_cuota;
      continue;
    }

    const nuevoMonto = +(Number(siguiente.monto) - diferencia).toFixed(2);
    await db.promise().query(`UPDATE compra_cuotas SET monto = ? WHERE id_cuota = ?`, [nuevoMonto, siguiente.id_cuota]);
    return;
  }

  if (diferencia === 0) return;

  // Faltante (pagó de menos): se traslada solo a la siguiente cuota pendiente.
  const [[siguiente]] = await db.promise().query(
    `SELECT id_cuota, monto FROM compra_cuotas
     WHERE id_compra = ? AND numero_cuota > ? AND estado != 'PAGADA'
     ORDER BY numero_cuota ASC LIMIT 1`,
    [cuota.id_compra, numeroActual]
  );

  if (siguiente) {
    const nuevoMonto = +(Number(siguiente.monto) - diferencia).toFixed(2);
    await db.promise().query(`UPDATE compra_cuotas SET monto = ? WHERE id_cuota = ?`, [nuevoMonto, siguiente.id_cuota]);
    return;
  }

  // No hay siguiente cuota (era la última) y quedó saldo por cobrar: se genera una nueva.
  const [cuotasPrevias] = await db.promise().query(
    `SELECT numero_cuota, fecha_vencimiento FROM compra_cuotas WHERE id_compra = ? ORDER BY numero_cuota DESC LIMIT 2`,
    [cuota.id_compra]
  );
  const ultima = cuotasPrevias[0];
  let intervaloDias = 30;
  if (cuotasPrevias.length === 2) {
    const msPorDia = 24 * 60 * 60 * 1000;
    intervaloDias = Math.max(1, Math.round((new Date(cuotasPrevias[0].fecha_vencimiento) - new Date(cuotasPrevias[1].fecha_vencimiento)) / msPorDia));
  }
  const nuevaFecha = new Date(ultima.fecha_vencimiento);
  nuevaFecha.setDate(nuevaFecha.getDate() + intervaloDias);

  await db.promise().query(
    `INSERT INTO compra_cuotas (id_compra, numero_cuota, fecha_vencimiento, monto)
     VALUES (?, ?, ?, ?)`,
    [cuota.id_compra, ultima.numero_cuota + 1, nuevaFecha.toISOString().slice(0, 10), -diferencia]
  );
}

async function generarNumero(prefijo) {
  const hoy = new Date();
  const ym  = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const [[{ cnt }]] = await db.promise().query(
    `SELECT COUNT(*) AS cnt FROM compras WHERE numero LIKE ?`, [`${prefijo}-${ym}-%`]
  );
  // Buscar el primer número no usado para reducir colisiones bajo carga concurrente
  let seq = Number(cnt) + 1;
  for (let i = 0; i < 20; i++, seq++) {
    const candidato = `${prefijo}-${ym}-${String(seq).padStart(4, '0')}`;
    const [[{ n }]] = await db.promise().query(
      `SELECT COUNT(*) AS n FROM compras WHERE numero = ?`, [candidato]
    );
    if (n === 0) return candidato;
  }
  throw new Error(`No se pudo generar número único para compras`);
}

async function generarNumeroPago() {
  const hoy = new Date();
  const ym  = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const [[{ cnt }]] = await db.promise().query(
    `SELECT COUNT(*) AS cnt FROM pagos_compra WHERE numero LIKE ?`, [`PAG-${ym}-%`]
  );
  let seq = Number(cnt) + 1;
  for (let i = 0; i < 20; i++, seq++) {
    const candidato = `PAG-${ym}-${String(seq).padStart(4, '0')}`;
    const [[{ n }]] = await db.promise().query(
      `SELECT COUNT(*) AS n FROM pagos_compra WHERE numero = ?`, [candidato]
    );
    if (n === 0) return candidato;
  }
  throw new Error(`No se pudo generar número único para pagos_compra`);
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

// ── Form-data (catálogos para filtros/formularios) ────────────────────────────

const getFormData = async (req, res) => {
  try {
    const [[sucursales], [depositos], [monedas], [proveedores], [productos], [impuestos]] = await Promise.all([
      db.promise().query(`SELECT id_sucursal, nombre, activo FROM sucursales WHERE activo = 1 ORDER BY nombre`),
      db.promise().query(`
        SELECT d.id_deposito, d.codigo, d.nombre, d.activo, d.id_sucursal, s.nombre AS sucursal_nombre
        FROM depositos d
        JOIN sucursales s ON s.id_sucursal = d.id_sucursal
        WHERE d.activo = 1 ORDER BY s.nombre, d.nombre
      `),
      db.promise().query(`SELECT id_moneda, nombre, codigo, simbolo, es_moneda_base, activo FROM monedas WHERE activo = 1 ORDER BY nombre`),
      db.promise().query(`SELECT id_proveedor, codigo, razon_social, activo FROM proveedores WHERE activo = 1 ORDER BY razon_social`),
      db.promise().query(`
        SELECT p.id_producto, p.codigo_interno, p.codigo_barras, p.producto, p.precio_real,
               p.id_impuesto_default, p.id_proveedor_default, p.modelo, p.color, p.capacidad,
               p.detalle AS producto_detalle, p.imagen_url, m.nombre AS marca,
               p.stock_minimo, p.stock_maximo,
               COALESCE(st.stock_actual, 0) AS stock_actual
        FROM productos p
        LEFT JOIN marcas m ON m.id_marca = p.id_marca
        LEFT JOIN (
          SELECT id_producto, SUM(cantidad) AS stock_actual
          FROM stock GROUP BY id_producto
        ) st ON st.id_producto = p.id_producto
        WHERE p.activo = 1 ORDER BY p.producto
      `),
      db.promise().query(`SELECT id_impuesto, codigo, nombre, porcentaje, tipo, es_default, activo
                          FROM impuestos WHERE activo = 1 ORDER BY porcentaje`),
    ]);
    res.json({ sucursales, depositos, monedas, proveedores, productos, impuestos });
  } catch (err) {
    console.error('[getFormData compras]', err);
    res.status(500).json({ error: 'Error al obtener datos del formulario' });
  }
};

// ── Listar compras ────────────────────────────────────────────────────────────

const getCompras = async (req, res) => {
  try {
    const { estado, id_proveedor, id_sucursal, fecha_desde, fecha_hasta, q, page = 1, limit = 20 } = req.query;
    const limitNum = Math.min(Number(limit) || 20, 200);
    const offset = (Number(page) - 1) * limitNum;
    const conds = [], vals = [];

    const puedeVerTodas = req.ability?.can('ver_todas', 'compras') ?? false;

    // condsBase/valsBase: los mismos filtros pero SIN el estado — se usan para
    // el resumen del pipeline, que debe mostrar el conteo de TODOS los estados
    // a la vez (si aplicáramos el filtro de estado acá, las demás etapas
    // siempre mostrarían 0 en vez de su conteo real).
    const condsBase = [], valsBase = [];

    if (!puedeVerTodas) {
      // Solo ve compras de su propia sucursal
      conds.push('c.id_sucursal = ?');
      vals.push(req.user.id_sucursal);
      condsBase.push('c.id_sucursal = ?');
      valsBase.push(req.user.id_sucursal);
    } else if (id_sucursal) {
      // Tiene ver_todas pero eligió filtrar por una sucursal
      conds.push('c.id_sucursal = ?');
      vals.push(id_sucursal);
      condsBase.push('c.id_sucursal = ?');
      valsBase.push(id_sucursal);
    }

    if (id_proveedor) { conds.push('c.id_proveedor = ?'); vals.push(id_proveedor); condsBase.push('c.id_proveedor = ?'); valsBase.push(id_proveedor); }
    if (fecha_desde)  { conds.push('DATE(c.fecha_pedido) >= ?'); vals.push(fecha_desde); condsBase.push('DATE(c.fecha_pedido) >= ?'); valsBase.push(fecha_desde); }
    if (fecha_hasta)  { conds.push('DATE(c.fecha_pedido) <= ?'); vals.push(fecha_hasta); condsBase.push('DATE(c.fecha_pedido) <= ?'); valsBase.push(fecha_hasta); }
    if (q) {
      conds.push('(c.numero LIKE ? OR p.razon_social LIKE ? OR c.numero_factura LIKE ?)');
      vals.push(`%${q}%`, `%${q}%`, `%${q}%`);
      condsBase.push('(c.numero LIKE ? OR p.razon_social LIKE ? OR c.numero_factura LIKE ?)');
      valsBase.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (estado) { conds.push('c.estado = ?'); vals.push(estado); }

    const where     = conds.length     ? `WHERE ${conds.join(' AND ')}`     : '';
    const whereBase = condsBase.length ? `WHERE ${condsBase.join(' AND ')}` : '';

    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM compras c
       JOIN proveedores p ON p.id_proveedor = c.id_proveedor
       JOIN sucursales  s ON s.id_sucursal  = c.id_sucursal
       JOIN depositos   d ON d.id_deposito  = c.id_deposito_destino
       JOIN usuarios    u ON u.id_usuario   = c.id_usuario_crea
       ${where}`, vals
    );

    const [resumenRows] = await db.promise().query(
      `SELECT c.estado, COUNT(*) AS cnt, COALESCE(SUM(c.saldo_pendiente), 0) AS saldo
       FROM compras c
       JOIN proveedores p ON p.id_proveedor = c.id_proveedor
       JOIN sucursales  s ON s.id_sucursal  = c.id_sucursal
       JOIN depositos   d ON d.id_deposito  = c.id_deposito_destino
       JOIN usuarios    u ON u.id_usuario   = c.id_usuario_crea
       ${whereBase}
       GROUP BY c.estado`, valsBase
    );
    const resumen = { byEstado: {}, saldoTotal: 0, total: 0 };
    for (const r of resumenRows) {
      resumen.byEstado[r.estado] = Number(r.cnt);
      resumen.saldoTotal += Number(r.saldo);
      resumen.total += Number(r.cnt);
    }

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
       LIMIT ? OFFSET ?`, [...vals, limitNum, offset]
    );
    res.json({ compras: rows, total: Number(total), page: Number(page), limit: limitNum, resumen });
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
              p.codigo_interno, p.codigo_barras, p.producto, p.detalle AS producto_detalle,
              p.modelo, p.color, p.capacidad,
              m.nombre AS marca_nombre,
              u.nombre AS unidad_nombre, u.codigo AS unidad_codigo
       FROM compra_detalle cd
       JOIN productos     p ON p.id_producto = cd.id_producto
       JOIN marcas        m ON m.id_marca    = p.id_marca
       JOIN unidades_medida u ON u.id_unidad = p.id_unidad
       WHERE cd.id_compra = ?
       ORDER BY cd.id_detalle`, [id]
    );
    if (detalle.length) {
      const [series] = await db.promise().query(
        `SELECT id_serie, id_detalle, numero_serie, imagen_url
         FROM compra_detalle_series WHERE id_detalle IN (?)
         ORDER BY id_serie`, [detalle.map(d => d.id_detalle)]
      );
      for (const d of detalle) {
        d.series = series.filter(s => s.id_detalle === d.id_detalle);
      }
    }

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

    const [recepciones] = await db.promise().query(
      `SELECT cr.id_recepcion, cr.fecha, cr.observaciones,
              u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos
       FROM compra_recepciones cr
       JOIN usuarios u ON u.id_usuario = cr.id_usuario
       WHERE cr.id_compra = ?
       ORDER BY cr.fecha DESC`, [id]
    );
    if (recepciones.length) {
      const [recDetalle] = await db.promise().query(
        `SELECT crd.id_recepcion, crd.cantidad_recibida, cd.id_producto,
                p.producto, p.codigo_interno
         FROM compra_recepcion_detalle crd
         JOIN compra_detalle cd ON cd.id_detalle = crd.id_detalle
         JOIN productos p ON p.id_producto = cd.id_producto
         WHERE crd.id_recepcion IN (?)`, [recepciones.map(r => r.id_recepcion)]
      );
      for (const r of recepciones) {
        r.items = recDetalle.filter(d => d.id_recepcion === r.id_recepcion);
      }
    }

    res.json({ compra, detalle, cuotas, pagos, recepciones });
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
      tipo_cambio = 1, fecha_pedido, fecha_estim_llegada, observaciones, numero_factura, procedencia, items,
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
          id_usuario_crea, observaciones, numero_factura, procedencia)
       VALUES (?,?,?,?,?,?, 'PRE_PEDIDO','CONTADO',0, ?,?, ?,?,?,?,?,?,?, ?,?,?,?)`,
      [numero, id_proveedor, id_sucursal, id_deposito_destino, id_moneda, tipo_cambio,
       fecha_pedido || new Date().toISOString().slice(0, 10), fecha_estim_llegada || null,
       tots.subtotal, tots.descuento, tots.impuesto, tots.flete, tots.otros_costos,
       tots.total, tots.total,
       req.user.id_usuario, observaciones || null, numero_factura?.trim() || null, procedencia?.trim() || null]
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
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ese número de factura ya está registrado en otra compra' });
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
      tipo_cambio = 1, fecha_pedido, fecha_estim_llegada, observaciones, numero_factura, procedencia, items,
    } = req.body;

    if (!Array.isArray(items) || !items.length)
      return res.status(400).json({ error: 'Debe agregar al menos un producto' });

    const tots = calcTotales(items, req.body);

    await db.promise().query(
      `UPDATE compras SET
         id_proveedor=?, id_sucursal=?, id_deposito_destino=?, id_moneda=?, tipo_cambio=?,
         fecha_pedido=?, fecha_estim_llegada=?,
         subtotal=?, descuento=?, impuesto=?, flete=?, otros_costos=?,
         total=?, saldo_pendiente=?, observaciones=?, numero_factura=?, procedencia=?
       WHERE id_compra = ?`,
      [id_proveedor, id_sucursal, id_deposito_destino, id_moneda, tipo_cambio,
       fecha_pedido, fecha_estim_llegada || null,
       tots.subtotal, tots.descuento, tots.impuesto, tots.flete, tots.otros_costos,
       tots.total, tots.total, observaciones || null, numero_factura?.trim() || null, procedencia?.trim() || null, id]
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
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ese número de factura ya está registrado en otra compra' });
    console.error('[updateCompra]', err);
    res.status(500).json({ error: 'Error al actualizar compra' });
  }
};

// ── Registrar/editar N° de factura del proveedor (cualquier estado, salvo ANULADO) ──

const actualizarFacturaCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_factura } = req.body;

    const [[compra]] = await db.promise().query(
      `SELECT estado FROM compras WHERE id_compra = ?`, [id]
    );
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    if (compra.estado === 'ANULADO')
      return res.status(409).json({ error: 'No se puede editar la factura de una compra anulada' });

    const valor = numero_factura?.trim() || null;

    try {
      await db.promise().query(
        `UPDATE compras SET numero_factura = ? WHERE id_compra = ?`, [valor, id]
      );
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY')
        return res.status(409).json({ error: 'Ese número de factura ya está registrado en otra compra' });
      throw e;
    }

    await auditLog(req.user.id_usuario, 'compras', id, 'UPDATE', getIp(req));

    const [[updated]] = await db.promise().query(
      `SELECT * FROM compras WHERE id_compra = ?`, [id]
    );
    res.json({ compra: updated });
  } catch (err) {
    console.error('[actualizarFacturaCompra]', err);
    res.status(500).json({ error: 'Error al actualizar la factura' });
  }
};

// ── Aprobar compra PRE_PEDIDO → CONFIRMADO ────────────────────────────────────

const aprobarCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const [[compra]] = await db.promise().query(
      `SELECT id_compra, estado FROM compras WHERE id_compra = ?`, [id]
    );
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    if (compra.estado !== 'PRE_PEDIDO')
      return res.status(409).json({ error: 'Solo se pueden aprobar compras en estado PRE_PEDIDO' });

    await db.promise().query(
      `UPDATE compras SET estado='CONFIRMADO', id_usuario_aprueba=?, fecha_confirmacion=CURDATE()
       WHERE id_compra = ?`,
      [req.user.id_usuario, id]
    );

    await auditLog(req.user.id_usuario, 'compras', id, 'UPDATE', getIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('[aprobarCompra]', err);
    res.status(500).json({ error: 'Error al aprobar compra' });
  }
};

// ── Confirmar pedido (CONFIRMADO|PRE_PEDIDO) → POR_LLEGAR ─────────────────────

const confirmarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { condicion_pago = 'CONTADO', dias_credito = 0, num_cuotas = 1 } = req.body;

    const [[compra]] = await db.promise().query(
      `SELECT id_compra, estado, total, fecha_pedido FROM compras WHERE id_compra = ?`, [id]
    );
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    if (!['PRE_PEDIDO', 'CONFIRMADO'].includes(compra.estado))
      return res.status(409).json({ error: 'Solo se pueden confirmar compras en estado PRE_PEDIDO o CONFIRMADO' });

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
    const { recepciones, observaciones, codigos_barras } = req.body;

    if (!Array.isArray(recepciones) || !recepciones.length)
      return res.status(400).json({ error: 'Debe indicar las cantidades recibidas' });

    const [[comp]] = await db.promise().query(
      `SELECT * FROM compras WHERE id_compra = ?`, [id]
    );
    if (!comp) return res.status(404).json({ error: 'Compra no encontrada' });
    if (!['POR_LLEGAR', 'PARCIAL'].includes(comp.estado))
      return res.status(409).json({ error: 'Solo se puede recibir en estado POR_LLEGAR o PARCIAL' });

    const puedeTotal   = req.ability?.can('recibir', 'compras') ?? false;
    const puedeParcial = req.ability?.can('recibir_parcial', 'compras') ?? false;

    const [[tipoMov]] = await db.promise().query(
      `SELECT id_tipo_movimiento FROM tipos_movimiento WHERE codigo = 'COMPRA' LIMIT 1`
    );
    if (!tipoMov)
      return res.status(500).json({ error: 'Tipo de movimiento COMPRA no configurado en la base de datos' });

    const [detalles] = await db.promise().query(
      `SELECT * FROM compra_detalle WHERE id_compra = ?`, [id]
    );

    // Verificar si la recepción enviada cubriría todo lo pendiente
    const seraTotal = detalles.every(det => {
      const rec     = recepciones.find(r => Number(r.id_detalle) === Number(det.id_detalle));
      const cantRec = rec ? Number(rec.cantidad_recibida) : 0;
      const pend    = +(Number(det.cantidad) - Number(det.cantidad_recibida)).toFixed(4);
      return cantRec >= pend;
    });

    if (!seraTotal && !puedeParcial) {
      return res.status(403).json({
        error: 'No tiene permiso para recepción parcial. Debe indicar todas las cantidades pendientes.',
      });
    }

    const [recepcionRes] = await db.promise().query(
      `INSERT INTO compra_recepciones (id_compra, id_usuario, observaciones) VALUES (?,?,?)`,
      [id, req.user.id_usuario, observaciones || null]
    );
    const id_recepcion = recepcionRes.insertId;

    for (const rec of recepciones) {
      const detalle = detalles.find(d => d.id_detalle === Number(rec.id_detalle));
      if (!detalle) continue;

      const cantNueva     = +Number(rec.cantidad_recibida).toFixed(4);
      const maxPendiente  = +(Number(detalle.cantidad) - Number(detalle.cantidad_recibida)).toFixed(4);
      const cantReal      = +Math.min(cantNueva, maxPendiente).toFixed(4);
      if (cantReal <= 0) continue;

      await db.promise().query(
        `INSERT INTO compra_recepcion_detalle (id_recepcion, id_detalle, cantidad_recibida) VALUES (?,?,?)`,
        [id_recepcion, detalle.id_detalle, cantReal]
      );

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

    if (Array.isArray(codigos_barras) && codigos_barras.length > 0) {
      for (const { id_producto, codigo_barras } of codigos_barras) {
        if (id_producto && codigo_barras?.trim()) {
          await db.promise().query(
            `UPDATE productos SET codigo_barras = ?
             WHERE id_producto = ? AND (codigo_barras IS NULL OR codigo_barras = '')`,
            [codigo_barras.trim(), id_producto]
          );
        }
      }
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

    // Actualizar saldo del proveedor si la compra es a crédito
    if (comp.condicion_pago === 'CREDITO') {
      await db.promise().query(
        `UPDATE proveedores SET saldo_actual = (
           SELECT COALESCE(SUM(saldo_pendiente), 0)
           FROM compras
           WHERE id_proveedor = ? AND condicion_pago = 'CREDITO'
             AND estado IN ('POR_LLEGAR','PARCIAL','RECIBIDO')
         ) WHERE id_proveedor = ?`,
        [comp.id_proveedor, comp.id_proveedor]
      );
    }

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
      `SELECT estado, id_proveedor, condicion_pago FROM compras WHERE id_compra = ?`, [id]
    );
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    if (['RECIBIDO', 'ANULADO'].includes(compra.estado))
      return res.status(409).json({ error: `No se puede anular una compra en estado ${compra.estado}` });

    await db.promise().query(`UPDATE compras SET estado='ANULADO' WHERE id_compra = ?`, [id]);

    // Recalcular saldo del proveedor si era crédito
    if (compra.condicion_pago === 'CREDITO') {
      await db.promise().query(
        `UPDATE proveedores SET saldo_actual = (
           SELECT COALESCE(SUM(saldo_pendiente), 0)
           FROM compras
           WHERE id_proveedor = ? AND condicion_pago = 'CREDITO'
             AND estado IN ('POR_LLEGAR','PARCIAL','RECIBIDO')
         ) WHERE id_proveedor = ?`,
        [compra.id_proveedor, compra.id_proveedor]
      );
    }

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
      numero_referencia, observaciones, fecha,
    } = req.body;
    const comprobante_url = req.file ? `/uploads/compras/${req.file.filename}` : (req.body.comprobante_url || null);

    if (!metodo_pago || !id_moneda || !monto)
      return res.status(400).json({ error: 'Método de pago, moneda y monto son requeridos' });

    const [[compra]] = await db.promise().query(
      `SELECT id_compra, id_sucursal, id_proveedor, saldo_pendiente, estado, condicion_pago FROM compras WHERE id_compra = ?`, [id]
    );
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });

    const estadosValidos = ['POR_LLEGAR', 'CONFIRMADO', 'RECIBIDO', 'PARCIAL'];
    if (!estadosValidos.includes(compra.estado)) {
      return res.status(400).json({
        error: `No se puede registrar un pago en una compra con estado "${compra.estado}". Estado requerido: ${estadosValidos.join(', ')}`
      });
    }

    const montoPago = +Number(monto).toFixed(2);
    if (montoPago <= 0)
      return res.status(400).json({ error: 'El monto debe ser mayor a cero' });
    if (montoPago > Number(compra.saldo_pendiente))
      return res.status(400).json({ error: `El monto no puede superar el saldo pendiente de la compra (${Number(compra.saldo_pendiente).toFixed(2)})` });

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
       numero_referencia || null, comprobante_url,
       req.user.id_usuario, observaciones || null]
    );

    await db.promise().query(
      `UPDATE compras SET saldo_pendiente = GREATEST(0, saldo_pendiente - ?) WHERE id_compra = ?`,
      [montoPago, id]
    );

    // Recalcular saldo del proveedor si la compra es a crédito
    if (compra.condicion_pago === 'CREDITO') {
      await db.promise().query(
        `UPDATE proveedores SET saldo_actual = (
           SELECT COALESCE(SUM(saldo_pendiente), 0)
           FROM compras
           WHERE id_proveedor = ? AND condicion_pago = 'CREDITO'
             AND estado IN ('POR_LLEGAR','PARCIAL','RECIBIDO')
         ) WHERE id_proveedor = ?`,
        [compra.id_proveedor, compra.id_proveedor]
      );
    }

    if (id_cuota) {
      await cascadaCuota(id_cuota, montoPago);
    }

    await auditLog(req.user.id_usuario, 'pagos_compra', r.insertId, 'INSERT', getIp(req));
    res.status(201).json({ id_pago: r.insertId, numero: numeroPago });
  } catch (err) {
    console.error('[createPago]', err);
    res.status(500).json({ error: 'Error al registrar pago' });
  }
};

// ── Actualizar cuota ──────────────────────────────────────────────────────────

const actualizarCuota = async (req, res) => {
  try {
    const { id, idCuota } = req.params;
    const { fecha_vencimiento, monto } = req.body;

    const [[cuota]] = await db.promise().query(
      `SELECT cc.*, c.id_compra FROM compra_cuotas cc
       JOIN compras c ON c.id_compra = cc.id_compra
       WHERE cc.id_cuota = ? AND cc.id_compra = ?`, [idCuota, id]
    );
    if (!cuota) return res.status(404).json({ error: 'Cuota no encontrada' });
    if (cuota.estado === 'PAGADA') return res.status(409).json({ error: 'No se puede modificar una cuota ya pagada' });

    const fields = [], vals = [];
    if (fecha_vencimiento) { fields.push('fecha_vencimiento = ?'); vals.push(fecha_vencimiento); }
    if (monto !== undefined) { fields.push('monto = ?'); vals.push(Number(monto)); }
    if (!fields.length) return res.status(400).json({ error: 'Nada que actualizar' });

    vals.push(idCuota);
    await db.promise().query(`UPDATE compra_cuotas SET ${fields.join(', ')} WHERE id_cuota = ?`, vals);
    await auditLog(req.user.id_usuario, 'compra_cuotas', idCuota, 'UPDATE', getIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('[actualizarCuota]', err);
    res.status(500).json({ error: 'Error al actualizar cuota' });
  }
};

// ── Subir imagen de factura / nota de venta del proveedor ─────────────────────

const subirFacturaImagen = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });

    const [[compra]] = await db.promise().query(
      `SELECT factura_imagen_url FROM compras WHERE id_compra = ?`, [id]
    );
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });

    const url = `/uploads/compras/${req.file.filename}`;
    await db.promise().query(
      `UPDATE compras SET factura_imagen_url = ? WHERE id_compra = ?`, [url, id]
    );

    if (compra.factura_imagen_url) {
      const anterior = path.join(__dirname, '..', compra.factura_imagen_url.replace(/^\/+/, ''));
      fs.unlink(anterior, () => {});
    }

    await auditLog(req.user.id_usuario, 'compras', id, 'UPDATE', getIp(req));
    res.json({ factura_imagen_url: url, mensaje: 'Imagen subida correctamente' });
  } catch (err) {
    console.error('[subirFacturaImagen]', err);
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
};

// ── Subir imagen del producto recibido (por línea de detalle) ─────────────────

const subirImagenDetalle = async (req, res) => {
  try {
    const { id, idDetalle } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });

    const [[detalle]] = await db.promise().query(
      `SELECT imagen_url FROM compra_detalle WHERE id_detalle = ? AND id_compra = ?`, [idDetalle, id]
    );
    if (!detalle) return res.status(404).json({ error: 'Línea de compra no encontrada' });

    const url = `/uploads/compras/${req.file.filename}`;
    await db.promise().query(
      `UPDATE compra_detalle SET imagen_url = ? WHERE id_detalle = ?`, [url, idDetalle]
    );

    if (detalle.imagen_url) {
      const anterior = path.join(__dirname, '..', detalle.imagen_url.replace(/^\/+/, ''));
      fs.unlink(anterior, () => {});
    }

    await auditLog(req.user.id_usuario, 'compra_detalle', idDetalle, 'UPDATE', getIp(req));
    res.json({ imagen_url: url, mensaje: 'Imagen subida correctamente' });
  } catch (err) {
    console.error('[subirImagenDetalle]', err);
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
};

// ── Agregar número de serie + foto de una unidad recibida ─────────────────────

const agregarSerieDetalle = async (req, res) => {
  try {
    const { id, idDetalle } = req.params;
    const { numero_serie } = req.body;
    if (!numero_serie?.trim())
      return res.status(400).json({ error: 'El número de serie es requerido' });

    const [[detalle]] = await db.promise().query(
      `SELECT cd.id_detalle, cd.cantidad_recibida
       FROM compra_detalle cd WHERE cd.id_detalle = ? AND cd.id_compra = ?`, [idDetalle, id]
    );
    if (!detalle) return res.status(404).json({ error: 'Línea de compra no encontrada' });

    const [[{ cnt }]] = await db.promise().query(
      `SELECT COUNT(*) AS cnt FROM compra_detalle_series WHERE id_detalle = ?`, [idDetalle]
    );
    if (cnt >= Number(detalle.cantidad_recibida)) {
      return res.status(409).json({ error: 'Ya se registraron números de serie para todas las unidades recibidas' });
    }

    const imagenUrl = req.file ? `/uploads/compras/${req.file.filename}` : null;
    const [r] = await db.promise().query(
      `INSERT INTO compra_detalle_series (id_detalle, numero_serie, imagen_url, id_usuario) VALUES (?,?,?,?)`,
      [idDetalle, numero_serie.trim(), imagenUrl, req.user.id_usuario]
    );

    await auditLog(req.user.id_usuario, 'compra_detalle_series', r.insertId, 'INSERT', getIp(req));
    res.status(201).json({ id_serie: r.insertId, numero_serie: numero_serie.trim(), imagen_url: imagenUrl });
  } catch (err) {
    console.error('[agregarSerieDetalle]', err);
    res.status(500).json({ error: 'Error al registrar el número de serie' });
  }
};

const eliminarSerieDetalle = async (req, res) => {
  try {
    const { id, idDetalle, idSerie } = req.params;
    const [[serie]] = await db.promise().query(
      `SELECT s.imagen_url FROM compra_detalle_series s
       JOIN compra_detalle cd ON cd.id_detalle = s.id_detalle
       WHERE s.id_serie = ? AND s.id_detalle = ? AND cd.id_compra = ?`, [idSerie, idDetalle, id]
    );
    if (!serie) return res.status(404).json({ error: 'Número de serie no encontrado' });

    await db.promise().query(`DELETE FROM compra_detalle_series WHERE id_serie = ?`, [idSerie]);
    if (serie.imagen_url) {
      const archivo = path.join(__dirname, '..', serie.imagen_url.replace(/^\/+/, ''));
      fs.unlink(archivo, () => {});
    }

    await auditLog(req.user.id_usuario, 'compra_detalle_series', idSerie, 'DELETE', getIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('[eliminarSerieDetalle]', err);
    res.status(500).json({ error: 'Error al eliminar el número de serie' });
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

    const [[compraAnular]] = await db.promise().query(
      `SELECT id_proveedor, condicion_pago FROM compras WHERE id_compra = ?`, [id]
    );

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

    if (pago.comprobante_url) {
      const archivo = path.join(__dirname, '..', pago.comprobante_url.replace(/^\/+/, ''));
      fs.unlink(archivo, () => {});
    }

    // Recalcular saldo del proveedor si la compra era a crédito
    if (compraAnular?.condicion_pago === 'CREDITO') {
      await db.promise().query(
        `UPDATE proveedores SET saldo_actual = (
           SELECT COALESCE(SUM(saldo_pendiente), 0)
           FROM compras
           WHERE id_proveedor = ? AND condicion_pago = 'CREDITO'
             AND estado IN ('POR_LLEGAR','PARCIAL','RECIBIDO')
         ) WHERE id_proveedor = ?`,
        [compraAnular.id_proveedor, compraAnular.id_proveedor]
      );
    }

    await auditLog(req.user.id_usuario, 'pagos_compra', idPago, 'DELETE', getIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('[anularPago]', err);
    res.status(500).json({ error: 'Error al anular pago' });
  }
};

module.exports = {
  getFormData,
  getCompras, getCompra,
  createCompra, updateCompra, actualizarFacturaCompra, subirFacturaImagen, subirImagenDetalle,
  agregarSerieDetalle, eliminarSerieDetalle,
  aprobarCompra, confirmarPedido, recibirMercaderia, anularCompra,
  createPago, anularPago,
  actualizarCuota,
};
