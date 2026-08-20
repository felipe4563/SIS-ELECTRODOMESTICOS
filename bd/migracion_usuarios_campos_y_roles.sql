-- Migración: nuevos campos de usuario (celular, dirección, celular de emergencia)
-- y reestructuración de roles: ADMINISTRADOR, VENTAS (antes VENDEDOR, sin acceso
-- al sistema — solo registrado como usuario), JEFE DE ALMACEN (antes ALMACENERO),
-- CAJA-VENTAS (antes CAJERO) y el nuevo rol ENCARGADO DE ALMACEN.
-- Ejecutar una sola vez en producción.

ALTER TABLE `usuarios`
  ADD COLUMN `celular` varchar(30) DEFAULT NULL AFTER `telefono`,
  ADD COLUMN `direccion` varchar(255) DEFAULT NULL AFTER `celular`,
  ADD COLUMN `celular_emergencia` varchar(30) DEFAULT NULL AFTER `direccion`;

-- Renombrar roles existentes (conservan sus permisos actuales)
UPDATE `roles` SET `nombre` = 'VENTAS',
  `descripcion` = 'Solo atribución en ventas/cotizaciones (id_vendedor). No opera el sistema, sin permisos.'
  WHERE `nombre` = 'VENDEDOR';

UPDATE `roles` SET `nombre` = 'JEFE DE ALMACEN'
  WHERE `nombre` = 'ALMACENERO';

UPDATE `roles` SET `nombre` = 'CAJA-VENTAS'
  WHERE `nombre` = 'CAJERO';

-- Nuevo rol ENCARGADO DE ALMACEN: apoyo operativo del Jefe de Almacén, sin
-- funciones de ajuste/configuración (no ajusta inventario, no edita stock
-- mínimo, no atiende alertas, no ve todos los depósitos ni reportes avanzados).
INSERT INTO `roles` (`nombre`, `descripcion`, `es_sistema`, `activo`)
SELECT 'ENCARGADO DE ALMACEN',
       'Apoya la gestión de inventario, recepción de mercadería y transferencias.',
       0, 1
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `nombre` = 'ENCARGADO DE ALMACEN');

INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`)
SELECT (SELECT `id_rol` FROM `roles` WHERE `nombre` = 'ENCARGADO DE ALMACEN'), p.id_permiso
FROM `permisos` p
WHERE p.codigo IN (
  'dashboard.ver',
  'productos.ver', 'marcas.ver', 'categorias.ver', 'unidades.ver', 'proveedores.ver',
  'compras.ver', 'compras.recibir', 'compras.recibir_parcial', 'compras.imprimir',
  'inventario.ver', 'inventario.ver_kardex',
  'inventario.transferir_solicitar', 'inventario.transferir_enviar', 'inventario.transferir_recibir',
  'inventario.alertas_ver',
  'reportes.ver', 'reportes.kardex',
  'combos.ver',
  'servicio_tecnico.ver', 'servicio_tecnico.crear'
);
