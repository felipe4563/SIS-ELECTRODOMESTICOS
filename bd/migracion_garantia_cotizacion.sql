-- Migración: agregar columna `garantia_anos` a `cotizacion_detalle` para
-- registrar manualmente los años de garantía ofrecidos por producto en la cotización
-- Ejecutar una sola vez en producción

ALTER TABLE `cotizacion_detalle`
  ADD COLUMN `garantia_anos` tinyint(3) unsigned DEFAULT NULL COMMENT 'Años de garantía ofrecidos para este producto en la cotización' AFTER `observacion`;
