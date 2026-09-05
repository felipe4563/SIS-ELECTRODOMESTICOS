// Orden de prioridad para redirigir al primer módulo accesible tras el login
const RUTAS_PRIORITARIAS = [
  { path: '/dashboard',            action: 'ver',          subject: 'dashboard',    orAction: 'ver_todas_sucursales' },
  { path: '/ventas',               anyOf: [['ver_propias','ventas'],['ver_sucursal','ventas'],['ver_todas','ventas']] },
  { path: '/caja',                 action: 'ver',          subject: 'caja' },
  { path: '/cobros',               action: 'ver',          subject: 'cobros' },
  { path: '/cotizaciones',         action: 'ver',          subject: 'cotizaciones' },
  { path: '/inventario/stock',     action: 'ver',          subject: 'inventario' },
  { path: '/compras',              action: 'ver',          subject: 'compras' },
  { path: '/productos',            action: 'ver',          subject: 'productos' },
  { path: '/clientes',             action: 'ver',          subject: 'clientes' },
  { path: '/proveedores',          action: 'ver',          subject: 'proveedores' },
  { path: '/reportes',             action: 'ver',          subject: 'reportes' },
  { path: '/gastos',               action: 'ver',          subject: 'gastos' },
  { path: '/usuarios',             action: 'ver',          subject: 'usuarios' },
  { path: '/configuracion/empresa', action: 'ver',          subject: 'empresa' },
  { path: '/herramientas',         action: 'ver',          subject: 'herramientas' },
  { path: '/auditoria',            action: 'ver',          subject: 'auditoria' },
  { path: '/mi-asistencia',        action: 'marcar',       subject: 'asistencia' },
];

function puedePath(ability, ruta) {
  if (ruta.anyOf) return ruta.anyOf.some(([action, subject]) => ability.can(action, subject));
  if (ability.can(ruta.action, ruta.subject)) return true;
  if (ruta.orAction) return ability.can(ruta.orAction, ruta.subject);
  return false;
}

export async function redirigirPostAuth(ability, navigate, destino = '/dashboard') {
  // Buscar si el destino guardado corresponde a alguna ruta con permiso requerido
  const rutaDestino = RUTAS_PRIORITARIAS.find(
    r => destino === r.path || destino.startsWith(r.path + '/')
  );

  // Si el destino no está en la lista (ruta libre) o sí tiene permiso → ir directo
  if (!rutaDestino || puedePath(ability, rutaDestino)) {
    navigate(destino, { replace: true });
    return;
  }

  // No tiene acceso al destino → buscar el primer módulo accesible en orden de prioridad
  const primera = RUTAS_PRIORITARIAS.find(r => puedePath(ability, r));
  navigate(primera ? primera.path : '/sin-permiso', { replace: true });
}
