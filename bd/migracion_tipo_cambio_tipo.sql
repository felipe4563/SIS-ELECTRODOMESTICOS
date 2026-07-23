-- Migración: agregar columna `tipo` a tipos_cambio para distinguir paralelo vs oficial
-- Ejecutar una sola vez en producción

ALTER TABLE `tipos_cambio`
  ADD COLUMN `tipo` ENUM('oficial','paralelo') NOT NULL DEFAULT 'oficial' AFTER `id_moneda_destino`;

ALTER TABLE `tipos_cambio`
  DROP INDEX `uq_cambio`,
  ADD UNIQUE KEY `uq_cambio` (`id_moneda_origen`, `id_moneda_destino`, `fecha`, `tipo`);
