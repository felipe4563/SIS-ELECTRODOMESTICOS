-- ============================================================================
-- Migración 37: separar "Contado / Pre-venta" y agregar "Consignación"
-- ============================================================================
-- Pedido del cliente: el estado de pago/reserva informativo de compras
-- (migración 32) tenía "Contado / Pre-venta" como un solo valor combinado.
-- Se separa en dos opciones (CONTADO, PREVENTA) y se agrega CONSIGNACION.
--
-- CONTADO_PREVENTA se deja en el enum (no se quita ni se migran los datos
-- existentes) para que las compras ya guardadas con ese valor sigan
-- mostrándose igual; simplemente deja de ofrecerse para compras nuevas
-- (ver ESTADOS_PAGO_VALIDOS en compras.Controller.js).
-- ============================================================================

ALTER TABLE `compras`
  MODIFY COLUMN `estado_pago`
    ENUM('PRE_PEDIDO','CONTADO_PREVENTA','CONTADO','PREVENTA','CONSIGNACION','PAGADO','PARCIAL_ACTA','RESERVADO')
    DEFAULT NULL
    COMMENT 'Etiqueta informativa de pago/reserva, independiente del estado del pedido';
