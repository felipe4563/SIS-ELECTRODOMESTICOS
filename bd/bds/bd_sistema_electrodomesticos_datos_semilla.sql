-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 23-05-2026 a las 13:46:18
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `bd_sistema_electrodomesticos`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ajustes_inventario`
--

CREATE TABLE `ajustes_inventario` (
  `id_ajuste` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_deposito` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `motivo` varchar(255) DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `estado` enum('BORRADOR','APROBADO','ANULADO') NOT NULL DEFAULT 'BORRADOR'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ajuste_inventario_detalle`
--

CREATE TABLE `ajuste_inventario_detalle` (
  `id_detalle` bigint(20) NOT NULL,
  `id_ajuste` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad_sistema` decimal(14,2) NOT NULL,
  `cantidad_fisica` decimal(14,2) NOT NULL,
  `diferencia` decimal(14,2) GENERATED ALWAYS AS (`cantidad_fisica` - `cantidad_sistema`) STORED,
  `observacion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alertas_stock`
--

CREATE TABLE `alertas_stock` (
  `id_alerta` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_deposito` int(11) NOT NULL,
  `cantidad_actual` decimal(14,2) NOT NULL,
  `stock_minimo` decimal(14,2) NOT NULL,
  `fecha_generada` datetime NOT NULL DEFAULT current_timestamp(),
  `atendida` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_atendida` datetime DEFAULT NULL,
  `id_usuario_atendio` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `arqueos_caja`
--

CREATE TABLE `arqueos_caja` (
  `id_arqueo` bigint(20) NOT NULL,
  `id_caja` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_apertura` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_cierre` datetime DEFAULT NULL,
  `monto_apertura` decimal(14,2) NOT NULL DEFAULT 0.00,
  `monto_cierre_sistema` decimal(14,2) DEFAULT 0.00,
  `monto_cierre_real` decimal(14,2) DEFAULT 0.00,
  `diferencia` decimal(14,2) GENERATED ALWAYS AS (`monto_cierre_real` - `monto_cierre_sistema`) STORED,
  `estado` enum('ABIERTA','CERRADA') NOT NULL DEFAULT 'ABIERTA',
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auditoria`
--

CREATE TABLE `auditoria` (
  `id_auditoria` bigint(20) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `tabla` varchar(80) NOT NULL,
  `id_registro` bigint(20) DEFAULT NULL,
  `accion` enum('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','OTRO') NOT NULL,
  `datos_antes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_antes`)),
  `datos_despues` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_despues`)),
  `ip_origen` varchar(45) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cajas`
--

CREATE TABLE `cajas` (
  `id_caja` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `cajas`
--

INSERT INTO `cajas` (`id_caja`, `id_sucursal`, `nombre`, `activo`) VALUES
(1, 1, 'Caja Principal - Gallo', 1),
(2, 2, 'Caja Sucursal - Centro', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id_categoria` int(11) NOT NULL,
  `id_categoria_padre` int(11) DEFAULT NULL,
  `nombre` varchar(80) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES
(1, NULL, 'Cocinas', 'Todas las cocinas', 1),
(2, 1, 'Cocinas de Piso', 'Cocinas grandes de pedestal', 1),
(3, 1, 'Cocinas de Mesa', 'Cocinas pequeñas para mesa', 1),
(4, NULL, 'Hornos', 'Hornos eléctricos y empotrables', 1),
(5, NULL, 'Refrigeración', 'Refrigeradores y congeladores', 1),
(6, 5, 'Congeladores', 'Congeladores horizontales y verticales', 1),
(7, 5, 'Refrigeradores', 'Refrigeradores domésticos', 1),
(8, NULL, 'Pequeños Electros', 'Electrodomésticos menores', 1),
(9, 8, 'Freidoras', 'Freidoras de aire y eléctricas', 1),
(10, 8, 'Licuadoras', 'Licuadoras y procesadores', 1),
(11, NULL, 'Ventilación', 'Equipos de ventilación y extracción', 1),
(12, 11, 'Extractoras', 'Extractoras de grasa / campanas', 1),
(13, NULL, 'Lavado', 'Lavadoras y secadoras', 1),
(14, NULL, 'Climatización', 'Aires acondicionados y calefactores', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias_gasto`
--

CREATE TABLE `categorias_gasto` (
  `id_categoria_gasto` int(11) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias_gasto`
--

INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES
(1, 'Alquiler', 'Alquiler de local comercial o depósito', 1),
(2, 'Servicios Básicos', 'Luz, agua, gas', 1),
(3, 'Internet y Teléfono', 'Servicios de telecomunicaciones', 1),
(4, 'Sueldos y Salarios', 'Pago a empleados', 1),
(5, 'Transporte', 'Combustible, fletes, mantenimiento vehículos', 1),
(6, 'Impuestos', 'IVA, IT, IUE y otros impuestos', 1),
(7, 'Publicidad', 'Marketing, redes sociales, letreros', 1),
(8, 'Mantenimiento', 'Reparaciones de local, equipos, mobiliario', 1),
(9, 'Papelería', 'Útiles de oficina e insumos', 1),
(10, 'Limpieza', 'Productos y servicio de limpieza', 1),
(11, 'Comisiones Bancarias', 'Cargos bancarios, transferencias, mantenimiento cuenta', 1),
(12, 'Otros', 'Gastos varios sin clasificación específica', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id_cliente` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `tipo_cliente` enum('MAYORISTA','MINORISTA','VIP','OCASIONAL') NOT NULL DEFAULT 'MINORISTA',
  `tipo_documento` enum('CI','NIT','PASAPORTE','RUC','OTRO') DEFAULT 'CI',
  `documento` varchar(20) DEFAULT NULL,
  `razon_social` varchar(200) DEFAULT NULL COMMENT 'Para facturación',
  `nombres` varchar(120) DEFAULT NULL,
  `apellidos` varchar(120) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `celular` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `permite_credito` tinyint(1) NOT NULL DEFAULT 0,
  `limite_credito` decimal(14,2) DEFAULT 0.00,
  `saldo_actual` decimal(14,2) DEFAULT 0.00 COMMENT 'Cuenta por cobrar',
  `dias_credito` int(11) DEFAULT 0,
  `descuento_default` decimal(5,2) DEFAULT 0.00,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id_cliente`, `codigo`, `tipo_cliente`, `tipo_documento`, `documento`, `razon_social`, `nombres`, `apellidos`, `telefono`, `celular`, `email`, `fecha_nacimiento`, `permite_credito`, `limite_credito`, `saldo_actual`, `dias_credito`, `descuento_default`, `activo`, `fecha_creacion`) VALUES
(1, 'CLI-0001', 'OCASIONAL', 'CI', '0000000', 'CLIENTE OCASIONAL', 'Cliente', 'Ocasional', NULL, NULL, NULL, NULL, 0, 0.00, 0.00, 0, 0.00, 1, '2026-05-23 07:45:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cliente_direcciones`
--

CREATE TABLE `cliente_direcciones` (
  `id_direccion` int(11) NOT NULL,
  `id_cliente` int(11) NOT NULL,
  `etiqueta` varchar(40) DEFAULT NULL COMMENT 'Casa, Oficina, Bodega...',
  `direccion` varchar(255) NOT NULL,
  `ciudad` varchar(80) DEFAULT NULL,
  `referencias` varchar(255) DEFAULT NULL,
  `es_principal` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compras`
--

CREATE TABLE `compras` (
  `id_compra` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL COMMENT 'Numeración interna',
  `numero_factura` varchar(40) DEFAULT NULL COMMENT 'Factura del proveedor',
  `id_proveedor` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `id_deposito_destino` int(11) NOT NULL,
  `id_moneda` int(11) NOT NULL,
  `tipo_cambio` decimal(18,6) NOT NULL DEFAULT 1.000000,
  `estado` enum('PRE_PEDIDO','POR_LLEGAR','CONFIRMADO','RECIBIDO','PARCIAL','ANULADO') NOT NULL DEFAULT 'PRE_PEDIDO',
  `condicion_pago` enum('CONTADO','CREDITO') NOT NULL DEFAULT 'CONTADO',
  `dias_credito` int(11) DEFAULT 0,
  `fecha_pedido` date NOT NULL,
  `fecha_estim_llegada` date DEFAULT NULL,
  `fecha_confirmacion` date DEFAULT NULL,
  `fecha_recepcion` date DEFAULT NULL,
  `subtotal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `descuento` decimal(14,2) NOT NULL DEFAULT 0.00,
  `impuesto` decimal(14,2) NOT NULL DEFAULT 0.00,
  `flete` decimal(14,2) NOT NULL DEFAULT 0.00,
  `otros_costos` decimal(14,2) NOT NULL DEFAULT 0.00,
  `total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `saldo_pendiente` decimal(14,2) NOT NULL DEFAULT 0.00,
  `id_usuario_crea` int(11) NOT NULL,
  `id_usuario_aprueba` int(11) DEFAULT NULL,
  `id_usuario_recibe` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compra_cuotas`
--

CREATE TABLE `compra_cuotas` (
  `id_cuota` bigint(20) NOT NULL,
  `id_compra` bigint(20) NOT NULL,
  `numero_cuota` int(11) NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `monto` decimal(14,2) NOT NULL,
  `monto_pagado` decimal(14,2) NOT NULL DEFAULT 0.00,
  `estado` enum('PENDIENTE','PARCIAL','PAGADA','VENCIDA') NOT NULL DEFAULT 'PENDIENTE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compra_detalle`
--

CREATE TABLE `compra_detalle` (
  `id_detalle` bigint(20) NOT NULL,
  `id_compra` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` decimal(14,2) NOT NULL,
  `cantidad_recibida` decimal(14,2) NOT NULL DEFAULT 0.00,
  `precio_unitario` decimal(14,4) NOT NULL,
  `descuento_porc` decimal(5,2) DEFAULT 0.00,
  `descuento_monto` decimal(14,2) DEFAULT 0.00,
  `impuesto_porc` decimal(5,2) DEFAULT 0.00,
  `subtotal` decimal(14,2) NOT NULL,
  `observacion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion_sistema`
--

CREATE TABLE `configuracion_sistema` (
  `id_config` int(11) NOT NULL,
  `clave` varchar(80) NOT NULL,
  `valor` text DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `tipo_dato` enum('STRING','INT','DECIMAL','BOOLEAN','JSON') DEFAULT 'STRING',
  `fecha_modificacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `configuracion_sistema`
--

INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES
(1, 'IVA_PORCENTAJE', '13', 'Porcentaje de IVA aplicado', 'DECIMAL', '2026-05-23 07:45:30'),
(2, 'MONEDA_BASE', 'BOB', 'Código de la moneda base', 'STRING', '2026-05-23 07:45:30'),
(3, 'PREFIJO_VENTA', 'V-', 'Prefijo para numeración de ventas', 'STRING', '2026-05-23 07:45:30'),
(4, 'PREFIJO_COMPRA', 'C-', 'Prefijo para numeración de compras', 'STRING', '2026-05-23 07:45:30'),
(5, 'PREFIJO_TRANSFERENCIA', 'T-', 'Prefijo para transferencias', 'STRING', '2026-05-23 07:45:30'),
(6, 'PREFIJO_AJUSTE', 'AJ-', 'Prefijo para ajustes de inventario', 'STRING', '2026-05-23 07:45:30'),
(7, 'PREFIJO_GASTO', 'G-', 'Prefijo para gastos', 'STRING', '2026-05-23 07:45:30'),
(8, 'PREFIJO_PAGO_COMPRA', 'PC-', 'Prefijo para pagos a proveedores', 'STRING', '2026-05-23 07:45:30'),
(9, 'PREFIJO_PAGO_VENTA', 'PV-', 'Prefijo para pagos/cobros de ventas', 'STRING', '2026-05-23 07:45:30'),
(10, 'PREFIJO_DEVOLUCION', 'DV-', 'Prefijo para devoluciones', 'STRING', '2026-05-23 07:45:30'),
(11, 'DIAS_ALERTA_VENCIMIENTO', '7', 'Días antes de vencimiento para alertar', 'INT', '2026-05-23 07:45:30'),
(12, 'PERMITIR_VENTA_SIN_STOCK', 'false', 'Permitir vender productos sin stock', 'BOOLEAN', '2026-05-23 07:45:30'),
(13, 'VALIDAR_LIMITE_CREDITO', 'true', 'Validar límite de crédito en ventas', 'BOOLEAN', '2026-05-23 07:45:30'),
(14, 'IMPRIMIR_AUTOMATICO', 'false', 'Imprimir factura automáticamente al emitir', 'BOOLEAN', '2026-05-23 07:45:30'),
(15, 'FORMATO_FACTURA', 'A4', 'Tamaño de impresión: A4 o TICKET', 'STRING', '2026-05-23 07:45:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `depositos`
--

CREATE TABLE `depositos` (
  `id_deposito` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('ALMACEN','DEPOSITO_PEQUENO','PUNTO_VENTA','TRANSITO') NOT NULL DEFAULT 'DEPOSITO_PEQUENO',
  `direccion` varchar(255) DEFAULT NULL,
  `encargado` varchar(120) DEFAULT NULL,
  `permite_venta` tinyint(1) NOT NULL DEFAULT 1,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `depositos`
--

INSERT INTO `depositos` (`id_deposito`, `id_sucursal`, `codigo`, `nombre`, `tipo`, `direccion`, `encargado`, `permite_venta`, `activo`, `fecha_creacion`) VALUES
(1, 1, 'GALLO18', 'Gallo 18 (Almacén)', 'ALMACEN', 'Calle Gallo #18', 'Por definir', 1, 1, '2026-05-23 07:45:30'),
(2, 1, 'GALLO20', 'Gallo 20 (Depósito)', 'DEPOSITO_PEQUENO', 'Calle Gallo #20', 'Por definir', 1, 1, '2026-05-23 07:45:30'),
(3, 2, 'VICTORIA', 'Punto de Venta Victoria', 'PUNTO_VENTA', 'Av. Victoria', 'Por definir', 1, 1, '2026-05-23 07:45:30'),
(4, 2, 'URKUPINA', 'Punto de Venta Urkupiña', 'PUNTO_VENTA', 'Av. Urkupiña', 'Por definir', 1, 1, '2026-05-23 07:45:30'),
(5, 2, 'EARCE', 'Punto de Venta E. Arce', 'PUNTO_VENTA', 'Av. Eduardo Arce', 'Por definir', 1, 1, '2026-05-23 07:45:30'),
(6, 2, 'PEMOSUR', 'Punto de Venta Pemosur', 'PUNTO_VENTA', 'Av. Pemosur', 'Por definir', 1, 1, '2026-05-23 07:45:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devoluciones_venta`
--

CREATE TABLE `devoluciones_venta` (
  `id_devolucion` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_venta` bigint(20) NOT NULL,
  `id_deposito` int(11) NOT NULL COMMENT 'A qué depósito vuelve la mercadería',
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `motivo` varchar(255) DEFAULT NULL,
  `total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `estado` enum('PENDIENTE','APROBADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  `id_usuario` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devolucion_venta_detalle`
--

CREATE TABLE `devolucion_venta_detalle` (
  `id_detalle` bigint(20) NOT NULL,
  `id_devolucion` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` decimal(14,2) NOT NULL,
  `precio_unitario` decimal(14,2) NOT NULL,
  `subtotal` decimal(14,2) NOT NULL,
  `motivo` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `empresas`
--

CREATE TABLE `empresas` (
  `id_empresa` int(11) NOT NULL,
  `razon_social` varchar(200) NOT NULL,
  `nombre_comercial` varchar(150) DEFAULT NULL,
  `nit` varchar(20) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `empresas`
--

INSERT INTO `empresas` (`id_empresa`, `razon_social`, `nombre_comercial`, `nit`, `direccion`, `telefono`, `email`, `logo_url`, `activo`, `fecha_creacion`) VALUES
(1, 'COMERCIAL ELECTRODOMÉSTICOS S.R.L.', 'ElectroHogar', '1234567890', 'Av. Principal #123, Santa Cruz', '3-3334444', 'contacto@electrohogar.bo', NULL, 1, '2026-05-23 07:45:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `gastos`
--

CREATE TABLE `gastos` (
  `id_gasto` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_categoria_gasto` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `id_proveedor` int(11) DEFAULT NULL COMMENT 'Opcional: si el gasto es a un proveedor registrado',
  `descripcion` varchar(255) NOT NULL,
  `fecha` date NOT NULL,
  `id_moneda` int(11) NOT NULL,
  `tipo_cambio` decimal(18,6) DEFAULT 1.000000,
  `monto` decimal(14,2) NOT NULL,
  `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','QR','CHEQUE','TARJETA','OTRO') NOT NULL,
  `numero_comprobante` varchar(60) DEFAULT NULL,
  `comprobante_url` varchar(255) DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `estado` enum('REGISTRADO','APROBADO','PAGADO','ANULADO') NOT NULL DEFAULT 'REGISTRADO',
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `kardex`
--

CREATE TABLE `kardex` (
  `id_kardex` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_deposito` int(11) NOT NULL,
  `id_tipo_movimiento` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `cantidad` decimal(14,2) NOT NULL,
  `costo_unitario` decimal(14,4) DEFAULT 0.0000,
  `saldo_cantidad` decimal(14,2) NOT NULL DEFAULT 0.00,
  `saldo_costo` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `documento_tipo` enum('COMPRA','VENTA','TRANSFERENCIA','AJUSTE','DEVOLUCION','APERTURA') NOT NULL,
  `documento_id` bigint(20) DEFAULT NULL,
  `documento_numero` varchar(40) DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `kardex`
--

INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES
(1, 1, 3, 9, '2026-05-23 07:45:30', 1.00, 3526.0000, 1.00, 3526.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(2, 1, 4, 9, '2026-05-23 07:45:30', 3.00, 3526.0000, 3.00, 3526.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(3, 2, 1, 9, '2026-05-23 07:45:30', 1.00, 4232.0000, 1.00, 4232.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(4, 2, 4, 9, '2026-05-23 07:45:30', 10.00, 4232.0000, 10.00, 4232.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(5, 3, 3, 9, '2026-05-23 07:45:30', 1.00, 529.0000, 1.00, 529.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(6, 3, 4, 9, '2026-05-23 07:45:30', 2.00, 529.0000, 2.00, 529.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(7, 4, 3, 9, '2026-05-23 07:45:30', 1.00, 458.0000, 1.00, 458.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(8, 4, 4, 9, '2026-05-23 07:45:30', 2.00, 458.0000, 2.00, 458.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(9, 5, 1, 9, '2026-05-23 07:45:30', 1.00, 247.0000, 1.00, 247.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(10, 5, 3, 9, '2026-05-23 07:45:30', 1.00, 247.0000, 1.00, 247.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(11, 5, 4, 9, '2026-05-23 07:45:30', 7.00, 247.0000, 7.00, 247.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(12, 6, 1, 9, '2026-05-23 07:45:30', 1.00, 353.0000, 1.00, 353.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(13, 6, 4, 9, '2026-05-23 07:45:30', 2.00, 353.0000, 2.00, 353.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(14, 7, 1, 9, '2026-05-23 07:45:30', 1.00, 504.0000, 1.00, 504.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(15, 7, 4, 9, '2026-05-23 07:45:30', 25.00, 504.0000, 25.00, 504.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(16, 8, 3, 9, '2026-05-23 07:45:30', 1.00, 3325.0000, 1.00, 3325.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(17, 8, 4, 9, '2026-05-23 07:45:30', 1.00, 3325.0000, 1.00, 3325.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(18, 9, 1, 9, '2026-05-23 07:45:30', 1.00, 554.0000, 1.00, 554.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(19, 10, 1, 9, '2026-05-23 07:45:30', 1.00, 247.0000, 1.00, 247.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(20, 10, 3, 9, '2026-05-23 07:45:30', 1.00, 247.0000, 1.00, 247.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(21, 10, 4, 9, '2026-05-23 07:45:30', 3.00, 247.0000, 3.00, 247.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(22, 11, 1, 9, '2026-05-23 07:45:30', 1.00, 4565.0000, 1.00, 4565.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(23, 11, 4, 9, '2026-05-23 07:45:30', 1.00, 4565.0000, 1.00, 4565.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(24, 12, 1, 9, '2026-05-23 07:45:30', 1.00, 4993.0000, 1.00, 4993.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(25, 12, 4, 9, '2026-05-23 07:45:30', 2.00, 4993.0000, 2.00, 4993.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(26, 13, 1, 9, '2026-05-23 07:45:30', 1.00, 5706.0000, 1.00, 5706.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(27, 13, 3, 9, '2026-05-23 07:45:30', 1.00, 5706.0000, 1.00, 5706.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(28, 13, 4, 9, '2026-05-23 07:45:30', 6.00, 5706.0000, 6.00, 5706.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(29, 14, 1, 9, '2026-05-23 07:45:30', 1.00, 6491.0000, 1.00, 6491.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel'),
(30, 14, 4, 9, '2026-05-23 07:45:30', 3.00, 6491.0000, 3.00, 6491.0000, 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `marcas`
--

CREATE TABLE `marcas` (
  `id_marca` int(11) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `pais_origen` varchar(60) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `marcas`
--

INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES
(1, 'ABBA', 'Bolivia', NULL, 1),
(2, 'BRASLAR', 'Brasil', NULL, 1),
(3, 'BLACK&DECKER', 'Estados Unidos', NULL, 1),
(4, 'CHALLENGER', 'Colombia', NULL, 1),
(5, 'CADSA', 'Bolivia', NULL, 1),
(6, 'CONSUL', 'Brasil', NULL, 1),
(7, 'WHIRLPOOL', 'Estados Unidos', NULL, 1),
(8, 'LG', 'Corea del Sur', NULL, 1),
(9, 'SAMSUNG', 'Corea del Sur', NULL, 1),
(10, 'MABE', 'México', NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modulos`
--

CREATE TABLE `modulos` (
  `id_modulo` int(11) NOT NULL,
  `codigo` varchar(40) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `icono` varchar(40) DEFAULT NULL,
  `orden` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `modulos`
--

INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES
(1, 'DASHBOARD', 'Dashboard', 'home', 1),
(2, 'CONFIGURACION', 'Configuración', 'settings', 2),
(3, 'USUARIOS', 'Usuarios y Roles', 'users', 3),
(4, 'PRODUCTOS', 'Productos', 'package', 4),
(5, 'PROVEEDORES', 'Proveedores', 'truck', 5),
(6, 'CLIENTES', 'Clientes', 'user-check', 6),
(7, 'COMPRAS', 'Compras', 'shopping-bag', 7),
(8, 'INVENTARIO', 'Inventario', 'archive', 8),
(9, 'VENTAS', 'Ventas', 'shopping-cart', 9),
(10, 'CAJA', 'Caja', 'dollar-sign', 10),
(11, 'GASTOS', 'Gastos', 'credit-card', 11),
(12, 'REPORTES', 'Reportes', 'bar-chart', 12),
(13, 'AUDITORIA', 'Auditoría', 'shield', 13);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `monedas`
--

CREATE TABLE `monedas` (
  `id_moneda` int(11) NOT NULL,
  `codigo` varchar(5) NOT NULL COMMENT 'ISO 4217: BOB, USD, EUR',
  `nombre` varchar(50) NOT NULL,
  `simbolo` varchar(5) NOT NULL,
  `decimales` tinyint(4) NOT NULL DEFAULT 2,
  `es_moneda_base` tinyint(1) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `monedas`
--

INSERT INTO `monedas` (`id_moneda`, `codigo`, `nombre`, `simbolo`, `decimales`, `es_moneda_base`, `activo`) VALUES
(1, 'BOB', 'Boliviano', 'Bs', 2, 1, 1),
(2, 'USD', 'Dólar EE.UU.', '$', 2, 0, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos_compra`
--

CREATE TABLE `pagos_compra` (
  `id_pago` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_compra` bigint(20) DEFAULT NULL,
  `id_cuota` bigint(20) DEFAULT NULL,
  `id_proveedor` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','QR','CHEQUE','TARJETA','OTRO') NOT NULL,
  `id_cuenta_proveedor` int(11) DEFAULT NULL COMMENT 'Cuenta a la que se pagó',
  `id_moneda` int(11) NOT NULL,
  `tipo_cambio` decimal(18,6) DEFAULT 1.000000,
  `monto` decimal(14,2) NOT NULL,
  `numero_referencia` varchar(60) DEFAULT NULL COMMENT 'N° transferencia, cheque, comprobante QR',
  `comprobante_url` varchar(255) DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos_venta`
--

CREATE TABLE `pagos_venta` (
  `id_pago` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_venta` bigint(20) DEFAULT NULL,
  `id_cuota` bigint(20) DEFAULT NULL,
  `id_cliente` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','QR','CHEQUE','TARJETA_DEBITO','TARJETA_CREDITO','OTRO') NOT NULL,
  `id_moneda` int(11) NOT NULL,
  `tipo_cambio` decimal(18,6) DEFAULT 1.000000,
  `monto` decimal(14,2) NOT NULL,
  `numero_referencia` varchar(60) DEFAULT NULL,
  `comprobante_url` varchar(255) DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permisos`
--

CREATE TABLE `permisos` (
  `id_permiso` int(11) NOT NULL,
  `id_modulo` int(11) NOT NULL,
  `codigo` varchar(80) NOT NULL COMMENT 'ej: ventas.crear, compras.aprobar',
  `nombre` varchar(120) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `permisos`
--

INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES
(1, 1, 'dashboard.ver', 'Ver Dashboard', 'Acceder al panel principal con indicadores'),
(2, 1, 'dashboard.ver_todas_sucursales', 'Ver Dashboard de todas las sucursales', 'Consolidar indicadores de todas las sucursales'),
(3, 2, 'configuracion.ver', 'Ver Configuración', 'Acceder al módulo de configuración'),
(4, 2, 'empresa.editar', 'Editar datos de Empresa', 'Modificar razón social, NIT, logo'),
(5, 2, 'sucursales.ver', 'Ver Sucursales', 'Listar sucursales'),
(6, 2, 'sucursales.crear', 'Crear Sucursal', 'Registrar nueva sucursal'),
(7, 2, 'sucursales.editar', 'Editar Sucursal', 'Modificar datos de sucursal'),
(8, 2, 'sucursales.eliminar', 'Eliminar/Desactivar Sucursal', 'Dar de baja una sucursal'),
(9, 2, 'depositos.ver', 'Ver Depósitos', 'Listar depósitos'),
(10, 2, 'depositos.crear', 'Crear Depósito', 'Registrar nuevo depósito o almacén'),
(11, 2, 'depositos.editar', 'Editar Depósito', 'Modificar datos de depósito'),
(12, 2, 'depositos.eliminar', 'Eliminar/Desactivar Depósito', 'Dar de baja un depósito'),
(13, 2, 'monedas.ver', 'Ver Monedas', 'Listar monedas configuradas'),
(14, 2, 'monedas.gestionar', 'Gestionar Monedas', 'Crear, editar y desactivar monedas'),
(15, 2, 'tipos_cambio.ver', 'Ver Tipos de Cambio', 'Consultar tipos de cambio'),
(16, 2, 'tipos_cambio.gestionar', 'Gestionar Tipos de Cambio', 'Registrar y actualizar tasas diarias'),
(17, 2, 'parametros.ver', 'Ver Parámetros del Sistema', 'Consultar configuración general'),
(18, 2, 'parametros.editar', 'Editar Parámetros del Sistema', 'Modificar IVA, prefijos, días alerta, etc.'),
(19, 3, 'usuarios.ver', 'Ver Usuarios', 'Listar usuarios del sistema'),
(20, 3, 'usuarios.crear', 'Crear Usuario', 'Registrar nuevo usuario'),
(21, 3, 'usuarios.editar', 'Editar Usuario', 'Modificar datos de usuario'),
(22, 3, 'usuarios.eliminar', 'Eliminar/Desactivar Usuario', 'Dar de baja un usuario'),
(23, 3, 'usuarios.resetear_password', 'Resetear Contraseña', 'Forzar cambio de contraseña a otro usuario'),
(24, 3, 'usuarios.asignar_sucursales', 'Asignar Sucursales', 'Definir a qué sucursales puede acceder un usuario'),
(25, 3, 'usuarios.cerrar_sesiones', 'Cerrar Sesiones', 'Invalidar sesiones activas de otros usuarios'),
(26, 3, 'roles.ver', 'Ver Roles', 'Listar roles existentes'),
(27, 3, 'roles.crear', 'Crear Rol', 'Registrar nuevo rol'),
(28, 3, 'roles.editar', 'Editar Rol', 'Modificar nombre y descripción de rol'),
(29, 3, 'roles.eliminar', 'Eliminar Rol', 'Eliminar un rol (no del sistema)'),
(30, 3, 'roles.asignar_permisos', 'Asignar Permisos a Rol', 'Configurar permisos por rol'),
(31, 3, 'permisos.ver', 'Ver Permisos', 'Consultar catálogo de permisos'),
(32, 4, 'productos.ver', 'Ver Productos', 'Listar y buscar productos'),
(33, 4, 'productos.crear', 'Crear Producto', 'Registrar nuevo producto'),
(34, 4, 'productos.editar', 'Editar Producto', 'Modificar datos generales del producto'),
(35, 4, 'productos.editar_precio', 'Editar Precio', 'Modificar precio real y precio público'),
(36, 4, 'productos.editar_costos', 'Editar Costos (LOG, MCM)', 'Modificar costos de logística y MCM'),
(37, 4, 'productos.editar_bono', 'Editar Bono Vendedor', 'Modificar bono asignado al producto'),
(38, 4, 'productos.eliminar', 'Eliminar/Desactivar Producto', 'Dar de baja un producto'),
(39, 4, 'productos.exportar', 'Exportar Productos', 'Exportar catálogo a Excel/PDF'),
(40, 4, 'productos.importar', 'Importar Productos', 'Carga masiva desde Excel'),
(41, 4, 'productos.ver_historico_precios', 'Ver Histórico de Precios', 'Consultar cambios históricos de precio'),
(42, 4, 'marcas.ver', 'Ver Marcas', 'Listar marcas'),
(43, 4, 'marcas.gestionar', 'Gestionar Marcas', 'Crear, editar y desactivar marcas'),
(44, 4, 'categorias.ver', 'Ver Categorías', 'Listar categorías'),
(45, 4, 'categorias.gestionar', 'Gestionar Categorías', 'Crear, editar y desactivar categorías'),
(46, 4, 'unidades.ver', 'Ver Unidades de Medida', 'Listar unidades de medida'),
(47, 4, 'unidades.gestionar', 'Gestionar Unidades de Medida', 'Crear, editar y desactivar unidades'),
(48, 5, 'proveedores.ver', 'Ver Proveedores', 'Listar proveedores'),
(49, 5, 'proveedores.crear', 'Crear Proveedor', 'Registrar nuevo proveedor'),
(50, 5, 'proveedores.editar', 'Editar Proveedor', 'Modificar datos de proveedor'),
(51, 5, 'proveedores.eliminar', 'Eliminar/Desactivar Proveedor', 'Dar de baja un proveedor'),
(52, 5, 'proveedores.ver_saldo', 'Ver Saldo del Proveedor', 'Consultar cuenta por pagar'),
(53, 5, 'proveedores.gestionar_cuentas', 'Gestionar Cuentas de Pago', 'Agregar/editar cuentas (efectivo, QR, banco)'),
(54, 5, 'proveedores.gestionar_contactos', 'Gestionar Contactos', 'Agregar y editar contactos del proveedor'),
(55, 5, 'proveedores.exportar', 'Exportar Proveedores', 'Exportar a Excel/PDF'),
(56, 6, 'clientes.ver', 'Ver Clientes', 'Listar y buscar clientes'),
(57, 6, 'clientes.crear', 'Crear Cliente', 'Registrar nuevo cliente'),
(58, 6, 'clientes.editar', 'Editar Cliente', 'Modificar datos de cliente'),
(59, 6, 'clientes.eliminar', 'Eliminar/Desactivar Cliente', 'Dar de baja un cliente'),
(60, 6, 'clientes.dar_credito', 'Otorgar Crédito', 'Activar permite_credito y definir límite'),
(61, 6, 'clientes.modificar_limite', 'Modificar Límite de Crédito', 'Cambiar el límite de crédito de un cliente'),
(62, 6, 'clientes.ver_saldo', 'Ver Saldo del Cliente', 'Consultar cuenta por cobrar'),
(63, 6, 'clientes.ver_historial', 'Ver Historial de Compras', 'Ver todas las ventas del cliente'),
(64, 6, 'clientes.gestionar_direcciones', 'Gestionar Direcciones', 'Agregar/editar direcciones de entrega'),
(65, 6, 'clientes.exportar', 'Exportar Clientes', 'Exportar a Excel/PDF'),
(66, 7, 'compras.ver', 'Ver Compras', 'Listar compras de su sucursal'),
(67, 7, 'compras.ver_todas', 'Ver Compras de Todas las Sucursales', 'Acceso a compras de cualquier sucursal'),
(68, 7, 'compras.crear_pre_pedido', 'Crear Pre-Pedido', 'Iniciar un pre-pedido a proveedor'),
(69, 7, 'compras.editar_pre_pedido', 'Editar Pre-Pedido', 'Modificar pre-pedido antes de confirmar'),
(70, 7, 'compras.confirmar_pedido', 'Confirmar Pedido (Por Llegar)', 'Pasar pre-pedido a estado por llegar'),
(71, 7, 'compras.aprobar', 'Aprobar Compra', 'Aprobar compras de alto monto'),
(72, 7, 'compras.recibir', 'Recibir Mercadería', 'Confirmar recepción y actualizar stock'),
(73, 7, 'compras.recibir_parcial', 'Recibir Mercadería Parcial', 'Permitir recepción parcial'),
(74, 7, 'compras.anular', 'Anular Compra', 'Cancelar/anular una compra'),
(75, 7, 'compras.ver_costos', 'Ver Costos de Compra', 'Visualizar precios reales y márgenes'),
(76, 7, 'compras.pagar', 'Registrar Pago a Proveedor', 'Registrar pago de una compra'),
(77, 7, 'compras.anular_pago', 'Anular Pago a Proveedor', 'Anular un pago registrado'),
(78, 7, 'compras.gestionar_cuotas', 'Gestionar Cuotas de Compra', 'Modificar plan de cuotas'),
(79, 7, 'compras.imprimir', 'Imprimir Documento de Compra', 'Generar PDF de orden de compra'),
(80, 7, 'compras.exportar', 'Exportar Compras', 'Exportar listado a Excel/PDF'),
(81, 8, 'inventario.ver', 'Ver Inventario', 'Consultar stock de su depósito asignado'),
(82, 8, 'inventario.ver_todos_depositos', 'Ver Inventario de Todos los Depósitos', 'Stock consolidado multi-depósito'),
(83, 8, 'inventario.ver_kardex', 'Ver Kardex', 'Consultar historial de movimientos'),
(84, 8, 'inventario.transferir_solicitar', 'Solicitar Transferencia', 'Crear solicitud de transferencia entre depósitos'),
(85, 8, 'inventario.transferir_enviar', 'Enviar Transferencia', 'Confirmar envío de mercadería'),
(86, 8, 'inventario.transferir_recibir', 'Recibir Transferencia', 'Confirmar recepción en depósito destino'),
(87, 8, 'inventario.transferir_anular', 'Anular Transferencia', 'Cancelar una transferencia'),
(88, 8, 'inventario.ajuste_crear', 'Crear Ajuste de Inventario', 'Registrar ajuste por conteo físico'),
(89, 8, 'inventario.ajuste_aprobar', 'Aprobar Ajuste de Inventario', 'Aprobar ajustes de stock'),
(90, 8, 'inventario.ajuste_anular', 'Anular Ajuste de Inventario', 'Cancelar un ajuste pendiente'),
(91, 8, 'inventario.stock_minimo_editar', 'Editar Stock Mínimo por Producto', 'Modificar umbral de alerta'),
(92, 8, 'inventario.alertas_ver', 'Ver Alertas de Stock Mínimo', 'Listar productos bajo stock mínimo'),
(93, 8, 'inventario.alertas_atender', 'Atender Alertas', 'Marcar alertas como atendidas'),
(94, 8, 'inventario.exportar', 'Exportar Inventario', 'Exportar reporte de stock a Excel'),
(95, 9, 'ventas.ver_propias', 'Ver Ventas Propias', 'Ver sólo las ventas que el vendedor realizó'),
(96, 9, 'ventas.ver_sucursal', 'Ver Ventas de la Sucursal', 'Ver todas las ventas de su sucursal'),
(97, 9, 'ventas.ver_todas', 'Ver Ventas de Todas las Sucursales', 'Ver ventas a nivel global'),
(98, 9, 'ventas.crear_menor', 'Crear Venta al Por Menor', 'Registrar venta minorista'),
(99, 9, 'ventas.crear_mayor', 'Crear Venta al Por Mayor', 'Registrar venta mayorista'),
(100, 9, 'ventas.editar_borrador', 'Editar Venta en Borrador', 'Modificar venta antes de emitirla'),
(101, 9, 'ventas.emitir', 'Emitir Venta', 'Confirmar y emitir la venta'),
(102, 9, 'ventas.aplicar_descuento', 'Aplicar Descuento', 'Otorgar descuento dentro de margen permitido'),
(103, 9, 'ventas.aplicar_descuento_alto', 'Aplicar Descuento Alto', 'Otorgar descuentos sobre el límite estándar'),
(104, 9, 'ventas.vender_credito', 'Vender a Crédito', 'Realizar ventas a crédito'),
(105, 9, 'ventas.aprobar_credito', 'Aprobar Crédito sobre Límite', 'Autorizar venta que excede el límite del cliente'),
(106, 9, 'ventas.cobrar', 'Registrar Cobro', 'Registrar pagos de ventas'),
(107, 9, 'ventas.anular_cobro', 'Anular Cobro', 'Anular un cobro registrado'),
(108, 9, 'ventas.anular', 'Anular Venta', 'Anular una venta emitida'),
(109, 9, 'ventas.devolucion_crear', 'Crear Devolución', 'Iniciar proceso de devolución'),
(110, 9, 'ventas.devolucion_aprobar', 'Aprobar Devolución', 'Aprobar devolución y reingresar stock'),
(111, 9, 'ventas.cambiar_vendedor', 'Cambiar Vendedor de la Venta', 'Reasignar vendedor'),
(112, 9, 'ventas.ver_utilidad', 'Ver Utilidad de la Venta', 'Visualizar costo y rentabilidad'),
(113, 9, 'ventas.imprimir', 'Imprimir/Reimprimir Factura', 'Generar PDF o reimprimir comprobante'),
(114, 9, 'ventas.exportar', 'Exportar Ventas', 'Exportar a Excel/PDF'),
(115, 10, 'caja.ver', 'Ver Cajas', 'Listar cajas configuradas'),
(116, 10, 'caja.gestionar', 'Gestionar Cajas', 'Crear, editar y desactivar cajas'),
(117, 10, 'caja.abrir', 'Abrir Caja', 'Iniciar turno de caja'),
(118, 10, 'caja.cerrar', 'Cerrar Caja', 'Cerrar turno y registrar arqueo'),
(119, 10, 'caja.ver_arqueo_propio', 'Ver Arqueo Propio', 'Ver sus propios arqueos'),
(120, 10, 'caja.ver_arqueo_todos', 'Ver Arqueos de Todos', 'Ver arqueos de todos los cajeros'),
(121, 10, 'caja.cuadrar_diferencia', 'Cuadrar Diferencia', 'Justificar diferencias en arqueo'),
(122, 10, 'caja.forzar_cierre', 'Forzar Cierre de Caja', 'Cerrar caja de otro usuario en casos especiales'),
(123, 10, 'caja.exportar', 'Exportar Arqueos', 'Exportar arqueos a Excel/PDF'),
(124, 11, 'gastos.ver', 'Ver Gastos', 'Listar gastos de su sucursal'),
(125, 11, 'gastos.ver_todos', 'Ver Gastos de Todas las Sucursales', 'Ver gastos a nivel global'),
(126, 11, 'gastos.crear', 'Registrar Gasto', 'Crear nuevo gasto'),
(127, 11, 'gastos.editar', 'Editar Gasto', 'Modificar gasto en estado REGISTRADO'),
(128, 11, 'gastos.aprobar', 'Aprobar Gasto', 'Aprobar gastos registrados'),
(129, 11, 'gastos.pagar', 'Marcar Gasto como Pagado', 'Registrar el pago del gasto'),
(130, 11, 'gastos.anular', 'Anular Gasto', 'Anular un gasto'),
(131, 11, 'gastos.categorias_ver', 'Ver Categorías de Gasto', 'Listar categorías'),
(132, 11, 'gastos.categorias_gestionar', 'Gestionar Categorías de Gasto', 'Crear, editar y desactivar categorías'),
(133, 11, 'gastos.adjuntar_comprobante', 'Adjuntar Comprobante', 'Subir comprobante de gasto'),
(134, 11, 'gastos.exportar', 'Exportar Gastos', 'Exportar a Excel/PDF'),
(135, 12, 'reportes.ver', 'Acceder a Reportes', 'Acceso general al módulo'),
(136, 12, 'reportes.stock_consolidado', 'Reporte Stock Consolidado', 'Ver stock por depósito (formato Excel)'),
(137, 12, 'reportes.ventas_periodo', 'Reporte Ventas por Período', 'Ventas filtradas por fecha'),
(138, 12, 'reportes.ventas_vendedor', 'Reporte Ventas por Vendedor', 'Ranking y detalle por vendedor'),
(139, 12, 'reportes.ventas_producto', 'Reporte Ventas por Producto', 'Top productos vendidos'),
(140, 12, 'reportes.ventas_cliente', 'Reporte Ventas por Cliente', 'Compras por cliente'),
(141, 12, 'reportes.compras_periodo', 'Reporte Compras por Período', 'Compras filtradas por fecha'),
(142, 12, 'reportes.compras_proveedor', 'Reporte Compras por Proveedor', 'Total comprado por proveedor'),
(143, 12, 'reportes.cuentas_cobrar', 'Reporte Cuentas por Cobrar', 'Clientes con saldo pendiente'),
(144, 12, 'reportes.cuentas_pagar', 'Reporte Cuentas por Pagar', 'Proveedores con saldo pendiente'),
(145, 12, 'reportes.alertas_stock', 'Reporte Alertas Stock Mínimo', 'Productos bajo stock mínimo'),
(146, 12, 'reportes.kardex', 'Reporte Kardex por Producto', 'Movimientos detallados de un producto'),
(147, 12, 'reportes.rentabilidad', 'Reporte Rentabilidad', 'Utilidad por producto/marca/categoría'),
(148, 12, 'reportes.estado_resultados', 'Reporte Estado de Resultados', 'Ingresos - costos - gastos'),
(149, 12, 'reportes.bonos_vendedores', 'Reporte Bonos a Vendedores', 'Bonos generados por vendedor'),
(150, 12, 'reportes.arqueos_caja', 'Reporte Arqueos de Caja', 'Arqueos por sucursal/período'),
(151, 12, 'reportes.gastos_categoria', 'Reporte Gastos por Categoría', 'Distribución de gastos'),
(152, 12, 'reportes.transferencias', 'Reporte Transferencias', 'Histórico de transferencias entre depósitos'),
(153, 12, 'reportes.devoluciones', 'Reporte Devoluciones', 'Devoluciones por período/causa'),
(154, 12, 'reportes.exportar', 'Exportar Reportes', 'Descargar reportes en Excel/PDF'),
(155, 12, 'reportes.dashboard_financiero', 'Dashboard Financiero', 'Indicadores financieros consolidados'),
(156, 13, 'auditoria.ver', 'Ver Auditoría', 'Acceder al log de auditoría'),
(157, 13, 'auditoria.filtrar', 'Filtrar Auditoría', 'Filtrar por usuario, tabla, fecha'),
(158, 13, 'auditoria.exportar', 'Exportar Auditoría', 'Exportar log a Excel/PDF'),
(159, 13, 'sesiones.ver', 'Ver Sesiones Activas', 'Ver usuarios conectados'),
(160, 13, 'sesiones.cerrar', 'Cerrar Sesiones Activas', 'Forzar cierre de sesión');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id_producto` int(11) NOT NULL,
  `codigo_interno` varchar(40) NOT NULL,
  `codigo_barras` varchar(60) DEFAULT NULL,
  `id_marca` int(11) NOT NULL,
  `id_categoria` int(11) NOT NULL,
  `id_unidad` int(11) NOT NULL,
  `producto` varchar(120) NOT NULL COMMENT 'Tipo: COCINA DE PISO, FREIDORA DE AIRE, etc.',
  `detalle` varchar(255) DEFAULT NULL COMMENT 'Ej: 4H MESAVIDRIO E.E. GRILL ELEC.',
  `capacidad` varchar(40) DEFAULT NULL COMMENT 'Ej: 2 Lts, 60 CM, 250 Lts',
  `caracteristicas` varchar(255) DEFAULT NULL,
  `modelo` varchar(80) DEFAULT NULL,
  `color` varchar(40) DEFAULT NULL,
  `id_moneda_costo` int(11) NOT NULL,
  `precio_real` decimal(14,2) NOT NULL DEFAULT 0.00 COMMENT 'REAL BS - costo base',
  `costo_logistica` decimal(14,2) NOT NULL DEFAULT 0.00 COMMENT 'LOG',
  `costo_mcm` decimal(14,2) NOT NULL DEFAULT 0.00 COMMENT 'MCM - carga adicional',
  `costo_total` decimal(14,2) GENERATED ALWAYS AS (`precio_real` + `costo_logistica` + `costo_mcm`) STORED,
  `precio_publico` decimal(14,2) NOT NULL DEFAULT 0.00,
  `utilidad` decimal(14,2) GENERATED ALWAYS AS (`precio_publico` - (`precio_real` + `costo_logistica` + `costo_mcm`)) STORED,
  `bono` decimal(14,2) NOT NULL DEFAULT 0.00 COMMENT 'Bono para vendedor',
  `precio_mayor` decimal(14,2) DEFAULT 0.00,
  `id_proveedor_default` int(11) DEFAULT NULL,
  `stock_minimo` decimal(14,2) NOT NULL DEFAULT 0.00,
  `stock_maximo` decimal(14,2) DEFAULT 0.00,
  `imagen_url` varchar(255) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_modificacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `precio_publico`, `bono`, `precio_mayor`, `id_proveedor_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES
(1, 'P0001', NULL, 1, 2, 1, 'COCINA DE PISO 4H', 'MESAVIDRIO E.E. GRILL ELEC.', NULL, NULL, 'AG202-3TC', 'NEGRO', 1, 3500.00, 26.00, 0.00, 3710.00, 30.00, 0.00, 1, 2.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(2, 'P0002', NULL, 1, 2, 1, 'COCINA DE PISO 6H', 'MESAVIDRIO E.E. GRILL ELEC.', NULL, NULL, 'RG803-5GT', 'NEGRO', 1, 4200.00, 32.00, 0.00, 4452.00, 30.00, 0.00, 1, 2.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(3, 'P0003', NULL, 1, 3, 1, 'COCINA DE MESA 4H', 'E.E. MESON DE LOZA', NULL, NULL, 'SG-400NEE', 'NEGRO', 1, 525.00, 4.00, 0.00, 600.00, 10.00, 0.00, 1, 2.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(4, 'P0004', NULL, 1, 3, 1, 'COCINA DE MESA 4H', 'S/E.E. MESON DE LOZA', NULL, NULL, 'SB-400QL', 'NEGRO', 1, 455.00, 3.00, 0.00, 500.00, 10.00, 0.00, 1, 2.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(5, 'P0005', NULL, 1, 3, 1, 'COCINA DE MESA 2H', 'MESON DE LOZA', NULL, NULL, 'ST-200', 'NEGRO', 1, 245.00, 2.00, 0.00, 300.00, 10.00, 0.00, 1, 3.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(6, 'P0006', NULL, 2, 3, 1, 'COCINA DE MESA 4H', 'MESON DE ACERO INOX.', NULL, NULL, 'JUNIOR', 'BLANCO', 1, 350.00, 3.00, 0.00, 400.00, 10.00, 0.00, 1, 2.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(7, 'P0007', NULL, 3, 9, 1, 'FREIDORA DE AIRE', 'CIRCULACION AIRE RAPIDO', '2 Lts', NULL, 'HF-100WDCL', 'BLANCO', 1, 500.00, 4.00, 0.00, 530.00, 10.00, 0.00, 1, 5.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(8, 'P0008', NULL, 4, 4, 1, 'HORNO DE EMPOTRAR', 'ELEC. C/VENTILADOR', '60 CM', NULL, 'HG-2562', 'NEGRO', 1, 3300.00, 25.00, 0.00, 3498.00, 50.00, 0.00, 1, 1.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(9, 'P0009', NULL, 4, 12, 1, 'EXTRACTORA DE GRASA', '1 MOTOR, 3 VEL. ANALÓGICO', '76 CM', NULL, 'CX-4500', 'INOX', 1, 550.00, 4.00, 0.00, 600.00, 20.00, 0.00, 1, 1.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(10, 'P0010', NULL, 5, 3, 1, 'COCINA DE MESA 2H', 'MESA DE ACERO INOX.', NULL, NULL, 'CM-02', 'BLANCO', 1, 245.00, 2.00, 0.00, 300.00, 10.00, 0.00, 3, 2.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(11, 'P0011', NULL, 6, 6, 1, 'CONGELADOR HORIZONTAL', '1 PUERTA DUAL INT. BLANCO', '250 Lts', NULL, 'CHA-22BDWX', 'BLANCO', 1, 4531.00, 34.00, 0.00, 4803.00, 50.00, 0.00, 2, 1.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(12, 'P0012', NULL, 6, 6, 1, 'CONGELADOR HORIZONTAL', '1 PUERTA DUAL INT. BLANCO', '310 Lts', NULL, 'CHA-31BDWX', 'BLANCO', 1, 4956.00, 37.00, 0.00, 5253.00, 50.00, 0.00, 2, 1.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(13, 'P0013', NULL, 6, 6, 1, 'CONGELADOR HORIZONTAL', '1 PUERTA DUAL INT. BLANCO', '420 Lts', NULL, 'CHB-42BDWX', 'BLANCO', 1, 5664.00, 42.00, 0.00, 6004.00, 50.00, 0.00, 2, 1.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(14, 'P0014', NULL, 6, 6, 1, 'CONGELADOR HORIZONTAL', '1 PUERTA DUAL INT. BLANCO', '530 Lts', NULL, 'CHB-53BDWX', 'BLANCO', 1, 6443.00, 48.00, 0.00, 6830.00, 50.00, 0.00, 2, 1.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30'),
(15, 'P0015', NULL, 6, 6, 1, 'CONGELADOR VERTICAL', '1 PUERTA DUAL INT. BLANCO', '280 Lts', NULL, 'CVG28HBDWX', 'BLANCO', 1, 5522.00, 41.00, 0.00, 5853.00, 50.00, 0.00, 2, 1.00, 0.00, NULL, NULL, 1, '2026-05-23 07:45:30', '2026-05-23 07:45:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_precio_historico`
--

CREATE TABLE `producto_precio_historico` (
  `id_historico` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `precio_real_ant` decimal(14,2) DEFAULT NULL,
  `precio_real_nuevo` decimal(14,2) DEFAULT NULL,
  `precio_pub_ant` decimal(14,2) DEFAULT NULL,
  `precio_pub_nuevo` decimal(14,2) DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `id_proveedor` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `razon_social` varchar(200) NOT NULL,
  `nombre_comercial` varchar(150) DEFAULT NULL,
  `nit` varchar(20) DEFAULT NULL,
  `tipo_proveedor` enum('NACIONAL','INTERNACIONAL') DEFAULT 'NACIONAL',
  `direccion` varchar(255) DEFAULT NULL,
  `ciudad` varchar(80) DEFAULT NULL,
  `pais` varchar(80) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `contacto_principal` varchar(120) DEFAULT NULL,
  `plazo_credito_dias` int(11) DEFAULT 0,
  `saldo_actual` decimal(14,2) DEFAULT 0.00,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `proveedores`
--

INSERT INTO `proveedores` (`id_proveedor`, `codigo`, `razon_social`, `nombre_comercial`, `nit`, `tipo_proveedor`, `direccion`, `ciudad`, `pais`, `telefono`, `email`, `contacto_principal`, `plazo_credito_dias`, `saldo_actual`, `activo`, `fecha_creacion`) VALUES
(1, 'PROV-001', 'ROSVANIA S.R.L.', 'ROSVANIA', '1111111111', 'NACIONAL', 'Av. Comercial #100', 'Santa Cruz', 'Bolivia', '3-3001001', 'ventas@rosvania.bo', 'Por definir', 30, 0.00, 1, '2026-05-23 07:45:30'),
(2, 'PROV-002', 'DISMATEC IMPORTACIONES', 'DISMATEC', '2222222222', 'NACIONAL', 'Av. Industrial #50', 'La Paz', 'Bolivia', '2-2002002', 'ventas@dismatec.bo', 'Por definir', 45, 0.00, 1, '2026-05-23 07:45:30'),
(3, 'PROV-003', 'SOTO DISTRIBUCIONES', 'SOTO', '3333333333', 'NACIONAL', 'Calle Comercio #25', 'Santa Cruz', 'Bolivia', '3-3003003', 'ventas@soto.bo', 'Por definir', 30, 0.00, 1, '2026-05-23 07:45:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedor_contactos`
--

CREATE TABLE `proveedor_contactos` (
  `id_contacto` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `cargo` varchar(80) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedor_cuentas_pago`
--

CREATE TABLE `proveedor_cuentas_pago` (
  `id_cuenta` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL,
  `metodo` enum('EFECTIVO','TRANSFERENCIA','QR','CHEQUE','OTRO') NOT NULL,
  `banco` varchar(80) DEFAULT NULL,
  `tipo_cuenta` varchar(30) DEFAULT NULL,
  `numero_cuenta` varchar(60) DEFAULT NULL,
  `titular` varchar(150) DEFAULT NULL,
  `qr_url` varchar(255) DEFAULT NULL,
  `id_moneda` int(11) DEFAULT NULL,
  `es_principal` tinyint(1) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `proveedor_cuentas_pago`
--

INSERT INTO `proveedor_cuentas_pago` (`id_cuenta`, `id_proveedor`, `metodo`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular`, `qr_url`, `id_moneda`, `es_principal`, `activo`) VALUES
(1, 1, 'TRANSFERENCIA', 'Banco Mercantil Santa Cruz', 'CORRIENTE', '0000000001', 'ROSVANIA S.R.L.', NULL, 1, 1, 1),
(2, 1, 'QR', NULL, NULL, NULL, 'ROSVANIA S.R.L.', NULL, 1, 0, 1),
(3, 1, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, 1, 0, 1),
(4, 2, 'TRANSFERENCIA', 'Banco Nacional de Bolivia', 'CORRIENTE', '0000000002', 'DISMATEC IMPORTACIONES', NULL, 1, 1, 1),
(5, 2, 'QR', NULL, NULL, NULL, 'DISMATEC IMPORTACIONES', NULL, 1, 0, 1),
(6, 3, 'TRANSFERENCIA', 'Banco Unión', 'CORRIENTE', '0000000003', 'SOTO DISTRIBUCIONES', NULL, 1, 1, 1),
(7, 3, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, 1, 0, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id_rol` int(11) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `es_sistema` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = no se puede eliminar',
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id_rol`, `nombre`, `descripcion`, `es_sistema`, `activo`) VALUES
(1, 'ADMINISTRADOR', 'Dueño / Administrador del negocio. Acceso total al sistema.', 1, 1),
(2, 'VENDEDOR', 'Realiza ventas al por mayor y menor, gestiona clientes y cobros.', 0, 1),
(3, 'ALMACENERO', 'Controla inventario, recibe mercadería de compras y gestiona transferencias.', 0, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol_permiso`
--

CREATE TABLE `rol_permiso` (
  `id_rol` int(11) NOT NULL,
  `id_permiso` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `rol_permiso`
--

INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(1, 5),
(1, 6),
(1, 7),
(1, 8),
(1, 9),
(1, 10),
(1, 11),
(1, 12),
(1, 13),
(1, 14),
(1, 15),
(1, 16),
(1, 17),
(1, 18),
(1, 19),
(1, 20),
(1, 21),
(1, 22),
(1, 23),
(1, 24),
(1, 25),
(1, 26),
(1, 27),
(1, 28),
(1, 29),
(1, 30),
(1, 31),
(1, 32),
(1, 33),
(1, 34),
(1, 35),
(1, 36),
(1, 37),
(1, 38),
(1, 39),
(1, 40),
(1, 41),
(1, 42),
(1, 43),
(1, 44),
(1, 45),
(1, 46),
(1, 47),
(1, 48),
(1, 49),
(1, 50),
(1, 51),
(1, 52),
(1, 53),
(1, 54),
(1, 55),
(1, 56),
(1, 57),
(1, 58),
(1, 59),
(1, 60),
(1, 61),
(1, 62),
(1, 63),
(1, 64),
(1, 65),
(1, 66),
(1, 67),
(1, 68),
(1, 69),
(1, 70),
(1, 71),
(1, 72),
(1, 73),
(1, 74),
(1, 75),
(1, 76),
(1, 77),
(1, 78),
(1, 79),
(1, 80),
(1, 81),
(1, 82),
(1, 83),
(1, 84),
(1, 85),
(1, 86),
(1, 87),
(1, 88),
(1, 89),
(1, 90),
(1, 91),
(1, 92),
(1, 93),
(1, 94),
(1, 95),
(1, 96),
(1, 97),
(1, 98),
(1, 99),
(1, 100),
(1, 101),
(1, 102),
(1, 103),
(1, 104),
(1, 105),
(1, 106),
(1, 107),
(1, 108),
(1, 109),
(1, 110),
(1, 111),
(1, 112),
(1, 113),
(1, 114),
(1, 115),
(1, 116),
(1, 117),
(1, 118),
(1, 119),
(1, 120),
(1, 121),
(1, 122),
(1, 123),
(1, 124),
(1, 125),
(1, 126),
(1, 127),
(1, 128),
(1, 129),
(1, 130),
(1, 131),
(1, 132),
(1, 133),
(1, 134),
(1, 135),
(1, 136),
(1, 137),
(1, 138),
(1, 139),
(1, 140),
(1, 141),
(1, 142),
(1, 143),
(1, 144),
(1, 145),
(1, 146),
(1, 147),
(1, 148),
(1, 149),
(1, 150),
(1, 151),
(1, 152),
(1, 153),
(1, 154),
(1, 155),
(1, 156),
(1, 157),
(1, 158),
(1, 159),
(1, 160),
(2, 1),
(2, 32),
(2, 42),
(2, 44),
(2, 46),
(2, 56),
(2, 57),
(2, 58),
(2, 60),
(2, 62),
(2, 63),
(2, 64),
(2, 65),
(2, 81),
(2, 82),
(2, 92),
(2, 95),
(2, 96),
(2, 98),
(2, 99),
(2, 100),
(2, 101),
(2, 102),
(2, 104),
(2, 106),
(2, 109),
(2, 113),
(2, 114),
(2, 115),
(2, 117),
(2, 118),
(2, 119),
(2, 121),
(2, 135),
(2, 137),
(2, 139),
(2, 140),
(2, 150),
(2, 154),
(3, 1),
(3, 32),
(3, 42),
(3, 44),
(3, 46),
(3, 48),
(3, 66),
(3, 72),
(3, 73),
(3, 79),
(3, 81),
(3, 82),
(3, 83),
(3, 84),
(3, 85),
(3, 86),
(3, 88),
(3, 91),
(3, 92),
(3, 93),
(3, 94),
(3, 135),
(3, 136),
(3, 145),
(3, 146),
(3, 152),
(3, 154);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sesiones`
--

CREATE TABLE `sesiones` (
  `id_sesion` bigint(20) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `ip_origen` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `fecha_inicio` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_expiracion` datetime DEFAULT NULL,
  `cerrada` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `stock`
--

CREATE TABLE `stock` (
  `id_stock` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_deposito` int(11) NOT NULL,
  `cantidad` decimal(14,2) NOT NULL DEFAULT 0.00,
  `cantidad_reservada` decimal(14,2) NOT NULL DEFAULT 0.00 COMMENT 'En proceso de venta/transferencia',
  `cantidad_disponible` decimal(14,2) GENERATED ALWAYS AS (`cantidad` - `cantidad_reservada`) STORED,
  `costo_promedio` decimal(14,4) DEFAULT 0.0000,
  `fecha_ult_movimiento` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `stock`
--

INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `costo_promedio`, `fecha_ult_movimiento`) VALUES
(1, 1, 1, 0.00, 0.00, 3526.0000, '2026-05-23 07:45:30'),
(2, 1, 2, 0.00, 0.00, 3526.0000, '2026-05-23 07:45:30'),
(3, 1, 3, 1.00, 0.00, 3526.0000, '2026-05-23 07:45:30'),
(4, 1, 4, 3.00, 0.00, 3526.0000, '2026-05-23 07:45:30'),
(5, 1, 5, 0.00, 0.00, 3526.0000, '2026-05-23 07:45:30'),
(6, 1, 6, 0.00, 0.00, 3526.0000, '2026-05-23 07:45:30'),
(7, 2, 1, 1.00, 0.00, 4232.0000, '2026-05-23 07:45:30'),
(8, 2, 2, 0.00, 0.00, 4232.0000, '2026-05-23 07:45:30'),
(9, 2, 3, 0.00, 0.00, 4232.0000, '2026-05-23 07:45:30'),
(10, 2, 4, 10.00, 0.00, 4232.0000, '2026-05-23 07:45:30'),
(11, 2, 5, 0.00, 0.00, 4232.0000, '2026-05-23 07:45:30'),
(12, 2, 6, 0.00, 0.00, 4232.0000, '2026-05-23 07:45:30'),
(13, 3, 1, 0.00, 0.00, 529.0000, '2026-05-23 07:45:30'),
(14, 3, 2, 0.00, 0.00, 529.0000, '2026-05-23 07:45:30'),
(15, 3, 3, 1.00, 0.00, 529.0000, '2026-05-23 07:45:30'),
(16, 3, 4, 2.00, 0.00, 529.0000, '2026-05-23 07:45:30'),
(17, 3, 5, 0.00, 0.00, 529.0000, '2026-05-23 07:45:30'),
(18, 3, 6, 0.00, 0.00, 529.0000, '2026-05-23 07:45:30'),
(19, 4, 1, 0.00, 0.00, 458.0000, '2026-05-23 07:45:30'),
(20, 4, 2, 0.00, 0.00, 458.0000, '2026-05-23 07:45:30'),
(21, 4, 3, 1.00, 0.00, 458.0000, '2026-05-23 07:45:30'),
(22, 4, 4, 2.00, 0.00, 458.0000, '2026-05-23 07:45:30'),
(23, 4, 5, 0.00, 0.00, 458.0000, '2026-05-23 07:45:30'),
(24, 4, 6, 0.00, 0.00, 458.0000, '2026-05-23 07:45:30'),
(25, 5, 1, 1.00, 0.00, 247.0000, '2026-05-23 07:45:30'),
(26, 5, 2, 0.00, 0.00, 247.0000, '2026-05-23 07:45:30'),
(27, 5, 3, 1.00, 0.00, 247.0000, '2026-05-23 07:45:30'),
(28, 5, 4, 7.00, 0.00, 247.0000, '2026-05-23 07:45:30'),
(29, 5, 5, 0.00, 0.00, 247.0000, '2026-05-23 07:45:30'),
(30, 5, 6, 0.00, 0.00, 247.0000, '2026-05-23 07:45:30'),
(31, 6, 1, 1.00, 0.00, 353.0000, '2026-05-23 07:45:30'),
(32, 6, 2, 0.00, 0.00, 353.0000, '2026-05-23 07:45:30'),
(33, 6, 3, 0.00, 0.00, 353.0000, '2026-05-23 07:45:30'),
(34, 6, 4, 2.00, 0.00, 353.0000, '2026-05-23 07:45:30'),
(35, 6, 5, 0.00, 0.00, 353.0000, '2026-05-23 07:45:30'),
(36, 6, 6, 0.00, 0.00, 353.0000, '2026-05-23 07:45:30'),
(37, 7, 1, 1.00, 0.00, 504.0000, '2026-05-23 07:45:30'),
(38, 7, 2, 0.00, 0.00, 504.0000, '2026-05-23 07:45:30'),
(39, 7, 3, 0.00, 0.00, 504.0000, '2026-05-23 07:45:30'),
(40, 7, 4, 25.00, 0.00, 504.0000, '2026-05-23 07:45:30'),
(41, 7, 5, 0.00, 0.00, 504.0000, '2026-05-23 07:45:30'),
(42, 7, 6, 0.00, 0.00, 504.0000, '2026-05-23 07:45:30'),
(43, 8, 1, 0.00, 0.00, 3325.0000, '2026-05-23 07:45:30'),
(44, 8, 2, 0.00, 0.00, 3325.0000, '2026-05-23 07:45:30'),
(45, 8, 3, 1.00, 0.00, 3325.0000, '2026-05-23 07:45:30'),
(46, 8, 4, 1.00, 0.00, 3325.0000, '2026-05-23 07:45:30'),
(47, 8, 5, 0.00, 0.00, 3325.0000, '2026-05-23 07:45:30'),
(48, 8, 6, 0.00, 0.00, 3325.0000, '2026-05-23 07:45:30'),
(49, 9, 1, 1.00, 0.00, 554.0000, '2026-05-23 07:45:30'),
(50, 9, 2, 0.00, 0.00, 554.0000, '2026-05-23 07:45:30'),
(51, 9, 3, 0.00, 0.00, 554.0000, '2026-05-23 07:45:30'),
(52, 9, 4, 0.00, 0.00, 554.0000, '2026-05-23 07:45:30'),
(53, 9, 5, 0.00, 0.00, 554.0000, '2026-05-23 07:45:30'),
(54, 9, 6, 0.00, 0.00, 554.0000, '2026-05-23 07:45:30'),
(55, 10, 1, 1.00, 0.00, 247.0000, '2026-05-23 07:45:30'),
(56, 10, 2, 0.00, 0.00, 247.0000, '2026-05-23 07:45:30'),
(57, 10, 3, 1.00, 0.00, 247.0000, '2026-05-23 07:45:30'),
(58, 10, 4, 3.00, 0.00, 247.0000, '2026-05-23 07:45:30'),
(59, 10, 5, 0.00, 0.00, 247.0000, '2026-05-23 07:45:30'),
(60, 10, 6, 0.00, 0.00, 247.0000, '2026-05-23 07:45:30'),
(61, 11, 1, 1.00, 0.00, 4565.0000, '2026-05-23 07:45:30'),
(62, 11, 2, 0.00, 0.00, 4565.0000, '2026-05-23 07:45:30'),
(63, 11, 3, 0.00, 0.00, 4565.0000, '2026-05-23 07:45:30'),
(64, 11, 4, 1.00, 0.00, 4565.0000, '2026-05-23 07:45:30'),
(65, 11, 5, 0.00, 0.00, 4565.0000, '2026-05-23 07:45:30'),
(66, 11, 6, 0.00, 0.00, 4565.0000, '2026-05-23 07:45:30'),
(67, 12, 1, 1.00, 0.00, 4993.0000, '2026-05-23 07:45:30'),
(68, 12, 2, 0.00, 0.00, 4993.0000, '2026-05-23 07:45:30'),
(69, 12, 3, 0.00, 0.00, 4993.0000, '2026-05-23 07:45:30'),
(70, 12, 4, 2.00, 0.00, 4993.0000, '2026-05-23 07:45:30'),
(71, 12, 5, 0.00, 0.00, 4993.0000, '2026-05-23 07:45:30'),
(72, 12, 6, 0.00, 0.00, 4993.0000, '2026-05-23 07:45:30'),
(73, 13, 1, 1.00, 0.00, 5706.0000, '2026-05-23 07:45:30'),
(74, 13, 2, 0.00, 0.00, 5706.0000, '2026-05-23 07:45:30'),
(75, 13, 3, 1.00, 0.00, 5706.0000, '2026-05-23 07:45:30'),
(76, 13, 4, 6.00, 0.00, 5706.0000, '2026-05-23 07:45:30'),
(77, 13, 5, 0.00, 0.00, 5706.0000, '2026-05-23 07:45:30'),
(78, 13, 6, 0.00, 0.00, 5706.0000, '2026-05-23 07:45:30'),
(79, 14, 1, 1.00, 0.00, 6491.0000, '2026-05-23 07:45:30'),
(80, 14, 2, 0.00, 0.00, 6491.0000, '2026-05-23 07:45:30'),
(81, 14, 3, 0.00, 0.00, 6491.0000, '2026-05-23 07:45:30'),
(82, 14, 4, 3.00, 0.00, 6491.0000, '2026-05-23 07:45:30'),
(83, 14, 5, 0.00, 0.00, 6491.0000, '2026-05-23 07:45:30'),
(84, 14, 6, 0.00, 0.00, 6491.0000, '2026-05-23 07:45:30'),
(85, 15, 1, 0.00, 0.00, 5563.0000, '2026-05-23 07:45:30'),
(86, 15, 2, 0.00, 0.00, 5563.0000, '2026-05-23 07:45:30'),
(87, 15, 3, 0.00, 0.00, 5563.0000, '2026-05-23 07:45:30'),
(88, 15, 4, 0.00, 0.00, 5563.0000, '2026-05-23 07:45:30'),
(89, 15, 5, 0.00, 0.00, 5563.0000, '2026-05-23 07:45:30'),
(90, 15, 6, 0.00, 0.00, 5563.0000, '2026-05-23 07:45:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sucursales`
--

CREATE TABLE `sucursales` (
  `id_sucursal` int(11) NOT NULL,
  `id_empresa` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('PRINCIPAL','SUCURSAL') NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `ciudad` varchar(80) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `responsable` varchar(120) DEFAULT NULL,
  `es_punto_venta` tinyint(1) NOT NULL DEFAULT 1,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sucursales`
--

INSERT INTO `sucursales` (`id_sucursal`, `id_empresa`, `codigo`, `nombre`, `tipo`, `direccion`, `ciudad`, `telefono`, `responsable`, `es_punto_venta`, `activo`, `fecha_creacion`) VALUES
(1, 1, 'SUC-PRI', 'Sucursal Principal Gallo', 'PRINCIPAL', 'Av. Gallo #18-20', 'Santa Cruz', '3-3334444', 'Por definir', 1, 1, '2026-05-23 07:45:30'),
(2, 1, 'SUC-CEN', 'Sucursal Centro', 'SUCURSAL', 'Zona Centro - Multipunto', 'Santa Cruz', '3-3335555', 'Por definir', 1, 1, '2026-05-23 07:45:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipos_cambio`
--

CREATE TABLE `tipos_cambio` (
  `id_tipo_cambio` int(11) NOT NULL,
  `id_moneda_origen` int(11) NOT NULL,
  `id_moneda_destino` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `tasa_compra` decimal(18,6) NOT NULL,
  `tasa_venta` decimal(18,6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tipos_cambio`
--

INSERT INTO `tipos_cambio` (`id_tipo_cambio`, `id_moneda_origen`, `id_moneda_destino`, `fecha`, `tasa_compra`, `tasa_venta`) VALUES
(1, 2, 1, '2026-05-23', 6.860000, 6.960000);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipos_movimiento`
--

CREATE TABLE `tipos_movimiento` (
  `id_tipo_movimiento` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `efecto` enum('ENTRADA','SALIDA','TRANSFERENCIA','AJUSTE') NOT NULL,
  `afecta_costo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tipos_movimiento`
--

INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES
(1, 'COMPRA', 'Entrada por Compra', 'ENTRADA', 1),
(2, 'VENTA', 'Salida por Venta', 'SALIDA', 0),
(3, 'DEVOLUCION_VTA', 'Entrada por Devolución de Venta', 'ENTRADA', 0),
(4, 'DEVOLUCION_CMP', 'Salida por Devolución a Proveedor', 'SALIDA', 1),
(5, 'TRANSFERENCIA_SAL', 'Salida por Transferencia', 'TRANSFERENCIA', 0),
(6, 'TRANSFERENCIA_ENT', 'Entrada por Transferencia', 'TRANSFERENCIA', 0),
(7, 'AJUSTE_POS', 'Ajuste Positivo de Inventario', 'AJUSTE', 1),
(8, 'AJUSTE_NEG', 'Ajuste Negativo de Inventario', 'AJUSTE', 1),
(9, 'APERTURA', 'Apertura/Inventario Inicial', 'ENTRADA', 1),
(10, 'MERMA', 'Salida por Merma o Pérdida', 'SALIDA', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `transferencias`
--

CREATE TABLE `transferencias` (
  `id_transferencia` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_deposito_origen` int(11) NOT NULL,
  `id_deposito_destino` int(11) NOT NULL,
  `fecha_solicitud` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_envio` datetime DEFAULT NULL,
  `fecha_recepcion` datetime DEFAULT NULL,
  `estado` enum('SOLICITADA','EN_TRANSITO','RECIBIDA','PARCIAL','ANULADA') NOT NULL DEFAULT 'SOLICITADA',
  `id_usuario_solicita` int(11) DEFAULT NULL,
  `id_usuario_envia` int(11) DEFAULT NULL,
  `id_usuario_recibe` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `transferencia_detalle`
--

CREATE TABLE `transferencia_detalle` (
  `id_detalle` bigint(20) NOT NULL,
  `id_transferencia` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad_enviada` decimal(14,2) NOT NULL,
  `cantidad_recibida` decimal(14,2) DEFAULT 0.00,
  `observacion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `unidades_medida`
--

CREATE TABLE `unidades_medida` (
  `id_unidad` int(11) NOT NULL,
  `codigo` varchar(10) NOT NULL,
  `nombre` varchar(40) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `unidades_medida`
--

INSERT INTO `unidades_medida` (`id_unidad`, `codigo`, `nombre`, `activo`) VALUES
(1, 'UND', 'Unidad', 1),
(2, 'CAJA', 'Caja', 1),
(3, 'PAR', 'Par', 1),
(4, 'SET', 'Conjunto', 1),
(5, 'KIT', 'Kit', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `documento` varchar(20) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `id_rol` int(11) NOT NULL,
  `id_sucursal_default` int(11) DEFAULT NULL,
  `foto_url` varchar(255) DEFAULT NULL,
  `debe_cambiar_pass` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_login` datetime DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `username`, `password_hash`, `nombres`, `apellidos`, `documento`, `email`, `telefono`, `id_rol`, `id_sucursal_default`, `foto_url`, `debe_cambiar_pass`, `ultimo_login`, `activo`, `fecha_creacion`) VALUES
(1, 'admin', '$2b$10$923gBCZNMkBDUevlK3nGpevBk.x/aR5GwjdqdvfvHJ3RQJIfJccry', 'Administrador', 'del Sistema', '00000000', 'admin@electrohogar.bo', '70000000', 1, 1, NULL, 1, NULL, 1, '2026-05-23 07:45:30'),
(2, 'vendedor1', '$2b$10$v9eKl1yIevok5lO/C8rsg.tGN/FS.QLUu6vCikf23PxBGqQPMEVjm', 'Vendedor', 'Uno', '11111111', 'vendedor1@electrohogar.bo', '71111111', 2, 1, NULL, 1, NULL, 1, '2026-05-23 07:45:30'),
(3, 'almacen1', '$2b$10$mWN4w1jnMGRo6qLd33L7N.Dpb5mNvxDul29YHzqYJ8IKYttatelQW', 'Almacenero', 'Uno', '22222222', 'almacen1@electrohogar.bo', '72222222', 3, 1, NULL, 1, NULL, 1, '2026-05-23 07:45:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_sucursal`
--

CREATE TABLE `usuario_sucursal` (
  `id_usuario` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuario_sucursal`
--

INSERT INTO `usuario_sucursal` (`id_usuario`, `id_sucursal`) VALUES
(1, 1),
(1, 2),
(2, 1),
(2, 2),
(3, 1),
(3, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id_venta` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `numero_factura` varchar(40) DEFAULT NULL,
  `tipo_venta` enum('MAYOR','MENOR') NOT NULL DEFAULT 'MENOR',
  `id_sucursal` int(11) NOT NULL,
  `id_deposito` int(11) NOT NULL COMMENT 'Depósito desde donde se descarga el stock',
  `id_cliente` int(11) NOT NULL,
  `id_vendedor` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `id_moneda` int(11) NOT NULL,
  `tipo_cambio` decimal(18,6) DEFAULT 1.000000,
  `condicion_pago` enum('CONTADO','CREDITO') NOT NULL DEFAULT 'CONTADO',
  `dias_credito` int(11) DEFAULT 0,
  `fecha_vencimiento` date DEFAULT NULL,
  `subtotal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `descuento_porc` decimal(5,2) DEFAULT 0.00,
  `descuento_monto` decimal(14,2) DEFAULT 0.00,
  `impuesto` decimal(14,2) DEFAULT 0.00,
  `total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `saldo_pendiente` decimal(14,2) NOT NULL DEFAULT 0.00,
  `estado` enum('BORRADOR','EMITIDA','PAGADA','PARCIAL','ANULADA','DEVUELTA') NOT NULL DEFAULT 'BORRADOR',
  `requiere_entrega` tinyint(1) NOT NULL DEFAULT 0,
  `direccion_entrega` varchar(255) DEFAULT NULL,
  `fecha_entrega` datetime DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `venta_cuotas`
--

CREATE TABLE `venta_cuotas` (
  `id_cuota` bigint(20) NOT NULL,
  `id_venta` bigint(20) NOT NULL,
  `numero_cuota` int(11) NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `monto` decimal(14,2) NOT NULL,
  `monto_pagado` decimal(14,2) NOT NULL DEFAULT 0.00,
  `estado` enum('PENDIENTE','PARCIAL','PAGADA','VENCIDA') NOT NULL DEFAULT 'PENDIENTE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `venta_detalle`
--

CREATE TABLE `venta_detalle` (
  `id_detalle` bigint(20) NOT NULL,
  `id_venta` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` decimal(14,2) NOT NULL,
  `precio_unitario` decimal(14,2) NOT NULL,
  `descuento_porc` decimal(5,2) DEFAULT 0.00,
  `descuento_monto` decimal(14,2) DEFAULT 0.00,
  `impuesto_porc` decimal(5,2) DEFAULT 0.00,
  `subtotal` decimal(14,2) NOT NULL,
  `costo_unitario` decimal(14,4) DEFAULT 0.0000 COMMENT 'Costo al momento de venta para rentabilidad',
  `bono_vendedor` decimal(14,2) DEFAULT 0.00,
  `observacion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `ajustes_inventario`
--
ALTER TABLE `ajustes_inventario`
  ADD PRIMARY KEY (`id_ajuste`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `fk_ai_deposito` (`id_deposito`),
  ADD KEY `fk_ai_usuario` (`id_usuario`);

--
-- Indices de la tabla `ajuste_inventario_detalle`
--
ALTER TABLE `ajuste_inventario_detalle`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_aid_ajuste` (`id_ajuste`),
  ADD KEY `fk_aid_producto` (`id_producto`);

--
-- Indices de la tabla `alertas_stock`
--
ALTER TABLE `alertas_stock`
  ADD PRIMARY KEY (`id_alerta`),
  ADD KEY `idx_alerta_pendiente` (`atendida`,`fecha_generada`),
  ADD KEY `fk_al_producto` (`id_producto`),
  ADD KEY `fk_al_deposito` (`id_deposito`),
  ADD KEY `fk_al_usuario` (`id_usuario_atendio`);

--
-- Indices de la tabla `arqueos_caja`
--
ALTER TABLE `arqueos_caja`
  ADD PRIMARY KEY (`id_arqueo`),
  ADD KEY `fk_arq_caja` (`id_caja`),
  ADD KEY `fk_arq_usuario` (`id_usuario`);

--
-- Indices de la tabla `auditoria`
--
ALTER TABLE `auditoria`
  ADD PRIMARY KEY (`id_auditoria`),
  ADD KEY `idx_aud_tabla` (`tabla`,`id_registro`),
  ADD KEY `idx_aud_fecha` (`fecha`),
  ADD KEY `fk_audit_usuario` (`id_usuario`);

--
-- Indices de la tabla `cajas`
--
ALTER TABLE `cajas`
  ADD PRIMARY KEY (`id_caja`),
  ADD KEY `fk_caja_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id_categoria`),
  ADD KEY `fk_categoria_padre` (`id_categoria_padre`);

--
-- Indices de la tabla `categorias_gasto`
--
ALTER TABLE `categorias_gasto`
  ADD PRIMARY KEY (`id_categoria_gasto`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id_cliente`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `idx_cli_documento` (`documento`);

--
-- Indices de la tabla `cliente_direcciones`
--
ALTER TABLE `cliente_direcciones`
  ADD PRIMARY KEY (`id_direccion`),
  ADD KEY `fk_cd_cliente` (`id_cliente`);

--
-- Indices de la tabla `compras`
--
ALTER TABLE `compras`
  ADD PRIMARY KEY (`id_compra`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `idx_compras_estado` (`estado`),
  ADD KEY `idx_compras_fecha` (`fecha_pedido`),
  ADD KEY `fk_compra_deposito` (`id_deposito_destino`),
  ADD KEY `fk_compra_moneda` (`id_moneda`),
  ADD KEY `fk_compra_u_crea` (`id_usuario_crea`),
  ADD KEY `fk_compra_u_aprueba` (`id_usuario_aprueba`),
  ADD KEY `fk_compra_u_recibe` (`id_usuario_recibe`),
  ADD KEY `idx_compras_proveedor` (`id_proveedor`),
  ADD KEY `idx_compras_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `compra_cuotas`
--
ALTER TABLE `compra_cuotas`
  ADD PRIMARY KEY (`id_cuota`),
  ADD KEY `fk_cc_compra` (`id_compra`);

--
-- Indices de la tabla `compra_detalle`
--
ALTER TABLE `compra_detalle`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_cd_compra` (`id_compra`),
  ADD KEY `fk_cd_producto` (`id_producto`);

--
-- Indices de la tabla `configuracion_sistema`
--
ALTER TABLE `configuracion_sistema`
  ADD PRIMARY KEY (`id_config`),
  ADD UNIQUE KEY `clave` (`clave`);

--
-- Indices de la tabla `depositos`
--
ALTER TABLE `depositos`
  ADD PRIMARY KEY (`id_deposito`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `fk_deposito_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `devoluciones_venta`
--
ALTER TABLE `devoluciones_venta`
  ADD PRIMARY KEY (`id_devolucion`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `fk_dv_venta` (`id_venta`),
  ADD KEY `fk_dv_deposito` (`id_deposito`),
  ADD KEY `fk_dv_usuario` (`id_usuario`);

--
-- Indices de la tabla `devolucion_venta_detalle`
--
ALTER TABLE `devolucion_venta_detalle`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_dvd_devolucion` (`id_devolucion`),
  ADD KEY `fk_dvd_producto` (`id_producto`);

--
-- Indices de la tabla `empresas`
--
ALTER TABLE `empresas`
  ADD PRIMARY KEY (`id_empresa`),
  ADD UNIQUE KEY `nit` (`nit`);

--
-- Indices de la tabla `gastos`
--
ALTER TABLE `gastos`
  ADD PRIMARY KEY (`id_gasto`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `idx_gasto_fecha` (`fecha`),
  ADD KEY `fk_gasto_sucursal` (`id_sucursal`),
  ADD KEY `fk_gasto_proveedor` (`id_proveedor`),
  ADD KEY `fk_gasto_moneda` (`id_moneda`),
  ADD KEY `fk_gasto_usuario` (`id_usuario`),
  ADD KEY `idx_gastos_categoria` (`id_categoria_gasto`);

--
-- Indices de la tabla `kardex`
--
ALTER TABLE `kardex`
  ADD PRIMARY KEY (`id_kardex`),
  ADD KEY `idx_kardex_producto` (`id_producto`,`fecha`),
  ADD KEY `idx_kardex_deposito` (`id_deposito`,`fecha`),
  ADD KEY `fk_kardex_tipomov` (`id_tipo_movimiento`),
  ADD KEY `fk_kardex_usuario` (`id_usuario`);

--
-- Indices de la tabla `marcas`
--
ALTER TABLE `marcas`
  ADD PRIMARY KEY (`id_marca`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `modulos`
--
ALTER TABLE `modulos`
  ADD PRIMARY KEY (`id_modulo`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `monedas`
--
ALTER TABLE `monedas`
  ADD PRIMARY KEY (`id_moneda`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `pagos_compra`
--
ALTER TABLE `pagos_compra`
  ADD PRIMARY KEY (`id_pago`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `fk_pgc_compra` (`id_compra`),
  ADD KEY `fk_pgc_cuota` (`id_cuota`),
  ADD KEY `fk_pgc_proveedor` (`id_proveedor`),
  ADD KEY `fk_pgc_sucursal` (`id_sucursal`),
  ADD KEY `fk_pgc_cuenta` (`id_cuenta_proveedor`),
  ADD KEY `fk_pgc_moneda` (`id_moneda`),
  ADD KEY `fk_pgc_usuario` (`id_usuario`),
  ADD KEY `idx_pagos_compra_fecha` (`fecha`);

--
-- Indices de la tabla `pagos_venta`
--
ALTER TABLE `pagos_venta`
  ADD PRIMARY KEY (`id_pago`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `fk_pv_venta` (`id_venta`),
  ADD KEY `fk_pv_cuota` (`id_cuota`),
  ADD KEY `fk_pv_cliente` (`id_cliente`),
  ADD KEY `fk_pv_sucursal` (`id_sucursal`),
  ADD KEY `fk_pv_moneda` (`id_moneda`),
  ADD KEY `fk_pv_usuario` (`id_usuario`),
  ADD KEY `idx_pagos_venta_fecha` (`fecha`);

--
-- Indices de la tabla `permisos`
--
ALTER TABLE `permisos`
  ADD PRIMARY KEY (`id_permiso`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `fk_permiso_modulo` (`id_modulo`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`),
  ADD UNIQUE KEY `codigo_interno` (`codigo_interno`),
  ADD UNIQUE KEY `codigo_barras` (`codigo_barras`),
  ADD KEY `idx_prod_modelo` (`modelo`),
  ADD KEY `idx_prod_marca` (`id_marca`),
  ADD KEY `fk_prod_categoria` (`id_categoria`),
  ADD KEY `fk_prod_unidad` (`id_unidad`),
  ADD KEY `fk_prod_moneda` (`id_moneda_costo`),
  ADD KEY `fk_prod_proveedor` (`id_proveedor_default`);

--
-- Indices de la tabla `producto_precio_historico`
--
ALTER TABLE `producto_precio_historico`
  ADD PRIMARY KEY (`id_historico`),
  ADD KEY `fk_pph_producto` (`id_producto`),
  ADD KEY `fk_pph_usuario` (`id_usuario`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`id_proveedor`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `proveedor_contactos`
--
ALTER TABLE `proveedor_contactos`
  ADD PRIMARY KEY (`id_contacto`),
  ADD KEY `fk_pc_proveedor` (`id_proveedor`);

--
-- Indices de la tabla `proveedor_cuentas_pago`
--
ALTER TABLE `proveedor_cuentas_pago`
  ADD PRIMARY KEY (`id_cuenta`),
  ADD KEY `fk_pcp_proveedor` (`id_proveedor`),
  ADD KEY `fk_pcp_moneda` (`id_moneda`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id_rol`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `rol_permiso`
--
ALTER TABLE `rol_permiso`
  ADD PRIMARY KEY (`id_rol`,`id_permiso`),
  ADD KEY `fk_rp_permiso` (`id_permiso`);

--
-- Indices de la tabla `sesiones`
--
ALTER TABLE `sesiones`
  ADD PRIMARY KEY (`id_sesion`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `fk_sesion_usuario` (`id_usuario`);

--
-- Indices de la tabla `stock`
--
ALTER TABLE `stock`
  ADD PRIMARY KEY (`id_stock`),
  ADD UNIQUE KEY `uq_stock` (`id_producto`,`id_deposito`),
  ADD KEY `fk_stock_deposito` (`id_deposito`);

--
-- Indices de la tabla `sucursales`
--
ALTER TABLE `sucursales`
  ADD PRIMARY KEY (`id_sucursal`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `fk_sucursal_empresa` (`id_empresa`);

--
-- Indices de la tabla `tipos_cambio`
--
ALTER TABLE `tipos_cambio`
  ADD PRIMARY KEY (`id_tipo_cambio`),
  ADD UNIQUE KEY `uq_cambio` (`id_moneda_origen`,`id_moneda_destino`,`fecha`),
  ADD KEY `fk_tc_destino` (`id_moneda_destino`);

--
-- Indices de la tabla `tipos_movimiento`
--
ALTER TABLE `tipos_movimiento`
  ADD PRIMARY KEY (`id_tipo_movimiento`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `transferencias`
--
ALTER TABLE `transferencias`
  ADD PRIMARY KEY (`id_transferencia`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `fk_tr_dep_origen` (`id_deposito_origen`),
  ADD KEY `fk_tr_dep_destino` (`id_deposito_destino`),
  ADD KEY `fk_tr_u_solicita` (`id_usuario_solicita`),
  ADD KEY `fk_tr_u_envia` (`id_usuario_envia`),
  ADD KEY `fk_tr_u_recibe` (`id_usuario_recibe`);

--
-- Indices de la tabla `transferencia_detalle`
--
ALTER TABLE `transferencia_detalle`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_td_transferencia` (`id_transferencia`),
  ADD KEY `fk_td_producto` (`id_producto`);

--
-- Indices de la tabla `unidades_medida`
--
ALTER TABLE `unidades_medida`
  ADD PRIMARY KEY (`id_unidad`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_usuario_rol` (`id_rol`),
  ADD KEY `fk_usuario_sucursal` (`id_sucursal_default`);

--
-- Indices de la tabla `usuario_sucursal`
--
ALTER TABLE `usuario_sucursal`
  ADD PRIMARY KEY (`id_usuario`,`id_sucursal`),
  ADD KEY `fk_us_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id_venta`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD UNIQUE KEY `numero_factura` (`numero_factura`),
  ADD KEY `idx_venta_fecha` (`fecha`),
  ADD KEY `idx_venta_cliente` (`id_cliente`),
  ADD KEY `idx_venta_estado` (`estado`),
  ADD KEY `fk_venta_deposito` (`id_deposito`),
  ADD KEY `fk_venta_moneda` (`id_moneda`),
  ADD KEY `idx_ventas_sucursal` (`id_sucursal`),
  ADD KEY `idx_ventas_vendedor` (`id_vendedor`);

--
-- Indices de la tabla `venta_cuotas`
--
ALTER TABLE `venta_cuotas`
  ADD PRIMARY KEY (`id_cuota`),
  ADD KEY `fk_vc_venta` (`id_venta`);

--
-- Indices de la tabla `venta_detalle`
--
ALTER TABLE `venta_detalle`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_vd_venta` (`id_venta`),
  ADD KEY `fk_vd_producto` (`id_producto`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `ajustes_inventario`
--
ALTER TABLE `ajustes_inventario`
  MODIFY `id_ajuste` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `ajuste_inventario_detalle`
--
ALTER TABLE `ajuste_inventario_detalle`
  MODIFY `id_detalle` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `alertas_stock`
--
ALTER TABLE `alertas_stock`
  MODIFY `id_alerta` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `arqueos_caja`
--
ALTER TABLE `arqueos_caja`
  MODIFY `id_arqueo` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `auditoria`
--
ALTER TABLE `auditoria`
  MODIFY `id_auditoria` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cajas`
--
ALTER TABLE `cajas`
  MODIFY `id_caja` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id_categoria` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `categorias_gasto`
--
ALTER TABLE `categorias_gasto`
  MODIFY `id_categoria_gasto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id_cliente` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `cliente_direcciones`
--
ALTER TABLE `cliente_direcciones`
  MODIFY `id_direccion` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `compras`
--
ALTER TABLE `compras`
  MODIFY `id_compra` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `compra_cuotas`
--
ALTER TABLE `compra_cuotas`
  MODIFY `id_cuota` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `compra_detalle`
--
ALTER TABLE `compra_detalle`
  MODIFY `id_detalle` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `configuracion_sistema`
--
ALTER TABLE `configuracion_sistema`
  MODIFY `id_config` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `depositos`
--
ALTER TABLE `depositos`
  MODIFY `id_deposito` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `devoluciones_venta`
--
ALTER TABLE `devoluciones_venta`
  MODIFY `id_devolucion` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `devolucion_venta_detalle`
--
ALTER TABLE `devolucion_venta_detalle`
  MODIFY `id_detalle` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `empresas`
--
ALTER TABLE `empresas`
  MODIFY `id_empresa` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `gastos`
--
ALTER TABLE `gastos`
  MODIFY `id_gasto` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `kardex`
--
ALTER TABLE `kardex`
  MODIFY `id_kardex` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT de la tabla `marcas`
--
ALTER TABLE `marcas`
  MODIFY `id_marca` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `modulos`
--
ALTER TABLE `modulos`
  MODIFY `id_modulo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `monedas`
--
ALTER TABLE `monedas`
  MODIFY `id_moneda` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `pagos_compra`
--
ALTER TABLE `pagos_compra`
  MODIFY `id_pago` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pagos_venta`
--
ALTER TABLE `pagos_venta`
  MODIFY `id_pago` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `permisos`
--
ALTER TABLE `permisos`
  MODIFY `id_permiso` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=161;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `producto_precio_historico`
--
ALTER TABLE `producto_precio_historico`
  MODIFY `id_historico` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `id_proveedor` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `proveedor_contactos`
--
ALTER TABLE `proveedor_contactos`
  MODIFY `id_contacto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `proveedor_cuentas_pago`
--
ALTER TABLE `proveedor_cuentas_pago`
  MODIFY `id_cuenta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `sesiones`
--
ALTER TABLE `sesiones`
  MODIFY `id_sesion` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `stock`
--
ALTER TABLE `stock`
  MODIFY `id_stock` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=91;

--
-- AUTO_INCREMENT de la tabla `sucursales`
--
ALTER TABLE `sucursales`
  MODIFY `id_sucursal` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `tipos_cambio`
--
ALTER TABLE `tipos_cambio`
  MODIFY `id_tipo_cambio` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `tipos_movimiento`
--
ALTER TABLE `tipos_movimiento`
  MODIFY `id_tipo_movimiento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `transferencias`
--
ALTER TABLE `transferencias`
  MODIFY `id_transferencia` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `transferencia_detalle`
--
ALTER TABLE `transferencia_detalle`
  MODIFY `id_detalle` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `unidades_medida`
--
ALTER TABLE `unidades_medida`
  MODIFY `id_unidad` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id_venta` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `venta_cuotas`
--
ALTER TABLE `venta_cuotas`
  MODIFY `id_cuota` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `venta_detalle`
--
ALTER TABLE `venta_detalle`
  MODIFY `id_detalle` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `ajustes_inventario`
--
ALTER TABLE `ajustes_inventario`
  ADD CONSTRAINT `fk_ai_deposito` FOREIGN KEY (`id_deposito`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_ai_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `ajuste_inventario_detalle`
--
ALTER TABLE `ajuste_inventario_detalle`
  ADD CONSTRAINT `fk_aid_ajuste` FOREIGN KEY (`id_ajuste`) REFERENCES `ajustes_inventario` (`id_ajuste`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_aid_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `alertas_stock`
--
ALTER TABLE `alertas_stock`
  ADD CONSTRAINT `fk_al_deposito` FOREIGN KEY (`id_deposito`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_al_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_al_usuario` FOREIGN KEY (`id_usuario_atendio`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `arqueos_caja`
--
ALTER TABLE `arqueos_caja`
  ADD CONSTRAINT `fk_arq_caja` FOREIGN KEY (`id_caja`) REFERENCES `cajas` (`id_caja`),
  ADD CONSTRAINT `fk_arq_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `auditoria`
--
ALTER TABLE `auditoria`
  ADD CONSTRAINT `fk_audit_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `cajas`
--
ALTER TABLE `cajas`
  ADD CONSTRAINT `fk_caja_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`);

--
-- Filtros para la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD CONSTRAINT `fk_categoria_padre` FOREIGN KEY (`id_categoria_padre`) REFERENCES `categorias` (`id_categoria`);

--
-- Filtros para la tabla `cliente_direcciones`
--
ALTER TABLE `cliente_direcciones`
  ADD CONSTRAINT `fk_cd_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE;

--
-- Filtros para la tabla `compras`
--
ALTER TABLE `compras`
  ADD CONSTRAINT `fk_compra_deposito` FOREIGN KEY (`id_deposito_destino`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_compra_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_compra_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`),
  ADD CONSTRAINT `fk_compra_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`),
  ADD CONSTRAINT `fk_compra_u_aprueba` FOREIGN KEY (`id_usuario_aprueba`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_compra_u_crea` FOREIGN KEY (`id_usuario_crea`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_compra_u_recibe` FOREIGN KEY (`id_usuario_recibe`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `compra_cuotas`
--
ALTER TABLE `compra_cuotas`
  ADD CONSTRAINT `fk_cc_compra` FOREIGN KEY (`id_compra`) REFERENCES `compras` (`id_compra`) ON DELETE CASCADE;

--
-- Filtros para la tabla `compra_detalle`
--
ALTER TABLE `compra_detalle`
  ADD CONSTRAINT `fk_cd_compra` FOREIGN KEY (`id_compra`) REFERENCES `compras` (`id_compra`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cd_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `depositos`
--
ALTER TABLE `depositos`
  ADD CONSTRAINT `fk_deposito_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`);

--
-- Filtros para la tabla `devoluciones_venta`
--
ALTER TABLE `devoluciones_venta`
  ADD CONSTRAINT `fk_dv_deposito` FOREIGN KEY (`id_deposito`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_dv_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_dv_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`);

--
-- Filtros para la tabla `devolucion_venta_detalle`
--
ALTER TABLE `devolucion_venta_detalle`
  ADD CONSTRAINT `fk_dvd_devolucion` FOREIGN KEY (`id_devolucion`) REFERENCES `devoluciones_venta` (`id_devolucion`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_dvd_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `gastos`
--
ALTER TABLE `gastos`
  ADD CONSTRAINT `fk_gasto_categoria` FOREIGN KEY (`id_categoria_gasto`) REFERENCES `categorias_gasto` (`id_categoria_gasto`),
  ADD CONSTRAINT `fk_gasto_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_gasto_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`),
  ADD CONSTRAINT `fk_gasto_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`),
  ADD CONSTRAINT `fk_gasto_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `kardex`
--
ALTER TABLE `kardex`
  ADD CONSTRAINT `fk_kardex_deposito` FOREIGN KEY (`id_deposito`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_kardex_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_kardex_tipomov` FOREIGN KEY (`id_tipo_movimiento`) REFERENCES `tipos_movimiento` (`id_tipo_movimiento`),
  ADD CONSTRAINT `fk_kardex_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `pagos_compra`
--
ALTER TABLE `pagos_compra`
  ADD CONSTRAINT `fk_pgc_compra` FOREIGN KEY (`id_compra`) REFERENCES `compras` (`id_compra`),
  ADD CONSTRAINT `fk_pgc_cuenta` FOREIGN KEY (`id_cuenta_proveedor`) REFERENCES `proveedor_cuentas_pago` (`id_cuenta`),
  ADD CONSTRAINT `fk_pgc_cuota` FOREIGN KEY (`id_cuota`) REFERENCES `compra_cuotas` (`id_cuota`),
  ADD CONSTRAINT `fk_pgc_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_pgc_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`),
  ADD CONSTRAINT `fk_pgc_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`),
  ADD CONSTRAINT `fk_pgc_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `pagos_venta`
--
ALTER TABLE `pagos_venta`
  ADD CONSTRAINT `fk_pv_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  ADD CONSTRAINT `fk_pv_cuota` FOREIGN KEY (`id_cuota`) REFERENCES `venta_cuotas` (`id_cuota`),
  ADD CONSTRAINT `fk_pv_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_pv_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`),
  ADD CONSTRAINT `fk_pv_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_pv_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`);

--
-- Filtros para la tabla `permisos`
--
ALTER TABLE `permisos`
  ADD CONSTRAINT `fk_permiso_modulo` FOREIGN KEY (`id_modulo`) REFERENCES `modulos` (`id_modulo`);

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `fk_prod_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`),
  ADD CONSTRAINT `fk_prod_marca` FOREIGN KEY (`id_marca`) REFERENCES `marcas` (`id_marca`),
  ADD CONSTRAINT `fk_prod_moneda` FOREIGN KEY (`id_moneda_costo`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_prod_proveedor` FOREIGN KEY (`id_proveedor_default`) REFERENCES `proveedores` (`id_proveedor`),
  ADD CONSTRAINT `fk_prod_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades_medida` (`id_unidad`);

--
-- Filtros para la tabla `producto_precio_historico`
--
ALTER TABLE `producto_precio_historico`
  ADD CONSTRAINT `fk_pph_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_pph_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `proveedor_contactos`
--
ALTER TABLE `proveedor_contactos`
  ADD CONSTRAINT `fk_pc_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`) ON DELETE CASCADE;

--
-- Filtros para la tabla `proveedor_cuentas_pago`
--
ALTER TABLE `proveedor_cuentas_pago`
  ADD CONSTRAINT `fk_pcp_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_pcp_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`) ON DELETE CASCADE;

--
-- Filtros para la tabla `rol_permiso`
--
ALTER TABLE `rol_permiso`
  ADD CONSTRAINT `fk_rp_permiso` FOREIGN KEY (`id_permiso`) REFERENCES `permisos` (`id_permiso`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rp_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE CASCADE;

--
-- Filtros para la tabla `sesiones`
--
ALTER TABLE `sesiones`
  ADD CONSTRAINT `fk_sesion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `stock`
--
ALTER TABLE `stock`
  ADD CONSTRAINT `fk_stock_deposito` FOREIGN KEY (`id_deposito`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_stock_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `sucursales`
--
ALTER TABLE `sucursales`
  ADD CONSTRAINT `fk_sucursal_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresas` (`id_empresa`);

--
-- Filtros para la tabla `tipos_cambio`
--
ALTER TABLE `tipos_cambio`
  ADD CONSTRAINT `fk_tc_destino` FOREIGN KEY (`id_moneda_destino`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_tc_origen` FOREIGN KEY (`id_moneda_origen`) REFERENCES `monedas` (`id_moneda`);

--
-- Filtros para la tabla `transferencias`
--
ALTER TABLE `transferencias`
  ADD CONSTRAINT `fk_tr_dep_destino` FOREIGN KEY (`id_deposito_destino`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_tr_dep_origen` FOREIGN KEY (`id_deposito_origen`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_tr_u_envia` FOREIGN KEY (`id_usuario_envia`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_tr_u_recibe` FOREIGN KEY (`id_usuario_recibe`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_tr_u_solicita` FOREIGN KEY (`id_usuario_solicita`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `transferencia_detalle`
--
ALTER TABLE `transferencia_detalle`
  ADD CONSTRAINT `fk_td_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_td_transferencia` FOREIGN KEY (`id_transferencia`) REFERENCES `transferencias` (`id_transferencia`) ON DELETE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`),
  ADD CONSTRAINT `fk_usuario_sucursal` FOREIGN KEY (`id_sucursal_default`) REFERENCES `sucursales` (`id_sucursal`);

--
-- Filtros para la tabla `usuario_sucursal`
--
ALTER TABLE `usuario_sucursal`
  ADD CONSTRAINT `fk_us_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_us_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE;

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `fk_venta_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  ADD CONSTRAINT `fk_venta_deposito` FOREIGN KEY (`id_deposito`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_venta_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_venta_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`),
  ADD CONSTRAINT `fk_venta_vendedor` FOREIGN KEY (`id_vendedor`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `venta_cuotas`
--
ALTER TABLE `venta_cuotas`
  ADD CONSTRAINT `fk_vc_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`) ON DELETE CASCADE;

--
-- Filtros para la tabla `venta_detalle`
--
ALTER TABLE `venta_detalle`
  ADD CONSTRAINT `fk_vd_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_vd_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
