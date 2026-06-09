const jwt                         = require('jsonwebtoken');
const { ForbiddenError }          = require('@casl/ability');
const { buildAbilityForPermisos } = require('../casl/ability.factory');
const db                          = require('../config/db');

// ── Caché de permisos por id_rol ──────────────────────────────────────────
// Evita consultar la BD en cada request para el mismo rol.
// Se invalida con invalidarCacheRol() cuando cambian los permisos de un rol.
const cachePermisos = new Map();

async function getPermisosDeRol(id_rol) {
  if (cachePermisos.has(id_rol)) {
    return cachePermisos.get(id_rol);
  }

  // La tabla permisos usa el campo "codigo" (ej: 'ventas.crear')
  const [rows] = await db.promise().query(
    `SELECT p.codigo
     FROM rol_permiso rp
     JOIN permisos p ON p.id_permiso = rp.id_permiso
     WHERE rp.id_rol = ?`,
    [id_rol]
  );

  const claves = rows.map(r => r.codigo);
  cachePermisos.set(id_rol, claves);
  return claves;
}

function invalidarCacheRol(id_rol) {
  cachePermisos.delete(id_rol);
}

// ── Middleware principal de autenticación ─────────────────────────────────
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[authMiddleware] FATAL: JWT_SECRET no configurado en variables de entorno');
      return res.status(500).json({ error: 'Error de configuración del servidor' });
    }
    const decoded = jwt.verify(token, jwtSecret);
    const { id_usuario, rol, id_sucursal, debe_cambiar_pass } = decoded;

    // Verificar que la sesión no fue cerrada manualmente
    const [sesiones] = await db.promise().query(
      `SELECT cerrada FROM sesiones WHERE token = ? LIMIT 1`,
      [token]
    );

    if (sesiones.length > 0 && sesiones[0].cerrada === 1) {
      return res.status(401).json({ error: 'Sesión cerrada. Inicia sesión nuevamente.' });
    }

    // Obtener permisos actuales del rol (desde caché o BD)
    const claves  = await getPermisosDeRol(rol);
    const ability = buildAbilityForPermisos(claves);

    req.user = {
      id_usuario,
      rol,
      id_sucursal,
      debe_cambiar_pass,
      permisos: claves,
    };
    req.ability = ability;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    console.error('[authMiddleware] Error:', error);
    return res.status(500).json({ error: 'Error interno de autenticación' });
  }
};

// ── Middleware de rol ─────────────────────────────────────────────────────
// Uso: router.get('/ruta', authMiddleware, requireRole([1]), handler)
// id_rol 1 = ADMINISTRADOR, 2 = VENDEDOR, 3 = ALMACENERO
const requireRole = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const roles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Acceso denegado. Rol no autorizado.' });
    }
    next();
  };
};

// ── Middleware de permiso CASL ────────────────────────────────────────────
// Uso: router.post('/ventas', authMiddleware, checkPermission('crear', 'ventas'), handler)
const checkPermission = (action, subject) => {
  return (req, res, next) => {
    if (!req.ability) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    try {
      ForbiddenError.from(req.ability).throwUnlessCan(action, subject);
      next();
    } catch {
      return res.status(403).json({
        error: `Sin permiso para: ${action} en ${subject}`,
      });
    }
  };
};

// ── tiene_permiso (función helper, uso interno) ───────────────────────────
// Uso: tiene_permiso(req, 'ventas', 'crear')
function tiene_permiso(req, subject, action) {
  return req.ability?.can(action, subject) ?? false;
}

module.exports = {
  authMiddleware,
  requireRole,
  checkPermission,
  tiene_permiso,
  invalidarCacheRol,
};
