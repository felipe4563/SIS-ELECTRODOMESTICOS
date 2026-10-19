'use strict';
const db = require('../config/db');
const productoSeries = require('../models/productoSeries');

const getIp = req => req.ip || req.socket?.remoteAddress || null;

// Adaptador para que las funciones de productoSeries.js (que esperan un
// objeto con `.promise().query(...)`, el shape del pool mysql2) puedan
// correr dentro de la MISMA transacción que el resto de la operación,
// usando una conexión ya tomada de `db.promise().getConnection()` (que no
// expone `.promise()` porque ya está en modo promesa).
const dbTx = conn => ({ promise: () => conn });

// Error con código HTTP explícito, para poder usar un único catch que
// haga rollback + libere la conexión sin repetir esa lógica en cada
// validación temprana dentro de una transacción.
class ApiError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
    this.mensaje = mensaje;
  }
}

// Asocia un lote de series a una línea de transferencia (BORRADOR), validando
// dentro del propio UPDATE que cada serie sea realmente elegible: EN_STOCK, en
// el depósito de origen de ESTA transferencia, del producto de ESTA línea, y
// sin estar ya enganchada a otra transferencia todavía activa (si apunta a una
// línea de otra transferencia que no esté ANULADA ni RECIBIDA, se rechaza en
// vez de "robársela" en silencio). Si `affectedRows` no cubre todas las series
// pedidas, alguna no cumplía y se aborta con 409 (el catch del llamador hace
// rollback de toda la transacción).
async function asociarSeriesATransferencia(conn, { idsSerie, idDetalle, idDepositoOrigen, idProducto }) {
  if (!idsSerie?.length) return;
  const [r] = await conn.query(
    `UPDATE compra_detalle_series cds
     LEFT JOIN transferencia_detalle td ON td.id_detalle = cds.id_transferencia_detalle
     LEFT JOIN transferencias t2 ON t2.id_transferencia = td.id_transferencia
     SET cds.id_transferencia_detalle = ?
     WHERE cds.id_serie IN (?)
       AND cds.estado = 'EN_STOCK'
       AND cds.id_deposito_actual = ?
       AND cds.id_producto = ?
       AND (cds.id_transferencia_detalle IS NULL OR t2.estado IN ('ANULADA', 'RECIBIDA'))`,
    [idDetalle, idsSerie, idDepositoOrigen, idProducto]
  );
  if (r.affectedRows !== idsSerie.length) {
    throw new ApiError(409, 'Una de las series elegidas no está disponible para esta transferencia');
  }
}

const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?,?,?,?,?)`,
    [userId, tabla, String(id), accion, ip]
  ).catch(e => console.error('[auditLog]', accion, tabla, e.message));

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
    const { estado, id_deposito_origen, id_deposito_destino, fecha_desde, fecha_hasta, q, page = 1, limit = 20 } = req.query;
    const limitNum = Math.min(Number(limit) || 20, 200);
    const offset = (Number(page) - 1) * limitNum;
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

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM transferencias t
       JOIN depositos dor ON dor.id_deposito = t.id_deposito_origen
       JOIN depositos dde ON dde.id_deposito = t.id_deposito_destino
       LEFT JOIN usuarios u1 ON u1.id_usuario = t.id_usuario_solicita
       ${whereSql}`,
      params
    );

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
       ${whereSql}
       ORDER BY t.fecha_solicitud DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({ transferencias: rows, total: Number(total), page: Number(page), limit: limitNum });
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
      `SELECT td.id_detalle, td.id_producto, td.cantidad_enviada, td.cantidad_despachada, td.cantidad_recibida, td.observacion,
              p.producto AS producto_nombre, p.codigo_interno,
              p.modelo, p.color, p.detalle AS producto_detalle, p.capacidad, m.nombre AS marca,
              um.nombre AS unidad_nombre
       FROM transferencia_detalle td
       JOIN productos p       ON p.id_producto = td.id_producto
       JOIN marcas    m       ON m.id_marca    = p.id_marca
       JOIN unidades_medida um ON um.id_unidad  = p.id_unidad
       WHERE td.id_transferencia = ?
       ORDER BY td.id_detalle`, [id]
    );

    // Series ligadas a cada línea. A diferencia de ventas, una línea de
    // transferencia puede tener varias series (no se parte en filas de 1),
    // así que en vez de un LEFT JOIN (que duplicaría las líneas) se trae
    // aparte y se adjunta como array. Sin esto, el modo edición del borrador
    // no sabe qué series tenía reservadas cada línea y al guardar las suelta.
    if (detalle.length) {
      const [seriesRows] = await db.promise().query(
        `SELECT id_serie, numero_serie, estado, id_transferencia_detalle, id_deposito_actual
         FROM compra_detalle_series
         WHERE id_transferencia_detalle IN (?)
         ORDER BY id_serie`,
        [detalle.map(d => d.id_detalle)]
      );
      const porDetalle = new Map();
      for (const s of seriesRows) {
        const k = String(s.id_transferencia_detalle);
        if (!porDetalle.has(k)) porDetalle.set(k, []);
        porDetalle.get(k).push({ id_serie: s.id_serie, numero_serie: s.numero_serie, estado: s.estado, id_deposito_actual: s.id_deposito_actual });
      }
      for (const d of detalle) d.series = porDetalle.get(String(d.id_detalle)) ?? [];
    }

    res.json({ ...t, detalle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener transferencia' });
  }
};

const createTransferencia = async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    const userId = req.user.id_usuario;
    const { id_deposito_origen, id_deposito_destino, observaciones, items } = req.body;

    if (!id_deposito_origen || !id_deposito_destino || !items?.length) {
      throw new ApiError(400, 'Faltan datos requeridos');
    }
    if (String(id_deposito_origen) === String(id_deposito_destino)) {
      throw new ApiError(400, 'Origen y destino no pueden ser iguales');
    }
    for (const item of items) {
      if (!item.id_producto || Number(item.cantidad) <= 0) continue;
      if (item.series?.length > Number(item.cantidad)) {
        throw new ApiError(400, 'Elegiste más series de las que caben en la cantidad');
      }
    }

    await conn.beginTransaction();

    const numero = await generarNumero('TRF', 'transferencias');

    const [{ insertId }] = await conn.query(
      `INSERT INTO transferencias (numero, id_deposito_origen, id_deposito_destino, id_usuario_solicita, observaciones)
       VALUES (?, ?, ?, ?, ?)`,
      [numero, id_deposito_origen, id_deposito_destino, userId, observaciones ?? null]
    );

    for (const item of items) {
      if (!item.id_producto || Number(item.cantidad) <= 0) continue;
      const [{ insertId: idDetalle }] = await conn.query(
        `INSERT INTO transferencia_detalle (id_transferencia, id_producto, cantidad_enviada, observacion)
         VALUES (?, ?, ?, ?)`,
        [insertId, item.id_producto, item.cantidad, item.observacion ?? null]
      );
      if (item.series?.length) {
        await asociarSeriesATransferencia(conn, {
          idsSerie: item.series,
          idDetalle,
          idDepositoOrigen: id_deposito_origen,
          idProducto: item.id_producto,
        });
      }
    }

    await auditLog(userId, 'transferencias', insertId, 'INSERT', getIp(req));
    await conn.commit();
    res.status(201).json({ ok: true, id_transferencia: insertId, numero });
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (err instanceof ApiError) return res.status(err.status).json({ mensaje: err.mensaje });
    console.error(err);
    res.status(500).json({ mensaje: 'Error al crear transferencia' });
  } finally {
    conn.release();
  }
};

const updateTransferencia = async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    const { id } = req.params;
    const { id_deposito_origen, id_deposito_destino, observaciones, items } = req.body;

    const [[t]] = await conn.query(`SELECT estado FROM transferencias WHERE id_transferencia = ?`, [id]);
    if (!t) throw new ApiError(404, 'Transferencia no encontrada');
    if (t.estado !== 'BORRADOR') throw new ApiError(400, 'Solo se puede editar una transferencia en borrador');

    if (!id_deposito_origen || !id_deposito_destino || !items?.length) {
      throw new ApiError(400, 'Faltan datos requeridos');
    }
    if (String(id_deposito_origen) === String(id_deposito_destino)) {
      throw new ApiError(400, 'Origen y destino no pueden ser iguales');
    }
    for (const item of items) {
      if (!item.id_producto || Number(item.cantidad) <= 0) continue;
      if (item.series?.length > Number(item.cantidad)) {
        throw new ApiError(400, 'Elegiste más series de las que caben en la cantidad');
      }
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE transferencias SET id_deposito_origen = ?, id_deposito_destino = ?, observaciones = ?
       WHERE id_transferencia = ?`,
      [id_deposito_origen, id_deposito_destino, observaciones ?? null, id]
    );

    // Las líneas viejas van a borrarse y recrearse; si alguna tenía series
    // asociadas (id_transferencia_detalle las referencia vía FK), hay que
    // soltar esa asociación primero o el DELETE de abajo falla por la FK.
    await conn.query(
      `UPDATE compra_detalle_series SET id_transferencia_detalle = NULL
       WHERE id_transferencia_detalle IN (SELECT id_detalle FROM transferencia_detalle WHERE id_transferencia = ?)`,
      [id]
    );
    await conn.query(`DELETE FROM transferencia_detalle WHERE id_transferencia = ?`, [id]);
    for (const item of items) {
      if (!item.id_producto || Number(item.cantidad) <= 0) continue;
      const [{ insertId: idDetalle }] = await conn.query(
        `INSERT INTO transferencia_detalle (id_transferencia, id_producto, cantidad_enviada, observacion)
         VALUES (?, ?, ?, ?)`,
        [id, item.id_producto, item.cantidad, item.observacion ?? null]
      );
      if (item.series?.length) {
        await asociarSeriesATransferencia(conn, {
          idsSerie: item.series,
          idDetalle,
          idDepositoOrigen: id_deposito_origen,
          idProducto: item.id_producto,
        });
      }
    }

    await auditLog(req.user.id_usuario, 'transferencias', id, 'UPDATE', getIp(req));
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (err instanceof ApiError) return res.status(err.status).json({ mensaje: err.mensaje });
    console.error(err);
    res.status(500).json({ mensaje: 'Error al editar transferencia' });
  } finally {
    conn.release();
  }
};

const emitirTransferencia = async (req, res) => {
  try {
    const { id } = req.params;
    const [[t]] = await db.promise().query(`SELECT estado FROM transferencias WHERE id_transferencia = ?`, [id]);
    if (!t) return res.status(404).json({ mensaje: 'Transferencia no encontrada' });
    if (t.estado !== 'BORRADOR') return res.status(400).json({ mensaje: 'Solo se puede emitir una transferencia en borrador' });

    const [detalle] = await db.promise().query(
      `SELECT id_detalle FROM transferencia_detalle WHERE id_transferencia = ?`, [id]
    );
    if (!detalle.length) return res.status(400).json({ mensaje: 'La transferencia no tiene productos' });

    await db.promise().query(`UPDATE transferencias SET estado = 'SOLICITADA' WHERE id_transferencia = ?`, [id]);
    await auditLog(req.user.id_usuario, 'transferencias', id, 'UPDATE', getIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al emitir transferencia' });
  }
};

const enviarTransferencia = async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    const userId = req.user.id_usuario;
    const { id } = req.params;
    const { items, observaciones } = req.body ?? {};

    const [[t]] = await conn.query(
      `SELECT * FROM transferencias WHERE id_transferencia = ?`, [id]
    );
    if (!t) throw new ApiError(404, 'Transferencia no encontrada');
    if (!['SOLICITADA', 'EN_TRANSITO', 'PARCIAL'].includes(t.estado)) {
      throw new ApiError(400, `No se puede enviar una transferencia en estado ${t.estado}`);
    }

    const tm = await tipoMov('TRANSFERENCIA_SAL');
    if (!tm) throw new ApiError(500, "Falta tipo_movimiento con codigo='TRANSFERENCIA_SAL'");

    const [detalle] = await conn.query(
      `SELECT td.*, p.producto, p.codigo_interno, p.modelo
       FROM transferencia_detalle td
       JOIN productos p ON p.id_producto = td.id_producto
       WHERE td.id_transferencia = ?`, [id]
    );

    const detalleById = new Map(detalle.map(d => [String(d.id_detalle), d]));
    const aEnviar = [];

    if (items?.length) {
      for (const it of items) {
        const item = detalleById.get(String(it.id_detalle));
        if (!item) continue;
        const pendienteDespacho = Number(item.cantidad_enviada) - Number(item.cantidad_despachada);
        const cant = Math.min(Number(it.cantidad_a_enviar ?? 0), pendienteDespacho);
        if (cant > 0) aEnviar.push({ ...item, cantidad_a_enviar: cant, series_elegidas: it.series });
      }
    } else {
      for (const item of detalle) {
        const pendienteDespacho = Number(item.cantidad_enviada) - Number(item.cantidad_despachada);
        if (pendienteDespacho > 0) aEnviar.push({ ...item, cantidad_a_enviar: pendienteDespacho });
      }
    }

    if (!aEnviar.length) throw new ApiError(400, 'No hay cantidades pendientes de despacho');

    for (const item of aEnviar) {
      const [[st]] = await conn.query(
        `SELECT COALESCE(cantidad, 0) AS qty FROM stock
         WHERE id_producto = ? AND id_deposito = ?`,
        [item.id_producto, t.id_deposito_origen]
      );
      if (Number(st?.qty ?? 0) < item.cantidad_a_enviar) {
        const nombreProd = [item.producto, item.modelo].filter(Boolean).join(' ');
        throw new ApiError(400, `Stock insuficiente para "${nombreProd}" (${item.codigo_interno})`);
      }
    }

    await conn.beginTransaction();

    for (const item of aEnviar) {
      await conn.query(
        `UPDATE stock SET cantidad = cantidad - ?, fecha_ult_movimiento = NOW()
         WHERE id_producto = ? AND id_deposito = ?`,
        [item.cantidad_a_enviar, item.id_producto, t.id_deposito_origen]
      );

      const [[stPost]] = await conn.query(
        `SELECT COALESCE(cantidad, 0) AS qty, COALESCE(costo_promedio, 0) AS costo
         FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [item.id_producto, t.id_deposito_origen]
      );

      await conn.query(
        `INSERT INTO kardex (id_producto, id_deposito, id_tipo_movimiento, cantidad,
           costo_unitario, saldo_cantidad, saldo_costo,
           documento_tipo, documento_id, documento_numero, id_usuario, observaciones)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          item.id_producto, t.id_deposito_origen, tm.id_tipo_movimiento,
          -item.cantidad_a_enviar,
          Number(stPost?.costo ?? 0),
          Number(stPost?.qty ?? 0),
          Number(stPost?.costo ?? 0),
          'TRANSFERENCIA', t.id_transferencia, t.numero,
          userId, observaciones ?? null
        ]
      );

      await conn.query(
        `UPDATE transferencia_detalle SET cantidad_despachada = cantidad_despachada + ? WHERE id_detalle = ?`,
        [item.cantidad_a_enviar, item.id_detalle]
      );

      // Series elegidas para esta línea (si las hay): pasan a EN_TRANSITO
      // solo tantas como unidades salen en ESTE envío (envío parcial): las
      // demás quedan EN_STOCK para un despacho posterior. Sin el filtro de
      // estado + LIMIT, un envío parcial movía todas las series y el envío
      // del resto fallaba siempre con 409 (sin salida desde la UI).
      // El filtro por id_deposito_actual = origen es igual de necesario:
      // confirmarRecepcion() no limpia id_transferencia_detalle, así que una
      // serie ya recibida en un envío parcial anterior queda EN_STOCK pero
      // en el depósito DESTINO, todavía "enganchada" a esta línea. Sin este
      // filtro, un envío posterior la volvía a elegir (está EN_STOCK) y
      // moverATransito fallaba con 409 porque ya no estaba en el origen.
      // Si alguna ya no está disponible (otra transferencia/venta la tomó
      // entretanto), moverATransito lanza SERIE_NO_DISPONIBLE y el catch de
      // abajo revierte toda la operación (stock y kardex incluidos).
      // Si el usuario eligió explícitamente cuáles series despacha en este
      // envío (item.series_elegidas), se respeta esa elección en vez de
      // tomar las primeras por id; se valida que sigan EN_STOCK en el
      // origen antes de usarlas.
      let idsSerieEnviar;
      if (Array.isArray(item.series_elegidas) && item.series_elegidas.length) {
        idsSerieEnviar = item.series_elegidas.slice(0, Math.floor(Number(item.cantidad_a_enviar)));
        const [chk] = await conn.query(
          `SELECT id_serie FROM compra_detalle_series
           WHERE id_serie IN (?) AND id_transferencia_detalle = ? AND estado = 'EN_STOCK' AND id_deposito_actual = ?`,
          [idsSerieEnviar, item.id_detalle, t.id_deposito_origen]
        );
        if (chk.length !== idsSerieEnviar.length) throw new Error('SERIE_NO_DISPONIBLE');
      } else {
        const [seriesRows] = await conn.query(
          `SELECT id_serie FROM compra_detalle_series
           WHERE id_transferencia_detalle = ? AND estado = 'EN_STOCK' AND id_deposito_actual = ?
           ORDER BY id_serie
           LIMIT ?`,
          [item.id_detalle, t.id_deposito_origen, Math.floor(Number(item.cantidad_a_enviar))]
        );
        idsSerieEnviar = seriesRows.map(r => r.id_serie);
      }
      if (idsSerieEnviar.length) {
        await productoSeries.moverATransito(dbTx(conn), idsSerieEnviar, {
          id_transferencia_detalle: item.id_detalle,
          id_deposito_origen: t.id_deposito_origen,
        });
      }
    }

    const [detallesPost] = await conn.query(
      `SELECT cantidad_enviada, cantidad_despachada, cantidad_recibida FROM transferencia_detalle WHERE id_transferencia = ?`, [id]
    );
    const todoDespachado = detallesPost.every(d => Number(d.cantidad_despachada) >= Number(d.cantidad_enviada));
    // Si ya se había recibido algo antes de este envío (transferencia PARCIAL),
    // un nuevo despacho no debe "ocultar" esa recepción volviendo a EN_TRANSITO:
    // se mantiene PARCIAL para que el estado siga reflejando lo ya recibido.
    const hayRecibido = detallesPost.some(d => Number(d.cantidad_recibida) > 0);
    const nuevoEstadoEnvio = hayRecibido ? 'PARCIAL' : 'EN_TRANSITO';

    await conn.query(
      `UPDATE transferencias
       SET estado = ?,
           fecha_envio = COALESCE(fecha_envio, NOW()),
           id_usuario_envia = ?,
           observaciones_envio = COALESCE(?, observaciones_envio)
       WHERE id_transferencia = ?`,
      [nuevoEstadoEnvio, userId, observaciones ?? null, id]
    );

    await auditLog(userId, 'transferencias', id, 'UPDATE', getIp(req));
    await conn.commit();
    res.json({ ok: true, mensaje: todoDespachado ? 'Transferencia enviada por completo' : 'Envío parcial registrado', completo: todoDespachado });
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (err.message === 'SERIE_NO_DISPONIBLE') {
      return res.status(409).json({ mensaje: 'Una de las series elegidas ya no está disponible, volvé a elegir' });
    }
    if (err instanceof ApiError) return res.status(err.status).json({ mensaje: err.mensaje });
    console.error(err);
    res.status(500).json({ mensaje: 'Error al enviar transferencia' });
  } finally {
    conn.release();
  }
};

const recibirTransferencia = async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    const userId = req.user.id_usuario;
    const { id } = req.params;
    const { items, observaciones } = req.body ?? {};

    const [[t]] = await conn.query(
      `SELECT * FROM transferencias WHERE id_transferencia = ?`, [id]
    );
    if (!t) throw new ApiError(404, 'Transferencia no encontrada');
    if (!['EN_TRANSITO', 'PARCIAL'].includes(t.estado)) {
      throw new ApiError(400, `No se puede recibir en estado ${t.estado}`);
    }
    if (!items?.length) throw new ApiError(400, 'Debe especificar ítems a recibir');

    const tmEntrada = await tipoMov('TRANSFERENCIA_ENT');
    if (!tmEntrada) throw new ApiError(500, "Falta tipo_movimiento con codigo='TRANSFERENCIA_ENT'");

    await conn.beginTransaction();

    for (const recv of items) {
      const cantRecibir = Number(recv.cantidad_a_recibir ?? 0);
      if (cantRecibir <= 0) continue;

      const [[det]] = await conn.query(
        `SELECT * FROM transferencia_detalle WHERE id_detalle = ? AND id_transferencia = ?`,
        [recv.id_detalle, id]
      );
      if (!det) continue;

      const pendiente  = Number(det.cantidad_despachada) - Number(det.cantidad_recibida);
      const cantFinal  = Math.min(cantRecibir, pendiente);
      if (cantFinal <= 0) continue;

      const [[stDest]] = await conn.query(
        `SELECT COALESCE(cantidad, 0) AS qty, COALESCE(costo_promedio, 0) AS costo
         FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [det.id_producto, t.id_deposito_destino]
      );
      const [[stOrig]] = await conn.query(
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

      await conn.query(
        `INSERT INTO stock (id_producto, id_deposito, cantidad, costo_promedio, fecha_ult_movimiento)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           cantidad            = cantidad + VALUES(cantidad),
           costo_promedio      = ?,
           fecha_ult_movimiento = NOW()`,
        [det.id_producto, t.id_deposito_destino, cantFinal, +newCosto.toFixed(4), +newCosto.toFixed(4)]
      );

      const [[stPost]] = await conn.query(
        `SELECT COALESCE(cantidad, 0) AS qty, COALESCE(costo_promedio, 0) AS costo
         FROM stock WHERE id_producto = ? AND id_deposito = ?`,
        [det.id_producto, t.id_deposito_destino]
      );

      await conn.query(
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

      await conn.query(
        `UPDATE transferencia_detalle SET cantidad_recibida = cantidad_recibida + ? WHERE id_detalle = ?`,
        [cantFinal, det.id_detalle]
      );

      // Series en tránsito asociadas a esta línea: confirman recepción en
      // el depósito destino (vuelven a EN_STOCK, ya ubicadas ahí). Solo
      // tantas como unidades se reciben en ESTA llamada (recepción parcial):
      // el resto sigue EN_TRANSITO para la próxima recepción.
      // Si el usuario eligió explícitamente cuáles series está recibiendo
      // (recv.series), se respeta esa elección en vez de tomar las primeras
      // por id; se valida que sigan EN_TRANSITO en esta línea antes de usarlas.
      let idsSerie;
      if (Array.isArray(recv.series) && recv.series.length) {
        idsSerie = recv.series.slice(0, Math.floor(cantFinal));
        const [chk] = await conn.query(
          `SELECT id_serie FROM compra_detalle_series
           WHERE id_serie IN (?) AND id_transferencia_detalle = ? AND estado = 'EN_TRANSITO'`,
          [idsSerie, det.id_detalle]
        );
        if (chk.length !== idsSerie.length) throw new Error('SERIE_NO_DISPONIBLE');
      } else {
        const [seriesRows] = await conn.query(
          `SELECT id_serie FROM compra_detalle_series
           WHERE id_transferencia_detalle = ? AND estado = 'EN_TRANSITO'
           ORDER BY id_serie
           LIMIT ?`,
          [det.id_detalle, Math.floor(cantFinal)]
        );
        idsSerie = seriesRows.map(r => r.id_serie);
      }
      if (idsSerie.length) {
        await productoSeries.confirmarRecepcion(dbTx(conn), idsSerie, {
          id_deposito_destino: t.id_deposito_destino,
        });
      }
    }

    const [detalles] = await conn.query(
      `SELECT cantidad_enviada, cantidad_recibida FROM transferencia_detalle WHERE id_transferencia = ?`, [id]
    );
    const todosRecibidos = detalles.every(d => Number(d.cantidad_recibida) >= Number(d.cantidad_enviada));
    const nuevoEstado    = todosRecibidos ? 'RECIBIDA' : 'PARCIAL';

    await conn.query(
      `UPDATE transferencias
       SET estado = ?, fecha_recepcion = NOW(), id_usuario_recibe = ?,
           observaciones_recepcion = COALESCE(?, observaciones_recepcion)
       WHERE id_transferencia = ?`,
      [nuevoEstado, userId, observaciones ?? null, id]
    );

    await auditLog(userId, 'transferencias', id, 'UPDATE', getIp(req));
    await conn.commit();
    res.json({ ok: true, estado: nuevoEstado });
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (err.message === 'SERIE_NO_DISPONIBLE') {
      return res.status(409).json({ mensaje: 'Una de las series elegidas ya no está disponible, volvé a elegir' });
    }
    if (err instanceof ApiError) return res.status(err.status).json({ mensaje: err.mensaje });
    console.error(err);
    res.status(500).json({ mensaje: 'Error al recibir transferencia' });
  } finally {
    conn.release();
  }
};

const anularTransferencia = async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    const userId = req.user.id_usuario;
    const { id } = req.params;
    const motivo = (req.body?.motivo ?? '').trim();
    if (!motivo) throw new ApiError(400, 'Debe indicar el motivo de la anulación');

    const [[t]] = await conn.query(
      `SELECT * FROM transferencias WHERE id_transferencia = ?`, [id]
    );
    if (!t) throw new ApiError(404, 'Transferencia no encontrada');
    if (!['SOLICITADA', 'EN_TRANSITO', 'PARCIAL'].includes(t.estado)) {
      throw new ApiError(400, `No se puede anular una transferencia ${t.estado}`);
    }

    await conn.beginTransaction();

    if (['EN_TRANSITO', 'PARCIAL'].includes(t.estado)) {
      const tmEntrada = await tipoMov('TRANSFERENCIA_ENT');
      const [detalle] = await conn.query(
        `SELECT * FROM transferencia_detalle WHERE id_transferencia = ?`, [id]
      );

      const idsDetalle = detalle.map(d => d.id_detalle);
      if (idsDetalle.length) {
        const [seriesRows] = await conn.query(
          `SELECT id_serie FROM compra_detalle_series WHERE id_transferencia_detalle IN (?) AND estado = 'EN_TRANSITO'`,
          [idsDetalle]
        );
        if (seriesRows.length) {
          await productoSeries.revertirATransito(dbTx(conn), seriesRows.map(r => r.id_serie), {
            id_deposito_origen: t.id_deposito_origen,
          });
        }
      }

      // Se devuelve al origen lo que salió y todavía está en tránsito
      // (despachado - recibido), no todo lo despachado: lo ya recibido en
      // destino (transferencia PARCIAL) no debe volver también al origen,
      // o se duplicaría ese stock en ambos depósitos.
      for (const item of detalle) {
        const devolver = Number(item.cantidad_despachada) - Number(item.cantidad_recibida);
        if (!(devolver > 0)) continue;
        await conn.query(
          `UPDATE stock SET cantidad = cantidad + ?, fecha_ult_movimiento = NOW()
           WHERE id_producto = ? AND id_deposito = ?`,
          [devolver, item.id_producto, t.id_deposito_origen]
        );

        if (tmEntrada) {
          const [[stPost]] = await conn.query(
            `SELECT COALESCE(cantidad, 0) AS qty, COALESCE(costo_promedio, 0) AS costo
             FROM stock WHERE id_producto = ? AND id_deposito = ?`,
            [item.id_producto, t.id_deposito_origen]
          );
          await conn.query(
            `INSERT INTO kardex (id_producto, id_deposito, id_tipo_movimiento, cantidad,
               costo_unitario, saldo_cantidad, saldo_costo,
               documento_tipo, documento_id, documento_numero, id_usuario, observaciones)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              item.id_producto, t.id_deposito_origen, tmEntrada.id_tipo_movimiento,
              devolver,
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

    await conn.query(
      `UPDATE transferencias SET estado = 'ANULADA', motivo_anulacion = ? WHERE id_transferencia = ?`,
      [motivo, id]
    );

    await auditLog(userId, 'transferencias', id, 'UPDATE', getIp(req));
    await conn.commit();
    res.json({ ok: true, mensaje: 'Transferencia anulada' });
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (err.message === 'SERIE_NO_DISPONIBLE') {
      return res.status(409).json({ mensaje: 'Una de las series elegidas ya no está disponible, volvé a elegir' });
    }
    if (err instanceof ApiError) return res.status(err.status).json({ mensaje: err.mensaje });
    console.error(err);
    res.status(500).json({ mensaje: 'Error al anular transferencia' });
  } finally {
    conn.release();
  }
};

// ── AJUSTES DE INVENTARIO ─────────────────────────────────────────────────────

const getAjustes = async (req, res) => {
  try {
    const { estado, id_deposito, fecha_desde, fecha_hasta, page = 1, limit = 20 } = req.query;
    const limitNum = Math.min(Number(limit) || 20, 200);
    const offset = (Number(page) - 1) * limitNum;
    const where = [], params = [];

    if (estado)      { where.push('a.estado = ?');         params.push(estado); }
    if (id_deposito) { where.push('a.id_deposito = ?');    params.push(id_deposito); }
    if (fecha_desde) { where.push('DATE(a.fecha) >= ?');   params.push(fecha_desde); }
    if (fecha_hasta) { where.push('DATE(a.fecha) <= ?');   params.push(fecha_hasta); }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM ajustes_inventario a
       JOIN depositos d ON d.id_deposito = a.id_deposito
       JOIN usuarios  u ON u.id_usuario  = a.id_usuario
       ${whereSql}`,
      params
    );

    const [rows] = await db.promise().query(
      `SELECT a.id_ajuste, a.numero, a.estado, a.fecha, a.motivo,
              d.nombre AS deposito_nombre, d.codigo AS deposito_codigo,
              u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos,
              (SELECT COUNT(*) FROM ajuste_inventario_detalle ad WHERE ad.id_ajuste = a.id_ajuste) AS num_items
       FROM ajustes_inventario a
       JOIN depositos d ON d.id_deposito = a.id_deposito
       JOIN usuarios  u ON u.id_usuario  = a.id_usuario
       ${whereSql}
       ORDER BY a.fecha DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({ ajustes: rows, total: Number(total), page: Number(page), limit: limitNum });
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
              p.producto AS producto_nombre, p.codigo_interno, p.codigo_barras,
              p.detalle AS producto_detalle, p.modelo, p.color, p.capacidad,
              m.nombre AS marca_nombre,
              um.nombre AS unidad_nombre, um.codigo AS unidad_codigo
       FROM ajuste_inventario_detalle ad
       JOIN productos p        ON p.id_producto = ad.id_producto
       JOIN marcas m           ON m.id_marca    = p.id_marca
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
    const motivo = (req.body?.motivo ?? '').trim();
    if (!motivo) return res.status(400).json({ mensaje: 'Debe indicar el motivo de la anulación' });

    const [[a]] = await db.promise().query(
      `SELECT * FROM ajustes_inventario WHERE id_ajuste = ?`, [id]
    );
    if (!a) return res.status(404).json({ mensaje: 'Ajuste no encontrado' });
    if (a.estado !== 'BORRADOR') {
      return res.status(400).json({ mensaje: 'Solo se puede anular un ajuste en estado BORRADOR' });
    }

    await db.promise().query(
      `UPDATE ajustes_inventario SET estado = 'ANULADO', motivo_anulacion = ? WHERE id_ajuste = ?`,
      [motivo, id]
    );

    await auditLog(userId, 'ajustes_inventario', id, 'UPDATE', getIp(req));
    res.json({ ok: true, mensaje: 'Ajuste anulado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al anular ajuste' });
  }
};

module.exports = {
  getTransferencias, getTransferencia, createTransferencia, updateTransferencia, emitirTransferencia,
  enviarTransferencia, recibirTransferencia, anularTransferencia,
  getAjustes, getAjuste, createAjuste, updateAjuste, aprobarAjuste, anularAjuste,
};
