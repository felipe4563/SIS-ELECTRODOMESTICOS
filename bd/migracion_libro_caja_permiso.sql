-- Migración: agregar permiso `caja.ver_libro` para la nueva pantalla Libro Caja
-- Ejecutar una sola vez en producción

INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES
(226, 10, 'caja.ver_libro', 'Ver Libro Caja', 'Ver el libro caja consolidado de ingresos y egresos por ventas, compras y gastos');

-- Asignado por defecto solo al rol ADMINISTRADOR (id_rol = 1)
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES
(1, 226);
