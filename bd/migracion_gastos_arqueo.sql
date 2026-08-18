-- Migración: agregar columna `id_arqueo` a `gastos` para atar cada gasto
-- al turno de caja exacto en que se registró (igual que pagos_venta.id_arqueo)
-- Ejecutar una sola vez en producción

ALTER TABLE `gastos`
  ADD COLUMN `id_arqueo` bigint(20) DEFAULT NULL COMMENT 'Arqueo de caja activo al momento del gasto' AFTER `id_sucursal`;

ALTER TABLE `gastos`
  ADD KEY `fk_gasto_arqueo` (`id_arqueo`);

ALTER TABLE `gastos`
  ADD CONSTRAINT `fk_gasto_arqueo` FOREIGN KEY (`id_arqueo`) REFERENCES `arqueos_caja` (`id_arqueo`) ON DELETE SET NULL;
