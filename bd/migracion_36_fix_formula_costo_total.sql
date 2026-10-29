-- Migración 36: corrige la fórmula de las columnas generadas costo_total y
-- utilidad en productos.
--
-- Bug: costo_total sumaba precio_real + costo_logistica + costo_mcm, pero
-- costo_mcm YA es precio_real + costo_logistica (así lo calcula el
-- formulario de productos al editar esos dos campos). Esto duplicaba el
-- costo real al doble en todos los productos con costo_logistica != 0,
-- inflando también "utilidad" (que usa la misma suma) hacia un valor
-- negativo incorrecto.
--
-- Fórmula correcta: costo_total = costo_mcm (que ya representa
-- precio_real + costo_logistica).

ALTER TABLE productos
  MODIFY COLUMN costo_total decimal(14,2)
    GENERATED ALWAYS AS (`costo_mcm`) STORED,
  MODIFY COLUMN utilidad decimal(14,2)
    GENERATED ALWAYS AS (`precio_publico` - `costo_mcm`) STORED;
