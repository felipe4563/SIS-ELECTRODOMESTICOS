'use strict';
const db = require('../config/db');

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

async function tipoMov(codigo) {
  const [[tm]] = await db.promise().query(
    `SELECT id_tipo_movimiento FROM tipos_movimiento WHERE codigo = ?`, [codigo]
  );
  return tm ?? null;
}

// ── TRANSFERENCIAS ────────────────────────────────────────────────────────────

const getTransferencias = async (req, res) => {
  try {
    const { estado, id_deposito_origen, id_deposito_destino, fecha_desde, fecha_hasta, q } = req.query;
    const where = [], params = [];

    if (estado)              { where.push('t.estado = ?');                  params.push(estado); }
    if (id_deposito_origen)  { where.push('t.id_deposito_origen = ?');      params.push(id_deposito_origen); }
    if (id_deposito_destino) { where.push('t.id_deposito_destino = ?');     params.push(id_deposito_destino); }
    if (fecha_desde)         { where.push('DATE(t.fecha_solicitud) >= ?');  params.push(fecha_desde); }
    if (fecha_hasta)         { where.push('DATE(t.fecha_solicitud) <= ?');  params.push(fecha_hasta); }
    if (q) {
      where.push('(t.numero LIKE ? OR dor.nombre LIKE ? OR dde.nombre LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const [rows] = await db.promise().query(
      `SELECT t.id_transferencia, t.numero, t.estado,
              t.fecha_solicitud, t.fecha_envio, t.fecha_recepcion,
              dor.nombre AS deposito_origen_nombre, dor.codigo AS deposito_origen_codigo,
              dde.nombre AS deposito_destino_nombre, dde.codigo AS deposito_destino_codigo,
              u1.nombres AS solicita_nombres, u1.apellidos AS solicita_apellidos
       FROM transferencias t
       JOIN depositos dor ON dor.id_deposito = t.id_deposito_origen
       JOIN depositos dde ON dde.id_deposito = t.id_deposito_destino
       LEFT JOIN usuarios u1 ON u1.id_usuario = t.id_usuario_solicita
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY t.fecha_solicitud DESC
       LIMIT 200`,
      params
    );

    res.json({ transferencias: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener transferencias' });
  }
};

const getTransferencia = async (req, res) => {
  try {
    const { id } = req.params;
    const [[t]] = await db.promise().query(
      `SELECT t.*,
              dor.nombre AS deposito_origen_nombre, dor.codigo AS deposito_origen_codigo,
              dde.nombre AS deposito_destino_nombre, dde.codigo AS deposito_destino_codigo,
              u1.nombres AS solicita_nombres, u1.apellidos AS solicita_apellidos,
              u2.nombres AS envia_nombres,    u2.apellidos AS envia_apellidos,
              u3.nombres AS recibe_nombres,   u3.apellidos AS recibe_apellidos
       FROM transferencias t
       JOIN depositos dor ON dor.id_deposito = t.id_deposito_origen
       JOIN depositos dde ON dde.id_deposito = t.id_deposito_destino
       LEFT JOIN usuarios u1 ON u1.id_usuario = t.id_usuario_solicita
       LEFT JOIN usuarios u2 ON u2.id_usuario = t.id_usuario_envia
       LEFT JOIN usuarios u3 ON u3.id_usuario = t.id_usuario_recibe
       WHERE t.id_transferencia = ?`, [id]
    );
    if (!t) return res.status(404).json({ mensaje: 'Transferencia no encontrada' });

    const [detalle] = await db.promise().query(
      `SELECT td.id_detalle, td.id_producto, td.cantidad_enviada, td.cantidad_recibida, td.observacion,
              p.producto AS producto_nombre, p.codigo_interno,
              um.nombre AS unidad_nombre
       FROM transferencia_detalle td
       JOIN productos p       ON p.id_producto = td.id_producto
       JOIN unidades_medida um ON um.id_unidad  = p.id_unidad
       WHERE td.id_transferencia = ?
       ORDER BY td.id_detalle`, [id]
    );

    res.json({ ...t, detalle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener transferencia' });
  }
};

const createTransferencia = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const { id_deposito_origen, id_deposito_destino, observaciones, items } = req.body;

    if (!id_deposito_origen || !id_deposito_destino || !items?.length) {
      return res.status(400).json({ mensaje: 'Faltan datos requeridos' });
    }
    if (String(id_deposito_origen) === String(id_deposito_destino)) {
      return res.status(400).json({ mensaje: 'Origen y destino no pueden ser iguales' });
    }

    const numero = await generarNumero('TRF', 'transferencias');

    const [{ insertId }] = await db.promise().query(
      `INSERT INTO transferencias (numero, id_deposito_origen, id_deposito_destino, id_usuario_solicita, observaciones)
       VALUES (?, ?, ?, ?, ?)`,
      [numero, id_deposito_origen, id_deposito_destino, userId, observaciones ?? null]
    );

    for (const item of items) {
      if (!item.id_producto || Number(item.cantidad) <= 0) continue;
      await db.promise().query(
        `INSERT INTO transferencia_detalle (id_transferencia, id_producto, cantidad_enviada, observacion)
         VALUES (?, ?, ?, ?)`,
        [insertId, item.id_producto, item.cantidad, item.observacion ?? null]
      );
    }

    await auditLog(userId, 'transferencias', insertId, 'INSERT', getIp(req));
    res.status(201).json({ ok: true, id_transferencia: insertId, numero });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear transferencia' });
  }
};

const enviarTransferencia = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const { id } = req.params;
    const { observaciones } = req.body ?? {};

    const [[t]] = await db.promise().query(
      `SELECT * FROM transferencias WHERE id_transferencia = ?`, [id]
    );
    if (!t) return res.status(404).json({ mensaje: 'Transferencia no encontrada' });
    if (t.estado !== 'SOLICITADA') {
      return res.status(400).json({ mensaje: `No se puede enviar una transferencia en estado ${t.estado}` });
    }

    const tm = await tipoMov('TRANSFERENCIA_SAL');
    if (!tm) return res.status(500).json({ mensaje: "Falta tipo_movimiento con codigo='TRANSFERENCIA_SAL'" });

    const [detalle] = await db.promise().query(
      `SELECT * FROM transferencia_detalle WHERE id_transferencia = ?`, [id]
    );

    for (const item of detalle) {
      const [[st]] = await db.promise().query(
        `SELECT COALESCE(cantidad, 0) AS qty FROM stock
         WHERE id_producto = ? AND id_deposito = ?`,
        [item.id_producto, t.id_deposito_origen]
      );
      if (Number(st?.qty ?? 0) < Number(item.cantidad_enviada)) {
        return res.status(400).json({
          mensaje: `Stock insuficiente para el producto con id ${item.id_producto}`
        });
      }
    }

    for (const item of detalle) {
      await db.promise().query(
        `UPDATE stock SET cantidad = cantidad - ?, fecha_ult_movimiento = NOW()
         WHERE id_producto = ? AND id_deposito = ?`,
        [item.cantidad_enviada, item.id_producto, t.id_deposito_origen]
      );

      const [[stPost]] = await db.promise().query(
        `SELECT COALESCE(cantidad, 0) AS qty, COALESCE(costo_promedio, 0) AS costo
         FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [item.id_producto, t.id_deposito_origen]
      );

      await db.promise().query(
        `INSERT INTO kardex (id_producto, id_deposito, id_tipo_movimiento, cantidad,
           costo_unitario, saldo_cantidad, saldo_costo,
           documento_tipo, documento_id, documento_numero, id_usuario, observaciones)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          item.id_producto, t.id_deposito_origen, tm.id_tipo_movimiento,
          -Number(item.cantidad_enviada),
          Number(stPost?.costo ?? 0),
          Number(stPost?.qty ?? 0),
          Number(stPost?.costo ?? 0),
          'TRANSFERENCIA', t.id_transferencia, t.numero,
          userId, observaciones ?? null
        ]
      );
    }

    await db.promise().query(
      `UPDATE transferencias
       SET estado = 'EN_TRANSITO', fecha_envio = NOW(), id_usuario_envia = ?
       WHERE id_transferencia = ?`,
      [userId, id]
    );

    await auditLog(userId, 'transferencias', id, 'UPDATE', getIp(req));
    res.json({ ok: true, mensaje: 'Transferencia enviada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al enviar transferencia' });
  }
};

const recibirTransferencia = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const { id } = req.params;
    const { items, observaciones } = req.body ?? {};

    const [[t]] = await db.promise().query(
      `SELECT * FROM transferencias WHERE id_transferencia = ?`, [id]
    );
    if (!t) return res.status(404).json({ mensaje: 'Transferencia no encontrada' });
    if (!['EN_TRANSITO', 'PARCIAL'].includes(t.estado)) {
      return res.status(400).json({ mensaje: `No se puede recibir en estado ${t.estado}` });
    }
    if (!items?.length) return res.status(400).json({ mensaje: 'Debe especificar ítems a recibir' });

    const tmEntrada = await tipoMov('TRANSFERENCIA_ENT');
    if (!tmEntrada) return res.status(500).json({ mensaje: "Falta tipo_movimiento con codigo='TRANSFERENCIA_ENT'" });

    for (const recv of items) {
      const cantRecibir = Number(recv.cantidad_a_recibir ?? 0);
      if (cantRecibir <= 0) continue;

      const [[det]] = await db.promise().query(
        `SELECT * FROM transferencia_detalle WHERE id_detalle = ? AND id_transferencia = ?`,
        [recv.id_detalle, id]
      );
      if (!det) continue;

      const pendiente  = Number(det.cantidad_enviada) - Number(det.cantidad_recibida);
      const cantFinal  = Math.min(cantRecibir, pendiente);
      if (cantFinal <= 0) continue;

      const [[stDest]] = await db.promise().query(
        `SELECT COALESCE(cantidad, 0) AS qty, COALESCE(costo_promedio, 0) AS costo
         FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [det.id_producto, t.id_deposito_destino]
      );
      const [[stOrig]] = await db.promise().query(
        `SELECT COALESCE(costo_promedio, 0) AS costo FROM stock
         WHERE id_producto = ? AND id_deposito = ?`,
        [det.id_producto, t.id_deposito_origen]
      );

      const qtyActual   = Number(stDest?.qty  ?? 0);
      const costoActual = Number(stDest?.costo ?? 0);
      const costoNuevo  = Number(stOrig?.costo ?? 0);
      const newCosto    = (qtyActual + cantFinal) > 0
        ? ((qtyActual * costoActual) + (cantFinal * costoNuevo)) / (qtyActual + cantFinal)
        : costoNuevo;

      await db.promise().query(
        `INSERT INTO stock (id_producto, id_deposito, cantidad, costo_promedio, fecha_ult_movimiento)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           cantidad            = cantidad + VALUES(cantidad),
           costo_promedio      = ?,
           fecha_ult_movimiento = NOW()`,
        [det.id_producto, t.id_deposito_destino, cantFinal, +newCosto.toFixed(4), +newCosto.toFixed(4)]
      );

      const [[stPost]] = await db.promise().query(
        `SELECT COALESCE(cantidad, 0) AS qty, COALESCE(costo_promedio, 0) AS costo
         FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [det.id_producto, t.id_deposito_destino]
      );

      await db.promise().query(
        `INSERT INTO kardex (id_producto, id_deposito, id_tipo_movimiento, cantidad,
           costo_unitario, saldo_cantidad, saldo_costo,
           documento_tipo, documento_id, documento_numero, id_usuario, observaciones)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          det.id_producto, t.id_deposito_destino, tmEntrada.id_tipo_movimiento,
          cantFinal,
          +newCosto.toFixed(4),
          Number(stPost?.qty  ?? 0),
          Number(stPost?.costo ?? 0),
          'TRANSFERENCIA', t.id_transferencia, t.numero,
          userId, observaciones ?? null
        ]
      );

      await db.promise().query(
        `UPDATE transferencia_detalle SET cantidad_recibida = cantidad_recibida + ? WHERE id_detalle = ?`,
        [cantFinal, det.id_detalle]
      );
    }

    const [detalles] = await db.promise().query(
      `SELECT cantidad_enviada, cantidad_recibida FROM transferencia_detalle WHERE id_transferencia = ?`, [id]
    );
    const todosRecibidos = detalles.every(d => Number(d.cantidad_recibida) >= Number(d.cantidad_enviada));
    const nuevoEstado    = todosRecibidos ? 'RECIBIDA' : 'PARCIAL';

    await db.promise().query(
      `UPDATE transferencias SET estado = ?, fecha_recepcion = NOW(), id_usuario_recibe = ?
       WHERE id_transferencia = ?`,
      [nuevoEstado, userId, id]
    );

    await auditLog(userId, 'transferencias', id, 'UPDATE', getIp(req));
    res.json({ ok: true, estado: nuevoEstado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al recibir transferencia' });
  }
};

const anularTransferencia = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const { id } = req.params;

    const [[t]] = await db.promise().query(
      `SELECT * FROM transferencias WHERE id_transferencia = ?`, [id]
    );
    if (!t) return res.status(404).json({ mensaje: 'Transferencia no encontrada' });
    if (!['SOLICITADA', 'EN_TRANSITO'].includes(t.estado)) {
      return res.status(400).json({ mensaje: `No se puede anular una transferencia ${t.estado}` });
    }

    if (t.estado === 'EN_TRANSITO') {
      const tmEntrada = await tipoMov('TRANSFERENCIA_ENT');
      const [detalle] = await db.promise().query(
        `SELECT * FROM transferencia_detalle WHERE id_transferencia = ?`, [id]
      );

      for (const item of detalle) {
        await db.promise().query(
          `UPDATE stock SET cantidad = cantidad + ?, fecha_ult_movimiento = NOW()
           WHERE id_producto = ? AND id_deposito = ?`,
          [item.cantidad_enviada, item.id_producto, t.id_deposito_origen]
        );

        if (tmEntrada) {
          const [[stPost]] = await db.promise().query(
            `SELECT COALESCE(cantidad, 0) AS qty, COALESCE(costo_promedio, 0) AS costo
             FROM stock WHERE id_producto = ? AND id_deposito = ?`,
            [item.id_producto, t.id_deposito_origen]
          );
          await db.promise().query(
            `INSERT INTO kardex (id_producto, id_deposito, id_tipo_movimiento, cantidad,
               costo_unitario, saldo_cantidad, saldo_costo,
               documento_tipo, documento_id, documento_numero, id_usuario, observaciones)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              item.id_producto, t.id_deposito_origen, tmEntrada.id_tipo_movimiento,
              Number(item.cantidad_enviada),
              Number(stPost?.costo ?? 0),
              Number(stPost?.qty   ?? 0),
              Number(stPost?.costo ?? 0),
              'TRANSFERENCIA', t.id_transferencia, t.numero,
              userId, 'Reversión por anulación'
            ]
          );
        }
      }
    }

    await db.promise().query(
      `UPDATE transferencias SET estado = 'ANULADA' WHERE id_transferencia = ?`, [id]
    );

    await auditLog(userId, 'transferencias', id, 'UPDATE', getIp(req));
    res.json({ ok: true, mensaje: 'Transferencia anulada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al anular transferencia' });
  }
};

// ── AJUSTES DE INVENTARIO ─────────────────────────────────────────────────────

const getAjustes = async (req, res) => {
  try {
    const { estado, id_deposito, fecha_desde, fecha_hasta } = req.query;
    const where = [], params = [];

    if (estado)      { where.push('a.estado = ?');         params.push(estado); }
    if (id_deposito) { where.push('a.id_deposito = ?');    params.push(id_deposito); }
    if (fecha_desde) { where.push('DATE(a.fecha) >= ?');   params.push(fecha_desde); }
    if (fecha_hasta) { where.push('DATE(a.fecha) <= ?');   params.push(fecha_hasta); }

    const [rows] = await db.promise().query(
      `SELECT a.id_ajuste, a.numero, a.estado, a.fecha, a.motivo,
              d.nombre AS deposito_nombre, d.codigo AS deposito_codigo,
              u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos,
              (SELECT COUNT(*) FROM ajuste_inventario_detalle ad WHERE ad.id_ajuste = a.id_ajuste) AS num_items
       FROM ajustes_inventario a
       JOIN depositos d ON d.id_deposito = a.id_deposito
       JOIN usuarios  u ON u.id_usuario  = a.id_usuario
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY a.fecha DESC
       LIMIT 200`,
      params
    );

    res.json({ ajustes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener ajustes' });
  }
};

const getAjuste = async (req, res) => {
  try {
    const { id } = req.params;
    const [[a]] = await db.promise().query(
      `SELECT a.*,
              d.nombre AS deposito_nombre, d.codigo AS deposito_codigo,
              u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos
       FROM ajustes_inventario a
       JOIN depositos d ON d.id_deposito = a.id_deposito
       JOIN usuarios  u ON u.id_usuario  = a.id_usuario
       WHERE a.id_ajuste = ?`, [id]
    );
    if (!a) return res.status(404).json({ mensaje: 'Ajuste no encontrado' });

    const [detalle] = await db.promise().query(
      `SELECT ad.id_detalle, ad.id_producto, ad.cantidad_sistema, ad.cantidad_fisica,
              ad.diferencia, ad.observacion,
              p.producto AS producto_nombre, p.codigo_interno,
              um.nombre AS unidad_nombre
       FROM ajuste_inventario_detalle ad
       JOIN productos p        ON p.id_producto = ad.id_producto
       JOIN unidades_medida um ON um.id_unidad   = p.id_unidad
       WHERE ad.id_ajuste = ?
       ORDER BY ad.id_detalle`, [id]
    );

    res.json({ ...a, detalle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener ajuste' });
  }
};

const createAjuste = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const { id_deposito, motivo, items } = req.body;

    if (!id_deposito || !items?.length) {
      return res.status(400).json({ mensaje: 'Faltan datos requeridos' });
    }

    const numero = await generarNumero('AJU', 'ajustes_inventario');

    const [{ insertId }] = await db.promise().query(
      `INSERT INTO ajustes_inventario (numero, id_deposito, motivo, id_usuario)
       VALUES (?, ?, ?, ?)`,
      [numero, id_deposito, motivo ?? null, userId]
    );

    for (const item of items) {
      await db.promise().query(
        `INSERT INTO ajuste_inventario_detalle
           (id_ajuste, id_producto, cantidad_sistema, cantidad_fisica, observacion)
         VALUES (?, ?, ?, ?, ?)`,
        [insertId, item.id_producto, item.cantidad_sistema, item.cantidad_fisica, item.observacion ?? null]
      );
    }

    await auditLog(userId, 'ajustes_inventario', insertId, 'INSERT', getIp(req));
    res.status(201).json({ ok: true, id_ajuste: insertId, numero });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear ajuste' });
  }
};

const updateAjuste = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const { id } = req.params;
    const { motivo, items } = req.body;

    const [[a]] = await db.promise().query(
      `SELECT * FROM ajustes_inventario WHERE id_ajuste = ?`, [id]
    );
    if (!a) return res.status(404).json({ mensaje: 'Ajuste no encontrado' });
    if (a.estado !== 'BORRADOR') {
      return res.status(400).json({ mensaje: 'Solo se puede editar un ajuste en estado BORRADOR' });
    }

    await db.promise().query(
      `UPDATE ajustes_inventario SET motivo = ? WHERE id_ajuste = ?`, [motivo ?? null, id]
    );

    await db.promise().query(
      `DELETE FROM ajuste_inventario_detalle WHERE id_ajuste = ?`, [id]
    );

    for (const item of items ?? []) {
      await db.promise().query(
        `INSERT INTO ajuste_inventario_detalle
           (id_ajuste, id_producto, cantidad_sistema, cantidad_fisica, observacion)
         VALUES (?, ?, ?, ?, ?)`,
        [id, item.id_producto, item.cantidad_sistema, item.cantidad_fisica, item.observacion ?? null]
      );
    }

    await auditLog(userId, 'ajustes_inventario', id, 'UPDATE', getIp(req));
    res.json({ ok: true, mensaje: 'Ajuste actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al actualizar ajuste' });
  }
};

const aprobarAjuste = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const { id } = req.params;

    const [[a]] = await db.promise().query(
      `SELECT * FROM ajustes_inventario WHERE id_ajuste = ?`, [id]
    );
    if (!a) return res.status(404).json({ mensaje: 'Ajuste no encontrado' });
    if (a.estado !== 'BORRADOR') {
      return res.status(400).json({ mensaje: `No se puede aprobar un ajuste en estado ${a.estado}` });
    }

    const tmEntrada = await tipoMov('AJUSTE_POS');
    const tmSalida  = await tipoMov('AJUSTE_NEG');
    if (!tmEntrada || !tmSalida) {
      return res.status(500).json({
        mensaje: "Faltan tipos_movimiento con codigos 'AJUSTE_POS' y/o 'AJUSTE_NEG'"
      });
    }

    const [detalle] = await db.promise().query(
      `SELECT * FROM ajuste_inventario_detalle WHERE id_ajuste = ?`, [id]
    );

    for (const item of detalle) {
      const diferencia = Number(item.diferencia);
      if (diferencia === 0) continue;

      const esEntrada = diferencia > 0;
      const cantAbs   = Math.abs(diferencia);
      const tmId      = esEntrada ? tmEntrada.id_tipo_movimiento : tmSalida.id_tipo_movimiento;

      await db.promise().query(
        `INSERT INTO stock (id_producto, id_deposito, cantidad, fecha_ult_movimiento)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           cantidad             = VALUES(cantidad),
           fecha_ult_movimiento = NOW()`,
        [item.id_producto, a.id_deposito, Number(item.cantidad_fisica)]
      );

      const [[stPost]] = await db.promise().query(
        `SELECT COALESCE(cantidad, 0) AS qty, COALESCE(costo_promedio, 0) AS costo
         FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [item.id_producto, a.id_deposito]
      );

      await db.promise().query(
        `INSERT INTO kardex (id_producto, id_deposito, id_tipo_movimiento, cantidad,
           costo_unitario, saldo_cantidad, saldo_costo,
           documento_tipo, documento_id, documento_numero, id_usuario, observaciones)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          item.id_producto, a.id_deposito, tmId,
          esEntrada ? cantAbs : -cantAbs,
          Number(stPost?.costo ?? 0),
          Number(stPost?.qty   ?? 0),
          Number(stPost?.costo ?? 0),
          'AJUSTE', a.id_ajuste, a.numero,
          userId, item.observacion ?? a.motivo ?? null
        ]
      );
    }

    await db.promise().query(
      `UPDATE ajustes_inventario SET estado = 'APROBADO' WHERE id_ajuste = ?`, [id]
    );

    await auditLog(userId, 'ajustes_inventario', id, 'UPDATE', getIp(req));
    res.json({ ok: true, mensaje: 'Ajuste aprobado y stock actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al aprobar ajuste' });
  }
};

const anularAjuste = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const { id } = req.params;

    const [[a]] = await db.promise().query(
      `SELECT * FROM ajustes_inventario WHERE id_ajuste = ?`, [id]
    );
    if (!a) return res.status(404).json({ mensaje: 'Ajuste no encontrado' });
    if (a.estado !== 'BORRADOR') {
      return res.status(400).json({ mensaje: 'Solo se puede anular un ajuste en estado BORRADOR' });
    }

    await db.promise().query(
      `UPDATE ajustes_inventario SET estado = 'ANULADO' WHERE id_ajuste = ?`, [id]
    );

    await auditLog(userId, 'ajustes_inventario', id, 'UPDATE', getIp(req));
    res.json({ ok: true, mensaje: 'Ajuste anulado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al anular ajuste' });
  }
};

module.exports = {
  getTransferencias, getTransferencia, createTransferencia,
  enviarTransferencia, recibirTransferencia, anularTransferencia,
  getAjustes, getAjuste, createAjuste, updateAjuste, aprobarAjuste, anularAjuste,
};
