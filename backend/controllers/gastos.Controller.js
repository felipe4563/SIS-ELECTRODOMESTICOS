const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');

function getIp(req) {
  return req.ip || req.headers['x-forwarded-for'] || null;
}

async function auditLog(id_usuario, tabla, id_registro, accion, ip) {
  await db.promise().query(
    'INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen) VALUES (?,?,?,?,?)',
    [id_usuario, tabla, id_registro, accion, ip]
  );
}

async function generarNumero() {
  const now = new Date();
  const ym  = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [[row]] = await db.promise().query(
    `SELECT COUNT(*) AS cnt FROM gastos WHERE numero LIKE ?`, [`GAS-${ym}-%`]
  );
  return `GAS-${ym}-${String(Number(row.cnt) + 1).padStart(4, '0')}`;
}

// ── Categorías de gasto ───────────────────────────────────────────────────

const getCategorias = async (req, res) => {
  try {
    const { activo } = req.query;
    let sql = 'SELECT * FROM categorias_gasto';
    const params = [];
    if (activo !== undefined) { sql += ' WHERE activo = ?'; params.push(activo); }
    sql += ' ORDER BY nombre';
    const [rows] = await db.promise().query(sql, params);
    res.json({ categorias: rows });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

const crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ mensaje: 'Nombre requerido' });
    const [result] = await db.promise().query(
      'INSERT INTO categorias_gasto (nombre, descripcion) VALUES (?, ?)',
      [nombre.trim(), descripcion || null]
    );
    await auditLog(req.user.id_usuario, 'categorias_gasto', result.insertId, 'INSERT', getIp(req));
    res.status(201).json({ id_categoria_gasto: result.insertId, mensaje: 'Categoría creada' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ mensaje: 'Ya existe una categoría con ese nombre' });
    res.status(500).json({ mensaje: e.message });
  }
};

const updateCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ mensaje: 'Nombre requerido' });
    await db.promise().query(
      'UPDATE categorias_gasto SET nombre=?, descripcion=?, activo=? WHERE id_categoria_gasto=?',
      [nombre.trim(), descripcion || null, activo ?? 1, id]
    );
    await auditLog(req.user.id_usuario, 'categorias_gasto', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Categoría actualizada' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ mensaje: 'Ya existe una categoría con ese nombre' });
    res.status(500).json({ mensaje: e.message });
  }
};

const deleteCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const [[{ cnt }]] = await db.promise().query(
      'SELECT COUNT(*) AS cnt FROM gastos WHERE id_categoria_gasto=?', [id]
    );
    if (cnt > 0) return res.status(409).json({ mensaje: 'No se puede eliminar: tiene gastos asociados' });
    await db.promise().query('DELETE FROM categorias_gasto WHERE id_categoria_gasto=?', [id]);
    await auditLog(req.user.id_usuario, 'categorias_gasto', id, 'DELETE', getIp(req));
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

// ── Gastos ────────────────────────────────────────────────────────────────

const getGastos = async (req, res) => {
  try {
    const { id_categoria_gasto, id_sucursal, estado, fecha_desde, fecha_hasta, busqueda, page = 1, limit = 20 } = req.query;
    const offset  = (Number(page) - 1) * Number(limit);
    const where   = ['1=1'];
    const params  = [];

    if (id_categoria_gasto) { where.push('g.id_categoria_gasto=?'); params.push(id_categoria_gasto); }
    if (id_sucursal)        { where.push('g.id_sucursal=?');        params.push(id_sucursal); }
    if (estado)             { where.push('g.estado=?');             params.push(estado); }
    if (fecha_desde)        { where.push('g.fecha >= ?');           params.push(fecha_desde); }
    if (fecha_hasta)        { where.push('g.fecha <= ?');           params.push(fecha_hasta); }
    if (busqueda) {
      const b = `%${busqueda}%`;
      where.push('(g.numero LIKE ? OR g.descripcion LIKE ? OR cg.nombre LIKE ?)');
      params.push(b, b, b);
    }

    const w = where.join(' AND ');

    const [[{ total }]] = await db.promise().query(`
      SELECT COUNT(*) AS total
      FROM gastos g
      JOIN categorias_gasto cg ON cg.id_categoria_gasto = g.id_categoria_gasto
      WHERE ${w}
    `, params);

    const [rows] = await db.promise().query(`
      SELECT g.*,
        cg.nombre AS categoria,
        s.nombre  AS sucursal,
        CONCAT(u.nombres,' ',u.apellidos) AS usuario_nombre,
        COALESCE(p.razon_social, p.nombre_comercial) AS proveedor
      FROM gastos g
      JOIN categorias_gasto cg ON cg.id_categoria_gasto = g.id_categoria_gasto
      JOIN sucursales s  ON s.id_sucursal   = g.id_sucursal
      JOIN usuarios u    ON u.id_usuario    = g.id_usuario
      LEFT JOIN proveedores p ON p.id_proveedor = g.id_proveedor
      WHERE ${w}
      ORDER BY g.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    res.json({ gastos: rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

const getGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const [[gasto]] = await db.promise().query(`
      SELECT g.*,
        cg.nombre AS categoria,
        s.nombre  AS sucursal,
        CONCAT(u.nombres,' ',u.apellidos) AS usuario_nombre,
        COALESCE(p.razon_social, p.nombre_comercial) AS proveedor
      FROM gastos g
      JOIN categorias_gasto cg ON cg.id_categoria_gasto = g.id_categoria_gasto
      JOIN sucursales s  ON s.id_sucursal   = g.id_sucursal
      JOIN usuarios u    ON u.id_usuario    = g.id_usuario
      LEFT JOIN proveedores p ON p.id_proveedor = g.id_proveedor
      WHERE g.id_gasto=?
    `, [id]);
    if (!gasto) return res.status(404).json({ mensaje: 'Gasto no encontrado' });
    res.json({ gasto });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

const crearGasto = async (req, res) => {
  try {
    const {
      id_categoria_gasto, id_sucursal, id_proveedor, descripcion,
      fecha, id_moneda, tipo_cambio, monto, metodo_pago,
      numero_comprobante, observaciones,
    } = req.body;

    if (!id_categoria_gasto || !id_sucursal || !descripcion?.trim() || !fecha || !id_moneda || !monto || !metodo_pago) {
      return res.status(400).json({ mensaje: 'Campos requeridos: categoría, sucursal, descripción, fecha, moneda, monto, método de pago' });
    }

    const [[config]] = await db.promise().query(
      `SELECT valor FROM configuracion_sistema WHERE clave = 'GASTO_MONTO_COMPROBANTE_OBLIGATORIO'`
    );
    const montoMin = config ? Number(config.valor) : 0;
    if (montoMin > 0 && Number(monto) >= montoMin && !numero_comprobante?.trim()) {
      return res.status(400).json({ mensaje: `Número de comprobante requerido para gastos ≥ ${montoMin}` });
    }

    const numero = await generarNumero();
    const [result] = await db.promise().query(`
      INSERT INTO gastos
        (numero, id_categoria_gasto, id_sucursal, id_proveedor, descripcion,
         fecha, id_moneda, tipo_cambio, monto, metodo_pago, numero_comprobante,
         id_usuario, observaciones)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      numero, id_categoria_gasto, id_sucursal, id_proveedor || null, descripcion.trim(),
      fecha, id_moneda, tipo_cambio || 1, monto, metodo_pago, numero_comprobante || null,
      req.user.id_usuario, observaciones || null,
    ]);

    await auditLog(req.user.id_usuario, 'gastos', result.insertId, 'INSERT', getIp(req));
    res.status(201).json({ id_gasto: result.insertId, numero, mensaje: 'Gasto registrado correctamente' });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

const updateGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const [[gasto]] = await db.promise().query('SELECT estado FROM gastos WHERE id_gasto=?', [id]);
    if (!gasto) return res.status(404).json({ mensaje: 'Gasto no encontrado' });
    if (gasto.estado !== 'REGISTRADO') return res.status(400).json({ mensaje: 'Solo se pueden editar gastos en estado REGISTRADO' });

    const {
      id_categoria_gasto, id_proveedor, descripcion, fecha,
      id_moneda, tipo_cambio, monto, metodo_pago, numero_comprobante, observaciones,
    } = req.body;

    await db.promise().query(`
      UPDATE gastos SET
        id_categoria_gasto=?, id_proveedor=?, descripcion=?, fecha=?,
        id_moneda=?, tipo_cambio=?, monto=?, metodo_pago=?,
        numero_comprobante=?, observaciones=?
      WHERE id_gasto=?
    `, [
      id_categoria_gasto, id_proveedor || null, descripcion, fecha,
      id_moneda, tipo_cambio || 1, monto, metodo_pago,
      numero_comprobante || null, observaciones || null, id,
    ]);

    await auditLog(req.user.id_usuario, 'gastos', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Gasto actualizado' });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

const aprobarGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const [[gasto]] = await db.promise().query('SELECT estado FROM gastos WHERE id_gasto=?', [id]);
    if (!gasto) return res.status(404).json({ mensaje: 'Gasto no encontrado' });
    if (gasto.estado !== 'REGISTRADO') return res.status(400).json({ mensaje: 'Solo se pueden aprobar gastos REGISTRADOS' });

    await db.promise().query('UPDATE gastos SET estado=? WHERE id_gasto=?', ['APROBADO', id]);
    await auditLog(req.user.id_usuario, 'gastos', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Gasto aprobado' });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

const pagarGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const [[gasto]] = await db.promise().query('SELECT estado FROM gastos WHERE id_gasto=?', [id]);
    if (!gasto) return res.status(404).json({ mensaje: 'Gasto no encontrado' });
    if (gasto.estado !== 'APROBADO') return res.status(400).json({ mensaje: 'Solo se pueden pagar gastos APROBADOS' });

    await db.promise().query('UPDATE gastos SET estado=? WHERE id_gasto=?', ['PAGADO', id]);
    await auditLog(req.user.id_usuario, 'gastos', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Gasto marcado como pagado' });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

const anularGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const [[gasto]] = await db.promise().query('SELECT estado FROM gastos WHERE id_gasto=?', [id]);
    if (!gasto) return res.status(404).json({ mensaje: 'Gasto no encontrado' });
    if (gasto.estado === 'ANULADO') return res.status(400).json({ mensaje: 'El gasto ya está anulado' });
    if (gasto.estado === 'PAGADO')  return res.status(400).json({ mensaje: 'No se puede anular un gasto pagado' });

    await db.promise().query(
      `UPDATE gastos SET estado='ANULADO',
        observaciones = CONCAT(COALESCE(observaciones,''), ' | ANULADO: ', ?)
       WHERE id_gasto=?`,
      [motivo || 'Sin motivo', id]
    );
    await auditLog(req.user.id_usuario, 'gastos', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Gasto anulado' });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

const subirComprobante = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ mensaje: 'No se recibió archivo' });
    const url = `/uploads/gastos/${req.file.filename}`;
    await db.promise().query('UPDATE gastos SET comprobante_url=? WHERE id_gasto=?', [url, id]);
    await auditLog(req.user.id_usuario, 'gastos', id, 'UPDATE', getIp(req));
    res.json({ comprobante_url: url, mensaje: 'Comprobante subido correctamente' });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

module.exports = {
  getCategorias, crearCategoria, updateCategoria, deleteCategoria,
  getGastos, getGasto, crearGasto, updateGasto,
  aprobarGasto, pagarGasto, anularGasto, subirComprobante,
};
