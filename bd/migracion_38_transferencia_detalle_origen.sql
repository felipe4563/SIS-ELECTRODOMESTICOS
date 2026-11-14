-- ============================================================================
-- Migración 38: depósito de origen por ítem de transferencia
-- ============================================================================
-- Hoy una transferencia tiene un único id_deposito_origen de cabecera:
-- todos sus ítems salen del mismo depósito. El cliente pidió poder armar
-- una sola transferencia con ítems de depósitos de origen distintos hacia
-- un único destino (ver docs/superpowers/specs/2026-11-13-transferencias-
-- multiorigen-design.md). El origen real de cada línea pasa a vivir acá;
-- transferencias.id_deposito_origen queda como columna de conveniencia
-- (NULL cuando los ítems tienen orígenes mixtos).
-- ============================================================================

ALTER TABLE `transferencia_detalle`
  ADD COLUMN `id_deposito_origen` INT(11) NULL AFTER `id_producto`;

UPDATE transferencia_detalle td
  JOIN transferencias t ON t.id_transferencia = td.id_transferencia
  SET td.id_deposito_origen = t.id_deposito_origen
  WHERE td.id_deposito_origen IS NULL;

ALTER TABLE `transferencia_detalle`
  MODIFY COLUMN `id_deposito_origen` INT(11) NOT NULL;

ALTER TABLE `transferencia_detalle`
  ADD CONSTRAINT `fk_td_dep_origen` FOREIGN KEY (`id_deposito_origen`) REFERENCES `depositos` (`id_deposito`);

ALTER TABLE `transferencia_detalle`
  ADD INDEX `idx_td_dep_origen` (`id_deposito_origen`);

ALTER TABLE `transferencias`
  MODIFY COLUMN `id_deposito_origen` INT(11) NULL;
