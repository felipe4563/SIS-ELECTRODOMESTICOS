-- Migración: agregar columna `metodo_pago` a `ventas` para registrar la forma
-- de pago (EFECTIVO, QR, TRANSFERENCIA) con la que se emite la venta
-- Ejecutar una sola vez en producción

ALTER TABLE `ventas`
  ADD COLUMN `metodo_pago` enum('EFECTIVO','QR','TRANSFERENCIA') DEFAULT NULL COMMENT 'Forma de pago con la que se registró la venta' AFTER `condicion_pago`;
