-- Rollback: se quita el campo `metodo_pago` de `ventas` (se decidió no usarlo
-- a nivel de venta; el método de pago ya se registra por cada pago en `pagos_venta`)
-- Ejecutar una sola vez en producción. Si la columna no existe, no hace nada.

SET @col_existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ventas' AND COLUMN_NAME = 'metodo_pago'
);

SET @sql := IF(@col_existe > 0, 'ALTER TABLE `ventas` DROP COLUMN `metodo_pago`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
