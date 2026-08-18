-- Migración: crear rol CAJERO y dejar a VENDEDOR sin acceso al sistema
-- (VENDEDOR pasa a ser solo una etiqueta de atribución en ventas.id_vendedor /
--  cotizaciones.id_vendedor — no opera el sistema, no tiene permisos)
-- Ejecutar una sola vez en producción

-- 1) Nuevo rol CAJERO
INSERT INTO `roles` (`id_rol`, `nombre`, `descripcion`, `es_sistema`, `activo`) VALUES
(4, 'CAJERO', 'Atiende mostrador: ventas, cobros y turno de caja.', 0, 1);

-- 2) Permisos del rol CAJERO
--    (set operativo de mostrador: productos/clientes de consulta, ventas, cobros,
--     caja -abrir/cerrar/libro-, gastos rápidos durante el turno)
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES
(4, 1),    -- dashboard.ver
(4, 32),   -- productos.ver
(4, 42),   -- marcas.ver
(4, 44),   -- categorias.ver
(4, 46),   -- unidades.ver
(4, 56),   -- clientes.ver
(4, 57),   -- clientes.crear
(4, 58),   -- clientes.editar
(4, 60),   -- clientes.dar_credito
(4, 62),   -- clientes.ver_saldo
(4, 63),   -- clientes.ver_historial
(4, 64),   -- clientes.gestionar_direcciones
(4, 81),   -- inventario.ver
(4, 82),   -- inventario.ver_todos_depositos
(4, 92),   -- inventario.alertas_ver
(4, 95),   -- ventas.ver_propias
(4, 96),   -- ventas.ver_sucursal
(4, 98),   -- ventas.crear_menor
(4, 99),   -- ventas.crear_mayor
(4, 100),  -- ventas.editar_borrador
(4, 101),  -- ventas.emitir
(4, 102),  -- ventas.aplicar_descuento
(4, 104),  -- ventas.vender_credito
(4, 106),  -- ventas.cobrar
(4, 109),  -- ventas.devolucion_crear
(4, 113),  -- ventas.imprimir
(4, 115),  -- caja.ver
(4, 117),  -- caja.abrir
(4, 118),  -- caja.cerrar
(4, 119),  -- caja.ver_arqueo_propio
(4, 121),  -- caja.cuadrar_diferencia
(4, 124),  -- gastos.ver
(4, 126),  -- gastos.crear
(4, 131),  -- gastos.categorias_ver
(4, 135),  -- reportes.ver
(4, 137),  -- reportes.ventas_periodo
(4, 139),  -- reportes.ventas_producto
(4, 140),  -- reportes.ventas_cliente
(4, 150),  -- reportes.arqueos_caja
(4, 154),  -- reportes.exportar
(4, 161),  -- cotizaciones.ver
(4, 163),  -- cotizaciones.crear
(4, 164),  -- cotizaciones.editar
(4, 165),  -- cotizaciones.emitir
(4, 166),  -- cotizaciones.aprobar
(4, 167),  -- cotizaciones.rechazar
(4, 168),  -- cotizaciones.convertir_venta
(4, 170),  -- cotizaciones.imprimir
(4, 172),  -- cobros.ver
(4, 174),  -- cobros.crear
(4, 181),  -- cobros.imprimir
(4, 183),  -- combos.ver
(4, 188),  -- promociones.ver
(4, 215),  -- servicio_tecnico.ver
(4, 217),  -- servicio_tecnico.crear
(4, 218),  -- servicio_tecnico.editar
(4, 220),  -- servicio_tecnico.entregar
(4, 222),  -- servicio_tecnico.imprimir
(4, 226);  -- caja.ver_libro

-- 3) VENDEDOR deja de tener acceso al sistema: se le quitan todos los permisos
DELETE FROM `rol_permiso` WHERE `id_rol` = 2;

-- 4) Actualizar la descripción del rol para reflejar su nuevo propósito
UPDATE `roles`
SET `descripcion` = 'Solo atribución en ventas/cotizaciones (id_vendedor). No opera el sistema, sin permisos.'
WHERE `id_rol` = 2;
