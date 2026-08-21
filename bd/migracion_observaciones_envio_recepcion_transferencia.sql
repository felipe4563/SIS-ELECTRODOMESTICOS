-- Migración: agregar columnas para registrar por separado la observación
-- que se ingresa al confirmar el envío y la que se ingresa al recibir la
-- mercadería (antes solo se guardaban en el kardex y no eran visibles ni
-- en el detalle ni en los tickets/PDF de la transferencia)
-- Ejecutar una sola vez en producción

ALTER TABLE `transferencias`
  ADD COLUMN `observaciones_envio` text DEFAULT NULL COMMENT 'Observación registrada al confirmar el envío' AFTER `observaciones`,
  ADD COLUMN `observaciones_recepcion` text DEFAULT NULL COMMENT 'Observación registrada al recibir la mercadería' AFTER `observaciones_envio`;
