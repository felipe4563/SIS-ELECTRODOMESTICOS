-- ═══════════════════════════════════════════════════════════════════════════
-- RESET DE DATOS DE PRODUCCIÓN — borra TODO excepto usuarios, roles,
-- permisos, rol_permiso, modulos (dependencia obligatoria de permisos) y
-- monedas. El resto de las tablas queda vacía y con AUTO_INCREMENT en 1,
-- como si fuera una instalación nueva.
--
-- ⚠️  IRREVERSIBLE. Hacer backup completo de la base antes de ejecutar.
-- ⚠️  Ejecutar UNA SOLA VEZ, con la aplicación (backend) detenida o en
--     mantenimiento, para evitar escrituras concurrentes a mitad del reset.
--
-- Uso:
--   mysqldump -u root -p bd_megaelectra > backup_antes_de_reset_$(date +%Y%m%d).sql
--   mysql -u root -p bd_megaelectra < migracion_reset_datos_produccion.sql
-- ═══════════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `ajuste_inventario_detalle`;
TRUNCATE TABLE `ajustes_inventario`;
TRUNCATE TABLE `alertas_stock`;
TRUNCATE TABLE `arqueos_caja`;
TRUNCATE TABLE `auditoria`;
TRUNCATE TABLE `bancos`;
TRUNCATE TABLE `cajas`;
TRUNCATE TABLE `categorias`;
TRUNCATE TABLE `categorias_gasto`;
TRUNCATE TABLE `cliente_direcciones`;
TRUNCATE TABLE `clientes`;
TRUNCATE TABLE `combo_detalle`;
TRUNCATE TABLE `combos`;
TRUNCATE TABLE `compra_cuotas`;
TRUNCATE TABLE `compra_detalle`;
TRUNCATE TABLE `compras`;
TRUNCATE TABLE `configuracion_sistema`;
TRUNCATE TABLE `cotizacion_detalle`;
TRUNCATE TABLE `cotizaciones`;
TRUNCATE TABLE `depositos`;
TRUNCATE TABLE `devolucion_venta_detalle`;
TRUNCATE TABLE `devoluciones_venta`;
TRUNCATE TABLE `empresas`;
TRUNCATE TABLE `gastos`;
TRUNCATE TABLE `impuestos`;
TRUNCATE TABLE `kardex`;
TRUNCATE TABLE `marcas`;
TRUNCATE TABLE `pagos_compra`;
TRUNCATE TABLE `pagos_venta`;
TRUNCATE TABLE `producto_imagenes`;
TRUNCATE TABLE `producto_precio_historico`;
TRUNCATE TABLE `productos`;
TRUNCATE TABLE `promocion_producto`;
TRUNCATE TABLE `promociones`;
TRUNCATE TABLE `proveedor_contactos`;
TRUNCATE TABLE `proveedor_cuentas_pago`;
TRUNCATE TABLE `proveedores`;
TRUNCATE TABLE `servicio_tecnico_seguimiento`;
TRUNCATE TABLE `servicios_tecnicos`;
TRUNCATE TABLE `sesiones`;
TRUNCATE TABLE `stock`;
TRUNCATE TABLE `sucursales`;
TRUNCATE TABLE `tecnicos_externos`;
TRUNCATE TABLE `tipos_cambio`;
TRUNCATE TABLE `tipos_movimiento`;
TRUNCATE TABLE `transferencia_detalle`;
TRUNCATE TABLE `transferencias`;
TRUNCATE TABLE `unidades_medida`;
TRUNCATE TABLE `usuario_sucursal`;
TRUNCATE TABLE `venta_cuotas`;
TRUNCATE TABLE `venta_detalle`;
TRUNCATE TABLE `ventas`;

SET FOREIGN_KEY_CHECKS = 1;

-- `sucursales` quedó vacía: ningún usuario puede seguir apuntando a una
-- sucursal que ya no existe (usuarios.id_sucursal_default tiene FK a
-- sucursales). Se limpia para que el sistema no rompa al leer el usuario.
UPDATE `usuarios` SET `id_sucursal_default` = NULL;

-- Tablas que SÍ se conservan intactas (no se tocan): usuarios, roles,
-- permisos, rol_permiso, modulos, monedas.
