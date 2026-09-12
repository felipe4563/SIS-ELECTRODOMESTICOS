-- Migración: categorías/subcategorías de gasto + Caja Chica (fondo fijo con
-- reposición auditable vía movimientos_caja). Ejecutar una sola vez en producción.

START TRANSACTION;

ALTER TABLE `categorias_gasto`
  ADD COLUMN `id_categoria_gasto_padre` int(11) DEFAULT NULL AFTER `id_categoria_gasto`,
  ADD KEY `fk_catgasto_padre` (`id_categoria_gasto_padre`),
  ADD CONSTRAINT `fk_catgasto_padre` FOREIGN KEY (`id_categoria_gasto_padre`) REFERENCES `categorias_gasto` (`id_categoria_gasto`) ON DELETE SET NULL;

ALTER TABLE `cajas`
  ADD COLUMN `tipo` enum('GENERAL','CHICA') NOT NULL DEFAULT 'GENERAL' AFTER `nombre`,
  ADD COLUMN `monto_fondo_fijo` decimal(14,2) DEFAULT NULL AFTER `tipo`;

CREATE TABLE `movimientos_caja` (
  `id_movimiento`     bigint(20)     NOT NULL AUTO_INCREMENT,
  `id_caja_origen`    int(11)        NOT NULL,
  `id_caja_destino`   int(11)        NOT NULL,
  `id_arqueo_origen`  bigint(20)     DEFAULT NULL,
  `id_arqueo_destino` bigint(20)     DEFAULT NULL,
  `monto`             decimal(14,2)  NOT NULL,
  `tipo`              enum('REPOSICION') NOT NULL DEFAULT 'REPOSICION',
  `observaciones`     varchar(255)   DEFAULT NULL,
  `id_usuario`        int(11)        NOT NULL,
  `fecha`             datetime       NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_movimiento`),
  KEY `fk_movcaja_origen`   (`id_caja_origen`),
  KEY `fk_movcaja_destino`  (`id_caja_destino`),
  KEY `fk_movcaja_aq_orig`  (`id_arqueo_origen`),
  KEY `fk_movcaja_aq_dest`  (`id_arqueo_destino`),
  KEY `fk_movcaja_usuario`  (`id_usuario`),
  CONSTRAINT `fk_movcaja_origen`  FOREIGN KEY (`id_caja_origen`)  REFERENCES `cajas` (`id_caja`),
  CONSTRAINT `fk_movcaja_destino` FOREIGN KEY (`id_caja_destino`) REFERENCES `cajas` (`id_caja`),
  CONSTRAINT `fk_movcaja_aq_orig`  FOREIGN KEY (`id_arqueo_origen`)  REFERENCES `arqueos_caja` (`id_arqueo`) ON DELETE SET NULL,
  CONSTRAINT `fk_movcaja_aq_dest`  FOREIGN KEY (`id_arqueo_destino`) REFERENCES `arqueos_caja` (`id_arqueo`) ON DELETE SET NULL,
  CONSTRAINT `fk_movcaja_usuario`  FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES
(232, 10, 'caja.reponer_caja_chica', 'Reponer Caja Chica', 'Registrar una reposición de fondo fijo desde Caja General hacia una Caja Chica'),
(233, 12, 'reportes.caja_chica', 'Reporte Caja Chica', 'Ver historial de reposiciones, saldos vs. fondo fijo y gastos de caja chica por categoría');

INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES
(1, 232),
(1, 233);

COMMIT;
