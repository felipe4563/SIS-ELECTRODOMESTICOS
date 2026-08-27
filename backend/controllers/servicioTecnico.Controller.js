const db    = require('../config/db');
const getIp = req => req.ip || req.socket?.remoteAddress || null;

const auditLog = (userId, tabla, id, accion, ip) =>
  db.promise().query(
    `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?,?,?,?,?)`,
    [userId, tabla, String(id), accion, ip]
  ).catch(e => console.error('[auditLog]', accion, tabla, e.message));

// ── Helpers ───────────────────────────────────────────────────────────────────

async function generarNumero() {
  const hoy = new Date();
  const ym  = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const [[{ cnt }]] = await db.promise().query(
    `SELECT COUNT(*) AS cnt FROM servicios_tecnicos WHERE numero LIKE ?`, [`ST-${ym}-%`]
  );
  let seq = Number(cnt) + 1;
  for (let i = 0; i < 20; i++, seq++) {
    const candidato = `ST-${ym}-${String(seq).padStart(4, '0')}`;
    const [[{ n }]] = await db.promise().query(
      `SELECT COUNT(*) AS n FROM servicios_tecnicos WHERE numero = ?`, [candidato]
    );
    if (n === 0) return candidato;
  }
  throw new Error('No se pudo generar número único para servicios_tecnicos');
}

async function tipoMov(codigo) {
  const [[tm]] = await db.promise().query(
    `SELECT id_tipo_movimiento FROM tipos_movimiento WHERE codigo = ?`, [codigo]
  );
  return tm ?? null;
}

// Inserta seguimiento y actualiza estado en una sola operación lógica
async function cambiarEstado(idServicio, estadoNuevo, estadoAnterior, observacion, idUsuario) {
  await db.promise().query(
    `UPDATE servicios_tecnicos SET estado = ? WHERE id_servicio = ?`,
    [estadoNuevo, idServicio]
  );
  await db.promise().query(
    `INSERT INTO servicio_tecnico_seguimiento
       (id_servicio, estado_anterior, estado_nuevo, observacion, id_usuario)
     VALUES (?, ?, ?, ?, ?)`,
    [idServicio, estadoAnterior, estadoNuevo, observacion ?? null, idUsuario]
  );
}

// ── Form data ─────────────────────────────────────────────────────────────────

const getFormData = async (req, res) => {
  const safe = async (fn) => { try { return await fn(); } catch { return []; } };
  const { id_sucursal } = req.query;

  try {
    const [clientes, tecnicos, sucursales, depositos, productos] = await Promise.all([
      safe(() => db.promise().query(
        `SELECT id_cliente,
                COALESCE(razon_social, CONCAT(nombres, COALESCE(CONCAT(' ', apellidos), ''))) AS nombre_completo,
                documento AS ci_ruc, tipo_documento, telefono
         FROM clientes WHERE activo = 1 ORDER BY nombres`
      ).then(([r]) => r)),
      safe(() => db.promise().query(
        `SELECT id_tecnico, nombre, especialidad, telefono
         FROM tecnicos_externos WHERE activo = 1 ORDER BY nombre`
      ).then(([r]) => r)),
      safe(() => db.promise().query(
        `SELECT id_sucursal, nombre FROM sucursales WHERE activo = 1 ORDER BY nombre`
      ).then(([r]) => r)),
      safe(() => {
        if (id_sucursal) {
          return db.promise().query(
            `SELECT id_deposito, codigo, nombre
             FROM depositos WHERE id_sucursal = ? AND activo = 1 ORDER BY nombre`,
            [id_sucursal]
          ).then(([r]) => r);
        }
        return db.promise().query(
          `SELECT id_deposito, codigo, nombre FROM depositos WHERE activo = 1 ORDER BY nombre`
        ).then(([r]) => r);
      }),
      safe(() => {
        if (id_sucursal) {
          return db.promise().query(
            `SELECT p.id_producto, p.producto AS nombre, p.detalle,
                    m.nombre AS marca, p.modelo, p.color, p.capacidad, p.imagen_url,
                    CAST(SUM(s.cantidad_disponible) AS DECIMAL(14,2)) AS stock
             FROM productos p
             LEFT JOIN marcas m ON p.id_marca = m.id_marca
             INNER JOIN stock s ON p.id_producto = s.id_producto
             INNER JOIN depositos d ON s.id_deposito = d.id_deposito
                        AND d.id_sucursal = ? AND d.activo = 1
             WHERE p.activo = 1
             GROUP BY p.id_producto, p.producto, p.detalle, m.nombre, p.modelo, p.color, p.capacidad, p.imagen_url
             HAVING SUM(s.cantidad_disponible) > 0
             ORDER BY p.producto`,
            [id_sucursal]
          ).then(([r]) => r);
        }
        return db.promise().query(
          `SELECT p.id_producto, p.producto AS nombre, p.detalle,
                  m.nombre AS marca, p.modelo, p.color, p.capacidad, p.imagen_url
           FROM productos p
           LEFT JOIN marcas m ON p.id_marca = m.id_marca
           WHERE p.activo = 1
           ORDER BY p.producto`
        ).then(([r]) => r);
      }),
    ]);

    res.json({ clientes, tecnicos, sucursales, depositos, productos });
  } catch (err) {
    console.error('[getFormData]', err);
    res.status(500).json({ error: 'Error al obtener datos del formulario' });
  }
};

// ── Listar órdenes ────────────────────────────────────────────────────────────

const getServicios = async (req, res) => {
  try {
    const { estado, id_sucursal, fecha_desde, fecha_hasta, search, page = 1, limit = 50 } = req.query;
    const puedeVerTodas = req.ability.can('ver_todas', 'servicio_tecnico');
    const offset = (Number(page) - 1) * Number(limit);

    let where  = [];
    let params = [];

    // Filtro de sucursal según permiso
    if (!puedeVerTodas) {
      where.push('st.id_sucursal = ?');
      params.push(req.user.id_sucursal);
    } else if (id_sucursal) {
      where.push('st.id_sucursal = ?');
      params.push(id_sucursal);
    }

    if (estado)      { where.push('st.estado = ?');                params.push(estado); }
    if (fecha_desde) { where.push('st.fecha_recepcion >= ?');      params.push(fecha_desde); }
    if (fecha_hasta) { where.push('DATE(st.fecha_recepcion) <= ?');params.push(fecha_hasta); }
    if (search) {
      where.push(`(st.numero LIKE ? OR st.descripcion_producto LIKE ? OR
                   CONCAT(c.nombres,' ',c.apellidos) LIKE ? OR c.documento LIKE ? OR st.numero_serie LIKE ?)`);
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countParams = [...params];

    // Paginación
    params.push(Number(limit), offset);

    const puedeVerCostos = req.ability.can('ver_costos', 'servicio_tecnico');
    const costoSelect    = puedeVerCostos
      ? ', st.costo_estimado, st.costo_final'
      : '';

    const [rows] = await db.promise().query(
      `SELECT st.id_servicio, st.numero, st.tipo_origen, st.estado, st.prioridad,
              st.descripcion_producto, st.marca_producto, st.modelo_producto, st.numero_serie,
              st.fecha_recepcion, st.fecha_estimada_entrega, st.fecha_real_entrega,
              st.garantia, st.id_tecnico_externo,
              COALESCE(c.razon_social, CONCAT(c.nombres, COALESCE(CONCAT(' ', c.apellidos), ''))) AS cliente,
              c.documento AS cliente_ci_ruc,
              s.nombre AS sucursal,
              te.nombre AS tecnico_externo${costoSelect}
       FROM servicios_tecnicos st
       LEFT JOIN clientes c ON st.id_cliente = c.id_cliente
       LEFT JOIN sucursales s ON st.id_sucursal = s.id_sucursal
       LEFT JOIN tecnicos_externos te ON st.id_tecnico_externo = te.id_tecnico
       ${whereClause}
       ORDER BY st.fecha_recepcion DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const [[{ total }]] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM servicios_tecnicos st
       LEFT JOIN clientes c ON st.id_cliente = c.id_cliente
       ${whereClause}`,
      countParams
    );

    res.json({ servicios: rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('[getServicios]', err);
    res.status(500).json({ error: 'Error al obtener órdenes de servicio técnico' });
  }
};

// ── Obtener una orden ─────────────────────────────────────────────────────────

const getServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const puedeVerTodas = req.ability.can('ver_todas', 'servicio_tecnico');
    const puedeVerCostos = req.ability.can('ver_costos', 'servicio_tecnico');

    const costoSelect = puedeVerCostos
      ? ', st.costo_estimado, st.costo_final'
      : '';

    const [[st]] = await db.promise().query(
      `SELECT st.*${costoSelect},
              COALESCE(c.razon_social, CONCAT(c.nombres, COALESCE(CONCAT(' ', c.apellidos), ''))) AS cliente_nombre,
              c.documento AS cliente_ci_ruc, c.telefono AS cliente_telefono,
              s.nombre AS sucursal_nombre,
              te.nombre AS tecnico_nombre, te.telefono AS tecnico_telefono,
              CONCAT(ur.nombres, ' ', ur.apellidos) AS usuario_recibe_nombre,
              CONCAT(uc.nombres, ' ', uc.apellidos) AS usuario_cierre_nombre,
              p.producto AS producto_catalogo_nombre
       FROM servicios_tecnicos st
       LEFT JOIN clientes c ON st.id_cliente = c.id_cliente
       LEFT JOIN sucursales s ON st.id_sucursal = s.id_sucursal
       LEFT JOIN tecnicos_externos te ON st.id_tecnico_externo = te.id_tecnico
       LEFT JOIN usuarios ur ON st.id_usuario_recibe = ur.id_usuario
       LEFT JOIN usuarios uc ON st.id_usuario_cierre = uc.id_usuario
       LEFT JOIN productos p ON st.id_producto = p.id_producto
       WHERE st.id_servicio = ?`,
      [id]
    );

    if (!st) return res.status(404).json({ mensaje: 'Orden de servicio no encontrada' });

    // Verificar acceso a sucursal si no tiene ver_todas
    if (!puedeVerTodas && st.id_sucursal !== req.user.id_sucursal) {
      return res.status(403).json({ mensaje: 'No tiene acceso a esta orden' });
    }

    const [seguimiento] = await db.promise().query(
      `SELECT seg.*, CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre
       FROM servicio_tecnico_seguimiento seg
       JOIN usuarios u ON seg.id_usuario = u.id_usuario
       WHERE seg.id_servicio = ?
       ORDER BY seg.fecha ASC`,
      [id]
    );

    if (!puedeVerCostos) {
      delete st.costo_estimado;
      delete st.costo_final;
    }

    res.json({ ...st, seguimiento });
  } catch (err) {
    console.error('[getServicio]', err);
    res.status(500).json({ error: 'Error al obtener la orden de servicio' });
  }
};

// ── Crear orden ───────────────────────────────────────────────────────────────

const createServicio = async (req, res) => {
  try {
    const {
      tipo_origen = 'CLIENTE',
      id_cliente, id_venta_origen, id_producto,
      descripcion_producto, marca_producto, modelo_producto,
      numero_serie, color_producto,
      id_sucursal, fecha_recepcion,
      falla_reportada, accesorios_recibidos, condicion_fisica,
      garantia = 0, prioridad = 'NORMAL',
      id_tecnico_externo, fecha_envio_tecnico, fecha_estimada_entrega,
      costo_estimado = 0,
      observaciones,
      // solo para tipo_origen = INVENTARIO
      id_deposito,
    } = req.body;

    if (!descripcion_producto?.trim()) {
      return res.status(400).json({ mensaje: 'La descripción del equipo es requerida' });
    }
    if (!falla_reportada?.trim()) {
      return res.status(400).json({ mensaje: 'La falla reportada es requerida' });
    }

    const sucId = id_sucursal ?? req.user.id_sucursal;
    const numero = await generarNumero();

    const [result] = await db.promise().query(
      `INSERT INTO servicios_tecnicos
         (numero, tipo_origen, id_cliente, id_venta_origen, id_producto,
          descripcion_producto, marca_producto, modelo_producto, numero_serie, color_producto,
          id_sucursal, id_usuario_recibe, fecha_recepcion,
          falla_reportada, accesorios_recibidos, condicion_fisica,
          garantia, prioridad,
          id_tecnico_externo, fecha_envio_tecnico, fecha_estimada_entrega,
          costo_estimado, estado, observaciones)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'RECIBIDO',?)`,
      [
        numero, tipo_origen,
        id_cliente || null,
        tipo_origen === 'INVENTARIO' ? (id_venta_origen || null) : null,
        id_producto || null,
        descripcion_producto.trim(), marca_producto ?? null, modelo_producto ?? null,
        numero_serie ?? null, color_producto ?? null,
        sucId, req.user.id_usuario,
        fecha_recepcion ?? new Date(),
        falla_reportada.trim(), accesorios_recibidos ?? null, condicion_fisica ?? null,
        garantia ? 1 : 0, prioridad,
        id_tecnico_externo ?? null, fecha_envio_tecnico ?? null, fecha_estimada_entrega ?? null,
        costo_estimado,
        observaciones ?? null,
      ]
    );

    const id_servicio = result.insertId;

    // Seguimiento inicial
    await db.promise().query(
      `INSERT INTO servicio_tecnico_seguimiento
         (id_servicio, estado_anterior, estado_nuevo, observacion, id_usuario)
       VALUES (?, NULL, 'RECIBIDO', 'Orden creada', ?)`,
      [id_servicio, req.user.id_usuario]
    );

    // Kardex de salida si el equipo es del inventario
    if (tipo_origen === 'INVENTARIO' && id_producto && id_deposito) {
      const tm = await tipoMov('SERV_TECNICO_SAL');
      if (tm) {
        await db.promise().query(
          `UPDATE stock SET cantidad = cantidad - 1, fecha_ult_movimiento = NOW()
           WHERE id_producto = ? AND id_deposito = ?`,
          [id_producto, id_deposito]
        );
        const [[stockRow]] = await db.promise().query(
          `SELECT COALESCE(cantidad, 0) AS cantidad, COALESCE(costo_promedio, 0) AS costo
           FROM stock WHERE id_producto = ? AND id_deposito = ?`,
          [id_producto, id_deposito]
        );
        await db.promise().query(
          `INSERT INTO kardex
             (id_producto, id_deposito, id_tipo_movimiento, cantidad, costo_unitario,
              saldo_cantidad, saldo_costo, documento_tipo, documento_id, documento_numero, id_usuario)
           VALUES (?,?,?,1,?,?,?,'SERVICIO_TECNICO',?,?,?)`,
          [
            id_producto, id_deposito, tm.id_tipo_movimiento,
            stockRow.costo, stockRow.cantidad, stockRow.costo,
            id_servicio, numero, req.user.id_usuario,
          ]
        );
      }
    }

    await auditLog(req.user.id_usuario, 'servicios_tecnicos', id_servicio, 'INSERT', getIp(req));

    res.status(201).json({ id_servicio, numero, mensaje: 'Orden de servicio creada correctamente' });
  } catch (err) {
    console.error('[createServicio]', err);
    res.status(500).json({ error: 'Error al crear la orden de servicio' });
  }
};

// ── Editar orden ──────────────────────────────────────────────────────────────

const updateServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const [[st]] = await db.promise().query(
      `SELECT id_servicio, estado, id_sucursal FROM servicios_tecnicos WHERE id_servicio = ?`, [id]
    );
    if (!st) return res.status(404).json({ mensaje: 'Orden no encontrada' });
    if (['ENTREGADO', 'ANULADO'].includes(st.estado)) {
      return res.status(400).json({ mensaje: 'No se puede editar una orden cerrada o anulada' });
    }

    const puedeVerTodas = req.ability.can('ver_todas', 'servicio_tecnico');
    if (!puedeVerTodas && st.id_sucursal !== req.user.id_sucursal) {
      return res.status(403).json({ mensaje: 'No tiene acceso a esta orden' });
    }

    const {
      id_cliente, id_venta_origen, id_producto,
      descripcion_producto, marca_producto, modelo_producto,
      numero_serie, color_producto,
      falla_reportada, accesorios_recibidos, condicion_fisica,
      garantia, prioridad,
      id_tecnico_externo, fecha_envio_tecnico, fecha_estimada_entrega,
      costo_estimado, costo_final,
      diagnostico, trabajo_realizado, repuestos_usados,
      observaciones,
    } = req.body;

    await db.promise().query(
      `UPDATE servicios_tecnicos SET
         id_cliente = ?, id_venta_origen = ?, id_producto = ?,
         descripcion_producto = ?, marca_producto = ?, modelo_producto = ?,
         numero_serie = ?, color_producto = ?,
         falla_reportada = ?, accesorios_recibidos = ?, condicion_fisica = ?,
         garantia = ?, prioridad = ?,
         id_tecnico_externo = ?, fecha_envio_tecnico = ?, fecha_estimada_entrega = ?,
         costo_estimado = ?, costo_final = ?,
         diagnostico = ?, trabajo_realizado = ?, repuestos_usados = ?,
         observaciones = ?
       WHERE id_servicio = ?`,
      [
        id_cliente || null, id_venta_origen || null, id_producto || null,
        descripcion_producto, marca_producto ?? null, modelo_producto ?? null,
        numero_serie ?? null, color_producto ?? null,
        falla_reportada, accesorios_recibidos ?? null, condicion_fisica ?? null,
        garantia ? 1 : 0, prioridad,
        id_tecnico_externo ?? null, fecha_envio_tecnico ?? null, fecha_estimada_entrega ?? null,
        costo_estimado ?? 0, costo_final ?? 0,
        diagnostico ?? null, trabajo_realizado ?? null, repuestos_usados ?? null,
        observaciones ?? null,
        id,
      ]
    );

    await auditLog(req.user.id_usuario, 'servicios_tecnicos', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Orden actualizada correctamente' });
  } catch (err) {
    console.error('[updateServicio]', err);
    res.status(500).json({ error: 'Error al actualizar la orden' });
  }
};

// ── Cambiar estado ────────────────────────────────────────────────────────────

const TRANSICIONES_VALIDAS = {
  RECIBIDO:            ['EN_DIAGNOSTICO', 'ANULADO'],
  EN_DIAGNOSTICO:      ['ESPERANDO_REPUESTO', 'EN_REPARACION', 'SIN_REPARACION', 'ANULADO'],
  ESPERANDO_REPUESTO:  ['EN_REPARACION', 'SIN_REPARACION', 'ANULADO'],
  EN_REPARACION:       ['REPARADO', 'SIN_REPARACION', 'ANULADO'],
  REPARADO:            ['LISTO_ENTREGA', 'ANULADO'],
  LISTO_ENTREGA:       ['ENTREGADO', 'ANULADO'],
  ENTREGADO:           [],
  SIN_REPARACION:      ['ANULADO'],
  ANULADO:             [],
};

const cambiarEstadoHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_nuevo, observacion } = req.body;

    if (!estado_nuevo) return res.status(400).json({ mensaje: 'El nuevo estado es requerido' });

    const [[st]] = await db.promise().query(
      `SELECT id_servicio, estado, numero, id_sucursal, tipo_origen, id_producto
       FROM servicios_tecnicos WHERE id_servicio = ?`, [id]
    );
    if (!st) return res.status(404).json({ mensaje: 'Orden no encontrada' });

    const puedeVerTodas = req.ability.can('ver_todas', 'servicio_tecnico');
    if (!puedeVerTodas && st.id_sucursal !== req.user.id_sucursal) {
      return res.status(403).json({ mensaje: 'No tiene acceso a esta orden' });
    }

    const permitidos = TRANSICIONES_VALIDAS[st.estado] ?? [];
    if (!permitidos.includes(estado_nuevo)) {
      return res.status(400).json({
        mensaje: `No se puede pasar de ${st.estado} a ${estado_nuevo}`,
      });
    }

    await cambiarEstado(id, estado_nuevo, st.estado, observacion, req.user.id_usuario);

    // Retornar al stock si el equipo era de inventario y la orden queda sin reparación
    if (estado_nuevo === 'SIN_REPARACION' && st.tipo_origen === 'INVENTARIO' && st.id_producto) {
      const [[deposito]] = await db.promise().query(
        `SELECT k.id_deposito FROM kardex k
         WHERE k.documento_tipo = 'SERVICIO_TECNICO' AND k.documento_id = ?
           AND k.id_tipo_movimiento = (SELECT id_tipo_movimiento FROM tipos_movimiento WHERE codigo = 'SERV_TECNICO_SAL')
         ORDER BY k.id_kardex ASC LIMIT 1`,
        [id]
      ).catch(() => [[null]]);

      if (deposito?.id_deposito) {
        const tm = await tipoMov('SERV_TECNICO_ENT');
        if (tm) {
          await db.promise().query(
            `UPDATE stock SET cantidad = cantidad + 1, fecha_ult_movimiento = NOW()
             WHERE id_producto = ? AND id_deposito = ?`,
            [st.id_producto, deposito.id_deposito]
          );
          const [[stockRow]] = await db.promise().query(
            `SELECT COALESCE(cantidad, 0) AS cantidad, COALESCE(costo_promedio, 0) AS costo
             FROM stock WHERE id_producto = ? AND id_deposito = ?`,
            [st.id_producto, deposito.id_deposito]
          );
          await db.promise().query(
            `INSERT INTO kardex
               (id_producto, id_deposito, id_tipo_movimiento, cantidad, costo_unitario,
                saldo_cantidad, saldo_costo, documento_tipo, documento_id, documento_numero, id_usuario, observaciones)
             VALUES (?,?,?,1,?,?,?,'SERVICIO_TECNICO',?,?,?,?)`,
            [
              st.id_producto, deposito.id_deposito, tm.id_tipo_movimiento,
              stockRow.costo, stockRow.cantidad, stockRow.costo,
              id, st.numero, req.user.id_usuario,
              'Retorno sin reparación',
            ]
          );
        }
      }
    }

    await auditLog(req.user.id_usuario, 'servicios_tecnicos', id, `ESTADO:${estado_nuevo}`, getIp(req));

    res.json({ mensaje: `Estado actualizado a ${estado_nuevo}` });
  } catch (err) {
    console.error('[cambiarEstadoHandler]', err);
    res.status(500).json({ error: 'Error al cambiar el estado' });
  }
};

// ── Registrar entrega ─────────────────────────────────────────────────────────

const entregarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { observacion, costo_final } = req.body;

    const [[st]] = await db.promise().query(
      `SELECT id_servicio, estado, numero, tipo_origen, id_producto, id_sucursal
       FROM servicios_tecnicos WHERE id_servicio = ?`,
      [id]
    );
    if (!st) return res.status(404).json({ mensaje: 'Orden no encontrada' });
    if (st.estado !== 'LISTO_ENTREGA') {
      return res.status(400).json({ mensaje: 'La orden debe estar en LISTO_ENTREGA para registrar la entrega' });
    }

    const puedeVerTodas = req.ability.can('ver_todas', 'servicio_tecnico');
    if (!puedeVerTodas && st.id_sucursal !== req.user.id_sucursal) {
      return res.status(403).json({ mensaje: 'No tiene acceso a esta orden' });
    }

    await db.promise().query(
      `UPDATE servicios_tecnicos SET
         estado = 'ENTREGADO',
         fecha_real_entrega = NOW(),
         id_usuario_cierre = ?,
         costo_final = COALESCE(?, costo_final)
       WHERE id_servicio = ?`,
      [req.user.id_usuario, costo_final ?? null, id]
    );

    await db.promise().query(
      `INSERT INTO servicio_tecnico_seguimiento
         (id_servicio, estado_anterior, estado_nuevo, observacion, id_usuario)
       VALUES (?, 'LISTO_ENTREGA', 'ENTREGADO', ?, ?)`,
      [id, observacion ?? null, req.user.id_usuario]
    );

    // Kardex de retorno si era equipo de inventario
    if (st.tipo_origen === 'INVENTARIO' && st.id_producto) {
      const [[deposito]] = await db.promise().query(
        `SELECT k.id_deposito FROM kardex k
         WHERE k.documento_tipo = 'SERVICIO_TECNICO' AND k.documento_id = ?
         ORDER BY k.id_kardex ASC LIMIT 1`,
        [id]
      ).catch(() => [[null]]);

      if (deposito?.id_deposito) {
        const tm = await tipoMov('SERV_TECNICO_ENT');
        if (tm) {
          await db.promise().query(
            `UPDATE stock SET cantidad = cantidad + 1, fecha_ult_movimiento = NOW()
             WHERE id_producto = ? AND id_deposito = ?`,
            [st.id_producto, deposito.id_deposito]
          );
          const [[stockRow]] = await db.promise().query(
            `SELECT COALESCE(cantidad, 0) AS cantidad, COALESCE(costo_promedio, 0) AS costo
             FROM stock WHERE id_producto = ? AND id_deposito = ?`,
            [st.id_producto, deposito.id_deposito]
          );
          await db.promise().query(
            `INSERT INTO kardex
               (id_producto, id_deposito, id_tipo_movimiento, cantidad, costo_unitario,
                saldo_cantidad, saldo_costo, documento_tipo, documento_id, documento_numero, id_usuario)
             VALUES (?,?,?,1,?,?,?,'SERVICIO_TECNICO',?,?,?)`,
            [
              st.id_producto, deposito.id_deposito, tm.id_tipo_movimiento,
              stockRow.costo, stockRow.cantidad, stockRow.costo,
              id, st.numero, req.user.id_usuario,
            ]
          );
        }
      }
    }

    await auditLog(req.user.id_usuario, 'servicios_tecnicos', id, 'ENTREGADO', getIp(req));
    res.json({ mensaje: 'Entrega registrada correctamente' });
  } catch (err) {
    console.error('[entregarServicio]', err);
    res.status(500).json({ error: 'Error al registrar la entrega' });
  }
};

// ── Anular orden ──────────────────────────────────────────────────────────────

const anularServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const [[st]] = await db.promise().query(
      `SELECT id_servicio, estado, tipo_origen, id_producto, id_sucursal, numero
       FROM servicios_tecnicos WHERE id_servicio = ?`,
      [id]
    );
    if (!st) return res.status(404).json({ mensaje: 'Orden no encontrada' });
    if (['ENTREGADO', 'ANULADO'].includes(st.estado)) {
      return res.status(400).json({ mensaje: 'No se puede anular una orden ya cerrada' });
    }

    const estadoAnterior = st.estado;
    await db.promise().query(
      `UPDATE servicios_tecnicos SET estado = 'ANULADO' WHERE id_servicio = ?`, [id]
    );
    await db.promise().query(
      `INSERT INTO servicio_tecnico_seguimiento
         (id_servicio, estado_anterior, estado_nuevo, observacion, id_usuario)
       VALUES (?, ?, 'ANULADO', ?, ?)`,
      [id, estadoAnterior, motivo ?? 'Anulado por el usuario', req.user.id_usuario]
    );

    // Revertir stock si el equipo era de inventario y ya había salido
    if (st.tipo_origen === 'INVENTARIO' && st.id_producto) {
      const [[deposito]] = await db.promise().query(
        `SELECT k.id_deposito FROM kardex k
         WHERE k.documento_tipo = 'SERVICIO_TECNICO' AND k.documento_id = ?
           AND k.id_tipo_movimiento = (SELECT id_tipo_movimiento FROM tipos_movimiento WHERE codigo = 'SERV_TECNICO_SAL')
         ORDER BY k.id_kardex ASC LIMIT 1`,
        [id]
      ).catch(() => [[null]]);

      if (deposito?.id_deposito) {
        const tm = await tipoMov('SERV_TECNICO_ENT');
        if (tm) {
          await db.promise().query(
            `UPDATE stock SET cantidad = cantidad + 1, fecha_ult_movimiento = NOW()
             WHERE id_producto = ? AND id_deposito = ?`,
            [st.id_producto, deposito.id_deposito]
          );
          const [[stockRow]] = await db.promise().query(
            `SELECT COALESCE(cantidad, 0) AS cantidad, COALESCE(costo_promedio, 0) AS costo
             FROM stock WHERE id_producto = ? AND id_deposito = ?`,
            [st.id_producto, deposito.id_deposito]
          );
          await db.promise().query(
            `INSERT INTO kardex
               (id_producto, id_deposito, id_tipo_movimiento, cantidad, costo_unitario,
                saldo_cantidad, saldo_costo, documento_tipo, documento_id, documento_numero, id_usuario)
             VALUES (?,?,?,1,?,?,?,'SERVICIO_TECNICO',?,?,?)`,
            [
              st.id_producto, deposito.id_deposito, tm.id_tipo_movimiento,
              stockRow.costo, stockRow.cantidad, stockRow.costo,
              id, st.numero, req.user.id_usuario,
            ]
          );
        }
      }
    }

    await auditLog(req.user.id_usuario, 'servicios_tecnicos', id, 'ANULADO', getIp(req));
    res.json({ mensaje: 'Orden anulada correctamente' });
  } catch (err) {
    console.error('[anularServicio]', err);
    res.status(500).json({ error: 'Error al anular la orden' });
  }
};

// ── Recibo / ticket (JSON para imprimir en frontend) ──────────────────────────

const getRecibo = async (req, res) => {
  try {
    const { id } = req.params;

    const [[st]] = await db.promise().query(
      `SELECT st.*,
              COALESCE(c.razon_social, CONCAT(c.nombres, COALESCE(CONCAT(' ', c.apellidos), ''))) AS cliente_nombre,
              c.documento, c.telefono AS cliente_telefono, cd.direccion AS cliente_direccion,
              s.nombre AS sucursal_nombre, s.telefono AS sucursal_telefono, s.direccion AS sucursal_direccion,
              te.nombre AS tecnico_nombre,
              CONCAT(ur.nombres, ' ', ur.apellidos) AS usuario_recibe,
              COALESCE(e.nombre_comercial, e.razon_social) AS empresa_nombre,
              e.nit AS empresa_ruc,
              e.telefono AS empresa_telefono, e.direccion AS empresa_direccion,
              e.logo_url AS empresa_logo
       FROM servicios_tecnicos st
       LEFT JOIN clientes c ON st.id_cliente = c.id_cliente
       LEFT JOIN cliente_direcciones cd ON cd.id_cliente = c.id_cliente AND cd.es_principal = 1
       LEFT JOIN sucursales s ON st.id_sucursal = s.id_sucursal
       LEFT JOIN tecnicos_externos te ON st.id_tecnico_externo = te.id_tecnico
       LEFT JOIN usuarios ur ON st.id_usuario_recibe = ur.id_usuario
       CROSS JOIN empresas e
       WHERE st.id_servicio = ?`,
      [id]
    );

    if (!st) return res.status(404).json({ mensaje: 'Orden no encontrada' });

    const [seguimiento] = await db.promise().query(
      `SELECT seg.estado_anterior, seg.estado_nuevo, seg.observacion, seg.fecha,
              CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre
       FROM servicio_tecnico_seguimiento seg
       LEFT JOIN usuarios u ON seg.id_usuario = u.id_usuario
       WHERE seg.id_servicio = ?
       ORDER BY seg.fecha ASC`,
      [id]
    );

    const puedeVerCostos = req.ability.can('ver_costos', 'servicio_tecnico');
    if (!puedeVerCostos) {
      delete st.costo_estimado;
      delete st.costo_final;
    }

    res.json({ recibo: st, seguimiento });
  } catch (err) {
    console.error('[getRecibo]', err);
    res.status(500).json({ error: 'Error al obtener el recibo' });
  }
};

// ── Reporte resumen por estado ────────────────────────────────────────────────

const getReporte = async (req, res) => {
  try {
    const { id_sucursal, fecha_desde, fecha_hasta, id_tecnico_externo, agrupacion = 'estado' } = req.query;
    const puedeVerTodas = req.ability.can('ver_todas', 'servicio_tecnico');

    let where  = [];
    let params = [];

    if (!puedeVerTodas) {
      where.push('st.id_sucursal = ?');
      params.push(req.user.id_sucursal);
    } else if (id_sucursal) {
      where.push('st.id_sucursal = ?');
      params.push(id_sucursal);
    }

    if (fecha_desde)        { where.push('DATE(st.fecha_recepcion) >= ?'); params.push(fecha_desde); }
    if (fecha_hasta)        { where.push('DATE(st.fecha_recepcion) <= ?'); params.push(fecha_hasta); }
    if (id_tecnico_externo) { where.push('st.id_tecnico_externo = ?');     params.push(id_tecnico_externo); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Resumen por estado
    const [porEstado] = await db.promise().query(
      `SELECT estado, COUNT(*) AS total
       FROM servicios_tecnicos st
       ${whereClause}
       GROUP BY estado
       ORDER BY FIELD(estado,
         'RECIBIDO','EN_DIAGNOSTICO','ESPERANDO_REPUESTO','EN_REPARACION',
         'REPARADO','LISTO_ENTREGA','ENTREGADO','SIN_REPARACION','ANULADO')`,
      params
    );

    // Tiempo promedio por etapa (días entre recepción y entrega)
    const [tiempos] = await db.promise().query(
      `SELECT
         AVG(DATEDIFF(fecha_real_entrega, fecha_recepcion)) AS dias_promedio_entrega,
         MIN(DATEDIFF(fecha_real_entrega, fecha_recepcion)) AS dias_min,
         MAX(DATEDIFF(fecha_real_entrega, fecha_recepcion)) AS dias_max,
         COUNT(*) AS total_entregados
       FROM servicios_tecnicos st
       ${whereClause ? whereClause + ' AND' : 'WHERE'} estado = 'ENTREGADO'
         AND fecha_real_entrega IS NOT NULL`,
      params
    );

    // Por técnico externo
    const [porTecnico] = await db.promise().query(
      `SELECT te.nombre AS tecnico, COUNT(*) AS total,
              SUM(CASE WHEN st.estado = 'ENTREGADO' THEN 1 ELSE 0 END) AS entregados,
              SUM(CASE WHEN st.estado NOT IN ('ENTREGADO','ANULADO') THEN 1 ELSE 0 END) AS en_proceso
       FROM servicios_tecnicos st
       JOIN tecnicos_externos te ON st.id_tecnico_externo = te.id_tecnico
       ${whereClause}
       GROUP BY st.id_tecnico_externo, te.nombre
       ORDER BY total DESC`,
      params
    );

    // Por prioridad
    const [porPrioridad] = await db.promise().query(
      `SELECT prioridad, COUNT(*) AS total,
              SUM(CASE WHEN estado NOT IN ('ENTREGADO','ANULADO','SIN_REPARACION') THEN 1 ELSE 0 END) AS pendientes
       FROM servicios_tecnicos st
       ${whereClause}
       GROUP BY prioridad
       ORDER BY FIELD(prioridad,'URGENTE','ALTA','NORMAL','BAJA')`,
      params
    );

    res.json({
      por_estado: porEstado,
      tiempos_entrega: tiempos[0],
      por_tecnico: porTecnico,
      por_prioridad: porPrioridad,
    });
  } catch (err) {
    console.error('[getReporte]', err);
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
};

// ── Reporte detallado (listado por orden) ─────────────────────────────────────

const getReporteDetalle = async (req, res) => {
  try {
    const { id_sucursal, fecha_desde, fecha_hasta, estado, prioridad, id_tecnico_externo } = req.query;
    const puedeVerTodas = req.ability.can('ver_todas', 'servicio_tecnico');

    const where  = [];
    const params = [];

    if (!puedeVerTodas) {
      where.push('st.id_sucursal = ?');
      params.push(req.user.id_sucursal);
    } else if (id_sucursal) {
      where.push('st.id_sucursal = ?');
      params.push(id_sucursal);
    }

    if (fecha_desde)        { where.push('DATE(st.fecha_recepcion) >= ?'); params.push(fecha_desde); }
    if (fecha_hasta)        { where.push('DATE(st.fecha_recepcion) <= ?'); params.push(fecha_hasta); }
    if (estado)             { where.push('st.estado = ?');               params.push(estado); }
    if (prioridad)          { where.push('st.prioridad = ?');            params.push(prioridad); }
    if (id_tecnico_externo) { where.push('st.id_tecnico_externo = ?');   params.push(id_tecnico_externo); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await db.promise().query(
      `SELECT
         st.id_servicio, st.numero, st.estado, st.prioridad, st.garantia,
         st.descripcion_producto, st.marca_producto, st.modelo_producto,
         st.numero_serie, st.color_producto, st.tipo_origen,
         st.falla_reportada,
         st.fecha_recepcion, st.fecha_estimada_entrega, st.fecha_real_entrega,
         st.costo_estimado, st.costo_final,
         st.diagnostico, st.trabajo_realizado, st.repuestos_usados,
         COALESCE(c.razon_social, CONCAT(c.nombres, COALESCE(CONCAT(' ', c.apellidos), ''))) AS cliente_nombre,
         c.documento AS cliente_documento,
         s.nombre AS sucursal_nombre,
         CONCAT(ur.nombres, ' ', ur.apellidos) AS usuario_recibe,
         te.nombre AS tecnico_nombre,
         DATEDIFF(COALESCE(st.fecha_real_entrega, NOW()), st.fecha_recepcion) AS dias_en_servicio
       FROM servicios_tecnicos st
       LEFT JOIN clientes c ON st.id_cliente = c.id_cliente
       LEFT JOIN sucursales s ON st.id_sucursal = s.id_sucursal
       LEFT JOIN usuarios ur ON st.id_usuario_recibe = ur.id_usuario
       LEFT JOIN tecnicos_externos te ON st.id_tecnico_externo = te.id_tecnico
       ${whereClause}
       ORDER BY
         FIELD(st.estado,
           'RECIBIDO','EN_DIAGNOSTICO','ESPERANDO_REPUESTO','EN_REPARACION',
           'REPARADO','LISTO_ENTREGA','ENTREGADO','SIN_REPARACION','ANULADO'),
         st.fecha_recepcion DESC`,
      params
    );

    // Empresa para el PDF
    const [[empresa]] = await db.promise().query(
      `SELECT COALESCE(nombre_comercial, razon_social) AS nombre,
              nit, telefono, direccion, logo_url
       FROM empresas WHERE activo = 1 LIMIT 1`
    ).catch(() => [[null]]);

    res.json({ ordenes: rows, empresa });
  } catch (err) {
    console.error('[getReporteDetalle]', err);
    res.status(500).json({ error: 'Error al generar el reporte detallado' });
  }
};

// ── Técnicos externos ─────────────────────────────────────────────────────────

const getTecnicos = async (req, res) => {
  try {
    const { solo_activos } = req.query;
    const where = solo_activos === 'false' ? '' : 'WHERE activo = 1';
    const [rows] = await db.promise().query(
      `SELECT * FROM tecnicos_externos ${where} ORDER BY nombre`
    );
    res.json({ tecnicos: rows });
  } catch (err) {
    console.error('[getTecnicos]', err);
    res.status(500).json({ error: 'Error al obtener técnicos' });
  }
};

const createTecnico = async (req, res) => {
  try {
    const { nombre, contacto, telefono, direccion, especialidad, notas } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ mensaje: 'El nombre es requerido' });

    const [result] = await db.promise().query(
      `INSERT INTO tecnicos_externos (nombre, contacto, telefono, direccion, especialidad, notas)
       VALUES (?,?,?,?,?,?)`,
      [nombre.trim(), contacto ?? null, telefono ?? null, direccion ?? null, especialidad ?? null, notas ?? null]
    );
    await auditLog(req.user.id_usuario, 'tecnicos_externos', result.insertId, 'INSERT', getIp(req));
    res.status(201).json({ id_tecnico: result.insertId, mensaje: 'Técnico registrado correctamente' });
  } catch (err) {
    console.error('[createTecnico]', err);
    res.status(500).json({ error: 'Error al registrar el técnico' });
  }
};

const updateTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, contacto, telefono, direccion, especialidad, notas } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ mensaje: 'El nombre es requerido' });

    const [r] = await db.promise().query(
      `UPDATE tecnicos_externos
       SET nombre=?, contacto=?, telefono=?, direccion=?, especialidad=?, notas=?
       WHERE id_tecnico=?`,
      [nombre.trim(), contacto ?? null, telefono ?? null, direccion ?? null, especialidad ?? null, notas ?? null, id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ mensaje: 'Técnico no encontrado' });
    await auditLog(req.user.id_usuario, 'tecnicos_externos', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Técnico actualizado correctamente' });
  } catch (err) {
    console.error('[updateTecnico]', err);
    res.status(500).json({ error: 'Error al actualizar el técnico' });
  }
};

const toggleTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const [r] = await db.promise().query(
      `UPDATE tecnicos_externos SET activo = NOT activo WHERE id_tecnico = ?`, [id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ mensaje: 'Técnico no encontrado' });
    await auditLog(req.user.id_usuario, 'tecnicos_externos', id, 'TOGGLE', getIp(req));
    res.json({ mensaje: 'Estado del técnico actualizado' });
  } catch (err) {
    console.error('[toggleTecnico]', err);
    res.status(500).json({ error: 'Error al actualizar el técnico' });
  }
};

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  getFormData,
  getServicios,
  getServicio,
  createServicio,
  updateServicio,
  cambiarEstadoHandler,
  entregarServicio,
  anularServicio,
  getRecibo,
  getReporte,
  getReporteDetalle,
  getTecnicos,
  createTecnico,
  updateTecnico,
  toggleTecnico,
};
