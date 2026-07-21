-- ============================================================
-- Migración: Soporte de múltiples imágenes por producto
-- Fecha: 2026-07-21
-- ============================================================

CREATE TABLE IF NOT EXISTS `producto_imagenes` (
  `id_imagen`      int(11)          NOT NULL AUTO_INCREMENT,
  `id_producto`    int(11)          NOT NULL,
  `imagen_url`     varchar(255)     NOT NULL,
  `orden`          tinyint(3) unsigned NOT NULL DEFAULT 0,
  `es_principal`   tinyint(1)       NOT NULL DEFAULT 0,
  `fecha_creacion` datetime         NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_imagen`),
  KEY `idx_pi_producto` (`id_producto`),
  CONSTRAINT `fk_pi_producto`
    FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Migrar imagen existente de cada producto a la nueva tabla como principal
INSERT INTO `producto_imagenes` (`id_producto`, `imagen_url`, `orden`, `es_principal`)
SELECT `id_producto`, `imagen_url`, 0, 1
FROM `productos`
WHERE `imagen_url` IS NOT NULL AND `imagen_url` <> '';
