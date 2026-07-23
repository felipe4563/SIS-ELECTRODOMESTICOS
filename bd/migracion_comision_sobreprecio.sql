-- ============================================================
--  MIGRACIÓN: Comisión por Sobreprecio (por Vendedor)
--  Aplicar sobre: bd_electrodomesticos
--  Fecha: 2026-07-23
-- ============================================================
--
--  Agrega soporte para que cada vendedor tenga su propio
--  porcentaje de comisión sobre el sobreprecio (diferencia
--  entre el precio real de venta y el precio base del producto).
--
--  precio_base   = precio_publico o precio_mayor según tipo_venta
--  sobreprecio   = precio_unitario - precio_base   (si > 0)
--  comision_monto = sobreprecio × porcentaje_comision / 100
--
-- ============================================================

START TRANSACTION;

-- 1. Porcentaje de comisión por vendedor
ALTER TABLE `usuarios`
  ADD COLUMN `porcentaje_comision` DECIMAL(5,2) NOT NULL DEFAULT 0.00
  COMMENT 'Porcentaje de comisión sobre el sobreprecio de venta'
  AFTER `activo`;

-- 2. Precio de referencia del producto al momento de la venta
ALTER TABLE `venta_detalle`
  ADD COLUMN `precio_base` DECIMAL(14,2) NOT NULL DEFAULT 0.00
  COMMENT 'Precio publicado del producto al momento de la venta (precio_publico o precio_mayor)'
  AFTER `precio_unitario`;

-- 3. Monto de comisión generada por esta línea
ALTER TABLE `venta_detalle`
  ADD COLUMN `comision_monto` DECIMAL(14,2) NOT NULL DEFAULT 0.00
  COMMENT 'Comisión del vendedor por sobreprecio: (precio_unitario - precio_base) × porcentaje_comision / 100'
  AFTER `bono_vendedor`;

COMMIT;
