const db     = require('../config/db');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

// ── Control de intentos fallidos (en memoria) ─────────────────────────────
// Clave: identificador en minúsculas. Valor: { count, firstAt }
const intentosFallidos = new Map();
const MAX_INTENTOS = 5;
const VENTANA_MS   = 15 * 60 * 1000; // 15 minutos

function registrarFallo(key) {
  const ahora = Date.now();
  const rec   = intentosFallidos.get(key);
  if (!rec || (ahora - rec.firstAt) >= VENTANA_MS) {
    intentosFallidos.set(key, { count: 1, firstAt: ahora });
  } else {
    rec.count += 1;
  }
}

function estaBloqueado(key) {
  const rec = intentosFallidos.get(key);
  if (!rec) return false;
  if ((Date.now() - rec.firstAt) >= VENTANA_MS) {
    intentosFallidos.delete(key);
    return false;
  }
  return rec.count >= MAX_INTENTOS;
}

function limpiarFallos(key) {
  intentosFallidos.delete(key);
}

// ── Login ─────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { identificador, contrasena } = req.body;

  if (!identificador || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  const keyBloqueo = identificador.toLowerCase();

  // 1. Verificar bloqueo por intentos fallidos
  if (estaBloqueado(keyBloqueo)) {
    return res.status(429).json({
      error: 'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Espera 15 minutos.',
    });
  }

  try {
    // 2. Buscar usuario activo por username, email o documento (CI)
    const [rows] = await db.promise().query(
      `SELECT u.*, r.nombre AS rol_nombre
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE (u.username = ? OR u.email = ? OR u.documento = ?)
         AND u.activo = 1`,
      [identificador, identificador, identificador]
    );

    if (rows.length === 0) {
      registrarFallo(keyBloqueo);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = rows[0];

    // 3. Verificar contraseña con bcrypt
    const coincide = await bcrypt.compare(contrasena, usuario.password_hash);
    if (!coincide) {
      registrarFallo(keyBloqueo);
      const rec      = intentosFallidos.get(keyBloqueo);
      const restantes = MAX_INTENTOS - (rec?.count ?? 0);
      return res.status(401).json({
        error: restantes > 0
          ? `Contraseña incorrecta. Intentos restantes: ${restantes}`
          : 'Cuenta bloqueada temporalmente por demasiados intentos fallidos.',
      });
    }

    // Login correcto → limpiar intentos
    limpiarFallos(keyBloqueo);

    // 4. Cargar permisos del rol
    const [rowsPermisos] = await db.promise().query(
      `SELECT p.codigo
       FROM rol_permiso rp
       JOIN permisos p ON p.id_permiso = rp.id_permiso
       WHERE rp.id_rol = ?`,
      [usuario.id_rol]
    );
    const permisos = rowsPermisos.map(p => p.codigo);

    // 5. Cargar sucursales asignadas al usuario
    const [sucursales] = await db.promise().query(
      `SELECT s.id_sucursal, s.nombre, s.codigo
       FROM usuario_sucursal us
       JOIN sucursales s ON s.id_sucursal = us.id_sucursal
       WHERE us.id_usuario = ? AND s.activo = 1
       ORDER BY s.nombre`,
      [usuario.id_usuario]
    );

    // 6. Generar JWT con 8 h de validez
    const payload = {
      jti:               crypto.randomUUID(),
      id_usuario:        usuario.id_usuario,
      rol:               usuario.id_rol,
      rol_nombre:        usuario.rol_nombre,
      id_sucursal:       usuario.id_sucursal_default,
      debe_cambiar_pass: usuario.debe_cambiar_pass === 1,
      permisos,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // 7. Cerrar sesiones anteriores y registrar la nueva
    const ip         = req.ip || req.socket?.remoteAddress || null;
    const ua         = req.headers['user-agent']?.substring(0, 255) || null;
    const expiracion = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await db.promise().query(
      `UPDATE sesiones SET cerrada = 1 WHERE id_usuario = ? AND cerrada = 0`,
      [usuario.id_usuario]
    );
    await db.promise().query(
      `INSERT INTO sesiones (id_usuario, token, ip_origen, user_agent, fecha_expiracion)
       VALUES (?, ?, ?, ?, ?)`,
      [usuario.id_usuario, token, ip, ua, expiracion]
    );

    // 8. Registrar auditoría de LOGIN
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'usuarios', ?, 'LOGIN', ?)`,
      [usuario.id_usuario, usuario.id_usuario, ip]
    );

    // 9. Actualizar último login
    await db.promise().query(
      `UPDATE usuarios SET ultimo_login = NOW() WHERE id_usuario = ?`,
      [usuario.id_usuario]
    );

    return res.json({
      token,
      usuario: {
        id:                usuario.id_usuario,
        username:          usuario.username,
        nombres:           usuario.nombres,
        apellidos:         usuario.apellidos,
        email:             usuario.email,
        rol:               usuario.id_rol,
        rol_nombre:        usuario.rol_nombre,
        id_sucursal:       usuario.id_sucursal_default,
        foto_url:          usuario.foto_url,
        debe_cambiar_pass: usuario.debe_cambiar_pass === 1,
        permisos,
        sucursales,
      },
    });
  } catch (err) {
    console.error('[login] Error:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// ── Logout ────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const ip    = req.ip || req.socket?.remoteAddress || null;

    if (token) {
      // Marcar sesión como cerrada
      await db.promise().query(
        `UPDATE sesiones SET cerrada = 1 WHERE token = ?`,
        [token]
      );

      // Registrar auditoría de LOGOUT
      if (req.user?.id_usuario) {
        await db.promise().query(
          `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
           VALUES (?, 'usuarios', ?, 'LOGOUT', ?)`,
          [req.user.id_usuario, req.user.id_usuario, ip]
        );
      }
    }

    return res.json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('[logout] Error:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// ── Cambiar contraseña ────────────────────────────────────────────────────
const cambiarContrasena = async (req, res) => {
  const { contrasena_actual, contrasena_nueva } = req.body;
  const id_usuario = req.user.id_usuario;

  if (!contrasena_nueva || contrasena_nueva.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const [rows] = await db.promise().query(
      `SELECT password_hash, debe_cambiar_pass FROM usuarios WHERE id_usuario = ?`,
      [id_usuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = rows[0];

    // Si NO es cambio obligatorio, validar contraseña actual
    if (!usuario.debe_cambiar_pass) {
      if (!contrasena_actual) {
        return res.status(400).json({ error: 'La contraseña actual es requerida' });
      }
      const coincide = await bcrypt.compare(contrasena_actual, usuario.password_hash);
      if (!coincide) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }
    }

    const hash = await bcrypt.hash(contrasena_nueva, 10);

    await db.promise().query(
      `UPDATE usuarios SET password_hash = ?, debe_cambiar_pass = 0 WHERE id_usuario = ?`,
      [hash, id_usuario]
    );

    // Auditar cambio de contraseña
    const ip = req.ip || req.socket?.remoteAddress || null;
    await db.promise().query(
      `INSERT INTO auditoria (id_usuario, tabla, id_registro, accion, ip_origen)
       VALUES (?, 'usuarios', ?, 'UPDATE', ?)`,
      [id_usuario, id_usuario, ip]
    );

    return res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('[cambiarContrasena] Error:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// ── Me (datos del usuario autenticado) ───────────────────────────────────
const me = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT u.id_usuario, u.username, u.nombres, u.apellidos, u.email,
              u.telefono, u.id_rol, u.id_sucursal_default, u.foto_url,
              u.debe_cambiar_pass, u.ultimo_login,
              r.nombre AS rol_nombre
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ? AND u.activo = 1`,
      [req.user.id_usuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const [rowsPermisos] = await db.promise().query(
      `SELECT p.codigo
       FROM rol_permiso rp
       JOIN permisos p ON p.id_permiso = rp.id_permiso
       WHERE rp.id_rol = ?`,
      [rows[0].id_rol]
    );

    const [sucursales] = await db.promise().query(
      `SELECT s.id_sucursal, s.nombre, s.codigo
       FROM usuario_sucursal us
       JOIN sucursales s ON s.id_sucursal = us.id_sucursal
       WHERE us.id_usuario = ? AND s.activo = 1
       ORDER BY s.nombre`,
      [req.user.id_usuario]
    );

    return res.json({
      usuario: {
        ...rows[0],
        permisos:   rowsPermisos.map(p => p.codigo),
        sucursales,
      },
    });
  } catch (err) {
    console.error('[me] Error:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

// ── Seleccionar sucursal ──────────────────────────────────────────────────
const seleccionarSucursal = async (req, res) => {
  const { id_sucursal } = req.body;
  const id_usuario      = req.user.id_usuario;

  if (!id_sucursal) {
    return res.status(400).json({ error: 'id_sucursal es requerido' });
  }

  try {
    // Verificar que el usuario tiene acceso a esa sucursal
    const [acceso] = await db.promise().query(
      `SELECT 1 FROM usuario_sucursal WHERE id_usuario = ? AND id_sucursal = ?`,
      [id_usuario, id_sucursal]
    );

    if (acceso.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a esa sucursal' });
    }

    const [sucRows] = await db.promise().query(
      `SELECT id_sucursal, nombre, codigo FROM sucursales WHERE id_sucursal = ? AND activo = 1`,
      [id_sucursal]
    );

    if (sucRows.length === 0) {
      return res.status(404).json({ error: 'Sucursal no encontrada o inactiva' });
    }

    // Emitir nuevo JWT con la sucursal seleccionada
    const payload = {
      jti:               crypto.randomUUID(),
      id_usuario,
      rol:               req.user.rol,
      rol_nombre:        req.user.rol_nombre,
      id_sucursal:       Number(id_sucursal),
      debe_cambiar_pass: req.user.debe_cambiar_pass,
      permisos:          req.user.permisos,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // Cerrar sesión anterior y registrar la nueva
    const ip         = req.ip || req.socket?.remoteAddress || null;
    const ua         = req.headers['user-agent']?.substring(0, 255) || null;
    const expiracion = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const oldToken   = req.headers.authorization?.split(' ')[1];

    await db.promise().query(`UPDATE sesiones SET cerrada = 1 WHERE token = ?`, [oldToken]);
    await db.promise().query(
      `INSERT INTO sesiones (id_usuario, token, ip_origen, user_agent, fecha_expiracion)
       VALUES (?, ?, ?, ?, ?)`,
      [id_usuario, token, ip, ua, expiracion]
    );

    return res.json({ token, sucursal: sucRows[0] });
  } catch (err) {
    console.error('[seleccionarSucursal] Error:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { login, logout, cambiarContrasena, me, seleccionarSucursal };
